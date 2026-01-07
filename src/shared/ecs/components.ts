import RAPIER from "@dimforge/rapier2d-compat";

export interface InputComponent {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    analogDir?: { x: number, y: number };
}

export interface FacingComponent {
    x: number;
    y: number;
}

export interface PlayerComponent {
    sessionId: string;
}

export interface AIComponent {
    state: 'patrol' | 'chase' | 'attack' | 'idle' | 'routine' | 'duel';
    timer: number;
    home: { x: number, y: number };
    house?: 'ignis' | 'axiom' | 'vesper';
    targetPos?: { x: number, y: number };
    path?: { x: number, y: number }[];
    routineSpots?: {
        sleep: { x: number, y: number };
        class: { x: number, y: number };
        eat: { x: number, y: number };
    };
    targetId?: string;
}

export interface VisualComponent {
    sprite: { x: number, y: number, depth: number, visible: boolean, flipX: boolean, destroy: Function } | any; // Reference to Phaser Sprite (Client only)
}

export interface Entity {
    id?: number;
    body?: RAPIER.RigidBody;
    input?: InputComponent;
    facing?: FacingComponent;
    player?: PlayerComponent;
    ai?: AIComponent;
    visual?: VisualComponent;
}
