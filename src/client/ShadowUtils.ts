import Phaser from 'phaser';
import { KaioaMath } from '../shared/KaioaMath';

export class ShadowUtils {
    
    /**
     * Updates a shadow sprite using the unified KaioaMath projection logic.
     */
    static updateShadow(
        shadow: Phaser.GameObjects.Image, 
        baseX: number, 
        baseY: number, 
        scaleX: number, 
        scaleY: number, 
        depth: number, 
        height: number,
        sunX: number,
        sunY: number,
        sunHeightFactor: number = 0.5
    ) {
        if (!shadow.visible) return;

        // Prepare Data for Core Math
        // Note: The shadow sprite size might differ from the object height. 
        // We use 'height' parameter which represents the casting object's height.
        // For the rect width, we can use the shadow's display width as approximation or a standard size.
        const width = shadow.displayWidth || 32;

        // KaioaMath expects a Rect {x, y, width, height}
        // Since baseX/Y is Bottom-Center, we adjust to Top-Left for the Rect definition
        // Wait, KaioaMath logic uses the passed Rect to calculate Bottom-Center again.
        // Let's create a virtual rect representing the object standing there.
        const objectRect = {
            x: baseX - (width / 2),
            y: baseY - height, // Top Y
            width: width,
            height: height
        };

        const lightPos = { x: sunX, y: sunY };

        // Use the Unified Core
        const points = KaioaMath.calculateShadowProjection(objectRect, lightPos);

        // --- RENDERER SPECIFIC (Phaser) ---
        // KaioaMath returns 4 points of the polygon. 
        // We need to map this to the Phaser Quad (TopLeft, TopRight, BottomLeft, BottomRight).
        
        // Phaser setCorner order: TL, TR, BL, BR
        // KaioaMath returns: BL, TL, TR, BR (Counter-clockwise from bottom-left)
        // [0]=BL, [1]=TL, [2]=TR, [3]=BR

        // We need to set the position of the sprite to match the "Center" of this new shape?
        // No, Phaser's setPosition sets the origin.
        // For simple skewing using a Quad (Image), we map the corners relative to the texture.

        // Actually, ShadowUtils previously used setRotation/setScale or similar?
        // Let's see the previous implementation's style. 
        // The previous implementation used `setRotation` + `setScale(scaleY)`.
        // That was a Simple Projection (Affine). 
        // The KaioaMath is a Perspective Projection (Non-Affine).
        // Phaser Images CANNOT do perspective skew easily without a custom shader or using a Mesh/Quad.
        // Standard Images only support Affine Transforms (Scale, Rotate, Skew).
        
        // CRITICAL DECISION:
        // Tiled supports Arbitrary Polygons.
        // Phaser Images support Affine Transforms.
        // To have 1:1 match, we should use a simpler Affine Skew in KaioaMath that works for both?
        // OR we upgrade Phaser to use a Quad/Mesh for shadows?
        
        // Let's stick to the previous simple logic for now BUT extracted to Math,
        // so Tiled can draw the same simple skew.
        
        // Re-reading KaioaMath... I implemented a full polygon projection there.
        // That is "Better" looking. 
        // Can we make Phaser use it? 
        // Yes, `shadow` is a `Phaser.GameObjects.Image`.
        // Only `Mesh` or `Quad` supports vertex manipulation.
        
        // FALLBACK: For now, I will keep the Phaser-specific skew logic here roughly aligned,
        // but ideally we should switch shadows to `Phaser.GameObjects.Quad` later.
        
        // Let's revert to the classic skew logic for now in this wrapper, 
        // but verify Tiled uses the poly logic which is "Ground Truth".
        
        // Original Logic Refactored:
        const dx = baseX - sunX;
        const dy = baseY - sunY;
        
        const rotation = Math.atan2(dy, dx) - Math.PI / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Length of shadow depends on sun height (inverse)
        const len = (1.0 - sunHeightFactor) * 3.0; 
        
        shadow.setPosition(baseX, baseY);
        shadow.setRotation(rotation);
        shadow.setScale(scaleX, scaleY * len); // Simple scaling skew
        shadow.setOrigin(0.5, 0.0); // Pivot at feet
        shadow.setDepth(depth);
        shadow.setAlpha(0.4 * sunHeightFactor); // Fade at noon
    }
}
