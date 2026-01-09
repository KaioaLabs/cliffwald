import "dotenv/config";
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./WorldRoom";
import { AuthService } from "./services/AuthService";
import { initDatabase } from "./init_db";

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

app.post("/api/auth", async (req, res) => {
    try {
        const { username, password, skin, house } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        
        const token = await AuthService.seamlessAuth(username, password, skin, house);
        res.json({ token });
    } catch (e: any) {
        console.error("[AUTH] Error:", e.message);
        res.status(401).json({ error: e.message });
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

// ...

// Serve Static Client (Production)
if (process.env.NODE_ENV === "production") {
    const fs = require('fs');
    const path = require('path');

    // DEBUG: Recursive List to find where the files are
    console.log("--- DEBUG: FILE SYSTEM STRUCTURE ---");
    console.log("CWD:", process.cwd());
    console.log("__dirname:", __dirname);
    console.log("------------------------------------");

    // Robust path resolution using process.cwd()
    // Priority 1: Standard Vite output at root/dist-client
    const viteDist = path.join(process.cwd(), "dist-client");
    // Priority 2: Legacy/Copied path at dist-server/public
    const legacyDist = path.join(__dirname, "../public");

    let clientDist = viteDist;
    if (fs.existsSync(viteDist)) {
        console.log(`[SERVER] Serving static from VITE build: ${clientDist}`);
    } else if (fs.existsSync(legacyDist)) {
        clientDist = legacyDist;
        console.log(`[SERVER] Serving static from LEGACY build: ${clientDist}`);
    } else {
        console.error(`[SERVER] CRITICAL: No client build found at ${viteDist} or ${legacyDist}`);
    }

    app.use(express.static(clientDist));
    
    app.get(/.*/, (req, res) => {
        if (req.path.startsWith("/api")) return res.status(404).send("API Not Found");
        
        const indexPath = path.join(clientDist, "index.html");
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send(`Client build not found. Checked: ${clientDist}`);
        }
    });
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
initDatabase().then(() => {
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
