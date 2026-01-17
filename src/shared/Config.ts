import kaioaConfig from '../../assets/data/kaioa_config.json';

export const CONFIG = {
    // Game Loop
    SERVER_FPS: 30, 
    
    // Physics (From JSON)
    PLAYER_SPEED: kaioaConfig.physics.playerSpeed, 
    PLAYER_RADIUS: kaioaConfig.physics.playerRadius,
    
    // Visuals
    PLAYER_SCALE: 1.0, 
    MONSTER_SCALE: 0.15, 
    NAME_TAG_Y_OFFSET: -40, 

    // Networking / Interpolation
    INTERPOLATION_FACTOR: 0.4, 
    VIEW_DISTANCE: 1200, 
    RENDER_DELAY: 50, 
    LERP_FACTOR_LOCAL: 0.5, 
    LERP_FACTOR_REMOTE: 0.3,
    EXTRAPOLATION_MAX_TIME: 150,
    EXTRAPOLATION_DECAY_BASE: 100,

    // Reconciliation
    RECONCILIATION_THRESHOLD_SMALL: 2.0, 
    RECONCILIATION_THRESHOLD_LARGE: 100.0, 
    RECONCILIATION_SMOOTHING: 0.15,
    
    // Map
    SPAWN_POINT: { x: 256, y: 256 },
    
    // Time System
    SEASON_START_DATE: 1735689600000, 
    CYCLE_DURATION_MS: 2700000, 
    DAY_PHASE_DURATION_MS: 1800000, 

    // Academic Schedule
    ACADEMIC_SCHEDULE: [
        { start: 7, end: 8.5, name: "Breakfast", location: "Great Hall", activity: "eat" },
        { start: 8.5, end: 12.5, name: "Morning Class", location: "Classroom", activity: "class" },
        { start: 12.5, end: 14, name: "Lunch", location: "Great Hall", activity: "eat" },
        { start: 14, end: 20, name: "Free Time", location: "Courtyard", activity: "free" },
        { start: 20, end: 22, name: "Dinner", location: "Great Hall", activity: "eat" },
        { start: 22, end: 7, name: "Curfew", location: "Dormitories", activity: "sleep" }
    ],

    // Debug
    SHOW_COLLIDERS: false,
    LOG_INTERVAL: 10000,
    USE_LIGHTS: true,

    // AI Navigation
    AI_DETECTION_RADIUS: 100,
    AI_PERSONAL_SPACE: 40,

    // Academic Calendar
    CYCLES_PER_DAY: 1, 
    DAYS_PER_WEEK: 7,
    WEEKS_PER_COURSE: 8, 
    CLASS_DURATION_MS: 180000, 

    // Prefect Logic
    PREFECT_VISION_RADIUS: 150, 
    DETENTION_DURATION_MS: 180000, 

    // Duel / Combat
    DUEL_TIMEOUT_MS: 60000, 
    DUEL_COOLDOWN_MS: 5000, 

    // Spell Configuration
    SPELL_CONFIG: {
        BASE_SPEED: 400,
        BASE_LIFETIME: 2000, 
        BASE_RANGE: 600,     
        VISUAL_TWEEN_DURATION: 3000 
    },

    // Collision & Physics Optimization
    COLLISION_CONFIG: {
        PROJECTILE_RADIUS_SQ: 900, 
        SWEEP_PRUNE_THRESHOLD: 30,  
        WALL_CHECK: 0x00010001
    },

    // Simplified Collision Bitmasks (Single Floor)
    COLLISION_GROUPS: {
        GLOBAL:      0x0001,
        PLAYER:      0x0002,
        PROJECTILE:  0x0004,
        ITEM:        0x0008,
        SENSOR:      0x0010, 

        // Masks
        PLAYER_MASK: 0x0001 | 0x0002 | 0x0004 | 0x0008 | 0x0010,
        WALL_MASK:   0x0002 | 0x0004, // Walls hit Players and Projectiles
        PROJECTILE_MASK: 0x0001 | 0x0002 | 0x0008 // Projectiles hit Walls, Players, Items
    },

    // Database & Persistence
    DB_CONFIG: {
        AUTO_SAVE_INTERVAL: 300000 
    },

    // Lighting Configuration (Mapped from JSON)
    LIGHTING_CONFIG: {
        ORBIT_RADIUS: kaioaConfig.lighting.orbitRadius,
        TRANSITIONS: {
            DAWN_START: kaioaConfig.lighting.transitions.dawnStart,
            DAY_START: kaioaConfig.lighting.transitions.dayStart,
            DUSK_START: kaioaConfig.lighting.transitions.duskStart,
            NIGHT_START: kaioaConfig.lighting.transitions.nightStart
        },
        PALETTE: {
            NIGHT: kaioaConfig.lighting.palette.night,
            DAWN:  kaioaConfig.lighting.palette.dawn,
            DAY:   kaioaConfig.lighting.palette.day,
            DUSK:  kaioaConfig.lighting.palette.dusk
        },
        WINDOW_RAY_ALPHA: kaioaConfig.lighting.windowRayAlpha,
        WINDOW_LIGHT_RADIUS: kaioaConfig.lighting.windowLightRadius
    },

    // Security & Validation
    VALIDATION: {
        INTERACTION_RADIUS: 100, // px (Distance to pick up items)
        INTERACTION_RADIUS_SQ: 10000 // 100^2
    },

    // Chat System
    CHAT: {
        MAX_LENGTH: 100,
        HISTORY_SIZE: 50,
        LOCAL_RADIUS: 400, // px (Radius for local chat)
        LOCAL_RADIUS_SQ: 160000 // 400^2
    },
    
    // Rock Paper Scissors Logic (The Triad)
    // Circle beats Triangle (Shield > Spike)
    // Triangle beats Square (Spike > Area)
    // Square beats Circle (Area > Shield)
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

export function getGameTime(timestamp: number) {
    // 1. Get position within the hour (0 to 3599999 ms)
    const cyclePos = timestamp % CONFIG.CYCLE_DURATION_MS;
    
    let gameHour = 0;
    let gameMinute = 0;
    let isNight = false;

    if (cyclePos < CONFIG.DAY_PHASE_DURATION_MS) {
        // DAY PHASE (07:00 to 22:00 = 15 hours)
        // Progress 0..1
        const progress = cyclePos / CONFIG.DAY_PHASE_DURATION_MS;
        const totalGameMinutes = 7 * 60 + (progress * 15 * 60); // Start at 07:00 + progress * 15h
        
        gameHour = Math.floor(totalGameMinutes / 60) % 24;
        gameMinute = Math.floor(totalGameMinutes % 60);
        isNight = false;
    } else {
        // NIGHT PHASE (22:00 to 07:00 = 9 hours)
        // Progress 0..1
        const nightProgress = (cyclePos - CONFIG.DAY_PHASE_DURATION_MS) / (CONFIG.CYCLE_DURATION_MS - CONFIG.DAY_PHASE_DURATION_MS);
        const totalGameMinutes = 22 * 60 + (nightProgress * 9 * 60); // Start at 22:00 + progress * 9h
        
        gameHour = Math.floor(totalGameMinutes / 60) % 24;
        gameMinute = Math.floor(totalGameMinutes % 60);
        isNight = true;
    }

    return { hour: gameHour, minute: gameMinute, isNight };
}

export function getGameHour(worldStartTime: number): number {
    // Legacy wrapper, but prefers explicit timestamp if we were refactoring fully.
    // For now, let's just delegate to getGameTime with Date.now() default to maintain compatibility
    // unless called with specific time.
    return getGameTime(Date.now()).hour;
}

export function getAcademicProgress(worldStartTime: number, currentTimestamp: number = Date.now()) {
    const elapsedMs = currentTimestamp - worldStartTime;
    
    // 1. Cyclic Day (1 Cycle = 1 Day)
    const totalCycles = Math.floor(elapsedMs / CONFIG.CYCLE_DURATION_MS);
    const currentDay = (totalCycles % 7) + 1; // 1=Mon, 7=Sun

    // 2. Narrative Progress (Real Weeks)
    const REAL_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const currentWeek = Math.floor(elapsedMs / REAL_WEEK_MS) + 1;
    
    // 3. Map Real Week to "Month/Chapter"
    const months = ["September", "October", "November", "December", "January", "February", "March", "April"];
    const currentMonth = months[Math.min(currentWeek - 1, 7)] || "Graduated";

    // "currentCourse" is technically the Real Week in this new logic, or we can map it.
    // Let's keep currentCourse as the 'Week' index for logic compatibility.
    const currentCourse = currentWeek;

    return { currentCourse, currentWeek, currentDay, currentMonth };
}
