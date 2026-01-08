"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemSystem = void 0;
const SchemaDef_1 = require("../../shared/SchemaDef");
const ItemRegistry_1 = require("../../shared/data/ItemRegistry");
const Config_1 = require("../../shared/Config");
class ItemSystem {
    constructor(room) {
        this.spawnTimer = 0;
        this.room = room;
    }
    update(dt) {
        this.spawnTimer += dt;
        // Spawn a random item every 30 seconds if < 20 items
        if (this.spawnTimer > 30000) {
            this.spawnTimer = 0;
            if (this.room.state.items.size < 20) {
                this.spawnRandomItem();
            }
        }
    }
    spawnRandomItem() {
        const locations = [
            Config_1.CONFIG.SCHOOL_LOCATIONS.COURTYARD,
            Config_1.CONFIG.SCHOOL_LOCATIONS.FOREST,
            Config_1.CONFIG.SCHOOL_LOCATIONS.GREAT_HALL,
            Config_1.CONFIG.SCHOOL_LOCATIONS.ACADEMIC_WING
        ];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const x = loc.x + (Math.random() * 400 - 200);
        const y = loc.y + (Math.random() * 400 - 200);
        // Pick random item from registry
        const itemKeys = Object.keys(ItemRegistry_1.ITEM_REGISTRY);
        const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const itemDef = ItemRegistry_1.ITEM_REGISTRY[randomKey];
        const id = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const item = new SchemaDef_1.WorldItem();
        item.id = id;
        item.x = x;
        item.y = y;
        item.type = itemDef.Type.toLowerCase(); // 'card', 'potion', etc.
        item.itemId = randomKey;
        // Legacy support for numeric card IDs if needed (parse from card_X)
        if (randomKey.startsWith('card_')) {
            const numId = parseInt(randomKey.split('_')[1]);
            if (!isNaN(numId))
                item.dataId = numId;
        }
        this.room.state.items.set(id, item);
        console.log(`[ITEM] Spawned ${itemDef.Name} (${randomKey}) at ${Math.floor(x)},${Math.floor(y)}`);
    }
    tryCollectItem(sessionId, worldItemId) {
        const worldItem = this.room.state.items.get(worldItemId);
        const player = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!worldItem || !player || !entity || !entity.body)
            return;
        const pos = entity.body.translation();
        const dist = Math.sqrt((pos.x - worldItem.x) ** 2 + (pos.y - worldItem.y) ** 2);
        if (dist < 60) {
            const itemDef = ItemRegistry_1.ITEM_REGISTRY[worldItem.itemId];
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
                const invItem = new SchemaDef_1.InventoryItem();
                invItem.itemId = worldItem.itemId;
                invItem.qty = 1;
                player.inventory.push(invItem);
            }
            // 2. Legacy Card Collection (for Album UI)
            if (worldItem.type === 'card' && worldItem.dataId > 0) {
                if (!player.cardCollection.includes(worldItem.dataId)) {
                    player.cardCollection.push(worldItem.dataId);
                }
                else {
                    // Duplicate card bonus
                    this.room.prestigeSystem.addPrestige(sessionId, 5);
                }
            }
            // Notify
            this.room.send(this.room.clients.getById(sessionId), "notification", `Found: ${itemDef.Name}`);
            // Remove from world
            this.room.state.items.delete(worldItemId);
        }
    }
}
exports.ItemSystem = ItemSystem;
