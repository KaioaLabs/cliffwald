const fs = require('fs');
const path = require('path');

const OUTPUT_MAP = path.join(__dirname, '../assets/maps/world.json');

// CONFIGURATION V5.1 (Full Canvas Background)
const MAP_W = 500; 
const MAP_H = 500; 
const TILE_SIZE = 32;

const OX = 190;
const OY = 170;

const T_WATER = 1;
const T_GRASS = 2;
const T_STONE_FLOOR = 3;
const T_WOOD_FLOOR = 4;
const T_PATH = 5;
const T_WALL_FACE = 6;
const T_WALL_TOP = 6;
const T_TABLE = 100;

const HUB = { x: 45, y: 60, w: 30, h: 40 }; 
const CLOISTER_THICKNESS = 3;

const ZONES = {
    DORM_IGNIS:  { x: 45, y: 32, w: 30, h: 25, name: "DORM_IGNIS", isSanctuary: true, floor: T_WOOD_FLOOR, doors: ["bottom"] },
    DORM_VESPER: { x: 17, y: 50, w: 25, h: 35, name: "DORM_VESPER", isSanctuary: true, floor: T_STONE_FLOOR, doors: ["right"], secret_doors: ["right"] },
    BATHROOMS:   { x: 27, y: 85, w: 15, h: 15, name: "BATHROOMS", pvp: false, floor: T_STONE_FLOOR, doors: ["right"] }, 
    DORM_AXIOM:  { x: 78, y: 50, w: 25, h: 35, name: "DORM_AXIOM", isSanctuary: true, floor: T_WOOD_FLOOR, doors: ["left"] },
    CLASSROOM:   { x: 78, y: 85, w: 20, h: 20, name: "CLASSROOM", pvp: false, floor: T_WOOD_FLOOR, doors: ["left"] },
    LIBRARY:     { x: 98, y: 85, w: 15, h: 15, name: "LIBRARY", pvp: false, floor: T_WOOD_FLOOR, doors: ["left"], secret_doors: ["top"] }, 
    COURTYARD:   { x: HUB.x, y: HUB.y, w: HUB.w, h: HUB.h, name: "COURTYARD", pvp: true, floor: T_STONE_FLOOR },
    GREAT_HALL:  { x: 40, y: 103, w: 40, h: 25, name: "GREAT_HALL", pvp: false, floor: T_WOOD_FLOOR, doors: ["top", "bottom"] },
    FOREST:      { x: -100, y: 145, w: 700, h: 300, name: "FOREST", pvp: true, wild: true, floor: T_GRASS },
    THE_PLUMBING:   { x: 42, y: 55, w: 3, h: 5, name: "THE_PLUMBING", pvp: true, floor: T_STONE_FLOOR },
    HIDDEN_ARCHIVE: { x: 98, y: 80, w: 10, h: 5, name: "HIDDEN_ARCHIVE", pvp: true, floor: T_WOOD_FLOOR },
};
const ISTHMUS = { x: 45, y: 128, w: 30, h: 22 };

let objIdCounter = 1;
function getNextId() { return objIdCounter++; }

try {
    console.log(`[GENERATOR] Sculpting 'The Fang' V5.2 (Extended Mainland) - Offset ${OX},${OY}...`);

    const map = {
        compressionlevel: -1,
        height: MAP_H,
        width: MAP_W,
        infinite: false,
        layers: [],
        nextlayerid: 1,
        nextobjectid: 1,
        orientation: "orthogonal",
        renderorder: "right-down",
        tiledversion: "1.10.2",
        tileheight: TILE_SIZE,
        tilewidth: TILE_SIZE,
        type: "map",
        version: "1.10",
        tilesets: [
            { "columns": 6, "firstgid": 1, "image": "tilesets/placeholder_tiles.png", "imageheight": 32, "imagewidth": 192, "margin": 0, "name": "placeholder_tiles", "spacing": 0, "tilecount": 6, "tileheight": 32, "tilewidth": 32 },
            { "columns": 1, "firstgid": 100, "image": "tilesets/table.png", "imageheight": 32, "imagewidth": 32, "margin": 0, "name": "table", "spacing": 0, "tilecount": 1, "tileheight": 32, "tilewidth": 32 },
            { "columns": 10, "firstgid": 200, "image": "tilesets/floor_320.png", "imageheight": 32, "imagewidth": 320, "margin": 0, "name": "floor_cobble", "spacing": 0, "tilecount": 10, "tileheight": 32, "tilewidth": 32 }
        ] 
    };

    // --- 5 LAYERS STACK ---
    // CRITICAL FIX: Initialize Terrain with WATER everywhere (No black tiles)
    const L1_Terrain = new Array(MAP_W * MAP_H).fill(T_WATER); 
    const L2_Floors = new Array(MAP_W * MAP_H).fill(0);  
    const L3_Deco = new Array(MAP_W * MAP_H).fill(0);    
    const L4_Walls = new Array(MAP_W * MAP_H).fill(0);   
    const L5_Over = new Array(MAP_W * MAP_H).fill(0);    
    
    const collisionObjects = [];

    const paint = (arr, rect, val) => {
        const nx = rect.x + OX;
        const ny = rect.y + OY;
        for(let y = ny; y < ny + rect.h; y++) 
            for(let x = nx; x < nx + rect.w; x++) 
                if(x >=0 && x < MAP_W && y >=0 && y < MAP_H) arr[y * MAP_W + x] = val;
    };

    const addWall = (x, y, w, h) => {
        const nx = x + OX;
        const ny = y + OY;
        collisionObjects.push({ id: getNextId(), x: nx*TILE_SIZE, y: ny*TILE_SIZE, width: w*TILE_SIZE, height: h*TILE_SIZE, type: "static_wall" });
        for(let py=ny; py<ny+h; py++) {
            for(let px=nx; px<nx+w; px++) {
                if (px>=0 && px<MAP_W && py>=0 && py<MAP_H) {
                    const idx = py*MAP_W + px;
                    L4_Walls[idx] = T_WALL_FACE;
                    const idxAbove = (py - 1) * MAP_W + px;
                    if (py > 0) L5_Over[idxAbove] = T_WALL_TOP; 
                }
            }
        }
    };

    // --- STEP 1: LANDMASS (On L1) ---
    paint(L1_Terrain, {x: 10, y: 20, w: 100, h: 110}, T_GRASS); 
    paint(L1_Terrain, ISTHMUS, T_GRASS);
    paint(L1_Terrain, ZONES.FOREST, T_GRASS); 

    const carve = (r) => paint(L1_Terrain, r, T_WATER);
    carve({x: 0, y: 0, w: 120, h: 20});
    carve({x: 0, y: 0, w: 20, h: 40});
    carve({x: 100, y: 0, w: 20, h: 40});
    carve({x: 0, y: 100, w: 30, h: 40});
    carve({x: 90, y: 100, w: 30, h: 40});

    // --- STEP 2: ZONES (On L2 & L5) ---
    const boxRoom = (room) => {
        paint(L2_Floors, room, room.floor || T_WOOD_FLOOR);
        const d = room.doors || [];
        const sd = room.secret_doors || [];
        const doorWidth = room.name === "GREAT_HALL" ? 4 : 2; 
        const isDoor = (pos, length) => {
            const mid = Math.floor(length / 2);
            const halfD = Math.floor(doorWidth / 2);
            return pos >= mid - halfD && pos < mid + (doorWidth - halfD);
        };
        const hasGap = (side, pos, length) => {
            if (!isDoor(pos, length)) return false;
            return d.includes(side) || sd.includes(side);
        };
        for(let x=0; x<room.w; x++) if (!hasGap("top", x, room.w)) addWall(room.x + x, room.y - 1, 1, 1);
        for(let x=0; x<room.w; x++) if (!hasGap("bottom", x, room.w)) addWall(room.x + x, room.y + room.h, 1, 1);
        for(let y=0; y<room.h; y++) if (!hasGap("left", y, room.h)) addWall(room.x - 1, room.y + y, 1, 1);
        for(let y=0; y<room.h; y++) if (!hasGap("right", y, room.h)) addWall(room.x + room.w, room.y + y, 1, 1);
        
        if (d.includes("bottom")) {
             const mid = Math.floor(room.w / 2);
             const halfD = Math.floor(doorWidth / 2);
             const startX = mid - halfD;
             for(let k=0; k<doorWidth; k++) {
                 const nx = room.x + startX + k + OX;
                 const ny = room.y + room.h + OY;
                 const idxAbove = (ny - 1) * MAP_W + nx;
                 L5_Over[idxAbove] = T_WALL_TOP;
             }
        }
    };

    Object.values(ZONES).forEach(z => {
        if(z.name !== "FOREST" && z.name !== "COURTYARD") boxRoom(z);
        else paint(L2_Floors, z, z.floor);
    });

    const T = CLOISTER_THICKNESS;
    const CLOISTER_N = {x: HUB.x, y: HUB.y - T, w: HUB.w, h: T};
    const CLOISTER_S = {x: HUB.x, y: HUB.y + HUB.h, w: HUB.w, h: T};
    const CLOISTER_W = {x: HUB.x - T, y: HUB.y - T, w: T, h: HUB.h + (T*2)};
    const CLOISTER_E = {x: HUB.x + HUB.w, y: HUB.y - T, w: T, h: HUB.h + (T*2)};
    [CLOISTER_N, CLOISTER_W, CLOISTER_E, CLOISTER_S].forEach(r => paint(L2_Floors, r, T_STONE_FLOOR));

    // --- STEP 3: DECORATION (On L3) ---
    // Road removed to keep Mainland 'All Grass'
    // paint(L3_Deco, {x: 5, y: 145, w: 110, h: 4}, T_PATH);

    // Courtyard Obstacles (High quality occlusion)
    const court = ZONES.COURTYARD;
    const cx = court.x + court.w/2;
    const cy = court.y + court.h/2;
    addWall(cx - 2, cy - 2, 4, 4); 
    addWall(court.x + 4, court.y + 4, 2, 2);
    addWall(court.x + court.w - 6, court.y + 4, 2, 2);
    addWall(court.x + 4, court.y + court.h - 6, 2, 2);
    addWall(court.x + court.w - 6, court.y + court.h - 6, 2, 2);

    // --- EXPORT ---
    const addLayer = (name, data) => map.layers.push({ id: map.nextlayerid++, name, type: "tilelayer", width: MAP_W, height: MAP_H, visible: true, opacity: 1, data, encoding: "csv" });
    addLayer("L1_Terrain", L1_Terrain);
    addLayer("L2_Floors", L2_Floors);
    addLayer("L3_Deco_Ground", L3_Deco);
    addLayer("L4_Walls_Base", L4_Walls);
    addLayer("L5_Overhead", L5_Over);
    map.layers.push({ id: map.nextlayerid++, name: "Collisions", type: "objectgroup", visible: true, opacity: 0.5, objects: collisionObjects });
    const logicObjects = [];
    Object.values(ZONES).forEach(z => {
        logicObjects.push({
            id: getNextId(), name: z.name, type: "zone", x: (z.x + OX)*TILE_SIZE, y: (z.y + OY)*TILE_SIZE, width: z.w*TILE_SIZE, height: z.h*TILE_SIZE,
            properties: [ { name: "isSanctuary", type: "bool", value: !!z.isSanctuary }, { name: "pvp", type: "bool", value: !!z.pvp } ]
        });
    });
    logicObjects.push({ id: getNextId(), name: "duel_ring_0", type: "duel_zone", x: (cx - 8 + OX)*TILE_SIZE, y: (cy - 8 + OY)*TILE_SIZE, width: 512, height: 512, ellipse: true });
    logicObjects.push({ id: getNextId(), name: "duel_exit_0", type: "duel_exit", x: (cx + 10 + OX)*TILE_SIZE, y: (cy + OY)*TILE_SIZE, width: 32, height: 32 });
    map.layers.push({ id: map.nextlayerid++, name: "Logic", type: "objectgroup", visible: true, opacity: 0.5, objects: logicObjects });
    const seats = [];
    const entities = [];
    entities.push({ id: getNextId(), name: "Spawn", type: "Spawn", point: true, x: (cx + OX)*TILE_SIZE, y: (cy + 10 + OY)*TILE_SIZE });
    const placeBeds = (zone, house) => {
        const startX = zone.x + 2; const startY = zone.y + 2;
        [{x:0, y:0}, {x:3, y:0}, {x:6, y:0}, {x:0, y:4}, {x:6, y:4}, {x:0, y:8}, {x:3, y:8}, {x:6, y:8}].forEach((pos, i) => {
             seats.push({ id: getNextId(), name: `seat_bed_${house}_${i}`, type: "bed", point: true, x: (startX + pos.x + OX)*TILE_SIZE, y: (startY + pos.y + OY)*TILE_SIZE });
        });
    };
    placeBeds(ZONES.DORM_IGNIS, "ignis"); placeBeds(ZONES.DORM_AXIOM, "axiom"); placeBeds(ZONES.DORM_VESPER, "vesper");
    const placeClass = () => {
        const z = ZONES.CLASSROOM;
        for(let r=0; r<3; r++) for(let c=0; c<6; c++) 
            seats.push({ id: getNextId(), name: `seat_class_${r}_${c}`, type: "seat_class", point: true, x: (z.x + 2 + c*2.5 + OX)*TILE_SIZE, y: (z.y + 5 + r*3 + OY)*TILE_SIZE });
    };
    placeClass();
    map.layers.push({ id: map.nextlayerid++, name: "FixedSeats", type: "objectgroup", visible: true, opacity: 1, objects: seats });
    map.layers.push({ id: map.nextlayerid++, name: "Entities", type: "objectgroup", visible: true, opacity: 1, objects: entities });

    fs.writeFileSync(OUTPUT_MAP, JSON.stringify(map, null, 2));
    console.log(`[SUCCESS] Generated V5.1 Full Background: ${OUTPUT_MAP}`);

} catch (e) {
    console.error(e);
}