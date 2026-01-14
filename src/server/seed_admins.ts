import { db } from "./db";
import bcrypt from "bcryptjs";
import { CONFIG } from "../shared/Config";

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

export async function seedAdmins() {
    try {
        const existing = await db.user.findUnique({ where: { username: ADMIN_USER } });
        
        if (!existing) {
            console.log(`[SEED] Creating Admin User: ${ADMIN_USER}...`);
            const hashedPassword = await bcrypt.hash(ADMIN_PASS, 10);
            
            await db.user.create({
                data: {
                    username: ADMIN_USER,
                    password: hashedPassword,
                    player: {
                        create: {
                            x: CONFIG.SPAWN_POINT.x,
                            y: CONFIG.SPAWN_POINT.y,
                            skin: "player_idle", // Normal student skin
                            house: "ignis",
                            prestige: 9999 // Admin privilege
                        }
                    }
                }
            });
            console.log(`[SEED] Admin User created successfully.`);
        } else {
            // Update password if it exists to ensure the new one is applied
            console.log(`[SEED] Admin User already exists. Updating password...`);
            const hashedPassword = await bcrypt.hash(ADMIN_PASS, 10);
            await db.user.update({
                where: { username: ADMIN_USER },
                data: { password: hashedPassword }
            });
            console.log(`[SEED] Admin User password updated.`);
        }
    } catch (e) {
        console.error("[SEED] Failed to seed admins:", e);
    }
}
