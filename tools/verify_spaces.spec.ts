import { test, expect } from '@playwright/test';

test('Verify Library and Dungeon visuals', async ({ page }) => {
  await page.goto('http://localhost:3000/?dev_user=AdminAudit&skin=player_idle');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);

  // 1. Check Library
  console.log('📚 Checking Library...');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/tp 2600 1000');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/verify_library.png' });

  // 2. Check Dungeon
  console.log('⛓️ Checking Dungeon...');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/tp 500 2800');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/verify_dungeon.png' });

  console.log('✅ Visual verification complete.');
});
