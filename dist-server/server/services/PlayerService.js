"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerService = void 0;
const db_1 = require("../db");
class PlayerService {
    /**
     * Prepares all necessary data for a player joining the world.
     * Handles creation and skin updates.
     */
    static async initializeSession(userId, username, options) {
        // 1. Fetch Player with Inventory
        let dbPlayer = await db_1.db.player.findUnique({
            where: { userId: userId },
            include: { inventory: true }
        });
        if (!dbPlayer) {
            // Self-healing: If user exists but player record missing (rare edge case)
            console.warn(`[DB] Player record missing for user ${userId}, creating fallback.`);
            dbPlayer = await db_1.db.player.create({
                data: {
                    userId: userId,
                    x: 300,
                    y: 300,
                    skin: options.skin || "player_idle",
                    house: options.house || "ignis",
                    prestige: 0,
                    xp: 0,
                    alignment: 0,
                    academicPoints: 0
                },
                include: { inventory: true }
            });
        }
        // 2. Enforce Permanent Identity (Do NOT update skin/house on login)
        // The Sorting Hat's choice is final.
        if (dbPlayer) {
            // Optional: Log if user tried to change skin but was ignored
            if (options.skin && options.skin !== dbPlayer.skin) {
                console.log(`[AUTH] User ${username} tried to change skin/house to ${options.skin}, but identity is permanent.`);
            }
        }
        return { dbPlayer };
    }
    static async saveSession(dbId, playerState) {
        if (!dbId || !playerState)
            return;
        try {
            // console.log(`[DB] Saving session for player DB_ID: ${dbId}...`);
            await db_1.db.$transaction(async (tx) => {
                // 1. Update Base Stats
                await tx.player.update({
                    where: { id: dbId },
                    data: {
                        x: playerState.x,
                        y: playerState.y,
                        prestige: playerState.personalPrestige,
                        gold: playerState.gold || 0,
                        skin: playerState.skin,
                        house: playerState.house,
                        xp: playerState.xp,
                        // Note: alignment and academicPoints must be passed in playerState or handled separately
                        // Assuming playerState has them attached, or we need to pass them explicitly.
                        // For now, let's assume they are on the playerState object (we will ensure this in WorldRoom)
                        alignment: playerState.alignment || 0,
                        academicPoints: playerState.academicPoints || 0
                    }
                });
                // 2. Efficient Inventory Sync (Diffing Strategy)
                if (playerState.inventory) {
                    // Fetch existing items to compare
                    const existingItems = await tx.inventoryItem.findMany({
                        where: { playerId: dbId }
                    });
                    const currentMap = new Map();
                    // Map schema items for O(1) lookup
                    playerState.inventory.forEach((item) => {
                        currentMap.set(item.itemId, item);
                    });
                    const toDelete = [];
                    const toUpdate = [];
                    // Identify Deletions and Updates
                    for (const dbItem of existingItems) {
                        const schemaItem = currentMap.get(dbItem.itemId);
                        if (!schemaItem) {
                            // Item no longer in inventory -> Delete
                            toDelete.push(dbItem.id);
                        }
                        else {
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
        }
        catch (e) {
            console.error(`[DB] CRITICAL ERROR saving session for ${dbId}:`, e);
        }
    }
}
exports.PlayerService = PlayerService;
