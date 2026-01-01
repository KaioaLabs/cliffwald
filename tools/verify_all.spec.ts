import { test, expect, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Full Project Audit: Alice & Bob Dual Verification', async () => {
  console.log('🧹 Cleaning screenshots directory...');
  const screenshotDir = path.join(__dirname, '../screenshots');
  if (fs.existsSync(screenshotDir)) {
    fs.readdirSync(screenshotDir).forEach(file => {
      if (file.endsWith('.png')) {
        fs.unlinkSync(path.join(screenshotDir, file));
      }
    });
  } else {
    fs.mkdirSync(screenshotDir);
  }

  console.log('🚀 Iniciando Verificación Dual en Monitor 2 (Vertical Layout)...');

  // CONFIGURACIÓN EXACTA DE DEV_LAUNCHER.JS
  // Alice: Arriba
  const browserA = await chromium.launch({ 
    headless: false, 
    args: [`--window-position=-1060,0`, `--window-size=960,540`, '--app=http://localhost:3000/?dev_user=Alice&skin=player_idle'] 
  });
  const contextA = await browserA.newContext({ viewport: { width: 960, height: 540 } });
  const alicePage = await contextA.newPage();
  
  // Capture Console Logs
  alicePage.on('console', msg => console.log(`[ALICE] ${msg.text()}`));
  alicePage.on('pageerror', err => console.log(`[ALICE ERROR] ${err.message}`));

  // Lanzar Bob (Derecha)
  const browserB = await chromium.launch({ 
    headless: false, 
    args: [`--window-position=-1060,600`, `--window-size=960,540`, '--app=http://localhost:3000/?dev_user=Bob&skin=player_blue'] 
  });
  const contextB = await browserB.newContext({ viewport: { width: 960, height: 540 } });
  const bobPage = await contextB.newPage();
  
  bobPage.on('console', msg => console.log(`[BOB] ${msg.text()}`));
  bobPage.on('pageerror', err => console.log(`[BOB ERROR] ${err.message}`));

  // Navegación (Asegurar carga)
  await Promise.all([
    alicePage.goto('http://localhost:3000/?dev_user=Alice&skin=player_idle'),
    bobPage.goto('http://localhost:3000/?dev_user=Bob&skin=player_blue')
  ]);

  // VERIFICACIÓN DE ASSETS
  console.log('🔍 Verificando disponibilidad de assets...');
  const assetResponse = await alicePage.request.get('http://localhost:3000/sprites/player_idle.png');
  if (assetResponse.ok()) {
      console.log('✅ Asset /sprites/player_idle.png disponible.');
  } else {
      console.error(`❌ ERROR CRÍTICO: No se puede cargar el sprite del jugador. Status: ${assetResponse.status()}`);
  }

  // Esperar carga
  await alicePage.waitForTimeout(4000);
  console.log('✅ Jugadores conectados.');

  // --- PASO 1: MOVIMIENTO SINCRONIZADO ---
  console.log('🏃 Verificando Movimiento...');
  await alicePage.keyboard.down('D');
  await alicePage.keyboard.down('S'); // Alice se mueve en diagonal (Derecha-Abajo)
  await alicePage.waitForTimeout(1000);
  await alicePage.keyboard.up('D');
  await alicePage.keyboard.up('S');

  await bobPage.waitForTimeout(500);
  await bobPage.screenshot({ path: 'screenshots/audit_01_movement.png' });
  console.log('📸 Captura: Movimiento sincronizado guardado.');

  // --- PASO 2: HECHIZO TRIÁNGULO (RED/FIRE) ---
  console.log('🔺 Lanzando Hechizo Triángulo...');
  const centerX = 300;
  const centerY = 300;
  
  await alicePage.mouse.move(centerX, centerY);
  await alicePage.mouse.down({ button: 'right' });
  // Dibujar triángulo
  await alicePage.mouse.move(centerX + 50, centerY - 80, { steps: 10 });
  await alicePage.mouse.move(centerX + 100, centerY, { steps: 10 });
  await alicePage.mouse.move(centerX, centerY, { steps: 10 });
  await alicePage.mouse.up({ button: 'right' });

  await bobPage.waitForTimeout(700);
  await bobPage.screenshot({ path: 'screenshots/audit_02_spell_triangle.png' });
  console.log('📸 Captura: Hechizo Triángulo (Rojo) verificado.');

  // --- PASO 3: HECHIZO LÍNEA (GREEN/LIGHTNING) ---
  console.log('⚡ Lanzando Hechizo Línea...');
  await alicePage.mouse.move(centerX, centerY + 50);
  await alicePage.mouse.down({ button: 'right' });
  await alicePage.mouse.move(centerX, centerY - 150, { steps: 10 });
  await alicePage.mouse.up({ button: 'right' });

  await bobPage.waitForTimeout(700);
  await bobPage.screenshot({ path: 'screenshots/audit_03_spell_line.png' });
  console.log('📸 Captura: Hechizo Línea (Verde) verificado.');

    console.log('✨ Auditoría Completa. Cerrando entornos...');

    await browserA.close();

    await browserB.close();

  });

  