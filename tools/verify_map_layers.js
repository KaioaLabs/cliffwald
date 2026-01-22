const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '../assets/maps/world.json');

try {
    const mapData = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
    
    console.log(`[MAP AUDIT] Loaded ${MAP_PATH}`);
    console.log(`Dimensions: ${mapData.width}x${mapData.height} (TileSize: ${mapData.tilewidth})`);

    const EXPECTED_LAYERS = [
        "L1_Terrain", 
        "L2_Floors", 
        "L3_Deco_Ground", 
        "L4_Walls_Base", 
        "L5_Overhead",
        "Collisions",
        "Logic",
        "FixedSeats",
        "Entities"
    ];

    const foundLayers = mapData.layers.map(l => l.name);
    console.log(`\nLayers Found: ${foundLayers.length}`);
    
    let allGood = true;

    EXPECTED_LAYERS.forEach(name => {
        const layer = mapData.layers.find(l => l.name === name);
        if (!layer) {
            console.error(`❌ MISSING LAYER: ${name}`);
            allGood = false;
        } else {
            // Check content density for tile layers
            let contentCount = 0;
            if (layer.type === 'tilelayer' && layer.data) {
                contentCount = layer.data.filter(t => t !== 0).length;
                console.log(`✅ ${name.padEnd(15)}: OK (${contentCount} tiles)`);
            } else if (layer.type === 'objectgroup' && layer.objects) {
                contentCount = layer.objects.length;
                console.log(`✅ ${name.padEnd(15)}: OK (${contentCount} objects)`);
            }
            
            if (contentCount === 0 && name !== "L3_Deco_Ground") { // Deco might be empty initially
                console.warn(`⚠️ WARNING: Layer ${name} is empty!`);
            }
        }
    });

    if (allGood) {
        console.log("\n[SUCCESS] Map Architecture V5 is valid.");
    } else {
        console.error("\n[FAILURE] Map structure is inconsistent with GDD V4.0");
        process.exit(1);
    }

} catch (e) {
    console.error("Error reading map:", e.message);
    process.exit(1);
}
