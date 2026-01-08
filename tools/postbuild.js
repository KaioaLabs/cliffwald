const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
    if (!fs.existsSync(from)) {
        console.error(`Source directory not found: ${from}`);
        process.exit(1);
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

console.log('Starting Post-Build Copy...');

const projectRoot = process.cwd();
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
