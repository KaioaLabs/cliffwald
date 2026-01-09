import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemSystem } from './systems/ItemSystem';
import { ChatManager } from './managers/ChatManager';
import { WorldRoom } from './WorldRoom';
import { CONFIG } from '../shared/Config';
import { ChatMessage, Player, WorldItem } from '../shared/SchemaDef';

// Mocks
const mockClient = (id: string) => ({ sessionId: id, send: vi.fn() } as any);

describe('Server Systems Verification', () => {
    let roomMock: any;
    let itemSystem: ItemSystem;
    let chatManager: ChatManager;
    let players: Map<string, Player>;
    let items: Map<string, WorldItem>;
    let entities: Map<string, any>;
    let clients: any[];

    beforeEach(() => {
        // Reset State
        players = new Map();
        items = new Map();
        entities = new Map();
        clients = [];

        roomMock = {
            state: {
                players: players,
                items: items,
                messages: []
            },
            entities: entities,
            clients: {
                getById: (id: string) => clients.find(c => c.sessionId === id),
                forEach: (cb: any) => clients.forEach(cb)
            },
            send: vi.fn(),
            broadcast: vi.fn()
        };

        itemSystem = new ItemSystem(roomMock as WorldRoom);
        chatManager = new ChatManager(roomMock as WorldRoom);
    });

    describe('ItemSystem Validation (Anti-Vacuum Hack)', () => {
        it('should ALLOW collection if player is within range', () => {
            const playerId = 'p1';
            const itemId = 'item1';

            // Setup
            const player = new Player();
            player.inventory = [] as any;
            players.set(playerId, player);

            const item = new WorldItem();
            item.id = itemId;
            item.x = 100;
            item.y = 100;
            item.itemId = 'card_1'; // Valid ID (Abe no Seimei)
            items.set(itemId, item);

            // Entity Physics Mock
            entities.set(playerId, {
                body: { translation: () => ({ x: 120, y: 120 }) } // Dist ~28px (< 50px)
            });

            const client = mockClient(playerId);
            clients.push(client);

            // Action
            itemSystem.tryCollectItem(playerId, itemId);

            // Assert
            expect(items.has(itemId)).toBe(false); // Collected
            expect(roomMock.send).toHaveBeenCalledWith(client, "notification", expect.stringContaining("Found"));
        });

        it('should DENY collection if player is too far', () => {
            const playerId = 'p1';
            const itemId = 'item1';

            // Setup
            const player = new Player();
            players.set(playerId, player);

            const item = new WorldItem();
            item.x = 100;
            item.y = 100;
            item.itemId = 'card_1';
            items.set(itemId, item);

            // Entity Physics Mock
            entities.set(playerId, {
                body: { translation: () => ({ x: 200, y: 200 }) } // Dist ~141px (> 50px)
            });

            // Action
            itemSystem.tryCollectItem(playerId, itemId);

            // Assert
            expect(items.has(itemId)).toBe(true); // NOT Collected
        });
    });

    describe('ChatManager Channels & AOI', () => {
        it('should broadcast GLOBAL messages (/g) to everyone', () => {
            const senderId = 'p1';
            const p1 = new Player(); p1.username = 'Alice';
            players.set(senderId, p1);

            chatManager.handleChat(senderId, '/g Hello World');

            expect(roomMock.broadcast).toHaveBeenCalledWith('chat', expect.objectContaining({
                text: 'Hello World',
                sender: '[G] Alice'
            }));
        });

        it('should send HOUSE messages (/h) only to same house members', () => {
            const senderId = 'p1'; // Ignis
            const friendId = 'p2'; // Ignis
            const enemyId = 'p3';  // Axiom

            const p1 = new Player(); p1.username = 'Alice'; p1.house = 'ignis';
            const p2 = new Player(); p2.username = 'Bob'; p2.house = 'ignis';
            const p3 = new Player(); p3.username = 'Charlie'; p3.house = 'axiom';

            players.set(senderId, p1);
            players.set(friendId, p2);
            players.set(enemyId, p3);

            const c1 = mockClient(senderId);
            const c2 = mockClient(friendId);
            const c3 = mockClient(enemyId);
            clients.push(c1, c2, c3);

            chatManager.handleChat(senderId, '/h Go Ignis!');

            // Sender receives via logic? Logic iterates clients.
            // My implementation iterates clients.
            
            expect(c2.send).toHaveBeenCalledWith('chat', expect.objectContaining({
                text: 'Go Ignis!',
                sender: '[IGNIS] Alice'
            }));

            expect(c3.send).not.toHaveBeenCalled();
        });

        it('should send LOCAL messages only to nearby players (AOI)', () => {
            const senderId = 'p1'; // At 0,0
            const nearId = 'p2';   // At 100,100 (Dist ~141 < 400)
            const farId = 'p3';    // At 1000,1000 (Dist > 400)

            const p1 = new Player(); p1.username = 'Alice'; p1.x = 0; p1.y = 0;
            const p2 = new Player(); p2.username = 'Bob'; p2.x = 100; p2.y = 100;
            const p3 = new Player(); p3.username = 'Charlie'; p3.x = 1000; p3.y = 1000;

            players.set(senderId, p1);
            players.set(nearId, p2);
            players.set(farId, p3);

            const c1 = mockClient(senderId);
            const c2 = mockClient(nearId);
            const c3 = mockClient(farId);
            clients.push(c1, c2, c3);

            chatManager.handleChat(senderId, 'Hello Local');

            // Sender always gets it
            expect(c1.send).toHaveBeenCalledWith('chat', expect.any(Object));

            // Near player gets it
            expect(c2.send).toHaveBeenCalledWith('chat', expect.objectContaining({
                text: 'Hello Local',
                sender: 'Alice'
            }));

            // Far player does NOT get it
            expect(c3.send).not.toHaveBeenCalled();
        });
    });
});
