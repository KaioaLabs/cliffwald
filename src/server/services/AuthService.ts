import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { CONFIG } from '../../shared/Config';

export class AuthService {
    private static SALT_ROUNDS = 10;

    static async register(username: string, passwordRaw: string) {
        const existingUser = await db.user.findUnique({ where: { username } });
        if (existingUser) {
            throw new Error("Username already taken");
        }

        const hashedPassword = await bcrypt.hash(passwordRaw, this.SALT_ROUNDS);
        
        const newUser = await db.user.create({
            data: {
                username,
                password: hashedPassword,
                player: {
                    create: {
                        isCreated: false,
                        username: username, // Default to login name initially
                        x: CONFIG.SPAWN_POINT.x,
                        y: CONFIG.SPAWN_POINT.y,
                        skin: "player_idle",
                        house: "ignis"
                    }
                }
            },
            include: { player: true }
        });
        console.log(`[AUTH] New User Registered: ${username}`);
        return this.generateToken(newUser.id, newUser.username);
    }

    static async login(username: string, passwordRaw: string) {
        const user = await db.user.findUnique({ 
            where: { username },
            include: { player: true } 
        });
        
        if (!user) {
            throw new Error("User not found");
        }

        const isValid = await bcrypt.compare(passwordRaw, user.password);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }

        return {
            token: this.generateToken(user.id, user.username),
            hasCharacter: user.player?.isCreated || false,
            skin: user.player?.skin || "player_idle",
            house: user.player?.house || "ignis"
        };
    }

    static async createCharacter(userId: number, name: string, skin: string, house: string) {
        const player = await db.player.findUnique({ where: { userId } });
        if (player && player.isCreated) {
            throw new Error("Character already exists");
        }

        await db.player.update({
            where: { userId },
            data: {
                isCreated: true,
                username: name,
                skin,
                house,
                // Reset stats
                xp: 0,
                gold: 0,
                personalPrestige: 0,
                academicPoints: 0,
                x: CONFIG.SPAWN_POINT.x,
                y: CONFIG.SPAWN_POINT.y,
                unconsciousUntil: 0
            }
        });
    }

    static async deleteCharacter(userId: number) {
        // Soft reset: we keep the player record but reset it
        await db.player.update({
            where: { userId },
            data: {
                isCreated: false,
                // Reset everything important
                xp: 0,
                gold: 0,
                personalPrestige: 0,
                academicPoints: 0,
                inventory: { set: [] }, // Clear relations if possible or handled elsewhere?
                // Note: Clearing JSON array/relations depends on Prisma. 
                // For simplified 'inventory' JSON type, this works.
                // If it's a relation, we need deleteMany.
                // Assuming SchemaDef Player.inventory is JSON/Array in DB? 
                // In Prisma schema it's `InventoryItem[]` relation?
                // Let's check Schema... inventory is a relation usually.
                // We will handle inventory cleanup separately if needed or rely on cascade?
                // Prisma relations usually require explicit delete.
            }
        });
        
        // Explicitly clear inventory items relation
        // This requires importing db correctly and knowing the schema
        const player = await db.player.findUnique({ where: { userId } });
        if (player) {
             await db.inventoryItem.deleteMany({ where: { ownerId: player.id } });
        }
    }

    static async renameCharacter(userId: number, newName: string) {
        const player = await db.player.findUnique({ where: { userId } });
        if (!player) throw new Error("Player not found");
        
        if (player.nameChangeCount >= 1) {
            throw new Error("Name change limit reached");
        }

        await db.player.update({
            where: { userId },
            data: {
                username: newName,
                nameChangeCount: { increment: 1 }
            }
        });
    }

    static async checkUser(username: string): Promise<boolean> {
        const user = await db.user.findUnique({ where: { username } });
        return !!user;
    }

    /**
     * For Development ONLY: Automatically creates a user if not exists, 
     * always logs them in.
     */
    static async devLogin(username: string) {
        const user = await db.user.findUnique({ where: { username } });
        
        if (user) {
            // If exists, force return a token (we trust the dev context)
            return this.generateToken(user.id, user.username);
        } else {
            // Create on the fly with a random password since we bypass it in devLogin
            const randomPass = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPass, this.SALT_ROUNDS);
            const newUser = await db.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    player: {
                        create: {
                            x: CONFIG.SPAWN_POINT.x,
                            y: CONFIG.SPAWN_POINT.y,
                            skin: "player_idle"
                        }
                    }
                },
                include: { player: true }
            });
            return this.generateToken(newUser.id, newUser.username);
        }
    }

    // Server-Side Secret Management
    private static getSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error("FATAL: JWT_SECRET is not defined in production environment!");
            }
            console.warn("[AUTH] Using default development secret. Set JWT_SECRET in .env for security.");
            return "dev-secret-key-cliffwald-2026";
        }
        return secret;
    }

    static generateToken(userId: number, username: string) {
        return jwt.sign({ userId, username }, this.getSecret(), { expiresIn: '7d' });
    }

    static verifyToken(token: string): { userId: number, username: string } | null {
        try {
            return jwt.verify(token, this.getSecret()) as { userId: number, username: string };
        } catch (e) {
            return null;
        }
    }
}
