import { test, expect, chromium, Page } from '@playwright/test';

// Helper para dibujar gestos
async function drawGesture(page: Page, type: 'triangle' | 'square' | 'line', startX: number, startY: number) {
    const size = 100;
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(50);

    if (type === 'triangle') {
        // Up, Down-Right, Close Left
        await page.mouse.move(startX + size/2, startY - size, { steps: 10 });
        await page.mouse.move(startX + size, startY, { steps: 10 });
        await page.mouse.move(startX, startY, { steps: 10 });
    } else if (type === 'square') {
        // Right, Down, Left, Up
        await page.mouse.move(startX + size, startY, { steps: 10 });
        await page.mouse.move(startX + size, startY + size, { steps: 10 });
        await page.mouse.move(startX, startY + size, { steps: 10 });
        await page.mouse.move(startX, startY, { steps: 10 });
    } else if (type === 'line') {
        // Swipe Right
        await page.mouse.move(startX + size * 2, startY, { steps: 10 });
    }

    await page.waitForTimeout(50);
    await page.mouse.up({ button: 'right' });
}

test('Multiplayer Spell Battle (Alice vs Bob)', async () => {
  const browser = await chromium.launch({ headless: true });
  
  const contextA = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageA = await contextA.newPage();
  
  const contextB = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageB = await contextB.newPage();

  console.log('1. Connecting Alice and Bob...');
  
  const pA = pageA.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle');
  const pB = pageB.goto('http://localhost:3000/?dev_user=Bob&skin=player_blue');
  await Promise.all([pA, pB]);

  await pageA.waitForTimeout(4000); // Esperar conexión y física

  // Movemos a Bob un poco a la derecha para tener tiro limpio
  console.log('2. Positioning Bob...');
  await pageB.keyboard.down('D');
  await pageB.waitForTimeout(1000); // Moverse 1s a la derecha
  await pageB.keyboard.up('D');
  await pageB.waitForTimeout(500);

  // --- ROUND 1: Alice ataca (Triángulo) ---
  console.log('3. Alice casts TRIANGLE at Bob...');
  // Alice apunta al centro-derecha (donde está Bob)
  await drawGesture(pageA, 'triangle', 400, 300);
  
  await pageB.waitForTimeout(800); // Wait for projectile sync (Alice sends -> Server -> Bob)
  console.log('   [SNAP] Bob POV: Seeing Alice\'s Spell');
  await pageB.screenshot({ path: 'screenshots/mp_01_bob_sees_triangle.png' });

  // --- ROUND 2: Bob contraataca (Cuadrado) ---
  console.log('4. Bob casts SQUARE at Alice...');
  // Bob apunta a la izquierda (donde está Alice)
  await drawGesture(pageB, 'square', 200, 300); 
  
  await pageA.waitForTimeout(800);
  console.log('   [SNAP] Alice POV: Seeing Bob\'s Spell');
  await pageA.screenshot({ path: 'screenshots/mp_02_alice_sees_square.png' });

  // --- ROUND 3: Intercambio Final (Línea vs Línea) ---
  console.log('5. Both cast LINE simultaneously...');
  await Promise.all([
      drawGesture(pageA, 'line', 500, 200), // Alice dispara alto
      drawGesture(pageB, 'line', 300, 400)  // Bob dispara bajo
  ]);
  
  await pageA.waitForTimeout(800);
  console.log('   [SNAP] Alice POV: Chaos Exchange');
  await pageA.screenshot({ path: 'screenshots/mp_03_exchange.png' });

  await browser.close();
});
