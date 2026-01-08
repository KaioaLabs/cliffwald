"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const Config_1 = require("../../shared/Config");
class AuthService {
    static { this.SALT_ROUNDS = 10; }
    static async register(username, passwordRaw) {
        const existingUser = await db_1.db.user.findUnique({ where: { username } });
        if (existingUser) {
            throw new Error("Username already taken");
        }
        const hashedPassword = await bcryptjs_1.default.hash(passwordRaw, this.SALT_ROUNDS);
        const user = await db_1.db.user.create({
            data: {
                username,
                password: hashedPassword,
                player: {
                    create: {
                        x: Config_1.CONFIG.SPAWN_POINT.x,
                        y: Config_1.CONFIG.SPAWN_POINT.y,
                        skin: "player_idle" // Default skin
                    }
                }
            },
            include: { player: true }
        });
        return this.generateToken(user.id, user.username);
    }
    static async login(username, passwordRaw) {
        const user = await db_1.db.user.findUnique({ where: { username } });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        const isValid = await bcryptjs_1.default.compare(passwordRaw, user.password);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        return this.generateToken(user.id, user.username);
    }
    /**
     * For Development ONLY: Automatically creates a user if not exists,
     * always logs them in.
     */
    static async devLogin(username) {
        const user = await db_1.db.user.findUnique({ where: { username } });
        if (user) {
            // If exists, force return a token (we trust the dev context)
            return this.generateToken(user.id, user.username);
        }
        else {
            // Create on the fly with a random password since we bypass it in devLogin
            const randomPass = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcryptjs_1.default.hash(randomPass, this.SALT_ROUNDS);
            const newUser = await db_1.db.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    player: {
                        create: {
                            x: Config_1.CONFIG.SPAWN_POINT.x,
                            y: Config_1.CONFIG.SPAWN_POINT.y,
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
    static getSecret() {
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
    static generateToken(userId, username) {
        return jsonwebtoken_1.default.sign({ userId, username }, this.getSecret(), { expiresIn: '7d' });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.getSecret());
        }
        catch (e) {
            return null;
        }
    }
}
exports.AuthService = AuthService;
