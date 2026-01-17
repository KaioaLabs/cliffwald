import { Room, Client } from "colyseus";
import { GameState, Player, Projectile, ChatMessage, InventoryItem } from "../shared/SchemaDef";
import { CONFIG, getAcademicProgress, getGameTime } from "../shared/Config";
import { PlayerInput, JoinOptions } from "../shared/types/NetworkTypes";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { Pathfinding } from "../shared/systems/Pathfinding";
import { SpellSystem } from "./systems/SpellSystem";
import { PrestigeSystem } from "./systems/PrestigeSystem";
import { SPELL_REGISTRY } from "../shared/items/SpellRegistry";
import { Entity } from "../shared/ecs/components";
import { AuthService } from "./services/AuthService";
import { SpawnManager, CharacterSpawnData } from "./managers/SpawnManager";
import { LevelRegistry } from "./managers/LevelRegistry";
import { PlayerService } from "./services/PlayerService";
import path from "path";

import { DuelSystem } from "./systems/DuelSystem";
import { ItemSystem } from "./systems/ItemSystem";
import { ShopSystem } from "./systems/ShopSystem";
import { ChatManager } from "./managers/ChatManager";
import { PersistenceSystem } from "./systems/PersistenceSystem";
import { timeManager } from "../shared/managers/TimeManager";
import { HealthSystem } from "./systems/HealthSystem";
import { AcademicManager } from "./managers/AcademicManager";
import { PhysicsManager } from "./managers/PhysicsManager";
import { GameLoopManager } from "./managers/GameLoopManager";

import { WorldService } from "./services/WorldService";
import fs from 'fs';

export class WorldRoom extends Room<GameState> {
    world!: ECSWorld;
    
    // Explicit Property Definitions
    physicsManager!: PhysicsManager;
    spawnManager!: SpawnManager;
    gameLoopManager!: GameLoopManager;
    academicManager!: AcademicManager;
    chatManager!: ChatManager;
    itemSystem!: ItemSystem;
    shopSystem!: ShopSystem;
    spellSystem!: SpellSystem;
    duelSystem!: DuelSystem;
    healthSystem!: HealthSystem;
    prestigeSystem!: PrestigeSystem;
    persistenceSystem!: PersistenceSystem;
    pathfinder!: Pathfinding;

    entities = new Map<string, Entity>();
    lastCastTimes = new Map<string, number>();
    private isReloading = false;
    private reloadDebounce: NodeJS.Timeout | null = null;

    async onAuth(client: Client, options: JoinOptions, request: any) {
        if (this.isReloading) return false;
        if (!options.token) return false;
        const userData = AuthService.verifyToken(options.token);
        if (!userData) return false;
        return userData;
    }

    async onCreate(options: JoinOptions) {
        this.setState(new GameState());
        this.world = createWorld();
        
        // --- INITIALIZE MANAGERS (Order Matters) ---
        // 1. Core Systems
        this.chatManager = new ChatManager(this);
        this.physicsManager = new PhysicsManager(this.state, this.entities);
        this.persistenceSystem = new PersistenceSystem(this.entities, this.state);
        
        // 2. Gameplay Systems
        this.prestigeSystem = new PrestigeSystem(this);
        this.itemSystem = new ItemSystem(this);
        this.shopSystem = new ShopSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.duelSystem = new DuelSystem(this);
        this.healthSystem = new HealthSystem(this);
        this.spawnManager = new SpawnManager(this.world, this.physicsManager.world, this.state, this.entities);
        this.academicManager = new AcademicManager(this.state, this.spawnManager, this.chatManager, this.prestigeSystem, this.entities);
        this.gameLoopManager = new GameLoopManager(this);

        // 3. Load Map & Logic
        const mapPath = path.join(process.cwd(), "assets/maps/world.json");
        try {
            await this.loadMapLogic(mapPath);
            
            // Spawn Logic
            const { spawnPos, mapData } = await this.physicsManager.loadMap(mapPath);
            
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.loadSeats(mapData);
            this.spawnManager.spawnEchoes(24, spawnPos);
            this.spawnManager.spawnFromMap(mapData);
            
            for(let i=0; i<5; i++) this.itemSystem.spawnRandomItem();

            // Setup Watcher
            this.setupMapWatcher(mapPath);

        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        this.setSimulationInterval((deltaTime) => {
            if (!this.isReloading) this.gameLoopManager.update(deltaTime);
        }, 1000 / CONFIG.SERVER_FPS);

        this.registerMessageHandlers();
        this.persistenceSystem.startAutoSave();
    }

    private setupMapWatcher(mapPath: string) {
        fs.watch(mapPath, (eventType) => {
            if (eventType === 'change') {
                if (this.reloadDebounce) clearTimeout(this.reloadDebounce);
                this.reloadDebounce = setTimeout(() => this.reloadMap(mapPath), 500);
            }
        });
    }

    private async loadMapLogic(mapPath: string) {
        const { navGrids } = await this.physicsManager.loadMap(mapPath);
        this.pathfinder = new Pathfinding(navGrids);
    }

    private async reloadMap(mapPath: string) {
        console.log("[HOT-RELOAD] Reloading Map Physics & Logic...");
        this.isReloading = true;
        
        try {
            this.physicsManager.clearStaticBodies();
            await this.loadMapLogic(mapPath);
            this.chatManager.broadcastSystemMessage("World Geometry Updated!", "BUILDER");
        } catch (e) {
            console.error("[HOT-RELOAD] Failed:", e);
        } finally {
            this.isReloading = false;
        }
    }
    
    get physicsWorld() { return this.physicsManager.world; }
    get eventQueue() { return this.physicsManager.eventQueue; }

    registerMessageHandlers() {
        this.onMessage("move", (client, input: PlayerInput) => {
            const playerState = this.state.players.get(client.sessionId);
            if (playerState && playerState.unconsciousUntil > 0) return; 

            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input) {
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;
                if (input.analogDir) {
                    entity.input.analogDir = {
                        x: Number(input.analogDir.x) || 0,
                        y: Number(input.analogDir.y) || 0
                    };
                } else {
                    entity.input.analogDir = undefined;
                }
            }
        });

        this.onMessage("cast", (client, data) => {
            this.handleCast(client.sessionId, data.spellId, data.vx, data.vy);
        });

        this.onMessage("collect", (client, itemId) => this.itemSystem.tryCollectItem(client.sessionId, itemId));
        this.onMessage("buy", (client, itemId) => this.shopSystem.handleBuy(client.sessionId, itemId));
        this.onMessage("ping", (client, timestamp) => client.send("pong", timestamp));
        this.onMessage("chat", (client, text) => this.chatManager.handleChat(client.sessionId, text));
        this.onMessage("jump", (client) => this.broadcast("player_jump", { id: client.sessionId }));
        
        this.onMessage("admin_time_jump", (client, data) => {
             if (data && typeof data.hour === 'number') {
                timeManager.setGameHour(data.hour);
                this.state.timeOffset = timeManager.getOffset();
                this.chatManager.broadcastSystemMessage(`TIME WARP! The hour is now ${Math.floor(data.hour)}:00`, "CHRONOS");
             }
        });

        this.onMessage("submit_score", (client, data) => {
            this.academicManager.handleScoreSubmission(client, data);
        });
    }

    handleGraduation(currentCourse: number) {
        let winner = "Tie";
        const scores = [
            { name: 'IGNIS', score: this.state.ignisPoints },
            { name: 'AXIOM', score: this.state.axiomPoints },
            { name: 'VESPER', score: this.state.vesperPoints }
        ];
        scores.sort((a, b) => b.score - a.score);
        if (scores[0].score > scores[1].score) winner = scores[0].name;

        this.chatManager.broadcastSystemMessage(
            `THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`,
            "HEADMASTER"
        );

        this.state.ignisPoints = 0;
        this.state.axiomPoints = 0;
        this.state.vesperPoints = 0;
        this.state.currentCourse = currentCourse;
    }

    async onDispose() {
        console.log("[SERVER] Room disposing...");
        this.persistenceSystem.stopAutoSave();
        await this.persistenceSystem.saveAllPlayers();
        this.physicsManager.dispose();
    }

    public sendToDetention(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const entity = this.entities.get(sessionId);
        if (player && entity && entity.body) {
            console.log(`[DISCIPLINE] Detaining ${player.username}`);
            const detentionPos = LevelRegistry.getInstance().getLocation("DETENTION");
            entity.body.setTranslation(detentionPos, true);
            player.x = detentionPos.x;
            player.y = detentionPos.y;
            player.detentionWork = 50; 
            this.itemSystem.spawnDetentionTasks();
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) client.send("notification", "YOU HAVE BEEN DETAINED! Complete 5 tasks to leave.");
            this.chatManager.broadcastSystemMessage(`${player.username} has been sent to DETENTION.`, "PREFECT");
        }
    }

    public releaseFromDetention(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const entity = this.entities.get(sessionId);
        if (player && entity && entity.body) {
            console.log(`[DISCIPLINE] Releasing ${player.username}`);
            const registry = LevelRegistry.getInstance();
            let dormPos = registry.getLocation("DORM_IGNIS");
            if (player.house === 'axiom') dormPos = registry.getLocation("DORM_AXIOM");
            if (player.house === 'vesper') dormPos = registry.getLocation("DORM_VESPER");
            
            entity.body.setTranslation(dormPos, true);
            player.x = dormPos.x;
            player.y = dormPos.y;
            player.detentionWork = 0;
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) client.send("notification", "You are free! Return to your studies.");
        }
    }

    handleCast(sessionId: string, spellId: string, vx: number, vy: number) {
        const playerState = this.state.players.get(sessionId);
        if (playerState && playerState.unconsciousUntil > 0) return;

        const entity = this.entities.get(sessionId);
        if (!entity || !entity.body || !playerState) return;

        const spellConfig = SPELL_REGISTRY[spellId];
        if (!spellConfig) return;

        const now = Date.now();
        const lastCast = this.lastCastTimes.get(sessionId) || 0;
        if (now - lastCast < spellConfig.cooldown) return;
        this.lastCastTimes.set(sessionId, now);

        const pos = entity.body.translation();
        const id = `proj_${sessionId}_${now}`;
        const proj = new Projectile();
        proj.id = id;
        proj.spellId = spellId;
        proj.x = pos.x;
        proj.y = pos.y;
        
        const mag = Math.sqrt(vx * vx + vy * vy);
        proj.vx = (mag > 0) ? (vx / mag) * spellConfig.speed : spellConfig.speed;
        proj.vy = (mag > 0) ? (vy / mag) * spellConfig.speed : 0;
        proj.ownerId = sessionId;
        proj.creationTime = now;
        proj.maxRange = CONFIG.SPELL_CONFIG.BASE_RANGE;

        this.state.projectiles.set(id, proj);
    }

    async onJoin(client: Client, options: JoinOptions) {
        try {
            const authUser = client.auth as { userId: number, username: string };
            const targetHouse = options.skin?.includes('red') ? 'ignis' : (options.skin?.includes('blue') ? 'axiom' : 'vesper');
            
            // 2. Initialize Session
            const session = await PlayerService.initializeSession(authUser.userId, authUser.username, { ...options, house: targetHouse });
            const house = session.dbPlayer.house as 'ignis' | 'axiom' | 'vesper';

            // 3. Find Echo Slot (Reclaim or New)
            let echoSlot: { id: string, entity: Entity } | null = null;
            
            if (session.dbPlayer.echoId) {
                const existingEcho = this.entities.get(session.dbPlayer.echoId);
                if (existingEcho && existingEcho.ai) { // Ensure it's valid Echo
                    echoSlot = { id: session.dbPlayer.echoId, entity: existingEcho };
                    console.log(`[SPAWN] Player ${authUser.username} reclaiming existing Echo ${echoSlot.id}`);
                } else {
                    console.warn(`[SPAWN] Player has EchoID ${session.dbPlayer.echoId} but it's missing/invalid. Finding new slot.`);
                }
            }

            if (!echoSlot) {
                echoSlot = this.spawnManager.findAvailableEcho(house);
                if (echoSlot) {
                    await PlayerService.setEchoId(session.dbPlayer.id, echoSlot.id);
                }
            }
            
            if (!echoSlot) {
                console.error("[SERVER] No available student slots!");
                client.leave();
                return;
            }

            const playerEnt = await this.spawnManager.possessEcho(echoSlot.id, client.sessionId, {
                username: authUser.username,
                skin: options.skin || "player_idle",
                house: house,
                prestige: session.dbPlayer.prestige,
                gold: session.dbPlayer.gold,
                xp: session.dbPlayer.xp,
                academicPoints: session.dbPlayer.academicPoints,
                unconsciousUntil: Number(session.dbPlayer.unconsciousUntil || 0),
                inventory: session.dbPlayer.inventory.map((i: any) => {
                    const item = new InventoryItem();
                    item.itemId = i.itemId;
                    item.qty = i.count;
                    return item;
                })
            });
            
            if (playerEnt) {
                playerEnt.metadata = {
                    dbId: session.dbPlayer.id,
                    alignment: session.dbPlayer.alignment || 0
                };
            }

            console.log(`[SERVER] Player ${authUser.username} joined.`);

        } catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const playerState = this.state.players.get(client.sessionId);

        // Save if Valid
        if (entity && entity.body && entity.metadata && entity.metadata.dbId && playerState) {
            const dbId = entity.metadata.dbId;
            const pos = entity.body.translation();
            playerState.x = pos.x;
            playerState.y = pos.y;
            playerState.isAttendingClass = false; 
            playerState.classEndsAt = 0;
            (playerState as any).alignment = entity.metadata.alignment || 0;
            
            await PlayerService.saveSession(dbId, playerState);
        }

        this.spawnManager.restoreEcho(client.sessionId, playerState);
        console.log(`[SERVER] Player ${client.sessionId} left.`);
    }
}
