import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";
import { Pathfinding } from "./Pathfinding";

export const AISystem = (world: ECSWorld, dt: number, currentHour: number, pathfinder?: Pathfinding) => {
    const entities = world.with("ai", "body", "input");

    for (const entity of entities) {
        const { ai, body, input, id, facing } = entity;
        
        // CRITICAL FIX: Skip if AI component was removed (Player Possession)
        if (!ai) continue; 

        ai.timer += dt;

        // 1. DETERMINE DESIRED DESTINATION BASED ON ESTABLISHED SPOTS
        let desiredPos = ai.home;
        let forceFacing = { x: 0, y: 1 }; // Default down

        if (!ai.routineSpots) {
            // Fallback if not initialized (should not happen)
            desiredPos = ai.home;
        } else {
            const isEating = (currentHour >= 7 && currentHour < 8) || (currentHour >= 19 && currentHour < 21);
            const isClass = (currentHour >= 8 && currentHour < 10) || (currentHour >= 17 && currentHour < 19);
            const isSleeping = (currentHour >= 21 || currentHour < 7);

            if (isEating) {
                desiredPos = ai.routineSpots.eat;
                forceFacing = { x: 0, y: -1 };
            } else if (isClass) {
                desiredPos = ai.routineSpots.class;
                forceFacing = { x: 0, y: -1 };
            } else if (isSleeping) {
                desiredPos = ai.routineSpots.sleep;
                forceFacing = { x: 0, y: 1 };
            } else {
                // Free Study / Patrol Grounds
                if (currentHour >= 10 && currentHour < 12) desiredPos = CONFIG.SCHOOL_LOCATIONS.TRAINING_GROUNDS;
                else if (currentHour >= 12 && currentHour < 14) desiredPos = CONFIG.SCHOOL_LOCATIONS.COURTYARD;
                else if (currentHour >= 14 && currentHour < 17) desiredPos = CONFIG.SCHOOL_LOCATIONS.FOREST;
                else {
                    // Default to sleep/home spot if no activity
                    desiredPos = ai.routineSpots.sleep;
                }
            }
        }

        // 2. STATE MACHINE
        const currentPos = body.translation();
        const distToTarget = Math.sqrt(Math.pow(desiredPos.x - currentPos.x, 2) + Math.pow(desiredPos.y - currentPos.y, 2));

        if (distToTarget > 20) {
            // Target changed or we need to move
            if (!ai.targetPos || Math.abs(ai.targetPos.x - desiredPos.x) > 5 || Math.abs(ai.targetPos.y - desiredPos.y) > 5) {
                ai.targetPos = desiredPos;
                ai.state = 'routine';
                ai.path = undefined; // Force recalculate
            }
        }

        // 4. EXECUTE STATE
        if (ai.state === 'routine' && ai.targetPos) {
            if (!ai.path && pathfinder) {
                ai.path = pathfinder.findPath(currentPos, ai.targetPos) || undefined;
            }

            if (ai.path && ai.path.length > 0) {
                const nextPoint = ai.path[0];
                const dx = nextPoint.x - currentPos.x;
                const dy = nextPoint.y - currentPos.y;
                const distToNext = Math.sqrt(dx * dx + dy * dy);

                if (distToNext < 8) {
                    ai.path.shift();
                } else {
                    input.left = dx < -2;
                    input.right = dx > 2;
                    input.up = dy < -2;
                    input.down = dy > 2;
                }
            } else {
                ai.state = 'idle';
                ai.timer = 0;
            }
        } else if (ai.state === 'idle') {
            input.left = false; input.right = false; input.up = false; input.down = false;
            
            // Force formation facing while idle
            if (facing) {
                facing.x = forceFacing.x;
                facing.y = forceFacing.y;
            }
        }
    }
};
