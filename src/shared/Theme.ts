export const THEME = {
    // House Colors
    HOUSES: {
        IGNIS: 0xff0000, // Bright Red
        AXIOM: 0x0000ff, // Bright Blue
        VESPER: 0xffff00, // Bright Yellow
        DEFAULT: 0x8888ff,
        PREFECT: 0x4a148c // Dark Purple / Indigo
    },
    
    // UI Colors
    UI: {
        TEXT_WHITE: '#ffffff',
        TEXT_STROKE: '#000000',
        BACKGROUND_DIM: '#00000088',
        PVP_OFF: '#aaaaaa',
        PING_GOOD: '#00ff00',
        PING_WARN: '#ffff00',
        PING_BAD: '#ff0000'
    },

    // Teacher Variations (Pastel Tints)
    TEACHERS: [
        0xe0e0e0, // Grey
        0xffeebb, // Cream
        0xccddee, // Blue-ish
        0xeeddaa  // Yellow-ish
    ],
    TEACHER_SHADOW_OFFSET: 0.15, // Percentage of height

    // Spell Colors
    SPELLS: {
        TRIANGLE: 0xff0000,
        SQUARE: 0xff00ff,
        CIRCLE: 0x0000ff
    },

    // Calendar / Timetable
    CALENDAR: {
        CLASS: '#404080',
        EAT: '#804040',
        SLEEP: '#202020',
        FREE: '#305030',
        DEFAULT: '#333333'
    },

    // UI Layout Constants
    LAYOUT: {
        PRESTIGE: {
            WIDTH_OFFSET: 160,
            START_Y: 20,
            SPACING_X: 25,
            PILLAR_WIDTH: 15,
            PILLAR_MAX_HEIGHT: 40,
            TOOLTIP_WIDTH: 120,
            TOOLTIP_HEIGHT: 60,
            TOOLTIP_OFFSET_Y: 70
        }
    }
};
