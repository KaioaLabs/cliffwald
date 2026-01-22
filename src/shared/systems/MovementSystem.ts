import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";
import { MathUtils } from "../utils/MathUtils";

export const MovementSystem = (world: ECSWorld) => {
    // Iterate over all entities that HAVE a body AND input
    const movingEntities = world.with("body", "input");
    
    for (const entity of movingEntities) {
        const { body, input } = entity;
        let speed = CONFIG.PLAYER_SPEED;
        
        if (input.isGhost) {
            speed *= CONFIG.PHYSICS.GHOST_SPEED_MULTIPLIER;
        }
        
        let vx = 0;
        let vy = 0;

        // 1. ANALOG INPUT (AI / Joystick)
        if (input.analogDir && (input.analogDir.x !== 0 || input.analogDir.y !== 0)) {
            let ax = input.analogDir.x;
            let ay = input.analogDir.y;
            
            // SECURITY: Normalize analog input to prevent speed hacks
            const mag = Math.sqrt(ax * ax + ay * ay);
            if (mag > 1.0) {
                ax = ax / mag;
                ay = ay / mag;
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
        // Refactored to use CONFIG.PHYSICS.VELOCITY_MULTIPLIER
        const multiplier = CONFIG.PHYSICS.VELOCITY_MULTIPLIER; 
        body.setLinvel({ x: vx * multiplier, y: vy * multiplier }, true);

        // Update Facing
        if ((vx !== 0 || vy !== 0) && entity.facing) {
            const mag = Math.sqrt(vx * vx + vy * vy);
            if (mag > 0) {
                entity.facing.x = vx / mag;
                entity.facing.y = vy / mag;
            }
        }
    }
};