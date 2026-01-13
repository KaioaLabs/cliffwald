import { Pane } from 'tweakpane';
import * as Phaser from 'phaser';
import RAPIER from '@dimforge/rapier2d-compat';
import { GameScene } from './main'; 
import { CONFIG } from '../shared/Config';

export class DebugManager {
    private scene: Phaser.Scene;
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
    };
    
    private cursorLight: Phaser.GameObjects.Light | null = null;
    private defaultPlayerSpeed: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.defaultPlayerSpeed = CONFIG.PLAYER_SPEED;
        this.pane = new Pane({ title: 'Cliffwald2D DevTools' });
        this.debugGraphics = this.scene.add.graphics().setDepth(9999); 

        this.setupGUI();
    }

    private setupGUI() {
        // --- GENERAL ---
        const fGeneral = this.pane.addFolder({ title: 'General', expanded: false });
        fGeneral.addBinding(this.settings, 'zoom', { min: 0.1, max: 3.0, step: 0.1, label: 'Zoom' })
            .on('change', (ev: any) => this.scene.cameras.main.setZoom(ev.value));
        
        // --- NETWORK ---
        const fNet = this.pane.addFolder({ title: 'Network', expanded: false });
        fNet.addBinding(this.settings, 'showServerPos', { label: 'Show Ghost' });
        fNet.addBinding(this.settings, 'simulatedLatency', { min: 0, max: 1000, step: 10, label: 'Sim Lag (ms)' })
            .on('change', (ev: any) => {
                const net = (this.scene as GameScene).network;
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
                const pc = (this.scene as GameScene).playerController;
                const net = (this.scene as GameScene).network;
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
            .on('change', (ev: any) => this.scene.lights.active = ev.value);
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
        fTime.addBinding(this.settings, 'overrideTime', { label: 'Override Time' });
        fTime.addBinding(this.settings, 'debugHour', { min: 0, max: 24, step: 0.1, label: 'Game Hour' });
    }

    public update() {
        this.debugGraphics.clear();

        if (this.settings.showHitboxes) {
            this.drawHitboxes();
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

    private drawHitboxes() {
        const color = this.settings.debugColor;
        this.debugGraphics.lineStyle(2, color, 1);

        // 1. Local Player (Prediction)
        const player = (this.scene as any).currentPlayer; // Legacy check, use controller
        const controller = (this.scene as GameScene).playerController;
        const net = (this.scene as GameScene).network;
        
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
