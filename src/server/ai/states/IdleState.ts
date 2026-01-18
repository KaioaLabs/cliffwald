import { Entity } from "../../../shared/ecs/components";
import { getStudentScheduleTarget } from "../../../shared/utils/ScheduleUtils";
import { MathUtils } from "../../../shared/utils/MathUtils";

export const IdleState = {
    update: (
        entity: Entity, 
        dt: number, 
        currentHour: number,
        castCallback?: (id: string, spell: string, vx: number, vy: number) => void,
        chatCallback?: (id: string, text: string) => void
    ) => {
        const { ai, body, input, facing, id } = entity;
        if (!ai || !body || !input) return;

        // 1. Check Schedule Change
        if (ai.routineSpots && ai.timer > 1000) {
            const schedule = getStudentScheduleTarget(currentHour);
            ai.state = 'routine';
            ai.timer = 0;
            return;
        }

        // 2. Idle Behavior
        const cycleTime = 5000; // 5 second loop
        const phase = ai.timer % cycleTime;
        
        const safeId = id as any;
        const seedVal = typeof safeId === 'number' ? safeId : (typeof safeId === 'string' ? safeId.charCodeAt(0) : 0);

        if (phase < 3000) {
            // PHASE 1: STAND STILL (Look around)
            input.analogDir = { x: 0, y: 0 };
            
            // Micro-behavior: Subtle glances
            if (Math.floor(ai.timer / 500) % 8 === 0) {
                 const noise = Math.sin(Date.now() / 2000 + seedVal);
                 
                 if (facing) { 
                     const glanceAngle = noise * 0.2; // ~11 degrees
                     const currentAngle = Math.atan2(facing.y, facing.x);
                     const finalAngle = currentAngle + glanceAngle;
                     
                     // Apply glance
                     facing.x = Math.cos(finalAngle);
                     facing.y = Math.sin(finalAngle);
                 }
            }
        } else {
            // PHASE 2: MICRO-WANDER
            const idVal = typeof safeId === 'string' ? safeId.length : (safeId || 0);
            
            if (Math.floor(ai.timer / 500) % 2 === 0) {
                 const angle = (idVal + Math.floor(Date.now() / 500)) % 360;
                 const rad = angle * (Math.PI / 180);
                 
                 input.analogDir = { 
                    x: Math.cos(rad) * 0.2, 
                    y: Math.sin(rad) * 0.2 
                 };
            }
        }

        // ARCHETYPE OVERRIDES
        
        // KILLER: Random Cast
        if (ai.archetype === 'KILLER' && Math.random() < 0.005 && castCallback) {
             const spells = ['circle', 'square', 'triangle'];
             const spell = spells[Math.floor(Math.random() * spells.length)];
             castCallback(entity.player?.sessionId || "", spell, Math.random()*200, Math.random()*200);
        }

        // SOCIALIZER: Random Chat
        if (ai.archetype === 'SOCIALIZER' && Math.random() < 0.001 && chatCallback) {
            const phrases = ["Anyone for duels?", "Homework is tough...", "Nice weather.", "lol", "brb"];
            const text = phrases[Math.floor(Math.random() * phrases.length)];
            chatCallback(entity.player?.sessionId || "", text);
        }
    }
};
