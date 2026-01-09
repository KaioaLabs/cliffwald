import 'reflect-metadata';
import Phaser from 'phaser';
import * as Colyseus from "colyseus.js";
import { GameState, Player, Projectile, WorldItem } from "../shared/SchemaDef";
import { CONFIG, getGameTime } from "../shared/Config";
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
import { UIManager } from './UIManager';
import { LightManager } from './managers/LightManager';
import { VisualProjectileManager } from './managers/VisualProjectileManager';
import { LoginManager } from './managers/LoginManager';

export class GameScene extends Phaser.Scene {
    network: NetworkManager;
    uiManager!: UIManager;
    lightManager!: LightManager;
    projectileManager!: VisualProjectileManager;
    loginManager!: LoginManager;
    
    room?: Colyseus.Room;

    playerController!: PlayerController;
    cameraTarget!: Phaser.GameObjects.PointLight | Phaser.GameObjects.Image; 
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
    physicsWorld?: RAPIER.World;
    gestureManager?: GestureManager;
    
    debugGraphics?: Phaser.GameObjects.Graphics;
    debugManager?: DebugManager;
    
    currentLatency: number = 0;
    accumulatedTime: number = 0;
    readonly FIXED_TIMESTEP = 1 / 60;
    
    authToken: string = "";
    skin: string = "player_idle";

    constructor() {
        super('GameScene');
        this.network = new NetworkManager(this);
        this.setupRemoteLogging();
        
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
            
            // Only log remotely if in dev environment or specifically requested
            if (window.location.hostname === "localhost") {
                fetch(`http://${window.location.hostname}:2568/api/logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'error', message, user })
                }).catch(() => {}); 
            }
            
            oldError.apply(console, args);
        };
    }

    preload() {
        this.cursors = this.input.keyboard?.createCursorKeys();
        AssetManager.preload(this);
    }

    visualProjectiles = new Map<string, Phaser.GameObjects.Shape>();
    itemVisuals = new Map<string, Phaser.GameObjects.GameObject>();
    tableShadows: Phaser.GameObjects.Image[] = [];

    async create() {
        try {
            console.log("Scene Create Start");
            
            this.scene.launch('UIScene');
            this.scene.bringToTop('UIScene');
            const uiScene = this.scene.get('UIScene');

            AssetManager.generateTextures(this);

            await RAPIER.init();
            this.physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });

            const map = this.make.tilemap({ key: 'map' });
            
            const tileset = map.addTilesetImage('placeholder_tiles', 'tiles');
            const tilesetTable = map.addTilesetImage('table', 'table');
            const tilesetFloor = map.addTilesetImage('floor_cobble', 'floor_cobble');

            if (tileset && tilesetTable && tilesetFloor) {
                const floorLayer = map.createLayer('floor_text', tilesetFloor, 0, 0);
                if (floorLayer) {
                    if (CONFIG.USE_LIGHTS) floorLayer.setPipeline('Light2D');
                    floorLayer.setDepth(-101); 
                }

                const groundLayer = map.createLayer('Ground', tileset, 0, 0);
                if (groundLayer) {
                    if (CONFIG.USE_LIGHTS) groundLayer.setPipeline('Light2D');
                    groundLayer.setDepth(-100); 
                }

                const furnitureLayer = map.createLayer('Furniture', tilesetTable, 0, 0);
                if (furnitureLayer) {
                    if (CONFIG.USE_LIGHTS) furnitureLayer.setPipeline('Light2D');
                    furnitureLayer.setDepth(-99);

                    furnitureLayer.forEachTile((tile) => {
                        if (tile.index !== -1) {
                            // OPTIMIZATION: Only create shadow for the BOTTOM tile of an object
                            const tileBelow = furnitureLayer.getTileAt(tile.x, tile.y + 1);
                            
                            // If there is a tile below with an index != -1, it's part of the same object column.
                            // We only want a shadow at the feet/base.
                            if (tileBelow && tileBelow.index !== -1) {
                                return; 
                            }

                            const tx = tile.getCenterX();
                            const ty = tile.getBottom();
                            
                            // Fallback to Image (Quad missing)
                            const shadow = this.add.image(tx, ty, 'table');
                            shadow.setTint(0x000000);
                            shadow.setAlpha(0.3);
                            shadow.setDepth(-99.5);
                            
                            // Store base position
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

            this.lightManager = new LightManager(this);
            this.lightManager.initFromMap(map);

            this.playerController = new PlayerController(this, this.physicsWorld);
            AssetManager.createAnimations(this);
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;

            this.cameraTarget = this.add.image(1600, 1000, '').setVisible(false);
            this.cameras.main.startFollow(this.cameraTarget, true, 0.2, 0.2);
            this.cameras.main.centerOn(1600, 1000);

            this.gestureManager = new GestureManager(this, uiScene);
            this.gestureManager.onGestureRecognized = (id: string, score: number, centroid: {x: number, y: number}) => {
                const sessionId = this.room?.sessionId || "";
                const playerPos = this.playerController.getPosition(sessionId);

                if (playerPos && centroid) {
                    const worldPoint = this.cameras.main.getWorldPoint(centroid.x, centroid.y);
                    
                    this.showCastEffect(id, worldPoint.x, worldPoint.y);

                    const aimVector = new Phaser.Math.Vector2(worldPoint.x - playerPos.x, worldPoint.y - playerPos.y).normalize();

                    this.network.sendCast(id, aimVector.x * CONFIG.SPELL_CONFIG.BASE_SPEED, aimVector.y * CONFIG.SPELL_CONFIG.BASE_SPEED);

                    const projData = {
                        x: playerPos.x,
                        y: playerPos.y,
                        spellId: id,
                        vx: aimVector.x * CONFIG.SPELL_CONFIG.BASE_SPEED,
                        vy: aimVector.y * CONFIG.SPELL_CONFIG.BASE_SPEED
                    };
                    const visualProj = this.createProjectileSprite(projData);
                    
                    this.tweens.add({
                        targets: visualProj,
                        x: playerPos.x + aimVector.x * CONFIG.SPELL_CONFIG.BASE_RANGE * 2, 
                        y: playerPos.y + aimVector.y * CONFIG.SPELL_CONFIG.BASE_RANGE * 2,
                        duration: CONFIG.SPELL_CONFIG.VISUAL_TWEEN_DURATION,
                        onComplete: () => visualProj.destroy()
                    });
                }
            };

            this.loginManager = new LoginManager((token, skin) => {
                this.authToken = token;
                this.skin = skin;

                this.uiManager = new UIManager(this, this.network);
                this.uiManager.create();

                console.log("[DEBUG] Calling connect()...");
                this.connect();
            });

            this.loginManager.autoLogin();

            this.scale.on('resize', this.handleResize, this);
            
            // Initialize DebugManager ONLY in Development Mode
        if (import.meta.env.DEV) {
            this.debugManager = new DebugManager(this);
        }

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
        let config = SPELL_REGISTRY['circle']; 
        for (const key in SPELL_REGISTRY) {
            if (id.includes(key)) {
                config = SPELL_REGISTRY[key];
                break;
            }
        }
        const color = config.color;

        const graphics = this.add.graphics({ x, y });
        graphics.lineStyle(3, color, 1);
        graphics.setBlendMode(Phaser.BlendModes.ADD);
        graphics.setDepth(2000); 
        
        if (config.shape === 'triangle') {
            graphics.strokeTriangle(-20, -17, 20, -17, 0, 23);
        } else if (config.shape === 'square') {
            graphics.strokeRect(-20, -20, 40, 40);
        } else {
            graphics.strokeCircle(0, 0, 20);
        }

        const light = this.lights.addLight(x, y, 120, color, 3.0);

        this.tweens.add({
            targets: graphics,
            alpha: 0,
            scale: 1.5,
            angle: 45, 
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
                graphics.destroy();
                this.lights.removeLight(light);
            }
        });

        this.tweens.add({
            targets: light,
            intensity: 0,
            radius: 200, 
            duration: 800
        });
    }

    // --- CORREGIDO: LOGIN LOGIC ---
    // Logic moved to managers/LoginManager.ts

    async connect() {
        try {
            console.log("Connecting to Colyseus...");

            // Setup Network Listeners BEFORE connecting
            this.network.onPong = (latency) => this.currentLatency = latency;
            this.network.onChatMessage = (msg) => this.uiManager.appendChatMessage(msg);

            this.network.onProjectileAdd = (proj: Projectile, id: string) => {
                console.log(`[MAIN] onProjectileAdd: ${id} Owner: ${proj.ownerId} Me: ${this.room?.sessionId}`);
                if (this.room && proj.ownerId === this.room.sessionId) return;
                
                console.log(`[MAIN] Spawning Remote Projectile at ${proj.x}, ${proj.y} with V=${proj.vx},${proj.vy}`);
                const visual = this.createProjectileSprite({
                    x: proj.x, y: proj.y, spellId: proj.spellId, vx: proj.vx, vy: proj.vy
                }, proj.creationTime);
                this.visualProjectiles.set(id, visual);
            };

            this.network.onProjectileChange = (proj: Projectile, id: string) => {
                const visual = this.visualProjectiles.get(id);
                if (visual) {
                    // Smooth lerp to new server position
                    // We can use a tween for smoothing or just set it if update rate is high (30fps)
                    // Given 30fps, let's use a very short tween or direct set.
                    // Direct set is safest to avoid overshooting.
                    // Or a small lerp factor.
                    
                    // Simple LERP manually in update loop is best, but here we are in an event callback.
                    // Let's use a tween of 33ms (1 frame) to smooth it.
                    this.tweens.add({
                        targets: visual,
                        x: proj.x,
                        y: proj.y,
                        duration: 50, // slightly more than 1 tick (33ms) to buffer
                        ease: 'Linear'
                    });
                }
            };

            this.network.onProjectileRemove = (proj: Projectile, id: string) => {
                const visual = this.visualProjectiles.get(id);
                if (visual) {
                    visual.destroy();
                    this.visualProjectiles.delete(id);
                }
            };

            // Items (if NetworkManager supports it - we need to check/add if missing)
            // Checking NetworkManager.ts, it doesn't have onItemAdd yet. 
            // We should add it to NetworkManager first, OR keep the manual attach for items for now 
            // if we want to be atomic. But the instruction says "Refactor... items". 
            // I will implement the callback on NetworkManager side too.
            // For now, let's assume I will update NetworkManager.ts in the next step.
            
            /* 
               Wait, the previous `attachRoomListeners` handled items too. 
               If I remove it, I lose item sync. 
               I must update NetworkManager.ts to support `onItemAdd` / `onItemRemove`.
            */

            const success = await this.network.connect(this.authToken, this.skin);
            
            if (success && this.network.room) {
                this.room = this.network.room;
                console.log("Joined successfully!", this.room.sessionId);
                
                // Item Sync (Manual for now until NetworkManager is updated, or I can update NetworkManager first)
                // Actually, let's keep the manual Item sync here temporarily but use the better 'attach' pattern
                // OR better yet, let's just delegate the Item sync to a new method in this file 
                // to avoid the nested complexity, while I prepare to update NetworkManager.
                
                this.setupItemSync();

                this.room.onLeave((code) => {
                    console.warn(`[NETWORK] Disconnected (Code: ${code}). Attempting Auto-Reconnect...`);
                    this.playerController.players.forEach((entity) => {
                        if (entity.player) this.playerController.removePlayer(entity.player.sessionId);
                    });
                    
                    this.uiManager.showReconnecting();
                    
                    setTimeout(() => {
                        this.connect(); 
                    }, 2000);
                });
            }

        } catch (e) {
            console.error("Join Error:", e);
        }
    }

    setupItemSync() {
        if (!this.room || !this.room.state) return;

        const attach = <T>(collection: any, event: 'onAdd' | 'onRemove', cb: (item: T, key: string) => void) => {
            if (!collection) return;
            if (typeof collection[event] === 'function') {
                collection[event](cb);
            } else {
                collection[event] = cb;
            }
             // Trigger for existing items
            if (event === 'onAdd' && collection.forEach) {
                collection.forEach((item: T, key: string) => cb(item, key));
            }
        };

        const setup = () => {
            if (this.room?.state.items) {
                attach(this.room.state.items, 'onAdd', (item: any, id: string) => {
                    if (this.itemVisuals.has(id)) return;
                    
                    const sprite = this.add.rectangle(item.x, item.y, 14, 14, 0xFFD700);
                    sprite.setStrokeStyle(2, 0xFFFFFF);
                    sprite.setDepth(-80); 
                    
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

                attach(this.room.state.items, 'onRemove', (_: any, id: string) => {
                    const v = this.itemVisuals.get(id);
                    if (v) v.destroy();
                    this.itemVisuals.delete(id);
                });
            }
        };

        if (this.room.state.items) {
            setup();
        } else {
            this.room.onStateChange.once(() => setup());
        }
    }

    createProjectileSprite(data: any, creationTime?: number): Phaser.GameObjects.Shape {
        let projectile: Phaser.GameObjects.Shape;
        const angle = Math.atan2(data.vy, data.vx);
        
        let config = SPELL_REGISTRY['circle']; 
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

        const now = Date.now();
        const timestamp = creationTime || now; 
        const age = now - timestamp;

        if (age < 1000) { 
            const audioKey = `audio_${config.shape}`; 
            if (this.sound.get(audioKey) || this.cache.audio.exists(audioKey)) {
                this.sound.play(audioKey);
            } else {
                console.warn(`[AUDIO] Missing key: ${audioKey}`);
            }
        } 

        return projectile;
    }

    update(time: number, delta: number) {
        if (!this.playerController || !this.network || !this.network.room) return;

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

        this.playerController.applyInput(this.network.room.sessionId, input);
        
        this.accumulatedTime += delta / 1000;
        while (this.accumulatedTime >= this.FIXED_TIMESTEP) {
            MovementSystem(this.playerController.world);
            if (this.physicsWorld) this.physicsWorld.step();
            this.accumulatedTime -= this.FIXED_TIMESTEP;
        }
        
        this.playerController.updateVisuals();
        
        if (this.network.room) {
            const state = this.network.room.state;
            const myState = state.players ? state.players.get(this.network.room.sessionId) : null;
            
            const uiScene = this.scene.get('UIScene') as UIScene;
            if (uiScene) {
                uiScene.updatePoints(state.ignisPoints || 0, state.axiomPoints || 0, state.vesperPoints || 0);
            }
            
            if (this.uiManager) {
                this.uiManager.updateTelemetry(this.currentLatency, myState || null);
            }
        }

        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        /* OPTIMIZATION: Static shadows do not need updates
        this.tableShadows.forEach(shadow => {
            const baseX = shadow.getData('baseX');
            const baseY = shadow.getData('baseY');
            
            ShadowUtils.updateShadow(
                shadow,
                baseX,
                baseY,
                1.0, 
                1.0, 
                -99, 
                32,  
                worldPoint.x,
                worldPoint.y
            );
        });
        */

        if (this.debugManager) this.debugManager.update();

        const gameTime = getGameTime(Date.now());
        const decimalHour = gameTime.hour + (gameTime.minute / 60);

        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene) {
            const displaySeconds = gameTime.hour * 3600 + gameTime.minute * 60;
            if (this.network.room) {
                 uiScene.updateTime(displaySeconds, this.network.room.state.currentCourse, this.network.room.state.currentMonth);
            }
        }

        if (this.lightManager) {
            this.lightManager.update(decimalHour);
        }

        if (this.uiManager) {
            this.uiManager.updateTimetable(gameTime.hour);
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
            
            players.forEach((p: any, id: string) => this.syncPlayer(id, p));
            
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

    handleResize(gameSize: any) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    }

    lastInputState = { left: false, right: false, up: false, down: false };

    handleInput() {
        if (!this.room || !this.cursors || !this.wasd) return { left: false, right: false, up: false, down: false };
        if (this.uiManager && this.uiManager.getChatInputActive()) {
            return { left: false, right: false, up: false, down: false };
        }
        
        let input = {
            left: this.cursors.left.isDown || this.wasd.A.isDown,
            right: this.cursors.right.isDown || this.wasd.D.isDown,
            up: this.cursors.up.isDown || this.wasd.W.isDown,
            down: this.cursors.down.isDown || this.wasd.S.isDown
        };

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