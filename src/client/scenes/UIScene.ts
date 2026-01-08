import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';
import { THEME } from '../../shared/Theme';
import { VirtualJoystick } from '../VirtualJoystick';

export class UIScene extends Phaser.Scene {
    clockText?: Phaser.GameObjects.Text;
    pvpStatusText?: Phaser.GameObjects.Text;
    joystick?: VirtualJoystick;

    // Prestige UI
    pillars: Map<string, { fill: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text }> = new Map();

    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        console.log("UIScene Created");
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);

        // Clock Text (Top Right)
        this.clockText = this.add.text(this.scale.width - 20, 20, '00:00', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: THEME.UI.TEXT_WHITE,
            backgroundColor: THEME.UI.BACKGROUND_DIM,
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0); 

        // Prestige Pillars Container (Left of Clock)
        this.createPrestigeUI();

        // PvP Status Text (Below Clock)
        this.pvpStatusText = this.add.text(this.scale.width - 20, 55, 'PVP: OFF', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: THEME.UI.PVP_OFF,
            backgroundColor: THEME.UI.BACKGROUND_DIM,
            padding: { x: 10, y: 3 }
        }).setOrigin(1, 0);

        // ... mobile logic ...
        const isMobile = !this.sys.game.device.os.desktop;
        if (isMobile) {
            this.joystick = new VirtualJoystick(this, 0, 0);
        }

        this.scale.on('resize', (gameSize: any) => {
            this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
            if (this.clockText) this.clockText.setPosition(gameSize.width - 20, 20);
            if (this.pvpStatusText) this.pvpStatusText.setPosition(gameSize.width - 20, 55);
            this.repositionPrestigeUI(gameSize.width);
        });

        // ALBUM BUTTON (Bottom Right)
        const albumBtn = this.add.rectangle(this.scale.width - 40, this.scale.height - 40, 40, 40, 0x663300)
            .setInteractive({ cursor: 'pointer' });
        this.add.text(this.scale.width - 40, this.scale.height - 40, '📘', { fontSize: '20px' }).setOrigin(0.5);
        
        albumBtn.on('pointerdown', () => {
            // Get player collection from GameScene
            const gameScene = this.scene.get('GameScene') as any;
            const room = gameScene.network?.room;
            if (room) {
                const player = room.state.players.get(room.sessionId);
                // Map inventory schema objects to simple ID strings
                const collection = player ? player.inventory.map((i: any) => i.itemId) : [];
                this.scene.launch('CardAlbumScene', { collection });
                this.scene.bringToTop('CardAlbumScene');
            }
        });
    }

    createPrestigeUI() {
        const startX = this.scale.width - 160;
        const startY = 20;
        const houses = [
            { id: 'ignis', color: THEME.HOUSES.IGNIS, label: 'I' },
            { id: 'axiom', color: THEME.HOUSES.AXIOM, label: 'A' },
            { id: 'vesper', color: THEME.HOUSES.VESPER, label: 'V' }
        ];

        houses.forEach((house, index) => {
            const x = startX + (index * 25);
            
            // Background
            this.add.rectangle(x, startY + 20, 15, 40, 0x000000, 0.5).setOrigin(0.5, 0);
            
            // Fill
            const fill = this.add.rectangle(x, startY + 60, 15, 0, house.color).setOrigin(0.5, 1);
            
            // Label
            const text = this.add.text(x, startY + 5, '0', {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: THEME.UI.TEXT_WHITE
            }).setOrigin(0.5);

            this.pillars.set(house.id, { fill, text });
        });
    }

    repositionPrestigeUI(width: number) {
        const startX = width - 160;
        const houses = ['ignis', 'axiom', 'vesper'];
        houses.forEach((id, index) => {
            const p = this.pillars.get(id);
            if (p) {
                const x = startX + (index * 25);
                p.fill.x = x;
                p.text.x = x;
                // Update background too? (Better to use a container, but this is simple)
            }
        });
    }

    updatePoints(ignis: number, axiom: number, vesper: number) {
        const maxDisplay = Math.max(ignis, axiom, vesper, 100); // Scale relative to max
        
        const updatePillar = (id: string, val: number) => {
            const p = this.pillars.get(id);
            if (p) {
                const height = (val / maxDisplay) * 40;
                p.fill.height = height;
                p.text.setText(val.toString());
            }
        };

        updatePillar('ignis', ignis);
        updatePillar('axiom', axiom);
        updatePillar('vesper', vesper);
    }

    updateTime(totalSeconds: number, course: number, month: string) {
        if (!this.clockText) return; 
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        
        this.clockText.setText(`${hStr}:${mStr}\nCourse ${course}\n${month}`);
    }
}
