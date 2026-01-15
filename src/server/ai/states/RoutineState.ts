import { Entity } from "../../../shared/ecs/components";
import { getStudentScheduleTarget } from "../../../shared/utils/ScheduleUtils";
import { MathUtils } from "../../../shared/utils/MathUtils";
import { LevelRegistry } from "../../managers/LevelRegistry";
import RAPIER from "@dimforge/rapier2d-compat";

export const RoutineState = {
    update: (
        entity: Entity, 
        dt: number, 
        currentHour: number, 
        pathfinder: any, 
        physicsWorld: RAPIER.World,
        frameCount: number
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
        if (targetZone === "DORM") {
            targetZone = `DORM_${(ai.house || 'ignis').toUpperCase()}`;
        }

        // 2. Determine Exact Target Position (2-Step Logic)
        let finalPos = { x: 300, y: 300 }; // Fail-safe
        let isAtZone = false;

        // Step A: Are we in the correct zone?
        const zoneLoc = registry.getLocation(targetZone);
        
        if (zoneLoc && zoneLoc.x !== 0) {
            const distToZoneCenter = MathUtils.distance(currentPos.x, currentPos.y, zoneLoc.x, zoneLoc.y);
            // Define zone radius roughly (e.g., 200px for room). 
            // Better: Use bounding boxes if available, but radius is cheap.
            const ZONE_RADIUS = 300; 
            
            if (distToZoneCenter < ZONE_RADIUS) {
                isAtZone = true;
            } else {
                // Not in zone -> Go to Zone Center
                finalPos = zoneLoc;
            }
        }

        // Step B: In Zone -> Find specific slot or roam
        if (isAtZone && ai.routineSpots) {
            if (schedule.activity === 'sleep') finalPos = ai.routineSpots.sleep;
            else if (schedule.activity === 'eat') finalPos = ai.routineSpots.eat;
            else if (schedule.activity === 'class') finalPos = ai.routineSpots.class;
            else {
                // Free Roam / Duel inside zone
                // Dispersion logic moved here from ScheduleUtils
                const numericId = typeof id === 'number' ? id : 0;
                const angle = numericId * 2.399; 
                const radius = 150;
                finalPos = { 
                    x: zoneLoc.x + Math.cos(angle) * radius, 
                    y: zoneLoc.y + Math.sin(angle) * radius 
                };
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
            console.log(`[AI] Entity ${id} stuck. Recalculating...`);
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
                ai.path = pathfinder.findPath(currentPos, finalPos);
            }

            if (ai.path && ai.path.length > 0) {
                const next = ai.path[0];
                
                // --- LANE LOGIC (Prevent Railroading) ---
                // Deterministic offset based on ID to create "Lanes" in corridors
                // numericId % 3 => 0, 1, 2. Map to -1, 0, 1. Scale by 12px.
                const laneOffset = ((numericId % 3) - 1) * 12; 
                
                // We add the offset to the target node, but we need to know the path direction 
                // to apply it perpendicularly? Too complex.
                // Simpler: Just add x/y offset globally. 
                // If moving horizontal, y-offset matters. If vertical, x-offset matters.
                // A simple diagonal offset works well enough for 2D top-down without strict grid.
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
                        
                        // Store separation force in AI state to smooth it over frames? 
                        // For simplicity, apply directly now.
                        norm.x += sepX;
                        norm.y += sepY;
                        
                        // Re-normalize after blending forces
                        norm = MathUtils.normalize(norm.x, norm.y);
                    }

                    input.analogDir = { x: norm.x, y: norm.y };
                    
                    // Facing follows movement
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
            
            // Trigger Contextual State
            if (schedule.activity === 'class') ai.state = 'attending_class';
            else if (schedule.activity === 'duel') ai.state = 'duel';
            else {
                // Orient towards object (e.g. bed is usually Up/Left, Table is Up/Down)
                if (schedule.activity === 'sleep' && facing) facing.y = -1;
                if (schedule.activity === 'eat' && facing) facing.y = (finalPos.y > zoneLoc.y) ? -1 : 1; // Look at table
                ai.state = 'idle';
            }
            ai.timer = 0;
        }
    }
};