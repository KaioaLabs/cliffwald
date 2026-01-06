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
        const houses: ('ignis' | 'axiom' | 'vesper')[] = ['ignis', 'axiom', 'vesper'];
        console.log(`[SPAWN] Initializing magic school with 24 Fixed Student Slots (8 per house)...`);
        
        let globalIdCounter = 1;
        const TILE_SIZE = 32;

        houses.forEach(house => {
            let dormPos = CONFIG.SCHOOL_LOCATIONS.DORM_IGNIS;
            if (house === 'axiom') dormPos = CONFIG.SCHOOL_LOCATIONS.DORM_AXIOM;
            if (house === 'vesper') dormPos = CONFIG.SCHOOL_LOCATIONS.DORM_VESPER;

            for (let i = 1; i <= 8; i++) {
                const id = `student_${house}_${i}`;
                const numericId = globalIdCounter++;
                const studentIndex = i - 1; // 0-7
                const skin = house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle");
                
                // FIXED BED POSITION (Row of 8 beds)
                const x = dormPos.x + (studentIndex - 3.5) * (TILE_SIZE * 2); 
                const y = dormPos.y;
                
                this.createEchoEntity(id, x, y, skin, `${house.charAt(0).toUpperCase() + house.slice(1)} Student ${i}`, house, numericId);
            }
        });
        
        this.spawnTeachers();
        console.log(`[SPAWN] Population complete.`);
    }

    public spawnTeachers() {
        const teachers = [
            { x: 1584, y: 1250, name: "Professor Hecate", skin: "teacher" }, // Classroom
            { x: 1600, y: 1600, name: "Headmaster Aris", skin: "teacher" },  // Hallway
            { x: 1300, y: 1300, name: "Caretaker Filch", skin: "teacher" },  // Courtyard Entry
            { x: 600,  y: 1000, name: "Matron Pomfrey", skin: "teacher" },   // Dorms
            { x: 1600, y: 2880, name: "Baba Yaga", skin: "teacher" }         // Forest Witch
        ];

        teachers.forEach((t, i) => {
            const id = `teacher_${i}`;
            // Create teacher entity
            this.createEchoEntity(id, t.x, t.y, t.skin, t.name, 'ignis', undefined);
            
            // Override AI to stay put (Static NPCs for now)
            const entity = this.entities.get(id);
            if (entity && entity.ai) {
                entity.ai.routineSpots = undefined; 
                entity.ai.home = { x: t.x, y: t.y };
                entity.ai.state = 'idle';
                
                // Customization for Baba Yaga
                if (t.name === "Baba Yaga") {
                    // We can't set tint here (it's server), but the name will show.
                }
            }
        });
    }

    public createEchoEntity(id: string, x: number, y: number, skin: string, username: string, house?: 'ignis' | 'axiom' | 'vesper', numericId?: number) {
        const TILE_SIZE = 32;
        const studentIndex = (numericId !== undefined) ? ((numericId - 1) % 8) : 0;

        // PRE-ESTABLISH FIXED SPOTS
        const eatPos = {
            x: CONFIG.SCHOOL_LOCATIONS.GREAT_HALL.x + (studentIndex - 3.5) * TILE_SIZE,
            y: CONFIG.SCHOOL_LOCATIONS.GREAT_HALL.y + (house === 'ignis' ? -64 : (house === 'vesper' ? 64 : 0))
        };

        // CALCULATE CLASS SEAT POSITION (Fixed Desks from Map)
        // 12 Tables (3 rows x 4 cols). 2 Seats per table. Total 24 seats.
        // Table Start: (1440, 1312). Spacing: 96x, 64y.
        const seatId = (numericId !== undefined) ? (numericId - 1) : Math.floor(Math.random() * 24);
        const seatRow = Math.floor((seatId % 24) / 8); // 0..2
        const seatCol = Math.floor(((seatId % 24) % 8) / 2); // 0..3
        const seatSide = seatId % 2; // 0 (Left), 1 (Right)

        const tableX = 1440 + (seatCol * 96);
        const tableY = 1312 + (seatRow * 64);
        
        const classPos = {
            x: tableX + 16 + (seatSide * 32),
            y: tableY + 40 // +40 places them "below" the table (higher Y), looking UP at it.
        };

        const sleepPos = {
            x: x, // Their spawn position in dorm is their "bed"
            y: y
        };

        // 1. Create Physics (DYNAMIC for authoritative collisions)
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y)
            .setLinearDamping(10.0) // Prevents sliding
            .lockRotations(); // Keeps sprites upright
        
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        body.userData = { sessionId: id };
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld.createCollider(colliderDesc, body);
        
        // 2. Create ECS Entity
        const entity = this.world.add({
            id: numericId,
            body: body,
            input: { left: false, right: false, up: false, down: false },
            facing: { x: 0, y: 1 },
            player: { sessionId: id },
            ai: {
                state: 'idle',
                timer: Math.random() * 2,
                home: { x, y },
                house: house,
                routineSpots: {
                    sleep: sleepPos,
                    class: classPos,
                    eat: eatPos
                }
            }
        });
        this.entities.set(id, entity);
        
        // 3. Create Schema State
        const playerState = new Player();
        playerState.id = id;
        playerState.username = username;
        playerState.x = x;
        playerState.y = y;
        playerState.skin = skin;
        playerState.house = house || 'ignis';
        
        this.state.players.set(id, playerState);
    }

    public convertToEcho(clientSessionId: string, dbId: number, entity: Entity) {
        if (!entity.body) return;

        this.enforceEchoLimit();

        const pos = entity.body.translation();
        const echoId = `echo_${dbId}_${Date.now()}`;
        
        console.log(`[SPAWN] Converting player ${clientSessionId} to Echo ${echoId}`);

        // Random house for players until we have it in DB
        const houses: ('ignis' | 'axiom' | 'vesper')[] = ['ignis', 'axiom', 'vesper'];
        const house = houses[Math.floor(Math.random() * houses.length)];

        // Remove from entities map (old session key)
        this.entities.delete(clientSessionId);
        
        // Add AI Component
        entity.ai = {
            state: 'idle',
            timer: 0,
            home: pos,
            house: house
        };
        
        // Reset Input
        entity.input = { left: false, right: false, up: false, down: false };
        
        // Update Schema
        const oldPlayerState = this.state.players.get(clientSessionId);
        if (oldPlayerState) {
            const echoState = oldPlayerState.clone();
            echoState.username = `Echo of ${echoState.username}`;
            echoState.id = echoId; 
            echoState.house = house;
            
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
