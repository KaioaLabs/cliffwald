// Infrastructure & Core Systems Configuration
export const SystemConfig = {
    // Game Loop
    SERVER_FPS: 30, 
    
    // Networking
    NETWORK: {
        DEFAULT_PORT: 2568,
        PING_INTERVAL: 3000,
        SYNC_RATE: 100 // ms
    },

    // Physics Engine
    PHYSICS: {
        VELOCITY_MULTIPLIER: 1.5, // Used in MovementSystem for snappy movement
        DAMPING: 10.0,            // Linear Damping for players
        GHOST_SPEED_MULTIPLIER: 3.0
    },

    // Collision Bitmasks (Single Floor)
    COLLISION_GROUPS: {
        GLOBAL:      0x0001,
        PLAYER:      0x0002,
        PROJECTILE:  0x0004,
        ITEM:        0x0008,
        SENSOR:      0x0010, 
        GHOST:       0x0020, // New Group for Ghosts

        // Masks
        PLAYER_MASK: 0x0001 | 0x0002 | 0x0004 | 0x0008 | 0x0010,
        WALL_MASK:   0x0002 | 0x0004, // Walls hit Players and Projectiles
        PROJECTILE_MASK: 0x0001 | 0x0002 | 0x0008, // Projectiles hit Walls, Players, Items
        GHOST_MASK:  0x0000 // Hits NOTHING
    },

    COLLISION_CONFIG: {
        PROJECTILE_RADIUS_SQ: 900, 
        SWEEP_PRUNE_THRESHOLD: 30,  
        WALL_CHECK: 0x00010001
    },

    // Database & Persistence
    DB_CONFIG: {
        AUTO_SAVE_INTERVAL: 300000 
    }
};
