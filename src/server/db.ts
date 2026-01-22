import { PrismaClient } from '../generated/client/client';
import fs from 'fs';
import path from 'path';

// --- RUNTIME INTEGRITY CHECK ---
const clientPath = path.join(__dirname, '../generated/client/client.ts');
// Only check in Dev mode where we use ts-node and raw files might exist
if (process.env.NODE_ENV !== 'production' && fs.existsSync(clientPath)) {
    const content = fs.readFileSync(clientPath, 'utf8');
    if (content.includes('import.meta.url') && !content.includes('// [PATCHED]')) {
        console.error('\x1b[31m%s\x1b[0m', `
        [CRITICAL ERROR] Prisma Client is NOT patched for CommonJS!
        The server will crash with "SyntaxError: Cannot use 'import.meta' outside a module".
        
        FIX: Run the following command manually:
        > node tools/patch_prisma_client.js
        `);
        throw new Error("Prisma Client unpatched. See logs for fix.");
    }
}
// -------------------------------

console.log(`[DB] Initializing Prisma Client for PostgreSQL (Supabase).`);

export const db = new PrismaClient();

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});
