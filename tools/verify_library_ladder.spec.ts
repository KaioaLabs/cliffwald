import { test, expect } from '@playwright/test';

test('Visual Verification: Library Ladder Mechanics', async ({ page }) => {
  console.log('🚀 Starting Library Ladder Visual Audit...');
  
  // Capture Console Logs
  page.on('console', msg => console.log(`[CLIENT] ${msg.text()}`));

  // 1. Login as Admin
  await page.goto('http://localhost:3000/?dev_user=Librarian&skin=player_idle');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);

  // 2. Teleport to Library (NEW COORDS: 2600, 1000)
  console.log('📚 Teleporting to Library...');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/tp 2600 1000');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  
  // 3. Verify Initial State (Ladder and Bookshelf)
  await page.screenshot({ path: 'screenshots/audit_library_base.png' });

  // 4. Move to Ladder Base and Mount (Press W near ladder)
  // Ladder is at 2600, 1000. Player is there.
  console.log('🧗 Mounting Ladder (Pressing W)...');
  await page.keyboard.down('W');
  await page.waitForTimeout(500); // Small pulse to mount
  await page.keyboard.up('W');
  
  // 5. Climb UP (Hold W)
  console.log('⬆️ Climbing UP...');
  await page.keyboard.down('W');
  await page.waitForTimeout(1000); // Climb for 1s
  await page.keyboard.up('W');
  await page.screenshot({ path: 'screenshots/audit_ladder_climb_up.png' });

  // 6. Slide RIGHT (Hold D)
  console.log('➡️ Sliding Ladder RIGHT...');
  await page.keyboard.down('D');
  await page.waitForTimeout(1000); // Slide for 1s
  await page.keyboard.up('D');
  await page.screenshot({ path: 'screenshots/audit_ladder_slide_right.png' });

  console.log('✨ Library Audit Complete.');
});
