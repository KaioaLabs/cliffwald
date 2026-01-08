import { Room, Client } from "colyseus";
import { GameState, Player, ChatMessage, Projectile, InventoryItem } from "../shared/SchemaDef";
import { CONFIG, getGameHour, getAcademicProgress } from "../shared/Config";
import { PlayerInput, JoinOptions } from "../shared/types/NetworkTypes";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics, MapData, parseEntities } from "../shared/MapParser";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { AISystem } from "../shared/systems/AISystem";
import { Pathfinding } from "../shared/systems/Pathfinding";
import { SpellSystem } from "./systems/SpellSystem";
import { PrestigeSystem } from "./systems/PrestigeSystem";
import { SPELL_REGISTRY } from "../shared/items/SpellRegistry";
import { Entity } from "../shared/ecs/components";
import { AuthService } from "./services/AuthService";
import { PersistenceManager } from "./managers/PersistenceManager";
import { SpawnManager } from "./managers/SpawnManager";
import { PlayerService } from "./services/PlayerService";
import * as fs from "fs/promises";
import path from "path";

import { DuelSystem } from "./systems/DuelSystem";
import { ItemSystem } from "./systems/ItemSystem";

export class WorldRoom extends Room<GameState> {
    physicsWorld!: RAPIER.World;
    eventQueue!: RAPIER.EventQueue;
    world!: ECSWorld;
    spawnManager!: SpawnManager;
    pathfinder?: Pathfinding;
    spellSystem!: SpellSystem;
    prestigeSystem!: PrestigeSystem;
    duelSystem!: DuelSystem;
    itemSystem!: ItemSystem;
    entities = new Map<string, Entity>();
    playerDbIds = new Map<string, number>();
    spawnPos = { x: 300, y: 300 };
    
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
        
        // Initialize Points
        this.state.ignisPoints = 0;
        this.state.axiomPoints = 0;
        this.state.vesperPoints = 0;
        
        // Time is absolute now
        this.state.worldStartTime = Date.now();

        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
        this.eventQueue = new RAPIER.EventQueue(true);

        this.world = createWorld();
        this.spawnManager = new SpawnManager(this.world, this.physicsWorld, this.state, this.entities);
        this.spellSystem = new SpellSystem(this);
        this.prestigeSystem = new PrestigeSystem(this);
        this.duelSystem = new DuelSystem(this);
        this.itemSystem = new ItemSystem(this);

        try {
            const mapPath = path.join(process.cwd(), "assets/maps/world.json");
            const mapFile = await fs.readFile(mapPath, "utf-8");
            const mapData = JSON.parse(mapFile) as MapData;
            
            const result = buildPhysics(this.physicsWorld, mapData);
            const entitiesResult = parseEntities(mapData);
            
            this.spawnPos = entitiesResult.spawnPos;
            this.pathfinder = new Pathfinding(result.navGrid);
            
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.loadSeats(mapData);
            this.spawnManager.spawnEchoes(24, this.spawnPos);
            this.spawnManager.spawnFromMap(mapData);
            // Spawn initial cards
            for(let i=0; i<5; i++) this.itemSystem.spawnRandomItem();
        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        let logTimer = 0;
        let lastRewardedHour = -1;

        this.setSimulationInterval((deltaTime) => {
            const currentHour = getGameHour(this.state.worldStartTime);
            const { currentCourse, currentMonth, currentWeek } = getAcademicProgress(this.state.worldStartTime);
            
            // Sync Calendar State
            if (this.state.currentMonth !== currentMonth) {
                console.log(`[CALENDAR] Welcome to ${currentMonth}`);
                this.state.currentMonth = currentMonth;
            }

            // Detect YEAR END / GRADUATION
            if (this.state.currentCourse < currentCourse) {
                let winner = "Tie";
                const scores = [
                    { name: 'IGNIS', score: this.state.ignisPoints },
                    { name: 'AXIOM', score: this.state.axiomPoints },
                    { name: 'VESPER', score: this.state.vesperPoints }
                ];
                scores.sort((a, b) => b.score - a.score);
                if (scores[0].score > scores[1].score) winner = scores[0].name;

                const msg = new ChatMessage();
                msg.sender = "HEADMASTER";
                msg.text = `THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`;
                msg.timestamp = Date.now();
                this.state.messages.push(msg);
                this.broadcast("chat", msg);

                this.state.ignisPoints = 0;
                this.state.axiomPoints = 0;
                this.state.vesperPoints = 0;
                this.state.currentCourse = currentCourse;
                console.log(`[GRADUATION] House ${winner} won! Resetting points.`);
            }
            
            // PRESTIGE REWARDS
            if (currentHour !== lastRewardedHour) {
                lastRewardedHour = currentHour;
                this.entities.forEach((entity, sessionId) => {
                    const spots = entity.ai?.routineSpots || (entity as any).tempSpots;
                    if (spots) {
                        const pos = entity.body?.translation();
                        if (pos) {
                            let target = spots.sleep;
                            if (currentHour >= 7 && currentHour < 8) target = spots.eat;
                            else if (currentHour >= 8 && currentHour < 10) target = spots.class;
                            else if (currentHour >= 19 && currentHour < 21) target = spots.eat;
                            else if (currentHour >= 17 && currentHour < 19) target = spots.class;

                            if (Math.sqrt((target.x - pos.x)**2 + (target.y - pos.y)**2) < 50) {
                                this.prestigeSystem.addPrestige(sessionId, 5);
                            }
                        }
                    }
                });
            }
            
            MovementSystem(this.world);
            this.duelSystem.update();
            
            AISystem(
                this.world, 
                this.physicsWorld, 
                deltaTime, 
                currentHour, 
                this.pathfinder,
                (id, spell, vx, vy) => this.handleCast(id, spell, vx, vy),
                (id) => {
                    const p = this.state.players.get(id);
                    return p ? { x: p.x, y: p.y } : null;
                }
            );
            
            this.spellSystem.update(deltaTime);
            this.itemSystem.update(deltaTime);
            this.physicsWorld.step(this.eventQueue);

            // SYNC PHYSICS TO STATE
            this.entities.forEach((entity, sessionId) => {
                if (entity.body) {
                    const pos = entity.body.translation();
                    const playerState = this.state.players.get(sessionId);
                    
                    if (playerState) {
                        // OPTIMIZATION: Round to 2 decimals to prevent micro-jitter network spam
                        const newX = Math.round(pos.x * 100) / 100;
                        const newY = Math.round(pos.y * 100) / 100;
                        
                        if (playerState.x !== newX || playerState.y !== newY) {
                            playerState.x = newX;
                            playerState.y = newY;
                        }
                    }
                }
            });

            logTimer += deltaTime;
        }, 1000 / 15);

        this.onMessage("move", (client, input: PlayerInput) => {
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
            } else {
                console.warn(`[SERVER] No entity found for moving client ${client.sessionId}`);
            }
        });

        this.onMessage("cast", (client, data: { spellId: string, vx: number, vy: number }) => {
            console.log(`[SERVER] Received cast from ${client.sessionId}: ${data.spellId}`);
            this.handleCast(client.sessionId, data.spellId, data.vx, data.vy);
        });

        this.onMessage("collect", (client, itemId: string) => {
            this.itemSystem.tryCollectItem(client.sessionId, itemId);
        });

        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.onMessage("chat", (client, text: string) => {
            const player = this.state.players.get(client.sessionId);
            console.log(`[SERVER] Chat request from ${client.sessionId}. Player found: ${!!player}. Text: "${text}"`);
            
            if (player && text) {
                const msg = new ChatMessage();
                msg.sender = player.username;
                msg.text = text.slice(0, CONFIG.CHAT_MAX_LENGTH);
                msg.timestamp = Date.now();
                this.state.messages.push(msg);
                this.broadcast("chat", msg);
                if (this.state.messages.length > CONFIG.CHAT_HISTORY_SIZE) {
                    this.state.messages.shift();
                }
                console.log(`[CHAT] ${msg.sender}: ${msg.text}`);
            } else {
                console.warn(`[SERVER] Chat ignored. Player: ${player}, Text: ${text}`);
            }
        });
    }

    handleCast(sessionId: string, spellId: string, vx: number, vy: number) {
        const entity = this.entities.get(sessionId);
        if (!entity || !entity.body) {
            console.warn(`[SERVER] Cast failed: Entity ${sessionId} not found or has no body`);
            return;
        }

        const spellConfig = SPELL_REGISTRY[spellId];
        if (!spellConfig) {
            console.warn(`[SERVER] Cast failed: Spell ${spellId} not in registry`);
            return;
        }

        const now = Date.now();
        const lastCast = this.lastCastTimes.get(sessionId) || 0;
        if (now - lastCast < spellConfig.cooldown) {
            console.log(`[SERVER] Cast on cooldown for ${sessionId}`);
            return;
        }
        this.lastCastTimes.set(sessionId, now);

        // Spawn projectile
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
        proj.maxRange = 600;

        this.state.projectiles.set(id, proj);
        console.log(`[SERVER] Projectile created: ${id} at ${proj.x},${proj.y}`);
    }

    async onJoin(client: Client, options: JoinOptions) {
        try {
            const authUser = client.auth as { userId: number, username: string };
            
            // 1. FIND AN AVAILABLE SLOT
            const targetHouse = options.skin?.includes('red') ? 'ignis' : (options.skin?.includes('blue') ? 'axiom' : 'vesper');
            
            let possessedEntity: Entity | undefined;
            let slotId: string | undefined;

            for (const [id, ent] of this.entities) {
                if (ent.ai && !ent.player?.sessionId.startsWith('sess_')) {
                    if (!targetHouse || ent.ai.house === targetHouse) {
                        possessedEntity = ent;
                        slotId = id;
                        break;
                    }
                }
            }

            if (!possessedEntity || !slotId) {
                console.error("[SERVER] No available student slots!");
                client.leave();
                return;
            }

            // 2. POSSESS SLOT
            const originalSpots = possessedEntity.ai!.routineSpots;
            const house = possessedEntity.ai!.house;
            const oldEchoState = this.state.players.get(slotId);
            const carriedPrestige = oldEchoState?.personalPrestige || 0;

            // Remove AI control but keep the entity
            possessedEntity.player!.sessionId = client.sessionId;
            possessedEntity.ai = undefined; 
            possessedEntity.input = { left: false, right: false, up: false, down: false }; 

            // Track slot info for restoration
            (possessedEntity as any).slotId = slotId; 
            (possessedEntity as any).tempSpots = originalSpots;
            (possessedEntity as any).house = house;

            this.entities.delete(slotId);
            this.entities.set(client.sessionId, possessedEntity);
            
            // LOAD DB SESSION
            const session = await PlayerService.initializeSession(authUser.userId, authUser.username, { ...options, house });
            this.playerDbIds.set(client.sessionId, session.dbPlayer.id);

            // 3. Setup State
            const playerState = new Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            const pos = possessedEntity.body!.translation();
            playerState.x = pos.x;
            playerState.y = pos.y;
            playerState.skin = options.skin || "player_idle";
            playerState.personalPrestige = carriedPrestige + (session.dbPlayer.prestige || 0); // Add stored prestige? 
            // Warning: Double counting if echoed prestige is stored? 
            // Echo prestige is transient session prestige. DB prestige is permanent.
            // Let's assume DB prestige overwrites/is the source of truth for now.
            playerState.personalPrestige = session.dbPlayer.prestige || 0;
            playerState.house = house || 'ignis';

            // Hydrate Inventory (Universal + Legacy Cards)
            if (session.dbPlayer.inventory) {
                session.dbPlayer.inventory.forEach((dbItem: any) => {
                    // 1. Universal Inventory
                    const invItem = new InventoryItem();
                    invItem.itemId = dbItem.itemId;
                    invItem.qty = dbItem.count;
                    playerState.inventory.push(invItem);

                    // 2. Legacy Card Support (for Album UI)
                    if (dbItem.itemId.startsWith("card_")) {
                        const cardId = parseInt(dbItem.itemId.split("_")[1]);
                        if (!isNaN(cardId)) playerState.cardCollection.push(cardId);
                    }
                });
            }

            this.state.players.set(client.sessionId, playerState);
            this.state.players.delete(slotId); 

            console.log(`[SERVER] Player ${authUser.username} possessed slot ${slotId} with ${playerState.personalPrestige} prestige.`);

        } catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const dbId = this.playerDbIds.get(client.sessionId);

        if (entity && entity.body) {
            const playerState = this.state.players.get(client.sessionId);
            
            // ATOMIC SAVE-ON-EXIT
            if (dbId && playerState) {
                // We update the schema X/Y with latest physics pos to ensure accuracy
                const pos = entity.body.translation();
                playerState.x = pos.x;
                playerState.y = pos.y;
                
                await PlayerService.saveSession(dbId, playerState);
            }

            // UNPOSSESS: Restore original slot ID
            const slotId = (entity as any).slotId || `student_fallback_${Date.now()}`;
            const spots = (entity as any).tempSpots;
            const house = (entity as any).house;
            
            entity.player!.sessionId = slotId;
            entity.ai = {
                state: 'idle',
                timer: 0,
                home: entity.body.translation(),
                house: house,
                routineSpots: spots
            };

            this.entities.delete(client.sessionId);
            this.entities.set(slotId, entity);

            const oldState = this.state.players.get(client.sessionId);
            const echoState = new Player();
            echoState.id = slotId;
            echoState.username = `${house.charAt(0).toUpperCase() + house.slice(1)} Student`;
            echoState.x = entity.body.translation().x;
            echoState.y = entity.body.translation().y;
            echoState.skin = oldState?.skin || "player_idle";
            echoState.personalPrestige = oldState?.personalPrestige || 0; // RESTORE POINTS TO ECHO
            echoState.house = house || 'ignis';
            
            this.state.players.set(slotId, echoState);
        }
        
        this.state.players.delete(client.sessionId);
        this.playerDbIds.delete(client.sessionId);
    }
}
