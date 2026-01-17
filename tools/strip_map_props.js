const fs = require('fs');
const path = require('path');

const mapPath = path.join('assets', 'maps', 'world.json');

try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    console.log(`Original size: ${JSON.stringify(map).length} chars`);

    const seatsLayer = map.layers.find(l => l.name === "FixedSeats");
    if (seatsLayer && seatsLayer.objects) {
        let propsRemoved = 0;
        seatsLayer.objects.forEach(obj => {
            if (obj.properties) {
                propsRemoved += obj.properties.length;
                delete obj.properties;
            }
        });
        console.log(`Removed properties from ${seatsLayer.objects.length} objects.`);
    }

    fs.writeFileSync(mapPath, JSON.stringify(map, null, 1));
    console.log(`Optimized size: ${JSON.stringify(map).length} chars`);

} catch (e) {
    console.error("Error cleaning map:", e);
}