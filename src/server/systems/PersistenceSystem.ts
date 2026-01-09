import { Entity } from "../../shared/ecs/components";
import { Player } from "../../shared/SchemaDef";
import { PlayerService } from "../services/PlayerService";
import { CONFIG } from "../../shared/Config";
import { MapSchema } from "@colyseus/schema";

export class PersistenceSystem {
    private entities: Map<string, Entity>;
    private playersState: MapSchema<Player> | Map<string, Player>;
    private playerDbIds: Map<string, number>;
    private intervalId: any;

    constructor(
        entities: Map<string, Entity>, 
        playersState: MapSchema<Player> | Map<string, Player>, 
        playerDbIds: Map<string, number>
    ) {
        this.entities = entities;
        this.playersState = playersState;
        this.playerDbIds = playerDbIds;
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
        const activePlayersCount = this.playerDbIds.size;
        if (activePlayersCount === 0) return;

        console.log(`[DB] Auto-saving ${activePlayersCount} active players...`);
        
        const saves: Promise<void>[] = [];

        this.playerDbIds.forEach((dbId, sessionId) => {
            const playerState = this.playersState.get(sessionId);
            const entity = this.entities.get(sessionId);

            if (dbId && playerState && entity?.body) {
                // Update state with latest physics pos before saving
                const pos = entity.body.translation();
                playerState.x = pos.x;
                playerState.y = pos.y;
                
                saves.push(PlayerService.saveSession(dbId, playerState));
            }
        });

        await Promise.allSettled(saves);
    }
}