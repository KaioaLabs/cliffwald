import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { CONFIG } from "../shared/Config";
import { GameState, Player, Projectile } from "../shared/SchemaDef";
import { PlayerInput } from "../shared/types/NetworkTypes";

export class NetworkManager {
    private client: Colyseus.Client;
    public room?: Colyseus.Room<GameState>;
    private scene: Phaser.Scene;
    
    // Callbacks
    public onPlayerAdd?: (player: Player, id: string) => void;
    public onPlayerRemove?: (id: string) => void;
    public onProjectileAdd?: (proj: Projectile, id: string) => void;
    public onProjectileRemove?: (id: string) => void;
    public onHit?: (targetId: string) => void;
    public onPong?: (latency: number) => void;
    public onChatMessage?: (msg: { sender: string, text: string }) => void;

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
            this.room = await this.client.joinOrCreate<GameState>("world", { token, skin });
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

        this.room.onMessage("chat", (msg: { sender: string, text: string }) => {
            console.log("[NET] Chat Received:", msg);
            if (this.onChatMessage) this.onChatMessage(msg);
        });

        // 2. State Sync
        if (this.room.state && this.room.state.players) {
            (this.room.state.players as any).onAdd((player: Player, id: string) => {
                if (this.onPlayerAdd) this.onPlayerAdd(player, id);
            });
            (this.room.state.players as any).onRemove((_: Player, id: string) => {
                if (this.onPlayerRemove) this.onPlayerRemove(id);
            });
        } else {
            console.warn("[NET] Warning: state.players not available");
        }

        if (this.room.state && this.room.state.projectiles) {
            (this.room.state.projectiles as any).onAdd((proj: Projectile, id: string) => {
                if (this.onProjectileAdd) this.onProjectileAdd(proj, id);
            });
            (this.room.state.projectiles as any).onRemove((_: Projectile, id: string) => {
                if (this.onProjectileRemove) this.onProjectileRemove(id);
            });
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

    public sendMove(input: PlayerInput) {
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
