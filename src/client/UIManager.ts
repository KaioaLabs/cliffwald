import Phaser from 'phaser';
import { NetworkManager } from './NetworkManager';
import { THEME } from '../shared/Theme';
import { Player } from '../shared/SchemaDef';
import { CONFIG } from '../shared/Config';
import { ITEM_REGISTRY, GET_ALL_CARDS } from '../shared/data/ItemRegistry';

export class UIManager {
    private scene: Phaser.Scene;
    private network: NetworkManager;
    private container: HTMLElement | null;
    
    // UI Elements
    private uiText?: Phaser.GameObjects.Text;
    private chatContainer?: HTMLElement;
    private chatInput?: HTMLInputElement;
    private btnAudio?: HTMLElement;

    // Modals
    private albumModal?: HTMLElement;
    private timetableModal?: HTMLElement;
    private loreModal?: HTMLElement;
    private inventoryModal?: HTMLElement; // New
    private quickMenu?: HTMLElement;

    constructor(scene: Phaser.Scene, network: NetworkManager) {
        this.scene = scene;
        this.network = network;
        this.container = document.getElementById('ui-layer');
    }

    public create() {
        this.createPhaserUI();
        this.bindDOMUI();
        this.setupEventListeners();
    }

    private createPhaserUI() {
        this.uiText = this.scene.add.text(10, 10, 'Initializing...', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: THEME.UI.TEXT_WHITE,
            backgroundColor: THEME.UI.BACKGROUND_DIM
        });
        this.uiText.setScrollFactor(0);
        this.uiText.setDepth(1000);
    }

    private bindDOMUI() {
        this.chatContainer = document.getElementById('chat-container') as HTMLElement;
        this.chatInput = document.getElementById('chat-input') as HTMLInputElement;
        this.btnAudio = document.getElementById('btn-audio') as HTMLElement;
        
        this.albumModal = document.getElementById('album-modal') as HTMLElement;
        this.timetableModal = document.getElementById('timetable-modal') as HTMLElement;
        this.loreModal = document.getElementById('card-lore-modal') as HTMLElement;
        this.inventoryModal = document.getElementById('inventory-modal') as HTMLElement; // New
        this.quickMenu = document.getElementById('quick-menu') as HTMLElement;

        this.renderTimetable();
    }

    private setupEventListeners() {
        if (!this.chatInput || !this.chatContainer) return;

        // --- Chat Logic ---
        this.chatInput.addEventListener('focus', () => {
            this.chatContainer?.classList.add('active');
        });

        this.chatInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.chatContainer?.classList.remove('active');
            }, 100);
        });

        this.chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation(); 
            if (e.key === 'Enter') {
                if (this.chatInput!.value.trim().length > 0) {
                    this.network.sendChat(this.chatInput!.value.trim());
                    this.chatInput!.value = '';
                }
                this.chatInput!.blur();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement !== this.chatInput) {
                e.preventDefault();
                this.chatInput?.focus();
            }
        });

        // --- Generic Toggle ---
        const toggle = (el: HTMLElement | null) => el?.classList.toggle('hidden');

        // --- Settings ---
        const settingsBtn = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        const btnClose = document.getElementById('btn-close');

        settingsBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggle(settingsMenu); });
        btnClose?.addEventListener('click', (e) => { e.stopPropagation(); settingsMenu?.classList.add('hidden'); });

        // --- Album ---
        const btnAlbum = document.getElementById('btn-album');
        btnAlbum?.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggle(this.albumModal || null); 
            if (!this.albumModal?.classList.contains('hidden')) {
                const ownedIds: number[] = [];
                const localSessionId = this.network.room?.sessionId;
                if (localSessionId) {
                    const localPlayer = this.network.room?.state.players.get(localSessionId);
                    if (localPlayer && localPlayer.cardCollection) {
                        localPlayer.cardCollection.forEach((cardId: number) => ownedIds.push(cardId));
                    }
                }
                this.renderAlbum(ownedIds); 
            }
        });

        // --- Timetable ---
        const btnTimetable = document.getElementById('btn-timetable');
        btnTimetable?.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggle(this.timetableModal || null); 
        });

        // --- Inventory ---
        const btnInventory = document.getElementById('btn-inventory');
        btnInventory?.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggle(this.inventoryModal || null); 
            if (!this.inventoryModal?.classList.contains('hidden')) {
                this.renderInventory(); 
            }
        });

        // Close Buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                (e.target as HTMLElement).closest('.modal')?.classList.add('hidden');
            });
        });

        this.btnAudio?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.scene.sound.mute = !this.scene.sound.mute;
            if (this.btnAudio) {
                this.btnAudio.innerText = this.scene.sound.mute ? "🔇 Audio: OFF" : "🔊 Audio: ON";
                this.btnAudio.style.borderColor = this.scene.sound.mute ? "#f00" : "#0f0";
            }
        });

        this.scene.input.keyboard?.on('keydown-ESC', () => {
            settingsMenu?.classList.add('hidden');
            this.albumModal?.classList.add('hidden');
            this.timetableModal?.classList.add('hidden');
            this.loreModal?.classList.add('hidden');
            this.inventoryModal?.classList.add('hidden');
        });
    }

    public renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        // Get local player inventory
        const localSessionId = this.network.room?.sessionId;
        const player = localSessionId ? this.network.room?.state.players.get(localSessionId) : null;
        
        if (!player) return;

        const inventory = player.inventory; // ArraySchema of InventoryItem
        const CAPACITY = 20;

        for (let i = 0; i < CAPACITY; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < inventory.length) {
                const item = inventory[i];
                const itemDef = ITEM_REGISTRY[item.itemId];
                
                if (itemDef) {
                    slot.setAttribute('data-rarity', itemDef.Rarity.toLowerCase());
                    // Placeholder icon logic (color based on type)
                    const color = itemDef.Type === 'Potion' ? '#f55' : (itemDef.Type === 'Card' ? '#fa0' : '#aaa');
                    slot.innerHTML = `
                        <div style="width:100%; height:100%; background:${color}; opacity:0.5;"></div>
                        ${item.qty > 1 ? `<span class="inv-qty">${item.qty}</span>` : ''}
                    `;
                    
                    slot.addEventListener('click', () => this.selectInventoryItem(item, itemDef));
                }
            }

            grid.appendChild(slot);
        }
    }

    private selectInventoryItem(item: any, itemDef: any) {
        document.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('selected'));
        // Highlight clicked (simulated, ideally would pass event or element)
        
        const nameEl = document.getElementById('detail-name');
        const typeEl = document.getElementById('detail-type');
        const descEl = document.getElementById('detail-desc');
        const statsEl = document.getElementById('detail-stats');
        const btnUse = document.getElementById('btn-use') as HTMLButtonElement;
        const btnEquip = document.getElementById('btn-equip') as HTMLButtonElement;

        if (nameEl) nameEl.innerText = itemDef.Name;
        if (typeEl) typeEl.innerText = itemDef.Type;
        if (descEl) descEl.innerText = itemDef.Description;
        if (statsEl) statsEl.innerText = itemDef.Stats || "";

        if (btnUse) {
            btnUse.disabled = itemDef.Type !== 'Potion' && itemDef.Type !== 'Food';
            btnUse.onclick = () => { console.log("Use item:", item.itemId); }; // Placeholder
        }
        
        if (btnEquip) {
            btnEquip.disabled = !['Robe', 'Boots', 'Hat', 'Wand'].includes(itemDef.Type);
        }
    }

    private renderTimetable() {
        const body = document.getElementById('schedule-body');
        if (!body) return;

        body.innerHTML = '';
        CONFIG.ACADEMIC_SCHEDULE.forEach((item: any) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-start', item.start.toString());
            tr.setAttribute('data-end', item.end.toString());
            tr.innerHTML = `
                <td>${item.start.toString().padStart(2, '0')}:00</td>
                <td>${item.name}</td>
                <td>${item.location}</td>
            `;
            body.appendChild(tr);
        });
    }

    public updateTimetable(gameHour: number) {
        if (!this.timetableModal || this.timetableModal.classList.contains('hidden')) return;

        const clockDisplay = document.getElementById('clock-display');
        if (clockDisplay) clockDisplay.innerText = `${gameHour.toString().padStart(2, '0')}:00`;

        const rows = document.querySelectorAll('#schedule-body tr');
        rows.forEach(row => {
            row.classList.remove('active-class');
            const start = parseInt(row.getAttribute('data-start') || "-1");
            const end = parseInt(row.getAttribute('data-end') || "-1");
            
            let isActive = false;
            if (start < end) isActive = gameHour >= start && gameHour < end;
            else isActive = gameHour >= start || gameHour < end;

            if (isActive) row.classList.add('active-class');
        });
    }

    public renderAlbum(ownedCardIds: number[]) {
        const grid = document.getElementById('album-grid');
        const countDisplay = document.getElementById('collection-count');
        if (!grid) return;

        grid.innerHTML = '';
        const allCards = GET_ALL_CARDS();

        allCards.forEach((cardData) => {
            const numericId = parseInt(cardData.ID.split('_')[1]);
            const isOwned = ownedCardIds.includes(numericId);
            const slot = document.createElement('div');
            
            // Rarity Frame Class
            const rarityClass = `frame-${cardData.Rarity.toLowerCase()}`;
            
            slot.className = `card-slot ${isOwned ? 'owned' : 'locked'}`;
            slot.setAttribute('data-name', isOwned ? cardData.Name : "???");
            
            // Layered Visuals
            // We assume assets are at /ui/cards/card_X.png based on ID
            slot.innerHTML = `
                <img src="/ui/cards/${cardData.ID}.png" class="card-art" onerror="this.style.display='none'">
                <div class="card-frame ${rarityClass}"></div>
            `;
            
            if (isOwned) {
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openCardLore(cardData.ID);
                });
            }

            grid.appendChild(slot);
        });

        if (countDisplay) countDisplay.innerText = `${ownedCardIds.length}/${allCards.length}`;
    }

    private openCardLore(itemId: string) {
        if (!this.loreModal) return;
        
        const item = ITEM_REGISTRY[itemId];
        if (!item) return;

        const title = document.getElementById('lore-title');
        const text = document.getElementById('lore-text');
        const rarity = document.getElementById('lore-rarity');
        
        if (title) title.innerText = item.Name;
        if (text) text.innerText = item.Description;
        if (rarity) {
            const r = item.Rarity.toLowerCase();
            rarity.innerText = r.toUpperCase();
            rarity.style.color = r === 'legendary' ? '#f0c040' : (r === 'rare' ? '#40c0f0' : '#fff');
        }

        this.loreModal.classList.remove('hidden');
    }

    public updateTelemetry(latency: number, playerState: Player | null) {
        if (this.uiText && playerState) {
            this.uiText.setText(`POS: ${Math.round(playerState.x)},${Math.round(playerState.y)}
PING: ${latency}ms`);
            if (latency < 100) this.uiText.setColor(THEME.UI.PING_GOOD);
            else if (latency < 200) this.uiText.setColor(THEME.UI.PING_WARN);
            else this.uiText.setColor(THEME.UI.PING_BAD);
        } else if (this.uiText) {
             this.uiText.setText("Connecting...");
        }
    }

    public showReconnecting() {
        if (this.uiText) this.uiText.setText("RECONNECTING TO SERVER...");
    }

    public appendChatMessage(msg: { sender: string, text: string }) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const el = document.createElement('div');
            el.style.marginBottom = '4px';
            el.innerText = `${msg.sender}: ${msg.text}`;
            chatMessages.appendChild(el);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    public getChatInputActive(): boolean {
        return document.activeElement === this.chatInput;
    }
}