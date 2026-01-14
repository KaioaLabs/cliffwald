import { describe, it, expect, vi, beforeEach } from "vitest";
import { AISystem } from "../shared/systems/AISystem";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import RAPIER from "@dimforge/rapier2d-compat";

// Mock RAPIER
vi.mock("@dimforge/rapier2d-compat", async () => {
    return {
        default: {
            Ball: class { constructor(r: number) {} },
            World: class {
                createRigidBody() {}
                createCollider() {}
                intersectionsWithShape(pos: any, rot: any, shape: any, cb: any) {}
            }
        }
    };
});

describe("AISystem MMO Behaviors", () => {
    let world: ECSWorld;
    let physicsWorld: any;
    let castCallback = vi.fn();

    const createEntity = (id: string, archetype: 'ACHIEVER' | 'SOCIALIZER' | 'EXPLORER' | 'KILLER') => {
        return world.add({
            id: id as any,
            body: {
                translation: () => ({ x: 0, y: 0 }),
                linvel: () => ({ x: 0, y: 0 }),
                applyImpulse: vi.fn(),
                userData: { sessionId: id }
            } as any,
            input: { left: false, right: false, up: false, down: false, analogDir: { x: 0, y: 0 } },
            facing: { x: 0, y: 1 },
            ai: {
                state: 'idle',
                timer: 0, // start with 0
                home: { x: 0, y: 0 },
                archetype: archetype,
                reactionDelay: 0
            },
            player: { sessionId: id }
        });
    };

    beforeEach(() => {
        world = createWorld();
        physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        castCallback.mockClear();
    });

    it("SOCIALIZER should spin occasionally when idle", () => {
        const entity = createEntity("socializer", "SOCIALIZER");
        if (!entity.ai || !entity.facing) throw new Error("Entity setup failed");

        // Force timer to > 2000 (threshold for spinning) AND matching the modulo 3 check (3000-3999 range)
        entity.ai.timer = 3001;
        
        // Mock Date.now to control spin
        const realDateNow = Date.now;
        Date.now = () => 6000; // 6000 / 1000 = 6. 6 % 3 === 0. Should spin.
        
        AISystem(world, physicsWorld, 16, 12, undefined, castCallback);
        
        // Check facing changed from default {0, 1}
        // angle = 6000 / 300 = 20 rad
        // x = cos(20), y = sin(20)
        expect(entity.facing.x).not.toBe(0);
        expect(entity.facing.y).not.toBe(1);

        // Restore Date
        Date.now = realDateNow;
    });

    it("KILLER should randomly cast spells when idle", () => {
        const entity = createEntity("killer", "KILLER");
        if (!entity.ai) throw new Error("Entity setup failed");
        entity.ai.timer = 1500;

        // Force Math.random to return 0 for the first call (cast check)
        const realRandom = Math.random;
        let callCount = 0;
        Math.random = () => {
            callCount++;
            if (callCount === 1) return 0.005; // < 0.01 (Trigger Cast)
            return 0.5;
        };

        AISystem(world, physicsWorld, 16, 12, undefined, castCallback);

        expect(castCallback).toHaveBeenCalled();
        Math.random = realRandom;
    });

    it("SOCIALIZER should randomly stop (lag) when moving", () => {
        const entity = createEntity("socializer_move", "SOCIALIZER");
        if (!entity.ai) throw new Error("Entity setup failed");
        
        entity.ai.state = 'routine';
        entity.ai.targetPos = { x: 100, y: 100 };
        entity.ai.path = [{ x: 50, y: 50 }]; // Has path

        // Force Lag Check
        const realRandom = Math.random;
        Math.random = () => 0.001; // < 0.01 (Trigger Lag)

        AISystem(world, physicsWorld, 16, 12, undefined, castCallback);

        expect(entity.input?.analogDir).toEqual({ x: 0, y: 0 });
        
        Math.random = realRandom;
    });

    it("ACHIEVER should NOT have input noise", () => {
        const entity = createEntity("achiever", "ACHIEVER");
        if (!entity.ai) throw new Error("Entity setup failed");

        entity.ai.state = 'routine';
        entity.ai.targetPos = { x: 100, y: 100 };
        entity.ai.path = [{ x: 50, y: 50 }];

        // Force Noise Timer update
        entity.ai.noiseTimer = 1001;

        AISystem(world, physicsWorld, 16, 12, undefined, castCallback);
        
        expect(entity.ai.inputNoise).toBeUndefined();
    });

    it("should randomly chat (MMO Slang)", () => {
        const entity = createEntity("chatter", "SOCIALIZER");
        const chatCallback = vi.fn();

        // Force Math.random to trigger chat
        const realRandom = Math.random;
        Math.random = () => 0.0001; // < 0.0005

        AISystem(world, physicsWorld, 16, 12, undefined, undefined, undefined, chatCallback);

        expect(chatCallback).toHaveBeenCalled();
        Math.random = realRandom;
    });
});
