import Phaser from 'phaser';
import { GET_ALL_CARDS, ItemDefinition } from '../../shared/data/ItemRegistry';
import { THEME } from '../../shared/Theme';

export class CardAlbumScene extends Phaser.Scene {
    private collection: Set<string> = new Set();

    constructor() {
        super({ key: 'CardAlbumScene' });
    }

    create(data: { collection: (number | string)[] }) {
        // Normalize collection to string IDs
        this.collection = new Set(data.collection.map(id => 
            typeof id === 'number' ? `card_${id}` : id
        ));

        // Background (Dimmed)
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive(); // Block clicks below

        // Title
        this.add.text(this.scale.width / 2, 30, 'Wizard Card Album', {
            fontSize: '24px',
            fontFamily: 'serif',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Close Button
        const closeBtn = this.add.text(this.scale.width - 30, 30, 'X', {
            fontSize: '24px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        
        closeBtn.on('pointerdown', () => this.scene.stop());

        // Render Cards Grid
        this.renderGrid();
    }

    renderGrid() {
        const cards = GET_ALL_CARDS();
        const startX = 60;
        const startY = 80;
        const gapX = 70;
        const gapY = 90;
        const cols = Math.floor((this.scale.width - 100) / gapX);

        cards.forEach((card, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * gapX;
            const y = startY + row * gapY;

            this.renderCardSlot(x, y, card);
        });
    }

    renderCardSlot(x: number, y: number, card: ItemDefinition) {
        const isUnlocked = this.collection.has(card.ID);
        
        // Frame based on Rarity
        let frameKey = 'frame_bronze';
        if (card.Rarity === 'Silver') frameKey = 'frame_silver';
        if (card.Rarity === 'Gold') frameKey = 'frame_gold';

        // 1. Frame Background
        const bg = this.add.rectangle(x, y, 48, 64, 0x222222).setStrokeStyle(1, 0x444444);

        // 2. Card Image (if unlocked)
        if (isUnlocked) {
            // Check if texture exists, else use placeholder color
            if (this.textures.exists(card.ID)) {
                this.add.image(x, y, card.ID).setDisplaySize(40, 56);
            } else {
                this.add.text(x, y, '?', { fontSize: '20px' }).setOrigin(0.5);
            }
            
            // Name tooltip on hover
            bg.setInteractive();
            bg.on('pointerover', () => this.showTooltip(x, y, card));
            bg.on('pointerout', () => this.hideTooltip());
        } else {
            // Locked visual
            this.add.text(x, y, '🔒', { fontSize: '16px', color: '#555' }).setOrigin(0.5);
        }

        // 3. Frame Overlay
        if (this.textures.exists(frameKey)) {
            this.add.image(x, y, frameKey).setDisplaySize(54, 72);
        }
    }

    tooltipContainer?: Phaser.GameObjects.Container;

    showTooltip(x: number, y: number, card: ItemDefinition) {
        this.hideTooltip();
        
        const container = this.add.container(x, y - 60);
        const text = this.add.text(0, 0, card.Name + '\n' + card.Description, {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 4 },
            wordWrap: { width: 120 }
        }).setOrigin(0.5);
        
        container.add(text);
        container.setDepth(100);
        this.tooltipContainer = container;
    }

    hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.destroy();
            this.tooltipContainer = undefined;
        }
    }
}
