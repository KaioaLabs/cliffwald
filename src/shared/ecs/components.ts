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
    };
    
    facing?: { x: number; y: number };

    ai?: {
        state: 'idle' | 'patrol' | 'chase';
        targetId?: string;
        timer: number;
        home?: { x: number; y: number };
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
        mp: number;
        maxMp: number;
        level: number;
        exp: number;
        expToNext: number;
    };

    inventory?: {
        items: { itemId: string; count: number }[]; // Array of items
        capacity: number;
    };

    equipment?: {
        weapon?: string;
        armor?: string;
    };
    
    // Quests
    quests?: {
        active: string[];
        completed: string[];
    };
}
