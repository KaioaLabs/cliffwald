import Phaser from 'phaser';

export class ShadowUtils {
    /**
     * Updates a generic shadow sprite to project from a source object away from a light source (pointer).
     * Uses a 360-degree polar projection anchored deeply at the feet/base.
     * 
     * @param shadow The shadow sprite to update.
     * @param sourceX The x position of the caster.
     * @param sourceY The y position of the caster.
     * @param sourceScaleX The scale x of the caster.
     * @param sourceScaleY The scale y of the caster.
     * @param sourceDepth The depth of the caster.
     * @param height The visual height of the caster (for anchor calculation).
     * @param lightX The x position of the light source.
     * @param lightY The y position of the light source.
     */
    static updateShadow(
        shadow: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
        sourceX: number,
        sourceY: number,
        sourceScaleX: number,
        sourceScaleY: number,
        sourceDepth: number,
        height: number,
        lightX: number,
        lightY: number
    ) {
        // 1. Calculate Anchor (Deep Base)
        // We anchor at +20% of height relative to position to simulate "heels" or center of base.
        // This prevents the shadow from disconnecting when rotating.
        const footX = sourceX;
        const footY = sourceY + (height * 0.20); 

        // 2. Vector from Light to Object
        const dx = footX - lightX;
        const dy = footY - lightY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 3. Apply Transform
        shadow.setPosition(footX, footY);
        shadow.setOrigin(0.5, 1.0); // Pivot at bottom
        
        // Rotate: Point away from light. 
        // +PI/2 correction assuming sprite is Up-oriented (0 deg = Right).
        shadow.setRotation(angle + Math.PI / 2);
        
        // Stretch: Longer shadow when further from light
        // Cap stretch to avoid infinite long shadows
        const shadowStretch = Math.min(dist / 200, 2.0);
        
        // Scale: Maintain aspect ratio of source, stretch Y
        shadow.setScale(sourceScaleX, sourceScaleY * shadowStretch);
        
        // Fade: Disappear when far from light
        shadow.setAlpha(Math.max(0.1, 0.5 - (dist / 1200)));
        
        // Depth: Always below caster
        shadow.setDepth(sourceDepth - 1);
    }
}
