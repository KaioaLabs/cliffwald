import { world } from "../ecs/world";
import { CONFIG } from "../Config";

export const AISystem = (dt: number) => {
    const entities = world.with("ai", "body", "input");

    for (const entity of entities) {
        // Simple State Machine
        const now = Date.now();
        
        if (entity.ai.state === 'idle') {
            entity.input.left = false;
            entity.input.right = false;
            entity.input.up = false;
            entity.input.down = false;
            
            if (now - entity.ai.lastStateChange > 2000) {
                // Switch to patrol
                entity.ai.state = 'patrol';
                entity.ai.lastStateChange = now;
                
                // Pick random direction
                const dir = Math.floor(Math.random() * 4);
                entity.input.left = dir === 0;
                entity.input.right = dir === 1;
                entity.input.up = dir === 2;
                entity.input.down = dir === 3;
            }
        } else if (entity.ai.state === 'patrol') {
            if (now - entity.ai.lastStateChange > 1000) {
                 entity.ai.state = 'idle';
                 entity.ai.lastStateChange = now;
            }
        }
    }
};
