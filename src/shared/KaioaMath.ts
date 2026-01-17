// KaioaMath.ts - The Pure Math Core of KaioaEngine
// NO IMPORTS FROM PHASER allowed here.
// NO IMPORTS FROM TILED allowed here.

export interface Point { x: number; y: number; }
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Polygon { points: Point[]; }

export class KaioaMath {
    
    /**
     * Calculates the projected shadow polygon for a standing object based on a light source.
     * @param objectBaseRect The bounding box of the object
     * @param lightPos The position of the light source
     * @param skewX Horizontal skew factor (default 0.6)
     * @param skewY Vertical skew factor (default 0.25)
     */
    static calculateShadowProjection(
        objectBaseRect: Rect, 
        lightPos: Point, 
        skewX: number = 0.6,
        skewY: number = 0.25
    ): Point[] {
        
        // Center of the object base
        const worldX = objectBaseRect.x + (objectBaseRect.width / 2);
        const worldY = objectBaseRect.y + objectBaseRect.height; // Bottom

        // Vector Light -> Object
        const dx = worldX - lightPos.x;
        const dy = worldY - lightPos.y;

        // Projection Logic (The Core Formula)
        const sX = dx * skewX; 
        const sY = Math.abs(dy * skewY); 

        const w = objectBaseRect.width;
        const h = objectBaseRect.height; 
        
        // Pivot Points (Base)
        const bl = { x: worldX - w/2, y: worldY };
        const br = { x: worldX + w/2, y: worldY };
        
        // Projected Points (Top)
        const tlX = (worldX - w/2) + sX;
        const tlY = (worldY - h) + sY;
        
        const trX = (worldX + w/2) + sX;
        const trY = (worldY - h) + sY;

        return [
            bl, 
            {x: tlX, y: tlY}, 
            {x: trX, y: trY}, 
            br
        ];
    }

    /**
     * Checks if a point is within a radius.
     * Faster than standard distance check (avoids sqrt for comparison).
     */
    static isWithinRadius(p1: Point, p2: Point, radius: number): boolean {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    /**
     * Interpolates color between two hex values.
     * Pure math version of Phaser.Display.Color.Interpolate
     */
    static lerpColor(color1: number, color2: number, t: number): number {
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;

        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }

    /**
     * Calculates the sun's position based on game hour and map center.
     * Shared logic for Client (LightManager) and Editor (Tiled).
     */
    static calculateSunPosition(
        hour: number, 
        centerX: number, 
        centerY: number, 
        orbitRadius: number = 2500
    ): Point {
        // Hour 6 -> 0 rad (Right/East)
        // Hour 12 -> -PI/2 (Top/Noon)
        const angle = ((hour - 6) / 24) * (Math.PI * 2);
        return {
            x: centerX + Math.cos(angle) * orbitRadius,
            y: centerY + Math.sin(angle) * orbitRadius
        };
    }

    /**
     * Determines the physics collider for a given entity type.
     * @returns collider config object
     */
    static getEntityCollider(type: string): any {
        // Standard Humanoid (Player, NPC, Teacher)
        if (['spawn', 'npc', 'teacher', 'enemy'].some(t => type.toLowerCase().includes(t))) {
            return {
                shape: 'circle',
                radius: 12, // Standard Player Radius
                offsetX: 0,
                offsetY: 0  // Centered on Pivot (Feet)
            };
        }
        
        // Default fallback (Tile size)
        return { shape: 'rect', width: 32, height: 32, offsetX: 0, offsetY: 0 };
    }
}
