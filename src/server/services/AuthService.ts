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
        
        const user = await db.user.create({
            data: {
                username,
                password: hashedPassword,
                player: {
                    create: {
                        x: CONFIG.SPAWN_POINT.x,
                        y: CONFIG.SPAWN_POINT.y,
                        skin: "player_idle" // Default skin
                    }
                }
            },
            include: { player: true }
        });

        return this.generateToken(user.id, user.username);
    }

    static async login(username: string, passwordRaw: string) {
        const user = await db.user.findUnique({ where: { username } });
        if (!user) {
            throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(passwordRaw, user.password);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }

        return this.generateToken(user.id, user.username);
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
