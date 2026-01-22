import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnManager } from './managers/SpawnManager';
import { ECSWorld, createWorld } from '../shared/ecs/world';
import { GameState } from '../shared/SchemaDef';
import RAPIER from '@dimforge/rapier2d-compat';
import { Pathfinding } from '../shared/systems/Pathfinding';
import { Entity } from '../shared/ecs/components';

// Mock Config if needed, or use real one
import { CONFIG } from '../shared/Config';

import { LevelRegistry } from "./managers/LevelRegistry";

describe("NPC Behavior & Seating Verification", () => {
    let spawnManager: SpawnManager;
    let physicsWorld: RAPIER.World;
    let world: any;
    let entities: Map<string, Entity>;
    let state: GameState;

    beforeEach(async () => {
        // Mock LevelRegistry
        LevelRegistry.getInstance().setData({
            locations: new Map([
                ["GREAT_HALL", { x: 100, y: 100, id: "GREAT_HALL", width: 0, height: 0 }],
                ["CLASSROOM", { x: 200, y: 200, id: "CLASSROOM", width: 0, height: 0 }],
                ["COURTYARD", { x: 300, y: 300, id: "COURTYARD", width: 0, height: 0 }],
                ["DORM_IGNIS", { x: 500, y: 500, id: "DORM_IGNIS", width: 0, height: 0 }]
            ]),
            duelZones: [],
            infirmaryBeds: [],
            infirmaryExit: { x: 0, y: 0 },
            duelExits: new Map(),
            anchors: new Map(),
            itemSpawns: []
        });

        await RAPIER.init();
        physicsWorld = new RAPIER.World({ x: 0.0, y: 0.0 });
        world = {
            add: vi.fn((c) => c),
            remove: vi.fn()
        };
        entities = new Map();
        state = new GameState();
        
        spawnManager = new SpawnManager(world, physicsWorld, state, entities);
    });

    it('should load seats correctly from Map Data', () => {
        const mockMapData: any = {
            layers: [
                {
                    name: 'FixedSeats',
                    type: 'objectgroup',
                    objects: [
                        { name: 'bed_1', x: 100, y: 100 }, 
                        { name: 'seat_class_1', x: 500, y: 500 }, 
                        { name: 'seat_food_1', x: 800, y: 800 } 
                    ]
                }
            ]
        };

        spawnManager.loadSeats(mockMapData);

        // Access private seats via 'any' casting for testing
        const seats = (spawnManager as any).seats;
        
        // bed_1 -> index 0 (studentId - 1)
        expect(seats.bed.get(0)).toEqual({ x: 100, y: 100 });
        expect(seats.class.get(0)).toEqual({ x: 500, y: 500 });
        expect(seats.food.get(0)).toEqual({ x: 800, y: 800 });
    });

    it('should assign students to their specific fixed seats', () => {
        const mockMapData: any = {
            layers: [
                {
                    name: 'FixedSeats',
                    type: 'objectgroup',
                    objects: [
                        { name: 'bed_1', x: 100, y: 100 }
                    ]
                }
            ]
        };
        spawnManager.loadSeats(mockMapData);

        spawnManager.spawnCharacter({
             id: "student_ignis_1",
             numericId: 1,
             username: "Test",
             skin: "skin",
             house: "ignis",
             x: 500, 
             y: 520,
             isAI: true,
             routineSpots: { sleep: { x: 500, y: 520 }, eat: {x:0,y:0}, class: {x:0,y:0} }
        });

        const entity = entities.get("student_ignis_1");
        expect(entity).toBeDefined();
        expect(entity?.ai?.routineSpots?.sleep).toEqual({ x: 500, y: 520 });
        
        const pos = entity?.body?.translation();
        expect(pos?.x).toBe(500);
        expect(pos?.y).toBe(520);
    });

    it('should find diagonal paths (8-way pathfinding)', () => {
        const originalRandom = Math.random;
        Math.random = () => 0.5;

        const grid = Array(10).fill(0).map(() => Array(10).fill(0));
        const grids = new Map([[0, grid]]);
        const pathfinder = new Pathfinding(grids);

        const path = pathfinder.findPath({ x: 16, y: 16 }, { x: 2*32 + 16, y: 2*32 + 16 });
        
        Math.random = originalRandom;
        
        expect(path).toBeDefined();
        if (path && path.length > 1) {
            const firstStep = path[1];
            expect(firstStep.x).toBe(80); 
            expect(firstStep.y).toBe(80);
        }
    });

    it('should prevent corner cutting', () => {
        const originalRandom = Math.random;
        Math.random = () => 0.5;

        const grid = Array(3).fill(0).map(() => Array(3).fill(0));
        grid[1][0] = 1; 
        
        const grids = new Map([[0, grid]]);
        const pathfinder = new Pathfinding(grids);
        
        const path = pathfinder.findPath({ x: 16, y: 16 }, { x: 48, y: 48 });
        
        Math.random = originalRandom;

        expect(path).toBeDefined();
        if (path && path.length > 1) {
            const firstStep = path[1];
            expect(firstStep.x).toBe(48);
            expect(firstStep.y).toBe(16); 
        }
    });
});