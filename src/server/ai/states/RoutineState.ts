import { Entity } from "../../../shared/ecs/components";
import { getStudentScheduleTarget } from "../../../shared/utils/ScheduleUtils";
import { MathUtils } from "../../../shared/utils/MathUtils";
import { LevelRegistry } from "../../managers/LevelRegistry";
import RAPIER from "@dimforge/rapier2d-compat";
import { CONFIG } from "../../../shared/Config";

export const RoutineState = {
    update: (
        entity: Entity, 
        dt: number, 
        currentHour: number, 
        pathfinder: any, 
        physicsWorld: RAPIER.World,
        frameCount: number,
        floor: number = 0,
        setSleepingState?: (id: string, isSleeping: boolean) => void
    ) => {
        const { ai, body, input, id, facing } = entity;
        if (!ai || !body || !input) return;

        const numericId = typeof id === 'number' ? id : (parseInt(id || "0") || 0);
        const currentPos = body.translation();
        const registry = LevelRegistry.getInstance();

        // 1. Get High-Level Goal (Activity & Zone)
        const schedule = getStudentScheduleTarget(currentHour);
        let targetZone = schedule.targetZone;
        
        // Resolve dynamic zone names
        // Forces reload
        if (targetZone === "DORM") {
            targetZone = `DORM_${(ai.house || 'ignis').toUpperCase()}`;
        }

        // --- VERTICALITY LOGIC ---
        // If the current target is NOT an upstairs location, ensure we are visible/physically present.
        // This handles waking up from sleep OR coming back from class.
        const validKeys = ['sleep', 'eat', 'class'];
        let targetSpot: any = null;
        if (ai.routineSpots && validKeys.includes(schedule.activity)) {
            targetSpot = (ai.routineSpots as any)[schedule.activity];
        }

        if (!targetSpot?.isUpstairs && setSleepingState) {
             setSleepingState(String(id), false);
        }

        // 2. Determine Exact Target Position (2-Step Logic)
        let finalPos = { x: 300, y: 300 }; // Fail-safe
        let isAtZone = false;

        // Step A: Are we in the correct zone?
        const zoneLoc = registry.getLocation(targetZone);
        
        if (zoneLoc && zoneLoc.x !== 0) {
            // DYNAMIC TILED LOGIC: Use the exact rectangle drawn in Tiled
            const halfW = (zoneLoc.width || 200) / 2;
            const halfH = (zoneLoc.height || 200) / 2;
            
            // Check AABB (Axis-Aligned Bounding Box)
            // zoneLoc.x/y is CENTER in our Logic Data (parsed in MapParser)
            const dx = Math.abs(currentPos.x - zoneLoc.x); 
            const dy = Math.abs(currentPos.y - zoneLoc.y);
            
            if (dx <= halfW && dy <= halfH) {
                isAtZone = true;
            } else {
                // Not in zone -> Go to Zone Center
                finalPos = zoneLoc;
            }
        }

        // Step B: In Zone -> Find specific slot or roam within Tiled bounds
        if (isAtZone && ai.routineSpots) {
            if (schedule.activity === 'sleep') finalPos = ai.routineSpots.sleep;
            else if (schedule.activity === 'eat') finalPos = ai.routineSpots.eat;
            else if (schedule.activity === 'class') finalPos = ai.routineSpots.class;
            else {
                // Free Roam / Duel inside DYNAMIC Tiled Zone
                // Pick a random point strictly inside the room boundaries
                const w = zoneLoc?.width || 200;
                const h = zoneLoc?.height || 200;
                
                // Add a small padding (20px) so they don't hug the walls
                const padding = 20;
                const safeW = Math.max(0, (w/2) - padding);
                const safeH = Math.max(0, (h/2) - padding);

                // Deterministic pseudo-random based on time + ID to avoid jitter
                // Change roaming spot every ~10 seconds
                const seed = Math.floor(Date.now() / 10000) + numericId;
                // Simple deterministic random
                const sinSeed = Math.sin(seed);
                const cosSeed = Math.cos(seed);
                
                const randX = sinSeed * safeW;
                const randY = cosSeed * safeH;

                if (zoneLoc) {
                    finalPos = { 
                        x: zoneLoc.x + randX, 
                        y: zoneLoc.y + randY 
                    };
                }
            }
        }

        const distToTarget = MathUtils.distance(finalPos.x, finalPos.y, currentPos.x, currentPos.y);

        // --- SOCIALIZER LAG (AFK Simulation) ---
        if (ai.archetype === 'SOCIALIZER' && Math.random() < 0.001) {
             input.analogDir = { x: 0, y: 0 };
             // Reset stuck timer so we don't think we are stuck
             ai.stuckTimer = 0;
             return;
        }

        // --- STUCK DETECTION ---
        if (ai.lastPos) {
            const distMoved = MathUtils.distance(currentPos.x, currentPos.y, ai.lastPos.x, ai.lastPos.y);
            // If trying to move but not moving
            if (distMoved < 2 && (input.analogDir?.x !== 0 || input.analogDir?.y !== 0)) {
                ai.stuckTimer = (ai.stuckTimer || 0) + dt;
            } else {
                ai.stuckTimer = 0;
            }
        }
        ai.lastPos = { x: currentPos.x, y: currentPos.y };

        if ((ai.stuckTimer || 0) > 2000) {
            // Stuck for 2 seconds -> Force Repath
            // console.log(`[AI] Entity ${id} stuck. Recalculating...`);
            ai.path = undefined;
            ai.targetPos = undefined;
            ai.stuckTimer = 0;
            // Jiggle
            input.analogDir = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
            return;
        }

        if (distToTarget > 20) {
            if (!ai.targetPos || Math.abs(ai.targetPos.x - finalPos.x) > 10) {
                ai.path = undefined; // New target
                ai.targetPos = finalPos;
            }

            if (!ai.path && pathfinder) {
                ai.path = pathfinder.findPath(currentPos, finalPos, floor);
            }

            if (ai.path && ai.path.length > 0) {
                const next = ai.path[0];
                
                // --- LANE LOGIC (Prevent Railroading) ---
                const laneOffset = ((numericId % 3) - 1) * 12; 
                
                const targetX = next.x + laneOffset;
                const targetY = next.y + laneOffset;

                if (MathUtils.distance(targetX, targetY, currentPos.x, currentPos.y) < 12) {
                    ai.path.shift();
                } else {
                    const dx = targetX - currentPos.x;
                    const dy = targetY - currentPos.y;
                    let norm = MathUtils.normalize(dx, dy);
                    
                    // --- STEERING (Separation) ---
                    // Throttle spatial query: Every 3 frames based on ID
                    if (frameCount % 3 === (numericId % 3)) {
                        let sepX = 0;
                        let sepY = 0;
                        const separationRadius = 32; 
                        const searchShape = new RAPIER.Ball(separationRadius);
                        
                        physicsWorld.intersectionsWithShape(currentPos, 0, searchShape, (collider) => {
                            const otherBody = collider.parent();
                            if (!otherBody || otherBody === body) return true;

                            const oPos = otherBody.translation();
                            const distSq = MathUtils.distanceSq(currentPos.x, currentPos.y, oPos.x, oPos.y);
                            
                            if (distSq < (separationRadius * separationRadius) && distSq > 0.001) {
                                const dist = Math.sqrt(distSq);
                                const strength = (separationRadius - dist) / separationRadius; 
                                const vx = currentPos.x - oPos.x; 
                                const vy = currentPos.y - oPos.y;
                                // Strong repulsion if very close
                                sepX += (vx / dist) * strength * 3.0; 
                                sepY += (vy / dist) * strength * 3.0;
                            }
                            return true;
                        });
                        
                        norm.x += sepX;
                        norm.y += sepY;
                        
                        norm = MathUtils.normalize(norm.x, norm.y);
                    }

                    input.analogDir = { x: norm.x, y: norm.y };
                    
                    if (facing) { facing.x = norm.x; facing.y = norm.y; }
                }
            } else {
                // Direct seek (fallback)
                const dx = finalPos.x - currentPos.x;
                const dy = finalPos.y - currentPos.y;
                const norm = MathUtils.normalize(dx, dy);
                input.analogDir = { x: norm.x, y: norm.y };
            }
        } else {
            // Arrived
            input.analogDir = { x: 0, y: 0 };
            
            // 1. Apply Preset Facing
            if (ai.routineSpots && facing) {
                let spot: any = null;
                if (schedule.activity === 'sleep') spot = ai.routineSpots.sleep;
                else if (schedule.activity === 'eat') spot = ai.routineSpots.eat;
                else if (schedule.activity === 'class') spot = ai.routineSpots.class;
                
                if (spot && spot.facing) {
                    facing.x = spot.facing.x;
                    facing.y = spot.facing.y;
                }

                // Check for Upstairs (Sleep or Class)
                if (spot?.isUpstairs && setSleepingState) {
                    // Only trigger if activity matches current intent
                    // (Double check to ensure we don't vanish if we just walked near stairs by accident, 
                    // but we are "Arrived" here, so it's intentional)
                    setSleepingState(String(id), true);
                    return; 
                }
            }

            // 2. Trigger Contextual State
            if (schedule.activity === 'class') ai.state = 'attending_class';
            else if (schedule.activity === 'duel') ai.state = 'duel';
            else {
                if (facing && schedule.activity === 'sleep' && !facing.x && !facing.y) facing.y = -1;
                ai.state = 'idle';
            }
            ai.timer = 0;
        }
    }
};
