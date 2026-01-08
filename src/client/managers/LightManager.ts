import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';

export class LightManager {
    private scene: Phaser.Scene;
    private lights: Map<string, Phaser.GameObjects.Light> = new Map();
    private rays: Map<string, { graphics: Phaser.GameObjects.Graphics, baseX: number, baseY: number, width?: number, length?: number }> = new Map();
    
    // Cycle Colors
    private readonly COLORS = {
        NIGHT: { r: 20, g: 20, b: 50 },
        DAWN: { r: 200, g: 150, b: 100 },
        DAY: { r: 255, g: 255, b: 255 },
        DUSK: { r: 200, g: 100, b: 100 }
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        if (CONFIG.USE_LIGHTS) {
            this.scene.lights.enable();
        }
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
            const isRay = getProp('isRay', false);
            
            const color = parseInt(colorHex.replace('#', '0x'), 16);
            if (obj.x !== undefined && obj.y !== undefined) {
                const light = this.scene.lights.addLight(obj.x, obj.y, radius, color, intensity);
                const lightId = obj.name || `light_${obj.id}`;
                this.lights.set(lightId, light);

                // Volumetric Ray detection via property
                if (isRay || obj.name === "Display Case Light") {
                    const width = getProp('rayWidth', 80);
                    const length = getProp('rayLength', 300);
                    this.createWindowRay(obj.x, obj.y, lightId, width, length);
                }
            }
        });
    }

    private createWindowRay(x: number, y: number, id: string, width: number = 80, length: number = 300) {
        const ray = this.scene.add.graphics();
        ray.setDepth(2000);
        ray.setBlendMode(Phaser.BlendModes.ADD);
        this.rays.set(id, { graphics: ray, baseX: x, baseY: y, width, length });
    }

    public update(gameHour: number) {
        const hour = gameHour;

        // 1. Ambient Light & Global Tone
        const ambientColor = this.calculateAmbientColor(hour);
        this.scene.lights.setAmbientColor(ambientColor);

        // 2. Update Rays (Rotate with Sun)
        // Sun moves from East (right) to West (left)? Or simple rotation.
        // Let's say Noon (12) is vertical (90deg), Dawn (6) is angled right, Dusk (18) is angled left.
        // Angle in radians: 
        // 6h -> -45deg, 12h -> 0deg, 18h -> 45deg
        let angle = 0;
        if (hour >= 6 && hour <= 18) {
            // Map 6..18 to -0.5..0.5 radians (approx)
            const sunProgress = (hour - 6) / 12; // 0..1
            angle = (sunProgress - 0.5) * Math.PI; // -PI/2 to PI/2 (-90 to 90)
        } else {
            // Night: Moon? Keep it faint or neutral
            angle = 0;
        }

        this.rays.forEach((rayData) => {
            this.drawRay(rayData.graphics, rayData.baseX, rayData.baseY, angle, hour, rayData.width, rayData.length);
        });
    }

    private drawRay(graphics: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, hour: number, baseWidth: number = 80, length: number = 300) {
        graphics.clear();
        
        // Intensity based on time (Day only)
        let intensity = 0;
        if (hour > 5 && hour < 19) {
            intensity = 1 - Math.abs(12 - hour) / 7;
            intensity = Phaser.Math.Clamp(intensity, 0, 1);
        }
        if (intensity <= 0) return;

        // Calculate geometry
        // Vector for length
        const dx = Math.sin(angle) * length;
        const dy = Math.cos(angle) * length;
        
        // Tip position
        const tipX = x + dx;
        const tipY = y + dy;

        // Perpendicular vector for width
        // Angle + 90deg
        const perpX = Math.cos(angle);
        const perpY = -Math.sin(angle); // Screen coords Y is down?

        // Base Corners (Narrower)
        const halfBase = baseWidth / 2;
        const bx1 = x - perpX * halfBase;
        const by1 = y - perpY * halfBase;
        const bx2 = x + perpX * halfBase;
        const by2 = y + perpY * halfBase;

        // Tip Corners (Wider - e.g. 2x)
        const tipWidth = baseWidth * 2.5;
        const halfTip = tipWidth / 2;
        const tx1 = tipX - perpX * halfTip;
        const ty1 = tipY - perpY * halfTip;
        const tx2 = tipX + perpX * halfTip;
        const ty2 = tipY + perpY * halfTip;

        // Draw Gradient Trapezoid
        // fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, alphaTL, alphaTR, alphaBL, alphaBR)
        // We map our geometry.
        // Color: Warm Sunlight (0xFFFFDD)
        const color = 0xFFFFDD;
        const startAlpha = 0.4 * intensity;
        const endAlpha = 0.0; // Fade to nothing

        // Using fillGradientStyle for a quad
        // Note: fillGradientStyle fills the path. We must define the path first? 
        // No, fillGradientStyle is for a rect usually?
        // Actually, Phaser Graphics API for gradients on paths is limited.
        // It's often better to use 'fillGradientStyle' on a specific rect, OR simulate it.
        // BUT, we can use `fillPoints` with a color, but Gradient on arbitrary polygon is hard in Phaser Graphics (Canvas).
        // WebGL supports Gouraud shading on vertices if we use `fillGradientStyle` on a RECT or specific shapes.
        
        // ALTERNATIVE: Use a Triangle Fan with alpha?
        // SIMPLEST ROBUST FIX: Use `fillGradientStyle` but since we want a trapezoid...
        // Let's try drawing a textured quad? No, too complex for this tool.
        // Let's use `fillTriangle` or just standard fill with low alpha if gradient is hard on Poly.
        
        // WAIT: Phaser 3 `fillGradientStyle` works on the current path in some versions? No.
        // Only `fillRect` supports it fully in standard docs?
        // Let's check: graphics.fillGradientStyle(...) followed by fillRect, fillTriangle, etc.
        // Actually, for a Beam, a simple `fillStyle` with low alpha is often "Clean" enough if edges are hard.
        // But the user asked for "Light dura degradada" (Hard light, degraded).
        
        // Let's use multiple Rects/Quads with degrading alpha if we can't do smooth gradient?
        // OR: Use `graphics.fillGradientStyle` then `graphics.fillPath`?
        // In Phaser 3, `fillGradientStyle` sets the brush.
        
        // Let's try:
        graphics.fillGradientStyle(color, color, color, color, startAlpha, startAlpha, endAlpha, endAlpha);
        
        // We need to draw a Quad (2 Triangles)
        graphics.beginPath();
        graphics.moveTo(bx1, by1);
        graphics.lineTo(bx2, by2);
        graphics.lineTo(tx2, ty2);
        graphics.lineTo(tx1, ty1);
        graphics.closePath();
        graphics.fillPath();
    }

    private calculateAmbientColor(hour: number): number {
        let c1, c2, t;
        
        // Simple linear phases
        if (hour < 5) { // Night
            return this.colorToInt(this.COLORS.NIGHT);
        } else if (hour < 8) { // Dawn (5-8)
            c1 = this.COLORS.NIGHT; c2 = this.COLORS.DAWN; t = (hour - 5) / 3;
        } else if (hour < 16) { // Day (8-16)
            c1 = this.COLORS.DAWN; c2 = this.COLORS.DAY; t = (hour - 8) / 8;
        } else if (hour < 20) { // Dusk (16-20)
            c1 = this.COLORS.DAY; c2 = this.COLORS.DUSK; t = (hour - 16) / 4;
        } else { // Night (20-24)
            c1 = this.COLORS.DUSK; c2 = this.COLORS.NIGHT; t = (hour - 20) / 4;
        }

        return this.lerpColor(c1, c2, t);
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
