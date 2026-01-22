import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatManager } from '../../../../../src/server/managers/ChatManager';
import { GameState, ChatMessage, Player } from '../../../../../src/shared/SchemaDef';
import { Room } from 'colyseus';

// Mock Colyseus Room
class MockRoom {
    state: GameState;
    clients: any = []; // Change to any to attach methods
    
    constructor() {
        this.state = new GameState();
        this.clients.getById = (id: string) => this.clients.find((c: any) => c.sessionId === id);
    }

    broadcast = vi.fn();
    
    // Helper to simulate players
    addPlayer(sessionId: string, username: string) {
        const p = new Player();
        p.username = username;
        p.x = 0; p.y = 0;
        this.state.players.set(sessionId, p);
        
        this.clients.push({
            sessionId: sessionId,
            send: vi.fn()
        });
    }
}

describe("Bubble Chat Logic", () => {
    let room: any;
    let chatManager: ChatManager;

    beforeEach(() => {
        room = new MockRoom();
        chatManager = new ChatManager(room as any);
    });

    it('should include senderId in the broadcasted message', () => {
        const sessionId = "sess_123";
        room.addPlayer(sessionId, "Alice");

        chatManager.handleChat(sessionId, "/g Hello World");

        // Verify broadcast was called
        expect(room.broadcast).toHaveBeenCalled();

        // Check the message object passed to broadcast
        const [event, msg] = room.broadcast.mock.calls[0];
        expect(event).toBe("chat");
        expect(msg).toBeInstanceOf(ChatMessage);
        // Sender format for global is "[G] Alice"
        expect(msg.sender).toBe("[G] Alice");
        expect(msg.senderId).toBe(sessionId); // CRITICAL CHECK
        expect(msg.text).toBe("Hello World");
    });

    it('should strip commands from bubble chat logic if handled', () => {
        // Commands don't broadcast chat messages usually, they send system messages
        const sessionId = "sess_admin";
        room.addPlayer(sessionId, "Admin");

        chatManager.handleChat(sessionId, "/time check");

        // Should NOT broadcast a global chat for commands (unless implemented to do so)
        // System messages usually have sender="SYSTEM" or "CHRONOS" and NO senderId (or null)
        
        // In current implementation, /time check sends a direct message to sender client.
        const client = room.clients.find((c:any) => c.sessionId === sessionId);
        expect(client.send).toHaveBeenCalled();
        
        const [evt, msg] = client.send.mock.calls[0];
        expect(msg.sender).toBe("CHRONOS");
        // senderId should be empty or specific for system, verifying it's not the player's ID causing a self-bubble
        expect(msg.senderId).not.toBe(sessionId); 
    });
});
