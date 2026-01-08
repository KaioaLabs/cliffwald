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
    PLAYER_RADIUS: 20,
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
    // Chat
    CHAT_MAX_LENGTH: 100,
    CHAT_HISTORY_SIZE: 50,
    // Time System (Non-Linear 60-minute Cycle)
    // Day Phase: 45 mins real time -> 06:00 to 22:00 (16h game time)
    // Night Phase: 15 mins real time -> 22:00 to 06:00 (8h game time)
    CYCLE_DURATION_MS: 3600000, // 1 Hour Real Time
    DAY_PHASE_DURATION_MS: 2700000, // 45 Minutes
    // Academic Schedule (Source of Truth for UI and AI)
    ACADEMIC_SCHEDULE: [
        { start: 8, end: 10, name: "Charms Class", location: "Classroom", activity: "class" },
        { start: 10, end: 12, name: "Free Time", location: "Courtyard", activity: "free" },
        { start: 12, end: 14, name: "Lunch", location: "Great Hall", activity: "eat" },
        { start: 15, end: 17, name: "Potions Class", location: "Dungeons", activity: "class" },
        { start: 17, end: 22, name: "Extra-Curricular", location: "Forest/Tatami", activity: "free" },
        { start: 22, end: 8, name: "Curfew", location: "Dormitories", activity: "sleep" }
    ],
    // Debug
    SHOW_COLLIDERS: false,
    LOG_INTERVAL: 10000,
    USE_LIGHTS: true,
    // AI Navigation
    AI_DETECTION_RADIUS: 100,
    AI_PERSONAL_SPACE: 40,
    // Academic Calendar
    WEEKS_PER_COURSE: 8,
    MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
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
    // Rock Paper Scissors Logic
    // Circle = Rock, Square = Paper, Triangle = Scissors
    RPS_MAP: {
        'circle': 'rock',
        'square': 'paper',
        'triangle': 'scissors'
    },
    RPS_WINNER: {
        'rock': 'scissors', // Rock beats Scissors
        'scissors': 'paper', // Scissors beats Paper
        'paper': 'rock' // Paper beats Rock
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
    // We ignore worldStartTime now because time is absolute system time
    return getGameTime(Date.now()).hour;
}
function getAcademicProgress(worldStartTime) {
    const elapsedMs = Date.now() - worldStartTime;
    const totalWeeks = Math.floor(elapsedMs / exports.CONFIG.MS_PER_WEEK);
    const currentCourse = Math.floor(totalWeeks / exports.CONFIG.WEEKS_PER_COURSE) + 1;
    const currentWeek = (totalWeeks % exports.CONFIG.WEEKS_PER_COURSE) + 1;
    const months = ["November", "December", "January", "February", "March", "April", "May", "June"];
    const currentMonth = months[currentWeek - 1] || "June";
    return { currentCourse, currentWeek, currentMonth };
}
