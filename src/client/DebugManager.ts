import { Pane } from 'tweakpane';
import * as Phaser from 'phaser';
import RAPIER from '@dimforge/rapier2d-compat';
import { GameScene } from './main'; 
import { CONFIG } from '../shared/Config';

export class DebugManager {
    private scene: GameScene;
    private pane: any; 
    private debugGraphics: Phaser.GameObjects.Graphics;
    
    public settings = {
        // Visuals
        showHitboxes: false,
        showPhysics: false,
        debugColor: 0x00ff00,
        
        // Network
        showServerPos: false,
        serverGhostColor: 0xff0000,
        simulatedLatency: 0,
        
        // Player
        speedMultiplier: 1.0,
        noclip: false,

        // Lighting
        enableLights: true,
        ambientColor: { r: 128, g: 128, b: 128 },
        cursorLightIntensity: 0.0,
        cursorLightColor: { r: 255, g: 255, b: 200 },
        cursorLightRadius: 150,
        
        // Time
        overrideTime: false,
        debugHour: 12.0,
        
        // General
        zoom: 1.0,
        worldView: false,
    };
    
    private cursorLight: Phaser.GameObjects.Light | null = null;
    private defaultPlayerSpeed: number;

    constructor(scene: GameScene) {
        this.scene = scene;
        this.defaultPlayerSpeed = CONFIG.PLAYER_SPEED;
        this.pane = new Pane({ title: 'Cliffwald2D DevTools' });
        
        // Fix overlap with UI
        const el = this.pane.element;
        el.style.position = 'absolute';
        el.style.top = '60px';
        el.style.right = '10px';
        el.style.width = '256px';
        el.style.zIndex = '3000';

        this.debugGraphics = this.scene.add.graphics().setDepth(9999); 

        this.setupGUI();
    }

    private setupGUI() {
        // --- GENERAL ---
        const fGeneral = this.pane.addFolder({ title: 'General', expanded: false });
        fGeneral.addBinding(this.settings, 'zoom', { min: 0.05, max: 2.0, step: 0.01, label: 'Zoom' })
            .on('change', (ev: any) => this.scene.cameras.main.setZoom(ev.value));
            
        fGeneral.addBinding(this.settings, 'worldView', { label: '🌍 World View' })
            .on('change', (ev: any) => this.toggleWorldView(ev.value));
        
        // --- NETWORK ---
        const fNet = this.pane.addFolder({ title: 'Network', expanded: false });
        fNet.addBinding(this.settings, 'showServerPos', { label: 'Show Ghost' });
        fNet.addBinding(this.settings, 'simulatedLatency', { min: 0, max: 1000, step: 10, label: 'Sim Lag (ms)' })
            .on('change', (ev: any) => {
                const net = this.scene.network;
                if (net) net.simulatedLatency = ev.value;
            });

        // --- PLAYER ---
        const fPlayer = this.pane.addFolder({ title: 'Player', expanded: true });
        fPlayer.addBinding(this.settings, 'speedMultiplier', { min: 0.5, max: 5.0, step: 0.5, label: 'Speed Mult' })
            .on('change', (ev: any) => {
                CONFIG.PLAYER_SPEED = this.defaultPlayerSpeed * ev.value;
            });
        fPlayer.addBinding(this.settings, 'noclip', { label: 'Noclip / God' })
            .on('change', (ev: any) => {
                const pc = this.scene.playerController;
                const net = this.scene.network;
                if (pc && net && net.room) {
                    pc.setNoclip(net.room.sessionId, ev.value);
                }
            });

        // --- VISUALS ---
        const fVis = this.pane.addFolder({ title: 'Visuals', expanded: false });
        fVis.addBinding(this.settings, 'showHitboxes', { label: 'Logic Boxes' });
        fVis.addBinding(this.settings, 'showPhysics', { label: 'Rapier Physics' });
        fVis.addBinding(this.settings, 'debugColor', { view: 'color', label: 'Box Color' });

        // --- LIGHTING ---
        const fLights = this.pane.addFolder({ title: 'Lighting', expanded: false });
        fLights.addBinding(this.settings, 'enableLights', { label: 'Enable' })
            .on('change', (ev: any) => {
                 // Invert logic: If "Enable Lights" is TRUE, Override is FALSE.
                 // If "Enable Lights" is FALSE, Override is TRUE (Full White).
                 if (this.scene.lightManager) {
                     this.scene.lightManager.setLightingOverride(!ev.value);
                 }
            });
        fLights.addBinding(this.settings, 'ambientColor', { view: 'color', label: 'Ambient' })
            .on('change', (ev: any) => {
                const color = new Phaser.Display.Color(ev.value.r, ev.value.g, ev.value.b);
                this.scene.lights.setAmbientColor(color.color);
            });
        fLights.addBinding(this.settings, 'cursorLightIntensity', { min: 0, max: 3, label: 'Cursor Int' });
        fLights.addBinding(this.settings, 'cursorLightRadius', { min: 50, max: 500, label: 'Cursor Rad' });
        fLights.addBinding(this.settings, 'cursorLightColor', { view: 'color', label: 'Cursor Col' });

        // --- TIME ---
        const fTime = this.pane.addFolder({ title: 'Time / World', expanded: true });
        
        const setScale = async (scale: number) => {
            console.log(`[DEBUG] Setting Time Scale: ${scale}x`);
            try {
                // Use relative path via Vite Proxy
                await fetch('/api/debug/time-scale', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scale })
                });
            } catch (e) {
                console.error("Failed to set time scale:", e);
            }
        };

        fTime.addBinding(this.settings, 'overrideTime', { label: 'Admin Time' });
        
        fTime.addBlade({
            view: 'separator',
        });

        fTime.addButton({ title: '⏸ PAUSE (0x)' }).on('click', () => setScale(0));
        fTime.addButton({ title: '▶ PLAY (1x)' }).on('click', () => setScale(1));
        fTime.addButton({ title: '⏩ FAST (10x)' }).on('click', () => setScale(10));
        fTime.addButton({ title: '🚀 HYPER (60x)' }).on('click', () => setScale(60));
        
        fTime.addBinding(this.settings, 'debugHour', { min: 0, max: 24, step: 0.25, label: 'Game Hour' })
            .on('change', (ev: any) => {
                if (this.settings.overrideTime && this.scene.network.room) {
                    this.scene.network.room.send("admin_time_jump", { hour: ev.value });
                }
            });
    }

    private toggleWorldView(active: boolean) {
        const cam = this.scene.cameras.main;
        const MAP_W = 4480;
        const MAP_H = 5760;

        if (active) {
            cam.stopFollow();
            // Calculate "Best Fit" Zoom
            const zw = cam.width / MAP_W;
            const zh = cam.height / MAP_H;
            const bestZoom = Math.min(zw, zh) * 0.95; // 95% fit

            cam.pan(MAP_W / 2, MAP_H / 2, 1000, 'Power2');
            cam.zoomTo(bestZoom, 1000, 'Power2');
        } else {
            // Restore Zoom
            cam.zoomTo(this.settings.zoom, 500, 'Power2');
            
            // Re-attach to Camera Target (which follows player smoothly)
            if (this.scene.cameraTarget) {
                cam.pan(this.scene.cameraTarget.x, this.scene.cameraTarget.y, 500, 'Power2', true, (camera: any, progress: number) => {
                     if (progress === 1) {
                        cam.startFollow(this.scene.cameraTarget, true, 0.2, 0.2);
                     }
                });
            }
        }
    }

    public update() {
        this.debugGraphics.clear();

        if (this.settings.showHitboxes) {
            this.drawHitboxes();
        }

        if (this.settings.showPhysics) {
            this.drawPhysics();
        }

        // Cursor Light Logic
        if (this.settings.cursorLightIntensity > 0) {
            if (!this.cursorLight) {
                this.cursorLight = this.scene.lights.addLight(0, 0, this.settings.cursorLightRadius, 0xffffff, this.settings.cursorLightIntensity);
            }
            const pointer = this.scene.input.activePointer;
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.cursorLight.setPosition(worldPoint.x, worldPoint.y);
            this.cursorLight.setIntensity(this.settings.cursorLightIntensity);
            this.cursorLight.setRadius(this.settings.cursorLightRadius);
            const c = this.settings.cursorLightColor;
            this.cursorLight.setColor((c.r << 16) + (c.g << 8) + (c.b));
        } else {
            if (this.cursorLight) {
                this.scene.lights.removeLight(this.cursorLight);
                this.cursorLight = null;
            }
        }
    }

    private drawPhysics() {
        if (!this.scene.physicsWorld) return;
        
        this.debugGraphics.lineStyle(1, 0x00ff00, 1);

        this.scene.physicsWorld.forEachCollider((collider) => {
            const translation = collider.translation();
            const shape = collider.shape as any; 
            
            // Cuboid
            if (shape.halfExtents) { 
                const he = shape.halfExtents;
                this.debugGraphics.strokeRect(
                    translation.x - he.x, 
                    translation.y - he.y, 
                    he.x * 2, 
                    he.y * 2
                );
            } 
            // Ball / Circle
            else if (shape.radius) {
                const r = shape.radius;
                this.debugGraphics.strokeCircle(translation.x, translation.y, r);
            }
        });
    }

    private drawHitboxes() {
        const color = this.settings.debugColor;
        this.debugGraphics.lineStyle(2, color, 1);

        // 1. Local Player (Prediction)
        const controller = this.scene.playerController;
        const net = this.scene.network;
        
        if (controller && net && net.room) {
             const localId = net.room.sessionId;
             const localEnt = controller.players.get(localId);
             if (localEnt && localEnt.visual?.sprite) {
                 const s = localEnt.visual.sprite;
                 this.debugGraphics.strokeRect(s.x - 10, s.y - 10, 20, 20);
             }
        }

        // 2. Remote Players & Ghosts
        const entities = controller.players;
        const room = net.room;
        
        if (entities && room) {
            entities.forEach((ent: any, id: string) => {
                if (!ent.visual?.sprite) return;
                const sprite = ent.visual.sprite;

                // Green = Sprite Position (Interpolated)
                this.debugGraphics.lineStyle(2, color, 1);
                this.debugGraphics.strokeRect(sprite.x - 10, sprite.y - 10, 20, 20);
                
                // Red = Server Ghost
                if (this.settings.showServerPos) {
                    const serverData = room.state.players.get(id);
                    if (serverData) {
                        this.debugGraphics.lineStyle(1, this.settings.serverGhostColor, 0.8);
                        this.debugGraphics.strokeRect(serverData.x - 10, serverData.y - 10, 20, 20);
                        this.debugGraphics.lineStyle(1, 0xffff00, 0.5);
                        this.debugGraphics.strokeLineShape(new Phaser.Geom.Line(sprite.x, sprite.y, serverData.x, serverData.y));
                    }
                }
            });
        }
    }
}