import Phaser from 'phaser';

export class ShadowUtils {
    /**
     * Updates an Image-based shadow using Skew/Shear to simulate projection.
     * Fallback from Quad due to runtime missing constructor issues.
     * 
     * @param shadow The Image object serving as the shadow.
     * @param sourceX The x position of the caster (feet).
     * @param sourceY The y position of the caster (feet).
     * @param sourceScaleX The scale x of the caster.
     * @param sourceScaleY The scale y of the caster.
     * @param sourceDepth The depth of the caster.
     * @param height The visual height of the caster.
     * @param lightX The x position of the light source.
     * @param lightY The y position of the light source.
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
        // Vector from Light to Object
        const dx = sourceX - lightX;
        const dy = sourceY - lightY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Position: Anchored at feet
        // If the sprite origin is (0.5, 1.0), setting position to sourceX, sourceY is correct.
        shadow.setPosition(sourceX, sourceY);
        shadow.setOrigin(0.5, 1.0); 
        shadow.setDepth(sourceDepth - 1);
        
        // Intensity/Alpha fade
        shadow.setAlpha(Math.max(0.1, 0.6 - (dist / 1000)));

        // SKEW LOGIC
        // We want the shadow to lean away from the light.
        // If light is to the LEFT (negative dx), shadow leans RIGHT (positive skew).
        
        // Skew factor: How much to slant per pixel of height?
        // Proportional to the angle of incidence?
        // Simple approx: dx / height factor
        
        const skewX = (dx / 300) * -1; // Invert? Experimentally check.
        // If light is at 0, obj at 100. dx = 100. Light is left. Shadow should point right.
        // Skew X > 0 leans top to the right? No, Skew X leans the horizontal axis?
        // Phaser setSkewX(rad). 
        
        shadow.skewX = Math.atan2(dx, 300); // Use atan to cap it nicely
        
        // Height (Length of shadow)
        // Dependent on Y distance? Or just general distance?
        // In top down, "Y" is "Depth".
        // If light is "below" (positive Y relative to screen?), shadow goes "up"?
        // Usually top down lights are "above" the ground plane.
        
        // Let's stick to a rotation approach combined with scaleY for length
        // But Skew is better for "grounding".
        
        // Reset rotation to 0 if using Skew
        shadow.setRotation(0);
        
        // Scale Y to simulate length based on how low the light is (distance)
        // Longer shadow if light is far?
        const lengthScale = 1.0 + (dist / 1000);
        shadow.setScale(sourceScaleX, sourceScaleY * lengthScale * 0.5); // Flatten it a bit
        
        // Tint
        shadow.setTint(0x000000);
    }
}
