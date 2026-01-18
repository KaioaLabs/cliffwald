const fs = require('fs');
const path = require('path');

const INPUT_MAP = path.join(__dirname, '../assets/maps/world.json');
const OUTPUT_MAP = path.join(__dirname, '../assets/maps/world.json');

// CONFIGURATION
const MAP_W = 150;
const MAP_H = 150;
const TILE_SIZE = 32;

// POPULATION SCALE
const TOTAL_POPULATION = 100; // The Echo system target
const HOUSE_POPULATION = 34;  // Approx 100 / 3

// ZONES (Grid Coordinates)
const ZONES = {
    // CENTER: The Hub
    GREAT_HALL: { x: 50, y: 50, w: 50, h: 30, name: "GREAT_HALL" },
    
    // WEST: Residential Wing (Stacked Vertically)
    DORM_IGNIS:  { x: 10, y: 10, w: 25, h: 35, name: "DORM_IGNIS" },
    DORM_AXIOM:  { x: 10, y: 50, w: 25, h: 35, name: "DORM_AXIOM" },
    DORM_VESPER: { x: 10, y: 90, w: 25, h: 35, name: "DORM_VESPER" },
    
    // EAST: Academic Wing
    CLASSROOM:   { x: 110, y: 20, w: 30, h: 40, name: "CLASSROOM" },
    LIBRARY:     { x: 110, y: 70, w: 30, h: 30, name: "LIBRARY" },
    INFIRMARY:   { x: 110, y: 110, w: 20, h: 15, name: "INFIRMARY" },
    
    // SOUTH: Exterior
    COURTYARD:   { x: 50, y: 90, w: 50, h: 20, name: "COURTYARD" },
    FOREST:      { x: 5, y: 120, w: 140, h: 25, name: "FOREST" },
    
    // NORTH: Isolation
    DETENTION:   { x: 70, y: 5, w: 10, h: 10, name: "DETENTION" }
};

try {
    console.log("Generating V4 'The Hive' Map (100+ Capacity)...");
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

    // --- 1. GROUND ---
    const groundData = new Array(MAP_W * MAP_H).fill(1); // Grass
    const paint = (rect, val) => {
        for(let y = rect.y; y < rect.y + rect.h; y++) {
            for(let x = rect.x; x < rect.x + rect.w; x++) {
                if(x >=0 && x < MAP_W && y >=0 && y < MAP_H) groundData[y * MAP_W + x] = val;
            }
        }
    };

    // Paint Rooms (Stone/Wood = 2)
    Object.values(ZONES).forEach(z => {
        if(z.name !== "FOREST") paint(z, 2);
    });

    // Paint Connections (Corridors)
    // Horizontal Highway: Dorms <-> Great Hall <-> Class
    paint({x: 35, y: 60, w: 15, h: 10}, 2); // West Connector
    paint({x: 100, y: 60, w: 10, h: 10}, 2); // East Connector
    
    // Vertical Connectors for Dorms
    paint({x: 30, y: 45, w: 5, h: 5}, 2);
    paint({x: 30, y: 85, w: 5, h: 5}, 2);

    newMap.layers.push({
        id: newMap.nextlayerid++, name: "Ground", type: "tilelayer",
        width: MAP_W, height: MAP_H, visible: true, opacity: 1,
        data: groundData, encoding: "csv"
    });

    // --- 2. WALLS ---
    const walls = [];
    const addWall = (x, y, w, h) => {
        walls.push({
            id: getNextId(), x: x*TILE_SIZE, y: y*TILE_SIZE, width: w*TILE_SIZE, height: h*TILE_SIZE,
            type: "static_wall"
        });
    };
    
    // Box rooms logic
    const boxRoom = (room, openings = []) => {
        // Simple bounding box for now, we rely on lack of collision for players to walk through doors
        // But to make it look built, we leave gaps.
        // openings: ['right', 'left']
        
        // Top
        addWall(room.x, room.y-1, room.w, 1);
        // Bottom
        addWall(room.x, room.y+room.h, room.w, 1);
        
        // Left (with gap if specified)
        if (openings.includes('left')) {
            const mid = Math.floor(room.h/2);
            addWall(room.x-1, room.y, 1, mid-3);
            addWall(room.x-1, room.y+mid+3, 1, mid-3);
        } else {
            addWall(room.x-1, room.y, 1, room.h);
        }

        // Right (with gap if specified)
        if (openings.includes('right')) {
            const mid = Math.floor(room.h/2);
            addWall(room.x+room.w, room.y, 1, mid-3);
            addWall(room.x+room.w, room.y+mid+3, 1, mid-3);
        } else {
            addWall(room.x+room.w, room.y, 1, room.h);
        }
    };

    boxRoom(ZONES.DORM_IGNIS, ['right']);
    boxRoom(ZONES.DORM_AXIOM, ['right']);
    boxRoom(ZONES.DORM_VESPER, ['right']);
    
    boxRoom(ZONES.GREAT_HALL, ['left', 'right', 'bottom']); // Open everywhere
    
    boxRoom(ZONES.CLASSROOM, ['left']);
    boxRoom(ZONES.LIBRARY, ['left']);

    newMap.layers.push({
        id: newMap.nextlayerid++, name: "Collisions", type: "objectgroup",
        visible: true, opacity: 0.5, objects: walls
    });

    // --- 3. LOGIC ZONES ---
    const zones = [];
    Object.values(ZONES).forEach(z => {
        zones.push({
            id: getNextId(), name: z.name, type: "zone",
            x: z.x*TILE_SIZE, y: z.y*TILE_SIZE, width: z.w*TILE_SIZE, height: z.h*TILE_SIZE
        });
    });
    // Duel Ring
    zones.push({
        id: getNextId(), name: "duel_ring_0", type: "duel_zone",
        x: (ZONES.COURTYARD.x + 10)*TILE_SIZE, y: (ZONES.COURTYARD.y + 5)*TILE_SIZE,
        width: 300, height: 300, ellipse: true, properties: [{name: "zone_id", type: "int", value: 0}]
    });

    newMap.layers.push({
        id: newMap.nextlayerid++, name: "Logic", type: "objectgroup",
        visible: true, opacity: 0.5, objects: zones
    });

    // --- 4. SEATS (THE 100 CHALLENGE) ---
    const seats = [];
    const entities = [];

    // SPAWN
    entities.push({
        id: getNextId(), name: "Spawn", type: "Spawn", point: true,
        x: (ZONES.GREAT_HALL.x + 25)*TILE_SIZE, y: (ZONES.GREAT_HALL.y + 25)*TILE_SIZE
    });

    // BEDS (34 per House)
    const placeBeds = (zone, houseOffset) => {
        // Grid: 6 columns x 6 rows = 36 beds
        // Spacing: 3 tiles X, 4 tiles Y
        for(let i=0; i<HOUSE_POPULATION; i++) {
            const col = i % 6;
            const row = Math.floor(i / 6);
            
            const bx = zone.x + 2 + (col * 4);
            const by = zone.y + 2 + (row * 5);
            
            seats.push({
                id: getNextId(), name: `seat_bed_${houseOffset + i}`, type: "bed", point: true,
                x: bx*TILE_SIZE, y: by*TILE_SIZE
            });
        }
    };
    placeBeds(ZONES.DORM_IGNIS, 0);   // 0-33
    placeBeds(ZONES.DORM_AXIOM, 34);  // 34-67
    placeBeds(ZONES.DORM_VESPER, 68); // 68-101

    // DINING SEATS (100 seats)
    // 3 Long Tables (one per house logic, roughly)
    const placeDining = () => {
        const zone = ZONES.GREAT_HALL;
        // 3 Tables. Y positions: 5, 15, 25
        // Each table needs 34 seats.
        // X Start: 5. Step: 1.2 tiles (tight packing)
        
        for(let i=0; i<102; i++) {
            const tableIdx = Math.floor(i / 34); // 0, 1, 2
            const seatInTable = i % 34;
            
            const tx = zone.x + 5 + seatInTable; // 1 tile spacing (tight!)
            const ty = zone.y + 5 + (tableIdx * 8);
            
            seats.push({
                id: getNextId(), name: `seat_food_${i}`, type: "seat_food", point: true,
                x: tx*TILE_SIZE, y: ty*TILE_SIZE
            });
        }
    };
    placeDining();

    // CLASS SEATS (100 seats)
    const placeClass = () => {
        const zone = ZONES.CLASSROOM;
        // Grid 10 x 10
        for(let i=0; i<100; i++) {
            const col = i % 10;
            const row = Math.floor(i / 10);
            
            const cx = zone.x + 2 + (col * 2.5);
            const cy = zone.y + 5 + (row * 3);
            
            seats.push({
                id: getNextId(), name: `seat_class_${i}`, type: "seat_class", point: true,
                x: cx*TILE_SIZE, y: cy*TILE_SIZE
            });
        }
    };
    placeClass();

    newMap.layers.push({
        id: newMap.nextlayerid++, name: "FixedSeats", type: "objectgroup",
        visible: true, opacity: 1, objects: seats
    });

    newMap.layers.push({
        id: newMap.nextlayerid++, name: "Entities", type: "objectgroup",
        visible: true, opacity: 1, objects: entities
    });

    fs.writeFileSync(OUTPUT_MAP, JSON.stringify(newMap, null, 2));
    console.log(`[SUCCESS] Generated V4 'The Hive' Map. Capacity: ${seats.length} seats.`);

} catch (e) { console.error(e); }
