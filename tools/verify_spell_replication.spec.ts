import { test, expect, chromium } from '@playwright/test';

test.describe('Spell Replication System', () => {
    test('Client B should see projectile from Client A', async () => {
        const browser = await chromium.launch();
        const context = await browser.newContext();

        // 1. Launch Witness (Player B)
        const pageB = await context.newPage();
        await pageB.goto('http://localhost:3000/?dev_user=Witness&skin=player_blue');
        console.log('[TEST] Witness joined.');
        await pageB.waitForTimeout(4000); // Wait for connection

        // 2. Launch Attacker (Player A)
        const pageA = await context.newPage();
        await pageA.goto('http://localhost:3000/?dev_user=Attacker&skin=player_red');
        console.log('[TEST] Attacker joined.');
        await pageA.waitForTimeout(2000);

        // Position Check: Ensure they are close (Spawn is 300,300)
        // We assume they spawn near each other.
        
        // 3. Attacker casts a LINE spell (Simple Gesture)
        // Line Gesture: Left to Right
        const startX = 640 / 2;
        const startY = 360 / 2;
        
        await pageA.bringToFront();
        await pageA.mouse.move(startX, startY);
        await pageA.mouse.down({ button: 'right' });
        await pageA.mouse.move(startX + 100, startY, { steps: 10 }); // Horizontal Line
        await pageA.mouse.up({ button: 'right' });
        
        console.log('[TEST] Attacker cast Line gesture.');

        // 4. Capture Witness View
        await pageB.bringToFront();
        // Wait a bit for projectile to travel
        await pageB.waitForTimeout(500); 
        
        await pageB.screenshot({ path: 'screenshots/verify_replication_witness.png' });
        console.log('[TEST] Screenshot captured: screenshots/verify_replication_witness.png');

        // 5. Automated Check (Optional: Check for logs or DOM elements if we had them)
        // For now, visual verification via screenshot is the primary goal per GDD Protocol.

        await browser.close();
    });
});