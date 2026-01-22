import { describe, it, expect, vi, beforeEach } from "vitest";
import { AcademicManager } from "./managers/AcademicManager";
import { GameState, Player } from "../shared/SchemaDef";
import { CONFIG } from "../shared/Config";
import { LevelRegistry } from "./managers/LevelRegistry";

describe("Audit: Class System (AcademicManager)", () => {
    let manager: AcademicManager;
    let state: GameState;
    let spawnManager: any;
    let chatManager: any;
    let prestigeSystem: any;
    let entities: Map<string, any>;

    beforeEach(() => {
        // Mock LevelRegistry
            LevelRegistry.getInstance().setData({
                locations: new Map([["CLASSROOM", { x: 100, y: 100, id: "CLASSROOM", width: 100, height: 100 }]]),
                anchors: new Map(),
                itemSpawns: [],
                duelZones: [],
            infirmaryBeds: [],
            infirmaryExit: { x: 0, y: 0 },
            duelExits: new Map()
        });

        state = new GameState();
        entities = new Map();
        
        spawnManager = {
            seats: {
                class: new Map([[0, { x: 100, y: 100 }]]) // Fake desk at 100,100
            }
        };
        
        chatManager = {
            broadcastSystemMessage: vi.fn()
        };
        
        prestigeSystem = {
            addPrestige: vi.fn(),
            addGold: vi.fn(),
            removePrestige: vi.fn()
        };

        manager = new AcademicManager(state, spawnManager, chatManager, prestigeSystem, entities);
        
        // Force Time to match a class window
        // Assuming 10:00 is class time in CONFIG
        state.worldStartTime = Date.now(); // Reset
    });

    it("should detect player at desk and start class state", () => {
        const sessionId = "test_client";
        const player = new Player();
        player.username = "Tester";
        player.x = 100;
        player.y = 100;
        state.players.set(sessionId, player);

        entities.set(sessionId, {
            id: 1,
            body: {
                linvel: () => ({ x: 0, y: 0 }),
                translation: () => ({ x: 100, y: 100 })
            },
            player: { sessionId }
        });

        // Run Update with Hour 10 (Class Time)
        // dt > 1000 to trigger internal timer
        manager.update(1100, 9); // 9:00 is class start in Config (8.5 to 10.5)

        const updatedPlayer = state.players.get(sessionId);
        expect(updatedPlayer?.isAttendingClass).toBe(true);
        expect(updatedPlayer?.classEndsAt).toBeGreaterThan(Date.now());
    });

    it("should complete class after time passes", () => {
        const sessionId = "test_client";
        const player = new Player();
        player.username = "Tester";
        player.isAttendingClass = true;
        player.classEndsAt = Date.now() - 1000; // Ended
        state.players.set(sessionId, player);

        entities.set(sessionId, {
            id: 1,
            body: { translation: () => ({ x: 100, y: 100 }), linvel: () => ({x:0,y:0}) },
            player: { sessionId }
        });

        manager.update(1100, 9);

        const updatedPlayer = state.players.get(sessionId);
        expect(updatedPlayer?.isAttendingClass).toBe(false);
        expect(prestigeSystem.addPrestige).toHaveBeenCalled();
        expect(chatManager.broadcastSystemMessage).toHaveBeenCalled();
    });

    it("should set Echoes to attending_class state based on AI", () => {
        const sessionId = "echo_1";
        const player = new Player();
        player.username = "Echo 1";
        state.players.set(sessionId, player);

        entities.set(sessionId, {
            id: 2,
            body: { translation: () => ({ x: 100, y: 100 }) },
            ai: { state: 'attending_class' },
            player: { sessionId }
        });

        manager.update(1100, 9);

        expect(state.players.get(sessionId)?.isAttendingClass).toBe(true);
    });
});
