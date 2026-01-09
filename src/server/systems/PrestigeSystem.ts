import { WorldRoom } from "../WorldRoom";
import { Player } from "../../shared/SchemaDef";

export class PrestigeSystem {
    private room: WorldRoom;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    /**
     * Adds prestige points to a student and their house.
     */
    public addPrestige(sessionId: string, amount: number) {
        // SYSTEM PAUSED: No points awarded until official GDD update.
        return;
        
        /*
        const playerState = this.room.state.players.get(sessionId);
        // ... (Logic Disabled)
        */
    }

    /**
     * Removes prestige points, enforcing the ANTI-SABOTAGE rule.
     * A student cannot lose more points than they have personally earned.
     */
    public removePrestige(sessionId: string, amount: number) {
        const playerState = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!playerState || !entity) return;

        const house = entity.ai?.house || this.getHouseBySkin(playerState.skin);
        if (!house) return;

        // ANTI-SABOTAGE: Limit reduction to current personal balance
        const actualReduction = Math.min(amount, playerState.personalPrestige);
        if (actualReduction <= 0) return;

        // 1. Update Student Balance
        playerState.personalPrestige -= actualReduction;

        // 2. Update House Total
        if (house === 'ignis') this.room.state.ignisPoints -= actualReduction;
        else if (house === 'axiom') this.room.state.axiomPoints -= actualReduction;
        else if (house === 'vesper') this.room.state.vesperPoints -= actualReduction;

        console.log(`[PRESTIGE] ${playerState.username} (-${actualReduction}/${amount}) -> House ${house}`);
    }

    private getHouseBySkin(skin: string): 'ignis' | 'axiom' | 'vesper' | null {
        if (skin.includes('red')) return 'ignis';
        if (skin.includes('blue')) return 'axiom';
        // Default/Demos
        return 'vesper';
    }
}
