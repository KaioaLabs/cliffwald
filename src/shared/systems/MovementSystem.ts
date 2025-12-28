import { CONFIG } from "../Config";
import { movingEntities } from "../ecs/world";

export const MovementSystem = () => {
    // Iterate over all entities that HAVE a body AND input
    for (const entity of movingEntities) {
        const { body, input } = entity;
        const speed = CONFIG.PLAYER_SPEED;
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
    }
};
