import 'reflect-metadata';
import Phaser from 'phaser';
// Colyseus import moved to top by previous edit, removing duplicate here if any, or ensuring clean imports.
import * as Colyseus from "colyseus.js";
import { CONFIG } from "../shared/Config";
import { PlayerController } from "./PlayerController";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { VirtualJoystick } from './VirtualJoystick';
import { NetworkManager } from './NetworkManager';
import { DebugManager } from './DebugManager';
import { GestureManager } from './GestureManager';
import { SPELL_REGISTRY } from '../shared/items/SpellRegistry';

class UIScene extends Phaser.Scene {
    clockText?: Phaser.GameObjects.Text;
    pvpStatusText?: Phaser.GameObjects.Text;
    joystick?: VirtualJoystick;

    // Prestige UI
    pillars: Map<string, { fill: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text }> = new Map();

    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        console.log("UIScene Created");
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);

        // Clock Text (Top Right)
        this.clockText = this.add.text(this.scale.width - 20, 20, '00:00', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0); 

        // Prestige Pillars Container (Left of Clock)
        this.createPrestigeUI();

        // PvP Status Text (Below Clock)
        this.pvpStatusText = this.add.text(this.scale.width - 20, 55, 'PVP: OFF', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaaaaa',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 3 }
        }).setOrigin(1, 0);

        // ... mobile logic ...
        const isMobile = !this.sys.game.device.os.desktop;
        if (isMobile) {
            this.joystick = new VirtualJoystick(this, 0, 0);
        }

        this.scale.on('resize', (gameSize: any) => {
            this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
            if (this.clockText) this.clockText.setPosition(gameSize.width - 20, 20);
            if (this.pvpStatusText) this.pvpStatusText.setPosition(gameSize.width - 20, 55);
            this.repositionPrestigeUI(gameSize.width);
        });
    }

    createPrestigeUI() {
        const startX = this.scale.width - 160;
        const startY = 20;
        const houses = [
            { id: 'ignis', color: 0xff0000, label: 'I' },
            { id: 'axiom', color: 0x00aaff, label: 'A' },
            { id: 'vesper', color: 0xaa00ff, label: 'V' }
        ];

        houses.forEach((house, index) => {
            const x = startX + (index * 25);
            
            // Background
            this.add.rectangle(x, startY + 20, 15, 40, 0x000000, 0.5).setOrigin(0.5, 0);
            
            // Fill
            const fill = this.add.rectangle(x, startY + 60, 15, 0, house.color).setOrigin(0.5, 1);
            
            // Label
            const text = this.add.text(x, startY + 5, '0', {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);

            this.pillars.set(house.id, { fill, text });
        });
    }

    repositionPrestigeUI(width: number) {
        const startX = width - 160;
        const houses = ['ignis', 'axiom', 'vesper'];
        houses.forEach((id, index) => {
            const p = this.pillars.get(id);
            if (p) {
                const x = startX + (index * 25);
                p.fill.x = x;
                p.text.x = x;
                // Update background too? (Better to use a container, but this is simple)
            }
        });
    }

    updatePoints(ignis: number, axiom: number, vesper: number) {
        const maxDisplay = Math.max(ignis, axiom, vesper, 100); // Scale relative to max
        
        const updatePillar = (id: string, val: number) => {
            const p = this.pillars.get(id);
            if (p) {
                const height = (val / maxDisplay) * 40;
                p.fill.height = height;
                p.text.setText(val.toString());
            }
        };

        updatePillar('ignis', ignis);
        updatePillar('axiom', axiom);
        updatePillar('vesper', vesper);
    }

    updateTime(totalSeconds: number, course: number, month: string) {
        if (!this.clockText) return;
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        
        this.clockText.setText(`${hStr}:${mStr}\nCourse ${course}\n${month}`);
    }
}

export class GameScene extends Phaser.Scene {
    network: NetworkManager;
    
    // Colyseus Direct Access (Legacy/Hybrid)
    room?: Colyseus.Room;

    playerController!: PlayerController;
    cameraTarget!: Phaser.GameObjects.PointLight | Phaser.GameObjects.Image; // Using a dummy point
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
    physicsWorld?: RAPIER.World;
    gestureManager?: GestureManager;
    
    // UI & Entities
    uiText?: Phaser.GameObjects.Text;
    debugGraphics?: Phaser.GameObjects.Graphics;
    debugManager?: DebugManager;
    
    // Telemetry
    currentLatency: number = 0;

    // Fixed Timestep
    accumulatedTime: number = 0;
    readonly FIXED_TIMESTEP = 1 / 60;
    
    // Auth
    authToken: string = "";
    skin: string = "player_idle";

    constructor() {
        super('GameScene');
        this.network = new NetworkManager(this);
        this.setupRemoteLogging();
        
        // GLOBAL ERROR TRAP
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[CRITICAL] Unhandled Rejection:', event.reason);
        });
        window.onerror = (msg, url, line, col, error) => {
            console.error('[CRITICAL] Window Error:', msg, url, line, col, error);
            return false;
        };
    }

    setupRemoteLogging() {
        const oldError = console.error;
        console.error = (...args: any[]) => {
            const message = args.join(' ');
            const urlParams = new URLSearchParams(window.location.search);
            const user = urlParams.get("dev_user") || "Unknown";
            
            fetch(`http://${window.location.hostname}:2568/api/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'error', message, user })
            }).catch(() => {}); // Ignorar si falla el log
            
            oldError.apply(console, args);
        };
    }

    preload() {
        this.cursors = this.input.keyboard?.createCursorKeys();
        
        // Load Assets
        this.load.tilemapTiledJSON('map', '/maps/world.json');
        this.load.image('tiles', '/maps/tilesets/placeholder_tiles.png');
        
        // REAL ASSETS WITH NORMAL MAPS
        this.load.spritesheet({
            key: 'player_idle',
            url: '/sprites/player_idle.png',
            normalMap: '/sprites/player_idle_n.png',
            frameConfig: { frameWidth: 20, frameHeight: 20 }
        });
        this.load.spritesheet({
            key: 'player_run',
            url: '/sprites/player_run.png',
            normalMap: '/sprites/player_run_n.png',
            frameConfig: { frameWidth: 20, frameHeight: 20 }
        });
        
        this.load.on('loaderror', (file: any) => console.error('Asset Load Error:', file.src));
    }

    // Registry for networked projectiles
    visualProjectiles = new Map<string, Phaser.GameObjects.Shape>();

    async create() {
        try {
            console.log("Scene Create Start");
            
            this.scene.launch('UIScene');
            this.scene.bringToTop('UIScene');
            const uiScene = this.scene.get('UIScene');

            await RAPIER.init();
            this.physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });

            // ... (Map and Player setup remain the same)
            const map = this.make.tilemap({ key: 'map' });
            const tileset = map.addTilesetImage('placeholder_tiles', 'tiles');
            if (tileset) {
                const ground = map.createLayer('Ground', tileset, 0, 0);
                if (ground) {
                    ground.setPipeline('Light2D');
                    ground.setDepth(-100); // Ensure it's ALWAYS below characters
                }
            }
            buildPhysics(this.physicsWorld, this.cache.tilemap.get('map').data);

            // --- DYNAMIC LIGHTING FROM TILED ---
            const lightsLayer = map.getObjectLayer('Lights');
            if (lightsLayer) {
                console.log(`[LIGHTS] Found ${lightsLayer.objects.length} lights in map.`);
                lightsLayer.objects.forEach(obj => {
                    const colorHex = obj.properties?.find((p:any) => p.name === 'color')?.value || '#ffffff';
                    const radius = obj.properties?.find((p:any) => p.name === 'radius')?.value || 200; // Larger default
                    const intensity = obj.properties?.find((p:any) => p.name === 'intensity')?.value || 1.0;
                    
                    const color = parseInt(colorHex.replace('#', '0x'), 16);
                    if (obj.x !== undefined && obj.y !== undefined) {
                        this.lights.addLight(obj.x, obj.y, radius, color, intensity);
                    }
                });
            }

            // ... rest of create ...
            
            // FIX: Enable Lights with safer ambient color
            this.lights.enable().setAmbientColor(0x555555); 


            // 6. Auto-Login based on URL
            this.autoLogin();

            // 7. Events
            this.scale.on('resize', this.handleResize, this);
            
            // CLEANUP: Force disconnect on refresh/close
            window.addEventListener('beforeunload', () => {
                this.network.disconnect();
            });

            window.addEventListener('blur', () => {
                this.input.keyboard?.resetKeys();
                this.network.sendMove({ left: false, right: false, up: false, down: false });
            });

            // 8. Debug Tools
            this.debugManager = new DebugManager(this);

        } catch (e: any) {
            console.error("Create Crash:", e);
        }
    }

    async autoLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Dev Auto-Login (Secure-ish)
        const devUser = urlParams.get("dev_user");
        const skin = urlParams.get("skin") || "player_idle";

        if (devUser) {
            console.log(`[DEBUG] Attempting Dev Login for: ${devUser}`);
            try {
                // Determine API URL (handle localhost vs mobile IP)
                const apiUrl = window.location.hostname === "localhost" 
                    ? "http://localhost:2568/api/dev-login"
                    : `http://${window.location.hostname}:2568/api/dev-login`;

                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: devUser })
                });

                if (!res.ok) throw new Error("Dev Login Failed");
                
                const data = await res.json();
                console.log("[DEBUG] Got Token:", data.token);
                
                // FIX: Assign token before connecting!
                this.authToken = data.token;
                this.skin = skin;

                this.setupHUD(document.getElementById('ui-layer')!);
                console.log("[DEBUG] Calling connect()...");
                this.connect();
            } catch (e) {
                console.error("Dev Auto-Login Error:", e);
                // Fallback to UI?
            }
        } else {
            // FALLBACK FOR EXISTING BAT (Temporary)
            const legacyUser = urlParams.get("username") || "Debug_Warrior";
            this.doDevLogin(legacyUser, skin);
        }
    }
    
    async doDevLogin(username: string, skin: string) {
        try {
            const apiUrl = `http://${window.location.hostname}:2568/api/dev-login`;
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            
            this.authToken = data.token;
            this.skin = skin;
            
            this.setupHUD(document.getElementById('ui-layer')!);
            this.connect();
        } catch (e) { 
            console.error("Login Failed:", e);
            // Retry login in 2s
            setTimeout(() => this.doDevLogin(username, skin), 2000);
        }
    }

    async connect() {
        try {
            console.log("Connecting to Colyseus...");
            const success = await this.network.connect(this.authToken, this.skin);
            
            if (success && this.network.room) {
                this.room = this.network.room;
                console.log("Joined successfully!", this.room.sessionId);
                
                // Setup callbacks
                this.network.onPong = (latency) => this.currentLatency = latency;

                // PROJECTILES SYNC
                const state = this.room.state as any;
                if (state.projectiles) {
                    state.projectiles.onAdd = (proj: any, id: string) => {
                        if (this.room && proj.ownerId === this.room.sessionId) return;
                        const visual = this.createProjectileSprite({
                            x: proj.x, y: proj.y, spellId: proj.spellId, vx: proj.vx, vy: proj.vy
                        });
                        this.visualProjectiles.set(id, visual);
                    };
                    state.projectiles.onRemove = (_: any, id: string) => {
                        const visual = this.visualProjectiles.get(id);
                        if (visual) {
                            visual.destroy();
                            this.visualProjectiles.delete(id);
                        }
                    };
                }

                // 4. Auto-Reconnect Logic (delegated or kept hybrid)
                this.room.onLeave((code) => {
                    console.warn(`[NETWORK] Disconnected (Code: ${code}). Attempting Auto-Reconnect...`);
                    // Clear state
                    this.playerController.entities.forEach((sprite) => sprite.destroy());
                    this.playerController.entities.clear();
                    this.playerController.ecsEntities.clear();
                    
                    // Show Reconnecting UI
                    if (this.uiText) this.uiText.setText("RECONNECTING TO SERVER...");
                    
                    // Retry Loop
                    setTimeout(() => {
                        this.connect(); // Recursive re-connect
                    }, 2000);
                });
            }

        } catch (e) {
            console.error("Join Error:", e);
        }
    }

    setupHUD(container: HTMLElement) {
        if (!container) return;
        container.innerHTML = `
            <div id="hud-layer">
                <div id="chat-container">
                    <div id="chat-messages"></div>
                    <input type="text" id="chat-input" placeholder="Press Enter to chat..." class="pointer-events-auto" />
                </div>
            </div>
        `;
        
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const chatContainer = document.getElementById('chat-container');

        // Focus Logic (Minimize/Expand)
        input?.addEventListener('focus', () => {
            chatContainer?.classList.add('active');
        });

        input?.addEventListener('blur', () => {
            setTimeout(() => {
                chatContainer?.classList.remove('active');
            }, 100);
        });

        // Chat Sending Logic
        input?.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Stop WASD from moving player while typing
            if (e.key === 'Enter') {
                if (input.value.trim().length > 0) {
                    this.network.sendChat(input.value.trim());
                    input.value = '';
                }
                input.blur(); // Release focus so WASD works again!
            }
        });

        // Global Enter Listener to Open Chat
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement !== input) {
                e.preventDefault(); // Prevent accidental default actions
                input?.focus();
            }
        });
    }

    createProjectileSprite(data: any): Phaser.GameObjects.Shape {
        let projectile: Phaser.GameObjects.Shape;
        const angle = Math.atan2(data.vy, data.vx);
        
        let config = SPELL_REGISTRY['circle']; // Default fallback
        for (const key in SPELL_REGISTRY) {
            if (data.spellId.includes(key)) {
                config = SPELL_REGISTRY[key];
                break;
            }
        }

        const color = config.color;
        if (config.shape === 'triangle') {
            projectile = this.add.triangle(data.x, data.y, -7, -10, 13, 0, -7, 10, color);
        } else if (config.shape === 'square') {
            projectile = this.add.rectangle(data.x, data.y, 16, 16, color);
        } else {
            projectile = this.add.circle(data.x, data.y, 8, color);
        }

        projectile.setStrokeStyle(2, 0xffffff);
        projectile.setDepth(2000);
        projectile.setRotation(angle);
        
        if (config.shape !== 'circle') {
            this.tweens.add({
                targets: projectile,
                rotation: angle + Math.PI * 4,
                duration: 2000,
                repeat: -1
            });
        }

        return projectile;
    }

    update(time: number, delta: number) {
        if (!this.playerController || !this.network || !this.network.room) return;

        // --- DYNAMIC CAMERA LOGIC ---
        const localPlayer = this.playerController.entities.get(this.network.room.sessionId);
        if (localPlayer && this.cameraTarget) {
            if (!this.gestureManager?.isDrawing) {
                const pointer = this.input.activePointer;
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const targetX = (localPlayer.x * 0.85) + (worldPoint.x * 0.15);
                const targetY = (localPlayer.y * 0.85) + (worldPoint.y * 0.15);
                this.cameraTarget.setPosition(targetX, targetY);
            }
        }

        const input = this.handleInput();
        this.syncNetworkState();

        // --- PROJECTILE SYNC ---
        // Synchronized via callbacks in connect(). No polling needed.

        this.playerController.applyInput(this.network.room.sessionId, input);
        
        this.accumulatedTime += delta / 1000;
        while (this.accumulatedTime >= this.FIXED_TIMESTEP) {
            MovementSystem(this.playerController.world);
            if (this.physicsWorld) this.physicsWorld.step();
            this.accumulatedTime -= this.FIXED_TIMESTEP;
        }
        
        this.playerController.updateVisuals();
        this.updateUI();

        if (this.debugManager) this.debugManager.update();

        // Update Clock UI (Client-Side Calculation)
        if (this.network.room && this.network.room.state.worldStartTime > 0) {
            // Formula: GameTime = (CurrentTime - Anchor) * Speed
            const elapsedMs = Date.now() - this.network.room.state.worldStartTime;
            const totalGameSeconds = (elapsedMs / 1000) * CONFIG.GAME_TIME_SPEED;
            
            // Wrap around 24h
            const wrappedTime = totalGameSeconds % CONFIG.DAY_LENGTH_SECONDS;
            
            const uiScene = this.scene.get('UIScene') as UIScene;
            if (uiScene) {
                uiScene.updateTime(wrappedTime, this.network.room.state.currentCourse, this.network.room.state.currentMonth);
            }
        }

        if (CONFIG.SHOW_COLLIDERS && this.debugGraphics && this.physicsWorld) {
            this.debugGraphics.clear();
            this.debugGraphics.lineStyle(1, 0x00ff00, 1);
            this.physicsWorld.forEachCollider((collider) => {
                const type = collider.shape.type;
                const translation = collider.translation();
                if (type === 0 || (collider.shape as any).halfExtents) { 
                    const he = (collider.shape as any).halfExtents;
                    if (he) {
                        this.debugGraphics?.strokeRect(translation.x - he.x, translation.y - he.y, he.x * 2, he.y * 2);
                    }
                } else if (type === 1 || (collider.shape as any).radius) {
                    const r = (collider.shape as any).radius;
                    if (r) {
                        this.debugGraphics?.strokeCircle(translation.x, translation.y, r);
                    }
                }
            });
        }
    }

    syncNetworkState() {
        const state = this.network.room?.state as any;
        if (state && state.players) {
            const players = state.players;
            
            // 1. Sync / Add
            players.forEach((p: any, id: string) => this.syncPlayer(id, p));
            
            // 2. Remove missing
            this.playerController.entities.forEach((_, id) => {
                if (!players.has(id)) {
                    this.playerController.removePlayer(id);
                }
            });
        }
    }

    private syncPlayer(sessionId: string, data: any) {
        if (!this.playerController.entities.has(sessionId)) {
            const isLocal = sessionId === this.network.room?.sessionId;
            this.playerController.addPlayer(sessionId, data.x, data.y, isLocal, data.skin, data.username);
        } else {
            this.playerController.updatePlayerState(sessionId, data);
        }
    }

    createUI() {
        this.uiText = this.add.text(10, 10, 'Initializing...', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#00000088'
        });
        this.uiText.setScrollFactor(0);
        this.uiText.setDepth(1000);
    }

    updateUI() {
        if (!this.uiText || !this.network || !this.network.room) return;
        const state = this.network.room.state as any;
        const myState = state.players ? state.players.get(this.network.room.sessionId) : null;
        
        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene) {
            uiScene.updatePoints(state.ignisPoints || 0, state.axiomPoints || 0, state.vesperPoints || 0);
        }

        if (myState) {
            this.uiText.setText(`POS: ${Math.round(myState.x)},${Math.round(myState.y)}
PING: ${this.currentLatency}ms`);
            if (this.currentLatency < 100) this.uiText.setColor('#00ff00');
            else if (this.currentLatency < 200) this.uiText.setColor('#ffff00');
            else this.uiText.setColor('#ff0000');
        }
    }

    handleResize(gameSize: any) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        this.updateCameraZoom();
    }

    updateCameraZoom() {
        const targetHeightTiles = 16;
        const tileSize = 16;
        const logicalHeight = targetHeightTiles * tileSize;
        let zoom = Math.floor(this.scale.height / logicalHeight);
        zoom = Math.max(2, Math.min(zoom, 6));
        this.cameras.main.setZoom(zoom);
    }

    createAnimations() {
        if (!this.textures.exists('player_run') || !this.textures.exists('player_idle')) return;
        const rowNames = ['down', 'down-right', 'right', 'up-right', 'up'];
        rowNames.forEach((name, rowIndex) => {
            this.anims.create({
                key: `idle-${name}`,
                frames: this.anims.generateFrameNumbers('player_idle', { start: rowIndex * 4, end: (rowIndex * 4) + 3 }),
                frameRate: 6,
                repeat: -1
            });
            this.anims.create({
                key: `run-${name}`,
                frames: this.anims.generateFrameNumbers('player_run', { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                frameRate: 10,
                repeat: -1
            });
        });
    }

    lastInputState = { left: false, right: false, up: false, down: false };

    handleInput() {
        if (!this.room || !this.cursors || !this.wasd) return { left: false, right: false, up: false, down: false };
        if (document.activeElement?.tagName === 'INPUT') {
            return { left: false, right: false, up: false, down: false };
        }
        
        // Keyboard Input
        let input = {
            left: this.cursors.left.isDown || this.wasd.A.isDown,
            right: this.cursors.right.isDown || this.wasd.D.isDown,
            up: this.cursors.up.isDown || this.wasd.W.isDown,
            down: this.cursors.down.isDown || this.wasd.S.isDown
        };

        // Mobile Joystick Input
        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene && uiScene.joystick) {
            const joyInput = uiScene.joystick.getInput();
            input.left = input.left || joyInput.left;
            input.right = input.right || joyInput.right;
            input.up = input.up || joyInput.up;
            input.down = input.down || joyInput.down;
        }

        const inputChanged = 
            input.left !== this.lastInputState.left ||
            input.right !== this.lastInputState.right ||
            input.up !== this.lastInputState.up ||
            input.down !== this.lastInputState.down;
        if (inputChanged || ((input.left || input.right || input.up || input.down) && this.game.loop.frame % 10 === 0)) {
            this.network.sendMove(input);
            this.lastInputState = { ...input };
        }
        return input;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: { 
        mode: Phaser.Scale.FIT, 
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 640, 
        height: 360 
    },
    parent: 'app',
    pixelArt: true,
    roundPixels: true,
    render: { maxLights: 50 },
    backgroundColor: '#000000',
    scene: [GameScene, UIScene],
    physics: { default: 'arcade', arcade: { debug: false } }
};

new Phaser.Game(config);