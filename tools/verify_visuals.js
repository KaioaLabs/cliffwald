const { chromium } = require('playwright');

(async () => {
  console.log('[VERIFY] Launching Browser for visual check...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    console.log('[VERIFY] Connecting...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Wait for game load and login
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if we need to click start
    const intro = await page.$('#intro-screen');
    if (intro && await intro.isVisible()) {
        await page.click('#intro-screen');
        await new Promise(r => setTimeout(r, 2000));
    }

    // Auto-login as SmokeTester if login screen is visible
    const login = await page.$('#login-screen');
    if (login && await login.isVisible()) {
        await page.fill('#login-username', 'VisualChecker');
        await page.fill('#login-password', '123456');
        await page.click('#btn-login-action');
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log('[VERIFY] Inspecting Scene State...');
    const results = await page.evaluate(() => {
        const scene = window.game.scene.getScene('GameScene');
        if (!scene) return { error: 'GameScene not found' };

        return {
            waterActive: !!scene.waterManager && !!scene.waterManager.shader && scene.waterManager.shader.visible,
            grassActive: !!scene.grassManager && !!scene.grassManager.rows && (scene.grassManager.rows.size > 0 || scene.grassManager.meshes.length > 0),
            forceManagerActive: !!scene.forceManager && !!scene.forceManager.getTexture(),
            playerExists: scene.playerController.players.size > 0
        };
    });

    console.log('[VERIFY] Scene Systems Status:', results);

    if (results.waterActive && results.grassActive) {
        console.log('[VERIFY] SUCCESS: Water Shader and Grass Mesh are active.');
    } else {
        console.warn('[VERIFY] WARNING: Some visual systems are missing!', results);
    }

    // Take a dedicated screenshot of the Courtyard area (where grass is generated)
    await page.screenshot({ path: 'verify_visuals.png' });
    console.log('[VERIFY] Screenshot saved to verify_visuals.png');

  } catch (error) {
    console.error('[VERIFY] Error during check:', error);
  } finally {
    await browser.close();
  }
})();
