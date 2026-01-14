// Dialogue Database for MMO Simulation
// Categorized by Archetype and Context tags

export interface DialogueEntry {
    text: string;
    weight: number; // Probability weight (default 1)
}

export const DIALOGUE_DB: Record<string, string[]> = {
    // --- UNIVERSAL SLANG (2022-2025 Gaming Culture) ---
    "BASE": [
        "gg", "lol", "brb", "afk", "lfg", "pog", "sheesh", "fr fr",
        "bet", "cap", "no cap", "bruh", "sus", "L", "W", "lag",
        "anyone trade?", "where is shop?", "need healing", "mana oom",
        "ping?", "fps drop", "server lagg"
    ],

    // --- ARCHETYPE: ACHIEVER (Efficiency, Progress, Stats) ---
    "ACHIEVER": [
        "xp/hr?", "any quests?", "speedrun", "efficiency +1", "grinding", 
        "level check", "need 500 more xp", "meta build?", "fast run", "skip cutscenes",
        "check my stats", "bis gear?", "dailies done", "opti run"
    ],

    // --- ARCHETYPE: KILLER (Competition, Toxicity-Lite, Dominance) ---
    // Note: Profanity filter handles the worst, these are "gamer toxicity"
    "KILLER": [
        "1v1 me", "get rekt", "skill issue", "ez clap", "gap", 
        "diff", "trash aim", "sit down", "rematch?", "camp spawn",
        "dog water", "bot movement", "ff 15", "touch grass"
    ],

    // --- ARCHETYPE: SOCIALIZER (Community, RP, Vibes) ---
    "SOCIALIZER": [
        "vibes", "party?", "ignis best house", "wait up", "look at my skin",
        "rp anyone?", "hello world", "uwu", "anyone from spain?", "add me",
        "fashion souls", "nice transmog", "emote check", "how are you?"
    ],

    // --- ARCHETYPE: EXPLORER (Discovery, Bugs, Curiosity) ---
    "EXPLORER": [
        "found a glitch", "map bug?", "stuck", "nice graphics", "where am i",
        "secret room?", "pathing is weird", "screenshot time", "exploring", "what is this?",
        "can i climb this?", "oob", "lore?", "hidden chest?"
    ]
};

export function getDialoguePool(archetype: string): string[] {
    const base = DIALOGUE_DB["BASE"];
    const specific = DIALOGUE_DB[archetype] || [];
    return [...base, ...specific];
}