const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');

console.log(`[CLEANUP] Reading map from: ${mapPath}`);

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);

    if (!map.layers || !Array.isArray(map.layers)) {
        console.error("[ERROR] Invalid map format: 'layers' array missing.");
        process.exit(1);
    }

    const initialCount = map.layers.length;
    console.log(`[CLEANUP] Initial layer count: ${initialCount}`);

    // Filter Logic
    const keptLayers = map.layers.filter(layer => {
        const name = layer.name.toLowerCase();
        
        // Keywords to REMOVE
        if (name.includes("floor1") || name.includes("f1_")) return false;
        if (name.includes("floor2") || name.includes("f2_")) return false;
        if (name.includes("basement") || name.includes("base_")) return false;
        
        // Specific checks for standard Kaioa naming conventions if used
        if (name === "f1" || name === "f2" || name === "basement") return false;

        return true;
    });

    const removedCount = initialCount - keptLayers.length;
    
    if (removedCount > 0) {
        map.layers = keptLayers;
        console.log(`[CLEANUP] Removed ${removedCount} layers related to other floors.`);
        console.log(`[CLEANUP] Remaining layers: ${map.layers.length}`);

        // Write back
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 0)); // Minified to save space, Tiled will pretty-print on next save
        console.log("[SUCCESS] Map file updated.");
    } else {
        console.log("[CLEANUP] No layers found to remove. Map is already clean.");
    }

} catch (e) {
    console.error("[ERROR] Failed to clean map:", e);
    process.exit(1);
}
