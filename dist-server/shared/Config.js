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
    // Time System (Non-Linear 45-minute Cycle)
    // Day Phase: 30 mins real time -> 06:00 to 22:00 (16h game time)
    // Night Phase: 15 mins real time -> 22:00 to 06:00 (8h game time)
    SEASON_START_DATE: 1735689600000, // Jan 1st, 2026 00:00:00 UTC
    CYCLE_DURATION_MS: 2700000, // 45 Minutes Real Time
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
    // Academic Calendar (Cyclic Week Logic)
    CYCLES_PER_DAY: 1, // 1 Cycle = 1 Calendar Day
    DAYS_PER_WEEK: 7,
    WEEKS_PER_COURSE: 8, // 8 Real Weeks = 1 Course
    // School Locations (Scaled for 100x100 Map)
    SCHOOL_LOCATIONS: {
        // Dormitories (Left Wing)
        DORM_IGNIS: { x: 576, y: 480 },
        DORM_AXIOM: { x: 576, y: 1120 },
        DORM_VESPER: { x: 576, y: 1760 },
        // Central Hub
        GREAT_HALL: { x: 1600, y: 560 },
        ACADEMIC_WING: { x: 1600, y: 1360 },
        INFIRMARY: { x: 1600, y: 960 },
        // Right Wing
        TRAINING_GROUNDS: { x: 2640, y: 1520 },
        ALCHEMY_LAB: { x: 2592, y: 640 },
        // Outdoor
        COURTYARD: { x: 1056, y: 1280 },
        FOREST: { x: 1600, y: 2880 }
    },
    // Infirmary Logic
    INFIRMARY_BEDS: [
        { x: 1550, y: 960 },
        { x: 1580, y: 960 },
        { x: 1620, y: 960 },
        { x: 1650, y: 960 },
        { x: 1550, y: 1000 },
        { x: 1650, y: 1000 }
    ],
    INFIRMARY_EXIT: { x: 1600, y: 1050 },
    // Duel / Combat
    DUEL_ZONES: [
        { x: 2200, y: 1200, radius: 300, id: 0 },
        { x: 3000, y: 1200, radius: 300, id: 1 },
        { x: 2200, y: 1800, radius: 300, id: 2 },
        { x: 3000, y: 1800, radius: 300, id: 3 }
    ],
    DUEL_EXITS: [
        { x: 2200, y: 1550 },
        { x: 3000, y: 1550 },
        { x: 2200, y: 2150 },
        { x: 3000, y: 2150 }
    ],
    DUEL_TIMEOUT_MS: 60000, // 1 Minute Max Duel
    DUEL_COOLDOWN_MS: 5000, // Time before loser can re-enter
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
    // 1. Cyclic Day (1 Cycle = 1 Day)
    const totalCycles = Math.floor(elapsedMs / exports.CONFIG.CYCLE_DURATION_MS);
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
