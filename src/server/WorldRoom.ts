import { Room, Client } from "colyseus";
import { GameState, Player, InventoryItem, ChatMessage, Projectile } from "../shared/SchemaDef";
import { CONFIG } from "../shared/Config";
import { PlayerInput, JoinOptions, ChatMessagePayload } from "../shared/types/NetworkTypes";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { AISystem } from "../shared/systems/AISystem";
import { StatsSystem } from "../shared/systems/StatsSystem";
import { InventorySystem } from "../shared/systems/InventorySystem";
import { CombatSystem } from "./systems/CombatSystem";
import { Entity } from "../shared/ecs/components";
import { AuthService } from "./services/AuthService";
import { PersistenceManager } from "./managers/PersistenceManager";
import { SpawnManager } from "./managers/SpawnManager";
import { PlayerService } from "./services/PlayerService";
import { SPELL_REGISTRY } from "../shared/items/SpellRegistry";
import * as fs from "fs/promises";

export class WorldRoom extends Room<GameState> {
    physicsWorld!: RAPIER.World;
    eventQueue!: RAPIER.EventQueue;
    world!: ECSWorld;
    combatSystem!: CombatSystem;
    spawnManager!: SpawnManager;
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

    async onCreate(options: any) {
        this.setMetadata({ name: "Cliffwald World" });
        this.setState(new GameState());
        
        // 8 AM Offset
        const startOffsetMs = (28800 / CONFIG.GAME_TIME_SPEED) * 1000;
        this.state.worldStartTime = Date.now() - startOffsetMs;

        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
        this.eventQueue = new RAPIER.EventQueue(true);

        this.world = createWorld();
        this.combatSystem = new CombatSystem(this, this.physicsWorld, this.eventQueue);
        this.spawnManager = new SpawnManager(this.world, this.physicsWorld, this.state, this.entities);

        try {
            const mapFile = await fs.readFile("./assets/maps/world.json", "utf-8");
            const mapData = JSON.parse(mapFile);
            console.log(`[SERVER] Loading Map: ${mapData.width}x${mapData.height}`);
            const result = buildPhysics(this.physicsWorld, mapData);
            this.spawnPos = result.spawnPos;
            console.log(`[SERVER] Map loaded. Spawn set to: ${this.spawnPos.x}, ${this.spawnPos.y}`);
            this.spawnManager.spawnEchoes(19, this.spawnPos);
        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        let logTimer = 0;
        this.setSimulationInterval((deltaTime) => {
            MovementSystem(this.world);
            AISystem(this.world, deltaTime);
            StatsSystem(this.world);
            InventorySystem(this.world);
            this.physicsWorld.step(this.eventQueue);

            logTimer += deltaTime;
            if (logTimer > 10000) {
                const players = Array.from(this.state.players.values());
                const realPlayers = players.filter(p => !p.id.startsWith('echo_')).length;
                const echoes = players.filter(p => p.id.startsWith('echo_')).length;
                console.log(`[SERVER STATS] Real Players: ${realPlayers} | Echoes: ${echoes}`);
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

            this.combatSystem.update(deltaTime);
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

            // Security: Validate Spell
            const spellConfig = SPELL_REGISTRY[data.spellId];
            if (!spellConfig) {
                console.warn(`[CHEAT] Player ${client.sessionId} tried to cast invalid spell: ${data.spellId}`);
                return;
            }

            // Security: Check Cooldown
            const now = Date.now();
            const lastCast = this.lastCastTimes.get(client.sessionId) || 0;
            if (now - lastCast < spellConfig.cooldown) {
                // Cooldown active, ignore
                return;
            }
            this.lastCastTimes.set(client.sessionId, now);

            const pos = entity.body.translation();
            const mag = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
            const vx = (mag > 0) ? (data.vx / mag) * spellConfig.speed : spellConfig.speed;
            const vy = (mag > 0) ? (data.vy / mag) * spellConfig.speed : 0;

            const id = `proj_${client.sessionId}_${Date.now()}`;
            const proj = new Projectile();
            proj.id = id;
            proj.spellId = data.spellId;
            proj.x = pos.x;
            proj.y = pos.y;
            proj.startX = pos.x;
            proj.startY = pos.y;
            proj.vx = vx;
            proj.vy = vy;
            proj.maxRange = 600;
            proj.ownerId = client.sessionId;
            proj.creationTime = now;

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
            
            // 1. Kick Zombies
            this.clients.forEach(c => {
                if (c.auth && c.auth.userId === authUser.userId && c.sessionId !== client.sessionId) {
                    console.log(`[SERVER] Kicking old session for user ${authUser.username} (${c.sessionId})`);
                    c.leave();
                }
            });

            console.log(`[SERVER] Player ${client.sessionId} joined (Auth: ${authUser.username})`);
            
            // 2. Initialize Session
            const { dbPlayer, inventory } = await PlayerService.initializeSession(authUser.userId, authUser.username, options);

            this.playerDbIds.set(client.sessionId, dbPlayer.id);

            // 3. Setup State
            const playerState = new Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            playerState.x = dbPlayer.x;
            playerState.y = dbPlayer.y;
            playerState.skin = dbPlayer.skin;
            playerState.hp = dbPlayer.health;
            playerState.maxHp = dbPlayer.maxHealth;

            const schemaItems = PlayerService.mapInventoryToSchema(inventory);
            schemaItems.forEach(item => playerState.inventory.push(item));

            console.log(`[SERVER] Loaded ${authUser.username} at ${playerState.x}, ${playerState.y}`);

            // 4. Create ECS Entity
            const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
                .setTranslation(playerState.x, playerState.y);
            const body = this.physicsWorld.createRigidBody(bodyDesc);
            body.userData = { sessionId: client.sessionId };
            const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
            this.physicsWorld.createCollider(colliderDesc, body);

            const entity = this.world.add({
               body: body,
               input: { left: false, right: false, up: false, down: false },
               facing: { x: 0, y: 1 },
               player: { sessionId: client.sessionId },
               stats: {
                   hp: dbPlayer.health,
                   maxHp: dbPlayer.maxHealth,
                   speed: CONFIG.PLAYER_SPEED,
                   mp: 100,
                   maxMp: 100,
                   level: 1,
                   exp: 0,
                   expToNext: 100
               },
               equipment: { weapon: "sword_wood" },
               inventory: {
                   items: inventory.map(item => ({ itemId: item.itemId, count: item.count })),
                   capacity: 10
               }
           });

            this.entities.set(client.sessionId, entity);
            this.state.players.set(client.sessionId, playerState);
        } catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const dbId = this.playerDbIds.get(client.sessionId);

        // Cleanup Validation
        this.lastCastTimes.delete(client.sessionId);

        if (entity && entity.body && dbId) {
            // 1. Fire-and-forget save (Non-blocking)
            PersistenceManager.savePlayerSession(dbId, entity)
                .catch(err => console.error(`[SERVER] Failed to save player ${dbId} on leave:`, err));

            try {
                // 3. ECHO TRANSFORMATION
                this.spawnManager.convertToEcho(client.sessionId, dbId, entity);
            } catch (e) {
                console.error(`[SERVER] Failed to echo player ${dbId}:`, e);
                if (entity.body) this.physicsWorld.removeRigidBody(entity.body);
                this.world.remove(entity);
            }
        } else {
            if (entity) {
                if (entity.body) this.physicsWorld.removeRigidBody(entity.body);
                this.world.remove(entity);
            }
        }
        
        this.playerDbIds.delete(client.sessionId);
        if (!dbId && this.state.players.has(client.sessionId)) {
             this.state.players.delete(client.sessionId);
        }
    }
}
