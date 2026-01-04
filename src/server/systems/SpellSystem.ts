import { WorldRoom } from "../WorldRoom";
import { Projectile } from "../../shared/SchemaDef";

export class SpellSystem {
    private room: WorldRoom;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public update(dt: number) {
        const projectiles = this.room.state.projectiles;
        const now = Date.now();

        projectiles.forEach((proj: Projectile, id: string) => {
            // 1. Move
            proj.x += (proj.vx * dt) / 1000;
            proj.y += (proj.vy * dt) / 1000;

            // 2. Authoritative Cleanup
            const age = now - proj.creationTime;
            // Remove if older than 2s or potentially traveled too far
            if (age > 2000) {
                projectiles.delete(id);
            }
        });
    }
}
