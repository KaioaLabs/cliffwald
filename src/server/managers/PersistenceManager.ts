import { db } from "../db";
import { Entity } from "../../shared/ecs/components";

export class PersistenceManager {
    static async savePlayerSession(dbId: number, entity: Entity) {
        if (!entity.body) return;

        const pos = entity.body.translation();
        
        try {
            // 1. Update Core Stats (Pos only now)
            await db.player.update({
                where: { id: dbId },
                data: {
                    x: pos.x,
                    y: pos.y
                }
            });
            console.log(`[DB] Player ${dbId} saved successfully.`);
        } catch (e) {
            console.error(`[DB] Failed to save player ${dbId}:`, e);
        }
    }
}
