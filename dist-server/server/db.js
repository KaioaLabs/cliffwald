"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("../generated/client/client");
console.log(`[DB] Initializing Prisma Client for PostgreSQL (Supabase).`);
exports.db = new client_1.PrismaClient();
// Handle graceful shutdown
process.on('beforeExit', async () => {
    await exports.db.$disconnect();
});
