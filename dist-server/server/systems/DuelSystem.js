"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuelSystem = void 0;
const Config_1 = require("../../shared/Config");
const SchemaDef_1 = require("../../shared/SchemaDef");
class DuelSystem {
    constructor(room) {
        this.matches = new Map(); // zoneId -> Match
        this.cooldowns = new Map(); // sessionId -> timestamp
        this.room = room;
    }
    update() {
        const now = Date.now();
        // Iterate over all configured zones
        Config_1.CONFIG.DUEL_ZONES.forEach(zone => {
            const match = this.matches.get(zone.id);
            const candidates = [];
            // 1. Scan Zone
            this.room.entities.forEach((entity, id) => {
                const body = entity.body;
                if (!body)
                    return;
                const pos = body.translation();
                const dist = Math.sqrt((pos.x - zone.x) ** 2 + (pos.y - zone.y) ** 2);
                // Player is INSIDE
                if (dist < zone.radius) {
                    // Check Cooldown
                    if (this.cooldowns.has(id) && now < this.cooldowns.get(id)) {
                        this.repelPlayer(id, pos, zone);
                        return;
                    }
                    // Match Logic
                    if (match) {
                        // If not a participant, REPEL
                        if (id !== match.p1 && id !== match.p2) {
                            this.repelPlayer(id, pos, zone);
                        }
                    }
                    else {
                        candidates.push(id);
                    }
                }
                else {
                    // Player is OUTSIDE
                    if (match) {
                        if (id === match.p1 || id === match.p2) {
                            if (match.state === 'pre_match') {
                                this.cancelMatch(match, "Player left during countdown.");
                            }
                            else {
                                this.handleRingOut(match, id);
                            }
                        }
                    }
                }
            });
            // 2. Start Countdown Logic (If free)
            if (!match && candidates.length >= 2) {
                const p1 = candidates[0];
                const p2 = candidates[1];
                // Eject others
                for (let i = 2; i < candidates.length; i++) {
                    const ent = this.room.entities.get(candidates[i]);
                    if (ent?.body)
                        this.repelPlayer(candidates[i], ent.body.translation(), zone);
                }
                this.startCountdown(zone, p1, p2);
            }
            // 3. Match Maintenance
            if (match) {
                if (match.state === 'pre_match') {
                    const elapsed = now - match.startTime;
                    const remaining = Math.ceil((5000 - elapsed) / 1000);
                    if (elapsed >= 5000) {
                        this.startMatch(match);
                    }
                    else {
                        // Update Timer Visual
                        if (match.timerId) {
                            const item = this.room.state.items.get(match.timerId);
                            if (item && item.itemId !== remaining.toString()) {
                                item.itemId = remaining.toString();
                            }
                        }
                    }
                }
                else {
                    // Active Match Timeout
                    if (now - match.startTime > Config_1.CONFIG.DUEL_TIMEOUT_MS) {
                        this.room.chatManager.broadcastSystemMessage(`Duel Timeout (Ring ${zone.id + 1})! Both ejected.`);
                        this.forceEndMatch(match);
                    }
                }
            }
        });
    }
    startCountdown(zone, p1, p2) {
        const timerId = `duel_timer_${zone.id}_${Date.now()}`;
        const item = new SchemaDef_1.WorldItem();
        item.id = timerId;
        item.x = zone.x;
        item.y = zone.y;
        item.type = "timer";
        item.itemId = "5";
        this.room.state.items.set(timerId, item);
        const match = {
            p1, p2,
            startTime: Date.now(),
            state: 'pre_match',
            timerId: timerId,
            zoneId: zone.id
        };
        this.matches.set(zone.id, match);
        this.room.chatManager.broadcastSystemMessage(`Ring ${zone.id + 1}: Countdown Started!`);
    }
    cancelMatch(match, reason) {
        this.room.chatManager.broadcastSystemMessage(`Ring ${match.zoneId + 1} Cancelled: ${reason}`);
        if (match.timerId)
            this.room.state.items.delete(match.timerId);
        this.matches.delete(match.zoneId);
    }
    startMatch(match) {
        if (match.timerId)
            this.room.state.items.delete(match.timerId);
        match.state = 'active';
        match.startTime = Date.now();
        const name1 = this.room.state.players.get(match.p1)?.username || "Fighter 1";
        const name2 = this.room.state.players.get(match.p2)?.username || "Fighter 2";
        this.room.chatManager.broadcastSystemMessage(`Ring ${match.zoneId + 1}: FIGHT! ${name1} VS ${name2}`);
        [match.p1, match.p2].forEach(id => {
            const p = this.room.state.players.get(id);
            if (p) {
                p.inDuel = true;
                p.duelScore = 0;
            }
            const ent = this.room.entities.get(id);
            if (ent?.ai) {
                ent.ai.state = 'duel';
                ent.ai.targetId = (id === match.p1) ? match.p2 : match.p1;
            }
        });
    }
    resolveLoss(loserId) {
        // Find match containing loser
        for (const match of this.matches.values()) {
            if (match.state === 'active' && (match.p1 === loserId || match.p2 === loserId)) {
                this.handleRingOut(match, loserId);
                return;
            }
        }
    }
    handleRingOut(match, loserId) {
        const winnerId = (loserId === match.p1) ? match.p2 : match.p1;
        const loserName = this.room.state.players.get(loserId)?.username || "Fighter";
        const winnerName = this.room.state.players.get(winnerId)?.username || "Winner";
        this.room.chatManager.broadcastSystemMessage(`Ring ${match.zoneId + 1}: ${loserName} out! Winner: ${winnerName}`);
        this.cooldowns.set(loserId, Date.now() + Config_1.CONFIG.DUEL_COOLDOWN_MS);
        this.resetPlayer(match, loserId, true);
        this.resetPlayer(match, winnerId, true); // Eject winner too
        this.matches.delete(match.zoneId);
    }
    forceEndMatch(match) {
        this.resetPlayer(match, match.p1, true);
        this.resetPlayer(match, match.p2, true);
        this.matches.delete(match.zoneId);
    }
    resetPlayer(match, id, eject) {
        const p = this.room.state.players.get(id);
        if (p) {
            p.inDuel = false;
            p.duelScore = 0;
            if (eject) {
                // Find Exit for this Zone
                const exit = Config_1.CONFIG.DUEL_EXITS[match.zoneId];
                if (exit) {
                    p.x = exit.x;
                    p.y = exit.y;
                    const ent = this.room.entities.get(id);
                    if (ent && ent.body) {
                        ent.body.setTranslation({ x: p.x, y: p.y }, true);
                        if (ent.ai) {
                            ent.ai.state = 'idle';
                            ent.ai.targetId = undefined;
                        }
                    }
                }
            }
        }
    }
    repelPlayer(id, pos, zone) {
        const ent = this.room.entities.get(id);
        if (ent && ent.body) {
            const dx = pos.x - zone.x;
            const dy = pos.y - zone.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const force = 200000;
                ent.body.applyImpulse({ x: (dx / len) * force, y: (dy / len) * force }, true);
            }
        }
    }
}
exports.DuelSystem = DuelSystem;
