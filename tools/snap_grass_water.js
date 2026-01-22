const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function capture() {
    console.log("📷 Starting Grass & Water Snapshot...");

    // 1. Launch Server (if not running)
    // In this environment, we assume the user/admin has run 'start_online.bat' or equivalent.
    // But since this is an automated tool, we'll try to connect first, if fail, we launch.
    // For now, let's assume we run it ourselves for isolation.
    
    // KILL ANY PREVIOUS PROCESSES ON PORT 3000/2567/2568
    // Windows specific kill (simple)
    spawn("taskkill", ["/F", "/IM", "node.exe"], { stdio: 'ignore' }).on('error', () => {});

    console.log("   > Launching Server Stack...");
    const server = spawn('npm', ['run', 'dev:win'], { shell: true, cwd: path.join(__dirname, '..') });
    
    // Wait for boot
    await new Promise(r => setTimeout(r, 15000));

    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.setViewportSize({ width: 1280, height: 720 });
    
    const outDir = path.join(__dirname, '../assets/debug/screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    try {
        // 1. Login as Dev User (skips intro)
        // User 'VisualTester'
        const url = 'http://localhost:3000/?dev_user=VisualTester&skin=player_idle';
        console.log(`   > Navigating to ${url}`);
        await page.goto(url);

        // 2. Wait for Game Load
        await page.waitForFunction(() => {
            return window.game && 
                   window.game.scene.getScene('GameScene') && 
                   window.game.scene.getScene('GameScene').grassManager;
        }, null, { timeout: 30000 });

        console.log("   > Game Loaded.");

        // 3. Teleport to Ideal Location (Courtyard / Near Water)
        // We know from context:
        // - Grass is likely in Courtyard.
        // - Water is likely at edges or specific spots.
        // Let's teleport to a spot where we can see both if possible, or take two shots.
        // Based on GrassManager, it can generate test patches.
        // Let's force a test patch near the player if map doesn't have it.
        
        await page.evaluate(() => {
            const scene = window.game.scene.getScene('GameScene');
            if (scene) {
                // Force Camera Zoom
                scene.cameras.main.setZoom(1.5);
                
                // Teleport Player to open area (300, 300 is usually spawn/hall, let's go outside)
                // Courtyard usually central. Let's try 1400, 1400 (if map is large)
                // Or let's generate a patch around the player.
                
                // GENERATE GRASS PATCH
                if (scene.grassManager) {
                    scene.grassManager.generateTestPatch(scene.playerController.x, scene.playerController.y, 8);
                }

                // FORCE WATER (if possible to move camera to it, or bring it to player)
                // Water uses tiles or specific coordinates.
                // If we can't easily find water, we'll try to screenshot the current view which now has grass.
            }
        });

        // Wait for render
        await page.waitForTimeout(2000);

        // 4. Take Snapshot 1: Grass
        const grassPath = path.join(outDir, 'visual_grass.png');
        await page.screenshot({ path: grassPath });
        console.log(`   > Saved Grass Snapshot: ${grassPath}`);

        // 5. Try to find Water
        // Attempt to teleport to "South" (Isthmus/Forest) where water usually is?
        // Let's blindly teleport to 2000, 2000 or look for water tiles.
        // Or load the Water Test Scene directly!
        
        console.log("   > Switching to Water Test Scene...");
        await page.goto('http://localhost:3000/?scene=water');
        await page.waitForFunction(() => window.game && window.game.scene.getScene('GameScene'), null, { timeout: 30000 });
        
        await page.waitForTimeout(2000); // Wait for shader warm-up

        const waterPath = path.join(outDir, 'visual_water.png');
        await page.screenshot({ path: waterPath });
        console.log(`   > Saved Water Snapshot: ${waterPath}`);

    } catch (e) {
        console.error("❌ Capture failed:", e);
    } finally {
        await browser.close();
        // Clean up
        spawn("taskkill", ["/pid", server.pid, "/f", "/t"]);
        // Also ensure node processes are dead
        spawn("taskkill", ["/F", "/IM", "node.exe"], { stdio: 'ignore' });
        process.exit(0);
    }
}

capture();