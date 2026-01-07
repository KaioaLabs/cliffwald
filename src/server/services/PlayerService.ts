import { db } from "../db";

export interface SessionData {
    dbPlayer: any;
}

export class PlayerService {
    /**
     * Prepares all necessary data for a player joining the world.
     * Handles creation and skin updates.
     */
    static async initializeSession(userId: number, username: string, options: { skin?: string, house?: string }): Promise<SessionData> {
        // 1. Fetch Player with Inventory
        let dbPlayer = await db.player.findUnique({
            where: { userId: userId },
            include: { inventory: true }
        });

        if (!dbPlayer) {
            // Self-healing: If user exists but player record missing (rare edge case)
            console.warn(`[DB] Player record missing for user ${userId}, creating fallback.`);
            dbPlayer = await db.player.create({
                data: {
                    userId: userId,
                    x: 300, 
                    y: 300,
                    skin: options.skin || "player_idle",
                    house: options.house || "ignis",
                    prestige: 0
                },
                include: { inventory: true }
            });
        }

        // 2. Update Skin if changed
        if (options.skin && options.skin !== dbPlayer.skin) {
            dbPlayer = await db.player.update({
                where: { id: dbPlayer.id },
                data: { skin: options.skin },
                include: { inventory: true }
            });
        }

        return { dbPlayer };
    }

    static async saveSession(dbId: number, playerState: any) {
        if (!dbId || !playerState) return;

        try {
            console.log(`[DB] Saving session for player DB_ID: ${dbId}...`);
            
            await db.$transaction(async (tx) => {
                // 1. Update Base Stats
                await tx.player.update({
                    where: { id: dbId },
                    data: {
                        x: playerState.x,
                        y: playerState.y,
                        prestige: playerState.personalPrestige,
                        skin: playerState.skin,
                        house: playerState.house
                    }
                });

                // 2. Sync Inventory (Delete All + Re-insert Strategy for consistency)
                // This prevents sync drifts and handles item removals automatically.
                await tx.inventoryItem.deleteMany({
                    where: { playerId: dbId }
                });

                if (playerState.inventory && playerState.inventory.length > 0) {
                    // Map Colyseus Schema to Prisma Data
                    const itemsToSave = playerState.inventory.map((item: any) => ({
                        playerId: dbId,
                        itemId: item.itemId,
                        count: item.qty, // Map qty -> count
                        equipped: false  // Default for now, extend later
                    }));

                    await tx.inventoryItem.createMany({
                        data: itemsToSave
                    });
                }
            });

            console.log(`[DB] Session saved successfully for DB_ID: ${dbId}`);
        } catch (e) {
            console.error(`[DB] CRITICAL ERROR saving session for ${dbId}:`, e);
        }
    }
}