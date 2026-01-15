import { Entity } from "../../shared/ecs/components";
import { Player } from "../../shared/SchemaDef";
import { PlayerService } from "../services/PlayerService";
import { WorldService } from "../services/WorldService";
import { CONFIG } from "../../shared/Config";
import { MapSchema } from "@colyseus/schema";
import { GameState } from "../../shared/SchemaDef";

export class PersistenceSystem {
    private entities: Map<string, Entity>;
    private state: GameState;
    private intervalId: any;

    constructor(
        entities: Map<string, Entity>, 
        state: GameState
    ) {
        this.entities = entities;
        this.state = state;
    }

    public startAutoSave() {
        if (this.intervalId) clearInterval(this.intervalId);
        
        console.log(`[DB] Persistence System Started. Auto-save every ${CONFIG.DB_CONFIG.AUTO_SAVE_INTERVAL}ms.`);
        
        this.intervalId = setInterval(() => {
            this.saveAll();
        }, CONFIG.DB_CONFIG.AUTO_SAVE_INTERVAL);
    }

    public stopAutoSave() {
        if (this.intervalId) clearInterval(this.intervalId);
    }

    public async saveAll() {
        const saves: Promise<void>[] = [];
        let count = 0;

        // 1. Save World State
        saves.push(WorldService.saveWorldState(this.state));

        // 2. Save Players
        this.entities.forEach((entity, sessionId) => {
            const dbId = entity.metadata?.dbId;
            if (!dbId) return; // Skip non-persisted entities (Echoes/NPCs without active session)

            const playerState = this.state.players.get(sessionId);
            
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
            console.log(`[DB] Auto-saving ${count} active players + World State...`);
            await Promise.allSettled(saves);
        } else {
            // Save world anyway
            await WorldService.saveWorldState(this.state);
        }
    }
    
    // Legacy wrapper for saveAllPlayers calls
    public async saveAllPlayers() { return this.saveAll(); }
}
