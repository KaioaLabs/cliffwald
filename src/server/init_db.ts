import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function initDatabase() {
    console.log("[DB-INIT] Starting Database Initialization...");
    
    // Set ENV for this process explicitly if missing
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = "file:/tmp/dev.db";
        console.log("[DB-INIT] Set DATABASE_URL to /tmp/dev.db");
    }

    try {
        console.log("[DB-INIT] Running prisma db push...");
        const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');
        console.log("[DB-INIT] Output:", stdout);
        if (stderr) console.error("[DB-INIT] Stderr:", stderr);
        
        console.log("[DB-INIT] Database ready.");
        return true;
    } catch (e) {
        console.error("[DB-INIT] CRITICAL ERROR:", e);
        return false;
    }
}
