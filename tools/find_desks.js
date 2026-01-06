const fs = require('fs');

const map = JSON.parse(fs.readFileSync('assets/maps/world.json', 'utf8'));

// 1. Find 'table' tileset firstgid
let tableGid = -1;
map.tilesets.forEach(ts => {
    const src = ts.source || "";
    if (ts.name === 'table' || src.includes('table.tsx')) {
        tableGid = ts.firstgid;
        console.log(`Found 'table' tileset starting at GID: ${tableGid}`);
    }
});

if (tableGid === -1) {
    console.error("Could not find 'table' tileset");
    process.exit(1);
}

// 2. Find 'Furniture' layer
const furnitureLayer = map.layers.find(l => l.name === 'Furniture');
if (!furnitureLayer) {
    console.error("Could not find 'Furniture' layer");
    process.exit(1);
}

// 3. Scan for table tiles
const width = furnitureLayer.width;
const height = furnitureLayer.height;
const data = furnitureLayer.data;
const tables = [];

for (let i = 0; i < data.length; i++) {
    const gid = data[i];
    if (gid === tableGid) { // Assuming table is the first tile in the set
        const x = (i % width) * 32; // Assuming 32px grid
        const y = Math.floor(i / width) * 32;
        // In Tiled, objects are often anchored bottom-left. 
        // But tile layers are top-left grid cells.
        // A 64x32 table placed at (x,y) usually occupies (x,y) and (x+32, y) visually?
        // Or it's a single tile that renders big.
        
        tables.push({ x, y });
    }
}

console.log(`Found ${tables.length} tables.`);
console.log(JSON.stringify(tables, null, 2));
