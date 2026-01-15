"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemSystem = void 0;
const SchemaDef_1 = require("../../shared/SchemaDef");
const ItemRegistry_1 = require("../../shared/data/ItemRegistry");
const Config_1 = require("../../shared/Config");
const LevelRegistry_1 = require("../managers/LevelRegistry");
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
        const keys = Object.keys(ItemRegistry_1.ITEM_REGISTRY);
        if (keys.length === 0)
            return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const itemDef = ItemRegistry_1.ITEM_REGISTRY[randomKey];
        // Simple random position within map bounds (approx 3200x3200)
        // Ideally we should check for walls, but for now random is okay for prototype
        const x = Math.random() * 3000 + 100;
        const y = Math.random() * 3000 + 100;
        const id = `world_item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const item = new SchemaDef_1.WorldItem();
        item.id = id;
        item.x = x;
        item.y = y;
        item.type = itemDef.Type === 'Card' ? 'card' : 'resource';
        item.itemId = randomKey;
        this.room.state.items.set(id, item);
        console.log(`[ITEM] Spawned ${itemDef.Name} at ${Math.round(x)},${Math.round(y)}`);
    }
    spawnDetentionTasks() {
        const det = LevelRegistry_1.LevelRegistry.getInstance().getLocation("DETENTION");
        const taskTypes = ["cauldron", "scroll", "dust"];
        for (let i = 0; i < 5; i++) {
            const x = det.x + (Math.random() * 100 - 50);
            const y = det.y + (Math.random() * 100 - 50);
            const type = taskTypes[Math.floor(Math.random() * taskTypes.length)];
            const id = `task_${Date.now()}_${i}`;
            const item = new SchemaDef_1.WorldItem();
            item.id = id;
            item.x = x;
            item.y = y;
            item.type = "task";
            item.itemId = type; // e.g. "cauldron"
            this.room.state.items.set(id, item);
        }
        console.log(`[DISCIPLINE] Spawned 5 Detention Tasks.`);
    }
    tryCollectItem(sessionId, worldItemId) {
        const worldItem = this.room.state.items.get(worldItemId);
        const player = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!worldItem || !player || !entity || !entity.body)
            return;
        const pos = entity.body.translation();
        const distSq = (pos.x - worldItem.x) ** 2 + (pos.y - worldItem.y) ** 2;
        if (distSq < Config_1.CONFIG.VALIDATION.INTERACTION_RADIUS_SQ) {
            // --- DETENTION TASK LOGIC ---
            if (worldItem.type === 'task') {
                if (player.detentionWork > 0) {
                    player.detentionWork = Math.max(0, player.detentionWork - 10);
                    this.room.send(this.room.clients.getById(sessionId), "notification", `Task Done! Work remaining: ${player.detentionWork}`);
                    if (player.detentionWork <= 0) {
                        this.room.releaseFromDetention(sessionId);
                    }
                    // Cleanup and Respawn one task elsewhere in detention room to keep loop going
                    this.room.state.items.delete(worldItemId);
                    // Simple respawn logic
                    setTimeout(() => {
                        const det = LevelRegistry_1.LevelRegistry.getInstance().getLocation("DETENTION");
                        const rx = det.x + (Math.random() * 100 - 50);
                        const ry = det.y + (Math.random() * 100 - 50);
                        const newItem = new SchemaDef_1.WorldItem();
                        newItem.id = `task_respawn_${Date.now()}`;
                        newItem.x = rx;
                        newItem.y = ry;
                        newItem.type = "task";
                        newItem.itemId = worldItem.itemId;
                        this.room.state.items.set(newItem.id, newItem);
                    }, 2000);
                }
                return;
            }
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
            else {
                // Bonus for Duplicate Cards (DISABLED)
                /*
                if (worldItem.type === 'card') {
                    this.room.prestigeSystem.addPrestige(sessionId, 5);
                }
                */
            }
            // Notify
            this.room.send(this.room.clients.getById(sessionId), "notification", `Found: ${itemDef.Name}`);
            // Remove from world
            this.room.state.items.delete(worldItemId);
        }
    }
}
exports.ItemSystem = ItemSystem;
