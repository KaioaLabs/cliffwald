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
const seed_admins_1 = require("./seed_admins");
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
app.post("/api/check-user", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username)
            return res.status(400).json({ error: "Missing username" });
        const exists = await AuthService_1.AuthService.checkUser(username);
        res.json({ exists });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });
        const result = await AuthService_1.AuthService.login(username, password);
        res.json(result); // { token, skin, house }
    }
    catch (e) {
        console.error("[AUTH] Login Error:", e.message);
        const status = e.message === "User not found" ? 404 : 401;
        res.status(status).json({ error: e.message });
    }
});
app.post("/api/register", async (req, res) => {
    try {
        const { username, password, skin, house } = req.body;
        if (!username || !password || !skin || !house)
            return res.status(400).json({ error: "Missing fields" });
        const token = await AuthService_1.AuthService.register(username, password, skin, house);
        res.json({ token });
    }
    catch (e) {
        console.error("[AUTH] Register Error:", e.message);
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/dev-login", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username)
            return res.status(400).json({ error: "Missing username" });
        const token = await AuthService_1.AuthService.devLogin(username);
        res.json({ token });
    }
    catch (e) {
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
    }
    else if (fs.existsSync(legacyDist)) {
        clientDist = legacyDist;
        console.log(`[SERVER] Serving static from LEGACY build: ${clientDist}`);
    }
    else {
        console.error(`[SERVER] CRITICAL: No client build found at ${viteDist} or ${legacyDist}`);
    }
    app.use(express_1.default.static(clientDist));
    app.get(/.*/, (req, res) => {
        if (req.path.startsWith("/api"))
            return res.status(404).send("API Not Found");
        const indexPath = path.join(clientDist, "index.html");
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        }
        else {
            res.status(404).send(`Client build not found. Checked: ${clientDist}`);
        }
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
(0, init_db_1.initDatabase)().then(async () => {
    await (0, seed_admins_1.seedAdmins)();
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
