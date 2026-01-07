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
                <div id="quick-menu">
                    <button id="btn-album">Album</button>
                    <button id="btn-timetable">Time</button>
                    <button id="settings-btn">Set</button>
                </div>
                <div id="chat-container">
                    <div id="chat-messages"></div>
                    <input id="chat-input" />
                </div>
                <button id="btn-audio">Audio</button>
                
                <div id="album-modal" class="hidden">
                    <div id="album-grid"></div>
                    <span id="collection-count"></span>
                    <button class="close-btn"></button>
                </div>
                
                <div id="timetable-modal" class="hidden">
                    <table>
                        <tbody id="schedule-body"></tbody>
                    </table>
                    <span id="clock-display"></span>
                    <button class="close-btn"></button>
                </div>
                <div id="settings-menu" class="hidden">
                    <button id="btn-close"></button>
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
        // If logic is flawed, it might bind twice or duplicate logic
        uiManager.create(); 
        uiManager.appendChatMessage({ sender: 'Bob', text: 'Hi' });
        
        // Should have 2 messages total, not 3 (no ghost listeners multiplying messages)
        expect(chatBox?.children.length).toBe(2);
        expect(chatBox?.children[1].textContent).toBe('Bob: Hi');
    });

    it('AUDIT 2: Timetable Generation', () => {
        const body = document.getElementById('schedule-body');
        // Should be populated by renderTimetable on create()
        expect(body?.children.length).toBeGreaterThan(0);
        
        const firstRow = body?.children[0] as HTMLElement;
        expect(firstRow.innerHTML).toContain('Charms'); // From Config
        expect(firstRow.getAttribute('data-start')).toBe('8');
    });

    it('AUDIT 3: Album Rendering', () => {
        // Mock Player with Cards
        const playerState = { cardCollection: [1, 5] };
        mockNetwork.room.state.players.set("sess_123", playerState);

        const btnAlbum = document.getElementById('btn-album');
        btnAlbum?.click(); // Open Album

        const modal = document.getElementById('album-modal');
        expect(modal?.classList.contains('hidden')).toBe(false);

        const grid = document.getElementById('album-grid');
        // Should have all cards from registry (27 currently)
        expect(grid?.children.length).toBe(27);
        
        // Slot 0 (Card 1) should be owned
        expect(grid?.children[0].classList.contains('owned')).toBe(true);
        // Slot 1 (Card 2) should NOT be owned
        expect(grid?.children[1].classList.contains('owned')).toBe(false);
        // Slot 4 (Card 5) should be owned
        expect(grid?.children[4].classList.contains('owned')).toBe(true);
    });

    it('AUDIT 4: Timetable Highlighting', () => {
        // Show modal first (logic requires it to be visible)
        document.getElementById('timetable-modal')?.classList.remove('hidden');

        // Test Hour: 09:00 (During Charms 08-10)
        uiManager.updateTimetable(9);
        
        const rows = document.querySelectorAll('#schedule-body tr');
        const charmsRow = rows[0];
        expect(charmsRow.classList.contains('active-class')).toBe(true);

        // Test Hour: 23:00 (During Curfew 22-08)
        uiManager.updateTimetable(23);
        const curfewRow = rows[rows.length - 1]; // Last row is Curfew
        expect(curfewRow.classList.contains('active-class')).toBe(true);
    });
});
