import fs from 'fs';
import path from 'path';

export class TheWitness {
    private reportPath: string;

    constructor(reportPath: string) {
        this.reportPath = reportPath;
    }

    async auditCodebase(root: string) {
        this.note('AUDIT', 'Starting Codebase Integrity Audit...');
        
        // Example check: Hardcoded numbers in systems
        const systemsPath = path.join(root, 'src/server/systems');
        if (fs.existsSync(systemsPath)) {
            const files = fs.readdirSync(systemsPath);
            for (const file of files) {
                const content = fs.readFileSync(path.join(systemsPath, file), 'utf8');
                if (content.match(/\d{3,}/) && !content.includes('CONFIG')) {
                    this.note('IMPROVEMENT', `System ${file} contains magic numbers. Suggest moving to Config.ts.`);
                }
            }
        }

        // Check for missing documentation
        if (!fs.existsSync(path.join(root, 'docs/technical'))) {
            this.note('WARNING', 'Technical documentation folder is missing.');
        }
    }

    note(type: string, message: string) {
        const entry = `- [${new Date().toLocaleTimeString()}] **${type}** ${message}\n`;
        fs.appendFileSync(this.reportPath, entry);
        console.log(`[WITNESS] ${type}: ${message}`);
    }
}
