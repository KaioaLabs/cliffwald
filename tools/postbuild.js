const fs = require('fs');
const path = require('path');

console.log('Starting Post-Build Copy...');
const projectRoot = process.cwd();
console.log(`Current Working Directory: ${projectRoot}`);

// DEBUG: List files in root to see where dist-client ended up
try {
    console.log('--- Root Directory Contents ---');
    console.log(fs.readdirSync(projectRoot));
    console.log('-------------------------------');
    
    // Check inside src just in case
    const srcPath = path.join(projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
        console.log('--- src Directory Contents ---');
        console.log(fs.readdirSync(srcPath));
        console.log('------------------------------');
    }
} catch (e) {
    console.log("Error listing directories:", e);
}

function copyFolderSync(from, to) {
    if (!fs.existsSync(from)) {
        console.error(`Source directory not found: ${from}`);
        // Don't exit yet, let's see logs
        return; 
    }
    
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    
    fs.readdirSync(from).forEach(element => {
        const stat = fs.lstatSync(path.join(from, element));
        const src = path.join(from, element);
        const dest = path.join(to, element);
        
        if (stat.isFile()) {
            fs.copyFileSync(src, dest);
        } else if (stat.isDirectory()) {
            copyFolderSync(src, dest);
        }
    });
}

const distClient = path.join(projectRoot, 'dist-client');
const distServerPublic = path.join(projectRoot, 'dist-server', 'public');
const srcGenerated = path.join(projectRoot, 'src', 'generated');
const distServerGenerated = path.join(projectRoot, 'dist-server', 'generated');

// 1. Copy Client to Public
console.log(`Copying ${distClient} -> ${distServerPublic}`);
copyFolderSync(distClient, distServerPublic);

// 2. Copy Generated Prisma Client
console.log(`Copying ${srcGenerated} -> ${distServerGenerated}`);
copyFolderSync(srcGenerated, distServerGenerated);

console.log('Post-Build Copy Complete!');
