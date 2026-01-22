// Gameplay Balance & Rules
export const GameplayConfig = {
    REWARDS: {
        WIN_DUEL: 20,
        LOSE_DUEL: -5, // Optional penalty
        ATTENDANCE: 5,
        MINIGAME_WIN: 10,
        CLASS_GOLD: 20,
        CLASS_XP: 50
    },
    
    WIN_DUEL_SCORE: 2,
    
    DAMAGE: {
        BASE_SPELL: 10
    },
    
    DETENTION: {
        WORK_UNITS: 5 // Default tasks to clear detention
    },
    
    ACADEMIC: {
        DESK_PROXIMITY_SQ: 900, // 30px
        LEAVE_DESK_DISTANCE_SQ: 2500 // 50px
    },

    // Spell Configuration
    SPELL_CONFIG: {
        BASE_SPEED: 400,
        BASE_LIFETIME: 2000, 
        BASE_RANGE: 600,     
        VISUAL_TWEEN_DURATION: 3000 
    },

    // Rock Paper Scissors Logic (The Triad)
    RPS_MAP: {
        'circle': 'circle',
        'square': 'square',
        'triangle': 'triangle'
    } as Record<string, 'circle' | 'square' | 'triangle'>,

    RPS_WINNER: {
        'circle': 'triangle',   // Circle beats Triangle
        'triangle': 'square',   // Triangle beats Square
        'square': 'circle'      // Square beats Circle
    } as Record<string, string>
};
