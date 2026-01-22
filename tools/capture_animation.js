const { chromium } = require('playwright');

(async () => {
  console.log('[ANIM] Launching Browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    console.log('[ANIM] Connecting...');
    await page.goto('http://localhost:3000');
    
    // Wait for Game Load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Attempt Auto-Login if needed
    try {
        await page.waitForSelector('#login-screen', { timeout: 5000 });
        if (await page.isVisible('#login-screen')) {
            console.log('[ANIM] Logging in...');
            await page.fill('#login-username', 'AnimTester');
            await page.fill('#login-password', '123456');
            await page.click('#btn-login-action');
        }
    } catch (e) { /* Already in game or intro */ }

    // Click intro if present
    try {
        const intro = await page.$('#intro-screen');
        if (intro && await intro.isVisible()) await intro.click();
    } catch (e) {}

    console.log('[ANIM] Waiting for scene to settle (5s)...');
    await page.waitForTimeout(5000);

    console.log('[ANIM] Starting Capture Loop (5 Frames, 1s interval)...');
    
    for (let i = 1; i <= 5; i++) {
        const filename = `anim_frame_${i}.png`;
        await page.screenshot({ path: filename });
        console.log(`[ANIM] Captured ${filename}`);
        
        // Simulate some mouse movement to trigger interactive grass force
        await page.mouse.move(640 + (i * 20), 360); 
        
        await page.waitForTimeout(1000); // Wait 1 second
    }

    console.log('[ANIM] Capture Complete.');

  } catch (error) {
    console.error('[ANIM] Error:', error);
  } finally {
    await browser.close();
  }
})();
