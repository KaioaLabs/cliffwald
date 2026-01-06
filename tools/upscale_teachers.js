const fs = require('fs');
const { PNG } = require('pngjs');

function upscale(inputFile, outputFile) {
    fs.createReadStream(inputFile)
        .pipe(new PNG())
        .on('parsed', function() {
            const newWidth = this.width * 2;
            const newHeight = this.height * 2;
            const dst = new PNG({ width: newWidth, height: newHeight });

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = (this.width * y + x) << 2;
                    const r = this.data[idx];
                    const g = this.data[idx + 1];
                    const b = this.data[idx + 2];
                    const a = this.data[idx + 3];

                    // Map (x,y) to (2x, 2y) in destination (2x2 block)
                    for (let dy = 0; dy < 2; dy++) {
                        for (let dx = 0; dx < 2; dx++) {
                            const dstIdx = (newWidth * (y * 2 + dy) + (x * 2 + dx)) << 2;
                            dst.data[dstIdx] = r;
                            dst.data[dstIdx + 1] = g;
                            dst.data[dstIdx + 2] = b;
                            dst.data[dstIdx + 3] = a;
                        }
                    }
                }
            }

            dst.pack().pipe(fs.createWriteStream(outputFile))
                .on('finish', () => console.log(`Generated: ${outputFile}`));
        });
}

const basePath = "assets_External/Eris Esra's Character Template 4.0/16x32";
const targetPath = "assets/sprites";

upscale(`${basePath}/16x32 Idle-Sheet.png`, `${targetPath}/teacher_idle.png`);
upscale(`${basePath}/16x32 Run-Sheet.png`, `${targetPath}/teacher_run.png`);
