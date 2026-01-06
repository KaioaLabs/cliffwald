import 'reflect-metadata';
import Phaser from 'phaser';
// Colyseus import moved to top by previous edit, removing duplicate here if any, or ensuring clean imports.
import * as Colyseus from "colyseus.js";
import { CONFIG } from "../shared/Config";
import { THEME } from "../shared/Theme";
import { PlayerController } from "./PlayerController";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { VirtualJoystick } from './VirtualJoystick';
import { NetworkManager } from './NetworkManager';
import { DebugManager } from './DebugManager';
import { GestureManager } from './GestureManager';
import { SPELL_REGISTRY } from '../shared/items/SpellRegistry';
import { ShadowUtils } from './ShadowUtils';
import { UIScene } from './scenes/UIScene';
import { CardAlbumScene } from './scenes/CardAlbumScene';
import { AssetManager } from './managers/AssetManager';

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
        AssetManager.preload(this);
    }

    // Registry for networked projectiles
    visualProjectiles = new Map<string, Phaser.GameObjects.Shape>();
    itemVisuals = new Map<string, Phaser.GameObjects.GameObject>();
    tableShadows: Phaser.GameObjects.Image[] = [];

    async create() {
        try {
            console.log("Scene Create Start");
            
            this.scene.launch('UIScene');
            this.scene.bringToTop('UIScene');
            const uiScene = this.scene.get('UIScene');

            // --- GENERATE ASSETS ---
            AssetManager.generateTextures(this);

            await RAPIER.init();
            this.physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });

            // ... (Map and Player setup remain the same)
            const map = this.make.tilemap({ key: 'map' });
            
            // Add all tilesets defined in Tiled
            const tileset = map.addTilesetImage('placeholder_tiles', 'tiles');
            const tilesetTable = map.addTilesetImage('table', 'table');
            const tilesetFloor = map.addTilesetImage('floor_cobble', 'floor_cobble');

            // Create Layers (Order matters for default z-index, but we setDepth anyway)
            if (tileset && tilesetTable && tilesetFloor) {
                // 1. Floor Text (Bottom)
                const floorLayer = map.createLayer('floor_text', tilesetFloor, 0, 0);
                if (floorLayer) {
                    floorLayer.setPipeline('Light2D');
                    floorLayer.setDepth(-101); 
                }

                // 2. Ground (Middle)
                const groundLayer = map.createLayer('Ground', tileset, 0, 0);
                if (groundLayer) {
                    groundLayer.setPipeline('Light2D');
                    groundLayer.setDepth(-100); 
                }

                // 3. Furniture (Top of static world)
                const furnitureLayer = map.createLayer('Furniture', tilesetTable, 0, 0);
                if (furnitureLayer) {
                    furnitureLayer.setPipeline('Light2D');
                    furnitureLayer.setDepth(-99);

                    // --- TABLE SHADOWS ---
                    furnitureLayer.forEachTile((tile) => {
                        if (tile.index !== -1) {
                            // Center X, Bottom Y of the tile
                            const tx = tile.getCenterX();
                            const ty = tile.getBottom();
                            
                            const shadow = this.add.image(tx, ty, 'table');
                            shadow.setTint(0x000000);
                            shadow.setAlpha(0.3);
                            shadow.setOrigin(0.5, 1.0); // Pivot at feet/bottom
                            shadow.setDepth(-99.5); // Below table (-99), above ground (-100)
                            
                            shadow.setData('baseX', tx);
                            shadow.setData('baseY', ty);

                            this.tableShadows.push(shadow);
                        }
                    });
                }
            } else {
                console.error("Failed to load one or more tilesets:", { tileset, tilesetTable, tilesetFloor });
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
            this.lights.enable().setAmbientColor(0x888888); 

            this.playerController = new PlayerController(this, this.physicsWorld);
            AssetManager.createAnimations(this);
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;

            // Camera Target Setup
            this.cameraTarget = this.add.image(1600, 1000, '').setVisible(false);
            this.cameras.main.startFollow(this.cameraTarget, true, 0.2, 0.2);
            this.cameras.main.centerOn(1600, 1000);

            // 2b. Gestures
            this.gestureManager = new GestureManager(this, uiScene);
            this.gestureManager.onGestureRecognized = (id: string, score: number, centroid: {x: number, y: number}) => {
                const sessionId = this.room?.sessionId || "";
                const playerPos = this.playerController.getPosition(sessionId);

                if (playerPos && centroid) {
                    const worldPoint = this.cameras.main.getWorldPoint(centroid.x, centroid.y);
                    
                    // --- VISUAL CAST EFFECT ---
                    this.showCastEffect(id, worldPoint.x, worldPoint.y);

                    const aimVector = new Phaser.Math.Vector2(worldPoint.x - playerPos.x, worldPoint.y - playerPos.y).normalize();

                    // MULTIPLAYER CAST: Send to server
                    this.network.sendCast(id, aimVector.x * 400, aimVector.y * 400);

                    // Local Feedback: Spawn Projectile locally (Client Prediction)
                    const projData = {
                        x: playerPos.x,
                        y: playerPos.y,
                        spellId: id,
                        vx: aimVector.x * 400,
                        vy: aimVector.y * 400
                    };
                    const visualProj = this.createProjectileSprite(projData);
                    
                    // Animate it flying
                    this.tweens.add({
                        targets: visualProj,
                        x: playerPos.x + aimVector.x * 1200, 
                        y: playerPos.y + aimVector.y * 1200,
                        duration: 3000,
                        onComplete: () => visualProj.destroy()
                    });
                }
            };

            // 6. Auto-Login based on URL
            this.autoLogin();

            // 7. Events
            this.scale.on('resize', this.handleResize, this);
            
            // 8. Debug Tools
            this.debugManager = new DebugManager(this);

            // 9. Input & Zoom Control
            this.input.mouse?.disableContextMenu();

            this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
                const zoomSpeed = 0.001;
                let newZoom = this.cameras.main.zoom - (deltaY * zoomSpeed);
                newZoom = Phaser.Math.Clamp(newZoom, 0.7, 1.3);
                this.cameras.main.setZoom(newZoom);
            });

        } catch (e: any) {
            console.error("Create Crash:", e);
        }
    }

    showCastEffect(id: string, x: number, y: number) {
        let config = SPELL_REGISTRY['circle']; // Default
        for (const key in SPELL_REGISTRY) {
            if (id.includes(key)) {
                config = SPELL_REGISTRY[key];
                break;
            }
        }
        const color = config.color;

        // 1. Shape Graphics (Outline)
        const graphics = this.add.graphics({ x, y });
        graphics.lineStyle(3, color, 1);
        graphics.setBlendMode(Phaser.BlendModes.ADD);
        graphics.setDepth(2000); // Top
        
        // Emulate Glow by drawing twice? Or just rely on Light
        if (config.shape === 'triangle') {
            graphics.strokeTriangle(-20, -17, 20, -17, 0, 23);
        } else if (config.shape === 'square') {
            graphics.strokeRect(-20, -20, 40, 40);
        } else {
            graphics.strokeCircle(0, 0, 20);
        }

        // 2. Real Light Emission
        // Note: 'radius' and 'intensity'
        const light = this.lights.addLight(x, y, 120, color, 3.0);

        // 3. Animation: Expand and Fade
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            scale: 1.5,
            angle: 45, // Rotate slightly
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
                graphics.destroy();
                this.lights.removeLight(light);
            }
        });

        // Animate Light
        this.tweens.add({
            targets: light,
            intensity: 0,
            radius: 200, // Expand light area as it fades
            duration: 800
        });
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

                this.network.onChatMessage = (msg) => {
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        const el = document.createElement('div');
                        el.style.marginBottom = '4px';
                        el.innerText = `${msg.sender}: ${msg.text}`;
                        chatMessages.appendChild(el);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                };

                // PROJECTILES SYNC
                const state = this.room.state;
                
                // ITEMS SYNC (Cards)
                if (state.items) {
                    (state.items as any).onAdd((item: any, id: string) => {
                        const sprite = this.add.rectangle(item.x, item.y, 14, 14, 0xFFD700);
                        sprite.setStrokeStyle(2, 0xFFFFFF);
                        sprite.setDepth(-80); // On floor
                        
                        // Tween: Float
                        this.tweens.add({
                            targets: sprite,
                            y: item.y - 5,
                            duration: 1500,
                            yoyo: true,
                            repeat: -1
                        });

                        sprite.setInteractive({ cursor: 'pointer' });
                        sprite.on('pointerdown', () => {
                            this.network.room?.send("collect", id);
                        });
                        
                        this.itemVisuals.set(id, sprite);
                    });
                    (state.items as any).onRemove((_: any, id: string) => {
                        const v = this.itemVisuals.get(id);
                        if (v) v.destroy();
                        this.itemVisuals.delete(id);
                    });
                }

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
                    this.playerController.players.forEach((entity) => {
                        this.playerController.removePlayer(entity.player!.sessionId);
                    });
                    
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
        const localPlayerEnt = this.playerController.players.get(this.network.room.sessionId);
        const localPlayer = localPlayerEnt?.visual?.sprite;
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

        // --- TABLE SHADOWS UPDATE ---
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        this.tableShadows.forEach(shadow => {
            const baseX = shadow.getData('baseX');
            const baseY = shadow.getData('baseY');
            
            // Table height is tileheight (32)
            ShadowUtils.updateShadow(
                shadow,
                baseX,
                baseY,
                1.0, 
                1.0, 
                -99, // Source Depth
                32,  // Height
                worldPoint.x,
                worldPoint.y
            );
        });

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
        const state = this.network.room?.state;
        if (state && state.players) {
            const players = state.players;
            
            // 1. Sync / Add
            players.forEach((p: any, id: string) => this.syncPlayer(id, p));
            
            // 2. Remove missing
            this.playerController.players.forEach((_, id) => {
                if (!players.has(id)) {
                    console.log(`[NET] Removing player/echo from client: ${id}`);
                    this.playerController.removePlayer(id);
                }
            });
        }
    }

    private syncPlayer(sessionId: string, data: any) {
        if (!this.playerController.players.has(sessionId)) {
            const isLocal = sessionId === this.network.room?.sessionId;
            this.playerController.addPlayer(sessionId, data.x, data.y, isLocal, data.skin, data.username, data.house);
        } else {
            this.playerController.updatePlayerState(sessionId, data);
        }
    }

    createUI() {
        this.uiText = this.add.text(10, 10, 'Initializing...', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: THEME.UI.TEXT_WHITE,
            backgroundColor: THEME.UI.BACKGROUND_DIM
        });
        this.uiText.setScrollFactor(0);
        this.uiText.setDepth(1000);
    }

    updateUI() {
        if (!this.uiText || !this.network || !this.network.room) return;
        const state = this.network.room.state;
        const myState = state.players ? state.players.get(this.network.room.sessionId) : null;
        
        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene) {
            uiScene.updatePoints(state.ignisPoints || 0, state.axiomPoints || 0, state.vesperPoints || 0);
        }

        if (myState) {
            this.uiText.setText(`POS: ${Math.round(myState.x)},${Math.round(myState.y)}
PING: ${this.currentLatency}ms`);
            if (this.currentLatency < 100) this.uiText.setColor(THEME.UI.PING_GOOD);
            else if (this.currentLatency < 200) this.uiText.setColor(THEME.UI.PING_WARN);
            else this.uiText.setColor(THEME.UI.PING_BAD);
        }
    }

    handleResize(gameSize: any) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
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
    scene: [GameScene, UIScene, CardAlbumScene],
    physics: { default: 'arcade', arcade: { debug: false } }
};

new Phaser.Game(config);