import { Room, Client } from "colyseus";
import { GameState, Player, InventoryItem } from "../shared/SchemaDef";
import { CONFIG } from "../shared/Config";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { world } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { CombatSystem } from "../shared/systems/CombatSystem";
import { AISystem } from "../shared/systems/AISystem";
import { Entity } from "../shared/ecs/components";
import * as fs from "fs";
import { db } from "./db";

export class WorldRoom extends Room<GameState> {
    private physicsWorld!: RAPIER.World;
    private entities: Map<string, Entity> = new Map();
    private playerDbIds: Map<string, number> = new Map(); // Maps sessionId to DB Player ID
    private spawnPos = CONFIG.SPAWN_POINT;

    async onCreate() {
        await RAPIER.init();
        this.setState(new GameState());

        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
        this.physicsWorld.timestep = 1 / CONFIG.SERVER_FPS;
        
        const mapData = JSON.parse(fs.readFileSync("assets/maps/world.json", 'utf-8'));
        const physicsData = buildPhysics(this.physicsWorld, mapData);
        if (physicsData.spawnPos) {
            this.spawnPos = physicsData.spawnPos;
        }

        // Spawn Test NPC
        const npcBodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
             .setTranslation(this.spawnPos.x + 40, this.spawnPos.y);
        const npcBody = this.physicsWorld.createRigidBody(npcBodyDesc);
        npcBody.userData = { sessionId: "NPC_1" };
        this.physicsWorld.createCollider(RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS), npcBody);
        
        const npcEntity = world.add({
            body: npcBody,
            input: { left: false, right: false, up: false, down: false, attack: false },
            stats: { hp: 50, maxHp: 50, speed: 2 },
            ai: { state: 'idle', lastStateChange: Date.now() },
            player: { sessionId: "NPC_1" },
            combat: { cooldown: 0, range: 20, damage: 5 },
            facing: { x: 0, y: 1 }
        });
        this.entities.set("NPC_1", npcEntity);
        
        const npcState = new Player();
        npcState.id = "NPC_1";
        npcState.x = this.spawnPos.x + 40;
        npcState.y = this.spawnPos.y;
        npcState.hp = 50;
        npcState.maxHp = 50;
        this.state.players.set("NPC_1", npcState);

        this.onMessage("move", (client, input) => {
            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input && input) {
                // Input Sanitation: Force boolean cast
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;
                entity.input.attack = !!input.attack;
            }
        });

        // Latency Check
        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.setSimulationInterval((dt) => {
            const dtSeconds = dt / 1000;

            // 1. Run ECS Systems
            MovementSystem();
            AISystem(dtSeconds);
            CombatSystem(dtSeconds, this.physicsWorld, this.entities);
            // InventorySystem(); // TODO: Implement if logic needed (auto-heal etc)

            // 2. Step Physics
            this.physicsWorld.step();
            
            // 3. Sync ECS to Colyseus State
            this.entities.forEach((entity, sessionId) => {
                const playerState = this.state.players.get(sessionId);
                if (playerState) {
                    // Position Sync
                    if (entity.body) {
                        const pos = entity.body.translation();
                        playerState.x = pos.x;
                        playerState.y = pos.y;
                    }
                    
                    // Stats Sync
                    if (entity.stats) {
                        playerState.hp = entity.stats.hp;
                        playerState.maxHp = entity.stats.maxHp;
                    }

                    // Inventory Sync
                    if (entity.inventory) {
                        // Remove excess
                        while (playerState.inventory.length > entity.inventory.items.length) {
                            playerState.inventory.pop();
                        }
                        // Update/Add
                        entity.inventory.items.forEach((item, idx) => {
                            if (idx < playerState.inventory.length) {
                                const current = playerState.inventory[idx];
                                if (current.itemId !== item.itemId || current.count !== item.count) {
                                    current.itemId = item.itemId;
                                    current.count = item.count;
                                }
                            } else {
                                const newItem = new InventoryItem();
                                newItem.itemId = item.itemId;
                                newItem.count = item.count;
                                playerState.inventory.push(newItem);
                            }
                        });
                    }
                }
            });
        }, 1000 / CONFIG.SERVER_FPS);
    }

    async onJoin(client: Client, options: any) {
        console.log(`[SERVER] Player ${client.sessionId} joined!`);
        
        // 1. Auth / DB Load
        const username = options.username || `Guest_${client.sessionId}`;
        
        let user = await db.user.findUnique({ where: { username } });
        if (!user) {
            user = await db.user.create({
                data: {
                    username,
                    password: "default_password",
                    player: {
                        create: {
                            x: this.spawnPos.x + (Math.random() * 20 - 10),
                            y: this.spawnPos.y + (Math.random() * 20 - 10)
                        }
                    }
                },
                include: { player: true }
            });
        }

        let dbPlayer = await db.player.findUnique({ where: { userId: user.id } });
        if (!dbPlayer) {
             dbPlayer = await db.player.create({
                data: {
                    userId: user.id,
                    x: this.spawnPos.x,
                    y: this.spawnPos.y
                }
            });
        }

        this.playerDbIds.set(client.sessionId, dbPlayer.id);

        // 2. Init State
        const playerState = new Player();
        playerState.id = client.sessionId;
        playerState.x = dbPlayer.x;
        playerState.y = dbPlayer.y;
        
        // Load stats from DB
        playerState.hp = dbPlayer.health;
        playerState.maxHp = dbPlayer.maxHealth;

        console.log(`[SERVER] Loaded ${username} at ${playerState.x}, ${playerState.y}`);

        // Create Physics Body
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
            .setTranslation(playerState.x, playerState.y);
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        body.userData = { sessionId: client.sessionId };
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld.createCollider(colliderDesc, body);

        // Create ECS Entity
        const entity = world.add({
            body: body,
            input: { left: false, right: false, up: false, down: false, attack: false },
            facing: { x: 0, y: 1 },
            player: { sessionId: client.sessionId },
            stats: { hp: dbPlayer.health, maxHp: dbPlayer.maxHealth, speed: 5 },
            combat: { cooldown: 0, range: 30, damage: 10 },
            inventory: { 
                items: [ 
                    { itemId: "sword_wood", count: 1 }, 
                    { itemId: "potion_hp", count: 3 } 
                ], 
                capacity: 10 
            }
        });

        this.entities.set(client.sessionId, entity);
        this.state.players.set(client.sessionId, playerState);
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const dbId = this.playerDbIds.get(client.sessionId);

        // Save Position
        if (entity && entity.body && dbId) {
            const pos = entity.body.translation();
            try {
                await db.player.update({
                    where: { id: dbId },
                    data: {
                        x: pos.x,
                        y: pos.y,
                        health: entity.stats ? entity.stats.hp : 100
                    }
                });
                console.log(`[SERVER] Saved position for player DB-ID ${dbId}`);
            } catch (e) {
                console.error(`[SERVER] Failed to save player ${dbId}:`, e);
            }
        }

        if (entity) {
            if (entity.body) this.physicsWorld.removeRigidBody(entity.body);
            world.remove(entity);
            this.entities.delete(client.sessionId);
        }
        this.playerDbIds.delete(client.sessionId);
        this.state.players.delete(client.sessionId);
    }
}