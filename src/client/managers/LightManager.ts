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
    private windows: WindowObject[] = [];
    private sunPosition: { x: number, y: number } = { x: 0, y: 0 };
    
    // Override
    private overrideEnabled: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        if (CONFIG.USE_LIGHTS) {
            this.scene.lights.enable();
            // Start with a Neutral Grey (Day-ish) to avoid "Black World" on load
            this.scene.lights.setAmbientColor(0x888888); 
        }
    }

    public setLightingOverride(enabled: boolean) {
        this.overrideEnabled = enabled;
    }

    private hexToColor(hex: string | number): number {
        if (typeof hex === 'number') return hex;
        const clean = hex.toString().replace('#', '');
        return parseInt(clean.substring(clean.length - 6), 16);
    }

    public initFromMap(map: Phaser.Tilemaps.Tilemap) {
        // 1. Logic Layer (Windows)
        const logicObjects = map.getObjectLayer("Logic")?.objects || [];
        const windowLocs = logicObjects.filter(o => o.type === 'window' || o.name?.toLowerCase().includes('window'));

        if (windowLocs.length > 0) {
            console.log(`[LIGHTS] Found ${windowLocs.length} windows in map.`);
            windowLocs.forEach(loc => {
                this.addWindow(loc.x, loc.y);
            });
        }

        // 2. Lights Layer (Generic Lights)
        const lightObjects = map.getObjectLayer("Lights")?.objects || [];
        if (lightObjects.length > 0) {
            console.log(`[LIGHTS] Found ${lightObjects.length} generic lights in 'Lights' layer.`);
            lightObjects.forEach(obj => {
                const x = obj.x || 0;
                const y = obj.y || 0;
                
                let color = 0xffffff;
                let intensity = 1.0;
                let radius = 200;

                if (obj.properties) {
                    obj.properties.forEach((p: any) => {
                        if (p.name === 'color') color = this.hexToColor(p.value);
                        if (p.name === 'intensity') intensity = p.value;
                        if (p.name === 'radius') radius = p.value;
                    });
                }
                this.scene.lights.addLight(x, y, radius, color, intensity);
            });
        }
    }

    private addWindow(x: number, y: number) {
        // 1. Frame
        const frame = this.scene.add.image(x, y, 'window_frame');
        frame.setDepth(-50); 
        if (CONFIG.USE_LIGHTS) frame.setPipeline('Light2D');

        // 2. Real 2D Light
        const light = this.scene.lights.addLight(x, y, CONFIG.LIGHTING_CONFIG.WINDOW_LIGHT_RADIUS, 0xffffff, 0);

        // 3. Volumetric Ray
        const ray = this.scene.add.image(x, y + 16, 'window_light_ray');
        ray.setOrigin(0.5, 0.0);
        ray.setDepth(150);
        ray.setBlendMode(Phaser.BlendModes.ADD);
        ray.setAlpha(0);

        this.windows.push({ frame, light, ray, baseX: x, baseY: y }); 
    }

    public getSunPosition() {
        return this.sunPosition;
    }

    public getSunHeight(hour: number): number {
        const trans = CONFIG.LIGHTING_CONFIG.TRANSITIONS;
        if (hour < trans.DAWN_START || hour >= trans.NIGHT_START) return 0; 
        
        const dayDuration = trans.NIGHT_START - trans.DAWN_START;
        const progress = (hour - trans.DAWN_START) / dayDuration;
        return Math.sin(progress * Math.PI);
    }

    public update(gameHour: number) {
        // --- UNIFIED OVERRIDE LOGIC ---
        if (this.overrideEnabled) {
            this.scene.lights.setAmbientColor(0xffffff);
            this.scene.lights.lights.forEach(light => light.setVisible(false));
            this.windows.forEach(w => w.ray.setVisible(false));
            return;
        }

        const hour = gameHour;
        
        // 1. Calculate Ambient Color
        const { color: ambientColor } = this.calculateCycleState(hour);
        this.scene.lights.setAmbientColor(ambientColor);

        // 2. Calculate Global Light Source (Dynamic Center)
        const camera = this.scene.cameras.main;
        const centerX = camera.scrollX + camera.width / 2;
        const centerY = camera.scrollY + camera.height / 2;
        const orbitRadius = CONFIG.LIGHTING_CONFIG.ORBIT_RADIUS;
        
        const angle = ((hour - 6) / 24) * (Math.PI * 2); 
        this.sunPosition.x = centerX + Math.cos(angle) * orbitRadius;
        this.sunPosition.y = centerY + Math.sin(angle) * orbitRadius;

        // 3. Global Light Logic for Windows
        let rotation = angle + Math.PI / 2;
        let rayAlpha = 0;
        let lightColor = 0xffffff;

        const trans = CONFIG.LIGHTING_CONFIG.TRANSITIONS;
        const palette = CONFIG.LIGHTING_CONFIG.PALETTE;

        if (hour >= trans.DAWN_START && hour < trans.NIGHT_START) {
            // DAY PHASE
            rayAlpha = CONFIG.LIGHTING_CONFIG.WINDOW_RAY_ALPHA;
            if (hour < (trans.DAWN_START + 2) || hour > (trans.NIGHT_START - 2)) rayAlpha *= 0.3;

            if (hour < trans.DAY_START) lightColor = this.colorToInt(palette.DAWN);
            else if (hour > trans.DUSK_START) lightColor = this.colorToInt(palette.DUSK);
            else lightColor = this.colorToInt(palette.DAY);

        } else {
            // NIGHT PHASE
            const nightHour = (hour >= trans.NIGHT_START) ? hour : hour + 24;
            rotation = Phaser.Math.DegToRad(-40 + ((nightHour - trans.NIGHT_START) / 10) * 80);
            rayAlpha = 0.15; 
            lightColor = this.colorToInt(palette.NIGHT);
        }

        // 4. Update Windows with CULLING
        const camera = this.scene.cameras.main;
        const viewRect = camera.worldView;
        // Expand cull rect slightly to avoid pop-in
        const cullRect = new Phaser.Geom.Rectangle(viewRect.x - 200, viewRect.y - 200, viewRect.width + 400, viewRect.height + 400);

        this.windows.forEach(w => {
            // Culling Check
            const inView = cullRect.contains(w.baseX, w.baseY);
            
            if (w.light) {
                w.light.setVisible(inView);
                if (inView) {
                    w.light.setColor(lightColor);
                    w.light.setIntensity(rayAlpha * 2.5);
                }
            }
            
            w.ray.setVisible(inView);
            w.frame.setVisible(inView);

            if (inView) {
                w.ray.setRotation(rotation);
                w.ray.setAlpha(rayAlpha);
                w.ray.setTint(lightColor);
            }
        });
    }

    private calculateCycleState(hour: number): { color: number, intensity: number } {
        const trans = CONFIG.LIGHTING_CONFIG.TRANSITIONS;
        const palette = CONFIG.LIGHTING_CONFIG.PALETTE;
        let c1, c2, t;
        
        if (hour < trans.DAWN_START) { // Deep Night
            return { color: this.colorToInt(palette.NIGHT), intensity: palette.NIGHT.ambient };
        } else if (hour < trans.DAY_START) { // Dawn
            c1 = palette.NIGHT; c2 = palette.DAWN; t = (hour - trans.DAWN_START) / (trans.DAY_START - trans.DAWN_START);
        } else if (hour < trans.DUSK_START) { // Day
            c1 = palette.DAWN; c2 = palette.DAY; t = (hour - trans.DAY_START) / (trans.DUSK_START - trans.DAY_START);
        } else if (hour < trans.NIGHT_START) { // Dusk
            c1 = palette.DAY; c2 = palette.DUSK; t = (hour - trans.DUSK_START) / (trans.NIGHT_START - trans.DUSK_START);
        } else { // Night
            c1 = palette.DUSK; c2 = palette.NIGHT; t = (hour - trans.NIGHT_START) / (24 - trans.NIGHT_START + trans.DAWN_START);
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
