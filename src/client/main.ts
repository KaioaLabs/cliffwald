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

class UIScene extends Phaser.Scene {
    clockText?: Phaser.GameObjects.Text;
    pvpStatusText?: Phaser.GameObjects.Text;
    joystick?: VirtualJoystick;

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
    
            }).setOrigin(1, 0); // Anchor top-right
    
    
    
            // PvP Status Text (Below Clock)
    
            this.pvpStatusText = this.add.text(this.scale.width - 20, 55, 'PVP: OFF', {
    
                fontFamily: 'monospace',
    
                fontSize: '12px',
    
                color: '#aaaaaa',
    
                backgroundColor: '#00000088',
    
                padding: { x: 10, y: 3 }
    
            }).setOrigin(1, 0);
    
    
    
            // --- MOBILE CHECK ---
    
            const isMobile = !this.sys.game.device.os.desktop;
    
            
    
            if (isMobile) {
    
                console.log("Mobile detected: Enabling Dynamic Virtual Joystick");
    
                // Position is irrelevant now, it floats
    
                this.joystick = new VirtualJoystick(this, 0, 0);
    
            }
    
    
    
            // Ensure UI matches screen size on resize
    
            this.scale.on('resize', (gameSize: any) => {
    
                this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    
                if (this.clockText) {
    
                    this.clockText.setPosition(gameSize.width - 20, 20);
    
                }
    
                if (this.pvpStatusText) {
    
                    this.pvpStatusText.setPosition(gameSize.width - 20, 55);
    
                }
    
                // Joystick manages its own position dynamically
    
            });
    
        }

    updateTime(totalSeconds: number) {
        if (!this.clockText) return;
        
        // Convert total seconds (0-86400) to HH:MM
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        
        this.clockText.setText(`${hStr}:${mStr}`);
    }
}




export class GameScene extends Phaser.Scene {
    network!: NetworkManager; // Use Manager
    
    // Colyseus Direct Access (Legacy/Hybrid)
    client!: Colyseus.Client;
    room?: Colyseus.Room;
    pingInterval?: any;

    playerController!: PlayerController;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
    physicsWorld?: RAPIER.World;
    
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
        // Initialize Colyseus Client
        const protocol = window.location.protocol.replace("http", "ws");
        const endpoint = window.location.hostname === "localhost" 
            ? "ws://localhost:2568" 
            : `${protocol}//${window.location.hostname}:2568`;
        this.client = new Colyseus.Client(endpoint);

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
        
        // REAL ASSETS (Confirmed: Idle 80x100 -> 4x5, Run 120x100 -> 6x5. Both 20x20)
        this.load.spritesheet('player_idle', '/sprites/player_idle.png', { frameWidth: 20, frameHeight: 20 });
        this.load.spritesheet('player_run', '/sprites/player_run.png', { frameWidth: 20, frameHeight: 20 });
        
        this.load.on('loaderror', (file: any) => console.error('Asset Load Error:', file.src));
    }

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
                if (ground) ground.setPipeline('Light2D');
            }
            buildPhysics(this.physicsWorld, this.cache.tilemap.get('map').data);

            // --- DYNAMIC LIGHTING FROM TILED ---
            const lightsLayer = map.getObjectLayer('Lights');
            if (lightsLayer) {
                console.log(`[LIGHTS] Found ${lightsLayer.objects.length} lights in map.`);
                lightsLayer.objects.forEach(obj => {
                    const colorHex = obj.properties?.find((p:any) => p.name === 'color')?.value || '#ffffff';
                    const radius = obj.properties?.find((p:any) => p.name === 'radius')?.value || 100;
                    const intensity = obj.properties?.find((p:any) => p.name === 'intensity')?.value || 1.0;
                    
                    // Convert Hex String to Integer
                    const color = parseInt(colorHex.replace('#', '0x'), 16);
                    
                    // Tiled Objects originate top-left, Lights are centered usually? 
                    // Point objects in Tiled have x/y.
                    if (obj.x !== undefined && obj.y !== undefined) {
                        this.lights.addLight(obj.x, obj.y, radius, color, intensity);
                    }
                });
            } else {
                console.warn("[LIGHTS] No 'Lights' object layer found in Tiled map.");
            }

            this.playerController = new PlayerController(this, this.physicsWorld);
            this.createAnimations();
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;

            // ... (Rest of create)
            this.updateCameraZoom();
            this.cameras.main.setBackgroundColor('#1a1a1a'); 
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            
            // Safety Camera Move (Fallback only)
            this.time.delayedCall(5000, () => {
                if (!this.playerController.entities.has(this.room?.sessionId || "")) {
                    console.log("[DEBUG] No player joined yet, staying at spawn.");
                    this.cameras.main.centerOn(300, 300); // Changed to 300,300 (Likely Spawn)
                }
            });

            // 5. UI Setup
            this.createUI();
            this.debugGraphics = this.add.graphics().setDepth(10000);
            
            // FIX: Clicking on game world blurs chat
            this.input.on('pointerdown', () => {
                const input = document.getElementById('chat-input') as HTMLInputElement;
                if (input) input.blur();
            });

            // Prevent context menu (right click menu) from appearing
            this.input.mouse?.disableContextMenu();
            
            // FIX: Enable Lights so sprites are visible with Light2D pipeline
            this.lights.enable().setAmbientColor(0x808080); // 50% gray ambient light

            // 6. Auto-Login based on URL
            this.autoLogin();

            // 7. Events
            this.scale.on('resize', this.handleResize, this);
            
            // CLEANUP: Force disconnect on refresh/close
            window.addEventListener('beforeunload', () => {
                if (this.room) this.room.leave();
            });

            window.addEventListener('blur', () => {
                this.input.keyboard?.resetKeys();
                if (this.room) this.room.send("move", { left: false, right: false, up: false, down: false });
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
            // Use the auth token from autoLogin
            this.room = await this.client.joinOrCreate("world", { 
                token: this.authToken,
                skin: this.skin 
            });

            console.log("Joined successfully!", this.room.sessionId);
            console.log("[DEBUG] Step 1: Room Joined. Registering Message Handlers...");

            // 1. REGISTER MESSAGE HANDLERS FIRST (Critical Priority)
            this.room.onMessage("pong", (timestamp) => {
                this.currentLatency = Date.now() - timestamp;
            });

            console.log("[DEBUG] Step 2: Message Handlers Registered. Setting up State Sync...");

            // 2. PROJECTILES SYNC REMOVED
            
            console.log("[DEBUG] Step 3: State Sync Ready. Starting Ping Loop...");

            // 3. Ping Loop
            this.pingInterval = setInterval(() => {
                this.room?.send("ping", Date.now());
            }, 1000); // 1s Ping

            // 4. Auto-Reconnect Logic
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

    update(time: number, delta: number) {
        if (!this.playerController || !this.network.room) return;

        const input = this.handleInput();
        this.syncNetworkState();

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
                uiScene.updateTime(wrappedTime);
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
            const sprite = this.playerController.addPlayer(sessionId, data.x, data.y, isLocal, data.skin, data.username);
            if (isLocal) {
                console.log(`[CAMERA] Starting to follow local player: ${sessionId} at ${data.x},${data.y}`);
                this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
            }
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
        if (!this.uiText || !this.network.room) return;
        const state = this.network.room.state as any;
        const myState = state.players ? state.players.get(this.network.room.sessionId) : null;
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
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    parent: 'app',
    pixelArt: true,
    render: { maxLights: 50 },
    backgroundColor: '#000000',
    scene: [GameScene, UIScene],
    physics: { default: 'arcade', arcade: { debug: false } }
};

new Phaser.Game(config);