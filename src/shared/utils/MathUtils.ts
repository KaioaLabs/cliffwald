export class MathUtils {
    /**
     * Calculates the Euclidean distance between two points (2D).
     */
    static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the squared Euclidean distance (faster, avoids sqrt).
     */
    static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    /**
     * Clamps a number between a minimum and maximum value.
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values.
     */
    static lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    /**
     * Normalizes a 2D vector. Returns {x: 0, y: 0} if length is 0.
     */
    static normalize(x: number, y: number): { x: number, y: number } {
        const len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: x / len, y: y / len };
    }
}
