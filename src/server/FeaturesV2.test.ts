import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIG, getAcademicProgress, getGameTime } from '../shared/Config';
import { HealthSystem } from './systems/HealthSystem';
import { ItemSystem } from './systems/ItemSystem';
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
            // Test Case: 1 Week after Season Start
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            const simulatedNow = CONFIG.SEASON_START_DATE + oneWeekMs + 1000;
            
            const progress = getAcademicProgress(CONFIG.SEASON_START_DATE, simulatedNow);
            
            // Should be Week 2 (CurrentWeek is 1-based, 0-7 days = Week 1, 7-14 = Week 2)
            expect(progress.currentWeek).toBe(2);
            expect(progress.currentDay).toBe(1); // Monday
        });

        it('should calculate game hour deterministically based on timestamp', () => {
            // 45 min cycle. 0ms = 06:00 AM.
            // Halfway (22.5 min) should be late afternoon/evening.
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
            player.x = 1000;
            player.y = 1000;
            player.unconsciousUntil = 0;
            mockRoom.state.players.set('sess1', player);
            
            // Mock Entity Body
            mockRoom.entities.set('sess1', { 
                body: { setTranslation: vi.fn(), translation: () => ({x:0, y:0}) } 
            } as any);
        });

        it('should knock out player to an infirmary bed', () => {
            healthSystem.knockOut(player, 'sess1');
            
            expect(player.unconsciousUntil).toBeGreaterThan(Date.now());
            expect(player.inDuel).toBe(false);
            
            // Should be at one of the beds
            const validBeds = CONFIG.INFIRMARY_BEDS;
            const onBed = validBeds.some(b => b.x === player.x && b.y === player.y);
            expect(onBed).toBe(true);
            
            expect(mockRoom.chatManager.broadcastSystemMessage).toHaveBeenCalledWith(expect.stringContaining('passed out'));
        });

        it('should wake up player after time passes', () => {
            player.unconsciousUntil = Date.now() - 1000; // Past time
            healthSystem.update();
            
            expect(player.unconsciousUntil).toBe(0);
            expect(mockRoom.chatManager.broadcastSystemMessage).toHaveBeenCalledWith(expect.stringContaining('recovered'));
            
            // Player should NOT be teleported to exit automatically (Manual walk logic)
            // But logic in HealthSystem might update position? No, we removed teleport on wake up.
            // Let's verify position didn't change to EXIT
            expect(player.x).not.toBe(CONFIG.INFIRMARY_EXIT.x);
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
            mockRoom.state.players.set('sess1', player);
            
            item = new WorldItem();
            item.id = "item1";
            item.x = 100;
            item.y = 100;
            item.itemId = "pot_antidote"; // Valid item
            mockRoom.state.items.set("item1", item);
        });

        it('should allow collection within extended radius (100px)', () => {
            // Player at 180, 100 (Dist 80px) -> Should work (Radius is 100)
            mockRoom.entities.set('sess1', { 
                body: { translation: () => ({ x: 180, y: 100 }) } 
            } as any);

            itemSystem.tryCollectItem('sess1', 'item1');
            
            expect(mockRoom.state.items.has('item1')).toBe(false); // Collected
            expect(player.inventory.length).toBe(1);
        });

        it('should fail collection outside radius (101px)', () => {
            // Player at 201, 100 (Dist 101px)
            mockRoom.entities.set('sess1', { 
                body: { translation: () => ({ x: 201, y: 100 }) } 
            } as any);

            itemSystem.tryCollectItem('sess1', 'item1');
            
            expect(mockRoom.state.items.has('item1')).toBe(true); // Not collected
            expect(player.inventory.length).toBe(0);
        });
    });

});
