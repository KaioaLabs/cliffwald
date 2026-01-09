import { WorldRoom } from "../WorldRoom";
import { WorldItem, InventoryItem } from "../../shared/SchemaDef";
import { ITEM_REGISTRY } from "../../shared/data/ItemRegistry";
import { CONFIG } from "../../shared/Config";

export class ItemSystem {
    private room: WorldRoom;
    private spawnTimer: number = 0;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public update(dt: number) {
        this.spawnTimer += dt;
        
        // Spawn a random item every 30 seconds if < 20 items
        if (this.spawnTimer > 30000) {
            this.spawnTimer = 0;
            if (this.room.state.items.size < 20) {
                this.spawnRandomItem();
            }
        }
    }

    public spawnRandomItem() {
        const locations = [
            CONFIG.SCHOOL_LOCATIONS.COURTYARD,
            CONFIG.SCHOOL_LOCATIONS.FOREST,
            CONFIG.SCHOOL_LOCATIONS.GREAT_HALL,
            CONFIG.SCHOOL_LOCATIONS.ACADEMIC_WING
        ];
        
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const x = loc.x + (Math.random() * 400 - 200);
        const y = loc.y + (Math.random() * 400 - 200);

        // Pick random item from registry
        const itemKeys = Object.keys(ITEM_REGISTRY);
        const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const itemDef = ITEM_REGISTRY[randomKey];

        const id = `item_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const item = new WorldItem();
        item.id = id;
        item.x = x;
        item.y = y;
        item.type = itemDef.Type.toLowerCase(); // 'card', 'potion', etc.
        item.itemId = randomKey;

        this.room.state.items.set(id, item);
        console.log(`[ITEM] Spawned ${itemDef.Name} (${randomKey}) at ${Math.floor(x)},${Math.floor(y)}`);
    }

    public tryCollectItem(sessionId: string, worldItemId: string) {
        const worldItem = this.room.state.items.get(worldItemId);
        const player = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);

        if (!worldItem || !player || !entity || !entity.body) return;

        const pos = entity.body.translation();
        const distSq = (pos.x - worldItem.x)**2 + (pos.y - worldItem.y)**2;

        if (distSq < CONFIG.VALIDATION.INTERACTION_RADIUS_SQ) {
            const itemDef = ITEM_REGISTRY[worldItem.itemId];
            if (!itemDef) {
                this.room.state.items.delete(worldItemId);
                return;
            }

            // 1. Universal Inventory Logic
            let addedToStack = false;
            if (itemDef.Stackable) {
                // Find existing stack
                const existing = player.inventory.find(i => i.itemId === worldItem.itemId);
                if (existing) {
                    existing.qty += 1;
                    addedToStack = true;
                }
            }

            if (!addedToStack) {
                const invItem = new InventoryItem();
                invItem.itemId = worldItem.itemId;
                invItem.qty = 1;
                player.inventory.push(invItem);
            } else {
                // Bonus for Duplicate Cards (DISABLED)
                /*
                if (worldItem.type === 'card') {
                    this.room.prestigeSystem.addPrestige(sessionId, 5);
                }
                */
            }

            // Notify
            this.room.send(this.room.clients.getById(sessionId)!, "notification", `Found: ${itemDef.Name}`);

            // Remove from world
            this.room.state.items.delete(worldItemId);
        }
    }
}
