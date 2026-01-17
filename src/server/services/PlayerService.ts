import { db } from "../db";
import { Player, InventoryItem } from "../../shared/SchemaDef";

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
            console.warn(`[DB] Player record missing for user ${userId}, creating fallback.`);
            // Create if not exists (Should be handled by Auth, but fallback)
            dbPlayer = await db.player.create({
                data: {
                    userId,
                    x: 300, y: 300,
                    username: "Wanderer",
                    skin: "player_idle",
                    house: "ignis",
                    prestige: 0,
                    xp: 0,
                    alignment: 0,
                    academicPoints: 0
                },
                include: { inventory: true }
            });
        }

        if (dbPlayer) {
            if (options.skin && options.skin !== dbPlayer.skin) {
                console.log(`[AUTH] User ${username} tried to change skin/house to ${options.skin}, but identity is permanent.`);
            }
        }

        return { dbPlayer };
    }

    static async saveSession(dbId: number, playerState: Player) {
        if (!dbId || !playerState) return;

        try {
            // console.log(`[DB] Saving session for player DB_ID: ${dbId}...`);
            
            await db.$transaction(async (tx) => {
                // 1. Update Base Stats
                await tx.player.update({
                    where: { id: dbId },
                    data: {
                        x: playerState.x,
                        y: playerState.y,
                        prestige: playerState.personalPrestige,
                        gold: playerState.gold,
                        skin: playerState.skin,
                        house: playerState.house,
                        xp: playerState.xp,
                        alignment: playerState.alignment || 0,
                        academicPoints: playerState.academicPoints || 0,
                        detentionWork: playerState.detentionWork || 0,
                        unconsciousUntil: BigInt(playerState.unconsciousUntil || 0)
                    }
                });

                // 2. Efficient Inventory Sync (Diffing Strategy)
                if (playerState.inventory) {
                    // Fetch existing items to compare
                    const existingItems = await tx.inventoryItem.findMany({
                        where: { playerId: dbId }
                    });

                    const currentMap = new Map<string, InventoryItem>();
                    // Map schema items for O(1) lookup
                    playerState.inventory.forEach((item) => {
                        currentMap.set(item.itemId, item);
                    });

                    const toDelete: number[] = [];
                    const toUpdate: Promise<any>[] = [];

                    // Identify Deletions and Updates
                    for (const dbItem of existingItems) {
                        const schemaItem = currentMap.get(dbItem.itemId);
                        if (!schemaItem) {
                            // Item no longer in inventory -> Delete
                            toDelete.push(dbItem.id);
                        } else {
                            // Item exists -> Check if update needed
                            if (dbItem.count !== schemaItem.qty) {
                                toUpdate.push(tx.inventoryItem.update({
                                    where: { id: dbItem.id },
                                    data: { count: schemaItem.qty }
                                }));
                            }
                            // Remove from map to identify NEW items later
                            currentMap.delete(dbItem.itemId);
                        }
                    }

                    // Identify Creations (remaining in map)
                    const toCreate = Array.from(currentMap.values()).map((item) => ({
                        playerId: dbId,
                        itemId: item.itemId,
                        count: item.qty,
                        equipped: false
                    }));

                    // Execute Bulk Operations
                    if (toDelete.length > 0) {
                        await tx.inventoryItem.deleteMany({
                            where: { id: { in: toDelete } }
                        });
                    }
                    if (toCreate.length > 0) {
                        await tx.inventoryItem.createMany({
                            data: toCreate
                        });
                    }
                    if (toUpdate.length > 0) {
                        await Promise.all(toUpdate);
                    }
                }
            });

            // console.log(`[DB] Session saved successfully for DB_ID: ${dbId}`);
        } catch (e) {
            console.error(`[DB] CRITICAL ERROR saving session for ${dbId}:`, e);
        }
    }

    static async setEchoId(dbId: number, echoId: string) {
        try {
            // First, clear this echoId from any other player to maintain uniqueness
            await db.player.updateMany({
                where: { echoId: echoId, NOT: { id: dbId } },
                data: { echoId: null }
            });

            await db.player.update({
                where: { id: dbId },
                data: { echoId: echoId }
            });
        } catch (e) {
            console.error(`[DB] Failed to set EchoID ${echoId} for Player ${dbId}:`, e);
        }
    }

    static async getEchoMap(): Promise<Map<string, any>> {
        const map = new Map<string, any>();
        try {
            const players = await db.player.findMany({
                where: { echoId: { not: null } },
                include: { user: true }
            });
            players.forEach(p => {
                if (p.echoId) map.set(p.echoId, { 
                    username: p.user.username, // Use User name as source of truth
                    skin: p.skin,
                    prestige: p.prestige 
                });
            });
        } catch (e) {
            console.error("[DB] Failed to load Echo Map:", e);
        }
        return map;
    }
}