import * as fs from 'fs';
import * as path from 'path';
import { parseLogic } from '../src/shared/MapParser';

// 1. Load Real Map
const mapPath = path.join(process.cwd(), 'assets/maps/world.json');
console.log(`[AUDIT] Loading map from: ${mapPath}`);
const rawData = fs.readFileSync(mapPath, 'utf8');
const mapData = JSON.parse(rawData);

// 2. Verify Logic Layer Exists
const logicLayer = mapData.layers.find((l: any) => l.name === "Logic");
if (!logicLayer) {
    console.error("[AUDIT] FAIL: 'Logic' layer missing in world.json");
    process.exit(1);
}
console.log(`[AUDIT] PASS: 'Logic' layer found with ${logicLayer.objects.length} objects.`);

// 3. Test Parser
const logicData = parseLogic(mapData);
console.log(`[AUDIT] Parsed ${logicData.locations.size} locations.`);

// 4. Verify Critical Keys
const criticalKeys = ["DORM_IGNIS", "GREAT_HALL", "DETENTION", "LIBRARY"];
let missing = false;
criticalKeys.forEach(key => {
    if (!logicData.locations.has(key)) {
        console.error(`[AUDIT] FAIL: Critical location '${key}' missing.`);
        missing = true;
    } else {
        const loc = logicData.locations.get(key);
        console.log(`[AUDIT] OK: ${key} found at (${loc?.x}, ${loc?.y})`);
    }
});

// 5. Verify Duel Zones
if (logicData.duelZones.length !== 4) {
     console.error(`[AUDIT] FAIL: Expected 4 Duel Zones, found ${logicData.duelZones.length}`);
     missing = true;
} else {
    console.log(`[AUDIT] PASS: 4 Duel Zones found.`);
}

if (missing) process.exit(1);
console.log("[AUDIT] SUCCESS: Architecture transition verified.");
