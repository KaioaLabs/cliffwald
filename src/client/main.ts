import 'reflect-metadata';
import Phaser from 'phaser';
import * as Colyseus from "colyseus.js";
import { GameState, Player, Projectile, WorldItem } from "../shared/SchemaDef";
import { CONFIG, getGameTime, getAcademicProgress } from "../shared/Config";
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
import { MinigameManager } from './managers/MinigameManager';
import { LadderManager } from './managers/LadderManager';
import { WorldBuilder } from './managers/WorldBuilder';

export class GameScene extends Phaser.Scene {
    network: NetworkManager;
    uiManager!: UIManager;
    lightManager!: LightManager;
    projectileManager!: VisualProjectileManager;
    loginManager!: LoginManager;
    minigameManager!: MinigameManager;
    ladderManager!: LadderManager;
    worldBuilder!: WorldBuilder;
    
    room?: Colyseus.Room;

    playerController!: PlayerController;
    cameraTarget!: Phaser.GameObjects.PointLight | Phaser.GameObjects.Image; 
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
    spaceKey?: Phaser.Input.Keyboard.Key;
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
        this.minigameManager = new MinigameManager();
        this.ladderManager = new LadderManager(this);
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

    itemVisuals = new Map<string, Phaser.GameObjects.GameObject>();

    async create() {
        try {
            console.log("Scene Create Start");
            
            this.scene.launch('UIScene');
            this.scene.bringToTop('UIScene');
            const uiScene = this.scene.get('UIScene');

            AssetManager.generateTextures(this);

            await RAPIER.init();
            this.physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });

            try {
                this.lightManager = new LightManager(this);
            } catch (e) {
                console.error("[LIGHTS] Initialization Failed:", e);
            }

            // Build World
            this.worldBuilder = new WorldBuilder(this, this.physicsWorld, this.lightManager);
            this.worldBuilder.build();

            this.projectileManager = new VisualProjectileManager(this);

            // --- LIBRARY LADDER ---
            const lib = this.worldBuilder.getLocation("LIBRARY");
            if (lib.x !== 0) {
                // Fix: Move shelf to Top-Center of the zone (North Wall)
                // lib.x/y is Top-Left. width/height is dimensions.
                const cx = lib.x + (lib.width || 0) / 2;
                const topY = lib.y; 
                // We might need to push it slightly up/down depending on wall thickness?
                // Assuming topY is the wall base line.
                this.ladderManager.setup(cx, topY);
            }
            
            this.playerController = new PlayerController(this, this.physicsWorld);
            AssetManager.createAnimations(this);
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;
            this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            this.cameraTarget = this.add.image(1600, 1000, '').setVisible(false);
            this.cameras.main.startFollow(this.cameraTarget, true, 0.2, 0.2);
            
            // Mobile Zoom Adjustment
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                this.cameras.main.setZoom(1.5); // 960/640 = 1.5
            } else {
                this.cameras.main.setZoom(1.0);
            }
            
            this.cameras.main.centerOn(1600, 1000);

            this.gestureManager = new GestureManager(this, uiScene);
            this.gestureManager.onGestureRecognized = (id: string, score: number, centroid: {x: number, y: number}) => {
                const sessionId = this.room?.sessionId || "";
                const playerPos = this.playerController.getPosition(sessionId);

                if (playerPos && centroid) {
                    const worldPoint = this.cameras.main.getWorldPoint(centroid.x, centroid.y);
                    
                    if (id === 'unknown') {
                        this.showFizzleEffect(worldPoint.x, worldPoint.y);
                        return; // Stop here, no server message
                    }

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
                    const visualProj = this.projectileManager.createProjectileSprite(projData);
                    
                    this.tweens.add({
                        targets: visualProj,
                        x: playerPos.x + aimVector.x * CONFIG.SPELL_CONFIG.BASE_RANGE * 2, 
                        y: playerPos.y + aimVector.y * CONFIG.SPELL_CONFIG.BASE_RANGE * 2,
                        duration: CONFIG.SPELL_CONFIG.VISUAL_TWEEN_DURATION,
                        onComplete: () => visualProj.destroy()
                    });
                }
            };

            this.loginManager = new LoginManager((token, skin, username) => {
                this.authToken = token;
                this.skin = skin;

                this.uiManager = new UIManager(this, this.network);
                (window as any).gameClient = this;
                this.uiManager.create();

                console.log("[DEBUG] Calling connect()...");
                this.connect();

                // Initialize DebugManager if DEV or ADMIN
                if (import.meta.env.DEV || username === 'admin') {
                    if (!this.debugManager) {
                        console.log("[DEBUG] Enabling Debug Tools for:", username);
                        this.debugManager = new DebugManager(this);
                    }
                }
            });

            this.loginManager.autoLogin();

            this.scale.on('resize', this.handleResize, this);
            
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

    showFizzleEffect(x: number, y: number) {
        // Gray/White Smoke Particles
        const smoke = this.add.particles(x, y, 'star', {
            speed: { min: 20, max: 100 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 600,
            tint: 0x888888,
            maxParticles: 15
        });
        
        // Auto-cleanup after short duration
        this.time.delayedCall(1000, () => smoke.destroy());
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
                if (this.room && proj.ownerId === this.room.sessionId) return;
                this.projectileManager.addNetworkProjectile(id, proj);
            };

            this.network.onProjectileChange = (proj: Projectile, id: string) => {
                this.projectileManager.updateProjectile(id, proj.x, proj.y);
            };

            this.network.onProjectileRemove = (proj: Projectile, id: string) => {
                this.projectileManager.removeNetworkProjectile(id);
            };
            
            // Listen for Jump Events
            this.network.onPlayerJump = (sessionId: string) => {
                this.playerController.performJump(sessionId);
            };
            
            // CLASS MINIGAME LISTENERS
            // Note: These need to be attached AFTER connection usually, but here we attach to room?
            // Wait, this.network.room is null here before connect().
            // Correct approach: NetworkManager should handle these or we attach after connect.
            // But let's look at how onPong works. It's a callback on NetworkManager.
            
            // For now, let's just keep them here but we must attach them AFTER connect() succeeds.
            // Removing the broken code block.

            const success = await this.network.connect(this.authToken, this.skin);
            
            if (success && this.network.room) {
                this.room = this.network.room;
                console.log("Joined successfully!", this.room.sessionId);
                
                // Attach Minigame Listeners NOW that room exists
                this.room.onMessage("start_minigame", (data: { duration: number, type: string }) => {
                    console.log("[CLASS] Starting Minigame:", data.type);
                    let type: 'charms' | 'potions' | 'history' = 'charms';
                    if (data.type === 'potions') type = 'potions';
                    if (data.type === 'history') type = 'history';
                    
                    this.minigameManager.startMinigame(type, data.duration, (score) => {
                        console.log("[CLASS] Minigame finished. Score:", score);
                        this.network.room?.send("submit_score", { score });
                    });
                });
                
                this.room.onMessage("class_completed", (data: { grade: string, points: number }) => {
                    this.uiManager.showNotification(`Class Finished! Grade: ${data.grade} (+${data.points} PA)`);
                });
                
                this.room.onMessage("zone_enter", (data: { name: string }) => {
                    this.uiManager.showZoneNotification(data.name);
                });
                
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
                    
                    let sprite: Phaser.GameObjects.GameObject;

                    // --- TIMER VISUAL ---
                    if (item.type === 'timer') {
                        const text = this.add.text(item.x, item.y, item.itemId, {
                            fontSize: '48px',
                            fontFamily: 'serif',
                            color: '#FF0000',
                            stroke: '#000000',
                            strokeThickness: 6
                        }).setOrigin(0.5).setDepth(100);
                        
                        // Pulse Effect
                        this.tweens.add({
                            targets: text,
                            scale: 1.2,
                            duration: 500,
                            yoyo: true,
                            repeat: -1
                        });

                        // Watch for changes to update number
                        item.onChange(() => {
                            text.setText(item.itemId);
                        });

                        sprite = text;
                    } 
                    // --- DETENTION TASK VISUAL ---
                    else if (item.type === 'task') {
                        let color = 0x888888; // Default gray
                        if (item.itemId === 'scroll') color = 0xffff00;
                        if (item.itemId === 'dust') color = 0xffffff;
                        
                        const rect = this.add.rectangle(item.x, item.y, 24, 24, color);
                        rect.setStrokeStyle(2, 0x000000);
                        rect.setDepth(10);
                        
                        // Floating animation
                        this.tweens.add({
                            targets: rect,
                            y: item.y - 10,
                            duration: 1000,
                            yoyo: true,
                            repeat: -1
                        });

                        rect.setInteractive({ cursor: 'pointer' });
                        rect.on('pointerdown', () => {
                            this.network.room?.send("collect", id);
                        });
                        
                        sprite = rect;
                    }
                    // --- STANDARD ITEM VISUAL ---
                    else {
                        let visual: Phaser.GameObjects.Image | Phaser.GameObjects.Shape;
                        
                        if (this.textures.exists('frame_bronze')) {
                            visual = this.add.image(item.x, item.y, 'frame_bronze');
                            (visual as Phaser.GameObjects.Image).setDisplaySize(20, 28);
                        } else {
                            visual = this.add.rectangle(item.x, item.y, 20, 20, 0x00FFFF);
                            (visual as Phaser.GameObjects.Shape).setStrokeStyle(2, 0xFFFFFF);
                            visual.rotation = 0.785; // 45 deg
                        }
                        
                        visual.setDepth(-5);
                        
                        this.tweens.add({
                            targets: visual,
                            y: item.y - 8,
                            duration: 1500,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });

                        visual.setInteractive({ cursor: 'pointer' });
                        visual.on('pointerdown', () => {
                            this.tweens.add({ targets: visual, scaleX: visual.scaleX * 0.8, scaleY: visual.scaleY * 0.8, duration: 100, yoyo: true });
                            
                            const localPlayer = this.playerController.players.get(this.network.room.sessionId);
                            if (localPlayer && localPlayer.visual?.sprite) {
                                const p = localPlayer.visual.sprite;
                                const dist = Phaser.Math.Distance.Between(p.x, p.y, item.x, item.y);
                                if (dist > 120) {
                                    const txt = this.add.text(item.x, item.y - 20, "Too far!", { fontSize: '12px', color: '#ff0000', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
                                    txt.setDepth(100);
                                    this.tweens.add({ targets: txt, y: item.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
                                } else {
                                    this.network.room?.send("collect", id);
                                }
                            }
                        });
                        sprite = visual;
                    }
                    
                    this.itemVisuals.set(id, sprite);
                });

                attach(this.room.state.items, 'onRemove', (_: any, id: string) => {
                    const v = this.itemVisuals.get(id);
                    if (v) {
                        // Disappear animation
                        this.tweens.add({
                            targets: v,
                            alpha: 0,
                            scale: 0,
                            duration: 300,
                            onComplete: () => v.destroy()
                        });
                    }
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
        this.projectileManager.update(delta);
        
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
        // const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // Update Static Object Shadows (Tables) - THROTTLED & SUN-BASED
        if (this.game.loop.frame % 10 === 0 && this.lightManager) {
            const sunPos = this.lightManager.getSunPosition();
            
            this.worldBuilder.tableShadows.forEach(shadow => {
                try {
                    const baseX = shadow.getData('baseX');
                    const baseY = shadow.getData('baseY');
                    const sX = shadow.getData('sourceScaleX') || 1.0;
                    const sY = shadow.getData('sourceScaleY') || 1.0;
                    const h = shadow.getData('height') || 32;
                    
                    ShadowUtils.updateShadow(
                        shadow,
                        baseX,
                        baseY,
                        sX,  
                        sY,  
                        -99,  
                        h,   
                        sunPos.x,
                        sunPos.y
                    );
                } catch (e) { }
            });
        }
        
        if (this.debugManager) this.debugManager.update();

        // TIME SYNC: Apply server offset to local time
        let decimalHour = 0;
        let gameTime = { hour: 12, minute: 0, day: 1, month: 'Jan', year: 1 };
        
        // Use Server Synced Time
        const offset = this.network.room?.state.timeOffset || 0;
        const now = Date.now() + offset;
        gameTime = getGameTime(now);
        decimalHour = gameTime.hour + (gameTime.minute / 60);

            // Update Calendar UI
            if (this.network.room) {
                const worldStart = this.network.room.state.worldStartTime;
                const progress = getAcademicProgress(worldStart, now);
                // const phase = gameTime.isNight ? 'Night' : 'Day'; // Removed phase
                
                if (this.uiManager) {
                    this.uiManager.updateHUDTime(gameTime.hour, gameTime.minute, progress.currentDay, progress.currentMonth);
                }
            }

        /* Legacy UIScene Time Update - REMOVED
        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene) {
            const displaySeconds = gameTime.hour * 3600 + gameTime.minute * 60;
            if (this.network.room) {
                 uiScene.updateTime(displaySeconds, this.network.room.state.currentCourse, this.network.room.state.currentMonth);
            }
        }
        */

        if (this.lightManager) {
            try {
                this.lightManager.update(decimalHour);
            } catch (e) {
                console.error("[LIGHTS] Update Failed:", e);
            }
        }

        if (this.uiManager) {
            this.uiManager.updateTimetable(gameTime.hour);
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
            
            // Initial Status Check
            if (data.isAttendingClass) {
                this.playerController.updateClassStatus(sessionId, true, data.classEndsAt);
            }
            
            // Listen for future changes (Schema only)
            if (typeof data.onChange === 'function') {
                data.onChange(() => {
                    this.playerController.updateClassStatus(sessionId, data.isAttendingClass, data.classEndsAt);
                });
            }

        } else {
            this.playerController.updatePlayerState(sessionId, data, data.unconsciousUntil);
        }
    }

    handleResize(gameSize: any) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    }

    lastInputState = { left: false, right: false, up: false, down: false };

    handleInput() {
        // Strict Login Gate: No input processing until authenticated
        if (!this.authToken || !this.room) return { left: false, right: false, up: false, down: false };

        const localId = this.network.room.sessionId;
        const player = this.playerController.players.get(localId);

        // --- LADDER INTERACTION ---
        if (this.ladderManager.handleInteraction(player, this.cursors, this.wasd)) {
            return { left: false, right: false, up: false, down: false }; // Consume input
        }

        if (!this.cursors || !this.wasd) return { left: false, right: false, up: false, down: false };
        if (this.uiManager && this.uiManager.getChatInputActive()) {
            return { left: false, right: false, up: false, down: false };
        }

        if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.network.sendJump();
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

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: { 
        mode: Phaser.Scale.FIT, 
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: isMobile ? 960 : 640, 
        height: isMobile ? 540 : 360 
    },
    parent: 'app',
    pixelArt: true,
    roundPixels: true,
    render: { maxLights: 50 },
    backgroundColor: '#000000',
    scene: [GameScene, UIScene, CardAlbumScene],
    // physics: { default: 'arcade', arcade: { debug: false } }, // Removed: Using Rapier
    lights: { enable: true, ambientColor: 0x808080 }
};

(window as any).game = new Phaser.Game(config);
