import RAPIER from "@dimforge/rapier2d-compat";
import { ECSWorld } from "../../shared/ecs/world";
import { CONFIG } from "../../shared/Config";
import { GameState, Player, InventoryItem } from "../../shared/SchemaDef";
import { Entity } from "../../shared/ecs/components";
import { MapData, parseSeats, parseNPCs } from "../../shared/MapParser";
import { LevelRegistry } from "./LevelRegistry";
import { PlayerService } from "../services/PlayerService";
import { StudentData } from "../../shared/data/StudentData";
import { NPC_DATA } from "../../shared/data/NPCRegistry";

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
    private claimedEchoIds = new Set<string>();

    public seats = {
        bed: new Map<number, {x: number, y: number}>(),
        class: new Map<number, {x: number, y: number}>(),
        food: new Map<number, {x: number, y: number}>()
    };

    private prefectIds = new Set<string>();
    private spawnPoint: {x: number, y: number} = {x: 300, y: 300}; // Default

    constructor(world: ECSWorld, physicsWorld: RAPIER.World, state: GameState, entities: Map<string, Entity>) {
        this.world = world;
        this.physicsWorld = physicsWorld;
        this.state = state;
        this.entities = entities;
    }

    public getSpawnPoint() { return this.spawnPoint; }

    // --- CORE FACTORY ---
    public spawnCharacter(data: CharacterSpawnData): Entity {
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
        // Priority 1: Unclaimed Echos
        for (const [id, ent] of this.entities) {
            if (ent.ai && id.startsWith('student_') && !this.claimedEchoIds.has(id)) {
                if (!targetHouse || ent.ai.house === targetHouse) {
                    return { id, entity: ent };
                }
            }
        }

        // Priority 2: Claimed Echos (Body Snatching)
        console.warn(`[SPAWN] No free slots for ${targetHouse}. Attempting to snatch a body...`);
        for (const [id, ent] of this.entities) {
            if (ent.ai && id.startsWith('student_')) {
                // Must matches house
                if (!targetHouse || ent.ai.house === targetHouse) {
                    return { id, entity: ent };
                }
            }
        }

        return null;
    }

    public async possessEcho(
        echoId: string, 
        clientSessionId: string, 
        playerData: Partial<CharacterSpawnData>,
        overridePos?: { x: number, y: number }
    ): Promise<Entity | null> {
        const echoEnt = this.entities.get(echoId);
        if (!echoEnt || !echoEnt.ai) return null;

        const echoPos = echoEnt.body?.translation() || { x: 300, y: 300 };
        const finalPos = overridePos || echoPos;

        const routineSpots = echoEnt.ai.routineSpots;
        const numericId = typeof echoEnt.id === 'number' ? echoEnt.id : 0;
        const house = echoEnt.ai.house || 'ignis';

        // 1. Remove Echo
        this.removeEntity(echoId);

        // 2. Mark as claimed in memory
        this.claimedEchoIds.add(echoId);

        // 3. Spawn Player
        console.log(`[SPAWN] Player ${playerData.username} possessing ${echoId} at ${Math.round(finalPos.x)},${Math.round(finalPos.y)}`);
        return this.spawnCharacter({
            id: clientSessionId,
            numericId: numericId,
            username: playerData.username || "Unknown",
            skin: playerData.skin || "player_idle",
            house: house as any,
            x: finalPos.x,
            y: finalPos.y,
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

    public async spawnEchoes(count: number, centerPos: { x: number, y: number }) {
        const echoMap = await PlayerService.getEchoMap();
        this.claimedEchoIds.clear();
        echoMap.forEach((_, id) => this.claimedEchoIds.add(id));
        
        console.log(`[SPAWN] Loaded ${echoMap.size} persistent Echo identities.`);

        const students = StudentData.getAll();
        const TILE_SIZE = 32;

        students.forEach(student => {
            const id = `student_${student.house}_${student.id}`;
            const numericId = student.id;
            const seatId = student.id - 1; // 0-based index for map anchors

            // PERSISTENCE CHECK
            const persistentData = echoMap.get(id);
            
            let username = student.name;
            let skin = student.skin;
            let prestige = 0;

            if (persistentData) {
                username = persistentData.username;
                skin = persistentData.skin;
                prestige = persistentData.prestige;
            }
            
            // Calculate Spots (Anchors) with Facing
            const registry = LevelRegistry.getInstance();
            let dormPos = registry.getLocation(`DORM_${student.house.toUpperCase()}`) || registry.getLocation("DORM_IGNIS");

            // Calculate Grid Position relative to house peers
            const housePeers = StudentData.getByHouse(student.house);
            const studentIndex = housePeers.findIndex(s => s.id === student.id); 

            let sleepPos = registry.getAnchor(`seat_bed_${seatId}`);
            const sleepFacing = { x: 0, y: -1 }; // Look at headboard
            if (!sleepPos) {
                const bedRow = Math.floor(studentIndex / 4);
                const bedCol = studentIndex % 4;
                sleepPos = {
                    x: dormPos.x + (bedCol * TILE_SIZE * 2),
                    y: dormPos.y + (bedRow * TILE_SIZE * 3) + 20
                };
            }

            let eatPos = registry.getAnchor(`seat_food_${seatId}`);
            let eatFacing = { x: 0, y: 1 }; // Default down
            if (!eatPos) {
                const gh = registry.getLocation("GREAT_HALL");
                let tableOffsetY = student.house === 'ignis' ? -80 : (student.house === 'vesper' ? 80 : 0);
                const tableRow = Math.floor(studentIndex / 4); 
                const tableCol = studentIndex % 4; 
                
                // Facing: If row 0, look DOWN at table. If row 1, look UP.
                eatFacing = tableRow === 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
                
                eatPos = {
                    x: gh.x + (tableCol * 64) - 96, 
                    y: gh.y + tableOffsetY + (tableRow === 0 ? -40 : 40)
                };
            }

            let classPos = registry.getAnchor(`seat_class_${seatId}`);
            const classFacing = { x: 0, y: -1 }; // Look at teacher
            if (!classPos) {
                classPos = this.seats.class.get(seatId) || { x: 1440, y: 1312 };
            }

            this.spawnCharacter({
                id: id,
                numericId: numericId,
                username: username,
                skin: skin,
                house: student.house,
                x: sleepPos.x,
                y: sleepPos.y,
                isAI: true,
                prestige: prestige,
                routineSpots: { 
                    sleep: { ...sleepPos, facing: sleepFacing }, 
                    eat: { ...eatPos, facing: eatFacing }, 
                    class: { ...classPos, facing: classFacing } 
                }
            });
        });
    }

    public spawnFromMap(mapData: MapData) {
        const npcObjects = parseNPCs(mapData);
        let npcCounter = 9000;

        npcObjects.forEach(obj => {
            const name = obj.name; // This is the key "Professor Hecate"
            const def = NPC_DATA[name];

            if (def) {
                console.log(`[SPAWN] Found NPC Definition for: ${name}`);
                this.spawnCharacter({
                    id: `npc_${name.replace(/\s+/g, '_').toLowerCase()}`,
                    username: def.name,
                    skin: def.skin,
                    house: 'ignis', // Default, doesn't matter much for teachers
                    x: obj.x,
                    y: obj.y,
                    isAI: true,
                    numericId: npcCounter++
                });
            } else {
                console.warn(`[SPAWN] Unknown NPC in map: ${name}`);
            }
        });
        
        // Check for Anchors if needed
        const registry = LevelRegistry.getInstance();
        const merlinAnchor = registry.getAnchor("anchor_teacher_merlin");
        if (merlinAnchor) {
             const def = NPC_DATA["Professor Merlin"];
             if (def) {
                 this.spawnCharacter({
                    id: "npc_professor_merlin",
                    username: def.name,
                    skin: def.skin,
                    house: 'ignis',
                    x: merlinAnchor.x,
                    y: merlinAnchor.y,
                    isAI: true,
                    numericId: npcCounter++
                });
             }
        }
    }

    public restoreEcho(clientSessionId: string, finalState?: Player) {
        const slotData = this.possessedSlots.get(clientSessionId);
        const entity = this.entities.get(clientSessionId);
        
        const pos = entity?.body?.translation() || { x: 300, y: 300 };
        const house = slotData?.house || 'ignis';
        const originalId = slotData?.originalId || `student_${house}_${Date.now()}`;
        const numericId = slotData?.numericId;
        const routineSpots = slotData?.routineSpots;

        this.removeEntity(clientSessionId);
        this.possessedSlots.delete(clientSessionId);

        const echoName = finalState?.username || `${house.charAt(0).toUpperCase() + house.slice(1)} Student`;
        
        console.log(`[SPAWN] Restoring Echo ${originalId} (${echoName}) at ${pos.x}, ${pos.y}`);
        this.spawnCharacter({
            id: originalId,
            numericId: numericId,
            username: echoName,
            skin: house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle"),
            house: house as any,
            x: pos.x,
            y: pos.y,
            isAI: true,
            routineSpots: routineSpots,
            prestige: finalState?.personalPrestige || 0
        });
    }

    public removeEntity(id: string) {
        const entity = this.entities.get(id);
        if (entity) {
            if (entity.body) this.physicsWorld.removeRigidBody(entity.body);
            this.world.remove(entity);
            this.entities.delete(id);
        }
        this.state.players.delete(id);
    }

    public checkPrefectSpawns(isNight: boolean) {
        if (isNight && this.prefectIds.size === 0) {
            this.spawnPrefects();
        } else if (!isNight && this.prefectIds.size > 0) {
            this.despawnPrefects();
        }
    }

    private spawnPrefects() {
        console.log("[SPAWN] Night has fallen. Spawning Hallway Prefect...");
        const registry = LevelRegistry.getInstance();
        const hallwayPos = registry.getLocation("ACADEMIC_WING") || { x: 1600, y: 1600 };
        
        const id = `prefect_hallway`;
        this.spawnCharacter({
            id: id,
            numericId: 1000,
            username: "Hallway Prefect",
            skin: "player_idle",
            house: "ignis",
            x: hallwayPos.x,
            y: hallwayPos.y,
            isAI: true
        });
        this.prefectIds.add(id);
    }

    private despawnPrefects() {
        this.prefectIds.forEach(id => this.removeEntity(id));
        this.prefectIds.clear();
    }

    public loadSeats(mapData: MapData) {
        this.seats = parseSeats(mapData);
        
        // Parse Spawn Point
        const entitiesLayer = mapData.layers.find(l => l.name === "Entities");
        if (entitiesLayer && entitiesLayer.objects) {
            const sp = entitiesLayer.objects.find(o => o.name === "Spawn");
            if (sp) {
                this.spawnPoint = { x: sp.x, y: sp.y };
                console.log(`[SPAWN] Global Spawn Point set to: ${sp.x}, ${sp.y}`);
            }
        }
    }
}
