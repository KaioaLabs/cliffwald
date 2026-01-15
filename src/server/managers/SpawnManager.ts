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

    public possessEcho(echoId: string, clientSessionId: string, playerData: Partial<CharacterSpawnData>): Entity | null {
        const echoEnt = this.entities.get(echoId);
        if (!echoEnt || !echoEnt.ai) return null;

        const pos = echoEnt.body?.translation() || { x: 300, y: 300 };
        const routineSpots = echoEnt.ai.routineSpots;
        const numericId = typeof echoEnt.id === 'number' ? echoEnt.id : 0;
        const house = echoEnt.ai.house || 'ignis';

        // 1. Remove Echo
        this.removeEntity(echoId);

        // 2. Spawn Player
        console.log(`[SPAWN] Player ${playerData.username} possessing ${echoId}`);
        return this.spawnCharacter({
            id: clientSessionId,
            numericId: numericId,
            username: playerData.username || "Unknown",
            skin: playerData.skin || "player_idle",
            house: house as any,
            x: pos.x,
            y: pos.y,
            prestige: playerData.prestige,
            gold: playerData.gold,
            xp: playerData.xp,
            academicPoints: playerData.academicPoints,
            inventory: playerData.inventory,
            isAI: false,
            routineSpots: routineSpots,
            originalEchoId: echoId
        });
    }

    public restoreEcho(clientSessionId: string, finalState?: Player) {
        // Retrieve "Soul"
        const slotData = this.possessedSlots.get(clientSessionId);
        const entity = this.entities.get(clientSessionId);
        
        // Default fallbacks
        const pos = entity?.body?.translation() || { x: 300, y: 300 };
        const house = slotData?.house || 'ignis';
        const originalId = slotData?.originalId || `student_${house}_${Date.now()}`;
        const numericId = slotData?.numericId;
        const routineSpots = slotData?.routineSpots;

        // Cleanup Player
        this.removeEntity(clientSessionId);
        this.possessedSlots.delete(clientSessionId);

        // Spawn Echo
        // NOTE: Echo inherits the stats?
        // Usually Echoes reset stats or keep simple ones.
        // For now, Echo keeps the "Prestige" it earned?
        // Let's keep the NAME of the player as a "Ghost" or reset to "Student"?
        // Original design: "Echo of [PlayerName]" if they were cool, or reset.
        // Let's reset to "Student" to keep it anonymous for now, or use original logic.
        
        console.log(`[SPAWN] Restoring Echo ${originalId} at ${pos.x}, ${pos.y}`);
        this.spawnCharacter({
            id: originalId,
            numericId: numericId,
            username: `${house.charAt(0).toUpperCase() + house.slice(1)} Student`,
            skin: house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle"),
            house: house as any,
            x: pos.x,
            y: pos.y,
            isAI: true,
            routineSpots: routineSpots,
            // Restore some base prestige?
            prestige: finalState?.personalPrestige || 0
        });
    }

    // --- UTILS ---
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
        // ... (Keep existing logic or simplify) ...
        // Re-implementing simply for safety in overwrite
        console.log("[SPAWN] Night has fallen. Spawning Prefects...");
        const registry = LevelRegistry.getInstance();
        const locations = [
            registry.getLocation("ACADEMIC_WING") || { x: 1600, y: 1600 },
            registry.getLocation("COURTYARD") || { x: 1056, y: 1280 },
            registry.getLocation("DORM_IGNIS") || { x: 600, y: 1100 }
        ];
        const names = ["Hallway Prefect", "Courtyard Prefect", "Dorm Prefect"];

        locations.forEach((loc, i) => {
            const id = `prefect_${i}`;
            this.spawnCharacter({
                id: id,
                numericId: 1000 + i,
                username: names[i],
                skin: "player_idle",
                house: "ignis",
                x: loc.x,
                y: loc.y,
                isAI: true
            });
            this.prefectIds.add(id);
        });
    }

    private despawnPrefects() {
        this.prefectIds.forEach(id => this.removeEntity(id));
        this.prefectIds.clear();
    }

    public loadSeats(mapData: MapData) {
        this.seats = parseSeats(mapData);
    }

    public spawnEchoes(count: number, centerPos: { x: number, y: number }) {
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
                const skin = house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle");
                
                // Calculate Spots
                const bedRow = Math.floor(studentIndex / 4);
                const bedCol = studentIndex % 4;
                const sleepPos = {
                    x: dormPos.x + (bedCol * TILE_SIZE * 2),
                    y: dormPos.y + (bedRow * TILE_SIZE * 3) + 20
                };
                
                let tableOffsetY = house === 'ignis' ? -80 : (house === 'vesper' ? 80 : 0);
                const tableRow = Math.floor(studentIndex / 4); 
                const tableCol = studentIndex % 4; 
                const gh = registry.getLocation("GREAT_HALL");
                const eatPos = {
                    x: gh.x + (tableCol * 64) - 96, 
                    y: gh.y + tableOffsetY + (tableRow === 0 ? -40 : 40)
                };

                const seatId = numericId - 1;
                const classPos = this.seats.class.get(seatId) || { x: 1440, y: 1312 };

                this.spawnCharacter({
                    id: id,
                    numericId: numericId,
                    username: `${house.charAt(0).toUpperCase() + house.slice(1)} Student ${i}`,
                    skin: skin,
                    house: house,
                    x: sleepPos.x,
                    y: sleepPos.y,
                    isAI: true,
                    routineSpots: { sleep: sleepPos, eat: eatPos, class: classPos }
                });
            }
        });
    }

    public spawnFromMap(mapData: MapData) {
        const npcs = parseNPCs(mapData);
        npcs.forEach(npc => {
             this.spawnCharacter({
                 id: `teacher_${npc.id}`,
                 username: npc.name,
                 skin: npc.skin,
                 house: 'ignis',
                 x: npc.x,
                 y: npc.y,
                 isAI: true,
                 numericId: 2000 + npc.id
             });
        });
    }
}