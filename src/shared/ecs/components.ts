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
    
    // Gameplay
    player?: {
        sessionId: string;
    };
}
