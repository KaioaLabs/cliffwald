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
        lightY: number,
        sunHeight: number = 0.5 // 0.0 (Horizon) to 1.0 (Zenith)
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
        // Deform X based on light angle. 
        // dx is large at Sunrise/Sunset -> Large Skew.
        // dx is small at Noon -> Small Skew.
        // We clamp it to avoid infinite stretching.
        const rawSkew = dx / 400.0; 
        const clampedSkew = Math.max(-1.5, Math.min(1.5, rawSkew));
        
        shadow.setRotation(0); 
        shadow.skewX = -clampedSkew; 

        // 4. Length Projection (Scale Y)
        // Inverse to Sun Height.
        // Zenith (1.0) -> Shortest Shadow (0.3).
        // Horizon (0.0) -> Longest Shadow (1.5).
        const lengthFactor = 1.5 - (sunHeight * 1.2); 
        shadow.setScale(sourceScaleX, sourceScaleY * lengthFactor);

        // 5. Visuals
        // Fade out as sun gets lower (diffuse light) or at night
        // Night (sunHeight < 0) -> Hide? 
        // We assume sunHeight is 0..1 for Day.
        // But LightManager passes night hours too.
        // Let's rely on alpha passed or calculate it?
        // We'll keep simple distance fading for now plus height fading.
        // Shadows are sharpest at Noon, softer at Dawn/Dusk? No, usually opposite.
        // Let's keep alpha consistent but fade if sun is "underground".
        const alpha = Math.max(0.0, Math.min(0.6, sunHeight + 0.2));
        shadow.setAlpha(alpha);
        shadow.setTint(0x000000);
    }
}
