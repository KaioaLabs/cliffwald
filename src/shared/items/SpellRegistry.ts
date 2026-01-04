export interface SpellConfig {
    id: string;
    gesture: 'triangle' | 'square' | 'circle';
    color: number;
    speed: number;
    cooldown: number;
    shape: 'triangle' | 'square' | 'circle';
}

export const SPELL_REGISTRY: Record<string, SpellConfig> = {
    'triangle': {
        id: 'triangle',
        gesture: 'triangle',
        color: 0xff0000, // Red
        speed: 400,
        cooldown: 500,
        shape: 'triangle'
    },
    'square': {
        id: 'square',
        gesture: 'square',
        color: 0xff00ff, // Magenta
        speed: 400,
        cooldown: 500,
        shape: 'square'
    },
    'circle': {
        id: 'circle',
        gesture: 'circle',
        color: 0x0000ff, // Blue
        speed: 400,
        cooldown: 500,
        shape: 'circle'
    }
};