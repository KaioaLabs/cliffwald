const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);
    const groundLayer = map.layers.find(l => l.name === 'Ground');
    const collisionLayer = map.layers.find(l => l.name === 'Collisions');
    const entitiesLayer = map.layers.find(l => l.name === 'Entities');

    if (!groundLayer) throw new Error('Ground layer not found');

    const width = 50;
    const height = 50;
    const data = groundLayer.data;

    // Reset map to grass (Tile 1)
    for (let i = 0; i < data.length; i++) data[i] = 1;

    // Function to paint a zone and add collisions/labels
    function paintZone(name, tx, ty, tw, th, tileId) {
        const TILE_SIZE = 32;
        // 1. Paint tiles
        for (let y = ty; y < ty + th; y++) {
            for (let x = tx; x < tx + tw; x++) {
                data[y * width + x] = tileId;
            }
        }

        // 2. Add to Entities layer if missing
        if (entitiesLayer) {
            const existing = entitiesLayer.objects.find(o => o.name === name);
            if (!existing) {
                entitiesLayer.objects.push({
                    name: name,
                    type: 'Zone',
                    x: tx * TILE_SIZE,
                    y: ty * TILE_SIZE,
                    width: tw * TILE_SIZE,
                    height: th * TILE_SIZE,
                    visible: true,
                    rotation: 0
                });
            }
        }
    }

    // Paint the zones based on Config.ts coordinates (divided by 32 for tiles)
    
    // DORMITORIES
    paintZone('Dorm_Ignis', 10, 10, 6, 6, 2);
    paintZone('Dorm_Axiom', 10, 30, 6, 6, 2);
    paintZone('Dorm_Vesper', 35, 20, 6, 6, 2);

    // GREAT HALL (Dining)
    paintZone('Great_Hall', 25, 10, 10, 6, 2);

    // ACADEMIC WING
    paintZone('Academic_Wing', 25, 25, 8, 8, 3);

    // COURTYARD (Center)
    paintZone('Courtyard', 25, 18, 6, 4, 1);

    // TRAINING GROUNDS
    paintZone('Training_Grounds', 40, 35, 8, 8, 3);

    // ALCHEMY LAB
    paintZone('Alchemy_Lab', 40, 10, 6, 6, 3);

    // FOREST (Corner)
    paintZone('Forest', 5, 40, 10, 8, 1);

    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log('[MAP PAINTER] School zones successfully painted and registered.');

} catch (e) {
    console.error('[MAP PAINTER] Error:', e.message);
}
