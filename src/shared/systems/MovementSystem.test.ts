import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier2d-compat';
import { createWorld, ECSWorld } from '../ecs/world';
import { MovementSystem } from './MovementSystem';
import { CONFIG } from '../Config';

describe('MovementSystem', () => {
    let world: ECSWorld;

    beforeAll(async () => {
        await RAPIER.init();
    });

    beforeEach(() => {
        world = createWorld();
    });

    it('should apply velocity when input is active', () => {
        const physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });
        const body = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased());
        
        world.add({
            body: body,
            input: { left: false, right: true, up: false, down: false },
            stats: { hp: 100, maxHp: 100, speed: CONFIG.PLAYER_SPEED, mp: 100, maxMp: 100, level: 1, exp: 0, expToNext: 100 }
        });

        MovementSystem(world);

        const velocity = body.linvel();
        expect(velocity.x).toBe(CONFIG.PLAYER_SPEED);
        expect(velocity.y).toBe(0);
    });

    it('should normalize diagonal speed', () => {
        const physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        const body = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased());

        world.add({
            body: body,
            input: { left: false, right: true, up: false, down: true },
            stats: { hp: 100, maxHp: 100, speed: CONFIG.PLAYER_SPEED, mp: 100, maxMp: 100, level: 1, exp: 0, expToNext: 100 }
        });

        MovementSystem(world);

        const velocity = body.linvel();
        const expectedSpeed = CONFIG.PLAYER_SPEED * Math.SQRT1_2;
        
        expect(velocity.x).toBeCloseTo(expectedSpeed);
        expect(velocity.y).toBeCloseTo(expectedSpeed);
    });
});