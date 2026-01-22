const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function capture() {
    console.log("🌊 Starting Water Animation Capture (Internal Renderer Mode)...");

    const server = spawn('npm', ['run', 'dev:server'], { shell: true, cwd: path.join(__dirname, '..') });
    const client = spawn('npm', ['run', 'dev:client'], { shell: true, cwd: path.join(__dirname, '..') });

    await new Promise(r => setTimeout(r, 12000)); // 12s boot time

    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Enable Console Logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    const animDir = path.join(__dirname, '../assets/debug/screenshots_anim');
    if (!fs.existsSync(animDir)) fs.mkdirSync(animDir, { recursive: true });

    try {
        await page.goto('http://localhost:3000');
        // Wait for WaterManager specifically
        await page.waitForFunction(() => {
            const game = window.game;
            if (!game) return false;
            const scene = game.scene.getScene('GameScene');
            return scene && scene.waterManager && scene.waterManager.shader;
        }, null, { timeout: 20000 });

        // Setup Scene
        await page.evaluate(() => {
            const scene = window.game.scene.getScene('GameScene');
            if (scene) {
                scene.cameras.main.setBackgroundColor('#C2B280'); // Sand
                scene.cameras.main.stopFollow();
                scene.cameras.main.setScroll(0, 0); 
                scene.cameras.main.setZoom(2.0);
                
                if (scene.waterManager) {
                    scene.waterManager.shader.setVisible(true);
                }

                // Monkey-patch LightManager to prevent overwrite during game.step
                if (scene.lightManager) {
                    scene.lightManager._realUpdate = scene.lightManager.update.bind(scene.lightManager);
                    scene.lightManager.update = () => { /* Overwritten for test */ };
                    console.log("LightManager automatic updates disabled.");
                }

                // Hide UI
                const ui = document.getElementById('intro-screen'); if(ui) ui.style.display='none';
                const login = document.getElementById('login-screen'); if(login) login.style.display='none';
            }
        });

        console.log("📸 Capturing 3 lighting states: Day, Sunset, Night...");
        
        const lightingStates = [
            { hour: 12, label: "Day" },
            { hour: 18.5, label: "Sunset" },
            { hour: 0, label: "Night" }
        ];

        for (let i = 0; i < lightingStates.length; i++) {
            const state = lightingStates[i];
            
            const base64Data = await page.evaluate(async (hour) => {
                const game = window.game;
                const scene = game.scene.getScene('GameScene');
                
                if (scene && scene.lightManager && scene.waterManager) {
                    // 1. Manually trigger the REAL update logic
                    scene.lightManager._realUpdate(hour);
                    
                    // 2. Manually trigger water manager to pick up new light colors
                    scene.waterManager.update(Date.now(), 16);
                }

                // 3. Force Game Step
                game.step(Date.now(), 16);

                return new Promise((resolve) => {
                    game.renderer.snapshot((image) => {
                        resolve(image.src);
                    });
                });
            }, state.hour);

            // Save Base64 to File
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const buffer = Buffer.from(matches[2], 'base64');
                const outPath = path.join(animDir, `water_lighting_${state.label.toLowerCase()}.png`);
                fs.writeFileSync(outPath, buffer);
                console.log(`   [${i+1}/3] Saved: ${outPath} (${state.label})`);
            }
        }

        console.log("✅ Internal capture complete.");

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await browser.close();
        spawn("taskkill", ["/pid", server.pid, "/f", "/t"]);
        spawn("taskkill", ["/pid", client.pid, "/f", "/t"]);
        process.exit(0);
    }
}

capture();