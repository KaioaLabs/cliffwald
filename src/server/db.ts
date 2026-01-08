import { PrismaClient } from '../generated/client/client';
import path from 'path';

// Force absolute path for SQLite to avoid CWD/Schema relative confusion
const isProd = process.env.NODE_ENV === 'production';
// In Render/Prod, we must use /tmp/ because the app directory is read-only
const dbPath = isProd 
    ? '/tmp/dev.db' 
    : path.join(process.cwd(), 'prisma', 'dev.db');

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
