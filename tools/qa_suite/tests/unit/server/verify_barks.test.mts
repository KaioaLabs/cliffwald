import { describe, it, expect, vi } from "vitest";
import { AISystem } from "../../../../../src/shared/systems/AISystem";
import { ECSWorld, createWorld } from "../../../../../src/shared/ecs/world";
import RAPIER from "@dimforge/rapier2d-compat";

// Mock RAPIER
vi.mock("@dimforge/rapier2d-compat", () => {
    return {
        default: {
            World: class {
                createRigidBody() { return { linvel: () => ({x:0,y:0}) }; }
                createCollider() {}
            },
            Ball: class {}
        }
    };
});

describe("AI Bark System", () => {
    it("should trigger chat callback after timer expires", () => {
        const world = createWorld();
        const chatMock = vi.fn();
        
        // Create Entity
        world.add({
            id: 100,
            ai: {
                state: 'idle',
                timer: 0,
                house: 'ignis',
                home: {x:0,y:0},
                barkTimer: 1000 // 1 second left
            },
            body: {} as any,
            input: {} as any
        });

        const physics = new RAPIER.World({x:0,y:0});

        // Update 1: Timer reduces
        AISystem(world, physics, 500, 12, undefined, undefined, undefined, undefined, chatMock);
        expect(chatMock).not.toHaveBeenCalled();

        // Update 2: Timer expires
        AISystem(world, physics, 600, 12, undefined, undefined, undefined, undefined, chatMock);
        expect(chatMock).toHaveBeenCalled();
        
        // Verify Content
        const callArgs = chatMock.mock.calls[0];
        expect(callArgs[0]).toBe("100"); // ID
        expect(typeof callArgs[1]).toBe("string");
        console.log("Bark triggered:", callArgs[1]);
    });
});
