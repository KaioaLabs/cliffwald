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

export class GameScene extends Phaser.Scene {
    network: NetworkManager;
    uiManager!: UIManager;
    lightManager!: LightManager;
    projectileManager!: VisualProjectileManager;
    loginManager!: LoginManager;
    
    // Static World Props
    staticProps: Phaser.GameObjects.GameObject[] = [];
    
    // Ladder State
    ladderObj?: Phaser.GameObjects.Container;
    ladderBounds?: { min: number, max: number };
    climbingState?: { active: boolean, ladderX: number, climbHeight: number };

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

                    // Create one shadow per table tile, respecting the tile's texture
                    furnitureLayer.forEachTile((tile) => {
                        if (tile.index !== -1) {
                            // Find the tileset for this tile
                            const tileset = tile.tileset;
                            if (tileset) {
                                const tileTexKey = tileset.image?.key; // Key of the texture (e.g., 'table')
                                if (tileTexKey) {
                                    const tx = tile.getCenterX();
                                    const ty = tile.getBottom();
                                    
                                    // Create shadow using the ACTUAL tileset texture
                                    const shadow = this.add.image(tx, ty, tileTexKey);
                                    
                                    // Calculate crop for the specific tile
                                    // tile.index is global, subtract firstgid to get local index
                                    const localId = tile.index - tileset.firstgid;
                                    const row = Math.floor(localId / tileset.columns);
                                    const col = localId % tileset.columns;
                                    const cx = tileset.tileMargin + (col * (tileset.tileWidth + tileset.tileSpacing));
                                    const cy = tileset.tileMargin + (row * (tileset.tileHeight + tileset.tileSpacing));
                                    
                                    shadow.setCrop(cx, cy, tileset.tileWidth, tileset.tileHeight);
                                    
                                    // We must set the frame size to match crop, otherwise origin calc is wrong
                                    shadow.setSize(tileset.tileWidth, tileset.tileHeight);
                                    // Update the display origin to match the new size (Feet anchor)
                                    shadow.setOrigin(0.5, 1.0); 
                                    
                                    shadow.setTint(0x000000);
                                    shadow.setAlpha(0.3);
                                    shadow.setDepth(-99.5);
                                    
                                    shadow.setData('baseX', tx);
                                    shadow.setData('baseY', ty);
                                    shadow.setData('sourceScaleX', 1.0);
                                    shadow.setData('sourceScaleY', 1.0);
                                    shadow.setData('height', tileset.tileHeight); // Store height for shadow length calc

                                    this.tableShadows.push(shadow);
                                }
                            }
                        }
                    });
                }
            } else {
                console.error("Failed to load one or more tilesets:", { tileset, tilesetTable, tilesetFloor });
            }

            // --- DATA DRIVEN LOGIC EXTRACTION ---
            const logicObjects = map.getObjectLayer("Logic")?.objects || [];
            const getLoc = (name: string) => logicObjects.find(o => o.name === name) || { x: 0, y: 0 };
            const getZones = (type: string) => logicObjects.filter(o => o.type === type);

            // Shadow Management

            buildPhysics(this.physicsWorld, this.cache.tilemap.get('map').data);

            try {
                this.lightManager = new LightManager(this);
                this.lightManager.initFromMap(map);
            } catch (e) {
                console.error("[LIGHTS] Initialization Failed:", e);
            }

            this.projectileManager = new VisualProjectileManager(this);

            // --- STATIC PROPS SYSTEM ---
            const createProp = (x: number, y: number, w: number, h: number, color: number, label: string, isBed: boolean = false) => {
                const container = this.add.container(x, y);
                
                // Base
                const prop = this.add.rectangle(0, 0, w, h, color);
                prop.setStrokeStyle(2, 0x3e2723, 1.0);
                if (CONFIG.USE_LIGHTS) prop.setPipeline('Light2D');
                container.add(prop);

                if (isBed) {
                    // Pillow
                    const pillow = this.add.rectangle(0, -h/2 + 8, w - 8, 12, 0xeeeeee);
                    if (CONFIG.USE_LIGHTS) pillow.setPipeline('Light2D');
                    container.add(pillow);
                }

                container.setDepth(y - 10); // Dynamic depth based on Y
                
                // Add shadow using generic base, but SCALED to be the object's shape
                const bottomY = y + h/2;
                
                const shadow = this.add.image(x, bottomY, 'shadow_base');
                shadow.setTint(0x000000);
                shadow.setOrigin(0.5, 1.0); // Feet anchor
                shadow.setDepth(-99.5); // Below furniture
                
                const scaleX = w / 32;
                const scaleY = h / 32;
                
                shadow.setData('baseX', x);
                shadow.setData('baseY', bottomY);
                shadow.setData('sourceScaleX', scaleX);
                shadow.setData('sourceScaleY', scaleY);
                shadow.setData('height', h);
                
                this.tableShadows.push(shadow);
                
                // Track globally
                this.staticProps.push(container);
                container.setData('label', label); // For debug/finding
                
                return container;
            };

            // Great Hall: 3 Tables
            const gh = getLoc("GREAT_HALL");
            if (gh.x !== 0) {
                createProp(gh.x, gh.y - 80, 256, 48, 0x5d4037, "Ignis Table"); // Wider tables
                createProp(gh.x, gh.y, 256, 48, 0x5d4037, "Axiom Table");
                createProp(gh.x, gh.y + 80, 256, 48, 0x5d4037, "Vesper Table");
            }

            // Dorms: 8 Beds per house (Total 24)
            const dormHouses: ('ignis' | 'axiom' | 'vesper')[] = ['ignis', 'axiom', 'vesper'];
            dormHouses.forEach(house => {
                const dormBase = getLoc(`DORM_${house.toUpperCase()}`);
                if (dormBase.x !== 0) {
                    for (let i = 0; i < 8; i++) {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        const bx = dormBase.x + (col * 64);
                        const by = dormBase.y + (row * 96);
                        createProp(bx, by, 34, 54, 0x4e342e, "Bed", true);
                    }
                }
            });

            // Spawn Infirmary Beds
            getZones("infirmary_bed").forEach((pos) => {
                createProp(pos.x, pos.y, 34, 54, 0xffffff, "Hospital Bed", true);
            });

            // --- LIBRARY VISUALS ---
            const lib = getLoc("LIBRARY");
            if (lib.x !== 0) {
                // Create Visual Shelf (Texture generated in AssetManager)
                const shelf = this.add.image(lib.x, lib.y, 'grand_bookshelf_v2');
                shelf.setOrigin(0.5, 1.0);
                shelf.setDepth(lib.y - 50); // Behind ladder
                
                // Add Ladder Rail
                const railY = lib.y - 280; // Top of ladder
                const rail = this.add.rectangle(lib.x, railY, 500, 4, 0x111111);
                rail.setDepth(lib.y + 1000); // Always on top? No, just high Z
                
                // --- LADDER LOGIC ---
                // Create Ladder Container
                const ladder = this.add.container(lib.x, lib.y);
                ladder.setDepth(lib.y + 50); // Slightly in front of shelf base
                
                const ladderGfx = this.add.graphics();
                ladderGfx.lineStyle(4, 0x5d4037);
                ladderGfx.beginPath();
                ladderGfx.moveTo(-15, 0); ladderGfx.lineTo(-15, -280); // Left rail
                ladderGfx.moveTo(15, 0); ladderGfx.lineTo(15, -280);   // Right rail
                for(let i=0; i<8; i++) {
                    const ry = -20 - (i*35);
                    ladderGfx.moveTo(-15, ry); ladderGfx.lineTo(15, ry); // Rungs
                }
                ladderGfx.strokePath();
                ladder.add(ladderGfx);
                
                // Wheels
                const wheelL = this.add.circle(-15, 0, 5, 0x000000);
                const wheelR = this.add.circle(15, 0, 5, 0x000000);
                ladder.add(wheelL); ladder.add(wheelR);
                
                // Interaction Zone (Visual only now)
                const ladderZone = this.add.zone(0, -140, 60, 300);
                ladder.add(ladderZone);
                
                let currentClimbY = 0;
                const LADDER_MIN_X = lib.x - 230;
                const LADDER_MAX_X = lib.x + 230;
                
                // Store reference for update loop
                this.ladderObj = ladder;
                this.ladderBounds = { min: LADDER_MIN_X, max: LADDER_MAX_X };

                // Tables (Reduced to 2 to make room)
                for (let i = 0; i < 2; i++) {
                    const tx = lib.x + (i === 0 ? -150 : 150);
                    const ty = lib.y + 100;
                    createProp(tx, ty, 80, 32, 0x5d4037, "Study Table");
                }
            }

            // --- DUNGEON VISUALS ---
            const det = getLoc("DETENTION");
            if (det.x !== 0) {
                this.add.rectangle(det.x, det.y, 300, 300, 0x1a1a1a).setDepth(-101); // Dark Floor
                this.add.text(det.x, det.y - 120, "DUNGEON", { fontSize: '32px', color: '#ff0000', alpha: 0.3 }).setOrigin(0.5).setDepth(-90);
                
                // Iron Bars
                for (let i = -2; i <= 2; i++) {
                    const bar = this.add.rectangle(det.x + (i * 60), det.y, 4, 280, 0x333333);
                    if (CONFIG.USE_LIGHTS) bar.setPipeline('Light2D');
                    bar.setDepth(det.y + 140);
                    this.staticProps.push(bar); // Add to tracking
                }
            }
            
            this.playerController = new PlayerController(this, this.physicsWorld);
            AssetManager.createAnimations(this);
            this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as any;

            this.cameraTarget = this.add.image(1600, 1000, '').setVisible(false);
            this.cameras.main.startFollow(this.cameraTarget, true, 0.2, 0.2);
            this.cameras.main.centerOn(1600, 1000);

            // --- VISUALS: DUEL ZONE ---
            getZones("duel_zone").forEach(zone => {
                const radius = zone.width / 2;
                const cx = zone.x + radius;
                const cy = zone.y + radius;
                const zoneId = (zone as any).properties?.find((p: any) => p.name === 'zone_id')?.value ?? 0;

                const duelVisual = this.add.circle(cx, cy, radius, 0xaa0000, 0.2);
                duelVisual.setStrokeStyle(4, 0xff0000, 0.5);
                duelVisual.setDepth(-90);
                
                // Tatami inner ring (decor)
                this.add.circle(cx, cy, radius * 0.3, 0xaa0000, 0.1).setDepth(-90);
                
                // Ring Number
                this.add.text(cx, cy, (zoneId + 1).toString(), {
                    fontSize: '64px',
                    color: '#ffffff',
                    alpha: 0.2
                }).setOrigin(0.5).setDepth(-90);
            });

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
            
import { MinigameManager } from './managers/MinigameManager';

export class GameScene extends Phaser.Scene {
    network: NetworkManager;
    uiManager!: UIManager;
    lightManager!: LightManager;
    projectileManager!: VisualProjectileManager;
    loginManager!: LoginManager;
    minigameManager!: MinigameManager;
    
    // ... properties ...

    constructor() {
        super('GameScene');
        this.network = new NetworkManager(this);
        this.minigameManager = new MinigameManager();
        this.setupRemoteLogging();
        // ...
    }

    // ... inside create() ...
            
            // CLASS MINIGAME LISTENERS
            this.network.room?.onMessage("start_minigame", (data: { duration: number, type: string }) => {
                console.log("[CLASS] Starting Minigame:", data.type);
                // Map server type to minigame type
                let type: 'charms' | 'potions' | 'history' = 'charms';
                if (data.type === 'potions') type = 'potions';
                if (data.type === 'history') type = 'history';
                
                this.minigameManager.startMinigame(type, data.duration, (score) => {
                    console.log("[CLASS] Minigame finished. Score:", score);
                    this.network.room?.send("submit_score", { score });
                });
            });
            
            this.network.room?.onMessage("class_completed", (data: { grade: string, points: number }) => {
                this.uiManager.showNotification(`Class Finished! Grade: ${data.grade} (+${data.points} PA)`);
            });

            // ... items ...

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

        // Update Static Object Shadows (Tables)
        this.tableShadows.forEach(shadow => {
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
                    sX,  // Source Scale X (for rects this creates the shape)
                    sY,  // Source Scale Y
                    -99,  // Depth
                    h,   // Height of the object for shadow offset
                    worldPoint.x,
                    worldPoint.y
                );
            } catch (e) { }
        });
        
        if (this.debugManager) this.debugManager.update();

        // TIME SYNC: Apply server offset to local time
        let decimalHour = 0;
        let gameTime = { hour: 12, minute: 0, day: 1, month: 'Jan', year: 1 };
        
        if (this.debugManager && this.debugManager.settings.overrideTime) {
            // Use Debug Time
            decimalHour = this.debugManager.settings.debugHour;
            const h = Math.floor(decimalHour);
            const m = Math.floor((decimalHour - h) * 60);
            gameTime = { hour: h, minute: m, day: 1, month: 'Debug', year: 1 };
        } else {
            // Use Server Synced Time
            const offset = this.network.room?.state.timeOffset || 0;
            const now = Date.now() + offset;
            gameTime = getGameTime(now);
            decimalHour = gameTime.hour + (gameTime.minute / 60);

            // Update Calendar UI
            if (this.network.room) {
                const worldStart = this.network.room.state.worldStartTime;
                const progress = getAcademicProgress(worldStart, now);
                const phase = gameTime.isNight ? 'Night' : 'Day';
                
                if (this.uiManager) {
                    this.uiManager.updateCalendar(progress.currentMonth, progress.currentWeek, progress.currentDay, phase);
                }
            }
        }

        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene) {
            const displaySeconds = gameTime.hour * 3600 + gameTime.minute * 60;
            if (this.network.room) {
                 uiScene.updateTime(displaySeconds, this.network.room.state.currentCourse, this.network.room.state.currentMonth);
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

        const showColliders = CONFIG.SHOW_COLLIDERS || (this.debugManager && this.debugManager.settings.showPhysics);

        if (showColliders && this.debugGraphics && this.physicsWorld) {
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

        const climb = this.climbingState;
        const ladder = this.ladderObj;
        const bounds = this.ladderBounds;
        const localId = this.network.room.sessionId;
        const player = this.playerController.players.get(localId);

        // --- LADDER MOUNT / DISMOUNT LOGIC ---
        if (ladder && player && player.visual?.sprite) {
            // Check Mount
            if (!climb?.active) {
                const sprite = player.visual.sprite;
                // Distance to Ladder Base
                const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, ladder.x, ladder.y);
                
                // If pressing UP and near ladder (< 40px)
                if (dist < 40 && (this.cursors?.up.isDown || this.wasd?.W.isDown)) {
                    console.log("[LADDER] Mounting Ladder!");
                    this.climbingState = {
                        active: true,
                        ladderX: ladder.x,
                        climbHeight: 0
                    };
                    return { left: false, right: false, up: false, down: false }; // Consume input
                }
            }
        }

        if (climb?.active && ladder && bounds && this.cursors && this.wasd) {
            // console.log("[LADDER] Climbing... Height:", climb.climbHeight);
            // --- LADDER MOVEMENT ---
            const speed = 2.0; // Ladder slide speed
            const climbSpeed = 2.0;

            // Horizontal (Slide Ladder)
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                ladder.x = Math.max(bounds.min, ladder.x - speed);
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                ladder.x = Math.min(bounds.max, ladder.x + speed);
            }

            // Vertical (Climb Player)
            if (this.cursors.up.isDown || this.wasd.W.isDown) {
                climb.climbHeight = Math.min(250, climb.climbHeight + climbSpeed);
            } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
                // Check Dismount
                if (climb.climbHeight <= 0) {
                    this.climbingState = { active: false, ladderX: 0, climbHeight: 0 };
                    if (player) player.climbOffset = 0;
                    return { left: false, right: false, up: false, down: false };
                }
                climb.climbHeight = Math.max(0, climb.climbHeight - climbSpeed);
            }

            // Sync Player Visuals
            if (player && player.visual?.sprite) {
                // Force X to ladder X, Y to ladder Base Y
                // Direct override:
                player.visual.sprite.x = ladder.x;
                player.visual.sprite.y = ladder.y; // Base
                player.climbOffset = -climb.climbHeight; // Negative to go UP
                player.visual.sprite.setDepth(ladder.y + 100);
            }

            return { left: false, right: false, up: false, down: false }; // Suppress standard movement
        }

        if (!this.cursors || !this.wasd) return { left: false, right: false, up: false, down: false };
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

(window as any).game = new Phaser.Game(config);