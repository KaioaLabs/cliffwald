import { LogicData, GameLocation, DuelZone } from "../../shared/MapParser";

export class LevelRegistry {
    private static instance: LevelRegistry;
    private data: LogicData | null = null;

    private constructor() {}

    public static getInstance(): LevelRegistry {
        if (!LevelRegistry.instance) {
            LevelRegistry.instance = new LevelRegistry();
        }
        return LevelRegistry.instance;
    }

    public setData(data: LogicData) {
        this.data = data;
        console.log(`[LevelRegistry] Initialized with ${data.locations.size} locations and ${data.duelZones.length} duel zones.`);
    }

    public getLocation(id: string): GameLocation {
        if (!this.data) throw new Error("LevelRegistry not initialized!");
        const loc = this.data.locations.get(id);
        if (!loc) {
            console.warn(`[LevelRegistry] Location '${id}' not found in map data. Returning fallback (0,0).`);
            return { x: 0, y: 0, width: 0, height: 0, id: "MISSING" };
        }
        return loc;
    }

    public getDuelZones(): DuelZone[] {
        return this.data?.duelZones || [];
    }

    public getInfirmaryBeds(): {x: number, y: number}[] {
        return this.data?.infirmaryBeds || [];
    }

    public getInfirmaryExit(): {x: number, y: number} {
        return this.data?.infirmaryExit || { x: 1600, y: 1050 }; // Hard fallback just in case
    }

    public getDuelExits(): Map<number, {x: number, y: number}> {
        return this.data?.duelExits || new Map();
    }

    public getDuelExit(id: number): {x: number, y: number} | undefined {
        return this.data?.duelExits.get(id);
    }

    public getAnchor(id: string): {x: number, y: number} | undefined {
        return this.data?.anchors.get(id);
    }

    public getItemSpawns(): {x: number, y: number}[] {
        return this.data?.itemSpawns || [];
    }

    // Helper for safe access
    public hasData(): boolean {
        return this.data !== null;
    }
}
