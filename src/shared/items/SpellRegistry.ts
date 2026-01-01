export enum SpellType {
    ROCK = 'rock',
    PAPER = 'paper',
    SCISSORS = 'scissors',
    UNKNOWN = 'unknown'
}

export interface SpellConfig {
    id: string;
    type: SpellType;
    color: number; // Hex color for client
    speed: number;
    cooldown: number;
    shape: 'circle' | 'square' | 'triangle' | 'line';
}

export const SPELL_REGISTRY: Record<string, SpellConfig> = {
    'circle': {
        id: 'circle',
        type: SpellType.ROCK,
        color: 0x0000ff, // Blue
        speed: 400,
        cooldown: 500,
        shape: 'circle'
    },
    'square': {
        id: 'square',
        type: SpellType.PAPER,
        color: 0xff00ff, // Magenta
        speed: 400,
        cooldown: 500,
        shape: 'square'
    },
    'triangle': {
        id: 'triangle',
        type: SpellType.SCISSORS,
        color: 0xff0000, // Red
        speed: 400,
        cooldown: 500,
        shape: 'triangle'
    }
    // Line is disabled for PvP
};

export function getSpellType(spellId: string): SpellType {
    for (const key in SPELL_REGISTRY) {
        if (spellId.includes(key)) return SPELL_REGISTRY[key].type;
    }
    return SpellType.UNKNOWN;
}

export function resolveRPS(t1: SpellType, t2: SpellType): 0 | 1 | 2 {
    if (t1 === t2) return 0; // Tie
    if (t1 === SpellType.ROCK && t2 === SpellType.SCISSORS) return 1;
    if (t1 === SpellType.SCISSORS && t2 === SpellType.PAPER) return 1;
    if (t1 === SpellType.PAPER && t2 === SpellType.ROCK) return 1;
    return 2; // t2 wins
}
