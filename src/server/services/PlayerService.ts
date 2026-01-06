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

    // --- Legacy / Dev Methods ---
    static async savePlayerState(dbId: number, data: { x: number, y: number, prestige: number }) {
        try {
            await db.player.update({
                where: { id: dbId },
                data: { 
                    x: data.x, 
                    y: data.y,
                    prestige: data.prestige
                }
            });
        } catch (e) {
            console.error(`[DB] Failed to save player ${dbId}:`, e);
        }
    }
}