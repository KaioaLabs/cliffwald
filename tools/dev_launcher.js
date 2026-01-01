const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Wait 5 seconds for Server and Vite to start
console.log('[LAUNCHER] Waiting 5s for services to be ready...');

setTimeout(() => {
    console.log('[LAUNCHER] Opening Alice and Bob...');

    const rootDir = path.join(__dirname, '..');
    const tmpDir1 = path.join(rootDir, 'tmp_chrome_data_1');
    const tmpDir2 = path.join(rootDir, 'tmp_chrome_data_2');

    // Ensure tmp dirs exist
    if (!fs.existsSync(tmpDir1)) fs.mkdirSync(tmpDir1);
    if (!fs.existsSync(tmpDir2)) fs.mkdirSync(tmpDir2);

    // INJECTION: Force Disable Translate via Preferences File
    const prefs = JSON.stringify({
        translate: { enabled: false, blocked_languages: ["en", "es"] },
        intl: { accept_languages: "en-US,en" },
        profile: { exit_type: "Normal" } // Prevent "Chrome didn't shut down correctly" bubble
    });

    const setupPrefs = (dir) => {
        const defaultDir = path.join(dir, 'Default');
        if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
        fs.writeFileSync(path.join(defaultDir, 'Preferences'), prefs);
    };

    try {
        setupPrefs(tmpDir1);
        setupPrefs(tmpDir2);
        console.log('[LAUNCHER] Chrome Preferences Injected (Translate Disabled).');
    } catch (e) {
        console.error('[LAUNCHER] Failed to inject preferences:', e);
    }

    // Commands (Windows specific as per your env)
    const chromeCmd = 'start chrome';
    // ADDED: --disable-translate --disable-features=Translate,TranslateUI
    const commonFlags = '--new-window --no-first-run --no-default-browser-check --enable-logging --v=1 --disable-translate --disable-features=Translate,TranslateUI';
    
    // Alice (Top)
    // Note: We use the new ?dev_user param
    const cmdAlice = `${chromeCmd} ${commonFlags} --window-position=-1060,0 --window-size=960,540 --user-data-dir="${tmpDir1}" "http://localhost:3000/?dev_user=Alice&skin=player_idle"`;
    
    // Bob (Bottom)
    const cmdBob = `${chromeCmd} ${commonFlags} --window-position=-1060,600 --window-size=960,540 --user-data-dir="${tmpDir2}" "http://localhost:3000/?dev_user=Bob&skin=player_run"`;

    exec(cmdAlice, (err) => {
        if (err) console.error('[LAUNCHER] Error opening Alice:', err);
    });

    // Slight delay for Bob so they don't fight for focus instantly
    setTimeout(() => {
        exec(cmdBob, (err) => {
            if (err) console.error('[LAUNCHER] Error opening Bob:', err);
        });
    }, 1000);

    // Keep the process alive so concurrently -k doesn't kill everything
    setInterval(() => {}, 1000);

}, 5000);
