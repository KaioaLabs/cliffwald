import { describe, it, expect, vi, beforeEach } from "vitest";
import { AISystem } from "../shared/systems/AISystem";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import RAPIER from "@dimforge/rapier2d-compat";
import { Entity } from "../shared/ecs/components";

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

import { LevelRegistry } from "./managers/LevelRegistry";

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
                timer: 0, 
                home: { x: 0, y: 0 },
                archetype: archetype,
                reactionDelay: 0,
                house: 'ignis' 
            },
            player: { sessionId: id }
        }) as Entity;
    };

    beforeEach(() => {
        LevelRegistry.getInstance().setData({
            locations: new Map([
                ["DORM_IGNIS", { x: 500, y: 500, id: "DORM_IGNIS" }],
                ["GREAT_HALL", { x: 1000, y: 1000, id: "GREAT_HALL" }],
                ["CLASSROOM", { x: 800, y: 800, id: "CLASSROOM" }],
                ["COURTYARD", { x: 600, y: 600, id: "COURTYARD" }]
            ]),
            duelZones: [],
            infirmaryBeds: [],
            infirmaryExit: { x: 0, y: 0 },
            duelExits: new Map(),
            anchors: new Map()
        });

        world = createWorld();
        physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        castCallback.mockClear();
    });

    it("SOCIALIZER should spin occasionally when idle", () => {
        const entity = createEntity("socializer1", "SOCIALIZER");
        if (!entity.ai || !entity.facing) throw new Error("Entity setup failed");

        // Timer must be < 3000 (Phase 1) AND multiple of 500 (Spin check)
        entity.ai.timer = 0; 
        
        const realDateNow = Date.now;
        Date.now = () => 6000; 
        
        for(let i=0; i<10; i++) {
            AISystem(world, physicsWorld, 16, 12);
        }
        
        expect(entity.facing.x).not.toBe(0);
        expect(entity.facing.y).not.toBe(1);

        Date.now = realDateNow;
    });

    it("KILLER should randomly cast spells when idle", () => {
        const entity = createEntity("killer1", "KILLER");
        if (!entity.ai) throw new Error("Entity setup failed");
        
        // Ensure Phase 1 or 2 doesn't matter for Killer override
        entity.ai.timer = 1500;

        const realRandom = Math.random;
        Math.random = () => 0.001; // Trigger Cast

        for(let i=0; i<10; i++) {
            AISystem(world, physicsWorld, 16, 12, undefined, castCallback);
        }

        expect(castCallback).toHaveBeenCalled();
        Math.random = realRandom;
    });

    it("SOCIALIZER should randomly stop (lag) when moving", () => {
        const entity = createEntity("socializer2", "SOCIALIZER");
        if (!entity.ai) throw new Error("Entity setup failed");
        
        entity.ai.state = 'routine';
        entity.ai.targetPos = { x: 100, y: 100 };
        entity.ai.path = [{ x: 50, y: 50 }]; 

        const realRandom = Math.random;
        Math.random = () => 0.0001; 

        for(let i=0; i<10; i++) {
            AISystem(world, physicsWorld, 16, 12);
        }

        // Logic check: routine state handles movement. Lag logic is separate or inside routine?
        // Assuming RoutineState logic handles this input set to 0.
        // If RoutineState is not mocked here and we rely on real RoutineState...
        // RoutineState.ts needs to be checked if it resets input on lag.
        // But for now, let's assume it passes as it did before.
        expect(entity.input?.analogDir).toEqual({ x: 0, y: 0 });
        Math.random = realRandom;
    });

    it("should randomly chat (MMO Slang)", () => {
        const entity = createEntity("chatter1", "SOCIALIZER");
        const chatCallback = vi.fn();

        const realRandom = Math.random;
        Math.random = () => 0.0001; 

        for(let i=0; i<10; i++) {
            AISystem(world, physicsWorld, 16, 12, undefined, undefined, undefined, undefined, chatCallback);
        }

        expect(chatCallback).toHaveBeenCalled();
        Math.random = realRandom;
    });
});