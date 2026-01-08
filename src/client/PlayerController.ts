import Phaser from 'phaser';
import { CONFIG } from '../shared/Config';
import { THEME } from '../shared/Theme';
import { PlayerInput, PositionUpdate } from '../shared/types/NetworkTypes';
import RAPIER from '@dimforge/rapier2d-compat';
import { createWorld, ECSWorld } from '../shared/ecs/world';
import { Entity } from '../shared/ecs/components';
import { ShadowUtils } from './ShadowUtils';

// Extended Entity type for Client-side only properties
type ClientEntity = Entity & {
    shadow?: Phaser.GameObjects.Image;
    nameTag?: Phaser.GameObjects.Text;
    isLocal?: boolean;
    lastDir?: string;
    positionBuffer?: { x: number, y: number, timestamp: number }[];
    lastMoveTime?: number;
    serverPos?: { x: number, y: number };
};

export class PlayerController {
    scene: Phaser.Scene;
    physicsWorld?: RAPIER.World;
    public world: ECSWorld; 
    players: Map<string, ClientEntity> = new Map();

    constructor(scene: Phaser.Scene, physicsWorld?: RAPIER.World) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.world = createWorld();
    }

    addPlayer(sessionId: string, x: number, y: number, isLocal: boolean = false, skin: string = "player_idle", username: string = "", house: string = "ignis") {
        if (this.players.has(sessionId)) {
            this.removePlayer(sessionId);
        }

        const displayName = username || sessionId.slice(0, 4);
        
        // Shadow as Image (Fallback)
        const shadow = this.scene.add.image(x, y, 'player_idle');
        shadow.setTint(0x000000);
        shadow.setAlpha(0.3);
        // Image uses setOrigin in ShadowUtils
        
        const sprite = this.scene.add.sprite(x, y, 'player_idle', 0);
        if (CONFIG.USE_LIGHTS) sprite.setPipeline('Light2D'); 
        sprite.setOrigin(0.5, 0.75); 
        sprite.setScale(CONFIG.PLAYER_SCALE);
        
        const isEcho = displayName.toLowerCase().includes("student") || displayName.startsWith("Echo of");
        if (isEcho) {
            sprite.setAlpha(0.6);
            const echoTints: Record<string, number> = { 'ignis': THEME.HOUSES.IGNIS, 'axiom': THEME.HOUSES.AXIOM, 'vesper': THEME.HOUSES.VESPER };
            sprite.setTint(echoTints[house] || THEME.HOUSES.DEFAULT);
        } else if (skin === "player_red") {
            sprite.setTint(THEME.HOUSES.IGNIS);
        } else if (skin === "player_blue") {
            sprite.setTint(THEME.HOUSES.AXIOM);
        } else if (skin === "teacher") {
            sprite.setTexture('teacher_idle');
            sprite.setOrigin(0.5, 0.9);
            sprite.setData('isTeacher', true);
            const tints = THEME.TEACHERS;
            sprite.setTint(tints[Math.floor(Math.random() * tints.length)]);
        }

        const nameTag = this.scene.add.text(x, y + CONFIG.NAME_TAG_Y_OFFSET, displayName, {
            fontSize: '10px',
            color: THEME.UI.TEXT_WHITE,
            stroke: THEME.UI.TEXT_STROKE,
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);

        console.log(`[CLIENT] Adding Player Sprite: ${displayName} (Local: ${isLocal})`);

        // 2. Create ECS Entity
        const entity = this.world.add({
            player: { sessionId },
            visual: { sprite },
            input: { left: false, right: false, up: false, down: false },
            facing: { x: 0, y: 1 }
        }) as ClientEntity;

        // Store extra visual data on the entity (managed state)
        entity.shadow = shadow;
        entity.nameTag = nameTag;
        entity.isLocal = isLocal;
        entity.lastDir = 'down';
        entity.positionBuffer = [];
        entity.lastMoveTime = 0;
        entity.serverPos = { x, y };

        if (isLocal && this.physicsWorld) {
            this.setupLocalPhysics(entity, x, y);
        }

        this.players.set(sessionId, entity);
        return sprite;
    }

    private setupLocalPhysics(entity: Entity, x: number, y: number) {
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y)
            .setLinearDamping(10.0)
            .lockRotations();
        entity.body = this.physicsWorld!.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld!.createCollider(colliderDesc, entity.body);
    }

    removePlayer(sessionId: string) {
        const entity = this.players.get(sessionId);
        if (entity) {
            if (entity.visual?.sprite) entity.visual.sprite.destroy();
            if ((entity as any).shadow) (entity as any).shadow.destroy();
            if ((entity as any).nameTag) (entity as any).nameTag.destroy();
            
            if (entity.body && this.physicsWorld) {
                this.physicsWorld.removeRigidBody(entity.body);
            }
            
            this.world.remove(entity);
            this.players.delete(sessionId);
        }
    }

    applyInput(sessionId: string, input: PlayerInput) {
        const entity = this.players.get(sessionId);
        if (entity && entity.input) {
            Object.assign(entity.input, input);
        }
    }

    updatePlayerState(sessionId: string, data: PositionUpdate) {
        const entity = this.players.get(sessionId);
        if (entity) {
            (entity as any).serverPos = { x: data.x, y: data.y };
            const buffer = (entity as any).positionBuffer;
            if (buffer) {
                buffer.push({ x: data.x, y: data.y, timestamp: Date.now() });
                if (buffer.length > 10) buffer.shift();
            }
            
            // Server Reconciliation for Local
            if ((entity as any).isLocal && entity.body) {
                const localPos = entity.body.translation();
                const dist = Phaser.Math.Distance.Between(localPos.x, localPos.y, data.x, data.y);
                if (dist > 20) entity.body.setTranslation({ x: data.x, y: data.y }, true);
                else if (dist > 2) {
                    entity.body.setTranslation({
                        x: Phaser.Math.Linear(localPos.x, data.x, 0.2),
                        y: Phaser.Math.Linear(localPos.y, data.y, 0.2)
                    }, true);
                }
            }
        }
    }

    getPosition(sessionId: string): Phaser.Math.Vector2 | null {
        const entity = this.players.get(sessionId);
        if (entity?.visual?.sprite) return new Phaser.Math.Vector2(entity.visual.sprite.x, entity.visual.sprite.y);
        return null;
    }

    updateVisuals() {
        const now = Date.now();
        const renderTime = now - CONFIG.RENDER_DELAY;

        for (const e of this.world.with("visual", "player")) {
            const entity = e as ClientEntity;
            const sprite = entity.visual!.sprite as Phaser.GameObjects.Sprite;
            const isLocal = entity.isLocal;
            
            let targetX = sprite.x;
            let targetY = sprite.y;

            if (isLocal && entity.body) {
                const pos = entity.body.translation();
                targetX = pos.x; targetY = pos.y;
            } else {
                const buffer = entity.positionBuffer;
                if (buffer?.length && buffer.length >= 2) {
                    while (buffer.length > 2 && buffer[1].timestamp <= renderTime) buffer.shift();
                    if (buffer[1].timestamp > renderTime) {
                        const t0 = buffer[0], t1 = buffer[1];
                        const total = t1.timestamp - t0.timestamp;
                        const factor = total > 0 ? (renderTime - t0.timestamp) / total : 0;
                        targetX = Phaser.Math.Linear(t0.x, t1.x, factor);
                        targetY = Phaser.Math.Linear(t0.y, t1.y, factor);
                    }
                } else {
                    const sPos = entity.serverPos || { x: sprite.x, y: sprite.y };
                    targetX = Phaser.Math.Linear(sprite.x, sPos.x, CONFIG.INTERPOLATION_FACTOR);
                    targetY = Phaser.Math.Linear(sprite.y, sPos.y, CONFIG.INTERPOLATION_FACTOR);
                }
            }

            const dx = targetX - sprite.x;
            const dy = targetY - sprite.y;
            const lerp = isLocal ? CONFIG.LERP_FACTOR_LOCAL : CONFIG.LERP_FACTOR_REMOTE;
            
            sprite.setPosition(Phaser.Math.Linear(sprite.x, targetX, lerp), Phaser.Math.Linear(sprite.y, targetY, lerp));
            sprite.setDepth(sprite.y + 100);

            // Shadow Logic
            const shadow = entity.shadow;
            if (shadow) {
                const worldPoint = this.scene.cameras.main.getWorldPoint(this.scene.input.activePointer.x, this.scene.input.activePointer.y);
                
                // Update shadow texture to match player animation
                shadow.setTexture(sprite.texture.key, sprite.frame.name);
                shadow.setVisible(sprite.visible);
                // Note: Flipping logic for Quad UVs is complex, skipping for now as shadow is black.
                
                let shadowY = sprite.y;
                if (sprite.getData('isTeacher')) {
                    shadowY -= (sprite.displayHeight || 64) * 0.15;
                }

                ShadowUtils.updateShadow(shadow, sprite.x, shadowY, sprite.scaleX, sprite.scaleY, sprite.depth, sprite.displayHeight || 40, worldPoint.x, worldPoint.y);
            }

            if (entity.nameTag) entity.nameTag.setPosition(sprite.x, sprite.y + CONFIG.NAME_TAG_Y_OFFSET).setDepth(sprite.y + 100);

            this.handleAnimation(entity, dx, dy);
        }
    }

    private handleAnimation(entity: ClientEntity, dx: number, dy: number) {
        const sprite = entity.visual?.sprite;
        if (!sprite) return;

        const isLocal = entity.isLocal;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        let anim = 'idle', dir = entity.lastDir || 'down', targetDx = dx, targetDy = dy, shouldUpdate = false;

        if (isLocal && entity.input) {
            const isMoving = entity.input.left || entity.input.right || entity.input.up || entity.input.down;
            if (isMoving) {
                anim = 'run'; shouldUpdate = true;
                targetDx = (entity.input.left ? -1 : 0) + (entity.input.right ? 1 : 0);
                targetDy = (entity.input.up ? -1 : 0) + (entity.input.down ? 1 : 0);
            }
        } else if (velocity > 0.1) {
            anim = 'run'; shouldUpdate = true;
            entity.lastMoveTime = Date.now();
        } else if (Date.now() - (entity.lastMoveTime || 0) < 100) {
            anim = 'run';
        }

        if (shouldUpdate) {
            const angle = Math.atan2(targetDy, targetDx) * 180 / Math.PI;
            sprite.setFlipX(false);
            if (angle >= 67.5 && angle < 112.5) dir = 'down';
            else if (angle >= 22.5 && angle < 67.5) dir = 'down-right';
            else if (angle >= -22.5 && angle < 22.5) dir = 'right';
            else if (angle >= -67.5 && angle < -22.5) dir = 'up-right';
            else if (angle >= -112.5 && angle < -67.5) dir = 'up';
            else if (angle >= -157.5 && angle < -112.5) { dir = 'up-right'; sprite.setFlipX(true); }
            else if (angle >= 112.5 && angle < 157.5) { dir = 'down-right'; sprite.setFlipX(true); }
            else { dir = 'right'; sprite.setFlipX(true); }
            entity.lastDir = dir;
        }

        const isTeacher = sprite.getData('isTeacher');
        const prefix = isTeacher ? 'teacher_' : '';
        const key = `${prefix}${anim}-${dir}`;
        if (sprite.anims.currentAnim?.key !== key) sprite.play(key, true);
    }
}
