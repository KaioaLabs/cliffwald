import Phaser from 'phaser';
import { GameScene } from '../main';

export class WaterManager {
    private scene: Phaser.Scene;
    private shader: Phaser.GameObjects.Shader;
    private terrainLayer?: Phaser.Tilemaps.TilemapLayer;
    private waterTileId: number = 1;
    private checkTimer: number = 0;

    constructor(scene: Phaser.Scene, mapWidthPixels: number, mapHeightPixels: number) {
        this.scene = scene;
        
        // OPTIMIZATION: Screen Space Shader
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.shader = this.scene.add.shader('water', width / 2, height / 2, width, height);
        this.shader.setScrollFactor(0); 
        this.shader.setDepth(-110); // BEHIND Terrain (-105)    
        
        this.scene.scale.on('resize', (gameSize: any) => {
            this.shader.setPosition(gameSize.width / 2, gameSize.height / 2);
            // this.shader.resize is not a function in Phaser 3.80 Shader Game Object
            // The shader size is set on creation. We might need to recreate it or set width/height properties?
            // Actually, Shader object has width/height properties.
            this.shader.width = gameSize.width;
            this.shader.height = gameSize.height;
        });
    }

    public update(time: number, delta: number) {
        // SMART CULLING (Optimization)
        // Check every 200ms if water is actually visible.
        this.checkTimer += delta;
        if (this.checkTimer > 200) {
            this.checkTimer = 0;
            this.updateVisibility();
        }

        if (!this.shader.visible) return;

        this.shader.setUniform('uScroll', { 
            x: this.scene.cameras.main.scrollX, 
            y: this.scene.cameras.main.scrollY 
        });
        
        this.shader.setUniform('uResolution', {
            x: this.scene.scale.width,
            y: this.scene.scale.height
        });
        
        this.shader.setUniform('uTime', time * 0.001);

        // --- DYNAMIC LIGHTING INTEGRATION ---
        const gameScene = this.scene as GameScene;
        if (gameScene.lightManager) {
            const ambColor = this.scene.lights.ambientColor;
            // Phaser ambientColor r,g,b are 0-1 floats
            this.shader.setUniform('uAmbientColor', { r: ambColor.r, g: ambColor.g, b: ambColor.b });
            
            const sunInt = gameScene.lightManager.getSunColor();
            const sunRgb = Phaser.Display.Color.IntegerToRGB(sunInt);
            // sunRgb properties are 0-255 ints
            this.shader.setUniform('uSunColor', { r: sunRgb.r / 255, g: sunRgb.g / 255, b: sunRgb.b / 255 });
        }
    }
    private updateVisibility() {
        if (!this.terrainLayer) return;

        // Get the world bounds of the current camera view
        const cam = this.scene.cameras.main;
        const margin = 100; // Small buffer to prevent popping
        
        // Ask the Tilemap: "Are there any water tiles in this rectangle?"
        // This is very fast in Phaser (spatial hash lookup)
        const tiles = this.terrainLayer.getTilesWithinWorldXY(
            cam.scrollX - margin, 
            cam.scrollY - margin, 
            cam.width + (margin*2), 
            cam.height + (margin*2),
            { isNotEmpty: true }
        );

        const hasWater = tiles.some(t => t.index === this.waterTileId);
        
        if (this.shader.visible !== hasWater) {
            this.shader.setVisible(hasWater);
            // Optional: Log for debugging performance
            // console.log(`[WaterManager] Shader Active: ${hasWater}`);
        }
    }

    public applyTransparency(layer: Phaser.Tilemaps.TilemapLayer, waterTileId: number) {
        this.terrainLayer = layer;
        this.waterTileId = waterTileId;

        layer.forEachTile((tile) => {
            if (tile.index === waterTileId) {
                tile.alpha = 0;
            }
        });
        
        console.log(`[WaterManager] Replaced static water tiles (ID ${waterTileId}) with Shader.`);
        this.generateDepthMap(layer, waterTileId);
    }

    private generateDepthMap(layer: Phaser.Tilemaps.TilemapLayer, waterId: number) {
        const width = layer.layer.width;
        const height = layer.layer.height;
        const distMap = new Float32Array(width * height).fill(-1);
        const queue: number[] = [];

        // 1. Initialize BFS: All LAND tiles are distance 0
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = layer.layer.data[y][x];
                const isWater = tile && tile.index === waterId;
                
                if (!isWater) {
                    const idx = y * width + x;
                    distMap[idx] = 0;
                    queue.push(idx);
                }
            }
        }

        // 2. BFS
        const MAX_DIST = 15.0; // Gradient over 15 tiles
        let head = 0;
        
        const dirs = [-1, 1, -width, width]; // Left, Right, Up, Down

        while (head < queue.length) {
            const currIdx = queue[head++];
            const currDist = distMap[currIdx];

            if (currDist >= MAX_DIST) continue;

            for (const d of dirs) {
                const neighborIdx = currIdx + d;
                
                // Boundary checks
                if (neighborIdx < 0 || neighborIdx >= distMap.length) continue;
                // Horizontal wrap prevention
                if (Math.abs((currIdx % width) - (neighborIdx % width)) > 1) continue; 

                if (distMap[neighborIdx] === -1) {
                    distMap[neighborIdx] = currDist + 1;
                    queue.push(neighborIdx);
                }
            }
        }

        // 3. Create Texture
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < distMap.length; i++) {
            const d = distMap[i];
            const norm = d === -1 ? 1.0 : Math.min(d, MAX_DIST) / MAX_DIST; // -1 means deep ocean far from everything
            const val = Math.floor(norm * 255);
            
            imgData.data[i * 4 + 0] = val; // R: Depth
            imgData.data[i * 4 + 1] = 0;
            imgData.data[i * 4 + 2] = 0;
            imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        this.scene.textures.addCanvas('water_depth', canvas);
        this.shader.setSampler2D('uDepthMap', 'water_depth', 0);
        
                // Pass map dimensions to normalize shader coords
                this.shader.setUniform('uMapSize', { x: width * 32, y: height * 32 }); // Assuming 32px tiles     
                console.log("[WaterManager] Depth Map Generated & Bound.");
            }
        }
