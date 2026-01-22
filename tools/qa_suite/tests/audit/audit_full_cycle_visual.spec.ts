import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Audit: Daily Schedule Snapshots', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes max
    await page.setViewportSize({ width: 3840, height: 2160 }); 

    const reportDir = path.join(__dirname, '../_archive/audit_report');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    
    const logPath = path.join(reportDir, 'schedule_telemetry.json');
    const telemetryData: any[] = [];

    console.log("Iniciando Auditoría de Horarios (Snapshots)...");

    // 1. Login Admin
    await page.goto('http://localhost:3000?dev_user=admin&skin=player_idle', { waitUntil: 'networkidle' });
    
    // Inject CSS to hide UI for cleaner shots
    await page.addStyleTag({ content: '#ui-layer { display: none !important; } #intro-screen { display: none !important; }' });

    console.log("Esperando conexión...");
    await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.room, { timeout: 30000 });

    // 2. Setup: World View
    await page.evaluate(() => {
        const game = (window as any).game;
        const scene = game.scene.getScene('GameScene');
        
        if (scene) {
            scene.cameras.main.stopFollow();
            const MAP_W = 4480;
            const MAP_H = 5760;
            const zw = scene.cameras.main.width / MAP_W;
            const zh = scene.cameras.main.height / MAP_H;
            const bestZoom = Math.min(zw, zh) * 0.95;
            
            scene.cameras.main.centerOn(MAP_W / 2, MAP_H / 2);
            scene.cameras.main.setZoom(bestZoom);
            scene.cameras.main.setBackgroundColor(0x000000);
        }
    });

    // 3. Define Milestones (Hour, Label, SettleTimeMs)
    // We give them time to walk to their destination.
    // Walking across map ~40s. 
    const milestones = [
        { hour: 8, label: '08_00_Breakfast', wait: 35000 },
        { hour: 11, label: '11_00_Classes', wait: 35000 }, 
        { hour: 13, label: '13_00_Lunch', wait: 35000 },
        { hour: 18, label: '18_00_FreeTime', wait: 35000 },
        { hour: 2, label: '02_00_Sleep', wait: 20000 }
    ];

    // Ensure normal time scale first
    await page.request.post('http://localhost:2568/api/debug/time-scale', {
        data: { scale: 1 }
    });

    for (const m of milestones) {
        console.log(`>>> Saltando a ${m.hour}:00 (${m.label})...`);
        
        // A. Time Jump
        await page.request.post('http://localhost:2568/api/debug/time-jump', {
            data: { hour: m.hour }
        });

        // B. Wait for convergence (Real-time walking)
        console.log(`    Esperando ${m.wait/1000}s para desplazamiento...`);
        await page.waitForTimeout(m.wait);

        // C. Capture
        const imgName = `schedule_${m.label}.png`;
        await page.screenshot({ path: path.join(reportDir, imgName), fullPage: true });

        // D. Telemetry
        const snapshot = await page.evaluate((label) => {
            const game = (window as any).game;
            const scene = game.scene.getScene('GameScene');
            const players = scene.playerController.players;
            const data: any[] = [];
            
            if (players instanceof Map) {
                 players.forEach((p: any, id: string) => {
                    if (id.startsWith('student_') || id.startsWith('npc_') || id.startsWith('teacher_')) {
                        if (p.visual && p.visual.sprite) {
                            data.push({
                                id: id,
                                x: Math.round(p.visual.sprite.x),
                                y: Math.round(p.visual.sprite.y),
                                zone: p.currentZone || 'unknown' // If available in client
                            });
                        }
                    }
                });
            }
            
            return {
                label: label,
                timestamp: Date.now(),
                total_entities: data.length,
                entities: data
            };
        }, m.label);

        telemetryData.push(snapshot);
        console.log(`    Capturado: ${snapshot.total_entities} entidades.`);
    }

    fs.writeFileSync(logPath, JSON.stringify(telemetryData, null, 2));
    console.log("Reporte de Horarios guardado.");
});