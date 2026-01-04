const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);
    
    // Check for Lights layer
    const lightsLayer = map.layers.find(l => l.name === 'Lights');
    
    if (!lightsLayer) {
        console.log('[MAP FIX] "Lights" layer missing. Injecting empty Object Layer...');
        
        const newLayer = {
            draworder: "topdown",
            id: 999, // Arbitrary high ID to avoid conflict, ideally scan for max ID
            name: "Lights",
            objects: [],
            opacity: 1,
            type: "objectgroup",
            visible: true,
            x: 0,
            y: 0
        };
        
        map.layers.push(newLayer);
        
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 2)); // Pretty print? Tiled might reformat it.
        console.log('[MAP FIX] Success! "Lights" layer added.');
    } else {
        console.log('[MAP FIX] "Lights" layer already exists. Skipping.');
    }
} catch (e) {
    console.error('[MAP FIX] Error:', e.message);
}
