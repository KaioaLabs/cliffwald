import { test, expect, chromium } from '@playwright/test';

test('Full Multiplayer Audit: Movement & Spells', async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Context A: Alice (Top Left Window logic)
  const contextA = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const pageA = await contextA.newPage();
  
  // Context B: Bob
  const contextB = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const pageB = await contextB.newPage();

  console.log('1. Connecting Players...');
  // Force positions slightly apart or rely on spawn. 
  // We use different skins to identify them visually in screenshots.
  await pageA.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle');
  await pageB.goto('http://localhost:3000/?dev_user=Bob&skin=player_run'); 
  
  await pageA.waitForTimeout(5000); // Wait for connection/loading/hydration

  // --- MOVEMENT REPLICATION ---
  console.log('2. Testing Movement Replication...');
  
  // Move Alice Right
  console.log('Alice moving Right...');
  await pageA.keyboard.down('d');
  await pageA.waitForTimeout(1000);
  await pageA.keyboard.up('d');
  await pageA.waitForTimeout(500); // Sync time

  // Capture Bob's view (Should see Alice moved)
  await pageB.screenshot({ path: 'screenshots/audit_mv_01_bob_sees_alice_move.png' });
  
  // Move Bob Down
  console.log('Bob moving Down...');
  await pageB.keyboard.down('s');
  await pageB.waitForTimeout(1000);
  await pageB.keyboard.up('s');
  await pageB.waitForTimeout(500);

  // Capture Alice's view (Should see Bob moved)
  await pageA.screenshot({ path: 'screenshots/audit_mv_02_alice_sees_bob_move.png' });


  // --- SPELL REPLICATION ---
  console.log('3. Testing Spell Replication...');

  // Alice Casts Triangle (Up)
  console.log('Alice casting Triangle...');
  const ax = 512, ay = 384;
  await pageA.mouse.move(ax, ay);
  await pageA.mouse.down({ button: 'right' });
  await pageA.mouse.move(ax + 50, ay - 100, { steps: 5 }); // Top
  await pageA.mouse.move(ax + 100, ay, { steps: 5 });     // Right
  await pageA.mouse.move(ax, ay, { steps: 5 });           // Close
  await pageA.mouse.up({ button: 'right' });
  
  // Wait for projectile to spawn and travel
  await pageA.waitForTimeout(500);

  // Capture Bob's view (Should see Alice's Projectile)
  await pageB.screenshot({ path: 'screenshots/audit_spell_01_bob_sees_triangle.png' });

  // Bob Casts Line (Right)
  console.log('Bob casting Line...');
  const bx = 512, by = 384;
  await pageB.mouse.move(bx, by);
  await pageB.mouse.down({ button: 'right' });
  await pageB.mouse.move(bx + 100, by, { steps: 5 });
  await pageB.mouse.up({ button: 'right' });

  await pageB.waitForTimeout(500);

  // Capture Alice's view (Should see Bob's Projectile)
  await pageA.screenshot({ path: 'screenshots/audit_spell_02_alice_sees_line.png' });

  await browser.close();
});
