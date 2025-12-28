import RAPIER from "@dimforge/rapier2d-compat";
import { world } from "../ecs/world";
import { Entity } from "../ecs/components";

export const CombatSystem = (dt: number, physicsWorld: RAPIER.World, entitiesBySession: Map<string, Entity>) => {
    // Entities that can attack
    const attackers = world.with("input", "combat", "facing", "body", "player");

    for (const entity of attackers) {
        if (entity.combat.cooldown > 0) {
            entity.combat.cooldown -= dt;
        }

        if (entity.input.attack && entity.combat.cooldown <= 0) {
            entity.combat.cooldown = 0.5; // Reset
            // console.log(`[COMBAT] Player ${entity.player.sessionId} attacked!`);

            const { x, y } = entity.body.translation();
            const fx = entity.facing.x;
            const fy = entity.facing.y;
            
            // Hitbox Center (In front of player)
            // Offset should be roughly Radius + Range/2
            const offset = 16; 
            const hitX = x + fx * offset; 
            const hitY = y + fy * offset;

            const shape = new RAPIER.Ball(10); 
            const pos = { x: hitX, y: hitY };

            physicsWorld.intersectionsWithShape(pos, 0, shape, (collider) => {
                const parentBody = collider.parent();
                if (!parentBody) return true;

                const userData = parentBody.userData as any;
                if (userData && userData.sessionId && userData.sessionId !== entity.player.sessionId) {
                    const victim = entitiesBySession.get(userData.sessionId);
                    if (victim && victim.stats) {
                        victim.stats.hp -= entity.combat.damage;
                        if (victim.stats.hp < 0) victim.stats.hp = 0;
                        console.log(`[COMBAT] ${entity.player.sessionId} hit ${userData.sessionId}! HP: ${victim.stats.hp}`);
                    }
                }
                return true;
            });
        }
    }
};
