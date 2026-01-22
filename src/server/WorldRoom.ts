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
import { SystemBootstrapper } from "./managers/SystemBootstrapper";

import { WorldService } from "./services/WorldService";
import { ZONE_DATA } from "../shared/data/ZoneRegistry";
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
        
        // --- BOOTSTRAP SYSTEMS ---
        const systems = SystemBootstrapper.initialize(this);
        
        this.chatManager = systems.chatManager;
        this.physicsManager = systems.physicsManager;
        this.persistenceSystem = systems.persistenceSystem;
        this.prestigeSystem = systems.prestigeSystem;
        this.itemSystem = systems.itemSystem;
        this.shopSystem = systems.shopSystem;
        this.spellSystem = systems.spellSystem;
        this.duelSystem = systems.duelSystem;
        this.healthSystem = systems.healthSystem;
        this.spawnManager = systems.spawnManager;
        this.academicManager = systems.academicManager;
        this.gameLoopManager = systems.gameLoopManager;

        // 3. Load Map & Logic
        const mapPath = path.join(process.cwd(), "assets/maps/world.json");
        try {
            await this.loadMapLogic(mapPath);
            
            // Spawn Logic
            const { spawnPos, mapData, prefectSpawns, merchantSpawns } = await this.physicsManager.loadMap(mapPath);
            
            console.log(`[SERVER] Map loaded. Initializing 96 Student Slots...`);
            this.spawnManager.loadSeats(mapData, [...prefectSpawns, ...merchantSpawns]);
            this.spawnManager.spawnEchoes(96, spawnPos);
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
        this.onMessage("move", (client, input: any) => {
            const playerState = this.state.players.get(client.sessionId);
            if (!playerState || playerState.unconsciousUntil > 0) return; 

            // SANITIZATION: Validate Input Structure
            if (typeof input !== 'object' || input === null) return;

            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input) {
                // Boolean Coercion
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;
                
                // Analog Validation
                if (input.analogDir && typeof input.analogDir === 'object') {
                    let x = Number(input.analogDir.x);
                    let y = Number(input.analogDir.y);
                    
                    // Safety Clamp (Prevent Infinity/NaN)
                    if (!Number.isFinite(x)) x = 0;
                    if (!Number.isFinite(y)) y = 0;
                    
                    // Clamp Magnitude (Prevent Speed Hacks via Input)
                    // MovementSystem normalizes, but clamping here adds depth defense
                    x = Math.max(-1, Math.min(1, x));
                    y = Math.max(-1, Math.min(1, y));

                    entity.input.analogDir = { x, y };
                } else {
                    entity.input.analogDir = undefined;
                }
            }
        });

        this.onMessage("cast", (client, data: any) => {
            // SANITIZATION
            if (!data || typeof data !== 'object') return;
            
            const spellId = String(data.spellId || "").slice(0, 32); // Max length check
            let vx = Number(data.vx);
            let vy = Number(data.vy);

            // Safety Check
            if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;

            // Optional: Clamp max velocity here if not handled in SpellSystem
            // For now, infinite/NaN check is the critical crash fix.

            this.handleCast(client.sessionId, spellId, vx, vy);
        });

        this.onMessage("collect", (client, itemId) => this.itemSystem.tryCollectItem(client.sessionId, itemId));
        this.onMessage("buy", (client, itemId) => this.shopSystem.handleBuy(client.sessionId, itemId));
        this.onMessage("ping", (client, timestamp) => client.send("pong", timestamp));
        this.onMessage("chat", (client, text: any) => {
            if (typeof text !== 'string') return;
            
            // Truncate to Config limit (or sensible default)
            const cleanText = text.slice(0, CONFIG.CHAT.MAX_LENGTH || 100).trim();
            if (cleanText.length > 0) {
                this.chatManager.handleChat(client.sessionId, cleanText);
            }
        });
        this.onMessage("jump", (client) => this.broadcast("player_jump", { id: client.sessionId }));
        
        this.onMessage("toggle_god", (client) => {
            // SECURITY: Basic check (in prod, use AuthService roles)
            // TODO: [DEBT] Add proper Role-Based Access Control (RBAC) here. Only 'ADMIN' should access this.
            const playerState = this.state.players.get(client.sessionId);
            if (!playerState) return;

            // Toggle
            playerState.isGhost = !playerState.isGhost;
            
            // Sync to ECS for MovementSystem
            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input) {
                entity.input.isGhost = playerState.isGhost;
            }

            // Update Physics (Collisions)
            this.physicsManager.setPlayerGhostMode(client.sessionId, playerState.isGhost);

            // Feedback
            const status = playerState.isGhost ? "ENABLED" : "DISABLED";
            client.send("notification", `GOD MODE: ${status}`);
            console.log(`[DEV] ${playerState.username} toggled God Mode: ${status}`);
        });

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
            console.log(`[DISCIPLINE] Detaining ${player.username} (Level ${player.currentOffenseLevel})`);
            const detentionPos = LevelRegistry.getInstance().getLocation("DETENTION");
            entity.body.setTranslation(detentionPos, true);
            player.x = detentionPos.x;
            player.y = detentionPos.y;
            
            // Calculate work units: 50, 100, 200
            const workMap = [0, 50, 100, 200];
            player.detentionWork = workMap[player.currentOffenseLevel || 1] || 50; 

            this.itemSystem.spawnDetentionTasks();
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) client.send("notification", `YOU HAVE BEEN DETAINED! Level ${player.currentOffenseLevel}. Complete tasks to leave.`);
            this.chatManager.broadcastSystemMessage(`${player.username} has been sent to DETENTION (Level ${player.currentOffenseLevel}).`, "PREFECT");
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
            player.currentOffenseLevel = 1; // Reset to level 1 (curfew)
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) client.send("notification", "You are free! Return to your studies.");
        }
    }

    public setSleepingState(id: string, isSleeping: boolean) {
        const player = this.state.players.get(id);
        const entity = this.entities.get(id);
        
        if (player) {
            if (player.isSleepingUpstairs === isSleeping) return;
            player.isSleepingUpstairs = isSleeping;
        }

        if (entity && entity.body) {
            if (isSleeping) {
                // Vanish to Limbo
                entity.body.setTranslation({ x: -5000, y: -5000 }, true);
            } else {
                // Wake up at stairs (Sleep Spot)
                if (entity.ai && entity.ai.routineSpots && entity.ai.routineSpots.sleep) {
                    const spot = entity.ai.routineSpots.sleep;
                    entity.body.setTranslation({ x: spot.x, y: spot.y }, true);
                } else {
                    // Fallback
                    entity.body.setTranslation({ x: 300, y: 300 }, true);
                }
            }
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

        // OFFENSE CHECK: Level 2 (Magic during Curfew)
        const { isNight } = getGameTime(now);
        if (isNight && playerState.currentOffenseLevel < 2) {
            const zoneId = this.physicsManager.getPlayerZone(sessionId);
            const zoneDef = zoneId ? ZONE_DATA[zoneId] : null;
            if (!zoneDef?.isSanctuary) {
                playerState.currentOffenseLevel = 2;
                console.log(`[DISCIPLINE] ${playerState.username} offense elevated to Level 2 (Magic)`);
            }
        }

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
            
            // Determine House from Skin
            let targetHouse = 'ignis';
            if (options.skin?.includes('blue')) targetHouse = 'axiom';
            else if (options.skin?.includes('yellow') || options.skin?.includes('vesper')) targetHouse = 'vesper';
            else if (options.skin?.includes('red')) targetHouse = 'ignis';
            else targetHouse = 'ignis'; // Default

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

            // FTUE: First Time User Experience Logic
            // If player has default coordinates (never saved position), spawn at Great Hall (Director Welcome)
            let overridePos: { x: number, y: number } | undefined;
            if (session.dbPlayer.x === 300 && session.dbPlayer.y === 300) {
                console.log(`[FTUE] New Character ${authUser.username} detected. Forcing spawn at Great Hall.`);
                overridePos = this.spawnManager.getSpawnPoint();
            }

            // 4. Possess
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
            }, overridePos);
            
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
            playerState.alignment = entity.metadata.alignment || 0;
            
            await PlayerService.saveSession(dbId, playerState);
        }

        this.spawnManager.restoreEcho(client.sessionId, playerState);
        console.log(`[SERVER] Player ${client.sessionId} left.`);
    }
}
