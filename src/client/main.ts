import 'reflect-metadata';
import Phaser from 'phaser';
import * as Colyseus from "colyseus.js";
import { CONFIG } from "../shared/Config";
import { PlayerController } from "./PlayerController";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics } from "../shared/MapParser";
import { world } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";

class GameScene extends Phaser.Scene {
    client = new Colyseus.Client("ws://localhost:2567");
    room?: Colyseus.Room;
    playerController!: PlayerController;
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    physicsWorld?: RAPIER.World;
    
    // UI & Entities
    uiText?: Phaser.GameObjects.Text;
    inventoryText?: Phaser.GameObjects.Text;
    debugGraphics?: Phaser.GameObjects.Graphics;
    
    // Telemetry
    lastPingTime: number = 0;
    currentLatency: number = 0;
    pingInterval?: any;

    // Fixed Timestep
    accumulatedTime: number = 0;
    readonly FIXED_TIMESTEP = 1 / 60;

    constructor() {
        super('GameScene');
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
            await RAPIER.init();
            this.physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });

            // 1. Map Setup
            const map = this.make.tilemap({ key: 'map' });
            const tileset = map.addTilesetImage('placeholder_tiles', 'tiles');
            if (tileset) {
                map.createLayer('Ground', tileset, 0, 0);
            }
            buildPhysics(this.physicsWorld, this.cache.tilemap.get('map').data);

            // 2. Entities
            this.playerController = new PlayerController(this, this.physicsWorld);
            this.createAnimations();

            // 3. Camera Setup (Earthbound Style)
            this.updateCameraZoom();
            this.cameras.main.setBackgroundColor('#1a1a1a');
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

            // 5. UI Setup
            this.createUI();
            this.debugGraphics = this.add.graphics().setDepth(10000);

            // 6. Connect
            this.connect();

            // 7. Events
            this.scale.on('resize', this.handleResize, this);
            window.addEventListener('blur', () => {
                this.input.keyboard?.resetKeys();
                if (this.room) this.room.send("move", { left: false, right: false, up: false, down: false });
            });

        } catch (e: any) {
            console.error("Create Crash:", e);
        }
    }

    async connect() {
        try {
            // Persistent Identity (Phase 1)
            let username = localStorage.getItem("my_username");
            if (!username) {
                username = "Player_" + Math.floor(Math.random() * 10000);
                localStorage.setItem("my_username", username);
            }

            this.room = await this.client.joinOrCreate("world", { username });
            console.log("Connected to World:", this.room.sessionId, "as", username);

            // Start Ping Loop (Every 2 seconds)
            this.pingInterval = setInterval(() => {
                if (this.room) {
                    this.lastPingTime = Date.now();
                    this.room.send("ping", this.lastPingTime);
                }
            }, 2000);

            // Listen for Pong
            this.room.onMessage("pong", (timestamp) => {
                const now = Date.now();
                this.currentLatency = now - this.lastPingTime;
            });

        } catch (e: any) {
            console.error("Connection Error:", e.message);
        }
    }

    update(time: number, delta: number) {
        if (!this.playerController || !this.room) return;

        // 1. Input & Network
        const input = this.handleInput();
        this.syncNetworkState();

        // 2. Physics & Logic (Fixed Timestep)
        this.playerController.applyInput(this.room.sessionId, input);
        
        this.accumulatedTime += delta / 1000;
        while (this.accumulatedTime >= this.FIXED_TIMESTEP) {
            MovementSystem();
            if (this.physicsWorld) this.physicsWorld.step();
            this.accumulatedTime -= this.FIXED_TIMESTEP;
        }
        
        // 3. Visuals & Y-Sorting
        this.playerController.updateVisuals();
        
        // 4. Update UI
        this.updateUI();

        // 5. Debug Rendering
        if (CONFIG.SHOW_COLLIDERS && this.debugGraphics && this.physicsWorld) {
            this.debugGraphics.clear();
            this.debugGraphics.lineStyle(1, 0x00ff00, 1);
            
            // Draw all colliders in the world
            this.physicsWorld.forEachCollider((collider) => {
                const type = collider.shape.type; // Check Rapier shape types
                const translation = collider.translation();
                
                // Rapier Cuboid is half-extents
                if (type === 0 || (collider.shape as any).halfExtents) { 
                    const he = (collider.shape as any).halfExtents;
                    if (he) {
                        this.debugGraphics?.strokeRect(
                            translation.x - he.x,
                            translation.y - he.y,
                            he.x * 2,
                            he.y * 2
                        );
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

    // --- Core Logic Helpers ---

    syncNetworkState() {
        const state = this.room?.state as any;
        if (state && state.players) {
            const players = state.players;
            if (typeof players.forEach === 'function') {
                players.forEach((p: any, id: string) => this.syncPlayer(id, p));
            } else {
                for (const id in players) this.syncPlayer(id, players[id]);
            }
        }
    }

    private syncPlayer(sessionId: string, data: any) {
        if (!this.playerController.entities.has(sessionId)) {
            const isLocal = sessionId === this.room?.sessionId;
            // Use 'player_rpg' texture (our procedural asset) instead of the old 'player' atlas
            const sprite = this.playerController.addPlayer(sessionId, data.x, data.y, isLocal);
            // Override texture to use the new simple spritesheet
            sprite.setTexture('player_idle'); 
            
            if (isLocal) {
                this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
            }
        } else {
            this.playerController.updatePlayerState(sessionId, data.x, data.y);
        }
    }

    // --- UI & Rendering ---

    createUI() {
        this.uiText = this.add.text(10, 10, 'Initializing...', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#00000088'
        });
        this.uiText.setScrollFactor(0);
        this.uiText.setDepth(1000);

        this.inventoryText = this.add.text(10, 60, 'Inventory...', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffff00',
            backgroundColor: '#00000088'
        });
        this.inventoryText.setScrollFactor(0);
        this.inventoryText.setDepth(1000);
    }

    updateUI() {
        if (!this.uiText || !this.room) return;
        
        const state = this.room.state as any;
        const myState = state.players ? state.players.get(this.room.sessionId) : null;

        if (myState) {
            this.uiText.setText(
                `POS: ${Math.round(myState.x)},${Math.round(myState.y)}
` +
                `HP: ${myState.hp}/${myState.maxHp}
` +
                `PING: ${this.currentLatency}ms`
            );
            // Color code latency
            if (this.currentLatency < 100) this.uiText.setColor('#00ff00');
            else if (this.currentLatency < 200) this.uiText.setColor('#ffff00');
            else this.uiText.setColor('#ff0000');

             // Inventory
            if (this.inventoryText && myState.inventory) {
                 const items = myState.inventory.map((i: any) => `${i.itemId} x${i.count}`).join('\n');
                 this.inventoryText.setText(`INVENTORY:\n${items || '(empty)'}`);
            }
        }
    }

    handleResize(gameSize: any) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        this.updateCameraZoom();
    }

    updateCameraZoom() {
        const targetHeightTiles = 16;
        const tileSize = 16;
        const logicalHeight = targetHeightTiles * tileSize; // 256px
        let zoom = Math.floor(this.scale.height / logicalHeight);
        zoom = Math.max(2, Math.min(zoom, 6));
        this.cameras.main.setZoom(zoom);
    }

    createAnimations() {
        if (!this.textures.exists('player_run') || !this.textures.exists('player_idle')) return;

        // ROW MAPPING (5 Rows, 32px height)
        // 0: Down
        // 1: Down-Right
        // 2: Right
        // 3: Up-Right
        // 4: Up
        
        // MAPPING TO PHASER DIRECTIONS (We need to handle flipping manually in PlayerController)
        // We will create base animations for the 5 rows.
        const rowNames = ['down', 'down-right', 'right', 'up-right', 'up'];
        
        rowNames.forEach((name, rowIndex) => {
            // IDLE (4 frames per row)
            this.anims.create({
                key: `idle-${name}`,
                frames: this.anims.generateFrameNumbers('player_idle', { 
                    start: rowIndex * 4, 
                    end: (rowIndex * 4) + 3 
                }),
                frameRate: 6,
                repeat: -1
            });

            // RUN (6 frames per row)
            this.anims.create({
                key: `run-${name}`,
                frames: this.anims.generateFrameNumbers('player_run', { 
                    start: rowIndex * 6, 
                    end: (rowIndex * 6) + 5 
                }),
                frameRate: 10,
                repeat: -1
            });
        });
    }

    // State to track previous input to avoid spamming server but ensure stop is sent
    lastInputState = { left: false, right: false, up: false, down: false };

    handleInput() {
        if (!this.room || !this.cursors) return { left: false, right: false, up: false, down: false };
        const keys: any = this.input.keyboard?.addKeys('W,S,A,D');
        
        const input = {
            left: this.cursors.left.isDown || keys.A.isDown,
            right: this.cursors.right.isDown || keys.D.isDown,
            up: this.cursors.up.isDown || keys.W.isDown,
            down: this.cursors.down.isDown || keys.S.isDown,
        };

        const isMoving = input.left || input.right || input.up || input.down;
        const wasMoving = this.lastInputState.left || this.lastInputState.right || this.lastInputState.up || this.lastInputState.down;

        // Send if:
        // 1. We are moving (continuous updates needed for some authoritative logic usually, but here state is persistent)
        // 2. We JUST stopped (Critical to stop sliding)
        // 3. Direction changed
        
        // Simple check: Has input changed?
        const inputChanged = 
            input.left !== this.lastInputState.left ||
            input.right !== this.lastInputState.right ||
            input.up !== this.lastInputState.up ||
            input.down !== this.lastInputState.down;

        if (inputChanged || (isMoving && this.game.loop.frame % 10 === 0)) { // Heartbeat input every 10 frames if moving
            this.room.send("move", input);
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
    backgroundColor: '#000000',
    scene: GameScene
};

new Phaser.Game(config);
