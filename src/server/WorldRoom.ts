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
import * as fs from "fs/promises";
import { db } from "./db";

export class WorldRoom extends Room<GameState> {
    physicsWorld!: RAPIER.World;
    world!: ECSWorld;
    combatSystem!: CombatSystem;
    entities = new Map<string, Entity>();
    playerDbIds = new Map<string, number>();
    spawnPos = { x: 300, y: 300 }; // CHANGED to avoid 0,0 collision

    async onAuth(client: Client, options: any, request: any) {
        if (!options.token) return false;
        const userData = AuthService.verifyToken(options.token);
        if (!userData) return false;
        return userData; // Available as client.auth
    }

    async onCreate(options: any) {
        this.setState(new GameState());

        // Initialize Time Anchor (Start at 08:00 AM)
        // We want (Now - StartTime) * Speed = 08:00 (28800s)
        // So StartTime = Now - (28800 / Speed) * 1000 (ms)
        const startOffsetMs = (28800 / CONFIG.GAME_TIME_SPEED) * 1000;
        this.state.worldStartTime = Date.now() - startOffsetMs;

        // Initialize Physics
        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);

        // Initialize ECS World
        this.world = createWorld();
        
        // Initialize Systems
        this.combatSystem = new CombatSystem(this, this.physicsWorld);

        // Load Map and build static physics
        try {
            const mapFile = await fs.readFile("./assets/maps/world.json", "utf-8");
            const mapData = JSON.parse(mapFile);
            console.log(`[SERVER] Loading Map: ${mapData.width}x${mapData.height}`);
            const result = buildPhysics(this.physicsWorld, mapData);
            this.spawnPos = result.spawnPos;
            console.log(`[SERVER] Map loaded. Spawn set to: ${this.spawnPos.x}, ${this.spawnPos.y}`);
            
            // POPULATE WORLD (19 Echoes)
            this.populateWorld(19);
            
        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        // Simulation Loop
        let logTimer = 0;
        this.setSimulationInterval((deltaTime) => {
            MovementSystem(this.world);
            AISystem(this.world, deltaTime);
            StatsSystem(this.world);
            InventorySystem(this.world);

            // Step Physics World
            this.physicsWorld.step();

            // Periodic Debug Log
            logTimer += deltaTime;
            if (logTimer > 10000) { // Every 10 seconds
                const players = Array.from(this.state.players.values());
                const realPlayers = players.filter(p => !p.id.startsWith('echo_')).length;
                const echoes = players.filter(p => p.id.startsWith('echo_')).length;
                console.log(`[SERVER STATS] Real Players: ${realPlayers} | Echoes: ${echoes}`);
                logTimer = 0;
            }

            // Sync ECS to Colyseus Schema
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

            // Update Combat (Projectiles & PvP)
            this.combatSystem.update(deltaTime);
        });

        // Messages

        // Messages
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
            if (!entity || !entity.body) return; // Ignore if player entity doesn't exist

            const pos = entity.body.translation();
            
            // Validate Velocity (Normalize to standard speed)
            const speed = 400; // Fixed projectile speed
            const mag = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
            const vx = (mag > 0) ? (data.vx / mag) * speed : speed;
            const vy = (mag > 0) ? (data.vy / mag) * speed : 0;

            const id = `proj_${client.sessionId}_${Date.now()}`;
            const proj = new Projectile();
            proj.id = id;
            proj.spellId = data.spellId;
            proj.x = pos.x; // Server authoritative position
            proj.y = pos.y;
            proj.startX = pos.x;
            proj.startY = pos.y;
            proj.vx = vx;
            proj.vy = vy;
            proj.maxRange = 600; // Default range
            proj.ownerId = client.sessionId;
            proj.creationTime = Date.now();

            this.state.projectiles.set(id, proj);

            // Time-based cleanup is now handled in the simulation loop
        });

        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.onMessage("chat", (client, text: string) => {
            const player = this.state.players.get(client.sessionId);
            if (player && text) {
                const msg = new ChatMessage();
                msg.sender = player.username;
                msg.text = text.slice(0, CONFIG.CHAT_MAX_LENGTH); // Limit length
                msg.timestamp = Date.now();
                
                this.state.messages.push(msg);
                this.broadcast("chat", msg);
                
                // Keep history manageable
                if (this.state.messages.length > CONFIG.CHAT_HISTORY_SIZE) {
                    this.state.messages.shift();
                }
                
                console.log(`[CHAT] ${msg.sender}: ${msg.text}`);
            }
        });
    }

    populateWorld(count: number) {
        console.log(`[SERVER] Populating world with ${count} Echoes...`);
        const skins = ["player_idle", "player_red", "player_blue"];
        
        for (let i = 1; i <= count; i++) {
            const id = `echo_bot_${i}`;
            const skin = skins[Math.floor(Math.random() * skins.length)];
            
            // Random scatter around spawn
            const x = this.spawnPos.x + (Math.random() * 200 - 100);
            const y = this.spawnPos.y + (Math.random() * 200 - 100);
            
            // 1. Create Physics
            const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(x, y);
            const body = this.physicsWorld.createRigidBody(bodyDesc);
            body.userData = { sessionId: id };
            const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
            this.physicsWorld.createCollider(colliderDesc, body);
            
            // 2. Create ECS Entity
            const entity = this.world.add({
                body: body,
                input: { left: false, right: false, up: false, down: false },
                facing: { x: 0, y: 1 },
                player: { sessionId: id },
                ai: {
                    state: 'patrol',
                    timer: Math.random() * 2, // Random offset to desync behavior
                    home: { x, y }
                },
                stats: {
                   hp: 100, maxHp: 100, speed: CONFIG.PLAYER_SPEED * 0.8, // Slightly slower
                   mp: 100, maxMp: 100, level: 1, exp: 0, expToNext: 100
               },
               equipment: { weapon: "sword_wood" },
               inventory: { items: [], capacity: 10 }
            });
            this.entities.set(id, entity);
            
            // 3. Create Schema State (for Client Viz)
            const playerState = new Player();
            playerState.id = id;
            playerState.username = `Student_${i}`; // "Echo" prefix added by client logic if starts with "echo_"
            playerState.x = x;
            playerState.y = y;
            playerState.skin = skin;
            playerState.hp = 100;
            playerState.maxHp = 100;
            
            this.state.players.set(id, playerState);
        }
        console.log(`[SERVER] Population complete.`);
    }

    async onJoin(client: Client, options: JoinOptions) {
        try {
            const authUser = client.auth as { userId: number, username: string };
            
            // STABILITY FIX: Kick existing sessions for the same user (Prevents zombies)
            this.clients.forEach(c => {
                if (c.auth && c.auth.userId === authUser.userId && c.sessionId !== client.sessionId) {
                    console.log(`[SERVER] Kicking old session for user ${authUser.username} (${c.sessionId})`);
                    c.leave();
                }
            });

            console.log(`[SERVER] Player ${client.sessionId} joined (Auth: ${authUser.username})`);
            
            const dbPlayer = await db.player.findUnique({
                where: { userId: authUser.userId }
            });

            if (!dbPlayer) {
                // Should technically exist if registered correctly, but handle edge case
                throw new Error("Player data not found for user");
            }

            // Update skin if requested and different
            if (options.skin && options.skin !== dbPlayer.skin) {
                 await db.player.update({
                    where: { id: dbPlayer.id },
                    data: { skin: options.skin }
                });
                dbPlayer.skin = options.skin;
            }

            this.playerDbIds.set(client.sessionId, dbPlayer.id);

            // Fetch Inventory from DB (With stability wrapper)
            let dbInventory: any[] = [];
            
            try {
                dbInventory = await db.inventoryItem.findMany({
                    where: { playerId: dbPlayer.id }
                });
            } catch (dbErr) {
                console.warn(`[SERVER] Could not fetch inventory for ${authUser.username}, starting empty.`);
            }

            const playerState = new Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            playerState.x = dbPlayer.x;
            playerState.y = dbPlayer.y;
            playerState.skin = dbPlayer.skin;
            playerState.hp = dbPlayer.health;
            playerState.maxHp = dbPlayer.maxHealth;

            // Sync DB Inventory to Colyseus State
            dbInventory.forEach(item => {
                const schemaItem = new InventoryItem();
                schemaItem.itemId = item.itemId;
                schemaItem.count = item.count;
                playerState.inventory.push(schemaItem);
            });

            console.log(`[SERVER] Loaded ${authUser.username} at ${playerState.x}, ${playerState.y}. Inventory size: ${dbInventory.length}`);

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
                   items: dbInventory.map(item => ({ itemId: item.itemId, count: item.count })),
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

        if (entity && entity.body && dbId) {
            const pos = entity.body.translation();
            
            // 1. Persist Data
            await PersistenceManager.savePlayerSession(dbId, entity);

            try {
                // 3. ECHO TRANSFORMATION
                console.log(`[SERVER] Player ${client.sessionId} disconnected. Converting to Echo.`);
                
                const echoId = `echo_${dbId}`;
                
                // Remove from entities map (old session)
                this.entities.delete(client.sessionId);
                
                // Add AI Component
                entity.ai = {
                    state: 'patrol',
                    timer: 0,
                    home: pos // Remember where they left?
                };
                
                // Remove Input (AI doesn't use player input)
                entity.input = { left: false, right: false, up: false, down: false };
                
                // Update Schema
                const oldPlayerState = this.state.players.get(client.sessionId);
                if (oldPlayerState) {
                    const echoState = oldPlayerState.clone();
                    echoState.username = `Echo of ${echoState.username}`;
                    echoState.id = echoId; 
                    
                    this.state.players.set(echoId, echoState);
                    this.state.players.delete(client.sessionId);
                    
                    // Update Entity Map
                    if (entity.player) entity.player.sessionId = echoId;
                    this.entities.set(echoId, entity);
                    
                    console.log(`[SERVER] Echo ${echoId} active.`);
                }
                
            } catch (e) {
                console.error(`[SERVER] Failed to save/echo player ${dbId}:`, e);
                // Fallback cleanup if error
                if (entity.body) this.physicsWorld.removeRigidBody(entity.body);
                this.world.remove(entity);
            }
        } else {
             // Cleanup if invalid
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
