import Phaser from 'phaser';

export class ShadowUtils {
    /**
     * Updates an Image-based shadow using Skew/Shear deformation.
     * This ensures the 'feet' or base of the shadow remains aligned with the object (stuck vertices),
     * while the top shears away from the light source. Ideal for wide objects like tables.
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

        // 2. Position & Anchor
        // We anchor at the feet (0.5, 1.0) so the base is the pivot
        shadow.setPosition(sourceX, sourceY);
        shadow.setOrigin(0.5, 1.0);
        shadow.setDepth(sourceDepth - 1);

        // 3. DEFORMATION (SKEW) Logic
        // Instead of rotating, we SKEW the X axis based on the horizontal light angle.
        // A factor of 300.0 dampens the skew so it doesn't stretch to infinity.
        // We clamp it to avoid visual artifacts at extreme angles.
        const rawSkew = dx / 300.0; 
        const clampedSkew = Math.max(-1.5, Math.min(1.5, rawSkew));
        
        shadow.setRotation(0); // Reset rotation (we use Skew instead)
        shadow.skewX = -clampedSkew; // Invert skew to point away from light

        // 4. Length Projection (Scale Y)
        // The further the light, or the lower it is (y-axis), the longer the shadow.
        // We flatten it (0.6 base) to look like it's on the ground.
        const shadowLength = 0.6 + (Math.abs(dy) / 1000.0);
        shadow.setScale(sourceScaleX, sourceScaleY * shadowLength);

        // 5. Visuals
        const alpha = Math.max(0.1, 0.5 - (dist / 1500));
        shadow.setAlpha(alpha);
        shadow.setTint(0x000000);
    }
}
