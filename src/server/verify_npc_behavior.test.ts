import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnManager } from './managers/SpawnManager';
import { ECSWorld, createWorld } from '../shared/ecs/world';
import { GameState } from '../shared/SchemaDef';
import RAPIER from '@dimforge/rapier2d-compat';
import { Pathfinding } from '../shared/systems/Pathfinding';

// Mock Config if needed, or use real one
import { CONFIG } from '../shared/Config';

describe('NPC Behavior & Seating Verification', () => {
    let world: ECSWorld;
    let physicsWorld: RAPIER.World;
    let state: GameState;
    let spawnManager: SpawnManager;
    let entities: Map<string, any>;

    beforeEach(async () => {
        await RAPIER.init();
        world = createWorld();
        physicsWorld = new RAPIER.World({ x: 0, y: 0 });
        state = new GameState();
        entities = new Map();
        spawnManager = new SpawnManager(world, physicsWorld, state, entities);
    });

    it('should load seats correctly from Map Data', () => {
        const mockMapData = {
            layers: [
                {
                    name: 'FixedSeats',
                    type: 'objectgroup',
                    objects: [
                        { type: 'bed', x: 100, y: 100, properties: [{ name: 'studentId', value: 0 }] }, // Student 0 Bed
                        { type: 'seat_class', x: 500, y: 500, properties: [{ name: 'studentId', value: 0 }] }, // Student 0 Class
                        { type: 'seat_food', x: 800, y: 800, properties: [{ name: 'studentId', value: 0 }] } // Student 0 Food
                    ]
                }
            ]
        };

        spawnManager.loadSeats(mockMapData);

        // Access private seats via 'any' casting for testing
        const seats = (spawnManager as any).seats;
        
        expect(seats.bed.get(0)).toEqual({ x: 100, y: 100 });
        expect(seats.class.get(0)).toEqual({ x: 500, y: 500 });
        expect(seats.food.get(0)).toEqual({ x: 800, y: 800 });
    });

    it('should assign students to their specific fixed seats', () => {
        // 1. Setup Seats
        const mockMapData = {
            layers: [
                {
                    name: 'FixedSeats',
                    type: 'objectgroup',
                    objects: [
                        { type: 'bed', x: 100, y: 100, properties: [{ name: 'studentId', value: 0 }] },
                        { type: 'bed', x: 200, y: 200, properties: [{ name: 'studentId', value: 1 }] }
                    ]
                }
            ]
        };
        spawnManager.loadSeats(mockMapData);

        // 2. Spawn Student 0 (Ignis 1)
        // Numeric ID 1 -> index 0
        spawnManager.createEchoEntity("student_ignis_1", 0, 0, "skin", "Test", "ignis", 1); 

        const entity = entities.get("student_ignis_1");
        expect(entity).toBeDefined();
        
        // 3. Verify AI Routine Spots match the Fixed Seat, NOT the passed (0,0)
        expect(entity.ai.routineSpots.sleep).toEqual({ x: 100, y: 100 });
        
        // 4. Verify Physical Spawn Position
        const pos = entity.body.translation();
        expect(pos.x).toBe(100);
        expect(pos.y).toBe(100);
    });

    it('should fallback to math if seat is missing', () => {
        // No seats loaded
        spawnManager.createEchoEntity("student_fallback", 999, 999, "skin", "Fallback", "ignis", 1);
        
        const entity = entities.get("student_fallback");
        // Should use the x,y passed to the function (999,999) as sleep pos
        expect(entity.ai.routineSpots.sleep).toEqual({ x: 999, y: 999 });
    });

    it('should find diagonal paths (8-way pathfinding)', () => {
        // Create a 10x10 empty grid
        const grid = Array(10).fill(0).map(() => Array(10).fill(0));
        const pathfinder = new Pathfinding(grid);

        // Path from (0,0) to (2,2)
        // 4-Way would be: (0,0)->(1,0)->(1,1)->(1,2)->(2,2) (Cost 4)
        // 8-Way should be: (0,0)->(1,1)->(2,2) (Cost 2 steps)
        
        const path = pathfinder.findPath({ x: 16, y: 16 }, { x: 2*32 + 16, y: 2*32 + 16 });
        
        expect(path).toBeDefined();
        if (path && path.length > 1) {
            // path[0] is Start (16,16). path[1] is the first move.
            
            const firstStep = path[1];
            // 32px tiles. Center is +16.
            // (1,1) is 32+16 = 48
            
            // If it moved diagonally, first step should be around 48,48
            expect(firstStep.x).toBe(48); 
            expect(firstStep.y).toBe(48);
        }
    });

    it('should prevent corner cutting', () => {
        // Grid setup:
        // 0 0
        // 1 0
        // Wall at (0,1).
        // Path from (0,0) to (1,1).
        
        const grid = Array(3).fill(0).map(() => Array(3).fill(0));
        grid[1][0] = 1; // Wall at x=0, y=1
        
        const pathfinder = new Pathfinding(grid);
        
        // Try to go from (0,0) [16,16] to (1,1) [48,48]
        // Should NOT go directly. Should go (1,0) -> (1,1)
        const path = pathfinder.findPath({ x: 16, y: 16 }, { x: 48, y: 48 });
        
        expect(path).toBeDefined();
        if (path && path.length > 1) {
            const firstStep = path[1];
            // Valid first step is (1,0) [x=48, y=16]
            // Invalid first step is (1,1) [x=48, y=48] (diagonal blocked by corner)
            
            expect(firstStep.x).toBe(48);
            expect(firstStep.y).toBe(16); 
        }
    });
});
