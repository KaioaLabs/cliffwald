const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

const frames = [
    { name: 'frame_bronze.png', color: [205, 127, 50] }, // Bronze
    { name: 'frame_silver.png', color: [192, 192, 192] }, // Silver
    { name: 'frame_gold.png', color: [255, 215, 0] }      // Gold
];

const outputDir = path.join(__dirname, '../assets/ui/frames');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

frames.forEach(frame => {
    const width = 64;
    const height = 86;
    const png = new PNG({ width, height });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            
            // Simple border effect
            const isBorder = x < 4 || x >= width - 4 || y < 4 || y >= height - 4;
            
            if (isBorder) {
                png.data[idx] = frame.color[0];
                png.data[idx + 1] = frame.color[1];
                png.data[idx + 2] = frame.color[2];
                png.data[idx + 3] = 255; // Alpha
            } else {
                // Transparent center
                png.data[idx] = 0;
                png.data[idx + 1] = 0;
                png.data[idx + 2] = 0;
                png.data[idx + 3] = 0; 
            }
        }
    }

    const filePath = path.join(outputDir, frame.name);
    png.pack().pipe(fs.createWriteStream(filePath))
        .on('finish', () => console.log(`Generated: ${filePath}`))
        .on('error', (err) => console.error(`Error generating ${filePath}:`, err));
});
