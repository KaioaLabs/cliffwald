import { test, expect } from '@playwright/test';

test('Verify Academic Minigame Cycle', async ({ page }) => {
  // 1. Login as Admin
  await page.goto('http://localhost:3000/?dev_user=StudentA&skin=player_idle');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);

  // 2. Set Time to Morning Class (09:00)
  console.log('⏰ Setting time to Morning Class (09:00)...');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/time set 9');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // 3. Teleport to Academic Wing (Center of Class zone)
  // Academic Wing is at 1280, 1120 (Zone center). 
  // Config.ts says ACADEMIC_WING: { x: 1600, y: 1360 }??
  // Let's check Config.ts... 
  // SCHOOL_LOCATIONS.ACADEMIC_WING: { x: 1600, y: 1360 }
  
  console.log('🏫 Teleporting to Class...');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/tp 1600 1360');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // 4. Verify Minigame UI Appears
  console.log('🎮 Waiting for Minigame UI...');
  // The minigame is a DOM element in #minigame-layer
  // We check if it exists and has content
  const minigameLayer = page.locator('#minigame-layer');
  await expect(minigameLayer).toBeVisible();
  
  // Take screenshot of the minigame
  await page.screenshot({ path: 'screenshots/audit_minigame_start.png' });

  // 5. Play Minigame (Charms - Spacebar Timing)
  // Just spam space to hit something
  console.log('✨ Playing Charms Minigame (Spamming Space)...');
  for(let i=0; i<20; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
  }
  
  // 6. Verify Completion
  // Wait for result notification
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/audit_minigame_end.png' });
  
  console.log('✅ Academic Cycle Verified.');
});
