"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementSystem = void 0;
const Config_1 = require("../Config");
const MovementSystem = (world) => {
    // Iterate over all entities that HAVE a body AND input
    const movingEntities = world.with("body", "input");
    for (const entity of movingEntities) {
        const { body, input } = entity;
        let speed = Config_1.CONFIG.PLAYER_SPEED;
        let vx = 0;
        let vy = 0;
        // 1. ANALOG INPUT (AI / Joystick)
        if (input.analogDir && (input.analogDir.x !== 0 || input.analogDir.y !== 0)) {
            let ax = input.analogDir.x;
            let ay = input.analogDir.y;
            // SECURITY: Normalize analog input to prevent speed hacks
            const mag = Math.sqrt(ax * ax + ay * ay);
            if (mag > 1.0) {
                ax /= mag;
                ay /= mag;
            }
            vx = ax * speed;
            vy = ay * speed;
        }
        // 2. DISCRETE INPUT (Keyboard)
        else {
            if (input.left)
                vx = -speed;
            if (input.right)
                vx = speed;
            if (input.up)
                vy = -speed;
            if (input.down)
                vy = speed;
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
            // Check length to avoid div/0
            const len = Math.sqrt(vx * vx + vy * vy);
            if (len > 0.001) {
                entity.facing.x = vx / len;
                entity.facing.y = vy / len;
            }
        }
    }
};
exports.MovementSystem = MovementSystem;
