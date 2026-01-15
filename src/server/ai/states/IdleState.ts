import { Entity } from "../../../shared/ecs/components";
import { getStudentScheduleTarget } from "../../../shared/utils/ScheduleUtils";
import { MathUtils } from "../../../shared/utils/MathUtils";

export const IdleState = {
    update: (
        entity: Entity, 
        dt: number, 
        currentHour: number,
        castCallback?: (id: string, spell: string, vx: number, vy: number) => void
    ) => {
        const { ai, body, input, facing, id } = entity;
        if (!ai || !body || !input) return;

        // 1. Check Schedule Change
        if (ai.routineSpots && ai.timer > 1000) {
            const schedule = getStudentScheduleTarget(currentHour);
            
            // If current activity doesn't match AI expectation/location context, move.
            // Since IdleState doesn't track location, we rely on RoutineState to do the check.
            // Just transition to 'routine' periodically to let it validate position.
            ai.state = 'routine';
            ai.timer = 0;
            return;
        }

        // 2. Idle Behavior
        input.analogDir = { x: 0, y: 0 }; 

        if (ai.archetype === 'SOCIALIZER') {
            if (ai.timer > 2000 && Math.floor(ai.timer / 1000) % 3 === 0) {
                 const angle = (Date.now() / 300);
                 if (facing) { facing.x = Math.cos(angle); facing.y = Math.sin(angle); }
            }
        } 
        else if (ai.archetype === 'KILLER') {
            if (Math.random() < 0.01 && castCallback && ai.timer > 1000) {
                 const spells = ['circle', 'square', 'triangle'];
                 const spell = spells[Math.floor(Math.random() * spells.length)];
                 const rx = (Math.random() - 0.5);
                 const ry = (Math.random() - 0.5);
                 castCallback(entity.player?.sessionId || "", spell, rx * 400, ry * 400);
                 if (facing) { facing.x = rx; facing.y = ry; }
            }
        }
        else if (ai.archetype === 'EXPLORER') {
             if (Math.random() < 0.02) {
                 input.analogDir = { 
                     x: (Math.random() - 0.5), 
                     y: (Math.random() - 0.5) 
                 };
             }
        }
    }
};