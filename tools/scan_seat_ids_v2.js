const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const mapPath = path.join('assets', 'maps', 'world.json');

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);

    const furnitureLayer = map.layers.find(l => l.name === "Furniture");
    const groundLayer = map.layers.find(l => l.name === "Ground");
    const seatsLayer = map.layers.find(l => l.name === "FixedSeats");

    function decode(layer) {
        let tileData = [];
        if (layer.encoding === 'base64') {
            const buffer = Buffer.from(layer.data, 'base64');
            const decompressed = zlib.inflateSync(buffer);
            for (let i = 0; i < decompressed.length; i += 4) {
                tileData.push(decompressed.readUInt32LE(i));
            }
        }
        return tileData;
    }

    const furData = decode(furnitureLayer);
    const gndData = decode(groundLayer);
    const width = map.width;

    const stats = {};

    seatsLayer.objects.forEach(obj => {
        // Try Top-Left
        const tx = Math.floor(obj.x / 32);
        const ty = Math.floor(obj.y / 32);
        const tileIdx = ty * width + tx;

        const fGid = furData[tileIdx];
        const gGid = gndData[tileIdx];

        if (!stats[obj.type]) stats[obj.type] = { fur: {}, gnd: {} };
        
        if (!stats[obj.type].fur[fGid]) stats[obj.type].fur[fGid] = 0;
        stats[obj.type].fur[fGid]++;

        if (!stats[obj.type].gnd[gGid]) stats[obj.type].gnd[gGid] = 0;
        stats[obj.type].gnd[gGid]++;
    });

    console.log(JSON.stringify(stats, null, 2));

} catch (e) {
    console.error(e);
}
