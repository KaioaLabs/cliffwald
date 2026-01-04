export interface Point {
    x: number;
    y: number;
}

export class Pathfinding {
    private grid: number[][];
    private width: number;
    private height: number;

    constructor(grid: number[][]) {
        this.grid = grid;
        this.height = grid.length;
        this.width = grid[0]?.length || 0;
    }

    public findPath(start: Point, end: Point): Point[] | null {
        if (this.width === 0 || this.height === 0) return null;
        
        // Convert world to grid coords (32px tiles)
        const startX = Math.floor(start.x / 32);
        const startY = Math.floor(start.y / 32);
        const endX = Math.floor(end.x / 32);
        const endY = Math.floor(end.y / 32);

        // Bounds check
        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) return null;
        if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height) return null;
        if (this.grid[startY][startX] === 1 || this.grid[endY][endX] === 1) return null;

        const openSet: Node[] = [];
        const closedSet = new Set<string>();
        
        const startNode = new Node(startX, startY, 0, this.dist(startX, startY, endX, endY));
        openSet.push(startNode);

        while (openSet.length > 0) {
            // Find node with lowest fScore
            let currentIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIdx].f) currentIdx = i;
            }
            const current = openSet.splice(currentIdx, 1)[0];

            if (current.x === endX && current.y === endY) {
                return this.reconstructPath(current);
            }

            closedSet.add(`${current.x},${current.y}`);

            // Neighbors (4 directions)
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= this.width || neighbor.y < 0 || neighbor.y >= this.height) continue;
                if (this.grid[neighbor.y][neighbor.x] === 1) continue;
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

                const gScore = current.g + 1;
                let neighborNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!neighborNode) {
                    neighborNode = new Node(neighbor.x, neighbor.y, gScore, this.dist(neighbor.x, neighbor.y, endX, endY), current);
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }

        return null;
    }

    private dist(x1: number, y1: number, x2: number, y2: number): number {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    private reconstructPath(node: Node): Point[] {
        const path: Point[] = [];
        let curr: Node | undefined = node;
        while (curr) {
            // Convert back to world coords (center of 32px tile)
            path.push({ x: curr.x * 32 + 16, y: curr.y * 32 + 16 });
            curr = curr.parent;
        }
        return path.reverse();
    }
}

class Node {
    f: number;
    constructor(public x: number, public y: number, public g: number, public h: number, public parent?: Node) {
        this.f = g + h;
    }
}
