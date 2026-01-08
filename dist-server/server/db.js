"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("../generated/client/client");
const path_1 = __importDefault(require("path"));
// Force absolute path for SQLite to avoid CWD/Schema relative confusion
const isProd = process.env.NODE_ENV === 'production';
// In Render/Prod, we must use /tmp/ because the app directory is read-only
const dbPath = isProd
    ? '/tmp/dev.db'
    : path_1.default.join(process.cwd(), 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;
console.log(`[DB] Initializing Prisma Client. Expected DB Path: ${dbPath}`);
exports.db = new client_1.PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
});
// Handle graceful shutdown
process.on('beforeExit', async () => {
    await exports.db.$disconnect();
});
