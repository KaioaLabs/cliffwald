const fs = require('fs');
const map = JSON.parse(fs.readFileSync('assets/maps/world.json', 'utf8'));

function isObjectNear(x, y, radius, layerName) {
    const layer = map.layers.find(l => l.name === layerName);
    if (!layer || !layer.objects) return false;
    return layer.objects.some(obj => {
        const dx = obj.x - x;
        const dy = obj.y - y;
        return Math.sqrt(dx*dx + dy*dy) < radius;
    });
}

const coords = [
    { name: 'Library', x: 2600, y: 1000 },
    { name: 'Dungeon', x: 500, y: 2800 }
];

coords.forEach(c => {
    const nearBeds = isObjectNear(c.x, c.y, 200, 'FixedSeats');
    console.log(`${c.name} near beds? ${nearBeds}`);
});
