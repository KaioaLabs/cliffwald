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

// Basic health check
app.get("/", (req, res) => {
    res.send("Cliffwald Server is running!");
});

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