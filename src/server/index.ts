import "dotenv/config";
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./WorldRoom";
import { AuthService } from "./services/AuthService";

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

app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        const token = await AuthService.register(username, password);
        res.json({ token });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        const token = await AuthService.login(username, password);
        res.json({ token });
    } catch (e: any) {
        res.status(401).json({ error: e.message });
    }
});

app.post("/api/dev-login", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "Missing username" });
        // In a real app, verify some secret header or env var here
        const token = await AuthService.devLogin(username);
        res.json({ token });
    } catch (e: any) {
        console.error("[API] Dev Login Error:", e);
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

// ...

// Serve Static Client (Production)
if (process.env.NODE_ENV === "production") {
    // Client is now bundled INSIDE dist-server/public
    const clientDist = path.join(__dirname, "../public");
    console.log(`[SERVER] Serving static from: ${clientDist}`);
    
    // Debug: Check if directory exists
    try {
        const fs = require('fs');
        if (fs.existsSync(clientDist)) {
            console.log(`[SERVER] Contents of clientDist:`, fs.readdirSync(clientDist));
        } else {
            console.error(`[SERVER] CRITICAL: clientDist directory does not exist at ${clientDist}`);
        }
    } catch(e) { console.error("[SERVER] FS Check Failed:", e); }

    app.use(express.static(clientDist));
    
    // Fix for Express 5 Wildcard Match
    app.get("/{0,}", (req, res) => {
        // Exclude API routes explicitly if needed, though 'use' handles order.
        if (req.path.startsWith("/api")) return res.status(404).send("API Not Found");
        
        const indexPath = path.join(clientDist, "index.html");
        const fs = require('fs');
        if (!fs.existsSync(indexPath)) {
             console.error(`[SERVER] 404: Request for ${req.path} failed. index.html missing at ${indexPath}`);
             return res.status(500).send(`CRITICAL ERROR: index.html not found at ${indexPath}. Deployment failed?`);
        }
        res.sendFile(indexPath);
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

gameServer.listen(port).then(() => {
    console.log(`[GameServer] Listening on Port: ${port}`);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('[SERVER] Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught Exception:', err);
    // Optional: process.exit(1); // Don't exit immediately to see if it recovers or if it's minor
});