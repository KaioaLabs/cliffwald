const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

const SPRITE_DIR = path.join(__dirname, '../assets/sprites');
const FILES = ['player_idle.png', 'player_run.png'];

FILES.forEach(file => {
    const srcPath = path.join(SPRITE_DIR, file);
    const dstPath = path.join(SPRITE_DIR, file.replace('.png', '_n.png'));

    if (!fs.existsSync(srcPath)) {
        console.error(`File not found: ${srcPath}`);
        return;
    }

    fs.createReadStream(srcPath)
        .pipe(new PNG())
        .on('parsed', function() {
            const width = this.width;
            const height = this.height;
            const dst = new PNG({ width, height });

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (width * y + x) << 2;
                    const alpha = this.data[idx + 3];

                    if (alpha === 0) {
                        // Transparent: Write transparent normal
                        dst.data[idx] = 128; // R (X)
                        dst.data[idx + 1] = 128; // G (Y)
                        dst.data[idx + 2] = 255; // B (Z) - Flat
                        dst.data[idx + 3] = 0;   // Alpha
                        continue;
                    }

                    // Simple Edge Detection for Bevel
                    
                    let dx = 0;
                    let dy = 0;
                    const strength = 127; // Strong bevel

                    // Check Left
                    if (x > 0 && this.data[((width * y + (x - 1)) << 2) + 3] === 0) dx -= strength;
                    // Check Right
                    if (x < width - 1 && this.data[((width * y + (x + 1)) << 2) + 3] === 0) dx += strength;
                    
                    // Check Up (Top edge points UP -> Green > 128)
                    if (y > 0 && this.data[((width * (y - 1) + x) << 2) + 3] === 0) dy -= strength; 
                    
                    // Check Down (Bottom edge points DOWN -> Green < 128)
                    if (y < height - 1 && this.data[((width * (y + 1) + x) << 2) + 3] === 0) dy += strength;

                    // Normalize roughly
                    let nx = 128 + dx;
                    let ny = 128 + dy;
                    let nz = 255; // Simply point forward mostly
                    
                    dst.data[idx] = Math.max(0, Math.min(255, nx));
                    dst.data[idx + 1] = Math.max(0, Math.min(255, ny));
                    dst.data[idx + 2] = nz;
                    dst.data[idx + 3] = alpha;
                }
            }

            dst.pack().pipe(fs.createWriteStream(dstPath));
            console.log(`Generated Normal Map: ${dstPath}`);
        });
});