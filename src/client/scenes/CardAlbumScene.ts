import Phaser from 'phaser';
import { CARD_REGISTRY } from '../../shared/data/CardRegistry';
import { THEME } from '../../shared/Theme';

export class CardAlbumScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CardAlbumScene' });
    }

    create(data: { collection: number[] }) {
        // Overlay background
        this.add.rectangle(320, 180, 600, 320, 0x000000, 0.95).setStrokeStyle(2, 0xFFD700);
        
        this.add.text(320, 30, 'MAGIC ENCYCLOPEDIA', {
            fontSize: '22px',
            fontFamily: 'serif',
            color: '#FFD700'
        }).setOrigin(0.5);

        // Progress text
        const total = Object.keys(CARD_REGISTRY).length;
        const owned = data.collection.length;
        this.add.text(320, 55, `Collection: ${owned} / ${total}`, { fontSize: '12px', color: '#aaaaaa' }).setOrigin(0.5);

        // Close Button
        this.add.text(590, 30, 'X', { fontSize: '24px', color: '#ff0000' })
            .setInteractive({ cursor: 'pointer' })
            .on('pointerdown', () => this.scene.stop());

        // Grid Configuration (6 cols x 3 rows fits 18 cards)
        const cards = Object.values(CARD_REGISTRY);
        const cols = 6;
        const startX = 85;
        const startY = 110;
        const spacingX = 95;
        const spacingY = 90;

        const infoText = this.add.text(320, 330, 'Select a card to read its lore', {
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 500 },
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        cards.forEach((card, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const isOwned = data.collection.includes(card.id);
            const color = isOwned ? 0x554400 : 0x222222;

            const cardBg = this.add.rectangle(x, y, 80, 70, color)
                .setStrokeStyle(1, isOwned ? 0xFFD700 : 0x444444)
                .setInteractive({ cursor: isOwned ? 'pointer' : 'default' });
            
            this.add.text(x, y + 20, isOwned ? card.name : '???', {
                fontSize: '9px',
                color: isOwned ? '#ffffff' : '#666666',
                align: 'center',
                wordWrap: { width: 75 }
            }).setOrigin(0.5);

            if (isOwned) {
                // Rarity Icon
                const rColor = card.rarity === 'legendary' ? 0xff00ff : (card.rarity === 'rare' ? 0x0088ff : 0xaaaaaa);
                this.add.circle(x - 30, y - 25, 4, rColor);

                cardBg.on('pointerover', () => {
                    infoText.setText(`${card.name.toUpperCase()}: ${card.description}`).setVisible(true);
                    cardBg.setStrokeStyle(2, 0xffffff);
                });
                cardBg.on('pointerout', () => {
                    infoText.setVisible(false);
                    cardBg.setStrokeStyle(1, 0xFFD700);
                });
            }
        });
    }
}