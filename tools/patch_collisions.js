
const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const furnitureLayer = mapData.layers.find(l => l.name === 'Furniture');
const collisionLayer = mapData.layers.find(l => l.name === 'Collisions');

if (!furnitureLayer || !collisionLayer) {
    console.error('Layers not found!');
    process.exit(1);
}

const width = mapData.width;
const tileWidth = mapData.tilewidth;
const tileHeight = mapData.tileheight;
let nextId = mapData.nextobjectid;

// Furniture GID is 4 (based on previous file read)
const TABLE_GID = 4;

let addedCount = 0;

for (let i = 0; i < furnitureLayer.data.length; i++) {
    if (furnitureLayer.data[i] === TABLE_GID) {
        // Calculate position
        // Tiled data is 1D array, row by row
        const xIndex = i % width;
        const yIndex = Math.floor(i / width);

        const xPixel = xIndex * tileWidth;
        const yPixel = yIndex * tileHeight;

        // Create collision object for top half
        // Table is 64x32. The tile anchor is usually bottom-left or top-left depending on Tiled.
        // Standard orthogonal maps: (x,y) is top-left of the tile.
        // The table image is 64x32. The tile in the map is at (x,y).
        // However, this tile might be an "object" or a "tile layer".
        // In "tile layer", placing a tile puts it in that grid cell.
        // The table is 64x32, which is 2 tiles wide (64) and 1 tile high (32).
        // But the tileset says tilewidth=64, tileheight=32.
        // Wait, let's check the tileset definition in world.json.
        // "tilewidth":32, "tileheight":32 for the map.
        // "table" tileset: tilewidth=64, tileheight=32.
        
        // If I paint a 64x32 tile on a 32x32 grid:
        // Tiled places the image such that it aligns with the grid.
        // Usually oversized tiles are anchored bottom-left.
        // BUT, looking at the data, we have `4, 0, 4`. This suggests tables are placed every other tile?
        // Or maybe they are just single items.
        
        // Assumption: The collision box should be 64 wide, 16 high.
        // Relative to the tile placement (xPixel, yPixel):
        // If anchored bottom-left, and height matches, it's fine.
        // Let's assume standard top-left alignment for the layer grid cell.
        
        const collisionObj = {
            id: nextId++,
            name: "Table_Col",
            type: "Wall",
            x: xPixel,
            y: yPixel, // Top of the tile
            width: 64, // Full width
            height: 16, // Top half only
            rotation: 0,
            visible: true
        };

        collisionLayer.objects.push(collisionObj);
        addedCount++;
    }
}

mapData.nextobjectid = nextId;

fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 1)); // Indent 1 space to match roughly
console.log(`Added ${addedCount} table collisions.`);
