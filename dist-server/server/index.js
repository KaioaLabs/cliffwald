"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_transport_1 = require("@colyseus/ws-transport");
const WorldRoom_1 = require("./WorldRoom");
const AuthService_1 = require("./services/AuthService");
const init_db_1 = require("./init_db");
const port = Number(process.env.PORT || 2568);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- DIAGNOSTIC ROUTE ---
app.get("/ping", (req, res) => {
    res.send(`PONG from Server (Time: ${new Date().toISOString()})`);
});
app.get("/debug-paths", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const results = {};
    const checkPath = (p) => {
        try {
            results[p] = fs.existsSync(p) ? fs.readdirSync(p) : "MISSING";
        }
        catch (e) {
            results[p] = "ERROR: " + e.message;
        }
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
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });
        const token = await AuthService_1.AuthService.register(username, password);
        res.json({ token });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });
        const token = await AuthService_1.AuthService.login(username, password);
        res.json({ token });
    }
    catch (e) {
        res.status(401).json({ error: e.message });
    }
});
app.post("/api/dev-login", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username)
            return res.status(400).json({ error: "Missing username" });
        // In a real app, verify some secret header or env var here
        const token = await AuthService_1.AuthService.devLogin(username);
        res.json({ token });
    }
    catch (e) {
        console.error("[API] Dev Login Error:", e);
        // Send FULL error details to client for debugging
        res.status(500).json({
            error: e.message,
            stack: e.stack,
            dbPath: process.env.DATABASE_URL || "unknown"
        });
    }
});
app.post("/api/logs", (req, res) => {
    const { type, message, user } = req.body;
    const color = type === 'error' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}[CLIENT:${user || 'UNK'}] [${type.toUpperCase()}] ${message}\x1b[0m`);
    res.sendStatus(200);
});
// -----------------------
const path_1 = __importDefault(require("path"));
// ...
// Serve Static Client (Production)
if (process.env.NODE_ENV === "production") {
    // Client is now bundled INSIDE dist-server/public
    const clientDist = path_1.default.join(__dirname, "../public");
    console.log(`[SERVER] Serving static from: ${clientDist}`);
    // Debug: Check if directory exists
    try {
        const fs = require('fs');
        if (fs.existsSync(clientDist)) {
            console.log(`[SERVER] Contents of clientDist:`, fs.readdirSync(clientDist));
        }
        else {
            console.error(`[SERVER] CRITICAL: clientDist directory does not exist at ${clientDist}`);
        }
    }
    catch (e) {
        console.error("[SERVER] FS Check Failed:", e);
    }
    app.use(express_1.default.static(clientDist));
    // Fix for Express 5 Wildcard Match
    app.get("/{0,}", (req, res) => {
        // Exclude API routes explicitly if needed, though 'use' handles order.
        if (req.path.startsWith("/api"))
            return res.status(404).send("API Not Found");
        const indexPath = path_1.default.join(clientDist, "index.html");
        const fs = require('fs');
        if (!fs.existsSync(indexPath)) {
            console.error(`[SERVER] 404: Request for ${req.path} failed. index.html missing at ${indexPath}`);
            return res.status(500).send(`CRITICAL ERROR: index.html not found at ${indexPath}. Deployment failed?`);
        }
        res.sendFile(indexPath);
    });
}
else {
    // Basic health check for Dev
    app.get("/", (req, res) => {
        res.send("Cliffwald Server is running! (Use Client on Port 3000)");
    });
}
const server = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: server
    }),
});
// Define rooms
gameServer.define("world", WorldRoom_1.WorldRoom);
// Initialize DB then Start
(0, init_db_1.initDatabase)().then(() => {
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
