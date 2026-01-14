import Phaser from 'phaser';

export class ShadowUtils {
    /**
     * Updates an Image-based shadow using Polar Projection.
     * The shadow rotates around the 'feet' of the object based on the light position.
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
        // We anchor deep in the feet so the shadow rotates around the contact point
        // For a 40px sprite, +20% height offset helps realism
        const anchorY = 1.0; 
        shadow.setPosition(sourceX, sourceY);
        shadow.setOrigin(0.5, anchorY);
        shadow.setDepth(sourceDepth - 1);

        // 3. ROTATION (Polar)
        // Shadow points AWAY from light
        const angle = Math.atan2(dy, dx);
        shadow.setRotation(angle + Math.PI / 2); // Adjust for vertical sprite orientation

        // 4. Projection Flattening
        // We stretch based on distance but flatten the Y to look like it's on the ground
        const distFactor = Math.min(1.5, 0.5 + dist / 500);
        shadow.setScale(sourceScaleX, sourceScaleY * 0.5 * distFactor);

        // 5. Visuals
        const alpha = Math.max(0.05, 0.4 - (dist / 1500));
        shadow.setAlpha(alpha);
        shadow.setTint(0x000000);
    }
}