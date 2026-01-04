import RAPIER from "@dimforge/rapier2d-compat";
import { ECSWorld } from "../../shared/ecs/world";
import { CONFIG } from "../../shared/Config";
import { GameState, Player } from "../../shared/SchemaDef";
import { Entity } from "../../shared/ecs/components";
import { MapSchema } from "@colyseus/schema";

export class SpawnManager {
    private world: ECSWorld;
    private physicsWorld: RAPIER.World;
    private state: GameState;
    private entities: Map<string, Entity>;
    private readonly MAX_ECHOES = 50;

    constructor(world: ECSWorld, physicsWorld: RAPIER.World, state: GameState, entities: Map<string, Entity>) {
        this.world = world;
        this.physicsWorld = physicsWorld;
        this.state = state;
        this.entities = entities;
    }

    private enforceEchoLimit() {
        const echoKeys: string[] = [];
        this.state.players.forEach((player, key) => {
            if (key.startsWith("echo_")) {
                echoKeys.push(key);
            }
        });

        if (echoKeys.length >= this.MAX_ECHOES) {
            // Remove the oldest (first in list usually, or just random)
            // To be safe, remove enough to make room.
            const toRemoveCount = echoKeys.length - this.MAX_ECHOES + 1;
            
            for (let i = 0; i < toRemoveCount; i++) {
                const keyToRemove = echoKeys[i];
                const entity = this.entities.get(keyToRemove);
                
                if (entity) {
                    if (entity.body) {
                        this.physicsWorld.removeRigidBody(entity.body);
                    }
                    this.world.remove(entity);
                    this.entities.delete(keyToRemove);
                }
                
                this.state.players.delete(keyToRemove);
                console.log(`[SPAWN] Echo Limit Reached. Removed ${keyToRemove}`);
            }
        }
    }

    public spawnEchoes(count: number, centerPos: { x: number, y: number }) {
        console.log(`[SPAWN] Populating world with ${count} Echoes...`);
        const skins = ["player_idle", "player_red", "player_blue"];
        
        for (let i = 1; i <= count; i++) {
            this.enforceEchoLimit(); // Ensure room for each new one
            
            const id = `echo_bot_${Date.now()}_${i}`; // Unique ID
            const skin = skins[Math.floor(Math.random() * skins.length)];
            
            // Random scatter around spawn
            const x = centerPos.x + (Math.random() * 200 - 100);
            const y = centerPos.y + (Math.random() * 200 - 100);
            
            this.createEchoEntity(id, x, y, skin, `Student_${i}`);
        }
        console.log(`[SPAWN] Population complete.`);
    }

    public createEchoEntity(id: string, x: number, y: number, skin: string, username: string) {
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
                timer: Math.random() * 2,
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
        
        // 3. Create Schema State
        const playerState = new Player();
        playerState.id = id;
        playerState.username = username;
        playerState.x = x;
        playerState.y = y;
        playerState.skin = skin;
        playerState.hp = 100;
        playerState.maxHp = 100;
        
        this.state.players.set(id, playerState);
    }

    public convertToEcho(clientSessionId: string, dbId: number, entity: Entity) {
        if (!entity.body) return;

        this.enforceEchoLimit();

        const pos = entity.body.translation();
        const echoId = `echo_${dbId}_${Date.now()}`; // Ensure uniqueness
        
        console.log(`[SPAWN] Converting player ${clientSessionId} to Echo ${echoId}`);

        // Remove from entities map (old session key)
        this.entities.delete(clientSessionId);
        
        // Add AI Component
        entity.ai = {
            state: 'patrol',
            timer: 0,
            home: pos // Patrol around where they left
        };
        
        // Reset Input
        entity.input = { left: false, right: false, up: false, down: false };
        
        // Update Schema
        const oldPlayerState = this.state.players.get(clientSessionId);
        if (oldPlayerState) {
            const echoState = oldPlayerState.clone();
            echoState.username = `Echo of ${echoState.username}`;
            echoState.id = echoId; 
            
            this.state.players.set(echoId, echoState);
            this.state.players.delete(clientSessionId);
            
            // Update Entity Map
            if (entity.player) entity.player.sessionId = echoId;
            this.entities.set(echoId, entity);
            
            // Update Physics UserData
            entity.body.userData = { sessionId: echoId };
        }
    }
}
