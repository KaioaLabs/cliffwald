import { test, expect, chromium } from '@playwright/test';

test('Visual Regression: Day/Night Cycle', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Navigating to game...');
  // Use dev_login to skip registration flow
  await page.goto('http://localhost:3000/?dev_user=Visual_Audit&skin=player_idle');

  // Wait for load
  await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.network.room);
  await page.waitForTimeout(2000); // Stabilize render

  // 1. Snapshot: Day
  console.log('Capturing DAY snapshot...');
  await page.evaluate(() => (window as any).gameClient.network.room.send("admin_time_jump", { hour: 12.0 }));
  await page.waitForTimeout(1000);
  
  // Hide UI for cleaner render check (optional)
  await page.evaluate(() => document.getElementById('ui-layer')?.setAttribute('style', 'display:none'));
  
  const dayBuffer = await page.screenshot();
  expect(dayBuffer).toMatchSnapshot('audit_visual_day.png', { maxDiffPixelRatio: 0.1 });

  // 2. Snapshot: Night (Lights ON)
  console.log('Capturing NIGHT snapshot...');
  await page.evaluate(() => (window as any).gameClient.network.room.send("admin_time_jump", { hour: 23.0 }));
  await page.waitForTimeout(1000);
  
  const nightBuffer = await page.screenshot();
  expect(nightBuffer).toMatchSnapshot('audit_visual_night.png', { maxDiffPixelRatio: 0.1 });

  await browser.close();
});
