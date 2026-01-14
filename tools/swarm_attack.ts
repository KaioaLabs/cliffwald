import { Client, Room } from "colyseus.js";
import { GameState } from "../src/shared/SchemaDef";

// --- CONFIGURATION ---
const BOT_COUNT = 200;
const SERVER_URL = "ws://localhost:2568";
const HTTP_URL = "http://localhost:2568";
const RAMP_UP_INTERVAL = 400; // ms between bot launches (prevent login throttle)

// --- METRICS ---
const stats = {
    connected: 0,
    errors: 0,
    active_pings: [] as number[],
    messages_sent: 0
};

// --- UTILS ---
async function getDevToken(username: string): Promise<string> {
    try {
        const response = await fetch(`${HTTP_URL}/api/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, skin: 'player_idle' })
        });
        const data = await response.json() as any;
        return data.token;
    } catch (e) {
        console.error(`[AUTH] Failed to get token for ${username}`, e);
        return "";
    }
}

class Bot {
    public id: number;
    public client: Client;
    public room?: Room<GameState>;
    private moveInterval: any;
    private castInterval: any;

    constructor(id: number) {
        this.id = id;
        this.client = new Client(SERVER_URL);
    }

    async connect() {
        const username = `SwarmBot_${this.id}`;
        const token = await getDevToken(username);
        
        if (!token) {
            stats.errors++;
            return;
        }

        try {
            const skins = ["player_red", "player_blue", "player_green"];
            this.room = await this.client.joinOrCreate<GameState>("world", { 
                token, 
                skin: skins[this.id % 3]
            });
            
            stats.connected++;
            // console.log(`[BOT ${this.id}] Joined!`);

            this.startChaos();

            this.room.onLeave(() => {
                stats.connected--;
                this.stopChaos();
            });

        } catch (e) {
            console.error(`[BOT ${this.id}] Connection failed:`, e);
            stats.errors++;
        }
    }

    startChaos() {
        // 1. Movement Noise
        this.moveInterval = setInterval(() => {
            if (!this.room) return;
            
            // Random Direction
            const dirs = [
                { left: true, right: false, up: false, down: false },
                { left: false, right: true, up: false, down: false },
                { left: false, right: false, up: true, down: false },
                { left: false, right: false, up: false, down: true },
                { left: true, right: false, up: true, down: false }, // Diagonals
                { left: false, right: false, up: false, down: false } // Stop
            ];
            
            const randomInput = dirs[Math.floor(Math.random() * dirs.length)];
            
            this.room.send("move", {
                ...randomInput,
                analogDir: { x: (Math.random() * 2 - 1), y: (Math.random() * 2 - 1) } // Simulate joystick
            });
            stats.messages_sent++;

        }, 300 + Math.random() * 500); // Every 300-800ms

        // 2. Spell Casting Spam
        this.castInterval = setInterval(() => {
            if (!this.room) return;
            
            const spells = ["circle", "square", "triangle"];
            const spell = spells[Math.floor(Math.random() * spells.length)];
            
            // Cast towards random direction
            this.room.send("cast", {
                spellId: spell,
                vx: (Math.random() * 2 - 1) * 400,
                vy: (Math.random() * 2 - 1) * 400
            });
            stats.messages_sent++;

        }, 2000 + Math.random() * 3000); // Every 2-5s
    }

    stopChaos() {
        clearInterval(this.moveInterval);
        clearInterval(this.castInterval);
    }
}

// --- MAIN ---
async function main() {
    console.log(`[SWARM] Launching ${BOT_COUNT} bots against ${SERVER_URL}...`);
    console.log(`[SWARM] Estimated ramp-up time: ${(BOT_COUNT * RAMP_UP_INTERVAL) / 1000} seconds.`);
    
    for (let i = 0; i < BOT_COUNT; i++) {
        const bot = new Bot(i);
        bot.connect();
        if (i % 5 === 0) process.stdout.write(`.`); // Progress dots
        await new Promise(r => setTimeout(r, RAMP_UP_INTERVAL));
    }

    console.log("\n[SWARM] All bots launched. Monitoring Impact...");

    // Status Report Loop
    setInterval(() => {
        // Removed console.clear() to preserve history logs
        console.log(`[STATUS] Active: ${stats.connected}/${BOT_COUNT} | Errors: ${stats.errors} | Msgs/sec: ~${Math.floor(stats.messages_sent / 5)}`);
        stats.messages_sent = 0; // Reset counter for rate calc
    }, 5000);

    // Auto-stop for CI/Agent environment
    setTimeout(() => {
        console.log("[SWARM] Test duration complete. Shutting down.");
        process.exit(0);
    }, 150000);
}

main().catch(console.error);
