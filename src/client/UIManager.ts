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
    private inventoryModal?: HTMLElement;
    private shopModal?: HTMLElement; // New
    private quickMenu?: HTMLElement;

    // Cleanup Tracker
    private eventListeners: { target: EventTarget, type: string, listener: EventListenerOrEventListenerObject }[] = [];

    constructor(scene: Phaser.Scene, network: NetworkManager) {
        this.scene = scene;
        this.network = network;
        this.container = document.getElementById('ui-layer');
    }

    private addListener(target: EventTarget | null, type: string, listener: EventListenerOrEventListenerObject) {
        if (!target) return;
        target.addEventListener(type, listener);
        this.eventListeners.push({ target, type, listener });
    }

    public create() {
        this.createPhaserUI();
        this.bindDOMUI();
        this.setupEventListeners();
    }
    
    public destroy() {
        this.eventListeners.forEach(l => {
            l.target.removeEventListener(l.type, l.listener);
        });
        this.eventListeners = [];
        
        // Cleanup Phaser specific
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-ESC');
        }
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
        this.inventoryModal = document.getElementById('inventory-modal') as HTMLElement;
        this.shopModal = document.getElementById('shop-modal') as HTMLElement; // New
        this.quickMenu = document.getElementById('quick-menu') as HTMLElement;

        this.setupCalendarControls();
        this.renderCalendar();
    }

    private setupEventListeners() {
        if (!this.chatInput || !this.chatContainer) return;

        // --- Chat Logic ---
        this.addListener(this.chatInput, 'focus', () => {
            this.chatContainer?.classList.add('active');
        });

        this.addListener(this.chatInput, 'blur', () => {
            setTimeout(() => {
                this.chatContainer?.classList.remove('active');
            }, 100);
        });

        this.addListener(this.chatInput, 'keydown', (e: any) => {
            e.stopPropagation(); 
            if (e.key === 'Enter') {
                if (this.chatInput!.value.trim().length > 0) {
                    this.network.sendChat(this.chatInput!.value.trim());
                    this.chatInput!.value = '';
                }
                this.chatInput!.blur();
            }
        });

        this.addListener(window, 'keydown', (e: any) => {
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

        this.addListener(settingsBtn, 'click', (e: any) => { e.stopPropagation(); toggle(settingsMenu); });
        this.addListener(btnClose, 'click', (e: any) => { e.stopPropagation(); settingsMenu?.classList.add('hidden'); });

        // --- Album ---
        const btnAlbum = document.getElementById('btn-album');
        this.addListener(btnAlbum, 'click', (e: any) => { 
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
        this.addListener(btnTimetable, 'click', (e: any) => { 
            e.stopPropagation(); 
            toggle(this.timetableModal || null); 
        });

        // --- Fullscreen ---
        const btnFullscreen = document.getElementById('btn-fullscreen');
        this.addListener(btnFullscreen, 'click', (e: any) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        // Listen for browser fullscreen changes (ESC key or button)
        this.scene.scale.on('enterfullscreen', () => {
            if (btnFullscreen) btnFullscreen.innerText = '⤢'; // Shrink icon
        });
        
        this.scene.scale.on('leavefullscreen', () => {
            if (btnFullscreen) btnFullscreen.innerText = '⛶'; // Expand icon
        });

        // --- Inventory ---
        const btnInventory = document.getElementById('btn-inventory');
        this.addListener(btnInventory, 'click', (e: any) => { 
            e.stopPropagation(); 
            toggle(this.inventoryModal || null); 
            if (!this.inventoryModal?.classList.contains('hidden')) {
                this.renderInventory(); 
            }
        });

        // --- Shop ---
        const btnShop = document.getElementById('btn-shop');
        this.addListener(btnShop, 'click', (e: any) => { 
            e.stopPropagation(); 
            toggle(this.shopModal || null); 
            if (!this.shopModal?.classList.contains('hidden')) {
                this.renderShop(); 
            }
        });

        // Close Buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            this.addListener(btn, 'click', (e: any) => {
                e.stopPropagation();
                (e.target as HTMLElement).closest('.modal')?.classList.add('hidden');
            });
        });

        this.addListener(this.btnAudio, 'click', (e: any) => {
            e.stopPropagation();
            this.scene.sound.mute = !this.scene.sound.mute;
            if (this.btnAudio) {
                this.btnAudio.innerText = this.scene.sound.mute ? "🔇 Audio: OFF" : "🔊 Audio: ON";
                this.btnAudio.style.borderColor = this.scene.sound.mute ? "#f00" : "#0f0";
            }
        });

        this.scene.input.keyboard?.on('keydown-ESC', () => {
            // Priority: Close Menus first
            const modals = [settingsMenu, this.albumModal, this.timetableModal, this.loreModal, this.inventoryModal, this.shopModal];
            let closedAny = false;
            
            modals.forEach(m => {
                if (m && !m.classList.contains('hidden')) {
                    m.classList.add('hidden');
                    closedAny = true;
                }
            });

            // Note: Browser handles ESC -> Exit Fullscreen natively.
            // We don't need to force it, just handle UI updates via 'leavefullscreen' event.
            
            // If nothing was closed, toggle Settings Menu
            if (!closedAny && settingsMenu) {
                if (settingsMenu.classList.contains('hidden')) {
                    settingsMenu.classList.remove('hidden');
                } else {
                    settingsMenu.classList.add('hidden');
                }
            }
        });
    }

    private toggleFullscreen() {
        if (this.scene.scale.isFullscreen) {
            this.scene.scale.stopFullscreen();
        } else {
            this.scene.scale.startFullscreen();
        }
    }

    private calendarView: 'week' | 'month' = 'week';

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

    public renderShop() {
        const grid = document.getElementById('shop-grid');
        const prestigeEl = document.getElementById('shop-prestige');
        if (!grid) return;

        grid.innerHTML = '';
        
        // Update Prestige Display
        const localSessionId = this.network.room?.sessionId;
        const player = localSessionId ? this.network.room?.state.players.get(localSessionId) : null;
        if (prestigeEl && player) {
            prestigeEl.innerText = player.personalPrestige.toString();
        }

        const CATALOG = [
            { id: "pot_antidote", price: 10 },
            { id: "food_rock_cake", price: 10 },
            { id: "mat_wolfsbane", price: 50 },
            { id: "mat_bezoar", price: 50 }
        ];

        CATALOG.forEach(entry => {
            const itemDef = ITEM_REGISTRY[entry.id];
            if (!itemDef) return;

            const slot = document.createElement('div');
            slot.className = 'inv-slot shop-slot';
            slot.style.cursor = 'pointer';
            
            const canAfford = player ? player.personalPrestige >= entry.price : false;
            if (!canAfford) slot.style.opacity = '0.5';

            slot.innerHTML = `
                <div style="font-size:10px; color:#fff; position:absolute; top:2px; left:2px;">${itemDef.Name}</div>
                <div style="font-size:12px; color:#f0c040; position:absolute; bottom:2px; right:2px;">${entry.price} 💎</div>
            `;
            slot.title = itemDef.Description;

            slot.onclick = () => {
                if (canAfford) {
                    this.network.room?.send("buy", entry.id);
                    // Optimistic update or wait for server state sync
                } else {
                    alert("Not enough prestige!");
                }
            };

            grid.appendChild(slot);
        });
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

    // --- NEW CALENDAR LOGIC ---

    private setupCalendarControls() {
        const btnWeek = document.getElementById('btn-view-week');
        const btnMonth = document.getElementById('btn-view-month');
        
        this.addListener(btnWeek, 'click', (e: any) => {
            e.stopPropagation();
            this.calendarView = 'week';
            btnWeek?.classList.add('active');
            btnMonth?.classList.remove('active');
            this.renderCalendar();
        });

        this.addListener(btnMonth, 'click', (e: any) => {
            e.stopPropagation();
            this.calendarView = 'month';
            btnMonth?.classList.add('active');
            btnWeek?.classList.remove('active');
            this.renderCalendar();
        });
    }

    private renderCalendar() {
        if (this.calendarView === 'week') {
            this.renderWeekView();
        } else {
            this.renderMonthView();
        }
    }

    private renderWeekView() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        
        container.innerHTML = '';
        container.className = 'calendar-week'; // Add CSS class for grid styling

        // Structure: Header Row (Days) + Body (Time Slots)
        // CSS Grid is best here.
        // We will inline styles for simplicity in this tool step, or assume CSS class exists.
        // Let's build a simple Flex column structure for now or a Table.
        // Table is robust for timetables.
        
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '10px';
        
        // Header
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
            const th = document.createElement('th');
            th.innerText = day;
            th.style.border = '1px solid #444';
            th.style.padding = '4px';
            th.style.background = '#222';
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        const startHour = 6;
        const endHour = 22;
        
        for (let h = startHour; h <= endHour; h++) {
            const tr = document.createElement('tr');
            
            // Time Col
            const tdTime = document.createElement('td');
            tdTime.innerText = `${h}:00`;
            tdTime.style.border = '1px solid #444';
            tdTime.style.color = '#aaa';
            tr.appendChild(tdTime);

            // Days
            for (let d = 0; d < 7; d++) {
                const td = document.createElement('td');
                td.style.border = '1px solid #444';
                td.style.position = 'relative';
                td.style.height = '30px';
                
                // Find event for this hour
                // Assuming Mon-Fri (d=0..4) have classes. Sat-Sun (d=5,6) are free.
                if (d < 5) {
                    const event = CONFIG.ACADEMIC_SCHEDULE.find((e: any) => h >= e.start && h < e.end);
                    if (event) {
                        td.style.background = this.getEventColor(event.activity);
                        td.innerText = event.name.split(' ')[0]; // Short name
                        td.style.fontSize = '9px';
                        td.style.cursor = 'pointer';
                        
                        td.addEventListener('mouseenter', (e) => this.showTooltip(e, event));
                        td.addEventListener('mouseleave', () => this.hideTooltip());
                        td.addEventListener('click', (e) => {
                             e.stopPropagation();
                             this.showTooltip(e, event); // Click also shows tooltip/details
                        });
                    }
                }
                
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        container.appendChild(table);
    }

    private renderMonthView() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        
        container.innerHTML = '';
        container.className = 'calendar-month';

        // 7x5 Grid
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        grid.style.gap = '2px';

        // Headers
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
            const el = document.createElement('div');
            el.innerText = d;
            el.style.textAlign = 'center';
            el.style.fontWeight = 'bold';
            el.style.background = '#222';
            grid.appendChild(el);
        });

        // Days (1..30)
        for (let i = 1; i <= 30; i++) {
            const day = document.createElement('div');
            day.style.border = '1px solid #444';
            day.style.height = '40px';
            day.style.padding = '2px';
            day.style.position = 'relative';
            
            day.innerHTML = `<span style="color:#666">${i}</span>`;
            
            // Add dots for events (simplified)
            // Mon-Fri have classes
            const dayOfWeek = (i - 1) % 7; 
            if (dayOfWeek < 5) {
                const dot = document.createElement('div');
                dot.style.width = '6px';
                dot.style.height = '6px';
                dot.style.background = '#f0c040'; // Class color
                dot.style.borderRadius = '50%';
                dot.style.margin = '2px auto';
                day.appendChild(dot);
                
                day.style.cursor = 'pointer';
                day.addEventListener('mouseenter', (e) => this.showTooltip(e, { name: 'School Day', start: 8, end: 17, activity: 'class', location: 'Castle' }));
                day.addEventListener('mouseleave', () => this.hideTooltip());
            }

            grid.appendChild(day);
        }
        
        container.appendChild(grid);
    }

    private getEventColor(activity: string) {
        switch(activity) {
            case 'class': return '#404080'; // Blueish
            case 'eat': return '#804040'; // Reddish
            case 'sleep': return '#202020'; // Dark
            case 'free': return '#305030'; // Greenish
            default: return '#333';
        }
    }

    private showTooltip(e: MouseEvent, event: any) {
        const tooltip = document.getElementById('calendar-tooltip');
        if (!tooltip) return;

        const title = document.getElementById('tooltip-title');
        const time = document.getElementById('tooltip-time');
        const desc = document.getElementById('tooltip-desc');
        
        if (title) title.innerText = event.name;
        if (time) time.innerText = `${event.start}:00 - ${event.end}:00`;
        if (desc) desc.innerText = `Location: ${event.location}\nType: ${event.activity.toUpperCase()}`;

        tooltip.classList.remove('hidden');
        
        // Position relative to modal to avoid clipping if fixed
        // Or just fixed near mouse.
        // Let's use mouse coords relative to viewport
        // tooltip is in modal-content relative.
        // We need coordinates relative to modal-content.
        const content = tooltip.parentElement;
        if (content) {
            const rect = content.getBoundingClientRect();
            tooltip.style.left = `${e.clientX - rect.left + 10}px`;
            tooltip.style.top = `${e.clientY - rect.top + 10}px`;
        }
    }

    private hideTooltip() {
        const tooltip = document.getElementById('calendar-tooltip');
        if (tooltip) tooltip.classList.add('hidden');
    }

    // Replace renderTimetable with renderCalendar binding in bindDOMUI
    // ... (This assumes I call setupCalendarControls in bindDOMUI)

    public updateTimetable(gameHour: number) {
        if (!this.timetableModal || this.timetableModal.classList.contains('hidden')) return;

        const clockDisplay = document.getElementById('clock-display');
        if (clockDisplay) clockDisplay.innerText = `${gameHour.toString().padStart(2, '0')}:00`;

        // Highlight current hour in Week View
        if (this.calendarView === 'week') {
            // Logic to highlight current row?
            // Simple: just highlight text color or border
            // Not critical for functionality
        }
    }

    // ... renderAlbum ...

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

    public updateCalendar(month: string, week: number, day: number, phase: string) {
        const seasonEl = document.getElementById('cal-season');
        const dayEl = document.getElementById('cal-day');
        const phaseEl = document.getElementById('cal-phase');

        if (seasonEl) seasonEl.innerText = `${month} - SEMANA ${week}`;
        if (dayEl) dayEl.innerText = `DÍA ${day}`;
        if (phaseEl) {
            phaseEl.innerText = phase.toUpperCase();
            phaseEl.style.color = phase === 'Night' ? '#88a' : '#fa8';
        }
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