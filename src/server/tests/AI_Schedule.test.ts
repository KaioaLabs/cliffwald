import { describe, it, expect, beforeEach, vi } from "vitest";
import { getStudentScheduleTarget } from "../../shared/utils/ScheduleUtils";
import { RoutineState } from "../ai/states/RoutineState";
import { LevelRegistry } from "../managers/LevelRegistry";
import { Entity } from "../../shared/ecs/components";
import RAPIER from "@dimforge/rapier2d-compat";

// Mock RAPIER
vi.mock("@dimforge/rapier2d-compat", () => {
    return {
        default: {
            World: class {
                createRigidBody() { return {}; }
                createCollider() {}
                intersectionsWithShape() {}
            },
            Ball: class {}
        }
    };
});

describe("MMO AI Schedule Verification", () => {
    
    beforeEach(async () => {
        // Mock Map Locations
        LevelRegistry.getInstance().setData({
            locations: new Map([
                ["GREAT_HALL", { x: 1000, y: 1000, width: 500, height: 500, id: "GREAT_HALL" }],
                ["CLASSROOM", { x: 2000, y: 2000, width: 400, height: 400, id: "CLASSROOM" }],
                ["DORM_IGNIS", { x: 500, y: 500, width: 200, height: 200, id: "DORM_IGNIS" }],
                ["COURTYARD", { x: 1500, y: 1500, width: 800, height: 800, id: "COURTYARD" }]
            ]),
            duelZones: [],
            infirmaryBeds: [],
            infirmaryExit: { x: 0, y: 0 },
            duelExits: new Map(),
            anchors: new Map()
        });
    });

    it("07:00 -> Should go to Breakfast (Great Hall)", () => {
        const target = getStudentScheduleTarget(7);
        expect(target.activity).toBe("eat");
        expect(target.targetZone).toBe("GREAT_HALL");
    });

    it("09:00 -> Should go to Class (Classroom)", () => {
        const target = getStudentScheduleTarget(9);
        expect(target.activity).toBe("class");
        // "Classroom" in Config maps to "ACADEMIC_WING" or specific zone logic
        // Verify util mapping:
        expect(target.targetZone).toBe("ACADEMIC_WING"); 
    });

    it("11:00 -> Should be Free (Courtyard)", () => {
        const target = getStudentScheduleTarget(11);
        expect(target.activity).toBe("free");
        expect(target.targetZone).toBe("COURTYARD");
    });

    it("23:00 -> Should be Sleeping (Dorm)", () => {
        const target = getStudentScheduleTarget(23);
        expect(target.activity).toBe("sleep");
        // Dorm logic depends on house, handled in RoutineState
        expect(target.targetZone).toBe("DORM"); 
    });

    it("RoutineState should resolve specific DORM based on House", () => {
        const entity: Entity = {
            id: 1,
            ai: {
                house: 'ignis',
                state: 'routine',
                timer: 0,
                home: {x:0,y:0},
                routineSpots: {
                    sleep: { x: 550, y: 550 }, // Inside Ignis Dorm
                    eat: {x:0,y:0},
                    class: {x:0,y:0}
                }
            },
            // Move inside the zone radius (Zone is 500,500. Radius approx 300).
            // Place at 500, 500 so it thinks it is "At Zone"
            body: { translation: () => ({ x: 500, y: 500 }) } as any, 
            input: { analogDir: {x:0,y:0} } as any
        };

        // Run Update at 23:00 (Sleep time)
        RoutineState.update(entity, 16, 23, null, null as any, 0);

        // Should target the sleep spot
        expect(entity.ai?.targetPos).toEqual({ x: 550, y: 550 });
    });
});
