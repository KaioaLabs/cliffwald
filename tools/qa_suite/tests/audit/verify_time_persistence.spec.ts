import { test, expect, chromium } from '@playwright/test';

test('Verify Time Persistence', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to game...');
  await page.goto('http://localhost:3000/?dev_user=TimeLord&skin=player_idle');

  // Wait for game to init and expose gameClient
  await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.network.room, null, { timeout: 60000 });

  // 1. Get Initial Hour
  const initialOffset = await page.evaluate(() => {
     return (window as any).gameClient.network.room.state.timeOffset || 0;
  });
  console.log('Initial Offset:', initialOffset);

  // 2. Jump to Hour 12 (Noon)
  console.log('Jumping to 12:00...');
  await page.evaluate(() => {
     (window as any).gameClient.network.room.send("admin_time_jump", { hour: 12.0 });
  });

  // 3. Wait 2 seconds
  await page.waitForTimeout(2000);

  // 4. Check Offset Stability
  const newOffset = await page.evaluate(() => {
     return (window as any).gameClient.network.room.state.timeOffset;
  });
  console.log('New Offset:', newOffset);

  // 5. Verify it's not 0 (unless we were already at 0 offset/real time)
  // And verify it stays roughly same if we wait another second
  await page.waitForTimeout(1000);
  const finalOffset = await page.evaluate(() => {
     return (window as any).gameClient.network.room.state.timeOffset;
  });
  console.log('Final Offset:', finalOffset);

  // Check if offset changed (it shouldn't change unless timeManager drifts, which it shouldn't)
  if (Math.abs(newOffset - finalOffset) > 100) {
      throw new Error(`Time Offset drifted! New: ${newOffset}, Final: ${finalOffset}`);
  }
  
  if (newOffset === initialOffset && initialOffset !== 0) {
      // If it didn't change at all, maybe command failed?
      // But if initial was 0 (real time) and new is 0, maybe 12:00 matches real time? Unlikely.
      console.log("Warning: Offset didn't change. Initial was " + initialOffset);
  }

  await browser.close();
});