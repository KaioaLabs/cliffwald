import { Client, Room } from 'colyseus.js';
import { GameState, Player, Projectile } from '../shared/SchemaDef';
import { PlayerInput } from '../shared/types/NetworkTypes';
import { MapSchema } from '@colyseus/schema';

export class NetworkManager {
    private client: Client;
    public room?: Room<GameState>;
    private pingInterval: any;

    // Callbacks
    public onPlayerAdd?: (player: Player, id: string) => void;
    public onPlayerRemove?: (player: Player, id: string) => void;
    public onProjectileAdd?: (proj: Projectile, id: string) => void;
    public onProjectileChange?: (proj: Projectile, id: string) => void;
    public onProjectileRemove?: (proj: Projectile, id: string) => void;
    public onPong?: (latency: number) => void;
    public onChatMessage?: (msg: { sender: string, text: string }) => void;
    public onHit?: (targetId: string) => void;

    constructor(scene?: Phaser.Scene) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = (host === "localhost" || host === "127.0.0.1") ? ":2568" : (window.location.port ? ':' + window.location.port : '');
        
        const url = `${protocol}//${host}${port}`;
        console.log(`[NET] Connecting to: ${url}`);
        this.client = new Client(url);
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

        // Helper for Colyseus Version Compatibility
        const attach = <T>(collection: any | undefined, event: 'onAdd' | 'onRemove', cb: (item: T, key: string) => void) => {
            if (!collection) return;
            try {
                const col = collection as any; // Cast only for the runtime check
                if (typeof col[event] === 'function') {
                    col[event](cb);
                } else {
                    col[event] = cb;
                }

                // TRIGGER FOR EXISTING ITEMS (Fix for race condition)
                if (event === 'onAdd' && col.forEach) {
                    col.forEach((item: T, key: string) => cb(item, key));
                }
            } catch (e) {
                console.error(`[NET] Failed to attach ${event}:`, e);
            }
        };

        // 2. State Sync (Robust)
        const attachSync = () => {
            console.log("[NET] attachSync called");
            if (!this.room || !this.room.state) return;
            
            if (this.room.state.players) {
                attach(this.room.state.players, 'onAdd', (player: Player, id: string) => {
                    if (this.onPlayerAdd) this.onPlayerAdd(player, id);
                });
                attach(this.room.state.players, 'onRemove', (player: Player, id: string) => {
                    console.log("Player Removed:", id);
                    if (this.onPlayerRemove) this.onPlayerRemove(player, id);
                });
            }

            if (this.room.state.projectiles) {
                console.log("[NET] Attaching Projectile Listeners");
                attach(this.room.state.projectiles, 'onAdd', (proj: Projectile, id: string) => {
                    console.log(`[NET] Projectile Added: ${id}`);
                    if (this.onProjectileAdd) {
                        this.onProjectileAdd(proj, id);
                    } else {
                        console.warn("[NET] onProjectileAdd callback NOT set!");
                    }
                    
                    // Listen for updates on this specific projectile instance
                    proj.onChange(() => {
                        if (this.onProjectileChange) this.onProjectileChange(proj, id);
                    });
                });
                attach(this.room.state.projectiles, 'onRemove', (proj: Projectile, id: string) => {
                    if (this.onProjectileRemove) this.onProjectileRemove(proj, id);
                });            
            } else {
                console.warn("[NET] Room state has no projectiles collection!");
            }
        };

        if (this.room.state && this.room.state.players && this.room.state.projectiles) {
            attachSync();
        } else {
             console.log("[NET] State not ready, waiting for first patch...");
             this.room.onStateChange.once(() => attachSync());
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
