const fs = require('fs');
const PNG = require('pngjs').PNG;
const path = require('path');

const sprites = [
    'player_idle.png',
    'player_idle_n.png',
    'player_run.png',
    'player_run_n.png'
];

const spritesDir = path.join(__dirname, '../assets/sprites');

function scalePNG(filename, factor) {
    const filePath = path.join(spritesDir, filename);
    const data = fs.readFileSync(filePath);
    const png = PNG.sync.read(data);

    const newWidth = png.width * factor;
    const newHeight = png.height * factor;
    const newPng = new PNG({ width: newWidth, height: newHeight });

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const srcX = Math.floor(x / factor);
            const srcY = Math.floor(y / factor);
            const srcIdx = (png.width * srcY + srcX) << 2;
            const dstIdx = (newWidth * y + x) << 2;

            newPng.data[dstIdx] = png.data[srcIdx];
            newPng.data[dstIdx + 1] = png.data[srcIdx + 1];
            newPng.data[dstIdx + 2] = png.data[srcIdx + 2];
            newPng.data[dstIdx + 3] = png.data[srcIdx + 3];
        }
    }

    fs.writeFileSync(filePath, PNG.sync.write(newPng));
    console.log(`[SCALER] Rescaled ${filename} to ${newWidth}x${newHeight}`);
}

sprites.forEach(s => scalePNG(s, 2));
