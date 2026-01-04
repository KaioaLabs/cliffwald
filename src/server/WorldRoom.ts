import { Room, Client } from "colyseus";
import { GameState, Player, ChatMessage, Projectile } from "../shared/SchemaDef";
import { CONFIG, getGameHour, getAcademicProgress } from "../shared/Config";
import { PlayerInput, JoinOptions } from "../shared/types/NetworkTypes";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
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

export class WorldRoom extends Room<GameState> {
    physicsWorld!: RAPIER.World;
    eventQueue!: RAPIER.EventQueue;
    world!: ECSWorld;
    spawnManager!: SpawnManager;
    pathfinder?: Pathfinding;
    spellSystem!: SpellSystem;
    prestigeSystem!: PrestigeSystem;
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
        
        // 8 AM Offset
        const startOffsetMs = (28800 / CONFIG.GAME_TIME_SPEED) * 1000;
        this.state.worldStartTime = Date.now() - startOffsetMs;

        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
        this.eventQueue = new RAPIER.EventQueue(true);

        this.world = createWorld();
        this.spawnManager = new SpawnManager(this.world, this.physicsWorld, this.state, this.entities);
        this.spellSystem = new SpellSystem(this);
        this.prestigeSystem = new PrestigeSystem(this);

        try {
            const mapFile = await fs.readFile("./assets/maps/world.json", "utf-8");
            const mapData = JSON.parse(mapFile);
            const result = buildPhysics(this.physicsWorld, mapData);
            this.spawnPos = result.spawnPos;
            this.pathfinder = new Pathfinding(result.navGrid);
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.spawnEchoes(24, this.spawnPos);
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
                // Determine Winner
                let winner = "Tie";
                const scores = [
                    { name: 'IGNIS', score: this.state.ignisPoints },
                    { name: 'AXIOM', score: this.state.axiomPoints },
                    { name: 'VESPER', score: this.state.vesperPoints }
                ];
                scores.sort((a, b) => b.score - a.score);
                if (scores[0].score > scores[1].score) winner = scores[0].name;

                // Broadcast Ceremony
                const msg = new ChatMessage();
                msg.sender = "HEADMASTER";
                msg.text = `THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`;
                msg.timestamp = Date.now();
                this.state.messages.push(msg);
                this.broadcast("chat", msg);

                // RESET HOUSE POINTS for the new year
                this.state.ignisPoints = 0;
                this.state.axiomPoints = 0;
                this.state.vesperPoints = 0;
                this.state.currentCourse = currentCourse;
                
                console.log(`[GRADUATION] House ${winner} won! Resetting points for Course ${currentCourse}.`);
            }
            
            // PRESTIGE REWARDS (Once per Game Hour)
            if (currentHour !== lastRewardedHour) {
                lastRewardedHour = currentHour;
                
                this.entities.forEach((entity, sessionId) => {
                    // Check if player or echo is at their designated spot
                    const spots = entity.ai?.routineSpots || (entity as any).tempSpots;
                    
                    if (spots) {
                        const pos = entity.body?.translation();
                        if (pos) {
                            // Determine current target based on hour
                            let target = spots.sleep;
                            if (currentHour >= 7 && currentHour < 8) target = spots.eat;
                            else if (currentHour >= 8 && currentHour < 10) target = spots.class;
                            else if (currentHour >= 19 && currentHour < 21) target = spots.eat;
                            else if (currentHour >= 17 && currentHour < 19) target = spots.class;

                            const dist = Math.sqrt(Math.pow(target.x - pos.x, 2) + Math.pow(target.y - pos.y, 2));
                            if (dist < 50) {
                                this.prestigeSystem.addPrestige(sessionId, 5);
                            }
                        }
                    }
                });
            }

            MovementSystem(this.world);
            AISystem(this.world, deltaTime, currentHour, this.pathfinder);
            this.spellSystem.update(deltaTime);
            this.physicsWorld.step(this.eventQueue);

            logTimer += deltaTime;
            if (logTimer > CONFIG.LOG_INTERVAL) {
                const players = Array.from(this.state.players.values());
                console.log(`[SERVER STATS] Students Active: ${players.length}`);
                logTimer = 0;
            }

            this.world.entities.forEach(entity => {
                if (entity.player && entity.body) {
                    const playerState = this.state.players.get(entity.player.sessionId);
                    if (playerState) {
                        const pos = entity.body.translation();
                        const vel = entity.body.linvel();
                        playerState.x = pos.x;
                        playerState.y = pos.y;
                        playerState.vx = vel.x;
                        playerState.vy = vel.y;
                    }
                }
            });
        });

        this.onMessage("move", (client, input: PlayerInput) => {
            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input) {
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;
            }
        });

        this.onMessage("cast", (client, data: { spellId: string, vx: number, vy: number }) => {
            const entity = this.entities.get(client.sessionId);
            if (!entity || !entity.body) return;

            const spellConfig = SPELL_REGISTRY[data.spellId];
            if (!spellConfig) return;

            const now = Date.now();
            const lastCast = this.lastCastTimes.get(client.sessionId) || 0;
            if (now - lastCast < spellConfig.cooldown) return;
            this.lastCastTimes.set(client.sessionId, now);

            // 3. Spawn projectile
            const pos = entity.body.translation();
            const id = `proj_${client.sessionId}_${now}`;
            const proj = new Projectile();
            proj.id = id;
            proj.spellId = data.spellId;
            proj.x = pos.x;
            proj.y = pos.y;
            
            const mag = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
            proj.vx = (mag > 0) ? (data.vx / mag) * spellConfig.speed : spellConfig.speed;
            proj.vy = (mag > 0) ? (data.vy / mag) * spellConfig.speed : 0;
            proj.ownerId = client.sessionId;
            
            // Meta for cleanup
            proj.creationTime = now;
            proj.maxRange = 600;

            this.state.projectiles.set(id, proj);
        });

        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.onMessage("chat", (client, text: string) => {
            const player = this.state.players.get(client.sessionId);
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
            }
        });
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
            this.playerDbIds.set(client.sessionId, (await PlayerService.initializeSession(authUser.userId, authUser.username, options)).dbPlayer.id);

            // 3. Setup State
            const playerState = new Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            const pos = possessedEntity.body!.translation();
            playerState.x = pos.x;
            playerState.y = pos.y;
            playerState.skin = options.skin || "player_idle";

            this.state.players.set(client.sessionId, playerState);
            this.state.players.delete(slotId); // Remove the Echo from state

            console.log(`[SERVER] Player ${authUser.username} possessed slot ${slotId}`);

        } catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const dbId = this.playerDbIds.get(client.sessionId);

        if (entity && entity.body) {
            if (dbId) PersistenceManager.savePlayerSession(dbId, entity).catch(console.error);

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
            
            this.state.players.set(slotId, echoState);
        }
        
        this.state.players.delete(client.sessionId);
        this.playerDbIds.delete(client.sessionId);
    }
}
