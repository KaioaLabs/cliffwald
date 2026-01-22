import Phaser from 'phaser';
import { CONFIG } from '../../shared/Config';
import { THEME } from '../../shared/Theme';
import { VirtualJoystick } from '../VirtualJoystick';

export class UIScene extends Phaser.Scene {
    joystick?: VirtualJoystick;

    // Prestige UI
    pillars: Map<string, { fill: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text }> = new Map();
    prestigeHitArea?: Phaser.GameObjects.Zone;
    tooltipContainer?: Phaser.GameObjects.Container;
    tooltipText?: Phaser.GameObjects.Text;
    currentPoints = { ignis: 0, axiom: 0, vesper: 0 };

    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        console.log("UIScene Created");
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);

        // Prestige Pillars Container (Left of Clock)
        this.createPrestigeUI();

        // ... mobile logic ...
        // Modern Mobile Detection (2026)
        // Ensure we don't trigger "Mobile Mode" (Joystick) on Touch Laptops (Large Screens)
        const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouch = navigator.maxTouchPoints > 0 || (window as any).matchMedia("(any-pointer: coarse)").matches;
        const isSmallScreen = this.scale.width < 1024; // Use game scale width

        const isMobile = uaMobile || (isTouch && isSmallScreen);
        
        if (isMobile) {
            this.joystick = new VirtualJoystick(this, 0, 0);
        }

        this.scale.on('resize', (gameSize: any) => {
            this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
            this.repositionPrestigeUI(gameSize.width);
        });
    }

    createPrestigeUI() {
        const layout = THEME.LAYOUT.PRESTIGE;
        const startX = this.scale.width - layout.WIDTH_OFFSET;
        const startY = layout.START_Y;
        const houses = [
            { id: 'ignis', color: THEME.HOUSES.IGNIS, label: 'I' },
            { id: 'axiom', color: THEME.HOUSES.AXIOM, label: 'A' },
            { id: 'vesper', color: THEME.HOUSES.VESPER, label: 'V' }
        ];

        houses.forEach((house, index) => {
            const x = startX + (index * layout.SPACING_X);
            
            // Background
            this.add.rectangle(x, startY + 20, layout.PILLAR_WIDTH, layout.PILLAR_MAX_HEIGHT, 0x000000, 0.5).setOrigin(0.5, 0);
            
            // Fill
            const fill = this.add.rectangle(x, startY + 60, layout.PILLAR_WIDTH, 0, house.color).setOrigin(0.5, 1);
            
            // Label
            const text = this.add.text(x, startY + 5, '0', {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: THEME.UI.TEXT_WHITE
            }).setOrigin(0.5);

            this.pillars.set(house.id, { fill, text });
        });

        // Hit Area for Tooltip (Covers all 3 pillars)
        // 3 pillars * 25px = 75px wide approx.
        const centerX = startX + layout.SPACING_X; 
        this.prestigeHitArea = this.add.zone(centerX, startY + 30, layout.SPACING_X * 3.2, 60)
            .setInteractive({ cursor: 'pointer' });

        // Tooltip Container
        this.tooltipContainer = this.add.container(startX, startY + layout.TOOLTIP_OFFSET_Y).setVisible(false).setDepth(100);
        
        const bg = this.add.rectangle(0, 0, layout.TOOLTIP_WIDTH, layout.TOOLTIP_HEIGHT, 0x000000, 0.9).setOrigin(0.5, 0);
        bg.setStrokeStyle(1, 0xFFFFFF);
        this.tooltipContainer.add(bg);

        this.tooltipText = this.add.text(0, 10, "", {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0);
        this.tooltipContainer.add(this.tooltipText);

        // Interaction
        this.prestigeHitArea.on('pointerover', () => {
            this.updateTooltipText();
            this.tooltipContainer?.setVisible(true);
        });

        this.prestigeHitArea.on('pointerout', () => {
            this.tooltipContainer?.setVisible(false);
        });
        
        this.prestigeHitArea.on('pointerdown', () => {
             // Toggle for mobile
             if (this.tooltipContainer) {
                 this.tooltipContainer.setVisible(!this.tooltipContainer.visible);
                 if (this.tooltipContainer.visible) this.updateTooltipText();
             }
        });
    }

    updateTooltipText() {
        if (!this.tooltipText) return;
        this.tooltipText.setText(
            `IGNIS: ${this.currentPoints.ignis}\n` +
            `AXIOM: ${this.currentPoints.axiom}\n` +
            `VESPER: ${this.currentPoints.vesper}`
        );
    }

    repositionPrestigeUI(width: number) {
        const layout = THEME.LAYOUT.PRESTIGE;
        const startX = width - layout.WIDTH_OFFSET;
        const houses = ['ignis', 'axiom', 'vesper'];
        houses.forEach((id, index) => {
            const p = this.pillars.get(id);
            if (p) {
                const x = startX + (index * layout.SPACING_X);
                p.fill.x = x;
                p.text.x = x;
            }
        });
        
        // Move Hit Area
        if (this.prestigeHitArea) {
             const centerX = startX + layout.SPACING_X; 
             this.prestigeHitArea.setPosition(centerX, layout.START_Y + 30);
        }

        // Move Tooltip
        if (this.tooltipContainer) {
            this.tooltipContainer.setPosition(startX + layout.SPACING_X, layout.START_Y + layout.TOOLTIP_OFFSET_Y);
        }
    }

    updatePoints(ignis: number, axiom: number, vesper: number) {
        this.currentPoints = { ignis, axiom, vesper }; // Store for tooltip
        const layout = THEME.LAYOUT.PRESTIGE;

        const maxDisplay = Math.max(ignis, axiom, vesper, 100); // Scale relative to max
        
        const updatePillar = (id: string, val: number) => {
            const p = this.pillars.get(id);
            if (p) {
                const height = (val / maxDisplay) * layout.PILLAR_MAX_HEIGHT;
                p.fill.height = height;
                p.text.setText(val.toString());
            }
        };

        updatePillar('ignis', ignis);
        updatePillar('axiom', axiom);
        updatePillar('vesper', vesper);
        
        // If tooltip is open, update it live
        if (this.tooltipContainer?.visible) {
            this.updateTooltipText();
        }
    }
}
