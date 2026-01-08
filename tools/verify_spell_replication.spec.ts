import { test, expect, chromium } from '@playwright/test';

test('Verify Spell Replication', async () => {
  const browser = await chromium.launch({ headless: true }); // Headless true for speed, set to false if debugging visual
  
  // User A (Caster)
  const contextA = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const pageA = await contextA.newPage();
  pageA.on('console', msg => console.log(`A: ${msg.text()}`));
  
  // User B (Observer)
  const contextB = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const pageB = await contextB.newPage();
  pageB.on('console', msg => console.log(`B: ${msg.text()}`));

  console.log('Navigating User A...');
  await pageA.goto('http://localhost:3000/?dev_user=CasterA&skin=player_idle');
  
  console.log('Navigating User B...');
  await pageB.goto('http://localhost:3000/?dev_user=ObserverB&skin=player_blue');

  // Wait for login and sync
  await Promise.all([
    pageA.waitForTimeout(4000),
    pageB.waitForTimeout(4000)
  ]);

  // Ensure they are close (Spawn point is usually 300,300 or similar, let's assume they are visible to each other)
  // We can force move them to be sure, but default spawn logic usually places them nearby.
  
  console.log('User A Casting Triangle...');
  const center = { x: 320, y: 180 }; // Screen center
  const size = 60;

  // Perform Triangle Gesture on Page A
  await pageA.mouse.move(center.x, center.y);
  await pageA.mouse.down({ button: 'right' });
  await pageA.mouse.move(center.x + size/2, center.y - size, { steps: 10 });
  await pageA.mouse.move(center.x + size, center.y, { steps: 10 });
  await pageA.mouse.move(center.x, center.y, { steps: 10 });
  await pageA.mouse.up({ button: 'right' });

  // Wait for network propagation
  console.log('Waiting for replication...');
  await pageA.waitForTimeout(500); // Wait for cast to register locally
  await pageB.waitForTimeout(1000); // Wait for projectile to travel a bit

  // Capture Observer's View
  console.log('Capturing Observer View...');
  await pageB.screenshot({ path: 'screenshots/replication_observer.png' });
  
  // Also capture Caster View for comparison
  await pageA.screenshot({ path: 'screenshots/replication_caster.png' });

  await browser.close();
});
