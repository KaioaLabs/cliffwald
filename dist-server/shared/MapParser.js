"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayer = getLayer;
exports.getObjects = getObjects;
exports.getProperty = getProperty;
exports.parseSeats = parseSeats;
exports.parseNPCs = parseNPCs;
exports.parseEntities = parseEntities;
exports.parseLogic = parseLogic;
exports.buildPhysics = buildPhysics;
const rapier2d_compat_1 = __importDefault(require("@dimforge/rapier2d-compat"));
// --- Helper Functions ---
function getLayer(map, name) {
    return map.layers.find(l => l.name === name);
}
function getObjects(map, layerName) {
    const layer = getLayer(map, layerName);
    return (layer && layer.type === "objectgroup" && layer.objects) ? layer.objects : [];
}
function getProperty(obj, propName) {
    return obj.properties?.find(p => p.name === propName)?.value;
}
// --- Parsing Logic ---
function parseSeats(map) {
    const seats = {
        bed: new Map(),
        class: new Map(),
        food: new Map()
    };
    const objects = getObjects(map, "FixedSeats");
    objects.forEach(obj => {
        const studentId = getProperty(obj, 'studentId');
        if (studentId === undefined)
            return;
        const pos = { x: obj.x, y: obj.y };
        if (obj.type === 'bed')
            seats.bed.set(studentId, pos);
        else if (obj.type === 'seat_class')
            seats.class.set(studentId, pos);
        else if (obj.type === 'seat_food')
            seats.food.set(studentId, pos);
    });
    return seats;
}
function parseNPCs(map) {
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
function parseEntities(map) {
    const objects = getObjects(map, "Entities");
    const spawnObj = objects.find(o => o.name === "Spawn" || o.type === "Spawn");
    return {
        spawnPos: spawnObj ? { x: spawnObj.x, y: spawnObj.y } : { x: 256, y: 256 }
    };
}
function parseLogic(map) {
    const logicData = {
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
            // Assumed to be a Point
            logicData.locations.set(obj.name || "unknown", {
                id: obj.name || "unknown",
                x: obj.x,
                y: obj.y
            });
        }
        else if (obj.type === 'duel_zone') {
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
        }
        else if (obj.type === 'infirmary_bed') {
            logicData.infirmaryBeds.push({ x: obj.x, y: obj.y });
        }
        else if (obj.type === 'exit' && obj.name === 'infirmary_exit') {
            logicData.infirmaryExit = { x: obj.x, y: obj.y };
        }
        else if (obj.type === 'duel_exit') {
            // parse id from name "duel_exit_N"
            const parts = (obj.name || "").split('_');
            const id = parseInt(parts[parts.length - 1]);
            if (!isNaN(id)) {
                logicData.duelExits.set(id, { x: obj.x, y: obj.y });
            }
        }
    });
    logicData.infirmaryBeds.sort((a, b) => (a.x - b.x)); // Basic sort for beds if needed
    return logicData;
}
function buildPhysics(world, mapData) {
    if (!mapData || !Array.isArray(mapData.layers)) {
        console.error("[MapParser] Invalid map data format.");
        return { navGrid: [], gridWidth: 0, gridHeight: 0, tileWidth: 0, tileHeight: 0 };
    }
    const mapW = mapData.width || 0;
    const mapH = mapData.height || 0;
    const tileW = mapData.tilewidth || 32;
    const tileH = mapData.tileheight || 32;
    const navGrid = Array.from({ length: mapH }, () => Array(mapW).fill(0));
    const collisionObjects = getObjects(mapData, "Collisions");
    collisionObjects.forEach((obj) => {
        if (typeof obj.x !== 'number' || typeof obj.y !== 'number' || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
            return;
        }
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const rigidBodyDesc = rapier2d_compat_1.default.RigidBodyDesc.fixed().setTranslation(cx, cy);
        const body = world.createRigidBody(rigidBodyDesc);
        const colliderDesc = rapier2d_compat_1.default.ColliderDesc.cuboid(obj.width / 2, obj.height / 2);
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
