import itemsData from './items.json';

export interface ItemDefinition {
    ID: string;
    Name: string;
    Type: string;
    Stats: string;
    Description: string;
    Rarity: string;
    Stackable: boolean;
}

export const ITEM_REGISTRY: Record<string, ItemDefinition> = itemsData as any;

// Helper to get only cards for the album
export const GET_ALL_CARDS = () => {
    return Object.values(ITEM_REGISTRY)
        .filter(item => item.Type === 'Card')
        .sort((a, b) => {
            const idA = parseInt(a.ID.split('_')[1]);
            const idB = parseInt(b.ID.split('_')[1]);
            
            if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
            if (!isNaN(idA)) return -1; // Numbers first
            if (!isNaN(idB)) return 1;
            
            return a.ID.localeCompare(b.ID); // String sort for rest
        });
};

export const TOTAL_CARDS = GET_ALL_CARDS().length;
