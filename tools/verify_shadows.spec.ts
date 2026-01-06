import { test, expect, chromium } from '@playwright/test';

test('Verify Table Shadows', async () => {
  // Launch headless browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Navigating to game...');
  // Use a distinct user to avoid conflicts
  await page.goto('http://localhost:3000/?dev_user=ShadowTester&skin=player_idle');

  // Wait for game load (physics, map, connection)
  await page.waitForTimeout(5000); 

  console.log('Taking snapshot with mouse at Center...');
  await page.mouse.move(640, 360); 
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/shadow_verification_center.png' });

  console.log('Taking snapshot with mouse at Top-Left...');
  await page.mouse.move(100, 100); 
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/shadow_verification_topleft.png' });

  console.log('Screenshots saved.');
  await browser.close();
});
