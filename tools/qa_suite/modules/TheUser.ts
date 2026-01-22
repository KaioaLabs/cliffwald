import { Page } from 'playwright';

export class TheUser {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async perform(action: string, context?: any) {
        if (!this.page) return;

        switch (action) {
            case 'WALK':
                await this.randomWalk();
                break;
            case 'JUMP':
                await this.page.keyboard.press('Space');
                break;
            case 'SPELL':
                await this.castSpell();
                break;
            case 'LOOK':
                await this.lookAround();
                break;
            case 'CHAT':
                await this.chat(context);
                break;
        }
    }

    async walkTo(dx: number, dy: number) {
        const keys: string[] = [];
        if (dy < -20) keys.push('ArrowUp');
        if (dy > 20) keys.push('ArrowDown');
        if (dx < -20) keys.push('ArrowLeft');
        if (dx > 20) keys.push('ArrowRight');

        for (const key of keys) await this.page.keyboard.down(key);
        await this.page.waitForTimeout(100); 
        for (const key of keys) await this.page.keyboard.up(key);
    }

    private async randomWalk() {
        const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        const key = dirs[Math.floor(Math.random() * dirs.length)];
        await this.page.keyboard.down(key);
        await this.page.waitForTimeout(500 + Math.random() * 500);
        await this.page.keyboard.up(key);
    }

    private async castSpell() {
        const vp = this.page.viewportSize();
        if (vp) {
            const cx = vp.width / 2;
            const cy = vp.height / 2;
            await this.page.mouse.move(cx, cy);
            await this.page.mouse.down({ button: 'right' });
            await this.page.mouse.move(cx + 100, cy, { steps: 5 });
            await this.page.mouse.up({ button: 'right' });
        }
    }

    private async lookAround() {
        const vp = this.page.viewportSize();
        if (vp) {
            await this.page.mouse.move(vp.width/2 + 100, vp.height/2, { steps: 10 });
            await this.page.mouse.move(vp.width/2 - 100, vp.height/2, { steps: 10 });
        }
    }

    private async chat(message: string = "[QA] Systems check.") {
        await this.page.evaluate((msg) => {
            const client = (window as any).gameClient;
            if (client && client.network) client.network.sendChat(msg);
        }, message);
    }
}