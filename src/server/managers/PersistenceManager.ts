import { db } from "../db";
import { Entity } from "../../shared/ecs/components";

export class PersistenceManager {
    static async savePlayerSession(dbId: number, entity: Entity, prestige: number, cards: number[]) {
        if (!entity.body) return;

        const pos = entity.body.translation();
        
        try {
            await db.$transaction(async (tx) => {
                // 1. Update Core Stats
                await tx.player.update({
                    where: { id: dbId },
                    data: {
                        x: pos.x,
                        y: pos.y,
                        prestige: prestige
                    }
                });

                // 2. Sync Card Collection
                // Remove all existing cards for this player to avoid duplicates/stale data
                await tx.inventoryItem.deleteMany({
                    where: { 
                        playerId: dbId, 
                        itemId: { startsWith: 'card_' } 
                    }
                });

                // Re-insert current collection
                if (cards.length > 0) {
                    await tx.inventoryItem.createMany({
                        data: cards.map(cardId => ({
                            playerId: dbId,
                            itemId: `card_${cardId}`,
                            count: 1
                        }))
                    });
                }
            });
            
            console.log(`[DB] Player ${dbId} saved successfully (Prestige: ${prestige}, Cards: ${cards.length}).`);
        } catch (e) {
            console.error(`[DB] Failed to save player ${dbId}:`, e);
        }
    }
}
