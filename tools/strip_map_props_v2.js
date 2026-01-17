const fs = require('fs');
const path = require('path');

const mapPath = path.join('assets', 'maps', 'world.json');

try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    console.log(`Original size: ${JSON.stringify(map).length} chars`);

    // Clean NPCs props (retain only name, x, y)
    const npcLayer = map.layers.find(l => l.name === "NPCs");
    if (npcLayer) {
        npcLayer.objects.forEach(obj => {
            if (obj.properties) delete obj.properties;
            // Retain 'type' if it helps visualization in Tiled (e.g. to show a specific icon)
            // But we can remove redundant ones.
        });
    }

    // Clean Logic props (retain name, x, y, width, height)
    const logicLayer = map.layers.find(l => l.name === "Logic");
    if (logicLayer) {
        logicLayer.objects.forEach(obj => {
            if (obj.properties) {
                // Keep 'toFloor' for stairs!
                const toFloor = obj.properties.find(p => p.name === 'toFloor');
                delete obj.properties;
                if (toFloor) obj.properties = [toFloor];
            }
        });
    }

    fs.writeFileSync(mapPath, JSON.stringify(map, null, 1));
    console.log(`Optimized size: ${JSON.stringify(map).length} chars`);

} catch (e) {
    console.error("Error cleaning map:", e);
}
