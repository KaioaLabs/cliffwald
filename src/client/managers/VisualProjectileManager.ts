import Phaser from 'phaser';
import { SPELL_REGISTRY } from '../../shared/items/SpellRegistry';

export class VisualProjectileManager {
    private scene: Phaser.Scene;
    private projectiles = new Map<string, Phaser.GameObjects.Shape>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public createProjectileSprite(data: any, creationTime?: number): Phaser.GameObjects.Shape {
        let projectile: Phaser.GameObjects.Shape;
        const angle = Math.atan2(data.vy, data.vx);
        
        let config = SPELL_REGISTRY['circle']; 
        for (const key in SPELL_REGISTRY) {
            if (data.spellId.includes(key)) {
                config = SPELL_REGISTRY[key];
                break;
            }
        }

        const color = config.color;
        if (config.shape === 'triangle') {
            projectile = this.scene.add.triangle(data.x, data.y, -7, -10, 13, 0, -7, 10, color);
        } else if (config.shape === 'square') {
            projectile = this.scene.add.rectangle(data.x, data.y, 16, 16, color);
        } else {
            projectile = this.scene.add.circle(data.x, data.y, 8, color);
        }

        projectile.setStrokeStyle(2, 0xffffff);
        projectile.setDepth(2000);
        projectile.setRotation(angle);
        
        if (config.shape !== 'circle') {
            this.scene.tweens.add({
                targets: projectile,
                rotation: angle + Math.PI * 4,
                duration: 2000,
                repeat: -1
            });
        }

        const now = Date.now();
        const timestamp = creationTime || now; 
        const age = now - timestamp;

        if (age < 1000) { 
            const audioKey = `audio_${config.shape}`; 
            if (this.scene.sound.get(audioKey) || this.scene.cache.audio.exists(audioKey)) {
                this.scene.sound.play(audioKey);
            }
        } 

        return projectile;
    }

    public addNetworkProjectile(id: string, data: any) {
        if (this.projectiles.has(id)) return;
        const visual = this.createProjectileSprite(data, data.creationTime);
        this.projectiles.set(id, visual);
    }

    public removeNetworkProjectile(id: string) {
        const visual = this.projectiles.get(id);
        if (visual) {
            visual.destroy();
            this.projectiles.delete(id);
        }
    }

    public clear() {
        this.projectiles.forEach(p => p.destroy());
        this.projectiles.clear();
    }
}
