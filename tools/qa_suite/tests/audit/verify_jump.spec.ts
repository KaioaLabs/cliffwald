import { test, expect, chromium } from '@playwright/test';

test('Verify Jump Mechanic', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to game...');
  // Use Bob to avoid conflict with Audit_Hero if persistence lingers
  await page.goto('http://localhost:3000/?dev_user=Jumper_Bob&skin=player_idle');

  // Wait for game
  await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.network.room);

  // Setup Listener for Jump Broadcast
  const jumpReceived = page.evaluate(() => {
      return new Promise((resolve) => {
          const originalHandler = (window as any).gameClient.network.onPlayerJump;
          (window as any).gameClient.network.onPlayerJump = (id: string) => {
              if (originalHandler) originalHandler(id);
              resolve(id);
          };
      });
  });

  console.log('Pressing Space...');
  await page.keyboard.press('Space');

  console.log('Waiting for Jump Broadcast...');
  const jumperId = await jumpReceived;
  console.log(`Jump received from: ${jumperId}`);

  expect(jumperId).toBeTruthy();

  await browser.close();
});
