import { Room, Client } from "colyseus";
import { GameState, Player, Projectile, ChatMessage, InventoryItem } from "../shared/SchemaDef";
import { CONFIG, getAcademicProgress, getGameTime } from "../shared/Config";
import { PlayerInput, JoinOptions } from "../shared/types/NetworkTypes";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { AISystem } from "../shared/systems/AISystem";
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

export class WorldRoom extends Room<GameState> {
    world!: ECSWorld;
    
    // Managers
    physicsManager!: PhysicsManager;
    academicManager!: AcademicManager;
    spawnManager!: SpawnManager;
    chatManager!: ChatManager;
    
    // Systems
    pathfinder?: Pathfinding;
    spellSystem!: SpellSystem;
    prestigeSystem!: PrestigeSystem;
    duelSystem!: DuelSystem;
    itemSystem!: ItemSystem;
    shopSystem!: ShopSystem;
    persistenceSystem!: PersistenceSystem;
    healthSystem!: HealthSystem;
    
    entities = new Map<string, Entity>();
    
    // Security: Cooldown Tracking
    lastCastTimes = new Map<string, number>();

    async onAuth(client: Client, options: JoinOptions, request: any) {
        if (!options.token) return false;
        const userData = AuthService.verifyToken(options.token);
        if (!userData) return false;
        return userData;
    }

    async onCreate(options: JoinOptions) {
        this.setMetadata({ name: "Cliffwald World" });
        this.setState(new GameState());
        
        this.state.ignisPoints = 0;
        this.state.axiomPoints = 0;
        this.state.vesperPoints = 0;
        this.state.worldStartTime = CONFIG.SEASON_START_DATE;

        // 1. Core Systems
        this.world = createWorld();
        this.physicsManager = new PhysicsManager(this.state, this.entities);
        
        this.physicsManager.onZoneEnter = (sessionId, zoneName) => {
            const client = this.clients.find(c => c.sessionId === sessionId);
            // Only notify real players, not NPCs (Echoes)
            if (client) {
                // Prettify Zone Name: "DORM_IGNIS" -> "Ignis Dormitory"
                let prettyName = zoneName.replace(/_/g, " ");
                prettyName = prettyName.charAt(0).toUpperCase() + prettyName.slice(1).toLowerCase();
                
                if (zoneName.includes("DORM")) prettyName += " Dormitory";
                
                client.send("zone_enter", { name: prettyName });
            }
        };
        
        // 2. Managers
        this.spawnManager = new SpawnManager(this.world, this.physicsManager.world, this.state, this.entities);
        this.chatManager = new ChatManager(this);
        
        // 3. Gameplay Systems
        this.spellSystem = new SpellSystem(this); 
        this.prestigeSystem = new PrestigeSystem(this);
        this.duelSystem = new DuelSystem(this);
        this.itemSystem = new ItemSystem(this);
        this.shopSystem = new ShopSystem(this);
        this.persistenceSystem = new PersistenceSystem(this.entities, this.state.players);
        this.healthSystem = new HealthSystem(this);
        
        this.academicManager = new AcademicManager(
            this.state, 
            this.spawnManager, 
            this.chatManager, 
            this.prestigeSystem, 
            this.entities
        );

        // 4. Load Map
        try {
            const mapPath = path.join(process.cwd(), "assets/maps/world.json");
            const { spawnPos, mapData, navGrid } = await this.physicsManager.loadMap(mapPath);
            
            this.pathfinder = new Pathfinding(navGrid);
            
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.loadSeats(mapData);
            this.spawnManager.spawnEchoes(24, spawnPos);
            this.spawnManager.spawnFromMap(mapData);
            
            for(let i=0; i<5; i++) this.itemSystem.spawnRandomItem();
        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        let lastLogHour = -1;

        this.setSimulationInterval((deltaTime) => {
            const now = timeManager.getNow();
            if (this.state.timeOffset !== timeManager.getOffset()) {
                this.state.timeOffset = timeManager.getOffset();
            }

            const { hour: currentHour, isNight } = getGameTime(now);
            
            // --- UPDATES ---
            this.spawnManager.checkPrefectSpawns(isNight);
            
            if (Math.abs(currentHour - lastLogHour) > 0.1) {
                lastLogHour = currentHour;
            }
            
            const { currentCourse, currentMonth, currentDay } = getAcademicProgress(this.state.worldStartTime, now);
            if (this.state.currentMonth !== currentMonth) {
                this.state.currentMonth = currentMonth;
            }
            if (this.state.currentDay !== currentDay) {
                this.state.currentDay = currentDay;
            }

            // Detect Graduation
            if (this.state.currentCourse < currentCourse) {
                this.handleGraduation(currentCourse);
            }
            
            // --- SYSTEMS ---
            MovementSystem(this.world);
            this.duelSystem.update();
            this.physicsManager.update(deltaTime); 
            this.academicManager.update(deltaTime, currentHour); 
            
            AISystem(
                this.world, 
                this.physicsManager.world, 
                deltaTime, 
                currentHour, 
                this.pathfinder,
                (id, spell, vx, vy) => this.handleCast(id, spell, vx, vy),
                (id) => {
                    const p = this.state.players.get(id);
                    return p ? { x: p.x, y: p.y } : null;
                },
                (id, text) => this.chatManager.handleChat(id, text),
                (id) => this.broadcast("player_jump", { id }),
                (prefectId, victimId) => this.sendToDetention(victimId)
            );
            
            this.spellSystem.update(deltaTime);
            this.itemSystem.update(deltaTime);
            this.healthSystem.update();
            
        }, 1000 / CONFIG.SERVER_FPS);

        this.registerMessageHandlers();
        this.persistenceSystem.startAutoSave();
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
        if (!entity || !entity.body) return;

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
            
            // 1. Find Echo Slot
            const echoSlot = this.spawnManager.findAvailableEcho(targetHouse);
            
            if (!echoSlot) {
                console.error("[SERVER] No available student slots!");
                client.leave();
                return;
            }

            // 2. Initialize Session
            const house = (echoSlot.entity.ai?.house || 'ignis') as 'ignis' | 'axiom' | 'vesper';
            
            const session = await PlayerService.initializeSession(authUser.userId, authUser.username, { ...options, house });

            // 3. Possess
            const playerEnt = this.spawnManager.possessEcho(echoSlot.id, client.sessionId, {
                username: authUser.username,
                skin: options.skin || "player_idle",
                house: house,
                prestige: session.dbPlayer.prestige,
                gold: session.dbPlayer.gold,
                xp: session.dbPlayer.xp,
                academicPoints: session.dbPlayer.academicPoints,
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
            
            // CLEANUP: Reset temporary states
            playerState.isAttendingClass = false; 
            playerState.classEndsAt = 0;
            
            // PERSISTENCE: Ensure critical stats are attached
            (playerState as any).alignment = entity.metadata.alignment || 0;
            // detentionWork is part of Schema, so it's auto-read by saveSession from playerState object
            
            await PlayerService.saveSession(dbId, playerState);
        }

        // Restore Echo
        this.spawnManager.restoreEcho(client.sessionId, playerState);
        console.log(`[SERVER] Player ${client.sessionId} left.`);
    }
}