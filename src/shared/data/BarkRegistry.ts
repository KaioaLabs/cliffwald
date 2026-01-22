// Data for NPC Chat Bubbles (Barks)

export type BarkContext = 'GENERAL' | 'EAT' | 'CLASS' | 'SLEEP' | 'DUEL' | 'IDLE';

export const BARK_DB: Record<BarkContext, string[]> = {
    GENERAL: [
        "Did you hear that noise?",
        "I need to study more...",
        "Has anyone seen my toad?",
        "The wind is cold today.",
        "I wonder what's for dinner.",
        "My wand feels weird.",
        "Is it the weekend yet?",
        "I should practice my aim.",
        "Walking helps me think.",
        "Where is the library again?"
    ],
    EAT: [
        "Finally, food!",
        "This pumpkin juice is great.",
        "Pass the salt, please.",
        "I'm starving.",
        "Don't talk with your mouth full.",
        "Rock cakes again?",
        "Delicious!",
        "I could eat a dragon."
    ],
    CLASS: [
        "I hope I pass this test.",
        "Is this on the exam?",
        "Shh! The teacher is looking.",
        "I forgot my quill.",
        "This spell is tricky.",
        "Focus, focus...",
        "My hand is cramping.",
        "Did you do the homework?"
    ],
    SLEEP: [
        "Zzz...",
        "Five more minutes...",
        "*Snore*",
        "So tired...",
        "Lights out...",
        "Goodnight.",
        "Too early..."
    ],
    DUEL: [
        "En garde!",
        "Watch out!",
        "Nice shot!",
        "Is that all you got?",
        "Shields up!",
        "Take that!",
        "Incoming!",
        "Ouch!"
    ],
    IDLE: [
        "Just waiting...",
        "Nice view from here.",
        "Anyone want to trade cards?",
        "So bored.",
        "Thinking about magic.",
        "Hum de dum..."
    ]
};

export const HOUSE_FLAVOR: Record<string, string[]> = {
    ignis: [
        "For glory!",
        "I bet I can jump that.",
        "Let's duel!",
        "Fear is for the weak."
    ],
    axiom: [
        "According to the books...",
        "Logic dictates victory.",
        "Have you read 'The Annals of Cliffwald'?",
        "Precise movements are key."
    ],
    vesper: [
        "Stay out of my way.",
        "Ambition is not a sin.",
        "I will be the best.",
        "Darkness is just a tool."
    ]
};

export function getRandomBark(context: BarkContext, house?: string): string {
    let pool = BARK_DB[context] || BARK_DB.GENERAL;
    
    // 20% chance to add house flavor if available
    if (house && HOUSE_FLAVOR[house] && Math.random() < 0.2) {
        pool = HOUSE_FLAVOR[house];
    }

    return pool[Math.floor(Math.random() * pool.length)];
}
