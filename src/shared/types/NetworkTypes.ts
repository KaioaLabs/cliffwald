export interface PlayerInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export interface JoinOptions {
    username?: string;
    skin?: string;
}

export interface ChatMessagePayload {
    text: string;
}

export interface PositionUpdate {
    x: number;
    y: number;
    hp?: number;
    maxHp?: number;
}
