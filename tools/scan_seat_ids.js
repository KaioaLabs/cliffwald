const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const mapPath = path.join('assets', 'maps', 'world.json');

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);

    const furnitureLayer = map.layers.find(l => l.name === "Furniture");
    const seatsLayer = map.layers.find(l => l.name === "FixedSeats");

    if (!furnitureLayer || !seatsLayer) {
        console.error("Layers missing!");
        process.exit(1);
    }

    // 1. Decode Furniture Data
    let tileData = [];
    if (furnitureLayer.encoding === 'base64') {
        const buffer = Buffer.from(furnitureLayer.data, 'base64');
        const decompressed = zlib.inflateSync(buffer);
        for (let i = 0; i < decompressed.length; i += 4) {
            tileData.push(decompressed.readUInt32LE(i));
        }
    } else if (Array.isArray(furnitureLayer.data)) {
        tileData = furnitureLayer.data;
    }

    const width = map.width;

    // 2. Correlate Objects with Tiles
    const stats = {};

    seatsLayer.objects.forEach(obj => {
        // Tiled objects are Bottom-Left origin? No, usually Top-Left unless changed.
        // But tiles are grid based.
        // Let's sample the center of the object.
        const tx = Math.floor((obj.x + obj.width / 2) / 32);
        const ty = Math.floor((obj.y + obj.height / 2) / 32);
        
        const tileIdx = ty * width + tx;
        const gid = tileData[tileIdx];

        if (!stats[obj.type]) stats[obj.type] = {};
        if (!stats[obj.type][gid]) stats[obj.type][gid] = 0;
        stats[obj.type][gid]++;
    });

    console.log("--- SEAT TILE GIDs ---");
    console.log(JSON.stringify(stats, null, 2));

} catch (e) {
    console.error(e);
}
