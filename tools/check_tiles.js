const fs = require('fs');
const map = JSON.parse(fs.readFileSync('assets/maps/world.json', 'utf8'));

function getTileAt(x, y, layerName) {
    const layer = map.layers.find(l => l.name === layerName);
    if (!layer || !layer.data) return 0;
    const tx = Math.floor(x / 32);
    const ty = Math.floor(y / 32);
    return layer.data[ty * map.width + tx];
}

const coords = [
    { name: 'Library', x: 1600, y: 1800 },
    { name: 'Dungeon', x: 200, y: 2000 },
    { name: 'Academic', x: 1600, y: 1360 }
];

coords.forEach(c => {
    console.log(`${c.name} (${c.x}, ${c.y}): Furniture Tile ID = ${getTileAt(c.x, c.y, 'Furniture')}`);
});
