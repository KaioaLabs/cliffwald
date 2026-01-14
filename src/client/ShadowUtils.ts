import Phaser from 'phaser';

export class ShadowUtils {
    /**
     * Updates an Image-based shadow using Skew/Shear deformation.
     * This creates a realistic perspective projection for vertical objects (billboards)
     * in a 2.5D/Isometric world.
     */
    static updateShadow(
        shadow: Phaser.GameObjects.Image,
        sourceX: number,
        sourceY: number,
        sourceScaleX: number,
        sourceScaleY: number,
        sourceDepth: number,
        height: number,
        lightX: number,
        lightY: number
    ) {
        // 1. Vector Light -> Object
        const dx = sourceX - lightX;
        const dy = sourceY - lightY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 2. Position & Anchor (FEET)
        // Keep the shadow anchored at the base of the object
        shadow.setPosition(sourceX, sourceY);
        shadow.setOrigin(0.5, 1.0); 
        shadow.setDepth(sourceDepth - 1);

        // 3. SKEW (Shear) Logic
        // We deform the X-axis of the shadow based on the horizontal angle of the light.
        // This makes the top of the shadow 'lean' away from the light while the base stays put.
        const rawSkew = dx / 300.0; // Divisor softens the angle
        const clampedSkew = Math.max(-1.5, Math.min(1.5, rawSkew));
        
        shadow.setRotation(0); // Ensure no rotation is applied
        shadow.skewX = -clampedSkew; 

        // 4. Length Projection (Scale Y)
        // The lower the light (relative Y) or further away, the longer the shadow.
        // Base scale 0.6 flattens it to the floor.
        const shadowLength = 0.6 + (Math.abs(dy) / 1000.0);
        shadow.setScale(sourceScaleX, sourceScaleY * shadowLength);

        // 5. Visuals
        const alpha = Math.max(0.1, 0.5 - (dist / 1500));
        shadow.setAlpha(alpha);
        shadow.setTint(0x000000);
    }
}
