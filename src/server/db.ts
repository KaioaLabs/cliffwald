import { PrismaClient } from '../generated/client/client';

export const db = new PrismaClient();

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});
