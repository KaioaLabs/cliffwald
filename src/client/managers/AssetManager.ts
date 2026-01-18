import Phaser from 'phaser';

export class AssetManager {
    static preload(scene: Phaser.Scene) {
        // Map & Tilesets
        scene.load.tilemapTiledJSON('map', '/maps/world.json');
        scene.load.image('tiles', '/maps/tilesets/placeholder_tiles.png');
        scene.load.image('table', '/maps/tilesets/table.png');
        scene.load.image('floor_cobble', '/maps/tilesets/floor_320.png');
        
        // Player Sprites
        scene.load.spritesheet({
            key: 'player_idle',
            url: '/sprites/player_idle.png',
            normalMap: '/sprites/player_idle_n.png',
            frameConfig: { frameWidth: 40, frameHeight: 40 }
        });
        scene.load.spritesheet({
            key: 'player_run',
            url: '/sprites/player_run.png',
            normalMap: '/sprites/player_run_n.png',
            frameConfig: { frameWidth: 40, frameHeight: 40 }
        });
        scene.load.spritesheet({
            key: 'player_jump',
            url: '/sprites/player_jump.png',
            frameConfig: { frameWidth: 40, frameHeight: 40 }
        });

        // Teacher Sprites
        scene.load.spritesheet({
            key: 'teacher_idle',
            url: '/sprites/teacher_idle.png',
            frameConfig: { frameWidth: 32, frameHeight: 64 }
        });
        scene.load.spritesheet({
            key: 'teacher_run',
            url: '/sprites/teacher_run.png',
            frameConfig: { frameWidth: 32, frameHeight: 64 }
        });

        // Audio
        scene.load.audio('audio_circle', '/audio/circolo.mp3');
        scene.load.audio('audio_square', '/audio/squaro.mp3');
        scene.load.audio('audio_triangle', '/audio/triangelo.mp3');
        scene.load.audio('intro_full', '/audio/intro_full.mp3');
        scene.load.audio('main_theme', '/audio/cliffwald_main_theme.mp3');
        
        scene.load.on('loaderror', (file: any) => console.error('Asset Load Error:', file.src));
    }

    static createAnimations(scene: Phaser.Scene) {
        if (!scene.textures.exists('player_run') || !scene.textures.exists('player_idle')) return;
        
        const rowNames = ['down', 'down-right', 'right', 'up-right', 'up'];
        rowNames.forEach((name, rowIndex) => {
            scene.anims.create({
                key: `idle-${name}`,
                frames: scene.anims.generateFrameNumbers('player_idle', { start: rowIndex * 4, end: (rowIndex * 4) + 3 }),
                frameRate: 6,
                repeat: -1
            });
            scene.anims.create({
                key: `run-${name}`,
                frames: scene.anims.generateFrameNumbers('player_run', { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: `jump-${name}`,
                frames: scene.anims.generateFrameNumbers('player_jump', { start: rowIndex * 5, end: (rowIndex * 5) + 4 }),
                frameRate: 10,
                repeat: 0 // Jump usually doesn't loop? Or loops if holding space? For bunny hop, one shot or loop while fast.
            });

            // Teacher Animations
            scene.anims.create({
                key: `teacher_idle-${name}`,
                frames: scene.anims.generateFrameNumbers('teacher_idle', { start: rowIndex * 4, end: (rowIndex * 4) + 3 }),
                frameRate: 6,
                repeat: -1
            });
            scene.anims.create({
                key: `teacher_run-${name}`,
                frames: scene.anims.generateFrameNumbers('teacher_run', { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                frameRate: 10,
                repeat: -1
            });
        });
    }

    static generateTextures(scene: Phaser.Scene) {
        if (!scene.textures.exists('star')) {
            const starCanvas = scene.textures.createCanvas('star', 16, 16);
            if (starCanvas) {
                const ctx = starCanvas.getContext();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(8, 0); ctx.lineTo(10, 6); ctx.lineTo(16, 8); ctx.lineTo(10, 10);
                ctx.lineTo(8, 16); ctx.lineTo(6, 10); ctx.lineTo(0, 8); ctx.lineTo(6, 6);
                ctx.closePath();
                ctx.fill();
                starCanvas.refresh();
            }
        }

        // Window Frame (Simple Gothic Arch / Rect)
        if (!scene.textures.exists('window_frame')) {
            const wCanvas = scene.textures.createCanvas('window_frame', 32, 48);
            if (wCanvas) {
                const ctx = wCanvas.getContext();
                if (ctx) {
                    // Frame
                    ctx.fillStyle = '#2d1e15'; // Dark Wood
                    ctx.fillRect(0, 0, 32, 48);
                    // Glass (Blue-ish dark)
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fillRect(2, 2, 28, 44);
                    // Crossbars
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(15, 2, 2, 44); // Vertical
                    ctx.fillRect(2, 16, 28, 2); // Horizontal
                    wCanvas.refresh();
                }
            }
        }

        // Window Light Ray (Gradient Trapezoid)
        if (!scene.textures.exists('window_light_ray')) {
            const rCanvas = scene.textures.createCanvas('window_light_ray', 64, 256);
            if (rCanvas) {
                const ctx = rCanvas.getContext();
                if (ctx) {
                    // Gradient
                    const grd = ctx.createLinearGradient(0, 0, 0, 256);
                    grd.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); // Bright top
                    grd.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)'); 
                    grd.addColorStop(1, 'rgba(255, 255, 255, 0.0)'); // Fade out

                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.moveTo(24, 0); // Top Left (Narrow)
                    ctx.lineTo(40, 0); // Top Right
                    ctx.lineTo(64, 256); // Bottom Right (Wide)
                    ctx.lineTo(0, 256); // Bottom Left
                    ctx.closePath();
                    ctx.fill();
                    rCanvas.refresh();
                }
            }
        }

        // Generic Shadow Base (White Rectangle, to be tinted Black)
        if (!scene.textures.exists('shadow_base')) {
            const sCanvas = scene.textures.createCanvas('shadow_base', 32, 32);
            if (sCanvas) {
                const ctx = sCanvas.getContext();
                if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, 32, 32);
                    sCanvas.refresh();
                }
            }
        }

        // Grand Bookshelf (Procedural)
        if (!scene.textures.exists('grand_bookshelf_v2')) {
            console.log("[ASSETS] Generating Grand Bookshelf Texture...");
            const shelfW = 500;
            const shelfH = 300;
            const canvas = scene.textures.createCanvas('grand_bookshelf_v2', shelfW, shelfH);
            if (canvas) {
                const ctx = canvas.getContext();
                if (ctx) {
                    // Wood Backing
                    ctx.fillStyle = '#2d1e15';
                    ctx.fillRect(0, 0, shelfW, shelfH);
                    
                    // Shelves
                    const shelfHeight = 40;
                    ctx.fillStyle = '#3e2723';
                    for (let y = shelfHeight; y < shelfH; y += shelfHeight) {
                        ctx.fillRect(0, y, shelfW, 10);
                    }
                    
                    // Books
                    const colors = ['#8d6e63', '#b71c1c', '#1a237e', '#f57f17', '#4a148c', '#33691e'];
                    for (let y = 0; y < shelfH; y += shelfHeight) {
                        if (y >= shelfH - 10) continue;
                        let x = 10;
                        while (x < shelfW - 10) {
                            const bookW = 6 + Math.random() * 12;
                            const bookH = 25 + Math.random() * 10; // Taller books
                            const color = colors[Math.floor(Math.random() * colors.length)];
                            ctx.fillStyle = color;
                            // Align to the shelf floor (y + shelfHeight)
                            ctx.fillRect(x, y + shelfHeight - bookH, bookW, bookH);
                            x += bookW + 2; // Spacing
                        }
                    }
                    canvas.refresh();
                }
            }
        }
    }
}
