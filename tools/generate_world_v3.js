const fs = require('fs');
const path = require('path');

const INPUT_MAP = path.join(__dirname, '../assets/maps/world.json');
const OUTPUT_MAP = path.join(__dirname, '../assets/maps/world.json');

// CONFIGURATION
const MAP_W = 150;
const MAP_H = 150;
const TILE_SIZE = 32;

// LAYOUT CONSTANTS (In Tiles)
// Center of the map is 75, 75.
// We build the Citadel around the center-north, leaving space south for forest.

const CITADEL_ORIGIN_X = 35; // Left bound
const CITADEL_ORIGIN_Y = 20; // Top bound
const CITADEL_W = 80;
const CITADEL_H = 80;

// ZONES (Relative to Citadel Origin if needed, or Absolute)
const ZONES = {
    // 1. THE HUB (Center)
    COURTYARD: { x: 65, y: 50, w: 20, h: 20, name: "COURTYARD" }, // Open Central Plaza
    
    // 2. SOUTH WING (Entry)
    GREAT_HALL: { x: 55, y: 75, w: 40, h: 20, name: "GREAT_HALL" },
    
    // 3. WEST WING (Dorms)
    // Shared Hallway
    DORM_HALL: { x: 35, y: 30, w: 15, h: 60, name: "DORM_HALL" }, 
    // Houses (Inside the block, we visually separate them later or just logical zones)
    DORM_IGNIS:  { x: 36, y: 32, w: 13, h: 15, name: "DORM_IGNIS" },  // Top
    DORM_AXIOM:  { x: 36, y: 52, w: 13, h: 15, name: "DORM_AXIOM" },  // Mid
    DORM_VESPER: { x: 36, y: 72, w: 13, h: 15, name: "DORM_VESPER" }, // Bot
    
    // 4. EAST WING (Academic)
    CLASSROOM: { x: 90, y: 60, w: 20, h: 25, name: "CLASSROOM" },
    LIBRARY:   { x: 90, y: 30, w: 20, h: 25, name: "LIBRARY" },
    
    // 5. ISOLATED (North)
    DETENTION: { x: 70, y: 5, w: 10, h: 10, name: "DETENTION" }, // Far North
    
    // 6. EXTERIOR
    FOREST: { x: 5, y: 110, w: 140, h: 35, name: "FOREST" }
};

try {
    console.log("Generating V3 'Academic Citadel' Layout...");
    const rawData = fs.readFileSync(INPUT_MAP, 'utf8');
    const oldMap = JSON.parse(rawData);

    const newMap = {
        ...oldMap,
        width: MAP_W,
        height: MAP_H,
        layers: [],
        nextlayerid: 1,
        nextobjectid: 1
    };

    let objIdCounter = 1;
    function getNextId() { return objIdCounter++; }

    // --- 1. GROUND LAYER ---
    // 1 = Grass, 2 = Stone/Floor
    const groundData = new Array(MAP_W * MAP_H).fill(1); // Grass Default

    // Paint Citadel Base (Stone)
    const paint = (rect, val) => {
        for(let y = rect.y; y < rect.y + rect.h; y++) {
            for(let x = rect.x; x < rect.x + rect.w; x++) {
                if(x >=0 && x < MAP_W && y >=0 && y < MAP_H) groundData[y * MAP_W + x] = val;
            }
        }
    };

    // Paint the main building blocks
    paint(ZONES.GREAT_HALL, 2);
    paint(ZONES.DORM_HALL, 2);
    paint(ZONES.CLASSROOM, 2);
    paint(ZONES.LIBRARY, 2);
    paint(ZONES.COURTYARD, 2); // Cobble
    paint(ZONES.DETENTION, 2); // Dark stone?

    // Connecting Corridors (To ensure flow)
    // Connect Great Hall to Courtyard (North Gate)
    paint({x: 70, y: 70, w: 10, h: 5}, 2);
    // Connect Courtyard to West Wing (Dorms)
    paint({x: 50, y: 55, w: 15, h: 10}, 2);
    // Connect Courtyard to East Wing (Academic)
    paint({x: 85, y: 55, w: 5, h: 10}, 2);

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Ground",
        type: "tilelayer",
        width: MAP_W, height: MAP_H,
        visible: true, opacity: 1,
        data: groundData, encoding: "csv"
    });

    // --- 2. WALLS (Collisions) ---
    const walls = [];
    const addWall = (x, y, w, h) => {
        walls.push({
            id: getNextId(), x: x*TILE_SIZE, y: y*TILE_SIZE, width: w*TILE_SIZE, height: h*TILE_SIZE,
            type: "static_wall"
        });
    };

    // Helper to box a room with walls
    const boxRoom = (room, doorSide = 'none', doorSize = 4) => {
        // Top
        if(doorSide !== 'top') addWall(room.x, room.y - 1, room.w, 1);
        else {
            const mid = Math.floor(room.w/2);
            addWall(room.x, room.y - 1, mid - doorSize/2, 1);
            addWall(room.x + mid + doorSize/2, room.y - 1, mid - doorSize/2, 1);
        }
        
        // Bottom
        if(doorSide !== 'bottom') addWall(room.x, room.y + room.h, room.w, 1);
        else {
            const mid = Math.floor(room.w/2);
            addWall(room.x, room.y + room.h, mid - doorSize/2, 1);
            addWall(room.x + mid + doorSize/2, room.y + room.h, mid - doorSize/2, 1);
        }

        // Left
        if(doorSide !== 'left') addWall(room.x - 1, room.y, 1, room.h);
        else {
            const mid = Math.floor(room.h/2);
            addWall(room.x - 1, room.y, 1, mid - doorSize/2);
            addWall(room.x - 1, room.y + mid + doorSize/2, 1, mid - doorSize/2);
        }

        // Right
        if(doorSide !== 'right') addWall(room.x + room.w, room.y, 1, room.h);
        else {
            const mid = Math.floor(room.h/2);
            addWall(room.x + room.w, room.y, 1, mid - doorSize/2);
            addWall(room.x + room.w, room.y + mid + doorSize/2, 1, mid - doorSize/2);
        }
    };

    boxRoom(ZONES.GREAT_HALL, 'top'); // Opens North to Courtyard
    boxRoom(ZONES.CLASSROOM, 'left'); // Opens West to Courtyard
    boxRoom(ZONES.LIBRARY, 'left');   // Opens West to Courtyard
    
    // West Wing is a long strip
    // We wall the whole DORM_HALL block, opening East
    // But internally we want separators between houses? No, let's keep it open flow for density.
    // Just box the whole West Wing
    boxRoom(ZONES.DORM_HALL, 'right'); 

    // Detention (Isolated)
    boxRoom(ZONES.DETENTION, 'bottom');

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Collisions",
        type: "objectgroup",
        visible: true, opacity: 0.5,
        objects: walls
    });

    // --- 3. LOGIC ZONES ---
    const zones = [];
    Object.values(ZONES).forEach(z => {
        zones.push({
            id: getNextId(), name: z.name, type: "zone",
            x: z.x*TILE_SIZE, y: z.y*TILE_SIZE, width: z.w*TILE_SIZE, height: z.h*TILE_SIZE
        });
    });
    
    // Add Duel Rings in Courtyard
    zones.push({
        id: getNextId(), name: "duel_ring_0", type: "duel_zone",
        x: (ZONES.COURTYARD.x + 5)*TILE_SIZE, y: (ZONES.COURTYARD.y + 5)*TILE_SIZE,
        width: 100, height: 100, ellipse: true, properties: [{name: "zone_id", type: "int", value: 0}]
    });

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Logic",
        type: "objectgroup",
        visible: true, opacity: 0.5,
        objects: zones
    });

    // --- 4. SEATS & SPAWNS ---
    const seats = [];
    const entities = [];

    // Spawn (Great Hall Center)
    entities.push({
        id: getNextId(), name: "Spawn", type: "Spawn", point: true,
        x: (ZONES.GREAT_HALL.x + ZONES.GREAT_HALL.w/2)*TILE_SIZE,
        y: (ZONES.GREAT_HALL.y + ZONES.GREAT_HALL.h/2)*TILE_SIZE
    });

    // Beds (8 per house)
    const placeBeds = (zone, houseOffset) => {
        for(let i=0; i<8; i++) {
            // 2 Columns of 4 beds
            const col = i % 2;
            const row = Math.floor(i / 2);
            // Compact layout inside the zone
            const bx = zone.x + 2 + (col * 6);
            const by = zone.y + 2 + (row * 3);
            
            seats.push({
                id: getNextId(), name: `seat_bed_${houseOffset + i}`, type: "bed", point: true,
                x: bx*TILE_SIZE, y: by*TILE_SIZE
            });
        }
    };
    placeBeds(ZONES.DORM_IGNIS, 0);
    placeBeds(ZONES.DORM_AXIOM, 8);
    placeBeds(ZONES.DORM_VESPER, 16);

    // Class Desks (Grid 5x6 = 30)
    for(let i=0; i<30; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        seats.push({
            id: getNextId(), name: `seat_class_${i}`, type: "seat_class", point: true,
            x: (ZONES.CLASSROOM.x + 2 + col*3)*TILE_SIZE,
            y: (ZONES.CLASSROOM.y + 5 + row*3)*TILE_SIZE
        });
    }

    // Dining Seats (Long Tables in Great Hall)
    // 3 Rows of 10 seats
    for(let i=0; i<30; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        seats.push({
            id: getNextId(), name: `seat_food_${i}`, type: "seat_food", point: true,
            x: (ZONES.GREAT_HALL.x + 4 + col*3)*TILE_SIZE,
            y: (ZONES.GREAT_HALL.y + 5 + row*5)*TILE_SIZE
        });
    }

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "FixedSeats",
        type: "objectgroup",
        visible: true, opacity: 1,
        objects: seats
    });

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Entities",
        type: "objectgroup",
        visible: true, opacity: 1,
        objects: entities
    });

    fs.writeFileSync(OUTPUT_MAP, JSON.stringify(newMap, null, 2));
    console.log("[SUCCESS] V3 'Academic Citadel' Map Generated.");

} catch (e) {
    console.error(e);
}
