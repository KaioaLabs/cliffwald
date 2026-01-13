"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.getGameTime = getGameTime;
exports.getGameHour = getGameHour;
exports.getAcademicProgress = getAcademicProgress;
exports.CONFIG = {
    // Game Loop
    SERVER_FPS: 30, // Optimized for stability
    // Physics (Scaled for 32x32 tiles)
    PLAYER_SPEED: 120,
    PLAYER_RADIUS: 12,
    // Visuals
    PLAYER_SCALE: 1.0,
    MONSTER_SCALE: 0.15,
    NAME_TAG_Y_OFFSET: -40, // Scaled for larger sprites
    // Networking / Interpolation
    INTERPOLATION_FACTOR: 0.2,
    VIEW_DISTANCE: 1200, // Doubled view distance
    RENDER_DELAY: 100,
    LERP_FACTOR_LOCAL: 1.0,
    LERP_FACTOR_REMOTE: 0.25,
    EXTRAPOLATION_MAX_TIME: 150,
    EXTRAPOLATION_DECAY_BASE: 100,
    // Reconciliation
    RECONCILIATION_THRESHOLD_SMALL: 20.0, // Doubled tolerance
    RECONCILIATION_THRESHOLD_LARGE: 200.0,
    RECONCILIATION_SMOOTHING: 0.2,
    // Map
    SPAWN_POINT: { x: 256, y: 256 },
    // Time System (Non-Linear 40-minute Cycle)
    // Day Phase: 30 mins real time -> 06:00 to 22:00 (16h game time)
    // Night Phase: 10 mins real time -> 22:00 to 06:00 (8h game time)
    CYCLE_DURATION_MS: 2400000, // 40 Minutes Real Time
    DAY_PHASE_DURATION_MS: 1800000, // 30 Minutes
    // Academic Schedule (Source of Truth for UI and AI) – Definición de Ventanas de Oportunidad
    ACADEMIC_SCHEDULE: [
        { start: 7, end: 8.5, name: "Breakfast", location: "Great Hall", activity: "eat" },
        { start: 8.5, end: 10.5, name: "Morning Class", location: "Classroom", activity: "class" },
        { start: 10.5, end: 12.5, name: "Free Time", location: "Courtyard", activity: "free" },
        { start: 12.5, end: 14, name: "Lunch", location: "Great Hall", activity: "eat" },
        { start: 14, end: 17, name: "Field Study", location: "Forest", activity: "free" },
        { start: 17, end: 19, name: "Afternoon Class", location: "Classroom", activity: "class" },
        { start: 19, end: 21, name: "Dinner", location: "Great Hall", activity: "eat" },
        { start: 21, end: 7, name: "Curfew", location: "Dormitories", activity: "sleep" }
    ],
    // Debug
    SHOW_COLLIDERS: false,
    LOG_INTERVAL: 10000,
    USE_LIGHTS: true,
    // AI Navigation
    AI_DETECTION_RADIUS: 100,
    AI_PERSONAL_SPACE: 40,
    // Academic Calendar (4 Solar Cycles = 1 Calendar Day)
    CYCLES_PER_DAY: 4,
    DAYS_PER_WEEK: 7,
    WEEKS_PER_COURSE: 4, // 1 Real Month (approx) = 1 Course
    // School Locations (Scaled for 100x100 Map)
    SCHOOL_LOCATIONS: {
        // Dormitories (Left Wing)
        DORM_IGNIS: { x: 576, y: 480 },
        DORM_AXIOM: { x: 576, y: 1120 },
        DORM_VESPER: { x: 576, y: 1760 },
        // Central Hub
        GREAT_HALL: { x: 1600, y: 560 },
        ACADEMIC_WING: { x: 1600, y: 1360 },
        // Right Wing
        TRAINING_GROUNDS: { x: 2640, y: 1520 },
        ALCHEMY_LAB: { x: 2592, y: 640 },
        // Outdoor
        COURTYARD: { x: 1056, y: 1280 },
        FOREST: { x: 1600, y: 2880 }
    },
    // Duel / Combat
    DUEL_ZONE: {
        x: 2640, // Reusing Training Grounds location
        y: 1520,
        radius: 300 // Size of the 'Tatami' area
    },
    // Spell Configuration
    SPELL_CONFIG: {
        BASE_SPEED: 400,
        BASE_LIFETIME: 2000, // ms
        BASE_RANGE: 600, // px
        VISUAL_TWEEN_DURATION: 3000 // ms (Safety margin for visuals)
    },
    // Collision & Physics Optimization
    COLLISION_CONFIG: {
        PROJECTILE_RADIUS_SQ: 900, // 30px * 30px
        SWEEP_PRUNE_THRESHOLD: 30 // px
    },
    // Database & Persistence
    DB_CONFIG: {
        AUTO_SAVE_INTERVAL: 300000 // 5 minutes
    },
    // Security & Validation
    VALIDATION: {
        INTERACTION_RADIUS: 50, // px (Distance to pick up items)
        INTERACTION_RADIUS_SQ: 2500 // 50^2
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
    },
    RPS_WINNER: {
        'circle': 'triangle', // Circle beats Triangle
        'triangle': 'square', // Triangle beats Square
        'square': 'circle' // Square beats Circle
    }
};
function getGameTime(timestamp) {
    // 1. Get position within the hour (0 to 3599999 ms)
    const cyclePos = timestamp % exports.CONFIG.CYCLE_DURATION_MS;
    let gameHour = 0;
    let gameMinute = 0;
    let isNight = false;
    if (cyclePos < exports.CONFIG.DAY_PHASE_DURATION_MS) {
        // DAY PHASE (06:00 to 22:00 = 16 hours)
        // Progress 0..1
        const progress = cyclePos / exports.CONFIG.DAY_PHASE_DURATION_MS;
        const totalGameMinutes = 6 * 60 + (progress * 16 * 60); // Start at 06:00 + progress * 16h
        gameHour = Math.floor(totalGameMinutes / 60) % 24;
        gameMinute = Math.floor(totalGameMinutes % 60);
        isNight = false;
    }
    else {
        // NIGHT PHASE (22:00 to 06:00 = 8 hours)
        // Progress 0..1
        const nightProgress = (cyclePos - exports.CONFIG.DAY_PHASE_DURATION_MS) / (exports.CONFIG.CYCLE_DURATION_MS - exports.CONFIG.DAY_PHASE_DURATION_MS);
        const totalGameMinutes = 22 * 60 + (nightProgress * 8 * 60); // Start at 22:00 + progress * 8h
        gameHour = Math.floor(totalGameMinutes / 60) % 24;
        gameMinute = Math.floor(totalGameMinutes % 60);
        isNight = true;
    }
    return { hour: gameHour, minute: gameMinute, isNight };
}
function getGameHour(worldStartTime) {
    // Legacy wrapper, but prefers explicit timestamp if we were refactoring fully.
    // For now, let's just delegate to getGameTime with Date.now() default to maintain compatibility
    // unless called with specific time.
    return getGameTime(Date.now()).hour;
}
function getAcademicProgress(worldStartTime, currentTimestamp = Date.now()) {
    const elapsedMs = currentTimestamp - worldStartTime;
    const totalCycles = Math.floor(elapsedMs / exports.CONFIG.CYCLE_DURATION_MS);
    // 4 Cycles = 1 Calendar Day
    const totalDays = Math.floor(totalCycles / exports.CONFIG.CYCLES_PER_DAY);
    const currentCourse = Math.floor(totalDays / (exports.CONFIG.DAYS_PER_WEEK * exports.CONFIG.WEEKS_PER_COURSE)) + 1;
    const currentWeek = Math.floor((totalDays % (exports.CONFIG.DAYS_PER_WEEK * exports.CONFIG.WEEKS_PER_COURSE)) / exports.CONFIG.DAYS_PER_WEEK) + 1;
    const currentDay = (totalDays % exports.CONFIG.DAYS_PER_WEEK) + 1; // 1 = Monday, 7 = Sunday
    const months = ["September", "October", "November", "December"]; // Example progression
    const currentMonth = months[currentCourse - 1] || "Graduated";
    return { currentCourse, currentWeek, currentDay, currentMonth };
}
