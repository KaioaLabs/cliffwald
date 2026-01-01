import { db } from "../db";
import { Entity } from "../../shared/ecs/components";

export class PersistenceManager {
    static async savePlayerSession(dbId: number, entity: Entity) {
        if (!entity.body || !entity.stats) return;

        const pos = entity.body.translation();
        
        try {
            // 1. Update Core Stats
            await db.player.update({
                where: { id: dbId },
                data: {
                    x: pos.x,
                    y: pos.y,
                    health: entity.stats.hp
                }
            });

            // 2. Save Inventory (Transaction)
            // TODO: Optimize with Upsert later if granular tracking is added
            if (entity.inventory) {
                await db.$transaction([
                    db.inventoryItem.deleteMany({ where: { playerId: dbId } }),
                    db.inventoryItem.createMany({
                        data: entity.inventory.items.map(item => ({
                            playerId: dbId,
                            itemId: item.itemId,
                            count: item.count
                        }))
                    })
                ]);
            }
            console.log(`[DB] Player ${dbId} saved successfully.`);
        } catch (e) {
            console.error(`[DB] Failed to save player ${dbId}:`, e);
        }
    }
}
