import Phaser from 'phaser';
import { CONFIG, getGameTime } from '../shared/Config';
import { THEME } from '../shared/Theme';
import { PlayerInput, PositionUpdate } from '../shared/types/NetworkTypes';
import RAPIER from '@dimforge/rapier2d-compat';
import { createWorld, ECSWorld } from '../shared/ecs/world';
import { Entity } from '../shared/ecs/components';
import { ShadowUtils } from './ShadowUtils';
import { ClientEntity } from './types/ClientEntity';

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

    private isInDorm(x: number, y: number): boolean {
        // Broad bounds for the 3 dorm rooms in the Left Wing
        if (x < 500 || x > 750) return false;
        
        // Ignis (Top), Axiom (Mid), Vesper (Bot)
        const inIgnis = y > 400 && y < 650;
        const inAxiom = y > 1050 && y < 1250;
        const inVesper = y > 1700 && y < 1900;
        
        return inIgnis || inAxiom || inVesper;
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
        const isPrefect = displayName.includes("Prefect");
        let prefectLight: Phaser.GameObjects.Light | undefined;

        if (isPrefect) {
            sprite.setTint(THEME.HOUSES.PREFECT);
            // Optional: Scale up slightly? Prefects are intimidating.
            sprite.setScale(CONFIG.PLAYER_SCALE * 1.1);
            
            // DYNAMIC LIGHT
            if (CONFIG.USE_LIGHTS) {
                prefectLight = this.scene.lights.addLight(x, y, 150, THEME.HOUSES.PREFECT, 2.0);
            }
        } else if (isEcho) {
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

        const classTimerText = this.scene.add.text(x, y - 40, '', {
            fontSize: '12px',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

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
        entity.classTimerText = classTimerText;
        entity.prefectLight = prefectLight;
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

    private setupLocalPhysics(entity: ClientEntity, x: number, y: number) {
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y)
            .setLinearDamping(10.0)
            .lockRotations();
        entity.body = this.physicsWorld!.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        entity.collider = this.physicsWorld!.createCollider(colliderDesc, entity.body);
    }

    public setNoclip(sessionId: string, enabled: boolean) {
        const entity = this.players.get(sessionId);
        if (entity && entity.collider) {
            entity.collider.setSensor(enabled);
            console.log(`[PHYSICS] Noclip ${enabled ? 'ENABLED' : 'DISABLED'} for ${sessionId}`);
        }
    }

    removePlayer(sessionId: string) {
        const entity = this.players.get(sessionId);
        if (entity) {
            if (entity.visual?.sprite) entity.visual.sprite.destroy();
            if (entity.shadow) entity.shadow.destroy();
            if (entity.nameTag) entity.nameTag.destroy();
            if (entity.prefectLight) entity.prefectLight.destroy(); // CLEANUP
            
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

    updatePlayerState(sessionId: string, data: PositionUpdate, unconsciousUntil: number = 0) {
        const entity = this.players.get(sessionId);
        if (entity) {
            entity.serverPos = { x: data.x, y: data.y };
            entity.unconsciousUntil = unconsciousUntil;
            
            const buffer = entity.positionBuffer;
            if (buffer) {
                buffer.push({ x: data.x, y: data.y, timestamp: Date.now() });
                if (buffer.length > 10) buffer.shift();
            }
            
            // Server Reconciliation for Local
            if (entity.isLocal && entity.body) {
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

    updateClassStatus(sessionId: string, isAttending: boolean, endsAt: number) {
        const entity = this.players.get(sessionId);
        if (!entity || !entity.visual?.sprite) return;

        if (isAttending) {
            if (!entity.classTimerText) {
                entity.classTimerText = this.scene.add.text(entity.visual.sprite.x, entity.visual.sprite.y - 60, "", {
                    fontSize: '12px',
                    color: '#FFFF00',
                    stroke: '#000000',
                    strokeThickness: 3,
                    align: 'center'
                }).setOrigin(0.5).setDepth(10000); // High depth to show over everything
            }
            entity.classTimerText.setVisible(true);
            entity.classTimerText.setData('endsAt', endsAt);
        } else {
            if (entity.classTimerText) {
                entity.classTimerText.setVisible(false);
            }
        }
    }

    public performJump(sessionId: string) {
        const entity = this.players.get(sessionId);
        if (!entity || !entity.visual?.sprite) return;

        const sprite = entity.visual.sprite as Phaser.GameObjects.Sprite;
        const dir = entity.lastDir || 'down';
        
        // 1. Play Animation
        const isTeacher = sprite.getData('isTeacher');
        // Teachers don't have jump sprites yet, ignore or just tween
        if (!isTeacher) {
            const animKey = `jump-${dir}`;
            if (sprite.anims.exists(animKey)) {
                sprite.play(animKey, true);
                // Lock animation for duration of jump
                sprite.setData('isJumping', true);
                sprite.once('animationcomplete', () => {
                    sprite.setData('isJumping', false);
                });
            }
        }

        // 2. Vertical Tween (Visual Height)
        // We move the sprite Y up and down, but we need to account for the shadow staying on the ground.
        // The shadow logic tracks sprite.x/y. If we move sprite.y, shadow will follow "up", which looks like floating.
        // We need to offset the SHADOW calculation or the sprite rendering?
        // Actually, ShadowUtils usually takes sprite.y.
        // Let's tween the "displayOriginY" or just Y with a container? 
        // Simpler: Tween Y, but tell ShadowUtils to use "groundY" stored separately?
        // Or just let the shadow jump a bit too? No, shadow should stay or shrink.
        
        // Quick Hack: Just tween Y. The shadow following looks slightly weird (peter pan) but acceptable for 2D arcade.
        // Better: PlayerController 'updateVisuals' constantly sets sprite position from server/interpolation.
        // If we tween sprite.y, 'updateVisuals' will overwrite it next frame!
        
        // SOLUTION: Add a 'visualOffset' to ClientEntity
        entity.visualOffset = { x: 0, y: 0 };
        
        this.scene.tweens.add({
            targets: entity.visualOffset,
            y: -15, // Jump height
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                // Force update to apply offset immediately if needed, 
                // but main loop handles it naturally.
            },
            onComplete: () => {
                entity.visualOffset = { x: 0, y: 0 };
            }
        });
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

            const dx = targetX - sprite.x; // Delta for animation before offset
            const dy = targetY - sprite.y;
            
            // APPLY POSITION + VISUAL OFFSET (JUMP + CLIMB)
            const offsetX = entity.visualOffset?.x || 0;
            const offsetY = (entity.visualOffset?.y || 0) + (entity.climbOffset || 0);
            
            const lerp = isLocal ? CONFIG.LERP_FACTOR_LOCAL : CONFIG.LERP_FACTOR_REMOTE;
            const smoothedX = Phaser.Math.Linear(sprite.x - offsetX, targetX, lerp); // Lerp base pos
            const smoothedY = Phaser.Math.Linear(sprite.y - offsetY, targetY, lerp); // Lerp base pos (offset applied after?)
            
            // Wait, previous logic was:
            // sprite.setPosition(smoothedX + offsetX, smoothedY + offsetY);
            // This applies interpolation to the "base" position, then adds the offset. Correct.
            
            // Re-calc with climb
            sprite.setPosition(smoothedX + offsetX, smoothedY + offsetY);
            sprite.setDepth(smoothedY + 100); // Sort by FEET (base Y)

            // Shadow Logic
            const shadow = entity.shadow;
            if (shadow) {
                // Use Global Sun Position
                const gameScene = this.scene as any;
                const sunPos = gameScene.lightManager?.getSunPosition() || { x: 0, y: 0 };
                
                shadow.setTexture(sprite.texture.key, sprite.frame.name);
                shadow.setVisible(sprite.visible);
                
                let shadowY = smoothedY; // Use BASE Y for shadow
                if (sprite.getData('isTeacher')) {
                    shadowY -= (sprite.displayHeight || 64) * 0.15;
                }

                // Scale shadow for Jump (visualOffset) but NOT for Climb
                const jumpY = entity.visualOffset?.y || 0;
                
                const jumpScale = 1.0 + (jumpY / 30); 
                const baseScaleX = sprite.scaleX * Math.max(0.5, jumpScale);
                const baseScaleY = sprite.scaleY * Math.max(0.5, jumpScale);

                ShadowUtils.updateShadow(
                    shadow, 
                    smoothedX, 
                    shadowY, 
                    baseScaleX, 
                    baseScaleY, 
                    sprite.depth, 
                    sprite.displayHeight || 40, 
                    sunPos.x, 
                    sunPos.y
                );
            }

            if (entity.nameTag) entity.nameTag.setPosition(sprite.x, sprite.y + CONFIG.NAME_TAG_Y_OFFSET).setDepth(sprite.y + 100);

            if (entity.prefectLight) {
                entity.prefectLight.setPosition(sprite.x, sprite.y);
            }

            // Update Class Timer
            if (entity.classTimerText && entity.classTimerText.visible) {
                entity.classTimerText.setPosition(sprite.x, sprite.y - 60);
                const endsAt = entity.classTimerText.getData('endsAt');
                if (endsAt) {
                    const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
                    const mins = Math.floor(remaining / 60);
                    const secs = remaining % 60;
                    entity.classTimerText.setText(`IN CLASS\n${mins}:${secs.toString().padStart(2, '0')}`);
                }
            }

            // Handle Unconscious State
            if (entity.unconsciousUntil && entity.unconsciousUntil > now) {
                sprite.setRotation(Math.PI / 2); // 90 degrees
                sprite.setOrigin(0.5, 0.5); // Center pivot for rotation
            } else {
                sprite.setRotation(0);
                sprite.setOrigin(0.5, 0.75); // Restore original pivot
            }

            this.handleAnimation(entity, dx, dy);
        }
    }

    private handleAnimation(entity: ClientEntity, dx: number, dy: number) {
        const sprite = entity.visual?.sprite;
        if (!sprite) return;
        
        // Don't override jump animation
        if (sprite.getData('isJumping')) return;

        const isLocal = entity.isLocal;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        let anim = 'idle', dir = entity.lastDir || 'down', targetDx = dx, targetDy = dy, shouldUpdate = false;
        
        // --- SLEEP LOGIC (Visual Freeze) ---
        const isTeacher = sprite.getData('isTeacher');
        const isPrefect = entity.prefectLight !== undefined;
        
        if (!isTeacher && !isPrefect) {
            // Check moving
            if (velocity > 0.1 || (isLocal && (entity.input?.left || entity.input?.right || entity.input?.up || entity.input?.down))) {
                sprite.setData('isSleepingVisual', false);
            } else {
                // Check Environment (Night + Dorm)
                const { isNight } = getGameTime(Date.now());
                if (isNight && this.isInDorm(sprite.x, sprite.y)) {
                    if (!sprite.getData('isSleepingVisual')) {
                        // Enter Sleep Mode: Freeze on random "lying down" frame
                        sprite.stop();
                        
                        // Frames: 0(D), 4(DR), 8(R), 12(UR), 16(U)
                        const frames = [0, 4, 8, 12, 16];
                        const randomFrame = frames[Math.floor(Math.random() * frames.length)];
                        const randomFlip = Math.random() > 0.5;
                        
                        sprite.setFrame(randomFrame);
                        sprite.setFlipX(randomFlip);
                        
                        sprite.setData('isSleepingVisual', true);
                    }
                    return; // SKIP NORMAL ANIMATION
                } else {
                    sprite.setData('isSleepingVisual', false);
                }
            }
        }

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

        const prefix = isTeacher ? 'teacher_' : '';
        const key = `${prefix}${anim}-${dir}`;
        if (sprite.anims.currentAnim?.key !== key) sprite.play(key, true);
    }
}