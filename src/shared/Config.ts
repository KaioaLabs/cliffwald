export const CONFIG = {
    // Game Loop
    SERVER_FPS: 20,
    
    // Physics
    PLAYER_SPEED: 100,
    PLAYER_RADIUS: 8,
    
    // Visuals
    PLAYER_SCALE: 1.0, // Debug sprite is native 32x32
    MONSTER_SCALE: 0.15, // Adjust monster to match relative scale
    NAME_TAG_Y_OFFSET: -20, // Adjusted for smaller sprite

    // Networking / Interpolation
    INTERPOLATION_FACTOR: 0.2, // 20% lerp per frame
    
    // Map
    SPAWN_POINT: { x: 128, y: 128 },
    
    // Debug
    SHOW_COLLIDERS: true
};