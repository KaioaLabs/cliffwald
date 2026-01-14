const fs = require('fs');
const PNG = require('pngjs').PNG;
const path = require('path');

const srcFile = path.join(__dirname, '../assets/sprites/player_jump_small.png');
const dstFile = path.join(__dirname, '../assets/sprites/player_jump.png');

fs.createReadStream(srcFile).pipe(new PNG()).on('parsed', function() {
    const factor = 2;
    const newWidth = this.width * factor;
    const newHeight = this.height * factor;
    const newPng = new PNG({ width: newWidth, height: newHeight });

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const srcX = Math.floor(x / factor);
            const srcY = Math.floor(y / factor);
            const srcIdx = (this.width * srcY + srcX) << 2;
            const dstIdx = (newWidth * y + x) << 2;

            newPng.data[dstIdx] = this.data[srcIdx];
            newPng.data[dstIdx + 1] = this.data[srcIdx + 1];
            newPng.data[dstIdx + 2] = this.data[srcIdx + 2];
            newPng.data[dstIdx + 3] = this.data[srcIdx + 3];
        }
    }

    newPng.pack().pipe(fs.createWriteStream(dstFile));
    console.log(`[JUMP] Upscaled jump sprite to ${newWidth}x${newHeight} (32x32 frames)`);
});
