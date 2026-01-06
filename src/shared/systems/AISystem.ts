import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";
import { Pathfinding } from "./Pathfinding";
import RAPIER from "@dimforge/rapier2d-compat";

export const AISystem = (
    world: ECSWorld, 
    physicsWorld: RAPIER.World, 
    dt: number, 
    currentHour: number, 
    pathfinder?: Pathfinding,
    castCallback?: (id: string, spellId: string, vx: number, vy: number) => void,
    targetProvider?: (id: string) => { x: number, y: number } | null
) => {
    const entities = world.with("ai", "body", "input");

    for (const entity of entities) {
        const { ai, body, input, id, facing } = entity;
        
        if (!ai) continue; 

        ai.timer += dt;
        const currentPos = body.translation();

        // 0. DUEL STATE
        if (ai.state === 'duel' && ai.targetId && castCallback && targetProvider) {
            const targetPos = targetProvider(ai.targetId);
            if (targetPos) {
                const dx = targetPos.x - currentPos.x;
                const dy = targetPos.y - currentPos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                const nx = dist > 0 ? dx / dist : 0;
                const ny = dist > 0 ? dy / dist : 0;
                
                // Movement: Maintain ~250px distance
                let moveX = 0, moveY = 0;
                if (dist > 300) { moveX = nx; moveY = ny; }
                else if (dist < 150) { moveX = -nx; moveY = -ny; }
                else {
                    // Random Strafe based on ID and time
                    const strafe = Math.sin(Date.now() / 1000 + (entity.id || 0)) > 0 ? 1 : -1;
                    moveX = -ny * strafe * 0.5;
                    moveY = nx * strafe * 0.5;
                }
                
                input.analogDir = { x: moveX, y: moveY };
                if (facing) { facing.x = nx; facing.y = ny; }

                // Casting
                if (ai.timer > 2500) { // Every 2.5s
                    const spells = ['circle', 'square', 'triangle'];
                    const spell = spells[Math.floor(Math.random() * spells.length)];
                    castCallback(entity.player?.sessionId || "", spell, nx * 400, ny * 400);
                    ai.timer = 0;
                }
            } else {
                ai.state = 'idle';
            }
            continue; // Skip routine logic
        }

        // 1. DETERMINE DESIRED DESTINATION (Routine logic remains same)
        let desiredPos = ai.home;
        let forceFacing = { x: 0, y: 1 };

        if (ai.routineSpots) {
            const isEating = (currentHour >= 7 && currentHour < 8) || (currentHour >= 19 && currentHour < 21);
            const isClass = (currentHour >= 8 && currentHour < 10) || (currentHour >= 17 && currentHour < 19);
            const isSleeping = (currentHour >= 21 || currentHour < 7);

            if (isEating) { desiredPos = ai.routineSpots.eat; forceFacing = { x: 0, y: -1 }; }
            else if (isClass) { desiredPos = ai.routineSpots.class; forceFacing = { x: 0, y: -1 }; }
            else if (isSleeping) { desiredPos = ai.routineSpots.sleep; forceFacing = { x: 0, y: 1 }; }
            else {
                const idVal = entity.id || 0;
                // Deterministic Dispersion: Golden Angle spread
                const getSpread = (center: {x: number, y: number}, radius: number) => {
                    const angle = idVal * 2.399; // Golden Angle in radians (~137.5 deg)
                    const r = Math.sqrt(idVal + 1) * (radius / 5); // Spread outwards
                    // Clamp to max radius
                    const finalR = Math.min(r, radius);
                    return { x: center.x + Math.cos(angle) * finalR, y: center.y + Math.sin(angle) * finalR };
                };

                if (currentHour >= 10 && currentHour < 12) desiredPos = getSpread(CONFIG.SCHOOL_LOCATIONS.TRAINING_GROUNDS, 200);
                else if (currentHour >= 12 && currentHour < 14) desiredPos = getSpread(CONFIG.SCHOOL_LOCATIONS.COURTYARD, 150);
                else if (currentHour >= 14 && currentHour < 17) desiredPos = getSpread(CONFIG.SCHOOL_LOCATIONS.FOREST, 400);
                else desiredPos = ai.routineSpots.sleep;
            }
        }

        // 2. STATE MACHINE & STAGGERED START
        const distToTarget = Math.sqrt(Math.pow(desiredPos.x - currentPos.x, 2) + Math.pow(desiredPos.y - currentPos.y, 2));

        if (distToTarget > 20) {
            if (!ai.targetPos || Math.abs(ai.targetPos.x - desiredPos.x) > 5 || Math.abs(ai.targetPos.y - desiredPos.y) > 5) {
                // STAGGERED START: Students wait a bit based on ID before moving to a new task
                const startDelay = ((id || 0) % 8) * 0.5; // Up to 4 seconds delay
                if (ai.timer > startDelay) {
                    ai.targetPos = desiredPos;
                    ai.state = 'routine';
                    ai.path = undefined;
                } else {
                    ai.state = 'idle'; // Wait for my turn to move
                }
            }
        }

        // 3. EXECUTE ROUTINE
        if (ai.state === 'routine' && ai.targetPos) {
            if (!ai.path && pathfinder) {
                ai.path = pathfinder.findPath(currentPos, ai.targetPos) || undefined;
            }

            if (ai.path && ai.path.length > 0) {
                const nextWaypoint = ai.path[0];
                const dx = nextWaypoint.x - currentPos.x;
                const dy = nextWaypoint.y - currentPos.y;
                const distToNext = Math.sqrt(dx * dx + dy * dy);

                if (distToNext < 12) {
                    ai.path.shift();
                } else {
                    // --- OPTIMIZED STEERING BEHAVIOR (Spatial Query) ---
                    // 1. Seek Force (Target Direction)
                    const seekX = dx / distToNext;
                    const seekY = dy / distToNext;
                    
                    let finalX = seekX;
                    let finalY = seekY;

                    // 2. Separation Force (Avoid crowded areas)
                    let sepX = 0;
                    let sepY = 0;

                    const separationRadius = 24; 
                    const searchShape = new RAPIER.Ball(separationRadius);
                    
                    physicsWorld.intersectionsWithShape(currentPos, 0, searchShape, (otherCollider) => {
                        const otherBody = otherCollider.parent();
                        
                        if (!otherBody || otherBody === body) return true; // continue

                        const oPos = otherBody.translation();
                        const vx = currentPos.x - oPos.x; 
                        const vy = currentPos.y - oPos.y;
                        const distSq = vx*vx + vy*vy;
                        
                        if (distSq < (separationRadius * separationRadius) && distSq > 0.001) {
                            const dist = Math.sqrt(distSq);
                            const strength = (separationRadius - dist) / separationRadius; 
                            sepX += (vx / dist) * strength * 2.5; 
                            sepY += (vy / dist) * strength * 2.5;
                        }
                        return true; // continue
                    });

                    // 3. Combine Forces
                    finalX += sepX;
                    finalY += sepY;

                    // Normalize result
                    const finalLen = Math.sqrt(finalX*finalX + finalY*finalY);
                    if (finalLen > 0.001) {
                        finalX /= finalLen;
                        finalY /= finalLen;
                    }

                    // 4. Output to InputComponent (Analog)
                    input.analogDir = { x: finalX, y: finalY };
                    
                    // Legacy Fallback
                    input.left = finalX < -0.3;
                    input.right = finalX > 0.3;
                    input.up = finalY < -0.3;
                    input.down = finalY > 0.3;

                    // STUCK DETECTION
                    const vel = body.linvel();
                    const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
                    if (currentSpeed < 5 && ai.timer > 2.0) {
                        ai.path = undefined; 
                        ai.timer = 0;
                    }
                }
            } else {
                ai.state = 'idle';
                ai.timer = 0;
            }
        } else if (ai.state === 'idle') {
            input.left = false; input.right = false; input.up = false; input.down = false;
            if (facing) { facing.x = forceFacing.x; facing.y = forceFacing.y; }
        }
    }
};
