import RAPIER from "@dimforge/rapier2d-compat";

export interface InputComponent {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export interface FacingComponent {
    x: number;
    y: number;
}

export interface PlayerComponent {
    sessionId: string;
}

export interface AIComponent {
    state: 'patrol' | 'chase' | 'attack' | 'idle';
    timer: number;
    home: { x: number, y: number };
    targetId?: string;
}

export interface Entity {
    id?: number;
    body?: RAPIER.RigidBody;
    input?: InputComponent;
    facing?: FacingComponent;
    player?: PlayerComponent;
    ai?: AIComponent;
}
