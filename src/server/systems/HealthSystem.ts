import { WorldRoom } from "../WorldRoom";
import { CONFIG } from "../../shared/Config";
import { LevelRegistry } from "../managers/LevelRegistry";

export class HealthSystem {
    private room: WorldRoom;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public update() {
        const now = Date.now();
        
        this.room.state.players.forEach((player, sessionId) => {
            if (player.unconsciousUntil > 0) {
                // Check if recovery time has passed
                if (now > player.unconsciousUntil) {
                    this.wakeUp(player, sessionId);
                }
            }
        });
    }

    private wakeUp(player: any, sessionId: string) {
        console.log(`[HEALTH] Player ${player.username} woke up.`);
        player.unconsciousUntil = 0;
        
        // Player regains control and walks out manually.
        // No teleportation logic needed here.

        this.room.chatManager.broadcastSystemMessage(`${player.username} has recovered in the Infirmary.`);
    }

    public knockOut(player: any, sessionId: string) {
        // Find a free bed
        // Simple logic: Pick random for now, or check occupancy if possible.
        // Better: Iterate beds and check if anyone is close.
        
        const beds = LevelRegistry.getInstance().getInfirmaryBeds();
        let targetBed = beds[0] || { x: 1600, y: 960 }; // Fallback
        let minOccupancy = Infinity;

        // Find the "most free" bed (simple distance check against all players)
        for (const bed of beds) {
            let nearby = 0;
            this.room.state.players.forEach(p => {
                if (Math.abs(p.x - bed.x) < 10 && Math.abs(p.y - bed.y) < 10) nearby++;
            });
            
            if (nearby < minOccupancy) {
                minOccupancy = nearby;
                targetBed = bed;
            }
        }

        console.log(`[HEALTH] Player ${player.username} knocked out! Sending to Infirmary.`);
        
        player.unconsciousUntil = Date.now() + 10000; // 10 seconds unconscious
        player.duelScore = 0;
        player.inDuel = false; // Force exit duel mode
        
        // Teleport
        player.x = targetBed.x;
        player.y = targetBed.y;
        
        const entity = this.room.entities.get(sessionId);
        if (entity && entity.body) {
            entity.body.setTranslation({ x: player.x, y: player.y }, true);
            
            // Stop AI if it's an NPC
            if (entity.ai) {
                entity.ai.state = 'idle';
                entity.ai.targetId = undefined;
            }
        }

        this.room.chatManager.broadcastSystemMessage(`${player.username} passed out and was rushed to the Infirmary!`);
    }
}
