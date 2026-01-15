import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WorldService } from "./services/WorldService";
import { GameState } from "../shared/SchemaDef";
import { db } from "./db";

describe("WorldService Persistence Audit", () => {
    
    beforeEach(async () => {
        // Clean WorldState
        await db.worldState.deleteMany();
    });

    it("should create default world state if missing", async () => {
        const state = new GameState();
        await WorldService.loadWorldState(state);

        expect(state.ignisPoints).toBe(0);
        
        // Verify DB record created
        const ws = await db.worldState.findUnique({ where: { id: 1 } });
        expect(ws).not.toBeNull();
        expect(ws?.ignisPoints).toBe(0);
    });

    it("should load existing values", async () => {
        // Create existing state
        await db.worldState.create({
            data: {
                id: 1,
                ignisPoints: 100,
                axiomPoints: 50,
                vesperPoints: 25,
                timeOffset: BigInt(5000)
            }
        });

        const state = new GameState();
        await WorldService.loadWorldState(state);

        expect(state.ignisPoints).toBe(100);
        expect(state.axiomPoints).toBe(50);
        expect(state.vesperPoints).toBe(25);
        expect(state.timeOffset).toBe(5000);
    });

    it("should save changes", async () => {
        // Init
        const state = new GameState();
        await WorldService.loadWorldState(state);

        // Mutate
        state.ignisPoints = 999;
        state.timeOffset = 12345;

        // Save
        await WorldService.saveWorldState(state);

        // Verify DB
        const ws = await db.worldState.findUnique({ where: { id: 1 } });
        expect(ws?.ignisPoints).toBe(999);
        expect(Number(ws?.timeOffset)).toBe(12345);
    });
});
