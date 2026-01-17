import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';
import { buildPhysics } from '../../shared/MapParser';
import RAPIER from '@dimforge/rapier2d-compat';
import { LightManager } from './LightManager';

export class WorldBuilder {
    private scene: Phaser.Scene;
    private physicsWorld: RAPIER.World;
    private lightManager: LightManager;
    private map!: Phaser.Tilemaps.Tilemap;
    
    // Track created objects
    public staticProps: Phaser.GameObjects.GameObject[] = [];
    public tableShadows: Phaser.GameObjects.Image[] = [];
    private logicObjects: any[] = [];

    constructor(scene: Phaser.Scene, physicsWorld: RAPIER.World, lightManager: LightManager) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.lightManager = lightManager;
    }

    public getLocation(name: string): { x: number, y: number, width?: number, height?: number } {
        return this.logicObjects.find(o => o.name === name) || { x: 0, y: 0 };
    }

    public build() {
        this.map = this.scene.make.tilemap({ key: 'map' });
        this.logicObjects = this.map.getObjectLayer("Logic")?.objects || [];
        
        // Load Tilesets
        const tileset = this.map.addTilesetImage('placeholder_tiles', 'tiles');
        const tilesetTable = this.map.addTilesetImage('table', 'table');
        const tilesetFloor = this.map.addTilesetImage('floor_cobble', 'floor_cobble');

        if (!tileset || !tilesetTable || !tilesetFloor) {
            console.error("Failed to load tilesets.");
            return;
        }

        // Iterate ALL layers in the Tiled Map
        this.map.layers.forEach((layerData, index) => {
            const name = layerData.name.toLowerCase();

            // SINGLE FLOOR: Ignore layers meant for other floors
            if (name.includes("_f1") || name.includes("floor1") || 
                name.includes("_f2") || name.includes("floor2") ||
                name.includes("_base") || name.includes("basement")) {
                console.log(`[WorldBuilder] Skipping Layer '${layerData.name}' (Multi-floor logic removed)`);
                return;
            }
            
            // Create the layer
            const layer = this.map.createLayer(index, [tileset, tilesetTable, tilesetFloor], 0, 0);
            
            if (layer) {
                if (CONFIG.USE_LIGHTS) layer.setPipeline('Light2D');
                
                // Base depth logic:
                layer.setDepth(layerData.name.includes("Furniture") ? -99 : -100);

                // Generate Shadows for Furniture Layers
                if (layerData.name.toLowerCase().includes("furniture")) {
                    this.generateTileShadows(layer);
                }
            }
        });

        // Physics
        buildPhysics(this.physicsWorld, this.scene.cache.tilemap.get('map').data);

        // Lights
        try {
            this.lightManager.initFromMap(this.map);
        } catch (e) {
            console.error("[LIGHTS] Initialization Failed:", e);
        }
    }

    private generateTileShadows(layer: Phaser.Tilemaps.TilemapLayer) {
        // Create one shadow per table tile
        layer.forEachTile((tile) => {
            if (tile.index !== -1) {
                const tileset = tile.tileset;
                if (tileset) {
                    const tileTexKey = tileset.image?.key;
                    if (tileTexKey) {
                        const tx = tile.getCenterX();
                        const ty = tile.getBottom();
                        
                        const shadow = this.scene.add.image(tx, ty, tileTexKey);
                        
                        const localId = tile.index - tileset.firstgid;
                        const row = Math.floor(localId / tileset.columns);
                        const col = localId % tileset.columns;
                        const cx = tileset.tileMargin + (col * (tileset.tileWidth + tileset.tileSpacing));
                        const cy = tileset.tileMargin + (row * (tileset.tileHeight + tileset.tileSpacing));
                        
                        shadow.setCrop(cx, cy, tileset.tileWidth, tileset.tileHeight);
                        shadow.setSize(tileset.tileWidth, tileset.tileHeight);
                        shadow.setOrigin(0.5, 1.0); 
                        shadow.setTint(0x000000);
                        shadow.setAlpha(0.3);
                        shadow.setDepth(-99.5);
                        
                        // Metadata for ShadowUtils
                        shadow.setData('baseX', tx);
                        shadow.setData('baseY', ty);
                        shadow.setData('sourceScaleX', 1.0);
                        shadow.setData('sourceScaleY', 1.0);
                        shadow.setData('height', tileset.tileHeight);

                        this.tableShadows.push(shadow);
                    }
                }
            }
        });
    }
}