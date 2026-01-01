import Phaser from 'phaser';

export class VirtualJoystick extends Phaser.GameObjects.Container {
    private base: Phaser.GameObjects.Arc;
    private stick: Phaser.GameObjects.Arc;
    private _isDown: boolean = false;
    private _pointer?: Phaser.Input.Pointer;
    
    // Config
    private readonly RADIUS = 60;
    
    // Output
    public forceX: number = 0;
    public forceY: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        scene.add.existing(this);
        
        // Start Invisible (Dynamic Mode)
        this.setVisible(false);

        // 1. Base (Dark Circle)
        this.base = scene.add.circle(0, 0, this.RADIUS, 0x888888, 0.5);
        this.base.setStrokeStyle(4, 0xaaaaaa);
        this.add(this.base);

        // 2. Stick (White Circle)
        this.stick = scene.add.circle(0, 0, 30, 0xffffff, 0.8);
        this.add(this.stick);

        // 3. Global Interaction (Whole Screen)
        // We listen to the SCENE input, not the circle itself for the start event
        scene.input.on('pointerdown', this.onScenePointerDown, this);
        scene.input.on('pointermove', this.onPointerMove, this);
        scene.input.on('pointerup', this.onPointerUp, this);
    }

    private onScenePointerDown(pointer: Phaser.Input.Pointer) {
        // Only activate if touch is in the BOTTOM-LEFT Quadrant
        // X < 40% width AND Y > 40% height
        const isBottomLeft = pointer.x < (this.scene.scale.width * 0.4) && 
                             pointer.y > (this.scene.scale.height * 0.4);

        if (isBottomLeft) {
            this._isDown = true;
            this._pointer = pointer;
            
            // Move joystick to touch position
            this.setPosition(pointer.x, pointer.y);
            this.setVisible(true);
            this.base.setAlpha(0.8);
            
            // Reset stick center
            this.stick.setPosition(0, 0);
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (!this._isDown || this._pointer !== pointer) return;

        const x = pointer.x - this.x; // Local X relative to container
        const y = pointer.y - this.y; // Local Y relative to container
        
        const dist = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x);

        // Clamp distance to radius
        const force = Math.min(dist, this.RADIUS);
        
        const setX = Math.cos(angle) * force;
        const setY = Math.sin(angle) * force;

        this.stick.setPosition(setX, setY);

        // Normalize output (-1 to 1)
        this.forceX = setX / this.RADIUS;
        this.forceY = setY / this.RADIUS;
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        if (this._pointer === pointer) {
            this._isDown = false;
            this._pointer = undefined;
            this.stick.setPosition(0, 0);
            this.forceX = 0;
            this.forceY = 0;
            this.base.setAlpha(0.5);
            this.setVisible(false); // Hide when done
        }
    }

    public getInput() {
        // Convert analog force to D-Pad boolean logic for compatibility
        // Threshold of 0.3 avoids drift
        return {
            left: this.forceX < -0.3,
            right: this.forceX > 0.3,
            up: this.forceY < -0.3,
            down: this.forceY > 0.3
        };
    }
}
