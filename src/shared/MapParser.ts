import RAPIER from "@dimforge/rapier2d-compat";
import { CONFIG } from "./Config";
import { ZONE_DATA } from "./data/ZoneRegistry";
import * as zlib from "zlib";

// --- Types ---

export interface MapObject {
    id: number;
    name?: string;
    type?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    properties?: { name: string; type: string; value: any }[];
    ellipse?: boolean; 
    point?: boolean;   
}

export interface MapLayer {
    name: string;
    type: string; 
    objects?: MapObject[];
    data?: number[] | string; 
    encoding?: string; 
    compression?: string; 
}

export interface MapData {
    layers: MapLayer[];
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
}

export interface PhysicsResult {
    navGrids: Map<number, number[][]>; 
    gridWidth: number;
    gridHeight: number;
    tileWidth: number;
    tileHeight: number;
}

// --- Logic Types ---

export interface GameLocation {
    x: number;
    y: number;
    width: number;
    height: number;
    id: string; 
    isSanctuary?: boolean;
}

export interface DuelZone {
    id: number;
    x: number; 
    y: number; 
    radius: number;
}

export interface LogicData {
    locations: Map<string, GameLocation>; 
    duelZones: DuelZone[];
    infirmaryBeds: {x: number, y: number}[];
    infirmaryExit: {x: number, y: number} | null;
    duelExits: Map<number, {x: number, y: number}>;
    anchors: Map<string, {x: number, y: number}>;
    itemSpawns: {x: number, y: number}[];
}

// --- Helper Functions ---

export function getLayer(map: MapData, name: string): MapLayer | undefined {
    return map.layers.find(l => l.name === name);
}

export function getObjects(map: MapData, layerName: string): MapObject[] {
    const layer = getLayer(map, layerName);
    return (layer && layer.type === "objectgroup" && layer.objects) ? layer.objects : [];
}

export function getProperty(obj: MapObject, propName: string): any {
    return obj.properties?.find(p => p.name === propName)?.value;
}

function getCustomProp(entity: any, propName: string): any {
    if (!entity.properties) return undefined;
    if (Array.isArray(entity.properties)) {
        return entity.properties.find((p: any) => p.name === propName)?.value;
    }
    return entity.properties[propName];
}

// --- Parsing Logic ---

export function parseSeats(map: MapData) {
    const seats = {
        bed: new Map<number, {x: number, y: number}>(),
        class: new Map<number, {x: number, y: number}>(),
        food: new Map<number, {x: number, y: number}>()
    };

    const seatObjects = getObjects(map, "FixedSeats");
    seatObjects.forEach(obj => {
        const parts = (obj.name || "").split('_');
        const idStr = parts[parts.length - 1];
        const studentId = parseInt(idStr);

        if (!isNaN(studentId)) {
            // Adjust to 0-indexed for registry
            const seatId = studentId - 1;
            let type = obj.type;
            if (!type && obj.name) {
                if (obj.name.startsWith("bed")) type = 'bed';
                else if (obj.name.startsWith("seat_class")) type = 'class';
                else if (obj.name.startsWith("seat_food")) type = 'food';
            }

            if (type === 'bed') seats.bed.set(seatId, { x: obj.x, y: obj.y });
            else if (type === 'class') seats.class.set(seatId, { x: obj.x, y: obj.y });
            else if (type === 'food') seats.food.set(seatId, { x: obj.x, y: obj.y });
        }
    });

    return seats;
}

export function parseNPCs(map: MapData) {
    const objects = getObjects(map, "NPCs");
    return objects.map(obj => ({
        id: obj.id,
        x: obj.x,
        y: obj.y,
        name: obj.name || "Unknown",
        type: obj.type || getProperty(obj, "type") || "teacher",
        skin: getProperty(obj, "skin") || "teacher"
    }));
}

export function parseEntities(map: MapData) {
    const objects = getObjects(map, "Entities");
    const spawnObj = objects.find(o => o.name === "Spawn" || o.type === "Spawn");
    return {
        spawnPos: spawnObj ? { x: spawnObj.x, y: spawnObj.y } : { x: 256, y: 256 }
    };
}

export function parseLogic(map: MapData): LogicData {
    const logicData: LogicData = {
        locations: new Map(),
        duelZones: [],
        infirmaryBeds: [],
        infirmaryExit: null,
        duelExits: new Map(),
        anchors: new Map(),
        itemSpawns: []
    };

    const objects = getObjects(map, "Logic");
    const anchorObjects = getObjects(map, "Anchors");

    // 1. Process Anchors
    anchorObjects.forEach(obj => {
        if (obj.name) logicData.anchors.set(obj.name, { x: obj.x, y: obj.y });
    });
    
    // 2. Process Logic
    objects.forEach(obj => {
        if (obj.type === 'location' || obj.type === 'zone') {
            const w = obj.width || 0;
            const h = obj.height || 0;
            const centerX = obj.x + w / 2;
            const centerY = obj.y + h / 2;

            const name = obj.name || "unknown";
            const zoneDef = ZONE_DATA[name];

            logicData.locations.set(name, {
                id: name,
                x: centerX,
                y: centerY,
                width: w,
                height: h,
                isSanctuary: zoneDef?.isSanctuary
            });
        } else if (obj.type === 'duel_zone') {
            const radius = obj.width / 2;
            const centerX = obj.x + radius;
            const centerY = obj.y + radius;
            const zoneId = getProperty(obj, 'zone_id') ?? -1;
            
            logicData.duelZones.push({
                id: zoneId,
                x: centerX,
                y: centerY,
                radius: radius
            });
        } else if (obj.type === 'infirmary_bed') {
            logicData.infirmaryBeds.push({ x: obj.x, y: obj.y });
        } else if (obj.type === 'exit' && obj.name === 'infirmary_exit') {
            logicData.infirmaryExit = { x: obj.x, y: obj.y };
        } else if (obj.type === 'duel_exit') {
            const parts = (obj.name || "").split('_');
            const id = parseInt(parts[parts.length - 1]);
            if (!isNaN(id)) {
                logicData.duelExits.set(id, { x: obj.x, y: obj.y });
            }
        } else if (obj.type === 'item_spawn') {
            logicData.itemSpawns.push({ 
                x: obj.x + (obj.width ? obj.width/2 : 0), 
                y: obj.y + (obj.height ? obj.height/2 : 0)
            });
        }
    });

    logicData.infirmaryBeds.sort((a: any, b: any) => (a.x - b.x)); 
    return logicData;
}

export function buildPhysics(world: RAPIER.World, mapData: MapData): PhysicsResult {
    if (!mapData || !Array.isArray(mapData.layers)) {
        console.error("[MapParser] Invalid map data format.");
        return { navGrids: new Map(), gridWidth: 0, gridHeight: 0, tileWidth: 0, tileHeight: 0 };
    }

    const mapW = mapData.width || 0;
    const mapH = mapData.height || 0;
    const tileW = mapData.tilewidth || 32;
    const tileH = mapData.tileheight || 32;

    const navGrids = new Map<number, number[][]>();
    navGrids.set(0, Array.from({ length: mapH }, () => Array(mapW).fill(0)));

    mapData.layers.forEach(layer => {
        if (layer.type !== "objectgroup") return;
        const lowerName = layer.name.toLowerCase();
        
        // Filter out other floors
        if (lowerName.includes("floor1") || lowerName.includes("f1_") || 
            lowerName.includes("floor2") || lowerName.includes("f2_") ||
            lowerName.includes("basement") || lowerName.includes("base_")) {
            return; 
        }

        if (!lowerName.includes("collision") && !lowerName.includes("global") && !lowerName.includes("floor0") && !lowerName.includes("f0")) {
            if (!lowerName.includes("collision")) return;
        }

        const interactionGroup = (CONFIG.COLLISION_GROUPS.GLOBAL << 16) | CONFIG.COLLISION_GROUPS.WALL_MASK;

        if (!layer.objects) return;

        layer.objects.forEach((obj) => {
            if (typeof obj.x !== 'number' || typeof obj.y !== 'number' || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
                return;
            }

            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;
            
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(cx, cy)
                .setUserData({ type: 'static_wall' });

            const body = world.createRigidBody(rigidBodyDesc);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(obj.width / 2, obj.height / 2);
            colliderDesc.setCollisionGroups(interactionGroup);
            world.createCollider(colliderDesc, body);

            const startX = Math.floor(obj.x / tileW);
            const startY = Math.floor(obj.y / tileH);
            const endX = Math.ceil((obj.x + obj.width) / tileW);
            const endY = Math.ceil((obj.y + obj.height) / tileH);

            const grid = navGrids.get(0);
            if (!grid) return;

            for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
                for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
                    if (grid[y] && grid[y][x] !== undefined) {
                        grid[y][x] = 1;
                    }
                }
            }
        });
    });
    
    return {
        navGrids,
        gridWidth: mapW,
        gridHeight: mapH,
        tileWidth: tileW,
        tileHeight: tileH
    };
}
