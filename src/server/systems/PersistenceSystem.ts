import { Entity } from "../../shared/ecs/components";
import { Player } from "../../shared/SchemaDef";
import { PlayerService } from "../services/PlayerService";
import { CONFIG } from "../../shared/Config";
import { MapSchema } from "@colyseus/schema";

export class PersistenceSystem {
    private entities: Map<string, Entity>;
    private playersState: MapSchema<Player> | Map<string, Player>;
    private intervalId: any;

    constructor(
        entities: Map<string, Entity>, 
        playersState: MapSchema<Player> | Map<string, Player>
    ) {
        this.entities = entities;
        this.playersState = playersState;
    }

    public startAutoSave() {
        if (this.intervalId) clearInterval(this.intervalId);
        
        console.log(`[DB] Persistence System Started. Auto-save every ${CONFIG.DB_CONFIG.AUTO_SAVE_INTERVAL}ms.`);
        
        this.intervalId = setInterval(() => {
            this.saveAllPlayers();
        }, CONFIG.DB_CONFIG.AUTO_SAVE_INTERVAL);
    }

    public stopAutoSave() {
        if (this.intervalId) clearInterval(this.intervalId);
    }

    public async saveAllPlayers() {
        const saves: Promise<void>[] = [];
        let count = 0;

        this.entities.forEach((entity, sessionId) => {
            const dbId = entity.metadata?.dbId;
            if (!dbId) return; // Skip non-persisted entities (Echoes/NPCs without active session)

            const playerState = this.playersState.get(sessionId);
            
            if (playerState && entity.body) {
                // Update state with latest physics pos before saving
                const pos = entity.body.translation();
                playerState.x = pos.x;
                playerState.y = pos.y;
                
                // Inject metadata into state for saving if needed (Alignment)
                (playerState as any).alignment = entity.metadata?.alignment || 0;

                saves.push(PlayerService.saveSession(dbId, playerState));
                count++;
            }
        });

        if (count > 0) {
            console.log(`[DB] Auto-saving ${count} active players...`);
            await Promise.allSettled(saves);
        }
    }
}
