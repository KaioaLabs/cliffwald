import { WorldRoom } from "../WorldRoom";
import { WorldItem } from "../../shared/SchemaDef";
import { CARD_REGISTRY } from "../../shared/data/CardRegistry";
import { CONFIG } from "../../shared/Config";

export class ItemSystem {
    private room: WorldRoom;
    private spawnTimer: number = 0;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public update(dt: number) {
        this.spawnTimer += dt;
        
        // Spawn a random card every 60 seconds if < 10 items
        if (this.spawnTimer > 60000) {
            this.spawnTimer = 0;
            if (this.room.state.items.size < 10) {
                this.spawnRandomCard();
            }
        }
    }

    public spawnRandomCard() {
        // Random Position (roughly within school bounds)
        // Forest, Courtyard, Hallways.
        const locations = [
            CONFIG.SCHOOL_LOCATIONS.COURTYARD,
            CONFIG.SCHOOL_LOCATIONS.FOREST,
            CONFIG.SCHOOL_LOCATIONS.GREAT_HALL,
            CONFIG.SCHOOL_LOCATIONS.ACADEMIC_WING
        ];
        
        const loc = locations[Math.floor(Math.random() * locations.length)];
        // Add random scatter (+- 200px)
        const x = loc.x + (Math.random() * 400 - 200);
        const y = loc.y + (Math.random() * 400 - 200);

        // Pick random card
        const cardIds = Object.keys(CARD_REGISTRY).map(Number);
        const cardId = cardIds[Math.floor(Math.random() * cardIds.length)];

        const id = `item_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const item = new WorldItem();
        item.id = id;
        item.x = x;
        item.y = y;
        item.type = "card";
        item.dataId = cardId;

        this.room.state.items.set(id, item);
        console.log(`[ITEM] Spawned Card #${cardId} at ${Math.floor(x)},${Math.floor(y)}`);
    }

    public tryCollectItem(sessionId: string, itemId: string) {
        const item = this.room.state.items.get(itemId);
        const player = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);

        if (!item || !player || !entity || !entity.body) return;

        const pos = entity.body.translation();
        const dist = Math.sqrt((pos.x - item.x)**2 + (pos.y - item.y)**2);

        if (dist < 60) { // Pickup Radius
            // 1. Add to collection
            if (!player.cardCollection.includes(item.dataId)) {
                player.cardCollection.push(item.dataId);
                const cardName = CARD_REGISTRY[item.dataId].name;
                // Notify user
                this.room.send(this.room.clients.getById(sessionId)!, "notification", `Found Card: ${cardName}!`);
            } else {
                // Duplicate
                this.room.send(this.room.clients.getById(sessionId)!, "notification", `Duplicate Card found (Prestige +5)`);
                this.room.prestigeSystem.addPrestige(sessionId, 5);
            }

            // 2. Remove item
            this.room.state.items.delete(itemId);
        }
    }
}
