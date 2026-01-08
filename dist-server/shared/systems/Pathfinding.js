"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pathfinding = void 0;
class Pathfinding {
    constructor(grid) {
        this.grid = grid;
        this.height = grid.length;
        this.width = grid[0]?.length || 0;
    }
    findPath(start, end) {
        if (this.width === 0 || this.height === 0)
            return null;
        // Convert world to grid coords (32px tiles)
        const startX = Math.floor(start.x / 32);
        const startY = Math.floor(start.y / 32);
        const endX = Math.floor(end.x / 32);
        const endY = Math.floor(end.y / 32);
        // Bounds check
        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height)
            return null;
        if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height)
            return null;
        if (this.grid[startY][startX] === 1 || this.grid[endY][endX] === 1)
            return null;
        const openSet = new BinaryHeap((a, b) => a.f - b.f);
        const closedSet = new Set(); // Numeric Key: y * width + x
        const nodeMap = new Map(); // Track nodes for updates
        const startNode = new Node(startX, startY, 0, this.dist(startX, startY, endX, endY));
        openSet.push(startNode);
        nodeMap.set(startY * this.width + startX, startNode);
        while (openSet.size() > 0) {
            const current = openSet.pop();
            if (!current)
                break;
            if (current.x === endX && current.y === endY) {
                return this.reconstructPath(current);
            }
            const currentKey = current.y * this.width + current.x;
            closedSet.add(currentKey);
            // Neighbors (8 directions)
            // Directions: Right, Left, Down, Up, DR, DL, UR, UL
            const dirs = [
                { x: 1, y: 0, cost: 1 }, { x: -1, y: 0, cost: 1 },
                { x: 0, y: 1, cost: 1 }, { x: 0, y: -1, cost: 1 },
                { x: 1, y: 1, cost: 1.414 }, { x: -1, y: 1, cost: 1.414 },
                { x: 1, y: -1, cost: 1.414 }, { x: -1, y: -1, cost: 1.414 }
            ];
            for (const dir of dirs) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height)
                    continue;
                if (this.grid[ny][nx] === 1)
                    continue;
                const neighborKey = ny * this.width + nx;
                if (closedSet.has(neighborKey))
                    continue;
                // Corner Cutting Prevention for Diagonals
                if (dir.cost > 1) {
                    if (this.grid[current.y][nx] === 1 || this.grid[ny][current.x] === 1)
                        continue;
                }
                const gScore = current.g + dir.cost;
                let neighborNode = nodeMap.get(neighborKey);
                if (!neighborNode) {
                    neighborNode = new Node(nx, ny, gScore, this.dist(nx, ny, endX, endY), current);
                    nodeMap.set(neighborKey, neighborNode);
                    openSet.push(neighborNode);
                }
                else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                    neighborNode.parent = current;
                    openSet.rescoreElement(neighborNode);
                }
            }
        }
        return null;
    }
    dist(x1, y1, x2, y2) {
        // Octile Distance (Better for 8-way movement)
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        const D = 1;
        const D2 = 1.414;
        return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
    }
    reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr) {
            // Convert back to world coords (center of 32px tile)
            path.push({ x: curr.x * 32 + 16, y: curr.y * 32 + 16 });
            curr = curr.parent;
        }
        return path.reverse();
    }
}
exports.Pathfinding = Pathfinding;
class Node {
    constructor(x, y, g, h, parent) {
        this.x = x;
        this.y = y;
        this.g = g;
        this.h = h;
        this.parent = parent;
        this.f = g + h;
    }
}
class BinaryHeap {
    constructor(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }
    push(element) {
        this.content.push(element);
        this.sinkDown(this.content.length - 1);
    }
    pop() {
        const result = this.content[0];
        const end = this.content.pop();
        if (this.content.length > 0 && end !== undefined) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    }
    remove(node) {
        const i = this.content.indexOf(node);
        const end = this.content.pop();
        if (i !== this.content.length - 1 && end !== undefined) {
            this.content[i] = end;
            if (this.scoreFunction(end, node) < 0) {
                this.sinkDown(i);
            }
            else {
                this.bubbleUp(i);
            }
        }
    }
    size() {
        return this.content.length;
    }
    rescoreElement(node) {
        this.sinkDown(this.content.indexOf(node));
    }
    sinkDown(n) {
        const element = this.content[n];
        while (n > 0) {
            const parentN = ((n + 1) >> 1) - 1;
            const parent = this.content[parentN];
            if (this.scoreFunction(element, parent) < 0) {
                this.content[parentN] = element;
                this.content[n] = parent;
                n = parentN;
            }
            else {
                break;
            }
        }
    }
    bubbleUp(n) {
        const length = this.content.length;
        const element = this.content[n];
        const elemScore = this.scoreFunction;
        while (true) {
            const child2N = (n + 1) << 1;
            const child1N = child2N - 1;
            let swap = null;
            let child1Score; // Hacky typing, just need ref
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
            }
            else {
                break;
            }
        }
    }
}
