const fs = require('fs');
const path = require('path');

const mapPath = path.join('assets', 'maps', 'world.json');

try {
    const raw = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(raw);
    const totalSize = raw.length;

    console.log(`=== MAP AUDIT REPORT ===`);
    console.log(`Total Size: ${totalSize} chars`);
    console.log(`Dimensions: ${map.width}x${map.height} tiles`);
    console.log(`Compression: ${map.layers.find(l => l.type==='tilelayer')?.compression || 'None'}`);

    console.log(`\n--- TILESETS (The Heavy Hitters) ---`);
    map.tilesets.forEach((ts, i) => {
        const isExternal = !!ts.source;
        const size = JSON.stringify(ts).length;
        const percent = ((size / totalSize) * 100).toFixed(1);
        console.log(`[${i}] ${ts.name || ts.source} : ${isExternal ? 'EXTERNAL (.tsx)' : 'EMBEDDED (Dangerous)'}`);
        console.log(`    Size: ${size} chars (${percent}%)`);
        if (!isExternal) console.log(`    WARNING: Embedded tilesets bloat the map file!`);
    });

    console.log(`\n--- LAYERS BREAKDOWN ---`);
    map.layers.forEach((l, i) => {
        const size = JSON.stringify(l).length;
        const percent = ((size / totalSize) * 100).toFixed(1);
        let detail = "";
        
        if (l.type === 'tilelayer') {
            detail = `Encoding: ${l.encoding}, Data Len: ${l.data.length}`;
        } else if (l.type === 'objectgroup') {
            detail = `Objects: ${l.objects.length}`;
        }

        console.log(`[${i}] ${l.name} (${l.type})`);
        console.log(`    Size: ${size} chars (${percent}%) - ${detail}`);
        
        // Deep dive into objects if heavy
        if (l.type === 'objectgroup' && l.objects.length > 0) {
            const firstObj = l.objects[0];
            const props = firstObj.properties ? JSON.stringify(firstObj.properties).length : 0;
            console.log(`    Avg Props Size per Obj: ~${props} chars`);
        }
    });

} catch (e) {
    console.error(e);
}
