import RAPIER from "@dimforge/rapier2d-compat";
import { ECSWorld } from "../../shared/ecs/world";
import { CONFIG } from "../../shared/Config";
import { GameState, Player, InventoryItem } from "../../shared/SchemaDef";
import { Entity } from "../../shared/ecs/components";
import { MapData, parseSeats, parseNPCs } from "../../shared/MapParser";
import { LevelRegistry } from "./LevelRegistry";

export interface CharacterSpawnData {
    id: string; // SessionId or EchoId
    numericId?: number;
    username: string;
    skin: string;
    house: 'ignis' | 'axiom' | 'vesper';
    x: number;
    y: number;
    // Optional stats
    prestige?: number;
    gold?: number;
    xp?: number;
    academicPoints?: number;
    unconsciousUntil?: number;
    inventory?: InventoryItem[];
    // AI Config
    isAI: boolean;
    routineSpots?: any; 
    originalEchoId?: string; // To track which slot was taken
}

export class SpawnManager {
    private world: ECSWorld;
    private physicsWorld: RAPIER.World;
    private state: GameState;
    private entities: Map<string, Entity>;
    private readonly MAX_ECHOES = 50;

    // Track "Souls" of possessed echoes
    private possessedSlots = new Map<string, { numericId: number, routineSpots: any, house: string, originalId: string }>();

    public seats = {
        bed: new Map<number, {x: number, y: number}>(),
        class: new Map<number, {x: number, y: number}>(),
        food: new Map<number, {x: number, y: number}>()
    };

    private prefectIds = new Set<string>();

    constructor(world: ECSWorld, physicsWorld: RAPIER.World, state: GameState, entities: Map<string, Entity>) {
        this.world = world;
        this.physicsWorld = physicsWorld;
        this.state = state;
        this.entities = entities;
    }

    // --- CORE FACTORY ---
    public spawnCharacter(data: CharacterSpawnData): Entity {
        console.log(`[DEBUG-SPAWN-CHAR] Spawning ${data.id} with Name: ${data.username}`);
        // Cleanup existing
        if (this.entities.has(data.id)) {
            this.removeEntity(data.id);
        }

        // Physics
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(data.x, data.y)
            .setLinearDamping(10.0)
            .lockRotations();
        
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        body.userData = { sessionId: data.id };
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld.createCollider(colliderDesc, body);

        // ECS
        let archetype: 'ACHIEVER' | 'SOCIALIZER' | 'EXPLORER' | 'KILLER' = 'SOCIALIZER';
        if (data.isAI) {
            const rand = Math.random();
            if (rand < 0.25) archetype = 'ACHIEVER';
            else if (rand < 0.50) archetype = 'SOCIALIZER';
            else if (rand < 0.75) archetype = 'EXPLORER';
            else archetype = 'KILLER';
        }

        const entity = this.world.add({
            id: data.numericId || 0,
            body: body,
            input: { left: false, right: false, up: false, down: false },
            facing: { x: 0, y: 1 },
            player: { sessionId: data.id },
            ai: data.isAI ? {
                state: 'idle',
                timer: Math.random() * 2000,
                home: { x: data.x, y: data.y },
                house: data.house as any,
                routineSpots: data.routineSpots,
                archetype: archetype,
                reactionDelay: archetype === 'ACHIEVER' ? 50 : 500
            } : undefined
        });

        // Store metadata if Player (to restore later)
        if (!data.isAI && data.originalEchoId) {
            this.possessedSlots.set(data.id, {
                numericId: data.numericId || 0,
                routineSpots: data.routineSpots,
                house: data.house,
                originalId: data.originalEchoId
            });
        }

        this.entities.set(data.id, entity);

        // Schema
        const playerState = new Player();
        playerState.id = data.id;
        playerState.username = data.username;
        playerState.x = data.x;
        playerState.y = data.y;
        playerState.skin = data.skin;
        playerState.house = data.house;
        playerState.personalPrestige = data.prestige || 0;
        playerState.gold = data.gold || 0;
        playerState.xp = data.xp || 0;
        playerState.academicPoints = data.academicPoints || 0;
        playerState.unconsciousUntil = data.unconsciousUntil || 0;
        
        if (data.inventory) {
             data.inventory.forEach(item => playerState.inventory.push(item));
        }

        this.state.players.set(data.id, playerState);
        return entity;
    }

    // --- POSSESSION SYSTEM ---

    public findAvailableEcho(targetHouse?: string): { id: string, entity: Entity } | null {
        for (const [id, ent] of this.entities) {
            // Check if AI and NOT a possessed player (redundant check if map is correct)
            if (ent.ai && id.startsWith('student_')) {
                // If house matches or no preference
                if (!targetHouse || ent.ai.house === targetHouse) {
                    return { id, entity: ent };
                }
            }
        }
        return null;
    }

import { PlayerService } from "../services/PlayerService";

// ...

    public async possessEcho(echoId: string, clientSessionId: string, playerData: Partial<CharacterSpawnData>): Promise<Entity | null> {
        const echoEnt = this.entities.get(echoId);
        if (!echoEnt || !echoEnt.ai) return null;

        const pos = echoEnt.body?.translation() || { x: 300, y: 300 };
        const routineSpots = echoEnt.ai.routineSpots;
        const numericId = typeof echoEnt.id === 'number' ? echoEnt.id : 0;
        const house = echoEnt.ai.house || 'ignis';

        // 1. Remove Echo
        this.removeEntity(echoId);

        // 2. Persist Claim (DB)
        // Find player DB ID from metadata? Or passed in?
        // possessEcho receives playerData which are VISUAL/Schema stats. Not DB ID.
        // But WorldRoom calls possessEcho AFTER PlayerService.initializeSession.
        // We need to pass the DB ID to possessEcho or handle it outside.
        // Let's rely on WorldRoom saving it? 
        // No, WorldRoom doesn't know the echoId unless we return it or save it here.
        // Better: possessEcho logic is strictly ECS. The DB link should be in WorldRoom.
        
        // However, I need to return the entity to WorldRoom so it can set metadata.
        
        console.log(`[SPAWN] Player ${playerData.username} possessing ${echoId}`);
        return this.spawnCharacter({
            id: clientSessionId,
            numericId: numericId,
            // ...
            username: playerData.username || "Unknown",
            skin: playerData.skin || "player_idle",
            house: house as any,
            x: pos.x,
            y: pos.y,
            prestige: playerData.prestige,
            gold: playerData.gold,
            xp: playerData.xp,
            academicPoints: playerData.academicPoints,
            unconsciousUntil: playerData.unconsciousUntil,
            inventory: playerData.inventory,
            isAI: false,
            routineSpots: routineSpots,
            originalEchoId: echoId
        });
    }

    // ...

    public async spawnEchoes(count: number, centerPos: { x: number, y: number }) {
        const echoMap = await PlayerService.getEchoMap();
        console.log(`[SPAWN] Loaded ${echoMap.size} persistent Echo identities.`);

        const houses: ('ignis' | 'axiom' | 'vesper')[] = ['ignis', 'axiom', 'vesper'];
        let globalIdCounter = 1;
        const TILE_SIZE = 32;

        houses.forEach(house => {
            const registry = LevelRegistry.getInstance();
            let dormPos = registry.getLocation(`DORM_${house.toUpperCase()}`) || registry.getLocation("DORM_IGNIS");

            const studentsPerHouse = Math.floor(count / 3);
            for (let i = 1; i <= studentsPerHouse; i++) {
                const id = `student_${house}_${i}`;
                const numericId = globalIdCounter++;
                const studentIndex = i - 1;
                const seatId = numericId - 1;

                // PERSISTENCE CHECK
                const persistentData = echoMap.get(id);
                let username = `${house.charAt(0).toUpperCase() + house.slice(1)} Student ${i}`;
                let skin = house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle");
                let prestige = 0;

                if (persistentData) {
                    username = persistentData.username;
                    skin = persistentData.skin;
                    prestige = persistentData.prestige;
                    // console.log(`[SPAWN] Restoring ${id} as ${username}`);
                }
                
                // Calculate Spots (Anchors)
                let sleepPos = registry.getAnchor(`seat_bed_${seatId}`);
                if (!sleepPos) {
                    const bedRow = Math.floor(studentIndex / 4);
                    const bedCol = studentIndex % 4;
                    sleepPos = {
                        x: dormPos.x + (bedCol * TILE_SIZE * 2),
                        y: dormPos.y + (bedRow * TILE_SIZE * 3) + 20
                    };
                }

                let eatPos = registry.getAnchor(`seat_food_${seatId}`);
                if (!eatPos) {
                    const gh = registry.getLocation("GREAT_HALL");
                    let tableOffsetY = house === 'ignis' ? -80 : (house === 'vesper' ? 80 : 0);
                    const tableRow = Math.floor(studentIndex / 4); 
                    const tableCol = studentIndex % 4; 
                    eatPos = {
                        x: gh.x + (tableCol * 64) - 96, 
                        y: gh.y + tableOffsetY + (tableRow === 0 ? -40 : 40)
                    };
                }

                let classPos = registry.getAnchor(`seat_class_${seatId}`);
                if (!classPos) {
                    classPos = this.seats.class.get(seatId) || { x: 1440, y: 1312 };
                }

                this.spawnCharacter({
                    id: id,
                    numericId: numericId,
                    username: username,
                    skin: skin,
                    house: house,
                    x: sleepPos.x,
                    y: sleepPos.y,
                    isAI: true,
                    prestige: prestige,
                    routineSpots: { sleep: sleepPos, eat: eatPos, class: classPos }
                });
            }
        });
    }

    public spawnFromMap(mapData: MapData) {
        // --- SINGLE TEACHER (24/7) ---
        const registry = LevelRegistry.getInstance();
        
        // Try to find anchor or fallback to Classroom center
        let teacherPos = registry.getAnchor("spot_teacher_class");
        
        if (!teacherPos) {
            const classroom = registry.getLocation("ACADEMIC_WING");
            if (classroom && classroom.id !== "MISSING") {
                teacherPos = { x: classroom.x, y: classroom.y };
            } else {
                teacherPos = { x: 1440, y: 1312 }; // Hard Fallback
            }
        }

        this.spawnCharacter({
             id: "npc_professor_merlin",
             username: "Professor Merlin",
             skin: "teacher",
             house: 'ignis',
             x: teacherPos.x,
             y: teacherPos.y,
             isAI: true,
             numericId: 9000
        });
        
        console.log("[SPAWN] Single Teacher 'Professor Merlin' spawned.");
    }
}