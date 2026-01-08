"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellSystem = void 0;
const Config_1 = require("../../shared/Config");
const rapier2d_compat_1 = __importDefault(require("@dimforge/rapier2d-compat"));
class SpellSystem {
    constructor(room) {
        this.room = room;
        // Initialize reusable ray
        this.ray = new rapier2d_compat_1.default.Ray({ x: 0, y: 0 }, { x: 0, y: 0 });
    }
    update(dt) {
        const projectiles = this.room.state.projectiles;
        const now = Date.now();
        const toRemove = new Set();
        // Cache entries to avoid repeated iterator creation and allow indexed access
        const entries = Array.from(projectiles.entries());
        const count = entries.length;
        // 1. Move & Check Player Collisions (Raycast)
        for (let i = 0; i < count; i++) {
            const [id, proj] = entries[i];
            if (toRemove.has(id))
                continue;
            const dx = (proj.vx * dt) / 1000;
            const dy = (proj.vy * dt) / 1000;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                // Reuse Ray
                this.ray.origin.x = proj.x;
                this.ray.origin.y = proj.y;
                this.ray.dir.x = dx;
                this.ray.dir.y = dy;
                // Limit ray to movement distance + radius
                const hit = this.room.physicsWorld.castRay(this.ray, dist + 10, true);
                if (hit) {
                    const collider = hit.collider;
                    const parentBody = collider.parent();
                    if (parentBody) {
                        const userData = parentBody.userData;
                        if (userData && userData.sessionId && userData.sessionId !== proj.ownerId) {
                            // Valid Hit
                            this.handlePlayerHit(proj.ownerId, userData.sessionId);
                            toRemove.add(id);
                        }
                    }
                }
            }
            proj.x += dx;
            proj.y += dy;
            // Cleanup Age
            if (now - proj.creationTime > 2000)
                toRemove.add(id);
        }
        // 2. Projectile vs Projectile (RPS Logic)
        for (let i = 0; i < count; i++) {
            const [idA, projA] = entries[i];
            if (toRemove.has(idA))
                continue;
            for (let j = i + 1; j < count; j++) {
                const [idB, projB] = entries[j];
                if (toRemove.has(idB))
                    continue;
                const distSq = (projA.x - projB.x) ** 2 + (projA.y - projB.y) ** 2;
                if (distSq < 900) { // 30px collision radius
                    this.resolveRPS(projA, projB, idA, idB, toRemove);
                }
            }
        }
        toRemove.forEach(id => {
            projectiles.delete(id);
        });
    }
    resolveRPS(a, b, idA, idB, toRemove) {
        // Extract base type (remove suffix if any)
        const getBase = (id) => {
            if (id.includes('circle'))
                return 'circle';
            if (id.includes('square'))
                return 'square';
            if (id.includes('triangle'))
                return 'triangle';
            return 'circle';
        };
        const typeA = Config_1.CONFIG.RPS_MAP[getBase(a.spellId)];
        const typeB = Config_1.CONFIG.RPS_MAP[getBase(b.spellId)];
        if (typeA === typeB) {
            toRemove.add(idA);
            toRemove.add(idB);
        }
        else if (Config_1.CONFIG.RPS_WINNER[typeA] === typeB) {
            // A beats B
            toRemove.add(idB);
        }
        else {
            // B beats A
            toRemove.add(idA);
        }
    }
    handlePlayerHit(attackerId, victimId) {
        const attacker = this.room.state.players.get(attackerId);
        const victim = this.room.state.players.get(victimId);
        if (attacker && victim) {
            // Basic duel score logic
            attacker.duelScore = (attacker.duelScore || 0) + 1;
            console.log(`[PVP] ${attacker.username} scored against ${victim.username}. Score: ${attacker.duelScore}`);
            if (attacker.duelScore >= 2) {
                // WINNER DECLARED
                console.log(`[DUEL] ${attacker.username} WINS MATCH against ${victim.username}!`);
                attacker.duelScore = 0;
                victim.duelScore = 0;
                // Stop fighting logic for AI
                const stopAI = (id) => {
                    const ent = this.room.entities.get(id);
                    if (ent?.ai) {
                        ent.ai.state = 'idle';
                        ent.ai.targetId = undefined;
                    }
                };
                stopAI(attackerId);
                stopAI(victimId);
                // Award Prestige to Winner
                this.room.prestigeSystem.addPrestige(attackerId, 20);
            }
        }
    }
}
exports.SpellSystem = SpellSystem;
