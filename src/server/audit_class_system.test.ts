import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorldRoom } from "./WorldRoom";
import { GameState, Player } from "../shared/SchemaDef";
import { CONFIG } from "../shared/Config";

describe("Audit: Class System & Core Mechanics", () => {
    let room: WorldRoom;

    beforeEach(async () => {
        room = new WorldRoom();
        room.setState(new GameState());
        // Mock Physics and Spawn to avoid loading heavy map files
        room.spawnManager = {
            seats: {
                class: new Map([[0, { x: 100, y: 100 }]]) // Fake desk at 100,100
            },
            spawnEchoes: vi.fn(),
            loadSeats: vi.fn(),
            spawnFromMap: vi.fn()
        } as any;
        
        // Mock Physics World
        room.physicsWorld = {
            createRigidBody: vi.fn(() => ({
                translation: () => ({ x: 100, y: 100 }), // Player is AT the desk
                linvel: () => ({ x: 0, y: 0 }), // Not moving
                setTranslation: vi.fn(),
                lockRotations: vi.fn(),
                setLinearDamping: vi.fn(),
                userData: {}
            })),
            createCollider: vi.fn(),
            removeRigidBody: vi.fn(), 
            step: vi.fn(),
        } as any;

        // Init minimal systems
        room.entities = new Map();
        room.clients = [{ sessionId: "test_client", send: vi.fn() }] as any;
        room.chatManager = {
            broadcastSystemMessage: vi.fn()
        } as any;
        
        // Force Time to 10:00 AM (Class Time)
        // 10 AM = 10 * 60 * 60 * 1000 = 36,000,000 ms from start of day
        // We mock getGameTime implicitly by setting World Start Time relative to "now"
        // If "now" is X, and we want (now - start) to be 10 hours...
        // start = now - 10 hours.
        room.state.worldStartTime = Date.now() - 36000000; 
    });

    it("should detect player at desk and trigger minigame", () => {
        // 1. Setup Player
        const sessionId = "test_client";
        const player = new Player();
        player.username = "Tester";
        player.x = 100;
        player.y = 100;
        player.isAttendingClass = false;
        player.classEndsAt = 0;
        player.academicPoints = 0;
        player.xp = 0;
        room.state.players.set(sessionId, player);

        room.entities.set(sessionId, {
            body: room.physicsWorld.createRigidBody({} as any),
            player: { sessionId },
            // NO AI -> Real Player
        } as any);

        // 2. Run Attendance Check (Simulate 10 AM)
        room.checkClassAttendance(10); 

        // 3. Verify Trigger
        const updatedPlayer = room.state.players.get(sessionId);
        expect(updatedPlayer?.isAttendingClass).toBe(true);
        expect(updatedPlayer?.classEndsAt).toBeGreaterThan(Date.now());

        // Verify Client Message
        expect(room.clients[0].send).toHaveBeenCalledWith("start_minigame", expect.objectContaining({ duration: 180000 }));
    });

    it("should complete class after time passes", () => {
        const sessionId = "test_client";
        const now = Date.now();
        
        // Setup Player ALREADY in class, but time has passed
        const player = new Player();
        player.username = "Tester";
        player.x = 100;
        player.y = 100;
        player.isAttendingClass = true;
        player.classEndsAt = now - 1000;
        player.academicPoints = 0;
        player.xp = 0;
        room.state.players.set(sessionId, player);

        room.entities.set(sessionId, {
            body: room.physicsWorld.createRigidBody({} as any),
            player: { sessionId }
        } as any);

        // Run Check
        room.checkClassAttendance(10);

        const updatedPlayer = room.state.players.get(sessionId);
        expect(updatedPlayer?.isAttendingClass).toBe(false);
        expect(updatedPlayer?.academicPoints).toBe(5); // +5 Reward
        expect(room.clients[0].send).toHaveBeenCalledWith("class_completed", expect.anything());
    });

    it("should set Echoes to attending_class state", () => {
        const sessionId = "echo_1";
        const player = new Player();
        player.username = "Echo 1";
        player.isAttendingClass = false;
        player.academicPoints = 0;
        room.state.players.set(sessionId, player);

        const aiState = { state: 'attending_class' }; // AI System sets this first
        room.entities.set(sessionId, {
            body: room.physicsWorld.createRigidBody({} as any),
            ai: aiState,
            player: { sessionId }
        } as any);

        // Run Check
        room.checkClassAttendance(10);

        // Should sync AI state to Schema
        expect(room.state.players.get(sessionId)?.isAttendingClass).toBe(true);
        expect(room.attendanceLog.size).toBeGreaterThan(0); // Should log attendance
    });
});