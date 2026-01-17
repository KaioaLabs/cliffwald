const fs = require('fs');
const map = JSON.parse(fs.readFileSync('assets/maps/world.json', 'utf8'));
map.layers.forEach(l => console.log(`${l.name} (${l.type})`));
