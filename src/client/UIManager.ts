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
    private quickMenu?: HTMLElement;

    // Intro State
    private introPlayed = false;
    private introAudio?: Phaser.Sound.BaseSound;
    private introTimer?: Phaser.Time.TimerEvent;
    
    private introSubtitlesData = [
        { time: 1000, text: "Time is a ruthless circle." },
        { time: 4200, text: "Every thousand years the stars return to their origin," },
        { time: 9000, text: "and the sky bleeds." },
        { time: 12800, text: "In the last cycle, the world nearly broke." },
        { time: 17000, text: "Two great forces clashed, leaving behind only scars." },
        { time: 23000, text: "And silence." },
        { time: 27500, text: "Now, the silence ends." },
        { time: 31000, text: "That is why Cliffwald stands." },
        { time: 35500, text: "We have opened the gates because the cycle demands it." },
        { time: 41500, text: "Enter, and show us who you truly are." }
    ];

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
        
        // Check if intro needed (could check localStorage)
        if (!this.introPlayed) {
            this.startIntro();
        }

        // TRANSITION: Login -> Game
        const loginScreen = document.getElementById('login-screen');
        const gameUI = document.getElementById('game-ui');
        
        if (loginScreen) loginScreen.classList.remove('hidden'); // Ensure visible behind intro
        if (gameUI) gameUI.classList.add('hidden'); // Ensure hidden
    }
    
    private startIntro() {
        const screen = document.getElementById('intro-screen');
        const subtitles = document.getElementById('intro-subtitles');
        const skip = document.getElementById('intro-skip');
        
        if (!screen) return;

        screen.classList.remove('hidden');
        if (subtitles) subtitles.classList.remove('hidden');
        if (skip) skip.classList.remove('hidden');

        // Audio Auto-Play Attempt
        if (this.scene.cache.audio.exists('intro_full')) {
            this.introAudio = this.scene.sound.add('intro_full', { volume: 0.5 });
            
            // Try to play immediately
            try {
                this.introAudio.play();
            } catch (e) {
                console.warn("Audio autoplay blocked. Waiting for interaction.");
            }
            
            // Fallback unlocker
            const unlockAudio = () => {
                if (this.scene.sound.locked) {
                    this.scene.sound.unlock();
                }
                if (this.introAudio && !this.introAudio.isPlaying && !this.introPlayed) {
                    this.introAudio.play();
                }
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
            };
            
            window.addEventListener('click', unlockAudio);
            window.addEventListener('touchstart', unlockAudio);
        }
        
        // Subtitles Loop
        const startTime = Date.now();
        let lastText = "";

        this.introTimer = this.scene.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                const elapsed = Date.now() - startTime;
                const currentSub = this.introSubtitlesData.slice().reverse().find(s => elapsed >= s.time);
                
                if (subtitles && currentSub) {
                    if (lastText !== currentSub.text) {
                        lastText = currentSub.text;
                        subtitles.style.opacity = '0';
                        subtitles.style.transition = 'opacity 0.5s';
                        setTimeout(() => {
                            subtitles.innerText = currentSub.text;
                            subtitles.style.opacity = '1';
                        }, 500);
                    }
                }
                
                if (elapsed > 46000) { 
                    this.finishIntro();
                }
            }
        });

        // Skip Logic (Hold)
        let holdTimeout: any;
        const startHold = () => {
            if (skip) {
                skip.style.color = '#fff';
                skip.innerText = "SKIPPING...";
            }
            holdTimeout = setTimeout(() => this.finishIntro(), 1000); 
        };
        const endHold = () => {
            if (skip) {
                skip.style.color = '#666';
                skip.innerText = "HOLD SCREEN TO SKIP";
            }
            clearTimeout(holdTimeout);
        };
        
        screen.addEventListener('mousedown', startHold);
        screen.addEventListener('mouseup', endHold);
        screen.addEventListener('touchstart', startHold);
        screen.addEventListener('touchend', endHold);
    }

    private finishIntro() {
        if (this.introPlayed) return;
        this.introPlayed = true;
        
        if (this.introAudio) {
            this.introAudio.stop();
            this.introAudio.destroy();
        }
        if (this.introTimer) this.introTimer.remove();
        
        const screen = document.getElementById('intro-screen');
        if (screen) {
            screen.style.transition = "opacity 2s";
            screen.style.opacity = "0";
            setTimeout(() => screen.classList.add('hidden'), 2000);
        }
        
        // Start Main Theme
        if (this.scene.cache.audio.exists('main_theme')) {
            const theme = this.scene.sound.add('main_theme', { volume: 0.3, loop: true });
            theme.play();
        }
    }

    public destroy() {
        this.eventListeners.forEach(l => {
            l.target.removeEventListener(l.type, l.listener);
        });
        this.eventListeners = [];
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
        this.albumModal = document.getElementById('album-overlay') as HTMLElement;
        this.timetableModal = document.getElementById('timetable-modal') as HTMLElement;
        this.loreModal = document.getElementById('card-lore-modal') as HTMLElement;
        this.inventoryModal = document.getElementById('inventory-modal') as HTMLElement;
        this.quickMenu = document.getElementById('quick-menu') as HTMLElement;

        this.setupCalendarControls();
        this.renderCalendar();
    }

    private setupEventListeners() {
        if (!this.chatInput || !this.chatContainer) return;

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

        const toggle = (el: HTMLElement | null) => el?.classList.toggle('hidden');

        const settingsBtn = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        const btnClose = document.getElementById('btn-close');

        this.addListener(settingsBtn, 'click', (e: any) => { e.stopPropagation(); toggle(settingsMenu); });
        this.addListener(btnClose, 'click', (e: any) => { e.stopPropagation(); settingsMenu?.classList.add('hidden'); });

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

        if (this.albumModal) {
            this.addListener(this.albumModal, 'click', (e: any) => {
                if (e.target === this.albumModal) {
                    this.albumModal.classList.add('hidden');
                }
            });
        }
        
        const btnAlbumCloseMain = document.getElementById('btn-album-close-main');
        this.addListener(btnAlbumCloseMain, 'click', (e: any) => {
             e.stopPropagation();
             this.albumModal?.classList.add('hidden');
        });

        const albumTabs = document.querySelectorAll('.album-tab');
        albumTabs.forEach(tab => {
            this.addListener(tab, 'click', (e: any) => {
                e.stopPropagation();
                albumTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentAlbumTab = (tab as HTMLElement).dataset.category || 'wizards';
                const ownedIds: number[] = [];
                const localSessionId = this.network.room?.sessionId;
                if (localSessionId) {
                    const localPlayer = this.network.room?.state.players.get(localSessionId);
                    if (localPlayer && localPlayer.cardCollection) {
                        localPlayer.cardCollection.forEach((cardId: number) => ownedIds.push(cardId));
                    }
                }
                this.renderAlbum(ownedIds);
            });
        });

        const btnTimetable = document.getElementById('btn-timetable');
        this.addListener(btnTimetable, 'click', (e: any) => { 
            e.stopPropagation(); 
            toggle(this.timetableModal || null); 
        });

        const btnFullscreen = document.getElementById('btn-fullscreen');
        this.addListener(btnFullscreen, 'click', (e: any) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        this.scene.scale.on('enterfullscreen', () => {
            if (btnFullscreen) btnFullscreen.innerText = '⤢'; 
        });
        
        this.scene.scale.on('leavefullscreen', () => {
            if (btnFullscreen) btnFullscreen.innerText = '⛶'; 
        });

        const btnInventory = document.getElementById('btn-inventory');
        this.addListener(btnInventory, 'click', (e: any) => { 
            e.stopPropagation(); 
            toggle(this.inventoryModal || null); 
            if (!this.inventoryModal?.classList.contains('hidden')) {
                this.renderInventory(); 
            }
        });

        document.querySelectorAll('.close-btn').forEach(btn => {
            this.addListener(btn, 'click', (e: any) => {
                e.stopPropagation();
                const modal = (e.target as HTMLElement).closest('.modal');
                if (modal) {
                    const overlay = modal.closest('.modal-overlay');
                    if (overlay) {
                        overlay.classList.add('hidden');
                    } else {
                        modal.classList.add('hidden');
                    }
                }
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
        
        const btnRename = document.getElementById('btn-rename-char');
        this.addListener(btnRename, 'click', async (e: any) => {
            e.stopPropagation();
            const newName = prompt("Enter new character name (1-time change):");
            if (newName && newName.trim().length > 0) {
                try {
                    const token = (window as any).gameClient?.authToken;
                    const res = await fetch("/api/character/rename", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ newName })
                    });
                    if (res.ok) {
                        alert("Name changed successfully! Please relogin.");
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert("Error: " + err.error);
                    }
                } catch (e) { alert("Request failed"); }
            }
        });

        const btnDelete = document.getElementById('btn-delete-char');
        this.addListener(btnDelete, 'click', async (e: any) => {
            e.stopPropagation();
            const confirm1 = prompt("Type DELETE to confirm character deletion. This is irreversible.");
            if (confirm1 === "DELETE") {
                try {
                    const token = (window as any).gameClient?.authToken;
                    const res = await fetch("/api/character/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        alert("Character deleted. Returning to login...");
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert("Error: " + err.error);
                    }
                } catch (e) { alert("Request failed"); }
            }
        });

        this.scene.input.keyboard?.on('keydown-ESC', () => {
            const modals = [settingsMenu, this.albumModal, this.timetableModal, this.loreModal, this.inventoryModal];
            let closedAny = false;
            modals.forEach(m => {
                if (m && !m.classList.contains('hidden')) {
                    m.classList.add('hidden');
                    closedAny = true;
                }
            });
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
    private currentAlbumTab: string = 'wizards'; 

    public renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const localSessionId = this.network.room?.sessionId;
        const player = localSessionId ? this.network.room?.state.players.get(localSessionId) : null;
        if (!player) return;
        const inventory = player.inventory; 
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

    private selectInventoryItem(item: any, itemDef: any) {
        document.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('selected'));
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
            btnUse.onclick = () => { console.log("Use item:", item.itemId); }; 
        }
        if (btnEquip) {
            btnEquip.disabled = !['Robe', 'Boots', 'Hat', 'Wand'].includes(itemDef.Type);
        }
    }

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
        container.className = 'calendar-week'; 
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '10px';
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
        const tbody = document.createElement('tbody');
        const startHour = 6;
        const endHour = 22;
        for (let h = startHour; h <= endHour; h++) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-hour', h.toString());
            const tdTime = document.createElement('td');
            tdTime.innerText = `${h}:00`;
            tdTime.style.border = '1px solid #444';
            tdTime.style.color = '#aaa';
            tr.appendChild(tdTime);
            for (let d = 0; d < 7; d++) {
                const td = document.createElement('td');
                td.style.border = '1px solid #444';
                td.style.position = 'relative';
                td.style.height = '30px';
                if (d < 5) {
                    const event = CONFIG.ACADEMIC_SCHEDULE.find((e: any) => h >= e.start && h < e.end);
                    if (event) {
                        td.style.background = this.getEventColor(event.activity);
                        td.innerText = event.name.split(' ')[0]; 
                        td.style.fontSize = '9px';
                        td.style.cursor = 'pointer';
                        td.addEventListener('mouseenter', (e) => this.showTooltip(e, event));
                        td.addEventListener('mouseleave', () => this.hideTooltip());
                        td.addEventListener('click', (e) => {
                             e.stopPropagation();
                             this.showTooltip(e, event); 
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
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        grid.style.gap = '2px';
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
            const el = document.createElement('div');
            el.innerText = d;
            el.style.textAlign = 'center';
            el.style.fontWeight = 'bold';
            el.style.background = '#222';
            grid.appendChild(el);
        });
        for (let i = 1; i <= 30; i++) {
            const day = document.createElement('div');
            day.style.border = '1px solid #444';
            day.style.height = '40px';
            day.style.padding = '2px';
            day.style.position = 'relative';
            day.innerHTML = `<span style="color:#666">${i}</span>`;
            const dayOfWeek = (i - 1) % 7; 
            if (dayOfWeek < 5) {
                const dot = document.createElement('div');
                dot.style.width = '6px';
                dot.style.height = '6px';
                dot.style.background = '#f0c040'; 
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
            case 'class': return '#404080'; 
            case 'eat': return '#804040'; 
            case 'sleep': return '#202020'; 
            case 'free': return '#305030'; 
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

    public updateTimetable(gameHour: number) {
        if (!this.timetableModal || this.timetableModal.classList.contains('hidden')) return;
        const clockDisplay = document.getElementById('clock-display');
        if (clockDisplay) clockDisplay.innerText = `${gameHour.toString().padStart(2, '0')}:00`;
        document.querySelectorAll('.current-hour-row').forEach(el => el.classList.remove('current-hour-row'));
        document.querySelectorAll('.current-day-cell').forEach(el => el.classList.remove('current-day-cell'));
        if (this.calendarView === 'week') {
            const hourInt = Math.floor(gameHour);
            const row = document.querySelector(`tr[data-hour="${hourInt}"]`);
            if (row) {
                row.classList.add('current-hour-row');
                const state = this.network.room?.state;
                if (state) {
                    const day = state.currentDay || 1; 
                    const dayOfWeek = (day - 1) % 7; 
                    const cells = row.querySelectorAll('td');
                    const targetCell = cells[dayOfWeek + 1];
                    if (targetCell) {
                        targetCell.classList.add('current-day-cell');
                    }
                }
            }
        }
    }

    public renderAlbum(ownedCardIds: number[]) {
        const grid = document.getElementById('album-grid');
        const countDisplay = document.getElementById('collection-count');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.alignItems = 'center';
        grid.style.paddingTop = '20px';
        const allCards = GET_ALL_CARDS();
        const categoryCards = allCards.filter(card => {
            const category = this.getCardCategory(card.ID);
            return category === this.currentAlbumTab;
        });
        if (categoryCards.length === 0) {
            grid.innerHTML = `<div style="color:#666; width:100%; text-align:center; margin-top:50px;">No cards in this section yet.</div>`;
            return;
        }
        const tiers: Record<string, any[]> = {
            'mythic': [],
            'legendary': [],
            'rare': [],
            'common': []
        };
        categoryCards.forEach(card => {
            const r = card.Rarity.toLowerCase();
            if (tiers[r]) tiers[r].push(card);
            else tiers['common'].push(card); 
        });
        const renderRow = (cards: any[], tierName: string) => {
            if (cards.length === 0) return;
            const row = document.createElement('div');
            row.className = `album-tier-grid ${tierName}`;
            cards.forEach(cardData => {
                let numericId = -1;
                const parts = cardData.ID.split('_');
                if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
                    numericId = parseInt(parts[1]);
                }
                const isOwned = (numericId !== -1 && ownedCardIds.includes(numericId));
                const slot = document.createElement('div');
                const rarityClass = `frame-${cardData.Rarity.toLowerCase()}`;
                slot.className = `card-slot ${isOwned ? 'owned' : 'locked'}`;
                slot.setAttribute('data-name', isOwned ? cardData.Name : "???");
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
                row.appendChild(slot);
            });
            grid.appendChild(row);
        };
        renderRow(tiers['mythic'], 'mythic');
        renderRow(tiers['legendary'], 'legendary');
        renderRow(tiers['rare'], 'rare');
        renderRow(tiers['common'], 'common');
        const totalOwned = ownedCardIds.length;
        const totalCards = allCards.length;
        if (countDisplay) countDisplay.innerText = `${totalOwned}/${totalCards}`;
    }

    private getCardCategory(id: string): string {
        if (id.startsWith('card_')) {
            const suffix = id.replace('card_', '');
            const creatures = ['cyclops', 'goliath', 'dragon', 'giant', 'vampire', 'imp', 'pixie', 'gnome', 'unicorn', 'griffin'];
            if (creatures.includes(suffix)) return 'creatures';
            const personalities = ['agrippa', 'flamel', 'paracelsus', 'faust', 'solomon', 'scot'];
            if (personalities.includes(suffix)) return 'personalities';
            const num = parseInt(suffix);
            if (!isNaN(num)) {
                return 'wizards';
            }
        }
        if (id.includes('spell')) return 'spells';
        if (id.includes('place') || id.includes('location')) return 'places';
        if (id.includes('artifact') || id.includes('relic') || id.includes('object')) return 'artifacts';
        if (id.includes('plant') || id.includes('herb') || id.includes('nature') || id.includes('ingredient')) return 'nature';
        return 'wizards'; 
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
            if (r === 'legendary') rarity.style.color = '#f0c040';
            else if (r === 'rare') rarity.style.color = '#40c0f0';
            else if (r === 'mythic') rarity.style.color = '#d0f'; 
            else rarity.style.color = '#fff';
        }
        this.loreModal.classList.remove('hidden');
    }

    public updateHUDTime(hour: number, minute: number, day: number, month: string) {
        const timeEl = document.getElementById('hud-time');
        const dateEl = document.getElementById('hud-date');
        if (timeEl) {
            const hStr = Math.floor(hour).toString().padStart(2, '0');
            const mStr = Math.floor(minute).toString().padStart(2, '0');
            timeEl.innerText = `${hStr}:${mStr}`;
        }
        if (dateEl) {
            dateEl.innerText = `DAY ${day} - ${month.toUpperCase()}`;
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

    public showClassMinigame(duration: number) {
        const container = document.createElement('div');
        container.id = 'class-minigame-ui';
        container.style.position = 'absolute';
        container.style.top = '20%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        container.style.color = 'white';
        container.style.padding = '20px';
        container.style.borderRadius = '10px';
        container.style.textAlign = 'center';
        container.style.zIndex = '1000';
        container.style.pointerEvents = 'none'; 
        container.innerHTML = `
            <h2>ATTENDING CLASS</h2>
            <div id="class-timer" style="font-size: 24px; font-weight: bold;">Starting...</div>
            <p>Study hard!</p>
        `;
        document.body.appendChild(container);
        const endTime = Date.now() + duration;
        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            const timerEl = document.getElementById('class-timer');
            if (timerEl) {
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                timerEl.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            if (remaining <= 0) {
                clearInterval(interval);
                container.remove();
            }
        }, 1000);
        (window as any)._classInterval = interval;
    }

    public hideClassMinigame() {
        const el = document.getElementById('class-minigame-ui');
        if (el) el.remove();
        if ((window as any)._classInterval) clearInterval((window as any)._classInterval);
    }

    public showZoneNotification(name: string) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = '20%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.color = '#fff';
        el.style.fontFamily = 'Cinzel, serif'; 
        el.style.fontSize = '32px';
        el.style.textShadow = '0 0 10px #000';
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s ease-in-out';
        el.style.pointerEvents = 'none';
        el.innerHTML = `<span>${name}</span><div style="width:100%; height:2px; background:linear-gradient(90deg, transparent, #fff, transparent); margin-top:5px;"></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.style.opacity = '1');
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 500);
        }, 2500);
    }

    public showNotification(message: string) {
        const notif = document.createElement('div');
        notif.style.position = 'absolute';
        notif.style.top = '10%';
        notif.style.left = '50%';
        notif.style.transform = 'translate(-50%, 0)';
        notif.style.backgroundColor = 'rgba(0, 100, 0, 0.8)';
        notif.style.color = 'white';
        notif.style.padding = '10px 20px';
        notif.style.borderRadius = '5px';
        notif.style.zIndex = '2000';
        notif.innerText = message;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.remove();
        }, 3000);
    }
    
    // UI State Management Helper
    public setGameState(state: 'INTRO' | 'LOGIN' | 'PLAYING') {
        const intro = document.getElementById('intro-screen');
        const login = document.getElementById('login-screen');
        const game = document.getElementById('game-ui');
        
        if (state === 'INTRO') {
            intro?.classList.remove('hidden');
            login?.classList.remove('hidden'); // Visible behind
            game?.classList.add('hidden');
        } else if (state === 'LOGIN') {
            intro?.classList.add('hidden');
            login?.classList.remove('hidden');
            game?.classList.add('hidden');
        } else if (state === 'PLAYING') {
            intro?.classList.add('hidden');
            login?.classList.add('hidden');
            game?.classList.remove('hidden');
        }
    }
}