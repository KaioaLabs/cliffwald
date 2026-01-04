export const CONFIG = {
    // Game Loop
    SERVER_FPS: 30, // Optimized for stability
    
    // Physics (Scaled for 32x32 tiles)
    PLAYER_SPEED: 200, 
    PLAYER_RADIUS: 16,
    
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
    
    // Time System
    GAME_TIME_SPEED: 180, 
    DAY_LENGTH_SECONDS: 86400, 

    // Debug
    SHOW_COLLIDERS: false,
    LOG_INTERVAL: 10000,

    // Academic Calendar
    WEEKS_PER_COURSE: 8, 
    MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000, 

    // School Locations (Scaled x2 for 32x32 world)
    SCHOOL_LOCATIONS: {
        DORM_IGNIS: { x: 416, y: 416 },
        DORM_AXIOM: { x: 416, y: 1056 },
        DORM_VESPER: { x: 1216, y: 736 },
        
        GREAT_HALL: { x: 960, y: 416 },
        ACADEMIC_WING: { x: 928, y: 928 },
        TRAINING_GROUNDS: { x: 1408, y: 1248 },
        COURTYARD: { x: 896, y: 640 },
        FOREST: { x: 320, y: 1408 },
        ALCHEMY_LAB: { x: 1376, y: 416 }
    }
};

export function getGameHour(worldStartTime: number): number {
    const elapsedMs = Date.now() - worldStartTime;
    const totalGameSeconds = (elapsedMs / 1000) * CONFIG.GAME_TIME_SPEED;
    const wrappedTime = totalGameSeconds % CONFIG.DAY_LENGTH_SECONDS;
    return Math.floor(wrappedTime / 3600); // Returns 0-23
}

export function getAcademicProgress(worldStartTime: number) {
    const elapsedMs = Date.now() - worldStartTime;
    const totalWeeks = Math.floor(elapsedMs / CONFIG.MS_PER_WEEK);
    
    const currentCourse = Math.floor(totalWeeks / CONFIG.WEEKS_PER_COURSE) + 1;
    const currentWeek = (totalWeeks % CONFIG.WEEKS_PER_COURSE) + 1;
    
    const months = ["November", "December", "January", "February", "March", "April", "May", "June"];
    const currentMonth = months[currentWeek - 1] || "June";

    return { currentCourse, currentWeek, currentMonth };
}