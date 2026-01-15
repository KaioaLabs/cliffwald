import "dotenv/config";
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./WorldRoom";
import { AuthService } from "./services/AuthService";
import { initDatabase } from "./init_db";
import { seedAdmins } from "./seed_admins";

const port = Number(process.env.PORT || 2568);
const app = express();

app.use(cors());
app.use(express.json());

// --- DIAGNOSTIC ROUTE ---
app.get("/ping", (req, res) => {
    res.send(`PONG from Server (Time: ${new Date().toISOString()})`);
});

app.get("/debug-paths", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const results: any = {};
    const checkPath = (p: string) => {
        try {
            results[p] = fs.existsSync(p) ? fs.readdirSync(p) : "MISSING";
        } catch(e: any) { results[p] = "ERROR: " + e.message; }
    };
    
    checkPath(path.join(__dirname, "../client"));
    checkPath(path.join(__dirname, "../../dist/client"));
    checkPath(process.cwd());
    checkPath(path.join(process.cwd(), "dist"));

    res.json({
        cwd: process.cwd(),
        __dirname,
        env: process.env.NODE_ENV,
        results
    });
});
// ------------------------

// --- AUTH API ROUTES ---

app.post("/api/check-user", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "Missing username" });
        const exists = await AuthService.checkUser(username);
        res.json({ exists });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        
        const result = await AuthService.login(username, password);
        res.json(result); // { token, skin, house }
    } catch (e: any) {
        console.error("[AUTH] Login Error:", e.message);
        const status = e.message === "User not found" ? 404 : 401;
        res.status(status).json({ error: e.message });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        
        const token = await AuthService.register(username, password);
        res.json({ token });
    } catch (e: any) {
        console.error("[AUTH] Register Error:", e.message);
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/character/create", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.sendStatus(401);
        
        const userData = AuthService.verifyToken(token);
        if (!userData) return res.sendStatus(403);

        const { name, skin, house } = req.body;
        await AuthService.createCharacter(userData.userId, name, skin, house);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/character/delete", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.sendStatus(401);
        
        const userData = AuthService.verifyToken(token);
        if (!userData) return res.sendStatus(403);

        await AuthService.deleteCharacter(userData.userId);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/character/rename", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.sendStatus(401);
        
        const userData = AuthService.verifyToken(token);
        if (!userData) return res.sendStatus(403);

        const { newName } = req.body;
        await AuthService.renameCharacter(userData.userId, newName);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/dev-login", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "Missing username" });
        const token = await AuthService.devLogin(username);
        res.json({ token });
    } catch (e: any) {
        console.error("[AUTH] Dev-Login Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/logs", (req, res) => {
    const { type, message, user } = req.body;
    const color = type === 'error' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}[CLIENT:${user || 'UNK'}] [${type.toUpperCase()}] ${message}\x1b[0m`);
    res.sendStatus(200);
});

// -----------------------

import path from "path";
import RAPIER from "@dimforge/rapier2d-compat";

// Serve Static Client (Production)
if (process.env.NODE_ENV === "production") {
    const fs = require('fs');
    
    // DEBUG: Recursive List to find where the files are
    console.log("--- DEBUG: FILE SYSTEM STRUCTURE ---");
    console.log("CWD:", process.cwd());
    console.log("__dirname:", __dirname);
    console.log("------------------------------------");

    // Robust path resolution using process.cwd()
    // Priority 1: Standard Vite output at root/dist-client
    const viteDist = path.join(process.cwd(), "dist-client");
    
    if (fs.existsSync(viteDist)) {
        console.log(`[SERVER] Serving static from VITE build: ${viteDist}`);
        app.use(express.static(viteDist));
        
        app.get(/.*/, (req, res) => {
            if (req.path.startsWith("/api")) return res.status(404).send("API Not Found");
            
            const indexPath = path.join(viteDist, "index.html");
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send(`Client build not found (index.html missing). Checked: ${viteDist}`);
            }
        });
    } else {
        console.error(`[SERVER] CRITICAL: No client build found at ${viteDist}`);
        app.get("/", (req, res) => res.send("Server Error: Client build missing."));
    }
} else {
    // Basic health check for Dev
    app.get("/", (req, res) => {
        res.send("Cliffwald Server is running! (Use Client on Port 3000)");
    });
}

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server
  }),
});

// Define rooms
gameServer.define("world", WorldRoom);

// Initialize DB then Start
initDatabase().then(async () => {
    await seedAdmins();
    await RAPIER.init();
    gameServer.listen(port).then(() => {
        console.log(`[GameServer] Listening on Port: ${port}`);
    });
});

process.on('unhandledRejection', (reason, p) => {
    console.error('[SERVER] Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught Exception:', err);
    // Optional: process.exit(1); // Don't exit immediately to see if it recovers or if it's minor
});

// --- GRACEFUL SHUTDOWN ---
const shutdown = async () => {
    console.log("[SERVER] Shutdown signal received. Closing GameServer...");
    await gameServer.gracefullyShutdown();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
