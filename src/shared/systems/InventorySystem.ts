import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";

export const InventorySystem = (world: ECSWorld) => {
    // This system can be expanded to handle item usage, dropping, etc.
    // For now, it just ensures inventory is properly maintained
    const entities = world.with("inventory");
    
    for (const entity of entities) {
        const { inventory } = entity;
        
        // Ensure inventory doesn't exceed capacity
        if (inventory.items.length > inventory.capacity) {
            inventory.items = inventory.items.slice(0, inventory.capacity);
        }
        
        // Remove items with count 0
        inventory.items = inventory.items.filter(item => item.count > 0);
    }
};