const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../assets/data/items.csv');
const outputPath = path.join(__dirname, '../src/shared/data/items.json');

function sync() {
    if (!fs.existsSync(csvPath)) {
        console.error("CSV not found at " + csvPath);
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',');

    const items = {};

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const item = {};
        headers.forEach((h, index) => {
            let val = values[index];
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            item[h.trim()] = val;
        });
        
        if (item.ID) {
            items[item.ID] = item;
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Successfully synced ${Object.keys(items).length} items to ${outputPath}`);
}

sync();
