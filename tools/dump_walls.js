const fs = require('fs');
const map = JSON.parse(fs.readFileSync('assets/maps/world.json', 'utf8'));
const layer = map.layers.find(l => l.name === 'Collisions' || l.name === 'Collision');

if (layer && layer.objects) {
    console.log("Map Walls (Object Rectangles):");
    layer.objects.forEach(o => {
        console.log(`Wall: ${o.x}, ${o.y} size ${o.width}x${o.height}`);
    });
}
