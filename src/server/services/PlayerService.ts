import { db } from "../db";

export class PlayerService {
    static async findOrCreateUser(username: string, skin: string, spawnPos: { x: number, y: number }) {
        const user = await db.user.upsert({
            where: { username },
            update: {},
            create: {
                username,
                password: "default_password",
                player: {
                    create: {
                        x: spawnPos.x + (Math.random() * 20 - 10),
                        y: spawnPos.y + (Math.random() * 20 - 10),
                        skin: skin
                    }
                }
            },
            include: { player: true }
        });

        let dbPlayer = user.player;
        if (!dbPlayer) {
             dbPlayer = await db.player.create({
                data: {
                    userId: user.id,
                    x: spawnPos.x,
                    y: spawnPos.y,
                    skin: skin
                }
            });
        } else if (dbPlayer.skin !== skin) {
             dbPlayer = await db.player.update({
                where: { id: dbPlayer.id },
                data: { skin: skin }
            });
        }
        return dbPlayer;
    }

    static async savePlayerPosition(dbId: number, x: number, y: number, hp: number) {
        try {
            await db.player.update({
                where: { id: dbId },
                data: {
                    x,
                    y,
                    health: hp
                }
            });
            console.log(`[DB] Saved player ${dbId}`);
        } catch (e) {
            console.error(`[DB] Failed to save player ${dbId}:`, e);
        }
    }
}
