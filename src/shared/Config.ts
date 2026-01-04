export const CONFIG = {
    // Game Loop
    SERVER_FPS: 30, // Optimized for stability
    
    // Physics
    PLAYER_SPEED: 100,
    PLAYER_RADIUS: 8,
    
    // Visuals
    PLAYER_SCALE: 1.0, // Debug sprite is native 32x32
    MONSTER_SCALE: 0.15, // Adjust monster to match relative scale
    NAME_TAG_Y_OFFSET: -20, // Adjusted for smaller sprite

    // Networking / Interpolation
    INTERPOLATION_FACTOR: 0.2, // 20% lerp per frame (Fallback)
    VIEW_DISTANCE: 600,
    RENDER_DELAY: 100, // Reduced buffer since FPS is higher
    LERP_FACTOR_LOCAL: 1.0,
    LERP_FACTOR_REMOTE: 0.25,
    EXTRAPOLATION_MAX_TIME: 150,
    EXTRAPOLATION_DECAY_BASE: 100,

    // Reconciliation (Client prediction correction)
    RECONCILIATION_THRESHOLD_SMALL: 10.0, // Increased tolerance
    RECONCILIATION_THRESHOLD_LARGE: 100.0,
    RECONCILIATION_SMOOTHING: 0.2,
    
    // Map
    SPAWN_POINT: { x: 128, y: 128 },
    
    // Chat
    CHAT_MAX_LENGTH: 100,
    CHAT_HISTORY_SIZE: 50,
    
    // Time System
    // 20 real seconds = 1 game hour (3600 game seconds) -> Speed = 3600 / 20 = 180x
    GAME_TIME_SPEED: 180, 
    DAY_LENGTH_SECONDS: 86400, // 24 hours in seconds

    // Debug
    SHOW_COLLIDERS: false,
    LOG_INTERVAL: 10000,
};