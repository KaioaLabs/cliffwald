export interface WizardCard {
    id: number;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'legendary';
}

export const CARD_REGISTRY: Record<number, WizardCard> = {
    1: {
        id: 1,
        name: "Abe no Seimei",
        description: "A legendary Japanese onmyoji, master of divination and spirits.",
        rarity: 'legendary'
    },
    2: {
        id: 2,
        name: "Baba Yaga",
        description: "Slavic witch who lives in a hut with chicken legs and flies in a mortar.",
        rarity: 'rare'
    },
    3: {
        id: 3,
        name: "Circe",
        description: "Greek goddess of magic, famous for transforming enemies into animals.",
        rarity: 'rare'
    },
    4: {
        id: 4,
        name: "Merlin",
        description: "The quintessential Arthurian wizard, advisor to kings and master of prophecy.",
        rarity: 'legendary'
    },
    5: {
        id: 5,
        name: "Morgan le Fay",
        description: "Powerful enchantress of Avalon, master of healing and shapeshifting.",
        rarity: 'legendary'
    },
    6: {
        id: 6,
        name: "Nicholas Flamel",
        description: "French alchemist celebrated for creating the Philosopher's Stone.",
        rarity: 'rare'
    },
    7: {
        id: 7,
        name: "Marie Laveau",
        description: "The Voodoo Queen of New Orleans, a legendary figure of spiritual power.",
        rarity: 'rare'
    },
    8: {
        id: 8,
        name: "Hecate",
        description: "Greek Titaness of magic, crossroads, and the moon.",
        rarity: 'legendary'
    },
    9: {
        id: 9,
        name: "Faust",
        description: "Scholar who made a pact with the devil for infinite knowledge and magic.",
        rarity: 'rare'
    },
    10: {
        id: 10,
        name: "Medea",
        description: "Greek enchantress, niece of Circe and expert in herbs and poisons.",
        rarity: 'rare'
    },
    11: {
        id: 11,
        name: "Paracelsus",
        description: "Swiss physician and alchemist who pioneered the study of elementals.",
        rarity: 'rare'
    },
    12: {
        id: 12,
        name: "Thoth",
        description: "Ancient Egyptian god of wisdom, writing, and divine magic.",
        rarity: 'legendary'
    },
    13: {
        id: 13,
        name: "Cassandra",
        description: "Trojan prophetess blessed with true vision but cursed never to be believed.",
        rarity: 'common'
    },
    14: {
        id: 14,
        name: "Solomon",
        description: "Biblical king said to hold power over spirits via his magical ring.",
        rarity: 'rare'
    },
    15: {
        id: 15,
        name: "Michael Scot",
        description: "Medieval polymath and wizard who predicted the future for emperors.",
        rarity: 'common'
    },
    16: {
        id: 16,
        name: "Völva",
        description: "Norse seeress and practitioner of Seidr magic, wandering the world.",
        rarity: 'common'
    }
};

export const TOTAL_CARDS = Object.keys(CARD_REGISTRY).length;