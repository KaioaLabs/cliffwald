const fs = require('fs');
const PNG = require('pngjs').PNG;
const path = require('path');

const file = path.join(__dirname, '../assets/sprites/player_jump_small.png');
fs.createReadStream(file).pipe(new PNG()).on('parsed', function() {
    console.log(`Width: ${this.width}, Height: ${this.height}`);
});
