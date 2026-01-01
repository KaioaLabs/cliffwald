import { test, expect, chromium } from '@playwright/test';

test('Gameplay Gesture Test', async () => {
  const browser = await chromium.launch({ headless: true }); // Run headless for the agent
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'screenshots/videos/' } // Optional: record video if needed
  });
  const page = await context.newPage();

  // 1. Go to Game (Alice)
  console.log('Navigating to game...');
  await page.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle');

  // 2. Wait for Connection (Look for UI Text)
  console.log('Waiting for connection...');
  await expect(page.locator('canvas')).toBeVisible();
  // Wait for "POS:" to appear in the canvas (we can't query canvas text directly easily, 
  // but we can wait for a bit or check if the socket connects if we had hooks).
  // Let's just wait 5 seconds for the game to init.
  await page.waitForTimeout(5000);

  // 3. Draw a Triangle (Right Click Drag)
  // Triangle pointing UP: Bottom-Left -> Top-Center -> Bottom-Right -> Bottom-Left
  const startX = 400;
  const startY = 400;
  const size = 100;

  console.log('Drawing Triangle...');
  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(100); // Input pacing
  
  // To Top
  await page.mouse.move(startX + size / 2, startY - size, { steps: 10 });
  // To Bottom Right
  await page.mouse.move(startX + size, startY, { steps: 10 });
  // To Close (Bottom Left)
  await page.mouse.move(startX, startY, { steps: 10 });
  
  await page.waitForTimeout(100);
  await page.mouse.up({ button: 'right' });

  console.log('Gesture Finished. Waiting for projectile...');
  
  // 4. Wait for Projectile Visuals & Capture
  await page.waitForTimeout(500); // Give time for the projectile to spawn and move
  await page.screenshot({ path: 'screenshots/test_gesture_triangle.png' });
  console.log('Screenshot saved: screenshots/test_gesture_triangle.png');

  // 5. Draw a Line (Swipe Up)
  console.log('Drawing Line...');
  await page.mouse.move(600, 400);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(600, 200, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/test_gesture_line.png' });
  console.log('Screenshot saved: screenshots/test_gesture_line.png');

  await browser.close();
});
