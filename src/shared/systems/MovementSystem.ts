import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";

export const MovementSystem = (world: ECSWorld) => {
    // Iterate over all entities that HAVE a body AND input
    const movingEntities = world.with("body", "input");
    
    for (const entity of movingEntities) {
        const { body, input } = entity;
        let speed = CONFIG.PLAYER_SPEED;
        
        let vx = 0;
        let vy = 0;

        if (input.left) vx = -speed;
        if (input.right) vx = speed;
        if (input.up) vy = -speed;
        if (input.down) vy = speed;

        if (vx !== 0 && vy !== 0) {
            const factor = Math.SQRT1_2;
            vx *= factor;
            vy *= factor;
        }

        body.setLinvel({ x: vx, y: vy }, true);

        // Update Facing
        if ((vx !== 0 || vy !== 0) && entity.facing) {
            const len = Math.sqrt(vx*vx + vy*vy);
            entity.facing.x = vx / len;
            entity.facing.y = vy / len;
        }
    }
};