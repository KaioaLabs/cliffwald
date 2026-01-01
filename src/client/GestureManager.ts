import Phaser from 'phaser';

// Configuration
const MATCH_THRESHOLD = 0.65; // Tolerance (Lower is stricter)
const RESAMPLE_POINTS = 64;
const SIZE_BOX = 250.0;
const MIN_DISTANCE_SQR = 20.0;

export type GestureResult = {
    id: string;
    score: number;
    centroid?: Phaser.Math.Vector2;
};

export class GestureManager {
    private inputScene: Phaser.Scene;
    private renderScene: Phaser.Scene;
    private points: Phaser.Math.Vector2[] = [];
    private recording: boolean = false;
    private graphics: Phaser.GameObjects.Graphics;
    private templates: Map<string, Phaser.Math.Vector2[]> = new Map();
    
    public onGestureRecognized?: (id: string, score: number, centroid: Phaser.Math.Vector2) => void;

    constructor(inputScene: Phaser.Scene, renderScene: Phaser.Scene) {
        this.inputScene = inputScene;
        this.renderScene = renderScene;
        
        // Draw on the UI Scene (No zoom/scroll)
        this.graphics = this.renderScene.add.graphics();
        this.graphics.setDepth(999999);
        
        this.buildTemplates();
        this.setupInput();
    }

    private setupInput() {
        this.inputScene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Now using Left Click for gestures
            if (pointer.leftButtonDown()) {
                this.startRecording(pointer);
            }
        });

        this.inputScene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.recording) {
                this.addPoint(pointer);
            }
        });

        this.inputScene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.recording) {
                this.stopRecording();
            }
        });
        
        // Safety: Stop if focus lost
        this.inputScene.game.events.on('blur', () => this.stopRecording(true));
    }

    private startRecording(pointer: Phaser.Input.Pointer) {
        // SAFETY: Ignore touches in the BOTTOM-LEFT Quadrant (Joystick Zone)
        // Match the VirtualJoystick logic: X < 40% AND Y > 40%
        const isBottomLeft = pointer.x < (this.inputScene.scale.width * 0.4) && 
                             pointer.y > (this.inputScene.scale.height * 0.4);
        
        // If mobile (can check via capability), prioritize joystick in that corner
        if (isBottomLeft && !this.inputScene.sys.game.device.os.desktop) {
             return;
        }

        this.recording = true;
        this.points = [];
        this.points.push(new Phaser.Math.Vector2(pointer.position.x, pointer.position.y));
        this.updateVisuals();
    }

    private addPoint(pointer: Phaser.Input.Pointer) {
        const pos = new Phaser.Math.Vector2(pointer.position.x, pointer.position.y);
        if (this.points.length === 0 || pos.distanceSq(this.points[this.points.length - 1]) > MIN_DISTANCE_SQR) {
            this.points.push(pos);
            this.updateVisuals();
        }
    }

    private stopRecording(cancel: boolean = false) {
        this.recording = false;
        
        if (!cancel && this.points.length > 5 && this.getPathLength(this.points) > 50) {
            this.processGesture();
        }
        
        this.graphics.clear();
    }

            private updateVisuals() {

                this.graphics.clear();

                if (this.points.length < 2) return;

        

                this.graphics.lineStyle(4, 0x00ffff, 0.8); // Cyan, nice and visible

                this.graphics.beginPath();        this.graphics.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            this.graphics.lineTo(this.points[i].x, this.points[i].y);
        }
        this.graphics.strokePath();
    }

    private processGesture() {
        // Calculate centroid of the raw drawing (screen space) before normalization
        const rawCentroid = this.getCentroid(this.points);
        
        const candidate = this.normalizePipeline(this.points);
        const result = this.recognize(candidate);
        
        // Clean ID (remove permutations like #0, #1)
        const finalId = result.id.split('#')[0];
        
        console.log(`[GESTURE] Input: ${finalId} (Raw: ${result.id}) | Score: ${result.score.toFixed(3)}`);

        // DISABLE LINE SPELL (PvP Rules)
        if (finalId === 'line') {
            console.log("Line spell is disabled for PvP.");
            return;
        }

        if (finalId && result.score < MATCH_THRESHOLD) {
            console.log(`%c✨ CAST: ${finalId}`, 'color: #00ff00; font-weight: bold;');
            if (this.onGestureRecognized) {
                this.onGestureRecognized(finalId, result.score, rawCentroid);
            }
        } else {
            console.log(`%c❌ Unclear`, 'color: #ff0000;');
        }
    }

    // --- CORE RECOGNITION ---

    private recognize(candidate: Phaser.Math.Vector2[]): GestureResult {
        let bestDist = Infinity;
        let bestId = "";

        // Reverse candidate to handle drawing direction invariance (CW vs CCW)
        const candidateReversed = [...candidate].reverse();

        for (const [id, template] of this.templates) {
            const d1 = this.pathDistance(candidate, template);
            const d2 = this.pathDistance(candidateReversed, template);
            const dist = Math.min(d1, d2);

            if (dist < bestDist) {
                bestDist = dist;
                bestId = id;
            }
        }

        const avgDist = bestDist / SIZE_BOX;
        return { id: bestId, score: avgDist };
    }

    // --- TEMPLATES ---

    private buildTemplates() {
        // 1. Line (Vertical Swipe Up)
        const linePts = [new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(0, -100)];
        this.templates.set("line", this.normalizePipeline(linePts));

        // 2. Circle
        this.templates.set("circle", this.normalizePipeline(this.createPolygonPoints(32, 100, -Math.PI / 2)));

        // 3. Triangle (Permutations for starting point)
        const trianglePts = this.createPolygonPoints(3, 100, -Math.PI / 2);
        this.addPermutations("triangle", trianglePts, 3);

        // 4. Square (Permutations)
        const squarePts = this.createPolygonPoints(4, 100, -Math.PI / 4);
        this.addPermutations("square", squarePts, 4);
    }

    private addPermutations(baseName: string, rawPts: Phaser.Math.Vector2[], sides: number) {
        // We resample first to get a dense array, then shift the starting point
        const pts = this.resample(rawPts, RESAMPLE_POINTS);
        const step = Math.floor(pts.length / sides);

        for (let i = 0; i < sides; i++) {
            const rotated = [...pts];
            // Rotate array elements 'step * i' times
            const shiftCount = step * i;
            for (let k = 0; k < shiftCount; k++) {
                const first = rotated.shift();
                if (first) rotated.push(first);
            }
            this.templates.set(`${baseName}#${i}`, this.normalizePipeline(rotated));
        }
    }

    private createPolygonPoints(sides: number, radius: number, startAngle: number): Phaser.Math.Vector2[] {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (Math.PI * 2 * i / sides);
            pts.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }
        pts.push(pts[0].clone()); // Close loop
        return pts;
    }

    // --- PIPELINE ---

    private normalizePipeline(rawPts: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
        let pts = this.resample(rawPts, RESAMPLE_POINTS);
        pts = this.rotateToZero(pts);
        pts = this.scaleToSquare(pts, SIZE_BOX);
        pts = this.translateToOrigin(pts);
        return pts;
    }

    private resample(pts: Phaser.Math.Vector2[], n: number): Phaser.Math.Vector2[] {
        const I = this.getPathLength(pts) / (n - 1);
        let D = 0;
        const newPts: Phaser.Math.Vector2[] = [pts[0].clone()];
        
        // We clone inputs to avoid modifying original array in place during iteration logic if not careful
        // But here we need to insert points into the list we are iterating? 
        // The original logic inserted into the list. Let's adapt to not mutate source if possible, or copy first.
        const workingPts = pts.map(p => p.clone());

        let i = 1;
        while (i < workingPts.length) {
            const d = workingPts[i - 1].distance(workingPts[i]);
            if ((D + d) >= I) {
                const t = (I - D) / d;
                const q = new Phaser.Math.Vector2(
                    workingPts[i - 1].x + t * (workingPts[i].x - workingPts[i - 1].x),
                    workingPts[i - 1].y + t * (workingPts[i].y - workingPts[i - 1].y)
                );
                newPts.push(q);
                // Insert q back into workingPts to maintain continuity
                workingPts.splice(i, 0, q);
                D = 0;
                i++; 
            } else {
                D += d;
                i++;
            }
        }

        // Floating point errors might leave us one short
        while (newPts.length < n) {
            newPts.push(workingPts[workingPts.length - 1].clone());
        }
        
        return newPts;
    }

    private rotateToZero(pts: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
        const c = this.getCentroid(pts);
        const angle = Math.atan2(c.y - pts[0].y, c.x - pts[0].x);
        return this.rotateBy(pts, -angle, c);
    }

    private rotateBy(pts: Phaser.Math.Vector2[], radians: number, pivot: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
        const newPts: Phaser.Math.Vector2[] = [];
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        for (const p of pts) {
            const dx = p.x - pivot.x;
            const dy = p.y - pivot.y;
            newPts.push(new Phaser.Math.Vector2(
                dx * cos - dy * sin + pivot.x,
                dx * sin + dy * cos + pivot.y
            ));
        }
        return newPts;
    }

    private scaleToSquare(pts: Phaser.Math.Vector2[], size: number): Phaser.Math.Vector2[] {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        
        const w = maxX - minX;
        const h = maxY - minY;
        
        return pts.map(p => new Phaser.Math.Vector2(
            (p.x - minX) * (size / Math.max(w, 0.01)),
            (p.y - minY) * (size / Math.max(h, 0.01))
        ));
    }

    private translateToOrigin(pts: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
        const c = this.getCentroid(pts);
        return pts.map(p => p.subtract(c));
    }

    private getCentroid(pts: Phaser.Math.Vector2[]): Phaser.Math.Vector2 {
        let sumX = 0, sumY = 0;
        for (const p of pts) {
            sumX += p.x;
            sumY += p.y;
        }
        return new Phaser.Math.Vector2(sumX / pts.length, sumY / pts.length);
    }

    private getPathLength(pts: Phaser.Math.Vector2[]): number {
        let d = 0;
        for (let i = 1; i < pts.length; i++) {
            d += pts[i - 1].distance(pts[i]);
        }
        return d;
    }

    private pathDistance(a: Phaser.Math.Vector2[], b: Phaser.Math.Vector2[]): number {
        let d = 0;
        const n = Math.min(a.length, b.length);
        for (let i = 0; i < n; i++) {
            d += a[i].distance(b[i]);
        }
        return d / n;
    }
}