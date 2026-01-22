// World Map & Entity definitions
export const WorldConfig = {
    // Map Meta
    SPAWN_POINT: { x: 7360, y: 1600 },
    
    // Entity ID Ranges & Spawning
    ENTITY: {
        ID_PREFECT_START: 1000,
        ID_NPC_START: 9000,
        DEFAULT_SPAWN: { x: 300, y: 300 },
        MAX_ECHOES: 96,
        DORM_BOUNDS: {
            MIN_X: 500,
            MAX_X: 750,
            IGNIS_Y: [400, 650],
            AXIOM_Y: [1050, 1250],
            VESPER_Y: [1700, 1900]
        },
        DINING_HALL_LAYOUT: {
            TABLE_SPACING_X: 64,
            OFFSET_X: -96,
            IGNIS_OFFSET_Y: -80,
            VESPER_OFFSET_Y: 80,
            ROW_OFFSET_Y: 40
        }
    },

    // AI / NPC Logic
    AI_DETECTION_RADIUS: 100,
    AI_PERSONAL_SPACE: 40,
    PREFECT_VISION_RADIUS: 150, 
    DETENTION_DURATION_MS: 180000, 

    // Visuals & Lighting
    LIGHTING_CONFIG: {
        // Loaded dynamically from kaioa_config.json mostly, but defaults here
        WINDOW_RAY_ALPHA: 0.4,
        WINDOW_LIGHT_RADIUS: 250
    }
};
