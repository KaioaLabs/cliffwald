import Phaser from 'phaser';
import { CONFIG } from '../shared/Config';
import RAPIER from '@dimforge/rapier2d-compat';
import { world } from '../shared/ecs/world';
import { Entity } from '../shared/ecs/components';

export class PlayerController {
    scene: Phaser.Scene;
    physicsWorld?: RAPIER.World;
    entities: Map<string, Phaser.GameObjects.Sprite> = new Map();
    ecsEntities: Map<string, Entity> = new Map();

    constructor(scene: Phaser.Scene, physicsWorld?: RAPIER.World) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    addPlayer(sessionId: string, x: number, y: number, isLocal: boolean = false) {
        // 1. Create Sprite using the idle spritesheet initially
        const sprite = this.scene.add.sprite(x, y, 'player_idle', 0);
        sprite.setOrigin(0.5, 0.75); // Pivot at feet for better depth sorting
        sprite.setScale(CONFIG.PLAYER_SCALE);
        
        // 2. Visual Styling
        if (!isLocal) {
            sprite.setTint(Phaser.Display.Color.RandomRGB().color);
        } else {
            // No tint for local player - show original sprite colors
            sprite.clearTint();
        }

        // 3. Name Tag
        const nameTag = this.scene.add.text(x, y + CONFIG.NAME_TAG_Y_OFFSET, sessionId.slice(0, 4), {
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        sprite.setData('nameTag', nameTag);

        // 4. Data Binding
        sprite.setData('serverX', x);
        sprite.setData('serverY', y);
        sprite.setData('lastDir', 'down');
        sprite.setData('isLocal', isLocal);
        sprite.setData('positionBuffer', []);
        sprite.setData('lastMoveTime', 0); // Initialize debounce timer

        this.entities.set(sessionId, sprite);

        // 5. ECS / Physics Setup (Local Prediction)
        if (isLocal && this.physicsWorld) {
            this.createLocalPhysics(sessionId, x, y);
        }

        return sprite;
    }

    private createLocalPhysics(sessionId: string, x: number, y: number) {
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(x, y);
        const body = this.physicsWorld!.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.ball(CONFIG.PLAYER_RADIUS);
        this.physicsWorld!.createCollider(colliderDesc, body);

        const ecsEntity = world.add({
            id: sessionId,
            body: body,
            input: { left: false, right: false, up: false, down: false }
        });
        this.ecsEntities.set(sessionId, ecsEntity);
    }

    removePlayer(sessionId: string) {
        const sprite = this.entities.get(sessionId);
        if (sprite) {
            const nameTag = sprite.getData('nameTag');
            if (nameTag) nameTag.destroy();
            sprite.destroy();
            this.entities.delete(sessionId);
        }

        const ecsEntity = this.ecsEntities.get(sessionId);
        if (ecsEntity) {
            if (ecsEntity.body && this.physicsWorld) {
                this.physicsWorld.removeRigidBody(ecsEntity.body);
            }
            world.remove(ecsEntity);
            this.ecsEntities.delete(sessionId);
        }
    }

    applyInput(sessionId: string, input: any) {
        const ecsEntity = this.ecsEntities.get(sessionId);
        if (ecsEntity && ecsEntity.input) {
            ecsEntity.input.left = input.left;
            ecsEntity.input.right = input.right;
            ecsEntity.input.up = input.up;
            ecsEntity.input.down = input.down;
        }
    }

    updatePlayerState(sessionId: string, x: number, y: number) {
        const sprite = this.entities.get(sessionId);
        if (sprite) {
            sprite.setData('serverX', x);
            sprite.setData('serverY', y);
            
            const buffer = sprite.getData('positionBuffer');
            if (buffer) {
                buffer.push({ x, y, timestamp: Date.now() });
                if (buffer.length > 10) buffer.shift();
            }
            
            // Server Reconciliation for Local Player
            if (sprite.getData('isLocal')) {
                const ecsEntity = this.ecsEntities.get(sessionId);
                if (ecsEntity && ecsEntity.body) {
                    const localPos = ecsEntity.body.translation();
                    const dist = Phaser.Math.Distance.Between(localPos.x, localPos.y, x, y);
                    
                    // Soft Correction:
                    // If drift is tiny (< 2px), ignore server (Client authority for micro-movements to prevent jitter).
                    // If drift is small (> 2px), nudge gently.
                    // If drift is large (> 50px), teleport.
                    
                    if (dist > 50) {
                        console.log("Reconciling large drift:", dist);
                        ecsEntity.body.setTranslation({ x, y }, true);
                    } else if (dist > 2) { 
                        // Only correct if drift is noticeable (> 2 pixels)
                        // This prevents the "snap back" when stopping
                        const lerpX = Phaser.Math.Linear(localPos.x, x, 0.1);
                        const lerpY = Phaser.Math.Linear(localPos.y, y, 0.1);
                        ecsEntity.body.setTranslation({ x: lerpX, y: lerpY }, true);
                    }
                }
            }
        }
    }

    // Called every frame
    updateVisuals() {
        const RENDER_DELAY = 150; // Increased to 150ms (3 server ticks at 20fps) to prevent buffer starvation
        const now = Date.now();
        const renderTime = now - RENDER_DELAY;

        this.entities.forEach((sprite, sessionId) => {
            const isLocal = sprite.getData('isLocal');
            let newX = sprite.x;
            let newY = sprite.y;

            if (isLocal) {
                // Prediction
                const ecsEntity = this.ecsEntities.get(sessionId);
                if (ecsEntity && ecsEntity.body) {
                    const pos = ecsEntity.body.translation();
                    newX = pos.x;
                    newY = pos.y;
                }
            } else {
                // Snapshot Interpolation
                const buffer = sprite.getData('positionBuffer');
                
                if (buffer && buffer.length >= 2) {
                    // Prune old (keep at least 2 for extrapolation if needed)
                    while (buffer.length > 2 && buffer[1].timestamp <= renderTime) {
                        buffer.shift();
                    }

                    // Interpolate
                    if (buffer.length >= 2 && buffer[0].timestamp <= renderTime && renderTime <= buffer[1].timestamp) {
                        const t0 = buffer[0];
                        const t1 = buffer[1];
                        const total = t1.timestamp - t0.timestamp;
                        const elapsed = renderTime - t0.timestamp;
                        const factor = total > 0 ? elapsed / total : 0;
                        
                        newX = Phaser.Math.Linear(t0.x, t1.x, factor);
                        newY = Phaser.Math.Linear(t0.y, t1.y, factor);
                    } 
                    // Extrapolate (if we ran out of future snapshots)
                    else if (buffer.length >= 2 && renderTime > buffer[1].timestamp) {
                        const t0 = buffer[buffer.length - 2];
                        const t1 = buffer[buffer.length - 1];
                        const total = t1.timestamp - t0.timestamp;
                        
                        // Only extrapolate if we have a valid time delta
                        if (total > 0) {
                            const velocityX = (t1.x - t0.x) / total;
                            const velocityY = (t1.y - t0.y) / total;
                            const extrapolationTime = renderTime - t1.timestamp;
                            
                            // Limit extrapolation to 150ms and apply decay
                            // Decay ensures we don't overshoot wildly if the player actually stopped
                            if (extrapolationTime < 150) {
                                const decay = Math.max(0, 1 - (extrapolationTime / 100)); // Slow down to stop over 100ms
                                newX = t1.x + velocityX * extrapolationTime * decay;
                                newY = t1.y + velocityY * extrapolationTime * decay;
                            } else {
                                newX = t1.x;
                                newY = t1.y;
                            }
                        }
                    }
                } else if (buffer && buffer.length === 1) {
                     newX = buffer[0].x;
                     newY = buffer[0].y;
                } else {
                    // Fallback to simple lerp if buffer empty (startup)
                    const serverX = sprite.getData('serverX');
                    const serverY = sprite.getData('serverY');
                    const t = CONFIG.INTERPOLATION_FACTOR;
                    newX = Phaser.Math.Linear(sprite.x, serverX, t);
                    newY = Phaser.Math.Linear(sprite.y, serverY, t);
                }
            }

            const dx = newX - sprite.x;
            const dy = newY - sprite.y;

            // Final Visual Smoothing: Instead of snapping to newX/newY, 
            // we lerp gently to the target to absorb micro-jitter.
            const lerpFactor = isLocal ? 1.0 : 0.25; // Local is instant (prediction), Remote is smoothed
            const finalX = Phaser.Math.Linear(sprite.x, newX, lerpFactor);
            const finalY = Phaser.Math.Linear(sprite.y, newY, lerpFactor);

            sprite.setPosition(finalX, finalY);
            sprite.setDepth(finalY); // Y-Sorting

            const nameTag = sprite.getData('nameTag');
            if (nameTag) {
                nameTag.setPosition(finalX, finalY + CONFIG.NAME_TAG_Y_OFFSET);
                nameTag.setDepth(finalY + 100);
            }

            this.handleAnimation(sprite, dx, dy, sessionId);
        });
    }

    private handleAnimation(entity: Phaser.GameObjects.Sprite, dx: number, dy: number, sessionId?: string) {
        const isLocal = entity.getData('isLocal');
        const velocity = Math.sqrt(dx * dx + dy * dy);
        
        let anim = 'idle';
        let dir = entity.getData('lastDir') || 'down';
        let targetDx = dx;
        let targetDy = dy;
        let shouldUpdateDir = false;

        if (isLocal && sessionId) {
            const ecsEntity = this.ecsEntities.get(sessionId);
            if (ecsEntity && ecsEntity.input) {
                const input = ecsEntity.input;
                const isMoving = input.left || input.right || input.up || input.down;
                
                if (isMoving) {
                    anim = 'run';
                    let inputDx = 0;
                    let inputDy = 0;
                    if (input.left) inputDx -= 1;
                    if (input.right) inputDx += 1;
                    if (input.up) inputDy -= 1;
                    if (input.down) inputDy += 1;

                    if (inputDx !== 0 || inputDy !== 0) {
                        targetDx = inputDx;
                        targetDy = inputDy;
                        shouldUpdateDir = true;
                    }
                }
            }
        } else {
            // Remote Players: Use hysteresis to prevent flickering
            const now = Date.now();
            if (velocity > 0.1) {
                anim = 'run';
                shouldUpdateDir = true;
                entity.setData('lastMoveTime', now);
            } else {
                const lastMoveTime = entity.getData('lastMoveTime') || 0;
                // Keep running animation for 100ms after stopping to smooth out jitter
                if (now - lastMoveTime < 100) {
                    anim = 'run';
                }
            }
        }

        if (shouldUpdateDir) {
            const angle = Math.atan2(targetDy, targetDx) * 180 / Math.PI;
            
            if (angle >= 67.5 && angle < 112.5) {
                dir = 'down';
                entity.setFlipX(false);
            } else if (angle >= 22.5 && angle < 67.5) {
                dir = 'down-right';
                entity.setFlipX(false);
            } else if (angle >= -22.5 && angle < 22.5) {
                dir = 'right';
                entity.setFlipX(false);
            } else if (angle >= -67.5 && angle < -22.5) {
                dir = 'up-right';
                entity.setFlipX(false);
            } else if (angle >= -112.5 && angle < -67.5) {
                dir = 'up';
                entity.setFlipX(false);
            } else if (angle >= -157.5 && angle < -112.5) {
                dir = 'up-right'; // Up-Left mirrored
                entity.setFlipX(true);
            } else if (angle >= 112.5 && angle < 157.5) {
                dir = 'down-right'; // Down-Left mirrored
                entity.setFlipX(true);
            } else { // Left
                dir = 'right'; // Left mirrored
                entity.setFlipX(true);
            }
            
            entity.setData('lastDir', dir);
        }

        const key = `${anim}-${dir}`;
        if (entity.anims.currentAnim?.key !== key) {
            entity.play(key, true);
        }
    }
}