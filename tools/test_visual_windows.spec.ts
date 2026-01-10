import { test, expect } from '@playwright/test';

test.describe('Window Light System & Day/Night Cycle', () => {

    test('should rotate and color window rays according to time', async ({ page }) => {
        // Capture Console Logs
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') 
                console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
        });
        page.on('pageerror', err => {
            console.log(`[BROWSER PAGE ERROR] ${err.message}`);
        });

        // 1. Navigate to Game
        console.log("Navigating to game...");
        await page.goto('http://localhost:2568'); 

        // 2. Login as Admin
        console.log("Logging in as admin...");
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', 'Miaularizador42');
        await page.click('#btn-login-action');

        // 3. Wait for Game Connection
        console.log("Waiting for game connection...");
        try {
            await page.waitForFunction(() => {
                const game = (window as any).game;
                const scene = game?.scene?.getScene('GameScene');
                return scene && scene.room && scene.room.sessionId;
            }, null, { timeout: 5000 }); // Short timeout to check status
        } catch (e) {
            console.log("Connection wait timed out. Checking login status...");
            const status = await page.textContent('#login-status');
            console.log("Login Status Text:", status);
            
            // Capture screenshot of login failure
            await page.screenshot({ path: 'screenshots/login_fail.png' });
            
            // Retry waiting with longer timeout if needed, or fail
            if (!status) {
                 // Try clicking again?
                 console.log("Retrying login click...");
                 await page.click('#btn-login-action');
                 await page.waitForFunction(() => {
                    const game = (window as any).game;
                    const scene = game?.scene?.getScene('GameScene');
                    return scene && scene.room && scene.room.sessionId;
                }, null, { timeout: 10000 });
            } else {
                throw e;
            }
        }

        // 4. Setup Camera & Debug
        console.log("Setting up camera and debug tools...");
        await page.evaluate(() => {
            const game = (window as any).game;
            const scene = game.scene.getScene('GameScene');
            
            // Stop follow and look at Great Hall windows (North Wall)
            scene.cameras.main.stopFollow();
            scene.cameras.main.centerOn(1600, 480);
            scene.cameras.main.setZoom(1.5);

            // Enable Time Override
            if (scene.debugManager) {
                scene.debugManager.settings.overrideTime = true;
            }
        });

        // 5. Test Cycle Phases
        const phases = [
            { hour: 6.0, name: 'DAWN', note: 'Expect Angled Rays (Left/East), Orange/Warm Color' },
            { hour: 12.0, name: 'NOON', note: 'Expect Vertical Rays, Bright White' },
            { hour: 18.0, name: 'DUSK', note: 'Expect Angled Rays (Right/West), Red/Pink Color' },
            { hour: 23.0, name: 'NIGHT', note: 'Expect Blue/Cool Color, Dim/Faint Rays' }
        ];

        for (const phase of phases) {
            console.log(`Testing Phase: ${phase.name} (${phase.hour}h)`);
            
            await page.evaluate((h) => {
                const game = (window as any).game;
                const scene = game.scene.getScene('GameScene');
                if (scene.debugManager) {
                    scene.debugManager.settings.debugHour = h;
                }
            }, phase.hour);

            // Allow transition/render
            await page.waitForTimeout(1000); 

            // Capture Screenshot
            const screenshotPath = `screenshots/windows_${phase.name.toLowerCase()}.png`;
            await page.screenshot({ path: screenshotPath });
            console.log(`Captured: ${screenshotPath} - ${phase.note}`);
        }
        
        console.log("Visual test complete. Please review screenshots.");
    });

});
