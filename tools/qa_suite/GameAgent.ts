import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

// Import Modules
import { TheUser } from './modules/TheUser';
import { TheExplorer } from './modules/TheExplorer';
import { TheCritic } from './modules/TheCritic';
import { TheWitness } from './modules/TheWitness';

export class GameAgent {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private isRunning = false;
    
    // Modules
    private user!: TheUser;
    private explorer!: TheExplorer;
    private critic!: TheCritic;
    private witness!: TheWitness;

    // Config
    private readonly REPORT_DIR = path.join(__dirname, 'reports');
    private readonly SESSION_REPORT = path.join(__dirname, 'reports/latest_session.md');
    private readonly SERVER_URL = 'http://localhost:3000';
    private readonly AGENT_NAME = 'QA_Sentinel';

    constructor() {
        if (!fs.existsSync(this.REPORT_DIR)) fs.mkdirSync(this.REPORT_DIR, { recursive: true });
        fs.writeFileSync(this.SESSION_REPORT, `# QA Sentinel Session Report - ${new Date().toLocaleDateString()}\n\n`);
        this.witness = new TheWitness(this.SESSION_REPORT);
        this.critic = new TheCritic();
    }

    async start() {
        this.witness.note('INFO', 'Starting Absolute Witness (QA Agent)...');
        
        // Codebase Audit
        await this.witness.auditCodebase(path.join(__dirname, '../../'));

        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
        this.user = new TheUser(this.page);
        this.explorer = new TheExplorer(this.user);

        // Attach console listeners
        this.page.on('console', msg => {
            if (msg.type() === 'error') this.witness.note('CONSOLE_ERROR', msg.text());
        });

        try {
            await this.page.goto(`${this.SERVER_URL}/?dev_user=${this.AGENT_NAME}&skin=player_red`);
            await this.page.waitForFunction(() => (window as any).QA_Probe && (window as any).QA_Probe().status === 'ACTIVE', { timeout: 20000 });
            
            this.witness.note('INFO', 'Connection established. Handshake successful.');
            this.isRunning = true;
            this.explorer.startPatrol('NORTH_TO_SOUTH');
            this.gameLoop();

        } catch (e: any) {
            this.witness.note('ERROR', `Connection failed: ${e.message}`);
            await this.stop();
        }
    }

    private async gameLoop() {
        let tick = 0;
        while (this.isRunning) {
            tick++;
            const telemetry = await this.getTelemetry();
            if (telemetry.status === 'ACTIVE') {
                
                // 1. Validation
                const issues = this.critic.check(telemetry, tick);
                issues.forEach(issue => this.witness.note('ASSERTION', issue));

                // 2. Navigation
                const state = await this.explorer.update(telemetry.player);
                if (state.startsWith('ARRIVED')) {
                    this.witness.note('CHECKPOINT', `Reached: ${state}`);
                    await this.user.perform('LOOK');
                } else if (state === 'STUCK') {
                    this.witness.note('WARNING', `Agent stuck at ${telemetry.player.x}, ${telemetry.player.y}. Wiggling.`);
                    await this.user.perform('JUMP');
                }

                // 3. Spontaneous Actions
                if (Math.random() < 0.05) await this.user.perform('SPELL');

            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    private async getTelemetry() {
        if (!this.page) return { status: 'NO_PAGE' };
        return await this.page.evaluate(() => {
            return (window as any).QA_Probe ? (window as any).QA_Probe() : { status: 'NO_PROBE' };
        });
    }

    async stop() {
        this.isRunning = false;
        if (this.browser) await this.browser.close();
        this.witness.note('INFO', 'QA Session closed.');
    }
}

if (require.main === module) {
    const agent = new GameAgent();
    agent.start();
}