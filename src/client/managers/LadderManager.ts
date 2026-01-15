import Phaser from 'phaser';

export class LadderManager {
    private scene: Phaser.Scene;
    
    // Ladder State
    public ladderObj?: Phaser.GameObjects.Container;
    public ladderBounds?: { min: number, max: number };
    public climbingState?: { active: boolean, ladderX: number, climbHeight: number };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public setup(x: number, y: number) {
        // --- LADDER VISUALS & LOGIC ---
        // Create Visual Shelf (Texture generated in AssetManager)
        const shelf = this.scene.add.image(x, y, 'grand_bookshelf_v2');
        shelf.setOrigin(0.5, 1.0);
        shelf.setDepth(y - 50); // Behind ladder
        
        // Add Ladder Rail
        const railY = y - 280; // Top of ladder
        const rail = this.scene.add.rectangle(x, railY, 500, 4, 0x111111);
        rail.setDepth(y + 1000); // Always on top? No, just high Z
        
        // Create Ladder Container
        const ladder = this.scene.add.container(x, y);
        ladder.setDepth(y + 50); // Slightly in front of shelf base
        
        const ladderGfx = this.scene.add.graphics();
        ladderGfx.lineStyle(4, 0x5d4037);
        ladderGfx.beginPath();
        ladderGfx.moveTo(-15, 0); ladderGfx.lineTo(-15, -280); // Left rail
        ladderGfx.moveTo(15, 0); ladderGfx.lineTo(15, -280);   // Right rail
        for(let i=0; i<8; i++) {
            const ry = -20 - (i*35);
            ladderGfx.moveTo(-15, ry); ladderGfx.lineTo(15, ry); // Rungs
        }
        ladderGfx.strokePath();
        ladder.add(ladderGfx);
        
        // Wheels
        const wheelL = this.scene.add.circle(-15, 0, 5, 0x000000);
        const wheelR = this.scene.add.circle(15, 0, 5, 0x000000);
        ladder.add(wheelL); ladder.add(wheelR);
        
        // Interaction Zone (Visual only now)
        const ladderZone = this.scene.add.zone(0, -140, 60, 300);
        ladder.add(ladderZone);
        
        const LADDER_MIN_X = x - 230;
        const LADDER_MAX_X = x + 230;
        
        // Store reference
        this.ladderObj = ladder;
        this.ladderBounds = { min: LADDER_MIN_X, max: LADDER_MAX_X };
    }

    public handleInteraction(
        player: any, 
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined,
        wasd: any
    ): boolean {
        const climb = this.climbingState;
        const ladder = this.ladderObj;
        const bounds = this.ladderBounds;

        if (ladder && player && player.visual?.sprite) {
            // Check Mount
            if (!climb?.active) {
                const sprite = player.visual.sprite;
                // Distance to Ladder Base
                const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, ladder.x, ladder.y);
                
                // If pressing UP and near ladder (< 40px)
                if (dist < 40 && (cursors?.up.isDown || wasd?.W.isDown)) {
                    console.log("[LADDER] Mounting Ladder!");
                    this.climbingState = {
                        active: true,
                        ladderX: ladder.x,
                        climbHeight: 0
                    };
                    return true;
                }
            }
        }

        if (climb?.active && ladder && bounds && cursors && wasd) {
            // --- LADDER MOVEMENT ---
            const speed = 2.0; // Ladder slide speed
            const climbSpeed = 2.0;

            // Horizontal (Slide Ladder)
            if (cursors.left.isDown || wasd.A.isDown) {
                ladder.x = Math.max(bounds.min, ladder.x - speed);
            } else if (cursors.right.isDown || wasd.D.isDown) {
                ladder.x = Math.min(bounds.max, ladder.x + speed);
            }

            // Vertical (Climb Player)
            if (cursors.up.isDown || wasd.W.isDown) {
                climb.climbHeight = Math.min(250, climb.climbHeight + climbSpeed);
            } else if (cursors.down.isDown || wasd.S.isDown) {
                // Check Dismount
                if (climb.climbHeight <= 0) {
                    this.climbingState = { active: false, ladderX: 0, climbHeight: 0 };
                    if (player) player.climbOffset = 0;
                    return true;
                }
                climb.climbHeight = Math.max(0, climb.climbHeight - climbSpeed);
            }

            // Sync Player Visuals
            if (player && player.visual?.sprite) {
                // Force X to ladder X, Y to ladder Base Y
                // Direct override:
                player.visual.sprite.x = ladder.x;
                player.visual.sprite.y = ladder.y; // Base
                player.climbOffset = -climb.climbHeight; // Negative to go UP
                player.visual.sprite.setDepth(ladder.y + 100);
            }

            return true;
        }

        return false;
    }
}
