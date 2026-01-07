const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '../assets/maps/world.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const TILE_SIZE = 32;

const locations = {
    DORM_IGNIS: { x: 576, y: 480 },
    DORM_AXIOM: { x: 576, y: 1120 },
    DORM_VESPER: { x: 576, y: 1760 },
    GREAT_HALL: { x: 1600, y: 560 },
    CLASSROOM: { x: 1440, y: 1312 }
};

const objects = [];
let objId = 2000;

// 1. Generate Beds (8 per house)
['ignis', 'axiom', 'vesper'].forEach((house, houseIdx) => {
    const base = locations[`DORM_${house.toUpperCase()}`];
    for (let i = 0; i < 8; i++) {
        const studentIdx = i + (houseIdx * 8);
        objects.push({
            id: objId++,
            name: `bed_${studentIdx}`,
            type: 'bed',
            x: base.x + (i - 3.5) * (TILE_SIZE * 2),
            y: base.y,
            width: 32,
            height: 32,
            properties: [
                { name: 'studentId', type: 'int', value: studentIdx },
                { name: 'house', type: 'string', value: house }
            ],
            visible: true,
            rotation: 0
        });
    }
});

// 2. Generate Classroom Seats (24)
for (let i = 0; i < 24; i++) {
    const seatRow = Math.floor(i / 8); 
    const seatCol = Math.floor((i % 8) / 2); 
    const seatSide = i % 2; 

    const tableX = locations.CLASSROOM.x + (seatCol * 96);
    const tableY = locations.CLASSROOM.y + (seatRow * 64);
    
    objects.push({
        id: objId++,
        name: `seat_class_${i}`,
        type: 'seat_class',
        x: tableX + 16 + (seatSide * 32),
        y: tableY + 40,
        width: 32,
        height: 32,
        properties: [{ name: 'studentId', type: 'int', value: i }],
        visible: true,
        rotation: 0
    });
}

// 3. Generate Great Hall Seats (24)
['ignis', 'vesper', 'axiom'].forEach((house, houseIdx) => {
    const yOffset = house === 'ignis' ? -64 : (house === 'vesper' ? 64 : 0);
    for (let i = 0; i < 8; i++) {
        const studentIdx = i + (houseIdx * 8); // simplified mapping
        objects.push({
            id: objId++,
            name: `seat_food_${studentIdx}`,
            type: 'seat_food',
            x: locations.GREAT_HALL.x + (i - 3.5) * TILE_SIZE,
            y: locations.GREAT_HALL.y + yOffset,
            width: 32,
            height: 32,
            properties: [
                { name: 'studentId', type: 'int', value: studentIdx },
                { name: 'house', type: 'string', value: house }
            ],
            visible: true,
            rotation: 0
        });
    }
});

const newLayer = {
    draworder: "topdown",
    id: 100,
    name: "FixedSeats",
    objects: objects,
    opacity: 1,
    type: "objectgroup",
    visible: true,
    x: 0,
    y: 0
};

// Insert at the beginning of layers
map.layers.unshift(newLayer);

fs.writeFileSync(mapPath, JSON.stringify(map, null, 1));
console.log("Successfully injected FixedSeats layer with 72 markers.");
