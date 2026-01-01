import { test, expect, chromium } from '@playwright/test';

test('Multiplayer Sync Test (Alice & Bob)', async () => {
  // Lanzamos el navegador (headless false para debug visual si fuera necesario, pero true para CI/CLI)
  const browser = await chromium.launch({ headless: true });
  
  // --- Contexto 1: Alice (La que actúa) ---
  const contextA = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageA = await contextA.newPage();
  
  // --- Contexto 2: Bob (El observador) ---
  const contextB = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const pageB = await contextB.newPage();

  console.log('1. Connecting Players...');
  // Bob entra primero para estar listo cuando Alice actúe
  const pB = pageB.goto('http://localhost:3000/?dev_user=Bob&skin=player_blue');
  const pA = pageA.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle');
  await Promise.all([pA, pB]);

  // Esperar conexión y carga inicial (Canvas visible)
  await expect(pageA.locator('canvas')).toBeVisible();
  await expect(pageB.locator('canvas')).toBeVisible();
  await pageA.waitForTimeout(3000); // Wait for stabilization

  // --- PRUEBA 1: MOVIMIENTO ---
  console.log('2. Alice Moving Right...');
  // Alice camina a la derecha durante 1.5s
  await pageA.keyboard.down('D');
  await pageA.waitForTimeout(1500);
  await pageA.keyboard.up('D');
  
  await pageB.waitForTimeout(500); // Esperar latencia de red
  console.log('   [SNAP] Bob viendo a Alice moverse');
  await pageB.screenshot({ path: 'screenshots/multiplayer_01_movement_sync.png' });

  // --- PRUEBA 2: HECHIZOS (TRIÁNGULO) ---
  console.log('3. Alice Casting Triangle...');
  // Coordenadas relativas al viewport de Alice
  const startX = 400; 
  const startY = 300;
  const size = 100;

  // Alice dibuja: Abajo-Izq -> Arriba-Centro -> Abajo-Der -> Abajo-Izq
  await pageA.mouse.move(startX, startY);
  await pageA.mouse.down({ button: 'right' });
  await pageA.waitForTimeout(50); // Pacing
  
  // Arriba
  await pageA.mouse.move(startX + size/2, startY - size, { steps: 10 });
  // Abajo Derecha
  await pageA.mouse.move(startX + size, startY, { steps: 10 });
  // Cerrar (Abajo Izquierda)
  await pageA.mouse.move(startX, startY, { steps: 10 });
  
  await pageA.waitForTimeout(50);
  await pageA.mouse.up({ button: 'right' });

  console.log('   Gesture Sent. Waiting for network replication...');
  
  // Esperamos un momento para que el proyectil viaje y sea visible en la pantalla de Bob
  await pageB.waitForTimeout(600); 
  
  console.log('   [SNAP] Bob viendo el hechizo de Alice');
  await pageB.screenshot({ path: 'screenshots/multiplayer_02_spell_sync.png' });

  await browser.close();
});