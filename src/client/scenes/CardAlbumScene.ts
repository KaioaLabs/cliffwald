import Phaser from 'phaser';
import { GET_ALL_CARDS, ItemDefinition } from '../../shared/data/ItemRegistry';
import { THEME } from '../../shared/Theme';

export class CardAlbumScene extends Phaser.Scene {
    private collection: Set<string> = new Set();
    private currentCategory: string = 'Wizards';
    private currentPage: number = 0;
    
    // UI Elements
    private gridContainer?: Phaser.GameObjects.Container;
    private tabs: Map<string, Phaser.GameObjects.Text> = new Map();

    // Data Categorization
    private categories: Record<string, string[]> = {
        'Wizards': [], // Magos/Brujas
        'Famous': [],  // Personajes Célebres
        'Beasts': []   // Criaturas
    };

    constructor() {
        super({ key: 'CardAlbumScene' });
    }

    create(data: { collection: (number | string)[] }) {
        // Normalize collection to string IDs
        this.collection = new Set(data.collection.map(id => 
            typeof id === 'number' ? `card_${id}` : id
        ));

        // Categorize Cards
        this.categorizeCards();

        // Background (Dimmed)
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.9)
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

        // Render Tabs
        this.renderTabs();

        // Initial Grid Render
        this.renderGrid();
    }

    private categorizeCards() {
        const allCards = GET_ALL_CARDS();
        
        // Define filters (ID substrings or exact matches)
        const beastIds = ['dragon', 'unicorn', 'griffin', 'imp', 'pixie', 'gnome', 'giant', 'cyclops', 'vampire'];
        const famousIds = ['agrippa', 'flamel', 'paracelsus', 'faust', 'solomon', 'scot', 'card_6', 'card_9', 'card_11', 'card_14', 'card_15']; 
        
        // Reset
        this.categories = { 'Wizards': [], 'Famous': [], 'Beasts': [] };

        allCards.forEach(card => {
            const id = card.ID.toLowerCase();
            
            // Determine Category
            let cat = 'Wizards';
            
            if (beastIds.some(k => id.includes(k))) {
                cat = 'Beasts';
            } else if (famousIds.some(k => id.includes(k))) {
                cat = 'Famous';
            }

            this.categories[cat].push(card.ID);
        });
    }

    private renderTabs() {
        const tabNames = ['Wizards', 'Famous', 'Beasts'];
        const startX = 100;
        const y = 70;
        const spacing = 150;

        tabNames.forEach((name, index) => {
            const text = this.add.text(startX + (index * spacing), y, name, {
                fontSize: '18px',
                fontFamily: 'serif',
                color: name === this.currentCategory ? '#FFD700' : '#888888'
            }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

            text.on('pointerdown', () => {
                this.currentCategory = name;
                this.updateTabs();
                this.renderGrid();
            });

            this.tabs.set(name, text);
        });
    }

    private updateTabs() {
        this.tabs.forEach((text, name) => {
            text.setColor(name === this.currentCategory ? '#FFD700' : '#888888');
        });
    }

    renderGrid() {
        if (this.gridContainer) {
            this.gridContainer.destroy();
        }
        this.gridContainer = this.add.container(0, 0);

        const cardIds = this.categories[this.currentCategory] || [];
        const allCards = GET_ALL_CARDS();
        
        const startX = 80;
        const startY = 130;
        const gapX = 80;
        const gapY = 100;
        const cols = Math.floor((this.scale.width - 120) / gapX);

        cardIds.forEach((id, index) => {
            const cardDef = allCards.find(c => c.ID === id);
            if (!cardDef) return;

            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * gapX;
            const y = startY + row * gapY;

            this.renderCardSlot(x, y, cardDef);
        });
    }

    renderCardSlot(x: number, y: number, card: ItemDefinition) {
        const isUnlocked = this.collection.has(card.ID);
        
        // Frame based on Rarity
        let frameKey = 'frame_bronze';
        if (card.Rarity === 'Silver') frameKey = 'frame_silver';
        if (card.Rarity === 'Gold') frameKey = 'frame_gold';
        if (card.Rarity === 'Legendary') frameKey = 'frame_gold';

        // 1. Frame Background (Interactable)
        const bg = this.add.rectangle(x, y, 48, 64, 0x222222)
            .setStrokeStyle(1, 0x444444)
            .setInteractive({ cursor: 'pointer' });
            
        this.gridContainer?.add(bg);

        // Tooltip Events
        bg.on('pointerover', () => this.showTooltip(x, y, card, isUnlocked));
        bg.on('pointerout', () => this.hideTooltip());

        // 2. Card Image
        let spriteKey = card.ID;
        let tint = 0xffffff;

        if (!isUnlocked) {
            // UNLOCKED: Show Merlin (card_4) in Gray
            spriteKey = 'card_4'; // Merlin ID
            tint = 0x555555; // Dark Gray
        } else {
            // Check if texture exists
            if (!this.textures.exists(spriteKey)) {
                // Fallback if texture missing but unlocked
                spriteKey = 'card_4'; 
            }
        }

        // Render Sprite if possible
        if (this.textures.exists(spriteKey)) {
            const img = this.add.image(x, y, spriteKey).setDisplaySize(40, 56);
            img.setTint(tint);
            this.gridContainer?.add(img);
        } else {
            // Text fallback
            const txt = this.add.text(x, y, '?', { fontSize: '20px' }).setOrigin(0.5);
            this.gridContainer?.add(txt);
        }

        // 3. Lock Icon Overlay (Optional, but user asked for Gray Merlin, so maybe no lock icon needed? 
        // I'll leave a small lock icon or just rely on the gray tint.)
        // User said: "Merlin in gray". So gray tint is enough.

        // 4. Frame Overlay
        if (this.textures.exists(frameKey)) {
            const frame = this.add.image(x, y, frameKey).setDisplaySize(54, 72);
            this.gridContainer?.add(frame);
        }
    }

    tooltipContainer?: Phaser.GameObjects.Container;

    showTooltip(x: number, y: number, card: ItemDefinition, isUnlocked: boolean) {
        this.hideTooltip();
        
        const container = this.add.container(x, y - 60);
        
        // If locked, maybe show less info? 
        // User asked: "name of each card even if we don't have it"
        const nameText = card.Name;
        const descText = isUnlocked ? card.Description : "??? (Collect to read)";

        const bg = this.add.rectangle(0, 0, 150, 60, 0x000000, 0.9).setStrokeStyle(1, 0xffffff);
        
        const text = this.add.text(0, 0, `${nameText}\n\n${descText}`, {
            fontSize: '12px',
            color: isUnlocked ? '#ffffff' : '#aaaaaa',
            align: 'center',
            wordWrap: { width: 140 }
        }).setOrigin(0.5);
        
        container.add([bg, text]);
        container.setDepth(200);
        this.gridContainer?.add(container);
        this.tooltipContainer = container;
    }

    hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.destroy();
            this.tooltipContainer = undefined;
        }
    }
}
