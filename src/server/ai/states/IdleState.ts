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

        // 2. Idle Behavior - Organic "Wander & Pause"
        // Cycle: 0-3s (Stand/Look) -> 3-5s (Walk Short Distance) -> Reset
        
        const cycleTime = 5000; // 5 second loop
        const phase = ai.timer % cycleTime;
        
        // Fix Type Error: ID can be number or undefined in Entity interface
        // Cast to any to handle runtime string IDs from network
        const safeId = id as any;
        const seedVal = typeof safeId === 'number' ? safeId : (typeof safeId === 'string' ? safeId.charCodeAt(0) : 0);
        const seed = seedVal || 0; 

        if (phase < 3000) {
            // PHASE 1: STAND STILL (Look around)
            input.analogDir = { x: 0, y: 0 };
            
            // Micro-behavior: Subtle glances (Don't rotate away from the table/desk)
            if (Math.floor(ai.timer / 500) % 8 === 0) {
                 const safeId = id as any;
                 const seedVal = typeof safeId === 'number' ? safeId : (typeof safeId === 'string' ? safeId.charCodeAt(0) : 0);
                 const noise = Math.sin(Date.now() / 2000 + seedVal);
                 
                 if (facing) { 
                     // Only apply a tiny offset to current facing (Glance)
                     // instead of replacing it with a full random angle.
                     // This preserves the "Arrival Facing" set by RoutineState.
                     const glanceAngle = noise * 0.2; // ~11 degrees
                     const currentAngle = Math.atan2(facing.y, facing.x);
                     const finalAngle = currentAngle + glanceAngle;
                     
                     // We don't want to drift permanently, so we don't save the new angle 
                     // back to a 'baseFacing'. But for now, just making it very subtle 
                     // and returning to "mostly forward" is better.
                     // Actually, just doing nothing is safer to avoid "radar" effect.
                 }
            }
        } else {
            // PHASE 2: MICRO-WANDER (Constrained to Personal Space)
            // Criticism Fix: Don't wander wildly. Stay within a 30px "comfort zone" of the anchor.
            
            // 1. Establish Anchor (Current Pos at start of Idle, or Home)
            // Since we don't store "IdleStartPos", we use the fact that we stop moving in Phase 1.
            // Let's just use small random twitches.
            
            const idVal = typeof safeId === 'string' ? safeId.length : (safeId || 0);
            
            // Change direction only every 0.5s to avoid jitter
            if (Math.floor(ai.timer / 500) % 2 === 0) {
                 const angle = (idVal + Math.floor(Date.now() / 500)) % 360;
                 const rad = angle * (Math.PI / 180);
                 
                 // Very slow speed (Shuffle)
                 input.analogDir = { 
                    x: Math.cos(rad) * 0.2, 
                    y: Math.sin(rad) * 0.2 
                 };
            }
        }

        // ARCHETYPE OVERRIDES (Flavor)
        if (ai.archetype === 'KILLER' && Math.random() < 0.005 && castCallback) {
             // Rare random spell practice
             const spells = ['circle', 'square', 'triangle'];
             const spell = spells[Math.floor(Math.random() * spells.length)];
             castCallback(entity.player?.sessionId || "", spell, Math.random()*200, Math.random()*200);
        }
    }
};