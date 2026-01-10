import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';
import { THEME } from '../../shared/Theme';

interface WindowObject {
    frame: Phaser.GameObjects.Image;
    light: Phaser.GameObjects.PointLight;
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
        NIGHT: { r: 50, g: 60, b: 120 }, // Cool Blue
        DAWN: { r: 255, g: 200, b: 150 }, // Warm Orange
        DAY: { r: 255, g: 255, b: 240 }, // Bright White/Yellow
        DUSK: { r: 255, g: 100, b: 100 }  // Reddish
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        if (CONFIG.USE_LIGHTS) {
            this.scene.lights.enable();
            this.scene.lights.setAmbientColor(0x333333);
        }
        
        // Populate procedural windows since map data is insufficient
        this.populateWindows();
    }

    public initFromMap(map: Phaser.Tilemaps.Tilemap) {
        if (!CONFIG.USE_LIGHTS) return;
        const lightsLayer = map.getObjectLayer('Lights');
        if (!lightsLayer) return;

        console.log(`[LIGHTS] Found ${lightsLayer.objects.length} lights in map.`);
        lightsLayer.objects.forEach(obj => {
            const props = obj.properties || [];
            const getProp = (name: string, def: any) => props.find((p: any) => p.name === name)?.value ?? def;

            const colorHex = getProp('color', '#ffffff');
            const radius = getProp('radius', 200);
            const intensity = getProp('intensity', 1.0);
            
            const color = parseInt(colorHex.replace('#', '0x'), 16);
            if (obj.x !== undefined && obj.y !== undefined) {
                const light = this.scene.lights.addLight(obj.x, obj.y, radius, color, intensity);
                const lightId = obj.name || `light_${obj.id}`;
                this.lights.set(lightId, light);
            }
        });
    }

    private populateWindows() {
        // --- 1. Great Hall Windows ---
        // North Wall
        for (let x = 1350; x <= 1850; x += 150) {
            this.addWindow(x, 480);
        }
        // South Wall
        for (let x = 1350; x <= 1850; x += 150) {
            this.addWindow(x, 640);
        }

        // --- 2. Dormitories ---
        const dorms = [CONFIG.SCHOOL_LOCATIONS.DORM_IGNIS, CONFIG.SCHOOL_LOCATIONS.DORM_AXIOM, CONFIG.SCHOOL_LOCATIONS.DORM_VESPER];
        dorms.forEach(dorm => {
            // Left Wall
            this.addWindow(dorm.x - 100, dorm.y + 50);
            this.addWindow(dorm.x - 100, dorm.y + 150);
            // Right Wall
            this.addWindow(dorm.x + 250, dorm.y + 50);
            this.addWindow(dorm.x + 250, dorm.y + 150);
        });

        // --- 3. Corridors (Procedural Segments) ---
        // Main Horizontal Hallway (Left Wing to Right Wing)
        this.addCorridorWindows(600, 1200, 2600, 1200, 250);
        
        // Vertical Hallway (Dorms Connection)
        this.addCorridorWindows(576, 500, 576, 2000, 300);

        // Vertical Hallway (Academic Wing)
        this.addCorridorWindows(1600, 700, 1600, 2000, 300);
    }

    private addCorridorWindows(x1: number, y1: number, x2: number, y2: number, step: number) {
        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const count = Math.floor(dist / step);
        const vec = new Phaser.Math.Vector2(x2 - x1, y2 - y1).normalize();

        for (let i = 0; i <= count; i++) {
            const wx = x1 + vec.x * (i * step);
            const wy = y1 + vec.y * (i * step);
            // Offset slightly to be "on the wall" (Assuming walls are nearby? simplified: just place at coords)
            this.addWindow(wx, wy);
        }
    }

    private addWindow(x: number, y: number) {
        // 1. Frame
        const frame = this.scene.add.image(x, y, 'window_frame');
        frame.setDepth(-50); // Behind players, on walls
        if (CONFIG.USE_LIGHTS) frame.setPipeline('Light2D');

        // 2. Light Source (Bloom)
        const light = this.scene.add.pointlight(x, y, 0xffffff, 150, 0.4);
        light.setDepth(100);

        // 3. Volumetric Ray
        const ray = this.scene.add.image(x, y + 16, 'window_light_ray');
        ray.setOrigin(0.5, 0.0); // Rotate around top center
        ray.setDepth(150); // Overlays slightly
        ray.setBlendMode(Phaser.BlendModes.ADD);
        ray.setAlpha(0.6);

        this.windows.push({ frame, light, ray, baseX: x, baseY: y });
    }

    public update(gameHour: number) {
        const hour = gameHour;
        
        // 1. Calculate Ambient Color & Intensity
        const { color: ambientColor, intensity: ambientIntensity } = this.calculateCycleState(hour);
        this.scene.lights.setAmbientColor(ambientColor);

        // 2. Calculate Sun/Moon Rotation
        // 06:00 (Dawn) -> -60 deg
        // 12:00 (Noon) -> 0 deg (Vertical? Or maybe south?) 
        // Let's say Sun moves East -> West.
        // If "Up" is North. 
        // 6h (East) -> Rays point West (-90 deg?)
        // 12h (South) -> Rays point North (0 deg?)
        // 18h (West) -> Rays point East (90 deg?)
        // Let's try a simple sweep from -60 to +60.
        
        let rotation = 0;
        let rayAlpha = 0;
        let lightColor = 0xffffff;

        if (hour >= 5 && hour < 19) {
            // DAY PHASE
            const dayProgress = (hour - 6) / 12; // -1h buffer? 5 to 19 is 14h.
            // Map 5..19 to -70deg .. +70deg
            rotation = Phaser.Math.DegToRad(-70 + ((hour - 5) / 14) * 140);
            
            rayAlpha = 0.5;
            if (hour < 7 || hour > 17) rayAlpha = 0.2; // Dim at edges

            // Light Color
            if (hour < 8) lightColor = this.colorToInt(this.COLORS.DAWN);
            else if (hour > 16) lightColor = this.colorToInt(this.COLORS.DUSK);
            else lightColor = this.colorToInt(this.COLORS.DAY);

        } else {
            // NIGHT PHASE (Moon)
            // Moon also moves? Or static? Let's move it opposite.
            // 19..29(5)
            const nightHour = (hour >= 19) ? hour : hour + 24;
            // 19 -> -40deg, 29(5) -> +40deg
            rotation = Phaser.Math.DegToRad(-40 + ((nightHour - 19) / 10) * 80);
            
            rayAlpha = 0.2; // Faint moonlight
            lightColor = this.colorToInt(this.COLORS.NIGHT);
        }

        // 3. Apply to all windows
        this.windows.forEach(w => {
            // Rotate Ray
            w.ray.setRotation(rotation);
            w.ray.setAlpha(rayAlpha);
            w.ray.setTint(lightColor);

            // Update PointLight
            w.light.color.set(lightColor);
            w.light.intensity = rayAlpha * 1.5; // Linked to ray alpha
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
