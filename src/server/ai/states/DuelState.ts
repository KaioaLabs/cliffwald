import { Entity } from "../../../shared/ecs/components";
import { MathUtils } from "../../../shared/utils/MathUtils";

export const DuelState = {
    update: (
        entity: Entity, 
        dt: number, 
        castCallback: (id: string, spellId: string, vx: number, vy: number) => void,
        targetProvider: (id: string) => { x: number, y: number } | null
    ) => {
        const { ai, body, input, facing } = entity;
        if (!ai || !body || !input) return;

        const currentPos = body.translation();

        // Check Target
        if (!ai.targetId || !targetProvider) {
            ai.state = 'idle';
            return;
        }

        const targetPos = targetProvider(ai.targetId);
        if (!targetPos) {
            // Target lost/offline
            ai.state = 'idle';
            return;
        }

        const dist = MathUtils.distance(targetPos.x, targetPos.y, currentPos.x, currentPos.y);
        const norm = MathUtils.normalize(targetPos.x - currentPos.x, targetPos.y - currentPos.y);
        const nx = norm.x;
        const ny = norm.y;
        
        // Movement Logic: Maintain ~250px distance ("Kiting")
        let moveX = 0, moveY = 0;
        
        if (dist > 300) { 
            // Too far, approach
            moveX = nx; 
            moveY = ny; 
        } else if (dist < 150) { 
            // Too close, retreat
            moveX = -nx; 
            moveY = -ny; 
        } else {
            // Sweet spot: Strafe
            // Use numeric ID or random seed for unique strafe direction
            const numericId = typeof entity.id === 'number' ? entity.id : 0;
            const strafe = Math.sin(Date.now() / 1000 + numericId) > 0 ? 1 : -1;
            moveX = -ny * strafe * 0.5; // Perpendicular vector
            moveY = nx * strafe * 0.5;
        }
        
        input.analogDir = { x: moveX, y: moveY };
        if (facing) { facing.x = nx; facing.y = ny; }

        // Combat Logic: Cast Spells
        // Timer based
        if (ai.timer > 2500) { // Every 2.5s
            // RPS Logic Selection
            // Ideally: AI knows what the opponent cast recently? For now, random.
            const spells = ['circle', 'square', 'triangle'];
            const spell = spells[Math.floor(Math.random() * spells.length)];
            
            // Cast towards target
            castCallback(entity.player?.sessionId || "", spell, nx * 400, ny * 400);
            ai.timer = 0;
        }
    }
};
