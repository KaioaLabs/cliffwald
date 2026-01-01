import { MapSchema } from "@colyseus/schema";
import { Projectile, Player } from "../../shared/SchemaDef";
import { CONFIG } from "../../shared/Config";
import { Room } from "colyseus";
import { getSpellType, resolveRPS } from "../../shared/items/SpellRegistry";
import RAPIER from "@dimforge/rapier2d-compat";

export class CombatSystem {
    private room: Room;
    private state: { projectiles: MapSchema<Projectile>, players: MapSchema<Player> };
    private physicsWorld: RAPIER.World;
    private projectileBodies: Map<string, RAPIER.RigidBody> = new Map();

    // Config
    private readonly PROJ_RADIUS = 10; // Physics radius

    constructor(room: Room, physicsWorld: RAPIER.World) {
        this.room = room;
        this.state = room.state as any;
        this.physicsWorld = physicsWorld;
    }

    public createProjectile(id: string, x: number, y: number, vx: number, vy: number, ownerId: string) {
        // Create Sensor Body in Rapier
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(x, y);
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        body.setLinvel({ x, y: vy }, true); // Initial vel, though we move manually or let physics handle it?
        // Actually, if we use Rapier, we should let Rapier move it!
        // But for network sync, we often keep linear deterministic logic.
        // Let's use Rapier as a "Collision Detector" only, moving the body manually to match our deterministic logic.
        
        const colliderDesc = RAPIER.ColliderDesc.ball(this.PROJ_RADIUS);
        colliderDesc.setSensor(true); // Sensors verify collisions but don't bounce
        colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        
        const collider = this.physicsWorld.createCollider(colliderDesc, body);
        
        // Tag userData to identify it later
        body.userData = { type: 'projectile', id, ownerId };
        
        this.projectileBodies.set(id, body);
    }

    public removeProjectile(id: string) {
        const body = this.projectileBodies.get(id);
        if (body) {
            this.physicsWorld.removeRigidBody(body);
            this.projectileBodies.delete(id);
        }
    }

    public update(deltaTime: number) {
        const projIds = Array.from(this.state.projectiles.keys());
        
        // 1. Move & Sync Physics
        projIds.forEach(id => {
            const p = this.state.projectiles.get(id);
            if (!p) return;

            // Deterministic Movement (Server Authority)
            p.x += (p.vx / 1000) * deltaTime;
            p.y += (p.vy / 1000) * deltaTime;

            // Sync Physics Body to Logical Position
            const body = this.projectileBodies.get(id);
            if (body) {
                body.setTranslation({ x: p.x, y: p.y }, true);
            } else {
                // Lazy creation if missing (recovery)
                this.createProjectile(id, p.x, p.y, p.vx, p.vy, p.ownerId);
            }

            // Check Expired (Time or Range)
            if (this.checkExpiration(p)) {
                this.state.projectiles.delete(id);
                this.removeProjectile(id);
                return; 
            }
        });

        // 2. Collision Detection (Using Rapier would be ideal, but hybrid approach for now)
        // Since we are moving bodies manually, Rapier's event queue might not trigger nicely in one step.
        // For this refactor step, we will stick to the optimized spatial query.
        
        // Manual Collision is still safer for "Instant Hit" logic without async events.
        // We will keep the manual check but Optimize it later. 
        // Changing to Full Rapier Physics for projectiles requires changing the Simulation Loop order significantly.
        
        // Fallback: The original manual check is fine for < 100 projectiles.
        // I will keep the original logic for STABILITY but wrapped in this class.
        
        this.legacyCollisionUpdate();
    }

    private legacyCollisionUpdate() {
         const projIds = Array.from(this.state.projectiles.keys());
         // ... (Logic extracted previously)
         projIds.forEach(id => {
            const p = this.state.projectiles.get(id);
            if (!p) return;
            if (this.checkPlayerCollision(p, id)) {
                // If hit, also remove body
                this.removeProjectile(id);
            }
         });
         this.checkProjectileClash();
    }

    private checkExpiration(p: Projectile): boolean {
        // Time Limit
        if (Date.now() - p.creationTime > 3000) return true;

        // Range Limit
        const dx = p.x - p.startX;
        const dy = p.y - p.startY;
        if (dx * dx + dy * dy > p.maxRange * p.maxRange) return true;

        return false;
    }

    private checkPlayerCollision(p: Projectile, projId: string): boolean {
        let hit = false;
        const HIT_RADIUS = 25;
        
        this.state.players.forEach((player, playerId) => {
            if (hit) return;
            if (playerId === p.ownerId) return;

            const pdx = p.x - player.x;
            const pdy = p.y - player.y;
            const distSq = pdx*pdx + pdy*pdy;
            
            if (distSq < (HIT_RADIUS + CONFIG.PLAYER_RADIUS) ** 2) {
                // HIT!
                console.log(`[COMBAT] HIT! Projectile ${projId} hit Player ${playerId}`);
                this.room.broadcast("hit", { targetId: playerId });
                this.state.projectiles.delete(projId);
                this.removeProjectile(projId);
                hit = true;
            }
        });

        return hit;
    }

    private checkProjectileClash() {
        const activeProjs = Array.from(this.state.projectiles.values());
        const handled = new Set<string>();

        for (let i = 0; i < activeProjs.length; i++) {
            for (let j = i + 1; j < activeProjs.length; j++) {
                const p1 = activeProjs[i];
                const p2 = activeProjs[j];
                
                if (handled.has(p1.id) || handled.has(p2.id)) continue;
                if (p1.ownerId === p2.ownerId) continue; 

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                
                if (dx*dx + dy*dy < 400) { 
                    const type1 = getSpellType(p1.spellId);
                    const type2 = getSpellType(p2.spellId);
                    
                    const result = resolveRPS(type1, type2);
                    
                    if (result === 1) { // p1 wins
                        this.state.projectiles.delete(p2.id);
                        this.removeProjectile(p2.id);
                        handled.add(p2.id);
                    } else if (result === 2) { // p2 wins
                        this.state.projectiles.delete(p1.id);
                        this.removeProjectile(p1.id);
                        handled.add(p1.id);
                    } else { // Tie -> Both die
                        this.state.projectiles.delete(p1.id);
                        this.state.projectiles.delete(p2.id);
                        this.removeProjectile(p1.id);
                        this.removeProjectile(p2.id);
                        handled.add(p1.id);
                        handled.add(p2.id);
                    }
                }
            }
        }
    }
}
