import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';
import { THEME } from '../../shared/Theme';

interface WindowObject {
    frame: Phaser.GameObjects.Image;
    light?: Phaser.GameObjects.Light; 
    ray: Phaser.GameObjects.Image;
    baseX: number;
    baseY: number;
}

export class LightManager {
    private scene: Phaser.Scene;
    private lights: Map<string, Phaser.GameObjects.Light> = new Map();
    private windows: WindowObject[] = [];
    
    // Cycle Colors
    private readonly COLORS = {
        NIGHT: { r: 40, g: 50, b: 100 }, 
        DAWN: { r: 255, g: 180, b: 100 }, 
        DAY: { r: 255, g: 255, b: 230 }, 
        DUSK: { r: 255, g: 255, b: 150 }    
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        if (CONFIG.USE_LIGHTS) {
            this.scene.lights.enable();
            this.scene.lights.setAmbientColor(0x222222); 
        }
    }

    public initFromMap(map: Phaser.Tilemaps.Tilemap) {
        const logicObjects = map.getObjectLayer("Logic")?.objects || [];
        const windowLocs = logicObjects.filter(o => o.type === 'window' || o.name?.toLowerCase().includes('window'));

        if (windowLocs.length > 0) {
            console.log(`[LIGHTS] Found ${windowLocs.length} windows in map.`);
            windowLocs.forEach(loc => {
                this.addWindow(loc.x, loc.y);
            });
        } else {
            console.warn("[LIGHTS] No window objects found in 'Logic' layer. Using procedural fallback.");
            this.populateWindows();
        }
    }

    private populateWindows() {
        // Fallback: Add 10 windows along the top wall (y=0 approx)
        const MAP_WIDTH = 3200; // Standard world size
        for (let x = 200; x < MAP_WIDTH; x += 400) {
            this.addWindow(x, 100);
        }
    }

    private addWindow(x: number, y: number) {
        // 1. Frame
        const frame = this.scene.add.image(x, y, 'window_frame');
        frame.setDepth(-50); 
        if (CONFIG.USE_LIGHTS) frame.setPipeline('Light2D');

        // 2. Real 2D Light (Affects Normal Maps)
        const light = this.scene.lights.addLight(x, y, 300, 0xffffff, 0);

        // 3. Volumetric Ray (Visual Atmospheric effect)
        const ray = this.scene.add.image(x, y + 16, 'window_light_ray');
        ray.setOrigin(0.5, 0.0);
        ray.setDepth(150);
        ray.setBlendMode(Phaser.BlendModes.ADD);
        ray.setAlpha(0);

        this.windows.push({ frame, light, ray, baseX: x, baseY: y }); 
    }

    public update(gameHour: number) {
        const hour = gameHour;
        
        // 1. Calculate Ambient Color
        const { color: ambientColor } = this.calculateCycleState(hour);
        this.scene.lights.setAmbientColor(ambientColor);

        // 2. Global Light Logic
        let rotation = 0;
        let rayAlpha = 0;
        let lightColor = 0xffffff;

        if (hour >= 5 && hour < 19) {
            // DAY PHASE
            rotation = Phaser.Math.DegToRad(-70 + ((hour - 5) / 14) * 140);
            rayAlpha = 0.45;
            if (hour < 7 || hour > 17) rayAlpha = 0.15;

            if (hour < 8) lightColor = this.colorToInt(this.COLORS.DAWN);
            else if (hour > 16) lightColor = this.colorToInt(this.COLORS.DUSK);
            else lightColor = this.colorToInt(this.COLORS.DAY);

        } else {
            // NIGHT PHASE
            const nightHour = (hour >= 19) ? hour : hour + 24;
            rotation = Phaser.Math.DegToRad(-40 + ((nightHour - 19) / 10) * 80);
            rayAlpha = 0.15; 
            lightColor = this.colorToInt(this.COLORS.NIGHT);
        }

        // 3. Apply to all windows
        this.windows.forEach(w => {
            w.ray.setRotation(rotation);
            w.ray.setAlpha(rayAlpha);
            w.ray.setTint(lightColor);

            // Update Light2D (Real source)
            if (w.light) {
                w.light.setColor(lightColor);
                w.light.setIntensity(rayAlpha * 2.5); // Boost intensity for better normal map highlighting
            }
        });
    }

    private calculateCycleState(hour: number): { color: number, intensity: number } {
        let c1, c2, t;
        
        if (hour < 5) { // Deep Night
            return { color: this.colorToInt(this.COLORS.NIGHT), intensity: 0.3 };
        } else if (hour < 8) { // Dawn
            c1 = this.COLORS.NIGHT; c2 = this.COLORS.DAWN; t = (hour - 5) / 3;
        } else if (hour < 16) { // Day
            c1 = this.COLORS.DAWN; c2 = this.COLORS.DAY; t = (hour - 8) / 8;
        } else if (hour < 20) { // Dusk
            c1 = this.COLORS.DAY; c2 = this.COLORS.DUSK; t = (hour - 16) / 4;
        } else { // Night
            c1 = this.COLORS.DUSK; c2 = this.COLORS.NIGHT; t = (hour - 20) / 4;
        }

        return { color: this.lerpColor(c1, c2, t), intensity: 1.0 };
    }

    private lerpColor(c1: any, c2: any, t: number): number {
        const r = Math.floor(Phaser.Math.Linear(c1.r, c2.r, t));
        const g = Math.floor(Phaser.Math.Linear(c1.g, c2.g, t));
        const b = Math.floor(Phaser.Math.Linear(c1.b, c2.b, t));
        return (r << 16) + (g << 8) + b;
    }

    private colorToInt(c: any): number {
        return (c.r << 16) + (c.g << 8) + c.b;
    }
}