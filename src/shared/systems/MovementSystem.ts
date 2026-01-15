import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";
import { MathUtils } from "../utils/MathUtils";

export const MovementSystem = (world: ECSWorld) => {
    // Iterate over all entities that HAVE a body AND input
    const movingEntities = world.with("body", "input");
    
    for (const entity of movingEntities) {
        const { body, input } = entity;
        let speed = CONFIG.PLAYER_SPEED;
        
        let vx = 0;
        let vy = 0;

        // 1. ANALOG INPUT (AI / Joystick)
        if (input.analogDir && (input.analogDir.x !== 0 || input.analogDir.y !== 0)) {
            let ax = input.analogDir.x;
            let ay = input.analogDir.y;
            
            // SECURITY: Normalize analog input to prevent speed hacks
            const mag = Math.sqrt(ax * ax + ay * ay);
            if (mag > 1.0) {
                const norm = MathUtils.normalize(ax, ay);
                ax = norm.x;
                ay = norm.y;
            }

            vx = ax * speed;
            vy = ay * speed;
        } 
        // 2. DISCRETE INPUT (Keyboard)
        else {
            if (input.left) vx = -speed;
            if (input.right) vx = speed;
            if (input.up) vy = -speed;
            if (input.down) vy = speed;

            if (vx !== 0 && vy !== 0) {
                const factor = Math.SQRT1_2;
                vx *= factor;
                vy *= factor;
            }
        }

        // For Dynamic bodies with damping, we need a strong velocity kick
        const moveSpeed = speed * 1.5; 
        body.setLinvel({ x: vx * 1.5, y: vy * 1.5 }, true);

        // Update Facing
        if ((vx !== 0 || vy !== 0) && entity.facing) {
            const norm = MathUtils.normalize(vx, vy);
            if (norm.x !== 0 || norm.y !== 0) {
                entity.facing.x = norm.x;
                entity.facing.y = norm.y;
            }
        }
    }
};