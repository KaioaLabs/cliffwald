import { PrismaClient } from '../generated/client/client';

console.log(`[DB] Initializing Prisma Client for PostgreSQL (Supabase).`);

export const db = new PrismaClient();

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});
