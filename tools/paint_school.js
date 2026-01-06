const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');

try {
    const rawData = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(rawData);
    
    // NEW SCALE: 100x100 tiles
    map.width = 100;
    map.height = 100;
    const width = 100;
    const height = 100;
    const TILE_SIZE = 32;

    // Update ALL layers to match new dimensions
    map.layers.forEach(layer => {
        layer.width = width;
        layer.height = height;
    });

    const groundLayer = map.layers.find(l => l.name === 'Ground');
    const collisionLayer = map.layers.find(l => l.name === 'Collisions');
    const entitiesLayer = map.layers.find(l => l.name === 'Entities');

    // Reset Map Data
    groundLayer.data = new Array(width * height).fill(1); // All Grass
    collisionLayer.objects = [];
    entitiesLayer.objects = [];

    const data = groundLayer.data;

    function addCollision(tx, ty) {
        collisionLayer.objects.push({
            x: tx * TILE_SIZE,
            y: ty * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            visible: true,
            type: 'Wall'
        });
    }

    function clearCollision(tx, ty) {
        collisionLayer.objects = collisionLayer.objects.filter(o => 
            !(o.x === tx * TILE_SIZE && o.y === ty * TILE_SIZE)
        );
    }

    function paintRoom(name, tx, ty, tw, th) {
        // 1. Floor
        for (let y = ty; y < ty + th; y++) {
            for (let x = tx; x < tx + tw; x++) {
                data[y * width + x] = 2;
            }
        }
        // 2. Walls
        for (let x = tx - 1; x <= tx + tw; x++) {
            data[(ty - 1) * width + x] = 3; addCollision(x, ty - 1);
            data[(ty + th) * width + x] = 3; addCollision(x, ty + th);
        }
        for (let y = ty; y < ty + th; y++) {
            data[y * width + (tx - 1)] = 3; addCollision(tx - 1, y);
            data[y * width + (tx + tw)] = 3; addCollision(tx + tw, y);
        }
        // 3. Zone Entity
        entitiesLayer.objects.push({
            name: name,
            type: 'Zone',
            x: tx * TILE_SIZE, y: ty * TILE_SIZE,
            width: tw * TILE_SIZE, height: th * TILE_SIZE
        });
    }

    function paintCorridor(x1, y1, x2, y2) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                data[y * width + x] = 2;
                clearCollision(x, y); // CRITICAL: Remove walls where corridors pass
            }
        }
    }

    function addDoor(rx, ry, rw, rh, side = 'bottom') {
        let dx, dy;
        if (side === 'bottom') { dx = rx + Math.floor(rw/2); dy = ry + rh; }
        if (side === 'top') { dx = rx + Math.floor(rw/2); dy = ry - 1; }
        if (side === 'right') { dx = rx + rw; dy = ry + Math.floor(rh/2); }
        if (side === 'left') { dx = rx - 1; dy = ry + Math.floor(rh/2); }

        data[dy * width + dx] = 2; clearCollision(dx, dy);
        data[dy * width + dx + 1] = 2; clearCollision(dx + 1, dy);
        return { x: dx, y: dy };
    }

    // --- EXECUTE CONSTRUCTION ---
    
    // Dormitories (Left Wing)
    paintRoom('Dorm_Ignis', 10, 10, 16, 10); addDoor(10, 10, 16, 10, 'right');
    paintRoom('Dorm_Axiom', 10, 30, 16, 10); addDoor(10, 30, 16, 10, 'right');
    paintRoom('Dorm_Vesper', 10, 50, 16, 10); addDoor(10, 50, 16, 10, 'right');

    // Central Hub
    paintRoom('Great_Hall', 40, 10, 20, 15); addDoor(40, 10, 20, 15, 'left');
    paintRoom('Academic_Wing', 40, 35, 20, 15); addDoor(40, 35, 20, 15, 'left');

    // Right Wing
    paintRoom('Alchemy_Lab', 75, 15, 12, 10); addDoor(75, 15, 12, 10, 'left');
    paintRoom('Training_Grounds', 75, 40, 15, 15); addDoor(75, 40, 15, 15, 'left');

    // CORRIDORS
    // Main Spine (North-South)
    paintCorridor(32, 5, 35, 80);
    // Connectors
    paintCorridor(26, 15, 32, 17); // Ignis to spine
    paintCorridor(26, 35, 32, 37); // Axiom to spine
    paintCorridor(26, 55, 32, 57); // Vesper to spine
    
    paintCorridor(35, 17, 40, 19); // Spine to Great Hall
    paintCorridor(35, 42, 40, 44); // Spine to Academic
    
    paintCorridor(60, 20, 75, 22); // Great Hall to Alchemy
    paintCorridor(60, 47, 75, 49); // Academic to Training

    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log('[MAP PAINTER] 100x100 Castle built with proper door-corridor alignment.');

} catch (e) {
    console.error('[MAP PAINTER] Error:', e.message);
}
