import { db } from "../db";
import { GameState } from "../../shared/SchemaDef";

export class WorldService {
    public static async loadWorldState(state: GameState) {
        try {
            // Find or Create (Singleton ID 1)
            let ws = await db.worldState.findUnique({ where: { id: 1 } });
            
            if (!ws) {
                console.log("[DB] Initializing World State...");
                ws = await db.worldState.create({
                    data: {
                        id: 1,
                        ignisPoints: 0,
                        axiomPoints: 0,
                        vesperPoints: 0,
                        timeOffset: BigInt(0)
                    }
                });
            }

            // Sync to State
            state.ignisPoints = ws.ignisPoints;
            state.axiomPoints = ws.axiomPoints;
            state.vesperPoints = ws.vesperPoints;
            state.timeOffset = Number(ws.timeOffset);

            console.log(`[DB] World State Loaded. Ignis: ${ws.ignisPoints}, Axiom: ${ws.axiomPoints}, Vesper: ${ws.vesperPoints}`);
        } catch (e) {
            console.error("[DB] Failed to load World State:", e);
        }
    }

    public static async saveWorldState(state: GameState) {
        try {
            await db.worldState.update({
                where: { id: 1 },
                data: {
                    ignisPoints: state.ignisPoints,
                    axiomPoints: state.axiomPoints,
                    vesperPoints: state.vesperPoints,
                    timeOffset: BigInt(state.timeOffset),
                    lastSaved: new Date()
                }
            });
            // console.log("[DB] World State Saved.");
        } catch (e) {
            console.error("[DB] Failed to save World State:", e);
        }
    }
}
