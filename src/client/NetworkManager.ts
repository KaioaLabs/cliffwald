import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { CONFIG } from "../shared/Config";

export class NetworkManager {
    private client: Colyseus.Client;
    public room?: Colyseus.Room;
    private scene: Phaser.Scene;
    
    // Callbacks
    public onPlayerAdd?: (player: any, id: string) => void;
    public onPlayerRemove?: (id: string) => void;
    public onProjectileAdd?: (proj: any, id: string) => void;
    public onProjectileRemove?: (id: string) => void;
    public onHit?: (targetId: string) => void;
    public onPong?: (latency: number) => void;

    private pingInterval?: any;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const host = window.location.hostname;
        const port = 2568; // Or read from config
        this.client = new Colyseus.Client(`${protocol}://${host}:${port}`);
    }

    async connect(token: string, skin: string): Promise<boolean> {
        try {
            console.log("[NET] Connecting to WorldRoom...");
            this.room = await this.client.joinOrCreate("world", { token, skin });
            console.log("[NET] Joined! Session ID:", this.room.sessionId);

            this.setupListeners();
            this.startPingLoop();
            
            return true;
        } catch (e) {
            console.error("[NET] Join Error:", e);
            return false;
        }
    }

    private setupListeners() {
        if (!this.room) return;

        // 1. Messages
        this.room.onMessage("hit", (data: { targetId: string }) => {
            if (this.onHit) this.onHit(data.targetId);
        });

        this.room.onMessage("pong", (timestamp: number) => {
            const latency = Date.now() - timestamp;
            if (this.onPong) this.onPong(latency);
        });

        // 2. State Sync
        const state = this.room.state as any;

        if (state.players) {
            state.players.onAdd = (player: any, id: string) => {
                if (this.onPlayerAdd) this.onPlayerAdd(player, id);
            };
            state.players.onRemove = (_: any, id: string) => {
                if (this.onPlayerRemove) this.onPlayerRemove(id);
            };
        }

        if (state.projectiles) {
            state.projectiles.onAdd = (proj: any, id: string) => {
                if (this.onProjectileAdd) this.onProjectileAdd(proj, id);
            };
            state.projectiles.onRemove = (_: any, id: string) => {
                if (this.onProjectileRemove) this.onProjectileRemove(id);
            };
        }
    }

    private startPingLoop() {
        this.pingInterval = setInterval(() => {
            if (this.room) {
                this.room.send("ping", Date.now());
            }
        }, 1000);
    }

    public sendCast(spellId: string, vx: number, vy: number) {
        if (this.room) {
            this.room.send("cast", { spellId, vx, vy });
        }
    }

    public sendMove(input: any) {
        if (this.room) {
            this.room.send("move", input);
        }
    }

    public sendChat(text: string) {
        if (this.room) {
            this.room.send("chat", text);
        }
    }

    public disconnect() {
        if (this.room) {
            this.room.leave();
        }
        clearInterval(this.pingInterval);
    }
}
