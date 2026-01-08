"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrestigeSystem = void 0;
class PrestigeSystem {
    constructor(room) {
        this.room = room;
    }
    /**
     * Adds prestige points to a student and their house.
     */
    addPrestige(sessionId, amount) {
        const playerState = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!playerState || !entity)
            return;
        const house = entity.ai?.house || this.getHouseBySkin(playerState.skin);
        if (!house)
            return;
        // 1. Update Student Balance
        playerState.personalPrestige += amount;
        // 2. Update House Total
        if (house === 'ignis')
            this.room.state.ignisPoints += amount;
        else if (house === 'axiom')
            this.room.state.axiomPoints += amount;
        else if (house === 'vesper')
            this.room.state.vesperPoints += amount;
        console.log(`[PRESTIGE] ${playerState.username} (+${amount}) -> House ${house}`);
    }
    /**
     * Removes prestige points, enforcing the ANTI-SABOTAGE rule.
     * A student cannot lose more points than they have personally earned.
     */
    removePrestige(sessionId, amount) {
        const playerState = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!playerState || !entity)
            return;
        const house = entity.ai?.house || this.getHouseBySkin(playerState.skin);
        if (!house)
            return;
        // ANTI-SABOTAGE: Limit reduction to current personal balance
        const actualReduction = Math.min(amount, playerState.personalPrestige);
        if (actualReduction <= 0)
            return;
        // 1. Update Student Balance
        playerState.personalPrestige -= actualReduction;
        // 2. Update House Total
        if (house === 'ignis')
            this.room.state.ignisPoints -= actualReduction;
        else if (house === 'axiom')
            this.room.state.axiomPoints -= actualReduction;
        else if (house === 'vesper')
            this.room.state.vesperPoints -= actualReduction;
        console.log(`[PRESTIGE] ${playerState.username} (-${actualReduction}/${amount}) -> House ${house}`);
    }
    getHouseBySkin(skin) {
        if (skin.includes('red'))
            return 'ignis';
        if (skin.includes('blue'))
            return 'axiom';
        // Default/Demos
        return 'vesper';
    }
}
exports.PrestigeSystem = PrestigeSystem;
