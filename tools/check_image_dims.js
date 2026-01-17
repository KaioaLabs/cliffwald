const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    // PNG signature is 8 bytes.
    // IHDR starts at byte 8.
    // Width is at byte 16 (4 bytes big endian).
    // Height is at byte 20 (4 bytes big endian).
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

const files = [
    'assets/sprites/player_idle.png',
    'assets/sprites/player_run.png',
    'assets/sprites/player_jump.png'
];

files.forEach(f => {
    try {
        const p = path.resolve(f);
        if (fs.existsSync(p)) {
            const dims = getPngDimensions(p);
            console.log(`${f}: ${dims.width}x${dims.height}`);
        } else {
            console.log(`${f}: NOT FOUND`);
        }
    } catch (e) {
        console.error(`${f}: Error`, e.message);
    }
});
