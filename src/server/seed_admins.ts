import { db } from "./db";
import bcrypt from "bcryptjs";
import { CONFIG } from "../shared/Config";

const ADMIN_USER = "admin";
const ADMIN_PASS = "Miaularizador42";

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
                            skin: "teacher", // Special skin for admin
                            house: "ignis",
                            prestige: 9999 // Admin privilege
                        }
                    }
                }
            });
            console.log(`[SEED] Admin User created successfully.`);
        } else {
            console.log(`[SEED] Admin User already exists.`);
        }
    } catch (e) {
        console.error("[SEED] Failed to seed admins:", e);
    }
}
