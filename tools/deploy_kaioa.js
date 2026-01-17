const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('[KAIOA] Starting Deployment...');

// 1. Build the Bundle
try {
    console.log('[KAIOA] Building Engine Core...');
    execSync('node tools/build_kaioa.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[KAIOA] Build Failed.');
    process.exit(1);
}

// 2. Determine Tiled Extension Path
let tiledExtPath;
const home = os.homedir();

if (process.platform === 'win32') {
    // Check Local first (Standard)
    const local = path.join(process.env.LOCALAPPDATA, 'Tiled', 'extensions');
    const roaming = path.join(process.env.APPDATA, 'Tiled', 'extensions');
    
    if (fs.existsSync(local)) tiledExtPath = local;
    else if (fs.existsSync(roaming)) tiledExtPath = roaming;
    else {
        // Try creating Local if neither exists
        tiledExtPath = local;
    }
} else if (process.platform === 'darwin') {
    tiledExtPath = path.join(home, 'Library', 'Preferences', 'Tiled', 'extensions');
} else {
    // Linux
    tiledExtPath = path.join(home, '.local', 'share', 'tiled', 'extensions');
}

// Create dir if missing
if (!fs.existsSync(tiledExtPath)) {
    console.log(`[KAIOA] Creating extension directory: ${tiledExtPath}`);
    fs.mkdirSync(tiledExtPath, { recursive: true });
}

// 3. Deploy
const source = path.join(__dirname, 'tiled_extensions/kaioa_engine_bundled.js');
const dest = path.join(tiledExtPath, 'kaioa_engine_bundled.js');

console.log(`[KAIOA] Deploying to: ${dest}`);
fs.copyFileSync(source, dest);

// 4. Cleanup Old Files
const oldFiles = [
    'cliffwald_engine_view.js',
    'cliffwald_lighting.js',
    'kaioa_engine_view.js' // We only want the bundled version in Tiled
];

oldFiles.forEach(f => {
    const p = path.join(tiledExtPath, f);
    if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`[KAIOA] Cleaned up obsolete file: ${f}`);
    }
});

console.log('[SUCCESS] KaioaEngine Updated! Restart Tiled to apply.');
