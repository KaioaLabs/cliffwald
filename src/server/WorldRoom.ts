import { Room, Client } from "colyseus";
import { GameState, Player } from "../shared/SchemaDef";
import { CONFIG } from "../shared/Config";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { world } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
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

        this.onMessage("move", (client, input) => {
            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input && input) {
                // Input Sanitation: Force boolean cast
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;
            }
        });

        // Latency Check
        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.setSimulationInterval((dt) => {
            // 1. Run ECS Systems
            MovementSystem();

            // 2. Step Physics
            this.physicsWorld.step();
            
            // 3. Sync ECS to Colyseus State
            this.entities.forEach((entity, sessionId) => {
                const playerState = this.state.players.get(sessionId);
                if (playerState && entity.body) {
                    const pos = entity.body.translation();
                    playerState.x = pos.x;
                    playerState.y = pos.y;
                }
            });
        }, 1000 / CONFIG.SERVER_FPS);
    }

    async onJoin(client: Client, options: any) {
        console.log(`[SERVER] Player ${client.sessionId} joined!`);
        
        // 1. Auth / DB Load
        const username = options.username || `Guest_${client.sessionId}`;
        
        // Upsert User (Create if new, get if exists)
        // Note: In a real app, use findUnique + create with password check.
        // For Phase 1, we just sync by username.
        let user = await db.user.findUnique({ where: { username } });
        if (!user) {
            user = await db.user.create({
                data: {
                    username,
                    password: "default_password", // Placeholder
                    player: {
                        create: {
                            x: this.spawnPos.x + (Math.random() * 20 - 10),
                            y: this.spawnPos.y + (Math.random() * 20 - 10)
                        }
                    }
                },
                include: { player: true } // Return the created player
            });
        }

        // If user existed, ensure they have a player record
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

        // Store Mapping
        this.playerDbIds.set(client.sessionId, dbPlayer.id);

        // 2. Init State
        const playerState = new Player();
        playerState.id = client.sessionId;
        playerState.x = dbPlayer.x;
        playerState.y = dbPlayer.y;

        console.log(`[SERVER] Loaded ${username} at ${playerState.x}, ${playerState.y}`);

        // Create Physics Body
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
            .setTranslation(playerState.x, playerState.y);
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld.createCollider(colliderDesc, body);

        // Create ECS Entity
        const entity = world.add({
            body: body,
            input: { left: false, right: false, up: false, down: false },
            player: { sessionId: client.sessionId }
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
                        y: pos.y
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