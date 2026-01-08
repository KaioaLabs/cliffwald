const fs = require('fs');
const path = require('path');

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

try {
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    if (schema.includes('provider = "sqlite"')) {
        console.log('[AUTO-FIX] Detected SQLite provider in Production. Switching to PostgreSQL...');
        
        // Replace provider
        schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
        
        // Ensure directUrl is present if not already (useful for Supabase)
        if (!schema.includes('directUrl')) {
             schema = schema.replace('url       = env("DATABASE_URL")', 'url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")');
        }
        
        fs.writeFileSync(schemaPath, schema);
        console.log('[AUTO-FIX] schema.prisma updated to PostgreSQL successfully.');
    } else {
        console.log('[AUTO-FIX] Schema is already configured for PostgreSQL (or other). No changes made.');
    }
} catch (e) {
    console.error('[AUTO-FIX] Failed to update schema.prisma:', e);
    process.exit(1);
}
