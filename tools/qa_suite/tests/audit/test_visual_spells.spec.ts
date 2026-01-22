import { test, expect, chromium } from '@playwright/test';

test('Visual Spell Effects Test', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Navigating to game...');
  await page.goto('http://localhost:3000/?dev_user=VfxTester&skin=player_idle');
  await page.waitForTimeout(5000); 

  // --- TEST 1: TRIANGLE (STARS & GLOW) ---
  console.log('Drawing Triangle (Visual Check)...');
  const tx = 500, ty = 400, size = 120;
  
  await page.mouse.move(tx, ty);
  await page.mouse.down({ button: 'right' });
  
  // Mid-drawing capture (Stars trail)
  await page.mouse.move(tx + size/2, ty - size, { steps: 5 });
  await page.screenshot({ path: 'screenshots/vfx_trail_stars.png' });
  console.log('Capture: Stars trail');

  // Complete drawing
  await page.mouse.move(tx + size, ty, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 5 });
  await page.mouse.up({ button: 'right' });

  // Capture Completion (Glowing Shape + Light)
  await page.waitForTimeout(100); 
  await page.screenshot({ path: 'screenshots/vfx_cast_triangle.png' });
  console.log('Capture: Glowing Triangle');

  // --- TEST 2: SQUARE ---
  console.log('Drawing Square...');
  const sx = 800, sy = 400;
  await page.mouse.move(sx, sy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(sx + 100, sy, { steps: 5 });
  await page.mouse.move(sx + 100, sy + 100, { steps: 5 });
  await page.mouse.move(sx, sy + 100, { steps: 5 });
  await page.mouse.move(sx, sy, { steps: 5 });
  await page.mouse.up({ button: 'right' });

  await page.waitForTimeout(100);
  await page.screenshot({ path: 'screenshots/vfx_cast_square.png' });
  console.log('Capture: Glowing Square');

  await browser.close();
});
