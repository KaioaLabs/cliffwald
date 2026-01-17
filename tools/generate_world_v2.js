const fs = require('fs');
const path = require('path');

const INPUT_MAP = path.join(__dirname, '../assets/maps/world.json');
const OUTPUT_MAP = path.join(__dirname, '../assets/maps/world.json'); // Overwrite

// Configuration
const MAP_WIDTH = 150;
const MAP_HEIGHT = 150;
const TILE_SIZE = 32;

// Layout Definitions (in Tiles)
const LAYOUT = {
    CASTLE_RECT: { x: 30, y: 30, w: 90, h: 80 }, // The main building block
    
    // ZONES (Relative to grid)
    GREAT_HALL: { x: 60, y: 70, w: 30, h: 30, name: "GREAT_HALL" },
    
    CLASSROOM: { x: 35, y: 70, w: 20, h: 20, name: "CLASSROOM" },
    LIBRARY: { x: 35, y: 40, w: 20, h: 20, name: "LIBRARY" },
    
    INFIRMARY: { x: 95, y: 70, w: 20, h: 20, name: "INFIRMARY" },
    DUEL_ROOM: { x: 95, y: 40, w: 20, h: 20, name: "DUEL_ROOM" },
    
    // Dorms (North Fingers)
    DORM_IGNIS:  { x: 40, y: 10, w: 15, h: 20, name: "DORM_IGNIS" },
    DORM_AXIOM:  { x: 67, y: 10, w: 15, h: 20, name: "DORM_AXIOM" },
    DORM_VESPER: { x: 95, y: 10, w: 15, h: 20, name: "DORM_VESPER" },
    
    // Exterior
    COURTYARD: { x: 50, y: 115, w: 50, h: 30, name: "COURTYARD" },
    FOREST: { x: 5, y: 5, w: 140, h: 140, name: "FOREST", isHollow: true }, // Ring around logic
    
    DETENTION: { x: 10, y: 130, w: 10, h: 10, name: "DETENTION" }
};

try {
    console.log("Reading existing map to preserve tilesets...");
    const rawData = fs.readFileSync(INPUT_MAP, 'utf8');
    const oldMap = JSON.parse(rawData);

    // 1. Setup New Map Structure
    const newMap = {
        ...oldMap,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        layers: [], // We will rebuild these
        nextlayerid: 1,
        nextobjectid: 1
    };

    // Helper to get ID
    let objIdCounter = 1;
    function getNextId() { return objIdCounter++; }

    // --- GENERATE LAYERS ---

    // 1. GROUND LAYER (Tile Layer)
    // Fill with Grass (Index 1 usually) then overwrite Castle with Stone (Index 2)
    // NOTE: We assume tileset indices. If generic, we use arbitrary IDs and user fixes in Tiled.
    // Let's assume ID 1 = Grass, ID 2 = Stone Floor/Wood.
    const totalTiles = MAP_WIDTH * MAP_HEIGHT;
    const groundData = new Array(totalTiles).fill(1); // Default Grass

    // Paint Castle Floor
    const paintRect = (data, rect, tileId) => {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    data[y * MAP_WIDTH + x] = tileId;
                }
            }
        }
    };

    paintRect(groundData, LAYOUT.CASTLE_RECT, 2); // Stone base
    
    // Paint Rooms specific floors? (Optional, keep simple for now)
    
    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Ground",
        type: "tilelayer",
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        x: 0, 
        y: 0,
        visible: true,
        opacity: 1,
        data: groundData,
        encoding: "csv" // Easier to write than base64 zlib for this script
    });

    // 2. LOGIC LAYER (ObjectGroup - Zones)
    const logicObjects = [];
    
    // Create Zone Rects
    Object.values(LAYOUT).forEach(zone => {
        if (zone.name === "FOREST" && zone.isHollow) return; // Handle forest differently or just big rect

        logicObjects.push({
            id: getNextId(),
            name: zone.name,
            type: "zone", // Kaioa Engine type
            x: zone.x * TILE_SIZE,
            y: zone.y * TILE_SIZE,
            width: zone.w * TILE_SIZE,
            height: zone.h * TILE_SIZE,
            rotation: 0,
            visible: true,
            properties: []
        });
    });

    // Add 4 Duel Rings inside Duel Room
    // Room is 20x20. Let's put 4 rings of radius 3 tiles.
    const dr = LAYOUT.DUEL_ROOM;
    const ringRadius = 80; // pixels
    const ringCenters = [
        { x: (dr.x + 5) * TILE_SIZE, y: (dr.y + 5) * TILE_SIZE },
        { x: (dr.x + 15) * TILE_SIZE, y: (dr.y + 5) * TILE_SIZE },
        { x: (dr.x + 5) * TILE_SIZE, y: (dr.y + 15) * TILE_SIZE },
        { x: (dr.x + 15) * TILE_SIZE, y: (dr.y + 15) * TILE_SIZE },
    ];

    ringCenters.forEach((center, idx) => {
        logicObjects.push({
            id: getNextId(),
            name: `duel_ring_${idx}`,
            type: "duel_zone",
            x: center.x - ringRadius, // Tiled ellipses are top-left
            y: center.y - ringRadius,
            width: ringRadius * 2,
            height: ringRadius * 2,
            rotation: 0,
            ellipse: true,
            properties: [{ name: "zone_id", type: "int", value: idx }]
        });
    });

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Logic",
        type: "objectgroup",
        visible: true,
        opacity: 0.5,
        objects: logicObjects
    });

    // 3. COLLISION LAYER (ObjectGroup - Walls)
    // We create walls around the CASTLE_RECT and between rooms.
    const collisionObjects = [];
    
    // Helper for Wall
    const addWall = (x, y, w, h) => {
        collisionObjects.push({
            id: getNextId(),
            x: x * TILE_SIZE,
            y: y * TILE_SIZE,
            width: w * TILE_SIZE,
            height: h * TILE_SIZE,
            rotation: 0,
            type: "static_wall"
        });
    };

    // Castle Outer Box (Inverted... actually let's just draw walls around the rooms)
    // Ideally we'd algorithmically outline the filled area, but hardcoding room borders is safer.
    
    Object.values(LAYOUT).forEach(zone => {
        if (zone.isHollow) return;
        if (zone.name === "COURTYARD") return; // Open area

        // Top Wall
        addWall(zone.x, zone.y - 1, zone.w, 1);
        // Bottom Wall
        addWall(zone.x, zone.y + zone.h, zone.w, 1);
        // Left Wall
        addWall(zone.x - 1, zone.y, 1, zone.h);
        // Right Wall
        addWall(zone.x + zone.w, zone.y, 1, zone.h);
    });

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Collisions",
        type: "objectgroup",
        visible: true,
        opacity: 0.5,
        objects: collisionObjects
    });

    // 4. FIXED SEATS & ANCHORS (ObjectGroup)
    const seatObjects = [];
    
    // Great Hall Tables (2 long tables per house? Or just general)
    const gh = LAYOUT.GREAT_HALL;
    // Generate 4 rows of 6 seats
    for (let i = 0; i < 24; i++) {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const x = (gh.x + 5 + col * 3) * TILE_SIZE;
        const y = (gh.y + 5 + row * 4) * TILE_SIZE;
        seatObjects.push({
            id: getNextId(),
            name: `seat_food_${i}`, // Note: Logic expects index match
            type: "seat_food",
            point: true,
            x: x,
            y: y
        });
    }

    // Classroom Desks
    const cr = LAYOUT.CLASSROOM;
    for (let i = 0; i < 24; i++) {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const x = (cr.x + 2 + col * 2.5) * TILE_SIZE;
        const y = (cr.y + 5 + row * 2.5) * TILE_SIZE;
        seatObjects.push({
            id: getNextId(),
            name: `seat_class_${i}`,
            type: "seat_class",
            point: true,
            x: x,
            y: y
        });
    }

    // Dorm Beds (8 per dorm)
    const createBeds = (zone, houseOffset) => {
        for (let i = 0; i < 8; i++) {
            const studentId = houseOffset + i;
            const row = Math.floor(i / 2);
            const col = i % 2; // 2 columns of beds
            const x = (zone.x + 2 + col * 8) * TILE_SIZE;
            const y = (zone.y + 2 + row * 4) * TILE_SIZE;
            seatObjects.push({
                id: getNextId(),
                name: `seat_bed_${studentId}`,
                type: "bed",
                point: true,
                x: x,
                y: y
            });
        }
    };

    createBeds(LAYOUT.DORM_IGNIS, 0);  // 0-7
    createBeds(LAYOUT.DORM_AXIOM, 8);  // 8-15
    createBeds(LAYOUT.DORM_VESPER, 16); // 16-23

    // Infirmary Beds
    const inf = LAYOUT.INFIRMARY;
    for(let i=0; i<6; i++) {
        seatObjects.push({
            id: getNextId(),
            name: `infirmary_bed_${i}`,
            type: "infirmary_bed",
            point: true,
            x: (inf.x + 2 + i*2.5) * TILE_SIZE,
            y: (inf.y + 10) * TILE_SIZE
        });
    }
    // Infirmary Exit
    seatObjects.push({
        id: getNextId(),
        name: `infirmary_exit`,
        type: "exit",
        point: true,
        x: (inf.x + 2) * TILE_SIZE,
        y: (inf.y + 15) * TILE_SIZE
    });

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "FixedSeats",
        type: "objectgroup",
        visible: true,
        opacity: 1,
        objects: seatObjects
    });

    // 5. ENTITIES (Spawn)
    const entitiesObjects = [];
    entitiesObjects.push({
        id: getNextId(),
        name: "Spawn",
        type: "Spawn",
        point: true,
        x: (LAYOUT.GREAT_HALL.x + LAYOUT.GREAT_HALL.w/2) * TILE_SIZE,
        y: (LAYOUT.GREAT_HALL.y + LAYOUT.GREAT_HALL.h - 2) * TILE_SIZE
    });

    // Item Spawns (Random spots in Forest)
    for(let i=0; i<10; i++) {
        entitiesObjects.push({
            id: getNextId(),
            name: "item_spawn",
            type: "item_spawn",
            point: true,
            x: (LAYOUT.FOREST.x + Math.random() * LAYOUT.FOREST.w) * TILE_SIZE,
            y: (LAYOUT.FOREST.y + Math.random() * 20) * TILE_SIZE // Top strip
        });
    }

    newMap.layers.push({
        id: newMap.nextlayerid++,
        name: "Entities",
        type: "objectgroup",
        visible: true,
        objects: entitiesObjects
    });

    // WRITE
    fs.writeFileSync(OUTPUT_MAP, JSON.stringify(newMap, null, 2));
    console.log(`[SUCCESS] Generated 150x150 World Map with ${logicObjects.length} zones and ${seatObjects.length} seats.`);

} catch (e) {
    console.error("[ERROR]", e);
}
