import Phaser from 'phaser';
import { PlayerController } from './PlayerController';
import { AssetManager } from './managers/AssetManager';
import { UIManager } from './UIManager';
import { GestureManager } from './GestureManager';
import { LoginManager } from './managers/LoginManager';
import { DebugManager } from './DebugManager';
import { VisualProjectileManager } from './managers/VisualProjectileManager';
import { WorldBuilder } from './managers/WorldBuilder';
import { ShadowUtils } from './ShadowUtils';
import { LightManager } from './managers/LightManager';
import { MinigameManager } from './managers/MinigameManager';
import { CONFIG, getGameTime, getAcademicProgress } from '../shared/Config';
import { SPELL_REGISTRY } from '../shared/items/SpellRegistry';
import { Projectile } from '../shared/SchemaDef';
import { MovementSystem } from '../shared/systems/MovementSystem';
import { UIScene } from './scenes/UIScene';
import { GrassManager } from './managers/GrassManager';
import { ForceManager } from './managers/ForceManager';
import { GrassPipeline } from './managers/GrassPipeline';
import waterFrag from './shaders/water.frag?raw';
import grassVert from './shaders/grass.vert?raw';
import grassFrag from './shaders/grass.frag?raw';

import { NetworkManager } from './NetworkManager';
import { WaterManager } from './managers/WaterManager';

import RAPIER from '@dimforge/rapier2d-compat';

export class GameScene extends Phaser.Scene {
    // Managers
    public network!: NetworkManager;
    public playerController!: PlayerController;
    public uiManager!: UIManager;
    public grassManager!: GrassManager;
    public forceManager!: ForceManager;
    public projectileManager!: VisualProjectileManager;
    public lightManager!: LightManager;
    public minigameManager!: MinigameManager;
    public debugManager?: DebugManager;
    public gestureManager!: GestureManager;
    public loginManager!: LoginManager;
    public worldBuilder!: WorldBuilder;
    public waterManager!: WaterManager;

    // State
    public authToken: string = "";
    public skin: string = "player_idle";
    public room?: any;
    public itemVisuals: Map<string, Phaser.GameObjects.GameObject> = new Map();
    public currentLatency: number = 0;
    
    // Core
    public physicsWorld!: RAPIER.World;
    public accumulatedTime: number = 0;
    public readonly FIXED_TIMESTEP = 1 / 60;
    
    // Input
    public cursor: any;
    public wasd: any;
    public spaceKey: any;
    public cursors: any;
    
    // Camera
    public cameraTarget: any;

    constructor() {
        super('GameScene');
    }

    async init() {
        this.network = new NetworkManager();
        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
    }

    preload() {
        AssetManager.preload(this);
    }
// ...
    async create() {
        try {
            console.log("Scene Create Start");
            
            // --- REGISTER GRASS PIPELINE ---
            const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
            if (renderer.pipelines) {
                renderer.pipelines.add('GrassPipeline', new GrassPipeline({
                    game: this.game,
                    vertShader: grassVert,
                    fragShader: grassFrag
                }));
            }

            this.scene.launch('UIScene');
// ...
            // --- INTERACTIVE GRASS ---
            this.forceManager = new ForceManager(this);
            this.grassManager = new GrassManager(this, this.forceManager);
            this.grassManager.generateTestPatch(CONFIG.SPAWN_POINT.x, CONFIG.SPAWN_POINT.y, 15);

            this.projectileManager = new VisualProjectileManager(this);
// ...

            this.playerController = new PlayerController(this, this.physicsWorld);
            AssetManager.createAnimations(this);
            this.cursors = this.input.keyboard!.createCursorKeys();
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;
            this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            
            this.lightManager = new LightManager(this);
            
            // --- REGISTER SHADERS ---
            if (!this.cache.shader.exists('water')) {
                const baseShader = new Phaser.Display.BaseShader('water', waterFrag);
                this.cache.shader.add('water', baseShader);
            }

            this.waterManager = new WaterManager(this);
            AssetManager.generateTextures(this);

            this.worldBuilder = new WorldBuilder(this, this.physicsWorld as any, this.lightManager, this.waterManager, this.grassManager);
            this.worldBuilder.build();

            this.cameraTarget = this.add.image(1600, 1000, '').setVisible(false);
            this.cameras.main.startFollow(this.cameraTarget, true, 0.2, 0.2);
            
            // Modern Mobile Detection (2026)
            // 1. Check UA for obvious mobile devices
            // 2. Check for Touch Capability + Small Screen (excludes Touch Laptops)
            const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isTouch = navigator.maxTouchPoints > 0 || (window as any).matchMedia("(any-pointer: coarse)").matches;
            const isSmallScreen = window.innerWidth < 1024;
            
            const isMobile = uaMobile || (isTouch && isSmallScreen);

            if (isMobile) {
                this.cameras.main.setZoom(1.5); 
            } else {
                this.cameras.main.setZoom(1.0);
            }
            
            this.cameras.main.centerOn(1600, 1000);

            // UI MANAGER (Initialize Early for Intro)
            this.uiManager = new UIManager(this, this.network);
            (window as any).gameClient = this;
            this.uiManager.create();

            const uiScene = this.scene.get('UIScene') as UIScene;
            this.gestureManager = new GestureManager(this, uiScene);
            this.gestureManager.onGestureRecognized = (id: string, score: number, centroid: {x: number, y: number}) => {
                const sessionId = this.room?.sessionId || "";
                const playerPos = this.playerController.getPosition(sessionId);

                if (playerPos && centroid) {
                    const worldPoint = this.cameras.main.getWorldPoint(centroid.x, centroid.y);
                    
                    if (id === 'unknown') {
                        this.showFizzleEffect(worldPoint.x, worldPoint.y);
                        return; 
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

                // Transition UI to Game Mode
                this.uiManager.setGameState('PLAYING');

                console.log("[DEBUG] Calling connect()...");
                this.connect();

                if (import.meta.env.DEV || username === 'admin') {
                    if (!this.debugManager) {
                        console.log("[DEBUG] Enabling Debug Tools for:", username);
                        this.debugManager = new DebugManager(this);
                    }
                }
            });

            const startLoginFlow = () => {
                console.log("[MAIN] Starting Login Flow...");
                this.loginManager.autoLogin();
            };

            // DEV: Fast Track
            if (CONFIG.DEV_SKIP_INTRO) {
                console.log("[DEV] Skipping Intro & Login UI...");
                // Force UI to Playing state immediately to hide any overlays
                this.uiManager.setGameState('PLAYING'); 
                
                // Hide Intro overlay manually if UIManager doesn't handle it on state change
                const intro = document.getElementById('intro-screen');
                if (intro) intro.style.display = 'none';
                
                // Auto-Connect as Guest/Dev
                this.loginManager.guestLogin();
            } 
            else if (this.uiManager.isIntroActive()) {
                console.log("[MAIN] Intro Active - Deferring Login");
                this.uiManager.onIntroComplete = startLoginFlow;
            } else {
                startLoginFlow();
            }

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
        const smoke = this.add.particles(x, y, 'star', {
            speed: { min: 20, max: 100 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 600,
            tint: 0x888888,
            maxParticles: 15
        });
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
        } else if (config.shape === 'line') {
            graphics.lineBetween(0, -30, 0, 30); // Vertical line
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

    async connect() {
        try {
            console.log("Connecting to Colyseus...");

            this.network.onPong = (latency) => this.currentLatency = latency;
            
            this.network.onChatMessage = (msg) => {
                this.uiManager.appendChatMessage(msg);
                if (msg.senderId && msg.text && !msg.text.startsWith('/')) {
                    this.playerController.showChatBubble(msg.senderId, msg.text);
                }
            };

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
            
            this.network.onPlayerJump = (sessionId: string) => {
                this.playerController.performJump(sessionId);
            };

            const success = await this.network.connect(this.authToken, this.skin);
            
            if (success && this.network.room) {
                this.room = this.network.room;
                console.log("Joined successfully!", this.room.sessionId);
                
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
            if (event === 'onAdd' && collection.forEach) {
                collection.forEach((item: T, key: string) => cb(item, key));
            }
        };

        const setup = () => {
            if (this.room?.state.items) {
                attach(this.room.state.items, 'onAdd', (item: any, id: string) => {
                    if (this.itemVisuals.has(id)) return;
                    
                    let sprite: Phaser.GameObjects.GameObject;

                    if (item.type === 'timer') {
                        const text = this.add.text(item.x, item.y, item.itemId, {
                            fontSize: '48px',
                            fontFamily: 'serif',
                            color: '#FF0000',
                            stroke: '#000000',
                            strokeThickness: 6
                        }).setOrigin(0.5).setDepth(100);
                        
                        this.tweens.add({
                            targets: text,
                            scale: 1.2,
                            duration: 500,
                            yoyo: true,
                            repeat: -1
                        });

                        item.onChange(() => {
                            text.setText(item.itemId);
                        });

                        sprite = text;
                    } 
                    else if (item.type === 'task') {
                        let color = 0x888888; 
                        if (item.itemId === 'scroll') color = 0xffff00;
                        if (item.itemId === 'dust') color = 0xffffff;
                        
                        const rect = this.add.rectangle(item.x, item.y, 24, 24, color);
                        rect.setStrokeStyle(2, 0x000000);
                        rect.setDepth(10);
                        
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
                    else {
                        let visual: Phaser.GameObjects.Image | Phaser.GameObjects.Shape;
                        
                        if (this.textures.exists('frame_bronze')) {
                            visual = this.add.image(item.x, item.y, 'frame_bronze');
                            (visual as Phaser.GameObjects.Image).setDisplaySize(20, 28);
                        } else {
                            visual = this.add.rectangle(item.x, item.y, 20, 20, 0x00FFFF);
                            (visual as Phaser.GameObjects.Shape).setStrokeStyle(2, 0xFFFFFF);
                            visual.rotation = 0.785; 
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
        if (this.waterManager) this.waterManager.update(time, delta);
        if (this.grassManager) this.grassManager.update(time); // --- GRASS UPDATE ---
        
        if (!this.playerController || !this.network || !this.network.room) return;

        const localPlayerEnt = this.playerController.players.get(this.network.room.sessionId);
        const localPlayer = localPlayerEnt?.visual?.sprite;
        if (localPlayer) {
            // --- GRASS INTERACTION: Push Force ---
            const vel = localPlayerEnt?.body?.linvel();
            if (vel && (Math.abs(vel.x) > 0.1 || Math.abs(vel.y) > 0.1)) {
                this.forceManager.push(localPlayer.x, localPlayer.y, 30);
            }
            
            if (this.cameraTarget) {
                if (!this.gestureManager?.isDrawing) {
                    const pointer = this.input.activePointer;
                    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                    const targetX = (localPlayer.x * 0.85) + (worldPoint.x * 0.15);
                    const targetY = (localPlayer.y * 0.85) + (worldPoint.y * 0.15);
                    this.cameraTarget.setPosition(targetX, targetY);
                }
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

        if (this.game.loop.frame % 10 === 0 && this.lightManager) {
            const sunPos = this.lightManager.getSunPosition();
            const timeInfo = getGameTime(Date.now() + (this.network.room?.state.timeOffset || 0));
            const dHour = timeInfo.hour + (timeInfo.minute / 60);
            const sunHeight = this.lightManager.getSunHeight(dHour);
            
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
                        sunPos.y,
                        sunHeight
                    );
                } catch (e) { }
            });
        }
        
        if (this.debugManager) this.debugManager.update();

        let decimalHour = 0;
        let gameTime = { hour: 12, minute: 0, day: 1, month: 'Jan', year: 1 };
        
        const offset = this.network.room?.state.timeOffset || 0;
        const now = Date.now() + offset;
        gameTime = getGameTime(now);
        decimalHour = gameTime.hour + (gameTime.minute / 60);

            if (this.network.room) {
                const worldStart = this.network.room.state.worldStartTime;
                const progress = getAcademicProgress(worldStart, now);
                
                if (this.uiManager) {
                    this.uiManager.updateHUDTime(gameTime.hour, gameTime.minute, progress.currentDay, progress.currentMonth);
                }
            }

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
            
            this.playerController.updatePlayerState(sessionId, data, data.unconsciousUntil);
            this.playerController.setGhostMode(sessionId, data.isGhost);

            if (data.isAttendingClass) {
                this.playerController.updateClassStatus(sessionId, true, data.classEndsAt);
            }
            
            if (typeof data.onChange === 'function') {
                data.onChange(() => {
                    this.playerController.updateClassStatus(sessionId, data.isAttendingClass, data.classEndsAt);
                    this.playerController.setGhostMode(sessionId, data.isGhost);
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
        if (!this.authToken || !this.room) return { left: false, right: false, up: false, down: false };

        const localId = this.network.room.sessionId;
        const player = this.playerController.players.get(localId);

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

import { UIScene } from './scenes/UIScene';
import { CardAlbumScene } from './scenes/CardAlbumScene';
import { WaterShaderTestScene } from './scenes/WaterShaderTestScene';

// Modern Mobile Detection (2026) for Config
const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouch = navigator.maxTouchPoints > 0 || (window as any).matchMedia("(any-pointer: coarse)").matches;
const isSmallScreen = window.innerWidth < 1024;
const isMobile = uaMobile || (isTouch && isSmallScreen);

const urlParams = new URLSearchParams(window.location.search);
const startScene = urlParams.get('scene') === 'water' ? WaterShaderTestScene : GameScene;
const scenes = [GameScene, UIScene, CardAlbumScene, WaterShaderTestScene];

// Reorder scenes so the startScene is first if needed, 
// OR just rely on Phaser starting the first one.
// Phaser starts the first scene in the array.
if (startScene === WaterShaderTestScene) {
    scenes.unshift(scenes.splice(scenes.indexOf(WaterShaderTestScene), 1)[0]);
    
    // Hide UI overlays for shader test
    const intro = document.getElementById('intro-screen');
    if (intro) intro.style.display = 'none';
    const login = document.getElementById('login-screen');
    if (login) login.style.display = 'none';
    const ui = document.getElementById('game-ui');
    if (ui) ui.style.display = 'none';
}

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
    scene: scenes,
    lights: { enable: true, ambientColor: 0x808080 },
    disableVisibilityChange: true,
    physics: undefined // Explicitly disable Arcade Physics
};

// --- QA PROBE INJECTION ---
(window as any).QA_Probe = () => {
    // Safety check
    const scene = (window as any).gameClient;
    if (!scene) return { status: 'NO_GAME' };

    const client = scene.network;
    if (!client || !client.room) return { status: 'NO_CONNECTION' };

    const state = client.room.state;
    if (!state) return { status: 'WAITING_FOR_STATE' };

    const myId = client.room.sessionId;
    const myState = state.players ? state.players.get(myId) : null;
    
    // Physics
    const myEntity = scene.playerController?.players.get(myId);
    const pos = myEntity?.visual?.sprite ? { x: myEntity.visual.sprite.x, y: myEntity.visual.sprite.y } : { x:0, y:0 };
    
    // Environment
    const now = Date.now() + (state.timeOffset || 0);
    const time = getGameTime(now);

    return {
        status: 'ACTIVE',
        timestamp: now,
        fps: scene.game?.loop.actualFps || 0,
        ping: scene.currentLatency || 0,
        player: {
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            house: myState?.house,
            gold: myState?.gold,
            isAttendingClass: myState?.isAttendingClass
        },
        environment: {
            hour: time.hour,
            isNight: time.isNight,
            worldTime: state.worldStartTime
        },
        ui: {
            hasModal: document.querySelectorAll('.modal:not(.hidden)').length > 0
        }
    };
};

(window as any).game = new Phaser.Game(config);