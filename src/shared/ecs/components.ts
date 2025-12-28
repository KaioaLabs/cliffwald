import RAPIER from "@dimforge/rapier2d-compat";

export interface Entity {
    // Identity
    id?: string; // Optional because miniplex adds one internally if needed, but useful for networking

    // Physics
    body?: RAPIER.RigidBody;
    
    // Logic
    input?: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        attack: boolean;
    };
    
    facing?: { x: number; y: number };

    // Combat
    combat?: {
        cooldown: number;
        range: number;
        damage: number;
    };
    
    // Gameplay
    player?: {
        sessionId: string;
    };

    // RPG
    stats?: {
        hp: number;
        maxHp: number;
        speed: number;
    };

    inventory?: {
        items: { itemId: string; count: number }[]; // Array of items
        capacity: number;
    };
}
