import Phaser from 'phaser';
import { ForceManager } from './ForceManager';
import { GameScene } from '../main';
import { THEME } from '../../shared/Theme';

export class GrassManager {
    private scene: GameScene;
    private forceManager: ForceManager;
    private meshes: Phaser.GameObjects.Mesh[] = [];
    private rows: Map<number, Phaser.GameObjects.Mesh> = new Map();
    
    // Config
    private readonly TILE_SIZE = 32;
    private readonly BLADE_WIDTH = 8;
    private readonly BLADE_HEIGHT = 24;

    constructor(scene: GameScene, forceManager: ForceManager) {
        this.scene = scene;
        this.forceManager = forceManager;
    }

    /**
     * Spawns a field of interactive geometric grass around a point.
     */
    public generateTestPatch(centerX: number, centerY: number, radiusTiles: number = 10) {
        const startX = centerX - (radiusTiles * this.TILE_SIZE);
        const startY = centerY - (radiusTiles * this.TILE_SIZE);
        const endX = centerX + (radiusTiles * this.TILE_SIZE);
        const endY = centerY + (radiusTiles * this.TILE_SIZE);

        for (let py = startY; py < endY; py += this.TILE_SIZE) {
            const rowTiles: {x: number, y: number}[] = [];
            for (let px = startX; px < endX; px += this.TILE_SIZE) {
                // Add 2-3 blades per tile for density
                for (let i = 0; i < 3; i++) {
                    rowTiles.push({ 
                        x: px + Math.random() * this.TILE_SIZE, 
                        y: py + Math.random() * this.TILE_SIZE 
                    });
                }
            }
            const rowIndex = Math.floor(py / this.TILE_SIZE);
            this.createRowMesh(rowIndex, rowTiles);
        }
        console.log(`[GRASS] Generated Test Patch: ${this.rows.size} rows.`);
    }

    public generateFromLayer(layer: Phaser.Tilemaps.TilemapLayer, grassTileId: number) {
        const width = layer.layer.width;
        const height = layer.layer.height;
        const data = layer.layer.data;

        for (let y = 0; y < height; y++) {
            const rowTiles: {x: number, y: number}[] = [];
            for (let x = 0; x < width; x++) {
                const tile = data[y][x];
                if (tile && tile.index === grassTileId) {
                    for (let i = 0; i < 2; i++) {
                        rowTiles.push({ 
                            x: tile.pixelX + Math.random() * 32, 
                            y: tile.pixelY + Math.random() * 32 
                        });
                    }
                    // Optional: hide the base tile if we want pure grass mesh? 
                    // Usually we keep the base tile for color filling gaps.
                    // tile.visible = false; 
                }
            }
            if (rowTiles.length > 0) {
                this.createRowMesh(y, rowTiles);
            }
        }
        console.log(`[GRASS] Generated from Layer: ${this.rows.size} rows.`);
    }

    private createRowMesh(rowIndex: number, blades: {x: number, y: number}[]) {
        // We use a blank texture for geometric meshes
        const mesh = this.scene.add.mesh(0, 0, '__WHITE');
        mesh.setDepth(rowIndex * this.TILE_SIZE + 32);
        
        const vertices: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const colors: number[] = [];

        let i = 0;
        blades.forEach(b => {
            const x = b.x;
            const y = b.y;
            const w = this.BLADE_WIDTH + (Math.random() * 4);
            const h = this.BLADE_HEIGHT + (Math.random() * 10);

            // TRIANGLE BLADE: (Root Left, Root Right, Tip)
            // Tip is at UV.y = 0, Roots at UV.y = 1
            
            // 0: Root Left
            vertices.push(x - w/2, y);
            uvs.push(0, 1);
            colors.push(0x1b5e20); // Dark Green (Material Green 900)

            // 1: Root Right
            vertices.push(x + w/2, y);
            uvs.push(1, 1);
            colors.push(0x1b5e20);

            // 2: Tip
            vertices.push(x, y - h);
            uvs.push(0.5, 0);
            colors.push(0x81c784); // Light Green (Material Green 300)

            indices.push(i, i + 1, i + 2);
            i += 3;
        });

        mesh.addVertices(vertices, uvs, indices, colors);
        
        // --- CUSTOM SHADER INTEGRATION ---
        // We set the uniforms for the shader manually since Mesh doesn't use the standard Light2D
        mesh.setPipeline('GrassPipeline'); 

        this.rows.set(rowIndex, mesh);
        this.meshes.push(mesh);
    }

    public update(time: number) {
        this.forceManager.update();
        
        const cam = this.scene.cameras.main;
        const viewY = cam.scrollY;
        const viewH = cam.height;
        const buffer = 100;

        // --- GLOBAL UNIFORMS ---
        // Since we are using a custom pipeline, we update global uniforms via the pipeline manager
        const pipeline = this.scene.renderer.pipelines.get('GrassPipeline') as any;
        if (pipeline) {
            pipeline.set1f('uTime', time * 0.001);
            pipeline.set2f('uScroll', cam.scrollX, cam.scrollY);
            pipeline.set2f('uResolution', cam.width, cam.height);
            
            // Texture Force Map
            const forceTex = this.forceManager.getTexture().texture;
            pipeline.setTexture2D(forceTex.get(0).webGLTexture, 1); // Bind to unit 1
            pipeline.set1i('uForceMap', 1);

            // Lighting
            if (this.scene.lightManager) {
                const amb = this.scene.lights.ambientColor;
                pipeline.set3f('uAmbientColor', amb.r, amb.g, amb.b);
                
                const sunInt = this.scene.lightManager.getSunColor();
                const sunRgb = Phaser.Display.Color.IntegerToRGB(sunInt);
                pipeline.set3f('uSunColor', sunRgb.r / 255, sunRgb.g / 255, sunRgb.b / 255);
            }
        }

        this.rows.forEach((mesh, rowIndex) => {
            const worldY = rowIndex * this.TILE_SIZE;
            const isVisible = (worldY >= viewY - buffer && worldY <= viewY + viewH + buffer);
            mesh.setVisible(isVisible);
            if (isVisible) {
                mesh.setDepth(worldY + 32); 
            }
        });
    }
}
