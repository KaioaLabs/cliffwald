import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier2d-compat';
import { world } from '../ecs/world';
import { MovementSystem } from './MovementSystem';
import { CONFIG } from '../Config';

describe('MovementSystem', () => {
    beforeAll(async () => {
        // Initialize Rapier once before tests
        await RAPIER.init();
    });

    beforeEach(() => {
        world.clear();
    });

    it('should apply velocity when input is active', () => {
        // 1. Setup Physics World
        const physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        
        // 2. Create Entity
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased();
        const body = physicsWorld.createRigidBody(bodyDesc);
        
        const entity = world.add({
            body: body,
            input: { left: false, right: true, up: false, down: false, attack: false }
        });

        // 3. Run System
        MovementSystem();

        // 4. Verify
        const velocity = body.linvel();
        expect(velocity.x).toBe(CONFIG.PLAYER_SPEED);
        expect(velocity.y).toBe(0);
    });

    it('should normalize diagonal speed', () => {
        const physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        const body = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased());

        world.add({
            body: body,
            input: { left: false, right: true, up: false, down: true, attack: false } // Down-Right
        });

        MovementSystem();

        const velocity = body.linvel();
        const expectedSpeed = CONFIG.PLAYER_SPEED * Math.SQRT1_2;
        
        expect(velocity.x).toBeCloseTo(expectedSpeed);
        expect(velocity.y).toBeCloseTo(expectedSpeed);
    });
});
