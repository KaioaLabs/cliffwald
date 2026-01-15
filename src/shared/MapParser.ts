import RAPIER from "@dimforge/rapier2d-compat";

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
    ellipse?: boolean; // Tiled ellipse marker
    point?: boolean;   // Tiled point marker
}

export interface MapLayer {
    name: string;
    type: string; // "objectgroup", "tilelayer", etc.
    objects?: MapObject[];
    data?: number[]; // For tile layers
}

export interface MapData {
    layers: MapLayer[];
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
}

export interface PhysicsResult {
    navGrid: number[][]; // 0 = Walkable, 1 = Wall
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
    id: string; // "DORM_IGNIS", etc.
}

export interface DuelZone {
    id: number;
    x: number; // Center X
    y: number; // Center Y
    radius: number;
}

export interface LogicData {
    locations: Map<string, GameLocation>; 
    duelZones: DuelZone[];
    infirmaryBeds: {x: number, y: number}[];
    infirmaryExit: {x: number, y: number} | null;
    duelExits: Map<number, {x: number, y: number}>; 
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

// --- Parsing Logic ---

export function parseSeats(map: MapData) {
    const seats = {
        bed: new Map<number, {x: number, y: number}>(),
        class: new Map<number, {x: number, y: number}>(),
        food: new Map<number, {x: number, y: number}>()
    };

    const objects = getObjects(map, "FixedSeats");
    objects.forEach(obj => {
        const studentId = getProperty(obj, 'studentId');
        if (studentId === undefined) return;

        const pos = { x: obj.x, y: obj.y };

        if (obj.type === 'bed') seats.bed.set(studentId, pos);
        else if (obj.type === 'seat_class') seats.class.set(studentId, pos);
        else if (obj.type === 'seat_food') seats.food.set(studentId, pos);
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
        duelExits: new Map()
    };

    const objects = getObjects(map, "Logic");
    
    objects.forEach(obj => {
        // Tiled Points have x,y at the point.
        // Tiled Ellipses/Rects have x,y at Top-Left.
        
        if (obj.type === 'location') {
            // Check if it has dimensions (Rectangle) or just a Point
            const w = obj.width || 0;
            const h = obj.height || 0;
            
            // If it's a point, we might want a default radius later, but for sensors we need AABB
            // If Tiled Object is a Point, w/h are 0.
            
            // We store center X/Y for points, or center X/Y for rects?
            // Rapier expects half-extents.
            
            const centerX = obj.x + w / 2;
            const centerY = obj.y + h / 2;

            logicData.locations.set(obj.name || "unknown", {
                id: obj.name || "unknown",
                x: centerX,
                y: centerY,
                width: w,
                height: h
            });
        } else if (obj.type === 'duel_zone') {
            // Assumed to be an Ellipse (Circle)
            // Convert Top-Left to Center
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
            // parse id from name "duel_exit_N"
            const parts = (obj.name || "").split('_');
            const id = parseInt(parts[parts.length - 1]);
            if (!isNaN(id)) {
                logicData.duelExits.set(id, { x: obj.x, y: obj.y });
            }
        }
    });

    logicData.infirmaryBeds.sort((a: any, b: any) => (a.x - b.x)); // Basic sort for beds if needed
    
    return logicData;
}

export function buildPhysics(world: RAPIER.World, mapData: MapData): PhysicsResult {
    if (!mapData || !Array.isArray(mapData.layers)) {
        console.error("[MapParser] Invalid map data format.");
        return { navGrid: [], gridWidth: 0, gridHeight: 0, tileWidth: 0, tileHeight: 0 };
    }

    const mapW = mapData.width || 0;
    const mapH = mapData.height || 0;
    const tileW = mapData.tilewidth || 32;
    const tileH = mapData.tileheight || 32;

    const navGrid: number[][] = Array.from({ length: mapH }, () => Array(mapW).fill(0));

    const collisionObjects = getObjects(mapData, "Collisions");
    
    collisionObjects.forEach((obj) => {
        if (typeof obj.x !== 'number' || typeof obj.y !== 'number' || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
            return;
        }

        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy);
        const body = world.createRigidBody(rigidBodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.cuboid(obj.width / 2, obj.height / 2);
        
        colliderDesc.setCollisionGroups(0x0001FFFF);

        world.createCollider(colliderDesc, body);

        const startX = Math.floor(obj.x / tileW);
        const startY = Math.floor(obj.y / tileH);
        const endX = Math.ceil((obj.x + obj.width) / tileW);
        const endY = Math.ceil((obj.y + obj.height) / tileH);

        for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
                if (navGrid[y] && navGrid[y][x] !== undefined) {
                    navGrid[y][x] = 1;
                }
            }
        }
    });
    
    return {
        navGrid,
        gridWidth: mapW,
        gridHeight: mapH,
        tileWidth: tileW,
        tileHeight: tileH
    };
}
