const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/generated/client/client.ts');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const problemLine = "globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))";
    
    if (content.includes(problemLine)) {
        console.log('[PATCH] Removing ESM import.meta shim from Prisma Client...');
        content = content.replace(problemLine, "// [PATCHED] " + problemLine);
        fs.writeFileSync(filePath, content);
        console.log('[PATCH] Success.');
    } else {
        console.log('[PATCH] File already patched or line not found.');
    }
} else {
    console.error('[PATCH] Prisma Client file not found:', filePath);
}
