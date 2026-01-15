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

        const openSet = new BinaryHeap<Node>((a, b) => a.f - b.f);
        const closedSet = new Set<number>(); // Numeric Key: y * width + x
        const nodeMap = new Map<number, Node>(); // Track nodes for updates
        
        const startNode = new Node(startX, startY, 0, this.dist(startX, startY, endX, endY));
        openSet.push(startNode);
        nodeMap.set(startY * this.width + startX, startNode);

        while (openSet.size() > 0) {
            const current = openSet.pop();

            if (!current) break;
            
            if (current.x === endX && current.y === endY) {
                const rawPath = this.reconstructPath(current);
                return this.smoothPath(rawPath);
            }

            const currentKey = current.y * this.width + current.x;
            closedSet.add(currentKey);

            // Neighbors (8 directions)
            const dirs = [
                { x: 1, y: 0, cost: 1 }, { x: -1, y: 0, cost: 1 },
                { x: 0, y: 1, cost: 1 }, { x: 0, y: -1, cost: 1 },
                { x: 1, y: 1, cost: 1.414 }, { x: -1, y: 1, cost: 1.414 },
                { x: 1, y: -1, cost: 1.414 }, { x: -1, y: -1, cost: 1.414 }
            ];

            for (const dir of dirs) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;

                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                if (this.grid[ny][nx] === 1) continue;
                
                const neighborKey = ny * this.width + nx;
                if (closedSet.has(neighborKey)) continue;

                // Corner Cutting Prevention for Diagonals
                if (dir.cost > 1) {
                    if (this.grid[current.y][nx] === 1 || this.grid[ny][current.x] === 1) continue;
                }

                const gScore = current.g + dir.cost;
                let neighborNode = nodeMap.get(neighborKey);

                if (!neighborNode) {
                    neighborNode = new Node(nx, ny, gScore, this.dist(nx, ny, endX, endY), current);
                    nodeMap.set(neighborKey, neighborNode);
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                    neighborNode.parent = current;
                    openSet.rescoreElement(neighborNode);
                }
            }
        }

        return null;
    }

    // --- STRING PULLING LOGIC ---
    private smoothPath(path: Point[]): Point[] {
        if (path.length <= 2) return path;

        const smoothed: Point[] = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            let next = current + 1;
            // Check as far ahead as possible
            for (let i = current + 2; i < path.length; i++) {
                if (this.lineOfSight(path[current], path[i])) {
                    next = i;
                }
            }
            smoothed.push(path[next]);
            current = next;
        }

        return smoothed;
    }

    private lineOfSight(p1: Point, p2: Point): boolean {
        // Bresenham's Line Algorithm (Grid Check)
        let x0 = Math.floor(p1.x / 32);
        let y0 = Math.floor(p1.y / 32);
        let x1 = Math.floor(p2.x / 32);
        let y1 = Math.floor(p2.y / 32);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        // Inflate Safety Buffer (Check 1 tile around line to prevent corner cutting)
        // Simple approach: Check neighbors of current tile
        const checkSafety = (x: number, y: number) => {
            // Check cross pattern to ensure width
            const neighbors = [
                {x:0, y:0}, {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}
            ];
            // Just check the tile itself for obstruction? 
            // String Pulling needs to be conservative.
            // If the line passes through a wall, return false.
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
            return this.grid[y][x] === 0;
        };

        while (true) {
            // Check obstruction
            if (this.grid[y0][x0] === 1) return false;
            
            if (x0 === x1 && y0 === y1) break;
            
            const e2 = 2 * err;
            let movedX = false;
            let movedY = false;

            if (e2 > -dy) { 
                err -= dy; 
                x0 += sx; 
                movedX = true;
            }
            if (e2 < dx) { 
                err += dx; 
                y0 += sy; 
                movedY = true;
            }

            // CORNER CHECK: If moved diagonally, check adjacent cardinal neighbors
            if (movedX && movedY) {
                // We moved from (prevX, prevY) to (x0, y0).
                // Neighbors are (x0, prevY) and (prevX, y0).
                // Since x0 = prevX + sx, prevX = x0 - sx.
                if (this.grid[y0][x0 - sx] === 1 || this.grid[y0 - sy][x0] === 1) return false;
            }
        }

        return true;
    }

    private dist(x1: number, y1: number, x2: number, y2: number): number {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        const D = 1;
        const D2 = 1.414;
        return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
    }

    private reconstructPath(node: Node): Point[] {
        const path: Point[] = [];
        let curr: Node | undefined = node;
        while (curr) {
            // Add slight random offset to waypoint to reduce "robot line"
            // +/- 8px (Quarter tile)
            const offsetX = (Math.random() - 0.5) * 16;
            const offsetY = (Math.random() - 0.5) * 16;
            
            path.push({ x: curr.x * 32 + 16 + offsetX, y: curr.y * 32 + 16 + offsetY });
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

class BinaryHeap<T> {
    content: T[];
    scoreFunction: (a: T, b: T) => number;

    constructor(scoreFunction: (a: T, b: T) => number) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    push(element: T) {
        this.content.push(element);
        this.sinkDown(this.content.length - 1);
    }

    pop(): T | undefined {
        const result = this.content[0];
        const end = this.content.pop();
        if (this.content.length > 0 && end !== undefined) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    }

    remove(node: T) {
        const i = this.content.indexOf(node);
        const end = this.content.pop();
        if (i !== this.content.length - 1 && end !== undefined) {
            this.content[i] = end;
            if (this.scoreFunction(end, node) < 0) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    }

    size() {
        return this.content.length;
    }

    rescoreElement(node: T) {
        this.sinkDown(this.content.indexOf(node));
    }

    sinkDown(n: number) {
        const element = this.content[n];
        while (n > 0) {
            const parentN = ((n + 1) >> 1) - 1;
            const parent = this.content[parentN];
            if (this.scoreFunction(element, parent) < 0) {
                this.content[parentN] = element;
                this.content[n] = parent;
                n = parentN;
            } else {
                break;
            }
        }
    }

    bubbleUp(n: number) {
        const length = this.content.length;
        const element = this.content[n];
        const elemScore = this.scoreFunction;

        while (true) {
            const child2N = (n + 1) << 1;
            const child1N = child2N - 1;
            let swap: number | null = null;
            let child1Score: T; 

            if (child1N < length) {
                const child1 = this.content[child1N];
                if (elemScore(child1, element) < 0)
                    swap = child1N;
            }
            if (child2N < length) {
                const child2 = this.content[child2N];
                const child1 = this.content[child1N];
                if (elemScore(child2, (swap === null ? element : child1)) < 0)
                    swap = child2N;
            }

            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            } else {
                break;
            }
        }
    }
}