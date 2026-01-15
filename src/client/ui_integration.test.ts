/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIManager } from './UIManager';
import { NetworkManager } from './NetworkManager';
// Mock Phaser
const mockScene = {
    add: {
        text: vi.fn().mockReturnValue({
            setScrollFactor: vi.fn(),
            setDepth: vi.fn(),
            setText: vi.fn(),
            setColor: vi.fn()
        })
    },
    input: {
        keyboard: {
            on: vi.fn()
        }
    },
    sound: {
        mute: false
    },
    scale: {
        on: vi.fn(),
        isFullscreen: false,
        startFullscreen: vi.fn(),
        stopFullscreen: vi.fn()
    }
};

const mockNetwork = {
    room: {
        sessionId: "sess_123",
        state: {
            players: new Map(),
            items: new Map()
        },
        send: vi.fn()
    },
    sendChat: vi.fn()
};

describe('UI Integration Audit', () => {
    let uiManager: UIManager;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="ui-layer">
                <div id="calendar-widget">
                    <div id="hud-time"></div>
                    <div id="hud-date"></div>
                </div>
                <div id="quick-menu">
                    <button id="btn-album">Album</button>
                    <button id="btn-timetable">Time</button>
                    <button id="settings-btn">Set</button>
                    <button id="btn-inventory">Inv</button>
                    <button id="btn-fullscreen">Full</button>
                </div>
                <div id="chat-container">
                    <div id="chat-messages"></div>
                    <input id="chat-input" />
                </div>
                <button id="btn-audio">Audio</button>
                
                <div id="album-overlay" class="modal-overlay hidden">
                    <div id="album-modal" class="modal">
                        <div id="album-grid"></div>
                        <span id="collection-count"></span>
                        <button class="close-btn">X</button>
                    </div>
                </div>
                
                <div id="timetable-modal" class="hidden">
                    <button id="btn-view-week"></button>
                    <button id="btn-view-month"></button>
                    <div id="calendar-container"></div>
                    <div id="calendar-tooltip" class="hidden">
                        <h4 id="tooltip-title"></h4>
                        <p id="tooltip-time"></p>
                        <p id="tooltip-desc"></p>
                    </div>
                    <span id="clock-display"></span>
                    <button class="close-btn">X</button>
                </div>

                <div id="inventory-modal" class="hidden">
                    <div id="inventory-grid"></div>
                    <h3 id="detail-name"></h3>
                    <p id="detail-type"></p>
                    <p id="detail-desc"></p>
                    <div id="detail-stats"></div>
                    <button id="btn-use"></button>
                    <button id="btn-equip"></button>
                    <button class="close-btn">X</button>
                </div>

                <div id="settings-menu" class="hidden">
                    <button id="btn-close">X</button>
                </div>
            </div>
        `;

        uiManager = new UIManager(mockScene as any, mockNetwork as any);
        uiManager.create();
    });

    it('AUDIT 1: Chat Duplication Check', () => {
        const chatBox = document.getElementById('chat-messages');
        
        // Simulate receiving a message
        uiManager.appendChatMessage({ sender: 'Alice', text: 'Hello' });
        expect(chatBox?.children.length).toBe(1);
        expect(chatBox?.children[0].textContent).toBe('Alice: Hello');

        // Simulate re-creating UI (e.g. scene restart)
        uiManager.create(); 
        uiManager.appendChatMessage({ sender: 'Bob', text: 'Hi' });
        
        expect(chatBox?.children.length).toBe(2);
        expect(chatBox?.children[1].textContent).toBe('Bob: Hi');
    });

    it('AUDIT 2: Calendar Rendering', () => {
        const container = document.getElementById('calendar-container');
        // Week view is default
        expect(container?.innerHTML).toContain('table');
        expect(container?.innerHTML).toContain('Time');
        expect(container?.innerHTML).toContain('Mon');
    });

    it('AUDIT 3: Album Rendering', () => {
        // Mock Player with Cards (Numeric IDs in Schema)
        const playerState = { 
            cardCollection: [1, 5],
            inventory: []
        };
        mockNetwork.room.state.players.set("sess_123", playerState);

        const btnAlbum = document.getElementById('btn-album');
        btnAlbum?.click(); 

        const overlay = document.getElementById('album-overlay');
        expect(overlay?.classList.contains('hidden')).toBe(false);

        const grid = document.getElementById('album-grid');
        expect(grid?.children.length).toBeGreaterThan(0);
        
        // Slot 0 (Card 1) should be owned
        // grid -> row -> slot
        const firstRow = grid?.children[0];
        expect(firstRow?.children[0].classList.contains('owned')).toBe(true);
    });

    it('AUDIT 4: Calendar Tooltip & Widget', () => {
        uiManager.updateHUDTime(10, 0, 3, "October");
        
        expect(document.getElementById('hud-time')?.innerText).toBe("10:00");
        expect(document.getElementById('hud-date')?.innerText).toBe("DAY 3 - OCTOBER");

        const modal = document.getElementById('timetable-modal');
        if (modal) modal.classList.remove('hidden');

        uiManager.updateTimetable(10);
        expect(document.getElementById('clock-display')?.innerText).toBe("10:00");
    });
});
