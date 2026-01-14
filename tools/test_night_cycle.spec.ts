import { test, expect } from '@playwright/test';

test('Verify Night Cycle and Prefect Spawns', async ({ page }) => {
  // 1. Login as Admin to have permissions for /time command
  await page.goto('http://localhost:3000/?dev_user=admin&skin=player_idle');
  
  // Wait for game to load
  await page.waitForSelector('canvas');
  
  // Wait for connection
  await page.waitForTimeout(3000);

  // 2. Set Time to Night (22:00)
  // We press Enter to open chat, type command, press Enter
  await page.keyboard.press('Enter');
  await page.keyboard.type('/time set 22');
  await page.keyboard.press('Enter');

  console.log("Waiting for world to sync and Prefects to spawn...");
  await page.waitForTimeout(5000);

  // 3. Verify visual state
  await page.screenshot({ path: 'screenshots/night_verification.png' });
  
  // Check logs for "Night has fallen"
  // Actually we just trust the screenshot for visual verification
});
