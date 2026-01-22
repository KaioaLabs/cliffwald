import { test, expect } from '@playwright/test';

test.describe.serial('Map Traversal & Scale Audit', () => {
    // Config
    const SERVER_URL = 'http://localhost:3000';
    const TEST_USER = 'Explorer_Bot';
    const SKIN = 'player_green';

    // Coordinates (Updated from Server Logs)
const LOCATIONS = {
    SPAWN: { x: 8000, y: 6400 },
    CLASSROOM: { x: 9200, y: 8200 },
    FOREST: { x: 6080, y: 10560 },
};

    test('should traverse the entire map from South to North/East/West', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes
        
        // 1. Login (Auto-Skip Intro via dev_user)
        await page.goto(`${SERVER_URL}/?dev_user=${TEST_USER}&skin=${SKIN}`);
        
        // Wait for Game Load
        await page.waitForFunction(() => (window as any).gameClient && (window as any).gameClient.playerController);
        
        // Wait for Connection
        await page.waitForFunction(() => (window as any).gameClient.network.room);
        console.log("Connected to Room.");

        // Start Screenshot Loop
        const screenshotInterval = setInterval(async () => {
            try {
                await page.screenshot({ path: `screenshots/audit_progress_${Date.now()}.png` });
            } catch (e) {}
        }, 5000);

        const walkTo = async (targetName: string, targetPos: {x: number, y: number}) => {
            console.log(`\n🚶 Walking to ${targetName}...`);
            const startTime = Date.now();
            
            await page.evaluate(async (target) => {
                return new Promise<void>((resolve) => {
                    const client = (window as any).gameClient;
                    const myId = client.room.sessionId;
                    
                    let stuckFrames = 0;
                    let lastPos = {x: 0, y: 0};

                    const interval = setInterval(() => {
                        const myPos = client.playerController.getPosition(myId);
                        if (!myPos) return;

                        const dx = target.x - myPos.x;
                        const dy = target.y - myPos.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);

                        // Stuck Check
                        if (Math.abs(myPos.x - lastPos.x) < 1 && Math.abs(myPos.y - lastPos.y) < 1) {
                            stuckFrames++;
                        } else {
                            stuckFrames = 0;
                        }
                        lastPos = { x: myPos.x, y: myPos.y };

                        if (dist < 50) { // Arrived
                            client.network.sendMove({ left: false, right: false, up: false, down: false });
                            clearInterval(interval);
                            resolve();
                        } else if (stuckFrames > 100) { // 5 Seconds stuck
                             console.warn("[AUDIT] Stuck! Forcing random jiggle...");
                             stuckFrames = 0;
                             client.network.sendMove({ 
                                 left: Math.random() > 0.5, 
                                 right: Math.random() > 0.5, 
                                 up: Math.random() > 0.5, 
                                 down: Math.random() > 0.5 
                             });
                        } else {
                            const input = {
                                left: dx < -10,
                                right: dx > 10,
                                up: dy < -10,
                                down: dy > 10
                            };
                            client.network.sendMove(input);
                        }
                    }, 50);
                });
            }, targetPos);

            const duration = (Date.now() - startTime) / 1000;
            console.log(`✅ Arrived at ${targetName} in ${duration.toFixed(1)}s`);
            await page.screenshot({ path: `screenshots/audit_${targetName}.png` });
        };

        // TRAVERSAL SEQUENCE (North to South)
        console.log("🚀 Starting Traversal from Spawn (likely North)...");
        
        // 1. Navigate to Central Hub
        await walkTo("COURTYARD", LOCATIONS.COURTYARD);
        
        // 2. Go to Dining Hall
        await walkTo("GREAT_HALL", LOCATIONS.GREAT_HALL);
        
        // 3. Cross the Bridge
        await walkTo("ISTHMUS", LOCATIONS.ISTHMUS);
        
        // 4. Enter the Wild
        await walkTo("FOREST", LOCATIONS.FOREST);

        // Optional: Visit Wings from Courtyard if we want full coverage, 
        // but finding the bridge is the main goal.

        clearInterval(screenshotInterval);
        console.log("🏁 Traversal Audit Complete.");
    });
});