import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Audit: God View Lifecycle (Timelapse)', async ({ page }) => {
    test.setTimeout(180000); 
    await page.setViewportSize({ width: 3840, height: 2160 }); 

    // ENABLE CONSOLE LOGGING
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('[NET]') || msg.text().includes('[AUTH]')) {
            console.log(`[BROWSER] ${msg.text()}`);
        }
    });

    const uniqueUser = `GodView_${Math.floor(Math.random() * 10000)}`;
    console.log(`Iniciando 'Ojo de Dios' como ${uniqueUser}...`);

    // 1. Navegar con Auto-Login (Dev Mode)
    // Esto activa LoginManager.autoLogin() -> /api/dev-login
    await page.goto(`http://localhost:3000?dev_user=${uniqueUser}&skin=player_idle`, { waitUntil: 'networkidle' });

    // 2. Eliminar Intro Screen (Visualmente molesta)
    await page.addStyleTag({ content: '#intro-screen { display: none !important; }' });
    
    // 3. Esperar a que el juego conecte
    console.log("Esperando conexión a Colyseus...");
    await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.room && (window as any).gameClient.room.sessionId, { timeout: 60000 });
    
    console.log("Conectado! ID Sesión detectado.");
    
        // 4. Configurar Cámara Aérea
    
        await page.waitForTimeout(5000); // Esperar carga de mapa
    
        
    
        // --- ACTIVAR TIME WARP (60x) ---
    
        // 1 hora juego = 1 minuto real
    
        // 45 minutos juego (Ciclo completo) = 45 segundos reales
    
        console.log("Activando Time Warp (60x)...");
    
        await page.request.post('http://localhost:2568/api/debug/time-scale', {
    
            data: { scale: 60 }
    
        });
    
    
    
        await page.evaluate(() => {
    
            const game = (window as any).game;
    
            const scene = game.scene.getScene('GameScene');
    
            if (scene) {
    
                scene.cameras.main.setZoom(0.25);
    
                scene.cameras.main.centerOn(1600, 1400);
    
                scene.cameras.main.setBackgroundColor(0x000000);
    
                
    
                const uiScene = game.scene.getScene('UIScene');
    
                if (uiScene) uiScene.scene.setVisible(false);
    
            }
    
        });
    
    
    
        const screenshotDir = path.join(__dirname, '../_archive/screenshots/god_view');
    
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    
    
    
        // FOTO 1 (Inicio)
    
        await page.screenshot({ path: path.join(screenshotDir, 'god_view_01_start.png'), fullPage: true });
    
        console.log("Captura 1 lista.");
    
    
    
        // ESPERA DE CICLO COMPLETO (45s reales = 45 min juego = 1 día)
    
        console.log("Esperando 45s (Ciclo Completo acelerado)...");
    
        await page.waitForTimeout(45000);
    
    
    
        // FOTO 2 (Fin de día / Noche)
    
        await page.screenshot({ path: path.join(screenshotDir, 'god_view_02_end.png'), fullPage: true });
    
        console.log("Captura 2 lista.");
    
        
    
        // Restaurar escala por si acaso
    
        await page.request.post('http://localhost:2568/api/debug/time-scale', {
    
            data: { scale: 1 }
    
        });
    
    });
    
    