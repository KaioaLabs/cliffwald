import { test, expect, chromium } from '@playwright/test';

test('Movement Verification Test', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Navigating to game...');
  await page.goto('http://localhost:3000/?dev_user=Mover&skin=player_idle');
  await page.waitForTimeout(5000); 

  // Capture Start
  await page.screenshot({ path: 'screenshots/move_01_start.png' });
  console.log('Capture: Start Position');

  // Move Right
  console.log('Holding Right...');
  await page.keyboard.down('d');
  await page.waitForTimeout(1000);
  await page.keyboard.up('d');
  
  // Wait for sync/settle
  await page.waitForTimeout(500);

  // Capture End
  await page.screenshot({ path: 'screenshots/move_02_end.png' });
  console.log('Capture: End Position');

  await browser.close();
});
