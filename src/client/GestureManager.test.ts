import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GestureManager } from './GestureManager';

// Mock Phaser.Math.Vector2 since it depends on a browser env
vi.mock('phaser', () => {
    class Vector2 {
        x: number;
        y: number;
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        clone() { return new Vector2(this.x, this.y); }
        distance(v: Vector2) { return Math.sqrt(Math.pow(v.x - this.x, 2) + Math.pow(v.y - this.y, 2)); }
        distanceSq(v: Vector2) { return Math.pow(v.x - this.x, 2) + Math.pow(v.y - this.y, 2); }
        subtract(v: Vector2) { this.x -= v.x; this.y -= v.y; return this; }
        lerp(v: Vector2, t: number) { 
            return new Vector2(this.x + t * (v.x - this.x), this.y + t * (v.y - this.y)); 
        }
    }
    return {
        default: {
            Math: { Vector2 }
        },
        Math: { Vector2 }
    };
});

import Phaser from 'phaser';

// Mock Graphics
const mockGraphics = {
    clear: vi.fn(),
    lineStyle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
    setDepth: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis()
};

const mockScene = {
    add: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
        text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), destroy: vi.fn() })
    },
    input: {
        on: vi.fn(), // Allow on() to be called without crashing
        x: 0,
        y: 0
    },
    game: {
        events: {
            on: vi.fn()
        }
    },
    tweens: {
        add: vi.fn()
    }
} as any;

describe('GestureManager Logic Verification', () => {
    let gm: GestureManager;

    beforeEach(() => {
        gm = new GestureManager(mockScene, mockScene);
    });

    it('should recognize a vertical line (Swipe Up)', () => {
        // Simulated points for a vertical line going UP
        const points = [];
        for (let i = 0; i <= 100; i += 10) {
            points.push(new Phaser.Math.Vector2(100, 200 - i));
        }

        // Access private method for testing via casting
        const candidate = (gm as any).normalizePipeline(points);
        const result = (gm as any).recognize(candidate);
        
        expect(result.id.startsWith('line')).toBe(true);
        expect(result.score).toBeLessThan(0.65);
    });

    it('should recognize a circle', () => {
        const points = [];
        const center = { x: 200, y: 200 };
        const radius = 50;
        for (let i = 0; i <= 32; i++) {
            const angle = (Math.PI * 2 * i) / 32;
            points.push(new Phaser.Math.Vector2(
                center.x + Math.cos(angle) * radius,
                center.y + Math.sin(angle) * radius
            ));
        }

        const candidate = (gm as any).normalizePipeline(points);
        const result = (gm as any).recognize(candidate);
        
        expect(result.id.startsWith('circle')).toBe(true);
        expect(result.score).toBeLessThan(0.65);
    });

    it('should recognize a triangle', () => {
        const points = [
            new Phaser.Math.Vector2(100, 200), // Bottom Left
            new Phaser.Math.Vector2(150, 100), // Top
            new Phaser.Math.Vector2(200, 200), // Bottom Right
            new Phaser.Math.Vector2(100, 200)  // Close
        ];
        // Resample manually to give the recognizer enough points
        const resampled = (gm as any).resample(points, 64);

        const candidate = (gm as any).normalizePipeline(resampled);
        const result = (gm as any).recognize(candidate);
        
        expect(result.id.startsWith('triangle')).toBe(true);
        expect(result.score).toBeLessThan(0.65);
    });

    it('should recognize a square', () => {
        const points = [
            new Phaser.Math.Vector2(100, 100),
            new Phaser.Math.Vector2(200, 100),
            new Phaser.Math.Vector2(200, 200),
            new Phaser.Math.Vector2(100, 200),
            new Phaser.Math.Vector2(100, 100)
        ];
        const resampled = (gm as any).resample(points, 64);

        const candidate = (gm as any).normalizePipeline(resampled);
        const result = (gm as any).recognize(candidate);
        
        expect(result.id.startsWith('square')).toBe(true);
        expect(result.score).toBeLessThan(0.65);
    });
});
