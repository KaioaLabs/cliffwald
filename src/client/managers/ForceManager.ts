import Phaser from 'phaser';

export class ForceManager {
    private scene: Phaser.Scene;
    private forceMap: Phaser.GameObjects.RenderTexture;
    private brush: Phaser.GameObjects.Arc;
    
    // Configuration
    private readonly MAP_SIZE = 256; // Low res is fine for wind forces
    private readonly DECAY = 0.05;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        // 1. Create the invisible texture that holds the "wind" data
        this.forceMap = this.scene.add.renderTexture(0, 0, this.MAP_SIZE, this.MAP_SIZE);
        this.forceMap.setVisible(false);
        this.forceMap.saveTexture('wind_force_map');

        // 2. Create a "brush" (the shape of the force)
        // A fuzzy circle: White center (strong force) -> Transparent edge
        this.brush = this.scene.add.circle(0, 0, 20, 0xffffff, 1.0);
        this.brush.setVisible(false);
    }

    public push(worldX: number, worldY: number, radius: number = 20) {
        // Convert World Pos -> Texture UV Space (0..1) -> Texture Pixel Space
        const cam = this.scene.cameras.main;
        
        // Relative to screen
        const screenX = worldX - cam.scrollX;
        const screenY = worldY - cam.scrollY;

        // Scale to force map size
        const mapX = (screenX / cam.width) * this.MAP_SIZE;
        const mapY = (screenY / cam.height) * this.MAP_SIZE;

        // Draw brush
        this.brush.setRadius(radius * (this.MAP_SIZE / cam.width));
        this.brush.setPosition(mapX, mapY);
        this.forceMap.draw(this.brush);
    }

    public update() {
        // Fade out everything slightly (Trail effect)
        // Draw a black rectangle with low alpha over the whole map
        this.forceMap.fill(0x000000, this.DECAY);
    }

    public getTexture() {
        return this.forceMap;
    }
}
