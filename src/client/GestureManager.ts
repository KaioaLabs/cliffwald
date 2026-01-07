import * as Phaser from 'phaser';

interface Point { x: number; y: number; }

export class GestureManager {
    private scene: Phaser.Scene;
    private uiScene: Phaser.Scene;
    private points: Point[];
    private graphics?: Phaser.GameObjects.Graphics;
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    public isDrawing: boolean = false;
    private templates: Map<string, Point[]> = new Map();

    public onGestureRecognized?: (id: string, score: number, centroid: Point) => void;

    constructor(scene: Phaser.Scene, uiScene: Phaser.Scene) {
        this.scene = scene;
        this.uiScene = uiScene;
        this.points = [];
        
        // Setup Line Graphics
        this.graphics = this.uiScene.add.graphics();
        this.graphics.setDepth(100); // Ensure it's on top

        // Setup Magic Particle Trail
        this.emitter = this.uiScene.add.particles(0, 0, 'star', {
            lifespan: { min: 300, max: 800 },
            speed: { min: 50, max: 150 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            rotate: { min: 0, max: 360 },
            angle: { min: 0, max: 360 },
            tint: [0xff0000, 0x00ff00, 0x0088ff, 0xffff00, 0xff00ff, 0x00ffff], // "Estrellas de distintos colores"
            blendMode: 'ADD',
            emitting: false
        });

        this.setupTemplates();
        this.setupInput();
    }

    private setupInput() {
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Draw if Right Click OR (Left Click/Touch on Right Half of Screen)
            // This prevents conflict with Joystick (Left side) and UI buttons (usually corners, but mainly joystick)
            const isRightClick = pointer.rightButtonDown();
            const isDrawZone = pointer.x > this.scene.scale.width * 0.4; // Generous right zone
            
            if (isRightClick || isDrawZone) {
                this.isDrawing = true;
                this.points = [{ x: pointer.x, y: pointer.y }];
                this.emitter.setPosition(pointer.x, pointer.y);
                this.emitter.start();

                if (this.graphics) {
                    this.graphics.clear();
                    this.graphics.lineStyle(4, 0x00ffff, 0.8);
                    this.graphics.blendMode = Phaser.BlendModes.ADD;
                    this.graphics.beginPath();
                    this.graphics.moveTo(pointer.x, pointer.y);
                }
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.points.push({ x: pointer.x, y: pointer.y });
                this.emitter.setPosition(pointer.x, pointer.y);
                
                if (this.graphics) {
                    this.graphics.lineTo(pointer.x, pointer.y);
                    this.graphics.strokePath();
                }
            }
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.emitter.stop();
                
                if (this.graphics) {
                    this.graphics.clear();
                }

                this.recognizeGesture();
                this.points = [];
            }
        });
    }

    // private drawPath() REMOVED

    private recognizeGesture() {
        if (this.points.length < 10) return;
        const candidate = this.normalizePipeline(this.points);
        const result = this.recognize(candidate);

        if (result.score > 0.7) {
            const rawCentroid = this.getCentroid(this.points);
            if (this.onGestureRecognized) {
                this.onGestureRecognized(result.id, result.score, rawCentroid);
            }
        }
    }

    private recognize(candidate: Point[]): { id: string, score: number } {
        let bestScore = 0;
        let bestId = "unknown";

        for (const [id, template] of this.templates) {
            const score = this.compare(candidate, template);
            if (score > bestScore) {
                bestScore = score;
                bestId = id;
            }
        }
        
        return { id: bestId.split('#')[0], score: bestScore };
    }

    private compare(pts1: Point[], pts2: Point[]): number {
        let distance = 0;
        for (let i = 0; i < pts1.length; i++) {
            const dx = pts1[i].x - pts2[i].x;
            const dy = pts1[i].y - pts2[i].y;
            distance += Math.sqrt(dx * dx + dy * dy);
        }
        return Math.max(0, 1 - (distance / pts1.length) / 100);
    }

    private normalizePipeline(pts: Point[]): Point[] {
        let resampled = this.resample(pts, 64);
        resampled = this.rotateToZero(resampled);
        resampled = this.scaleTo(resampled, 100);
        return this.translateToOrigin(resampled);
    }

    private setupTemplates() {
        this.templates.set("line", this.normalizePipeline([{ x: 0, y: 0 }, { x: 100, y: 0 }]));
        this.templates.set("circle", this.normalizePipeline(this.createPolygonPoints(32, 100, -Math.PI / 2)));
        this.addRotatedTemplates("triangle", [{ x: 0, y: 100 }, { x: 50, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
        this.addRotatedTemplates("square", [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }]);
    }

    private addRotatedTemplates(baseName: string, pts: Point[]) {
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const rotated = pts.map(p => this.rotatePoint(p, angle));
            this.templates.set(`${baseName}#${i}`, this.normalizePipeline(rotated));
        }
    }

    private rotatePoint(p: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: p.x * cos - p.y * sin,
            y: p.x * sin + p.y * cos
        };
    }

    private resample(points: Point[], n: number): Point[] {
        const length = this.pathLength(points);
        if (length === 0) return Array(n).fill({ ...points[0] });
        const I = length / (n - 1);
        let D = 0;
        const newPoints = [{ ...points[0] }];
        const pts = [...points];
        for (let i = 1; i < pts.length; i++) {
            const d = Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) + Math.pow(pts[i].y - pts[i - 1].y, 2));
            if (D + d >= I) {
                const q = {
                    x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x),
                    y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y)
                };
                newPoints.push(q);
                pts.splice(i, 0, q);
                D = 0;
            } else {
                D += d;
            }
        }
        while (newPoints.length < n) newPoints.push({ ...pts[pts.length - 1] });
        return newPoints.slice(0, n);
    }

    private pathLength(points: Point[]): number {
        let d = 0;
        for (let i = 1; i < points.length; i++) {
            d += Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2) + Math.pow(points[i].y - points[i - 1].y, 2));
        }
        return d;
    }

    private rotateToZero(points: Point[]): Point[] {
        const c = this.getCentroid(points);
        const theta = Math.atan2(c.y - points[0].y, c.x - points[0].x);
        return points.map(p => this.rotatePoint(p, -theta));
    }

    private scaleTo(points: Point[], size: number): Point[] {
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        const w = maxX - minX;
        const h = maxY - minY;
        if (w === 0 || h === 0) return points;
        return points.map(p => ({ x: (p.x - minX) * (size / w), y: (p.y - minY) * (size / h) }));
    }

    private translateToOrigin(points: Point[]): Point[] {
        const c = this.getCentroid(points);
        return points.map(p => ({ x: p.x - c.x, y: p.y - c.y }));
    }

    private getCentroid(points: Point[]): Point {
        let x = 0, y = 0;
        points.forEach(p => { x += p.x; y += p.y; });
        return { x: x / points.length, y: y / points.length };
    }

    private createPolygonPoints(sides: number, radius: number, startAngle: number): Point[] {
        const pts: Point[] = [];
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (i / sides) * Math.PI * 2;
            pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
        return pts;
    }
}