import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Capture Animation Sequence', async ({ page }) => {
    const outputDir = path.join(process.cwd(), 'screenshots_anim');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    console.log("Navegando a la escena de agua...");
    
    // Monitor Console Logs
    page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR]: ${err.message}`));

    await page.goto('http://localhost:3000/?scene=water');
    
    // Debug: Check URL and Scene
    const url = await page.evaluate(() => window.location.href);
    console.log("URL cargada:", url);
    
    await page.waitForTimeout(2000); // Esperar a que cargue

    for (let i = 0; i < 10; i++) {
        const filePath = path.join(outputDir, `water_frame_${i.toString().padStart(2, '0')}.png`);
        await page.screenshot({ path: filePath });
        console.log(`Capturado frame ${i}: ${filePath}`);
        await page.waitForTimeout(1000); // 1 segundo entre capturas
    }
});