import { WorldRoom } from "../WorldRoom";
import { InventoryItem } from "../../shared/SchemaDef";
import { ITEM_REGISTRY } from "../../shared/data/ItemRegistry";
import { CONFIG } from "../../shared/Config";
import { LevelRegistry } from "../managers/LevelRegistry";

export class ShopSystem {
    private room: WorldRoom;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public handleBuy(sessionId: string, itemId: string) {
        const player = this.room.state.players.get(sessionId);
        const entity = this.room.entities.get(sessionId);
        if (!player || !entity || !entity.body) return;

        // 1. Check Proximity to Vendor (Simple check for now)
        // In a full implementation, we'd check against a specific NPC entity position.
        // For this prototype, we check if they are near the "Great Hall" center.
        const vendorLocation = LevelRegistry.getInstance().getLocation("GREAT_HALL");
        const pos = entity.body.translation();
        const dx = pos.x - vendorLocation.x;
        const dy = pos.y - vendorLocation.y;
        if (dx*dx + dy*dy > 250000) { // 500px radius (generous for the Hall)
            this.room.send(this.room.clients.getById(sessionId)!, "notification", "You are too far from the School Shop!");
            return;
        }

        const itemDef = ITEM_REGISTRY[itemId];
        if (!itemDef) {
            this.room.send(this.room.clients.getById(sessionId)!, "notification", "Item not found.");
            return;
        }

        // 2. Determine Price
        let price = 10;
        if (itemDef.Rarity === 'Rare') price = 50;
        if (itemDef.Rarity === 'Legendary') price = 200;

        // 3. Check Funds
        if (player.gold < price) {
            this.room.send(this.room.clients.getById(sessionId)!, "notification", `Not enough Gold! Need ${price}.`);
            return;
        }

        // 4. Transaction
        player.gold -= price;
        
        let addedToStack = false;
        if (itemDef.Stackable) {
            const existing = player.inventory.find(i => i.itemId === itemId);
            if (existing) {
                existing.qty += 1;
                addedToStack = true;
            }
        }

        if (!addedToStack) {
            const invItem = new InventoryItem();
            invItem.itemId = itemId;
            invItem.qty = 1;
            player.inventory.push(invItem);
        }

        this.room.send(this.room.clients.getById(sessionId)!, "notification", `Bought ${itemDef.Name} for ${price} Gold.`);
        console.log(`[SHOP] ${player.username} bought ${itemId} for ${price}`);
    }

    public getCatalog() {
        // Return a simple list of "Essentials"
        return [
            { id: "pot_antidote", price: 10 },
            { id: "food_rock_cake", price: 10 },
            { id: "mat_wolfsbane", price: 50 },
            { id: "mat_bezoar", price: 50 }
        ];
    }
}
