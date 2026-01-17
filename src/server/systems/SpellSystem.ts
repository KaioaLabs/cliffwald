import { WorldRoom } from "../WorldRoom";
import { Projectile } from "../../shared/SchemaDef";
import { CONFIG, getGameTime } from "../../shared/Config";
import { ZONE_DATA } from "../../shared/data/ZoneRegistry";
import RAPIER from "@dimforge/rapier2d-compat";
import { PhysicsUserData } from "../types/PhysicsTypes";

export class SpellSystem {
    private room: WorldRoom;
    private ray: RAPIER.Ray;

    constructor(room: WorldRoom) {
        this.room = room;
        // Initialize reusable ray
        this.ray = new RAPIER.Ray({ x: 0, y: 0 }, { x: 0, y: 0 });
    }

    public update(dt: number) {
        const projectiles = this.room.state.projectiles;
        const now = Date.now();
        const toRemove: Set<string> = new Set();
        
        // Cache entries to avoid repeated iterator creation and allow indexed access
        const entries = Array.from(projectiles.entries());
        const count = entries.length;

        // 1. Move & Check Player Collisions (Raycast)
        for (let i = 0; i < count; i++) {
            const [id, proj] = entries[i];
            if (toRemove.has(id)) continue;

            const dx = (proj.vx * dt) / 1000;
            const dy = (proj.vy * dt) / 1000;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                // Reuse Ray
                this.ray.origin.x = proj.x;
                this.ray.origin.y = proj.y;
                this.ray.dir.x = dx;
                this.ray.dir.y = dy;

                // SINGLE FLOOR GLOBAL FILTER
                const filterGroups = (CONFIG.COLLISION_GROUPS.PROJECTILE << 16) | CONFIG.COLLISION_GROUPS.PROJECTILE_MASK;

                const hit = this.room.physicsWorld.castRay(this.ray, dist + 10, true, filterGroups);
                
                if (hit) {
                    const collider = hit.collider;
                    const parentBody = collider.parent();
                    if (parentBody) {
                        const userData = parentBody.userData as PhysicsUserData;
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
            if (now - proj.creationTime > CONFIG.SPELL_CONFIG.BASE_LIFETIME) toRemove.add(id);
        }

        // 2. Projectile vs Projectile (RPS Logic) - Optimized with Sweep & Prune
        entries.sort((a, b) => a[1].x - b[1].x);

        for (let i = 0; i < count; i++) {
            const [idA, projA] = entries[i];
            if (toRemove.has(idA)) continue;

            for (let j = i + 1; j < count; j++) {
                const [idB, projB] = entries[j];
                
                // Sweep & Prune
                if (projB.x - projA.x > CONFIG.COLLISION_CONFIG.SWEEP_PRUNE_THRESHOLD) break;

                if (toRemove.has(idB)) continue;

                const distSq = (projA.x - projB.x)**2 + (projA.y - projB.y)**2;
                if (distSq < CONFIG.COLLISION_CONFIG.PROJECTILE_RADIUS_SQ) { 
                    this.resolveRPS(projA, projB, idA, idB, toRemove);
                }
            }
        }

        toRemove.forEach(id => {
            projectiles.delete(id);
        });
    }

    private resolveRPS(a: Projectile, b: Projectile, idA: string, idB: string, toRemove: Set<string>) {
        const getBase = (id: string) => {
            if (id.includes('circle')) return 'circle';
            if (id.includes('square')) return 'square';
            if (id.includes('triangle')) return 'triangle';
            return 'circle';
        };

        const typeA = getBase(a.spellId);
        const typeB = getBase(b.spellId);

        if (typeA === typeB) {
            toRemove.add(idA);
            toRemove.add(idB);
        } else if (CONFIG.RPS_WINNER[typeA] === typeB) {
            toRemove.add(idB);
        } else {
            toRemove.add(idA);
        }
    }

    private handlePlayerHit(attackerId: string, victimId: string) {
        const attacker = this.room.state.players.get(attackerId);
        const victim = this.room.state.players.get(victimId);

        if (attacker && victim) {
             const now = Date.now();
             const { isNight } = getGameTime(now);
             
             // Cast to any to access physicsManager (it exists but TS doesn't see it on base Room type sometimes if not casted)
             const roomAny = this.room as any;
             const zoneId = roomAny.physicsManager.getPlayerZone(victimId);
             const zoneDef = zoneId ? ZONE_DATA[zoneId] : null;

             const isSanctuary = zoneDef?.isSanctuary || false;
             
             if (!isNight) return; 
             if (isNight && isSanctuary) return;

             // PvP ALLOWED
             attacker.duelScore = (attacker.duelScore || 0) + 1;
             console.log(`[PVP] ${attacker.username} scored against ${victim.username}. Score: ${attacker.duelScore}`);
             
             if (attacker.duelScore >= 2) {
                 console.log(`[COMBAT] ${attacker.username} defeated ${victim.username}!`);
                 
                 attacker.duelScore = 0;
                 victim.duelScore = 0; 

                 if (victim.inDuel) {
                     roomAny.duelSystem.resolveLoss(victimId);
                 } else {
                     roomAny.healthSystem.knockOut(victim, victimId);
                 }

                 const stopAI = (id: string) => {
                     const ent = roomAny.entities.get(id);
                     if (ent?.ai) {
                         ent.ai.state = 'idle';
                         ent.ai.targetId = undefined;
                     }
                 };

                 stopAI(attackerId);
                 stopAI(victimId);
                 
                 roomAny.prestigeSystem.addPrestige(attackerId, 20);
             }
        }
    }
}
