import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";

export const AISystem = (world: ECSWorld, dt: number) => {
    const entities = world.with("ai", "body", "input");

    for (const entity of entities) {
        // Accumulate simulation time
        entity.ai.timer += dt;
        
        if (entity.ai.state === 'idle') {
            entity.input.left = false;
            entity.input.right = false;
            entity.input.up = false;
            entity.input.down = false;
            
            // Wait 2 seconds
            if (entity.ai.timer > 2.0) {
                // Switch to patrol
                entity.ai.state = 'patrol';
                entity.ai.timer = 0;
                
                // Pick random direction (including diagonals)
                const dir = Math.floor(Math.random() * 8);
                entity.input.left = dir === 0 || dir === 4 || dir === 5;
                entity.input.right = dir === 1 || dir === 6 || dir === 7;
                entity.input.up = dir === 2 || dir === 4 || dir === 6;
                entity.input.down = dir === 3 || dir === 5 || dir === 7;
            }
        } else if (entity.ai.state === 'patrol') {
            // Patrol for 1 second
            if (entity.ai.timer > 1.0) {
                 entity.ai.state = 'idle';
                 entity.ai.timer = 0;
            }
        } else if (entity.ai.state === 'chase') {
            // Chase player logic would go here
            // For now, just keep chasing until timer expires
            if (entity.ai.timer > 5.0) {
                entity.ai.state = 'idle';
                entity.ai.timer = 0;
            }
        }
    }
};
