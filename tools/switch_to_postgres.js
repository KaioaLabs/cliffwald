const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

try {
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Check if already Postgres (idempotent)
    if (schema.includes('provider = "postgresql"')) {
        console.log("Schema already configured for PostgreSQL.");
        process.exit(0);
    }

    console.log("Switching Prisma Schema to PostgreSQL for Production...");

    // Replace Provider
    schema = schema.replace('provider  = "sqlite"', 'provider  = "postgresql"');
    
    // Replace URL
    // Regex matches: url = "file:..."
    schema = schema.replace(/url\s*=\s*"file:[^"]*"/, 'url       = env("DATABASE_URL")');
    
    // Add Direct URL if needed (Supabase usually needs it for migration, but simple usage assumes connection pooling or direct)
    // We will stick to DATABASE_URL for simplicity unless pooling issues arise.
    // Uncommenting the example line in schema if present
    schema = schema.replace('// directUrl = env("DIRECT_URL")', 'directUrl = env("DIRECT_URL")');

    fs.writeFileSync(schemaPath, schema);
    console.log("✅ Schema updated successfully.");

} catch (e) {
    console.error("❌ Failed to switch schema:", e);
    process.exit(1);
}
