import { Pane } from 'tweakpane';
import * as Phaser from 'phaser';
import RAPIER from '@dimforge/rapier2d-compat';
import { GameScene } from './main'; 

export class DebugManager {
    private scene: Phaser.Scene;
    private pane: any; // Relaxed type for Tweakpane v4 compatibility
    private debugGraphics: Phaser.GameObjects.Graphics;
    
    // Configuración de Debug
    public settings = {
        showHitboxes: false,
        showServerPos: false, // Futuro: mostrar posición real del servidor (ghost)
        zoom: 1.0,
        debugColor: 0x00ff00,
        serverGhostColor: 0xff0000,
        // Lighting
        enableLights: true,
        ambientColor: { r: 128, g: 128, b: 128 },
        cursorLightIntensity: 0.0,
        cursorLightColor: { r: 255, g: 255, b: 200 },
        cursorLightRadius: 150
    };
    
    private cursorLight: Phaser.GameObjects.Light | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.pane = new Pane({ title: 'Cliffwald2D DevTools' });
        this.debugGraphics = this.scene.add.graphics().setDepth(9999); // Siempre encima

        this.setupGUI();
    }

    private setupGUI() {
        const folderView = this.pane.addFolder({ title: 'Visuals' });
        
        // Toggle Hitboxes
        folderView.addBinding(this.settings, 'showHitboxes', { label: 'Show Hitboxes' });
        
        // Zoom Control
        folderView.addBinding(this.settings, 'zoom', {
            min: 0.1,
            max: 3.0,
            step: 0.1,
            label: 'Camera Zoom'
        }).on('change', (ev: any) => {
            this.scene.cameras.main.setZoom(ev.value);
        });

        // Debug Color
        folderView.addBinding(this.settings, 'debugColor', {
            view: 'color',
            label: 'Hitbox Color'
        });

        const folderNet = this.pane.addFolder({ title: 'Network' });
        folderNet.addBinding(this.settings, 'showServerPos', { label: 'Show Server Ghost' });
        
        // --- LIGHTING EDITOR ---
        const folderLights = this.pane.addFolder({ title: 'Lighting Engine' });
        
        folderLights.addBinding(this.settings, 'enableLights', { label: 'Enable Pipeline' })
            .on('change', (ev: any) => {
                this.scene.lights.active = ev.value;
            });
            
        folderLights.addBinding(this.settings, 'ambientColor', { view: 'color', label: 'Ambient Color' })
            .on('change', (ev: any) => {
                const color = new Phaser.Display.Color(ev.value.r, ev.value.g, ev.value.b);
                this.scene.lights.setAmbientColor(color.color);
            });

        folderLights.addBinding(this.settings, 'cursorLightIntensity', { min: 0, max: 3, step: 0.1, label: 'Cursor Light' });
        folderLights.addBinding(this.settings, 'cursorLightRadius', { min: 50, max: 500, step: 10, label: 'Radius' });
        folderLights.addBinding(this.settings, 'cursorLightColor', { view: 'color', label: 'Light Color' });
        
        // Botón de ejemplo para acciones
        this.pane.addButton({ title: 'Print Player Pos' }).on('click', () => {
            const player = (this.scene as any).currentPlayer;
            if (player) {
                console.log(`Player Pos: X=${player.x.toFixed(2)}, Y=${player.y.toFixed(2)}`);
            }
        });
    }

    public update() {
        this.debugGraphics.clear();

        if (this.settings.showHitboxes) {
            this.drawHitboxes();
        }

        // --- LIGHTING UPDATE ---
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
        this.debugGraphics.lineStyle(2, 0x00ff00, 1);

        // 1. Local Player (Prediction)
        const player = (this.scene as any).currentPlayer;
        const controller = (this.scene as any).playerController;
        
        if (player && controller) {
             // Green Box = Where Sprite Is (Smoothed)
             this.debugGraphics.strokeRect(player.x - 10, player.y - 10, 20, 20); // 10 radius
        }

        // 2. Remote Players & Ghosts
        const entities = controller.entities;
        const room = (this.scene as any).network.room;
        
        if (entities && room) {
            entities.forEach((sprite: any, id: string) => {
                // Green = Sprite Position (Interpolated)
                this.debugGraphics.lineStyle(2, 0x00ff00, 1);
                this.debugGraphics.strokeRect(sprite.x - 10, sprite.y - 10, 20, 20);
                
                // Red = Server Truth (Snapshot)
                // We need to look at the RAW schema data
                const serverData = room.state.players.get(id);
                if (serverData) {
                    this.debugGraphics.lineStyle(1, 0xff0000, 0.8);
                    this.debugGraphics.strokeRect(serverData.x - 10, serverData.y - 10, 20, 20);
                    
                    // Draw line connecting them (Lag visualization)
                    this.debugGraphics.lineStyle(1, 0xffff00, 0.5);
                    this.debugGraphics.strokeLineShape(new Phaser.Geom.Line(sprite.x, sprite.y, serverData.x, serverData.y));
                }
            });
        }
        
        // 3. Static World Colliders (Walls)
        const physicsWorld = (this.scene as any).physicsWorld as RAPIER.World;
        if (physicsWorld) {
            this.debugGraphics.lineStyle(2, 0x0000ff, 0.5); // Blue for static walls
            
            physicsWorld.forEachCollider((collider) => {
                const shape = collider.shape;
                const translation = collider.translation();
                const rotation = collider.rotation();

                // Rapier Cuboids (Rectangles)
                if ((shape as any).halfExtents) {
                    const he = (shape as any).halfExtents;
                    // Need to handle rotation if we want to be precise, but walls are usually AABB in 2D RPGs
                    this.debugGraphics.strokeRect(translation.x - he.x, translation.y - he.y, he.x * 2, he.y * 2);
                }
                // Rapier Balls (Circles)
                else if ((shape as any).radius) {
                    const r = (shape as any).radius;
                    this.debugGraphics.strokeCircle(translation.x, translation.y, r);
                }
            });
        }
    }
}
