import { describe, it, expect } from 'vitest';
import { Pathfinding } from './Pathfinding';

describe('Pathfinding System (A*)', () => {
    // 5x5 grid with a wall in the middle
    const grid = [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ];
    const pathfinder = new Pathfinding(grid);

    it('should find a direct path on empty grid', () => {
        const start = { x: 16, y: 16 }; // Center of (0,0) @ 32px
        const end = { x: 16, y: 144 };  // Center of (0,4) @ 32px
        const path = pathfinder.findPath(start, end);
        expect(path).not.toBeNull();
        expect(path?.length).toBeGreaterThan(0);
    });

    it('should avoid walls', () => {
        // Start top-left (0,0), End bottom-right (4,4)
        // Must go around the wall
        const start = { x: 16, y: 16 };
        const end = { x: 144, y: 144 };
        const path = pathfinder.findPath(start, end);
        
        expect(path).not.toBeNull();
        // Verify no point in path is inside a wall (1)
        path?.forEach(p => {
            const gx = Math.floor(p.x / 32);
            const gy = Math.floor(p.y / 32);
            expect(grid[gy][gx]).toBe(0);
        });
    });

    it('should return null if target is unreachable', () => {
        // Totally boxed in grid
        const blockedGrid = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ];
        const pf = new Pathfinding(blockedGrid);
        const path = pf.findPath({ x: 8, y: 8 }, { x: 40, y: 40 });
        expect(path).toBeNull();
    });
});
