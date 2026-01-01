import { PrismaClient } from '../generated/client/client';
import path from 'path';

// Force absolute path for SQLite to avoid CWD/Schema relative confusion
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;

console.log(`[DB] Initializing Prisma Client. Expected DB Path: ${dbPath}`);

export const db = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});
