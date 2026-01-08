"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuelSystem = void 0;
const Config_1 = require("../../shared/Config");
class DuelSystem {
    constructor(room) {
        this.room = room;
    }
    update() {
        const zone = Config_1.CONFIG.DUEL_ZONE;
        this.room.entities.forEach((entity, id) => {
            const body = entity.body;
            if (!body)
                return;
            const pos = body.translation();
            const dist = Math.sqrt((pos.x - zone.x) ** 2 + (pos.y - zone.y) ** 2);
            const playerState = this.room.state.players.get(id);
            if (!playerState)
                return;
            if (dist < zone.radius) {
                if (!playerState.inDuel) {
                    playerState.inDuel = true;
                    playerState.duelScore = 0;
                }
                // AI Logic: Engage
                if (entity.ai && entity.ai.state !== 'duel') {
                    this.assignDuelTarget(entity, id);
                }
            }
            else {
                if (playerState.inDuel) {
                    playerState.inDuel = false;
                    playerState.duelScore = 0;
                    if (entity.ai)
                        entity.ai.state = 'idle';
                }
            }
        });
    }
    assignDuelTarget(entity, myId) {
        const myState = this.room.state.players.get(myId);
        if (!myState)
            return;
        let minDist = Infinity;
        let targetId = null;
        this.room.state.players.forEach((p, id) => {
            if (id === myId || !p.inDuel)
                return;
            // House Rivalry: Only attack different houses
            if (p.house === myState.house)
                return;
            const myPos = entity.body.translation();
            const dist = Math.sqrt((p.x - myPos.x) ** 2 + (p.y - myPos.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                targetId = id;
            }
        });
        if (targetId) {
            entity.ai.targetId = targetId;
            entity.ai.state = 'duel';
            entity.ai.timer = 0; // Reset timer for casting
        }
    }
}
exports.DuelSystem = DuelSystem;
