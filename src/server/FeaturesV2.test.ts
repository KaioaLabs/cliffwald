import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIG, getAcademicProgress, getGameTime } from '../shared/Config';
import { HealthSystem } from './systems/HealthSystem';
import { ItemSystem } from './systems/ItemSystem';
import { DuelSystem } from './systems/DuelSystem';
import { WorldRoom } from './WorldRoom';
import { Player, WorldItem, InventoryItem } from '../shared/SchemaDef';

// Mock Dependencies
const mockRoom = {
    state: {
        players: new Map(),
        items: new Map(),
        projectiles: new Map(),
        timeOffset: 0,
        worldStartTime: CONFIG.SEASON_START_DATE
    },
    entities: new Map(),
    chatManager: { broadcastSystemMessage: vi.fn() },
    send: vi.fn(),
    clients: { getById: vi.fn() }
} as unknown as WorldRoom;

describe('Feature Verification V2', () => {
    
    describe('1. Time Persistence', () => {
        it('should use fixed SEASON_START_DATE for academic progress', () => {
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            const simulatedNow = CONFIG.SEASON_START_DATE + oneWeekMs + 1000;
            const progress = getAcademicProgress(CONFIG.SEASON_START_DATE, simulatedNow);
            expect(progress.currentWeek).toBe(2);
            expect(progress.currentDay).toBe(1);
        });

        it('should calculate game hour deterministically', () => {
            const cycleHalf = CONFIG.CYCLE_DURATION_MS / 2;
            const time = getGameTime(cycleHalf);
            expect(time.hour).toBeGreaterThan(6);
            expect(time.hour).toBeLessThan(22);
        });
    });

    describe('2. Health System (Infirmary)', () => {
        let healthSystem: HealthSystem;
        let player: Player;

        beforeEach(() => {
            healthSystem = new HealthSystem(mockRoom);
            player = new Player();
            player.username = "TestStudent";
            player.x = 1000; player.y = 1000;
            player.unconsciousUntil = 0;
            mockRoom.state.players.set('sess1', player);
            mockRoom.entities.set('sess1', { body: { setTranslation: vi.fn(), translation: () => ({x:0, y:0}) } } as any);
        });

        it('should knock out player to an infirmary bed', () => {
            healthSystem.knockOut(player, 'sess1');
            expect(player.unconsciousUntil).toBeGreaterThan(Date.now());
            const validBeds = CONFIG.INFIRMARY_BEDS;
            expect(validBeds.some(b => b.x === player.x && b.y === player.y)).toBe(true);
        });

        it('should wake up player after time passes', () => {
            player.unconsciousUntil = Date.now() - 1000;
            healthSystem.update();
            expect(player.unconsciousUntil).toBe(0);
        });
    });

    describe('3. Loot System (Items)', () => {
        let itemSystem: ItemSystem;
        let player: Player;
        let item: WorldItem;

        beforeEach(() => {
            itemSystem = new ItemSystem(mockRoom);
            player = new Player();
            player.inventory.clear();
            mockRoom.state.players.set('p1', player);
            item = new WorldItem();
            item.id = "i1"; item.x = 100; item.y = 100; item.itemId = "pot_antidote";
            mockRoom.state.items.set("i1", item);
        });

        it('should allow collection within 100px', () => {
            mockRoom.entities.set('p1', { body: { translation: () => ({ x: 180, y: 100 }) } } as any);
            itemSystem.tryCollectItem('p1', 'i1');
            expect(mockRoom.state.items.has('i1')).toBe(false);
        });
    });

    describe('4. Duel System (4 Rings)', () => {
        let duelSystem: DuelSystem;
        let p1: Player, p2: Player, p3: Player;

        beforeEach(() => {
            duelSystem = new DuelSystem(mockRoom);
            mockRoom.state.players.clear();
            mockRoom.entities.clear();
            vi.clearAllMocks();

            // Create Players
            p1 = new Player(); p1.username = "Alice"; mockRoom.state.players.set('a', p1);
            p2 = new Player(); p2.username = "Bob"; mockRoom.state.players.set('b', p2);
            p3 = new Player(); p3.username = "Charlie"; mockRoom.state.players.set('c', p3);

            // Create Entity Bodies
            const createBody = (x: number, y: number) => ({
                translation: () => ({ x, y }),
                applyImpulse: vi.fn(),
                setTranslation: vi.fn()
            });

            mockRoom.entities.set('a', { body: createBody(0, 0) } as any);
            mockRoom.entities.set('b', { body: createBody(0, 0) } as any);
            mockRoom.entities.set('c', { body: createBody(0, 0) } as any);
        });

        it('should start countdown when 2 players enter Ring 1', () => {
            const r1 = CONFIG.DUEL_ZONES[0];
            mockRoom.entities.get('a')!.body.translation = () => ({ x: r1.x, y: r1.y });
            mockRoom.entities.get('b')!.body.translation = () => ({ x: r1.x + 10, y: r1.y + 10 });

            duelSystem.update();

            // Should have a timer item
            const items = Array.from(mockRoom.state.items.values());
            expect(items.some(i => i.type === 'timer')).toBe(true);
            expect(mockRoom.chatManager.broadcastSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Countdown Started'));
        });

        it('should repel 3rd player if match is active/starting', () => {
            const r1 = CONFIG.DUEL_ZONES[0];
            // Alice & Bob inside
            mockRoom.entities.get('a')!.body.translation = () => ({ x: r1.x, y: r1.y });
            mockRoom.entities.get('b')!.body.translation = () => ({ x: r1.x + 10, y: r1.y + 10 });
            duelSystem.update(); // Alice & Bob start countdown

            // Charlie enters
            mockRoom.entities.get('c')!.body.translation = () => ({ x: r1.x + 5, y: r1.y + 5 });
            duelSystem.update();

            expect(mockRoom.entities.get('c')!.body.applyImpulse).toHaveBeenCalled();
        });

        it('should end match if player leaves during active duel', async () => {
            const r1 = CONFIG.DUEL_ZONES[0];
            mockRoom.entities.get('a')!.body.translation = () => ({ x: r1.x, y: r1.y });
            mockRoom.entities.get('b')!.body.translation = () => ({ x: r1.x + 10, y: r1.y + 10 });
            
            duelSystem.update(); // Pre-match
            
            // Fast forward 6 seconds manually (mocking time is better but let's reset startTime)
            (duelSystem as any).matches.get(0).startTime -= 6000;
            
            duelSystem.update(); // Now Active (FIGHT!)
            
            // Alice leaves
            mockRoom.entities.get('a')!.body.translation = () => ({ x: 0, y: 0 });
            duelSystem.update();

            expect(p1.inDuel).toBe(false);
            expect(mockRoom.chatManager.broadcastSystemMessage).toHaveBeenCalledWith(expect.stringContaining('out! Winner:'));
            // Both Alice and Bob should be ejected
            expect(mockRoom.entities.get('a')!.body.setTranslation).toHaveBeenCalled();
            expect(mockRoom.entities.get('b')!.body.setTranslation).toHaveBeenCalled();
        });

        it('should allow simultaneous matches in different rings', () => {
            const r1 = CONFIG.DUEL_ZONES[0];
            const r2 = CONFIG.DUEL_ZONES[1];

            // Ring 1: Alice & Bob
            mockRoom.entities.get('a')!.body.translation = () => ({ x: r1.x, y: r1.y });
            mockRoom.entities.get('b')!.body.translation = () => ({ x: r1.x + 5, y: r1.y + 5 });
            
            // Ring 2: Charlie (alone for now)
            mockRoom.entities.get('c')!.body.translation = () => ({ x: r2.x, y: r2.y });

            duelSystem.update();

            expect(mockRoom.chatManager.broadcastSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Ring 1: Countdown'));
            expect(mockRoom.chatManager.broadcastSystemMessage).not.toHaveBeenCalledWith(expect.stringContaining('Ring 2: Countdown'));
        });
    });

});

