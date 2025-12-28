export enum ItemType {
    Weapon,
    Potion,
    Resource
}

export interface ItemDefinition {
    id: string;
    name: string;
    type: ItemType;
    maxStack: number;
    // Stats (optional for now)
    damage?: number;
    heal?: number;
}

export const ItemRegistry: Record<string, ItemDefinition> = {
    "sword_wood": {
        id: "sword_wood",
        name: "Wooden Sword",
        type: ItemType.Weapon,
        maxStack: 1,
        damage: 10
    },
    "potion_hp": {
        id: "potion_hp",
        name: "Health Potion",
        type: ItemType.Potion,
        maxStack: 5,
        heal: 20
    },
    "stone": {
        id: "stone",
        name: "Stone",
        type: ItemType.Resource,
        maxStack: 99
    }
};
