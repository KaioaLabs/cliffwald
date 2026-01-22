const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '../assets/maps/world.json');

// Simple BFS Flood Fill to check reachability
function checkConnectivity() {
    console.log(`[AUDIT] Loading Map: ${MAP_PATH}`);
    const mapData = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
    
    const MAP_W = mapData.width;
    const MAP_H = mapData.height;
    
    // 1. Build Grid (0 = Walkable, 1 = Wall)
    const grid = new Array(MAP_W * MAP_H).fill(0);
    
    // Fill from Ground Layer (Water = Wall for walking purposes usually, but let's stick to Walls)
    // Actually, in our logic, only "Collisions" layer matters.
    const collisionLayer = mapData.layers.find(l => l.name === "Collisions");
    const terrainLayer = mapData.layers.find(l => l.name === "L1_Terrain"); // V5 Name
    
    if (!collisionLayer) { console.error("No Collision Layer found!"); return; }

    // Mark Static Walls
    collisionLayer.objects.forEach(obj => {
        const tx = Math.floor(obj.x / 32);
        const ty = Math.floor(obj.y / 32);
        const tw = Math.floor(obj.width / 32);
        const th = Math.floor(obj.height / 32);
        
        for(let y=ty; y<ty+th; y++) {
            for(let x=tx; x<tx+tw; x++) {
                if (x>=0 && x<MAP_W && y>=0 && y<MAP_H) {
                    grid[y*MAP_W + x] = 1; 
                }
            }
        }
    });

    // Also check Water in Terrain layer (Implicit collision)
    // TILE_WATER = 1.
    if (terrainLayer && terrainLayer.data) {
        terrainLayer.data.forEach((tileId, idx) => {
            if (tileId === 1) grid[idx] = 1; 
        });
    }

    // 2. Define Targets (Points that MUST be reachable)
    // Offset Applied: OX=190, OY=170
    const OX = 190;
    const OY = 170;
    
    const TARGETS = [
        { name: "Spawn (Courtyard)", x: 60 + OX, y: 90 + OY },
        { name: "Dorm Ignis (Bed)", x: 47 + OX, y: 34 + OY },
        { name: "Dorm Vesper (Bed)", x: 19 + OX, y: 52 + OY },
        { name: "Dorm Axiom (Bed)", x: 80 + OX, y: 52 + OY },
        { name: "Classroom (Desk)", x: 80 + OX, y: 87 + OY },
        { name: "Bathrooms (Interior)", x: 30 + OX, y: 90 + OY },
        { name: "Great Hall (Table)", x: 60 + OX, y: 110 + OY },
        { name: "Forest (Merchant)", x: 60 + OX, y: 140 + OY }
    ];

    // 3. Run Flood Fill
    const startNode = TARGETS[0]; // Start at Spawn
    const visited = new Set();
    const queue = [startNode];
    const startIdx = startNode.y * MAP_W + startNode.x;
    
    if (grid[startIdx] === 1) {
        console.error("❌ CRITICAL: Spawn Point is inside a Wall/Water!");
        return;
    }

    visited.add(startIdx);

    // BFS
    while(queue.length > 0) {
        const curr = queue.shift();
        const idx = curr.y * MAP_W + curr.x;

        // Neighbors (Up, Down, Left, Right)
        const neighbors = [
            {x: curr.x, y: curr.y - 1},
            {x: curr.x, y: curr.y + 1},
            {x: curr.x - 1, y: curr.y},
            {x: curr.x + 1, y: curr.y}
        ];

        for(const n of neighbors) {
            if (n.x < 0 || n.x >= MAP_W || n.y < 0 || n.y >= MAP_H) continue;
            const nIdx = n.y * MAP_W + n.x;
            
            if (!visited.has(nIdx) && grid[nIdx] === 0) {
                visited.add(nIdx);
                queue.push(n);
            }
        }
    }

    // 4. Verification
    console.log(`[AUDIT] Flood Fill Complete. Reached ${visited.size} tiles.`);
    let success = true;

    console.log("\n--- CONNECTIVITY REPORT ---");
    TARGETS.forEach(t => {
        const idx = t.y * MAP_W + t.x;
        const reachable = visited.has(idx);
        const icon = reachable ? "✅" : "❌";
        const status = reachable ? "ACCESSIBLE" : "BLOCKED";
        
        console.log(`${icon} ${t.name.padEnd(20)}: ${status} (x:${t.x}, y:${t.y})`);
        
        if (!reachable) {
            success = false;
            // Debug: Check if target itself is a wall
            if (grid[idx] === 1) console.log(`   -> REASON: Target point is inside a wall/water.`);
            else console.log(`   -> REASON: Path obstructed.`);
        }
    });

    if (success) console.log("\n[SUCCESS] All critical zones are connected!");
    else console.error("\n[FAILURE] Some zones are isolated. Check generator logic.");
}

checkConnectivity();
