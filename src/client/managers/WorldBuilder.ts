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

    public getLocation(name: string): { x: number, y: number } {
        return this.logicObjects.find(o => o.name === name) || { x: 0, y: 0 };
    }

    public build() {
        this.map = this.scene.make.tilemap({ key: 'map' });
        this.logicObjects = this.map.getObjectLayer("Logic")?.objects || [];
        
        const tileset = this.map.addTilesetImage('placeholder_tiles', 'tiles');
        const tilesetTable = this.map.addTilesetImage('table', 'table');
        const tilesetFloor = this.map.addTilesetImage('floor_cobble', 'floor_cobble');

        let floorLayer: Phaser.Tilemaps.TilemapLayer | null = null;

        if (tileset && tilesetTable && tilesetFloor) {
            floorLayer = this.map.createLayer('floor_text', tilesetFloor, 0, 0);
            if (floorLayer) {
                if (CONFIG.USE_LIGHTS) floorLayer.setPipeline('Light2D');
                floorLayer.setDepth(-101); 
            }

            const groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
            if (groundLayer) {
                if (CONFIG.USE_LIGHTS) groundLayer.setPipeline('Light2D');
                groundLayer.setDepth(-100); 
            }

            const furnitureLayer = this.map.createLayer('Furniture', tilesetTable, 0, 0);
            if (furnitureLayer) {
                if (CONFIG.USE_LIGHTS) furnitureLayer.setPipeline('Light2D');
                furnitureLayer.setDepth(-99);

                // Create one shadow per table tile
                furnitureLayer.forEachTile((tile) => {
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
        } else {
            console.error("Failed to load one or more tilesets:", { tileset, tilesetTable, tilesetFloor });
        }

        const getZones = (type: string) => this.logicObjects.filter(o => o.type === type);

        // Physics
        buildPhysics(this.physicsWorld, this.scene.cache.tilemap.get('map').data);

        // Lights
        try {
            this.lightManager.initFromMap(this.map);
        } catch (e) {
            console.error("[LIGHTS] Initialization Failed:", e);
        }

        // --- STATIC PROPS ---
        // Great Hall: 3 Tables
        const gh = this.getLocation("GREAT_HALL");
        if (gh.x !== 0) {
            this.createProp(gh.x, gh.y - 80, 256, 48, 0x5d4037, "Ignis Table"); 
            this.createProp(gh.x, gh.y, 256, 48, 0x5d4037, "Axiom Table");
            this.createProp(gh.x, gh.y + 80, 256, 48, 0x5d4037, "Vesper Table");
        }

        // Dorms
        const dormHouses: ('ignis' | 'axiom' | 'vesper')[] = ['ignis', 'axiom', 'vesper'];
        dormHouses.forEach(house => {
            const dormBase = this.getLocation(`DORM_${house.toUpperCase()}`);
            if (dormBase.x !== 0) {
                for (let i = 0; i < 8; i++) {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const bx = dormBase.x + (col * 64);
                    const by = dormBase.y + (row * 96);
                    this.createProp(bx, by, 34, 54, 0x4e342e, "Bed", true);
                }
            }
        });

        // Infirmary
        getZones("infirmary_bed").forEach((pos) => {
            this.createProp(pos.x, pos.y, 34, 54, 0xffffff, "Hospital Bed", true);
        });

        // Library (Tables)
        const lib = this.getLocation("LIBRARY");
        if (lib.x !== 0) {
            for (let i = 0; i < 2; i++) {
                const tx = lib.x + (i === 0 ? -150 : 150);
                const ty = lib.y + 100;
                this.createProp(tx, ty, 80, 32, 0x5d4037, "Study Table");
            }
        }

        // Dungeon
        const det = this.getLocation("DETENTION");
        if (det.x !== 0) {
            this.scene.add.rectangle(det.x, det.y, 300, 300, 0x1a1a1a).setDepth(-101);
            this.scene.add.text(det.x, det.y - 120, "DUNGEON", { fontSize: '32px', color: '#ff0000', alpha: 0.3 }).setOrigin(0.5).setDepth(-90);
            
            for (let i = -2; i <= 2; i++) {
                const bar = this.scene.add.rectangle(det.x + (i * 60), det.y, 4, 280, 0x333333);
                if (CONFIG.USE_LIGHTS) bar.setPipeline('Light2D');
                bar.setDepth(det.y + 140);
                this.staticProps.push(bar);
            }
        }

        // Duel Zones
        getZones("duel_zone").forEach(zone => {
            // Paint Floor Tiles Red
            const tileX = Math.floor(zone.x / 32);
            const tileY = Math.floor(zone.y / 32);
            const tileW = Math.floor(zone.width / 32);
            const tileH = Math.floor(zone.height / 32);
            
            if (floorLayer) {
                for (let y = 0; y < tileH; y++) {
                    for (let x = 0; x < tileW; x++) {
                        const tile = floorLayer.getTileAt(tileX + x, tileY + y);
                        if (tile) {
                            tile.tint = 0xff8888; 
                        }
                    }
                }
            }

            const cx = zone.x + (zone.width / 2);
            const cy = zone.y + (zone.height / 2);
            const zoneId = (zone as any).properties?.find((p: any) => p.name === 'zone_id')?.value ?? 0;
            
            this.scene.add.text(cx, cy, (zoneId + 1).toString(), {
                fontSize: '64px',
                color: '#ffffff',
                alpha: 0.15,
                fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(-90);
        });
    }

    private createProp(x: number, y: number, w: number, h: number, color: number, label: string, isBed: boolean = false) {
        const container = this.scene.add.container(x, y);
        
        // Base
        const prop = this.scene.add.rectangle(0, 0, w, h, color);
        prop.setStrokeStyle(2, 0x3e2723, 1.0);
        if (CONFIG.USE_LIGHTS) prop.setPipeline('Light2D');
        container.add(prop);

        if (isBed) {
            // Pillow
            const pillow = this.scene.add.rectangle(0, -h/2 + 8, w - 8, 12, 0xeeeeee);
            if (CONFIG.USE_LIGHTS) pillow.setPipeline('Light2D');
            container.add(pillow);
        }

        container.setDepth(y - 10); 
        
        // Add shadow
        const bottomY = y + h/2;
        const shadow = this.scene.add.image(x, bottomY, 'shadow_base');
        shadow.setTint(0x000000);
        shadow.setOrigin(0.5, 1.0); 
        shadow.setDepth(-99.5); 
        
        const scaleX = w / 32;
        const scaleY = h / 32;
        
        shadow.setData('baseX', x);
        shadow.setData('baseY', bottomY);
        shadow.setData('sourceScaleX', scaleX);
        shadow.setData('sourceScaleY', scaleY);
        shadow.setData('height', h);
        
        this.tableShadows.push(shadow);
        this.staticProps.push(container);
        container.setData('label', label);
        
        return container;
    }
}
