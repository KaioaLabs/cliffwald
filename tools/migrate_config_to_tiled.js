const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '../assets/maps/world.json');

// --- DATOS HARDCODEADOS DE CONFIG.TS ---
// (Copiados directamente para asegurar precisión píxel-perfecta)

const SCHOOL_LOCATIONS = {
    // Dormitories (Left Wing)
    DORM_IGNIS: { x: 576, y: 480 },
    DORM_AXIOM: { x: 576, y: 1120 },
    DORM_VESPER: { x: 576, y: 1760 },
    
    // Central Hub
    GREAT_HALL: { x: 1600, y: 560 },       
    ACADEMIC_WING: { x: 1600, y: 1360 },    
    INFIRMARY: { x: 1600, y: 960 },
    
    // Right Wing
    TRAINING_GROUNDS: { x: 2640, y: 1520 }, 
    ALCHEMY_LAB: { x: 2592, y: 640 },       
    
    // Outdoor
    COURTYARD: { x: 1056, y: 1280 },        
    FOREST: { x: 1600, y: 2880 },
    DETENTION: { x: 500, y: 2800 }, 
    LIBRARY: { x: 2600, y: 1000 }   
};

const INFIRMARY_BEDS = [
    { x: 1550, y: 960 },
    { x: 1580, y: 960 },
    { x: 1620, y: 960 },
    { x: 1650, y: 960 },
    { x: 1550, y: 1000 },
    { x: 1650, y: 1000 }
];

const INFIRMARY_EXIT = { x: 1600, y: 1050 };

const DUEL_ZONES = [
    { x: 2200, y: 1200, radius: 300, id: 0 },
    { x: 3000, y: 1200, radius: 300, id: 1 },
    { x: 2200, y: 1800, radius: 300, id: 2 },
    { x: 3000, y: 1800, radius: 300, id: 3 }
];

const DUEL_EXITS = [
    { x: 2200, y: 1550 },
    { x: 3000, y: 1550 },
    { x: 2200, y: 2150 },
    { x: 3000, y: 2150 }
];

// --- LÓGICA DE MIGRACIÓN ---

function migrate() {
    console.log(`Loading map from ${MAP_PATH}...`);
    const mapData = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

    // 1. Check if layer already exists
    let logicLayer = mapData.layers.find(l => l.name === "Logic");
    if (logicLayer) {
        console.log("Logic layer already exists. Clearing objects to re-inject...");
        logicLayer.objects = [];
    } else {
        console.log("Creating new 'Logic' layer...");
        logicLayer = {
            draworder: "topdown",
            id: 200, // Safe ID, assuming others are < 200. Tiled handles ID collisions on load usually, but we try to be safe.
            name: "Logic",
            objects: [],
            opacity: 1,
            type: "objectgroup",
            visible: true, // Visible for debugging in editor, can be hidden later
            x: 0,
            y: 0
        };
        mapData.layers.push(logicLayer);
    }

    let objId = 5000; // Start IDs high to avoid conflicts

    // 2. Inject SCHOOL_LOCATIONS (Points)
    for (const [key, pos] of Object.entries(SCHOOL_LOCATIONS)) {
        logicLayer.objects.push({
            id: objId++,
            name: key,
            type: "location",
            point: true, // It's a point object
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            properties: [
                { name: "location_id", type: "string", value: key }
            ]
        });
        console.log(`-> Injected Location: ${key}`);
    }

    // 3. Inject INFIRMARY STUFF
    INFIRMARY_BEDS.forEach((pos, idx) => {
        logicLayer.objects.push({
            id: objId++,
            name: `infirmary_bed_${idx}`,
            type: "infirmary_bed",
            point: true,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0
        });
    });
    logicLayer.objects.push({
        id: objId++,
        name: "infirmary_exit",
        type: "exit",
        point: true,
        x: INFIRMARY_EXIT.x,
        y: INFIRMARY_EXIT.y,
        width: 0,
        height: 0
    });
    console.log(`-> Injected Infirmary Logic`);

    // 4. Inject DUEL ZONES (Circles/Ellipses)
    DUEL_ZONES.forEach(zone => {
        // Tiled ellipses are defined by top-left box.
        // Our config has center {x,y} and radius.
        const width = zone.radius * 2;
        const height = zone.radius * 2;
        const topLeftX = zone.x - zone.radius;
        const topLeftY = zone.y - zone.radius;

        logicLayer.objects.push({
            id: objId++,
            name: `duel_zone_${zone.id}`,
            type: "duel_zone",
            shape: "ellipse", // Custom property for parser later? No, Tiled has specific format.
            ellipse: true, // This marks it as ellipse in Tiled JSON
            x: topLeftX,
            y: topLeftY,
            width: width,
            height: height,
            properties: [
                { name: "zone_id", type: "int", value: zone.id }
            ]
        });
    });
    console.log(`-> Injected Duel Zones`);
    
    // 5. Inject DUEL EXITS
    DUEL_EXITS.forEach((pos, idx) => {
        logicLayer.objects.push({
            id: objId++,
            name: `duel_exit_${idx}`,
            type: "duel_exit",
            point: true,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0
        });
    });

    // 6. Save
    fs.writeFileSync(MAP_PATH, JSON.stringify(mapData, null, 2));
    console.log(`SUCCESS: Map updated. New 'Logic' layer added.`);
}

migrate();
