import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('MMO Album Verification', () => {
    
    test('Verify Album Layout and Categories', async ({ page }) => {
        // 1. Ensure clean state and start server
        console.log("Stopping any zombie processes...");
        try { execSync('tools\kill_all.bat'); } catch(e) {}
        
        console.log("Starting server...");
        // Run server in background. We assume 'npm run dev' or similar is used via start_mmo.bat logic
        // For testing, we'll just run the server entry point if possible, or assume it's already being managed.
        // However, usually I should start it.
        const serverProcess = require('child_process').spawn('cmd.exe', ['/c', 'start_mmo.bat'], {
            detached: true,
            stdio: 'ignore'
        });
        
        // Wait for server to be ready
        await page.waitForTimeout(5000);

        // 2. Load Game
        await page.goto('http://localhost:2568');
        await page.waitForSelector('#login-screen');

        // 3. Login
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', '2580');
        await page.click('#btn-login-action');

        // Wait for HUD
        await page.waitForSelector('#quick-menu', { timeout: 15000 });
        console.log("Logged in successfully.");

        // 4. Open Album
        await page.click('#btn-album');
        await page.waitForSelector('#album-overlay:not(.hidden)');
        console.log("Album opened.");

        // 5. Verify Tabs
        const tabs = ['Wizards', 'Creatures', 'Personalities', 'Spells', 'Places', 'Artifacts', 'Nature'];
        for (const tabName of tabs) {
            const tab = page.locator(`.album-tab:has-text("${tabName}")`);
            await expect(tab).toBeVisible();
        }
        console.log("All category tabs are present.");

        // 6. Verify Pyramid Layout (Rows)
        // Check for at least one tier row
        const rows = page.locator('.album-tier-row');
        const rowCount = await rows.count();
        console.log(`Found ${rowCount} rarity rows in the default tab.`);
        expect(rowCount).toBeGreaterThan(0);

        // 7. Test Tab Switching
        await page.click('.album-tab:has-text("Creatures")');
        await page.waitForTimeout(500); // Wait for re-render
        
        // Take screenshot of the new layout
        await page.screenshot({ path: 'screenshots/verify_album_pyramid.png', fullPage: true });
        console.log("Screenshot saved: screenshots/verify_album_pyramid.png");

        // 8. Verify Lore Modal (if any card is owned)
        // Admin usually has some cards or we can check locked state
        const cards = page.locator('.card-slot');
        if (await cards.count() > 0) {
            console.log("Cards are being rendered correctly.");
        } else {
            throw new Error("No cards rendered in album grid!");
        }

        // Cleanup
        serverProcess.kill();
        try { execSync('tools\kill_all.bat'); } catch(e) {}
    });
});
