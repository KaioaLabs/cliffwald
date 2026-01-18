import { Entity } from '../../shared/ecs/components';
import RAPIER from '@dimforge/rapier2d-compat';

export interface ClientEntity extends Entity {
    visualOffset?: { x: number, y: number }; // Jump/general
    climbOffset?: number; // Vertical climbing (Y axis)
    isLocal?: boolean;
    lastDir?: string;
    // ... other props
    shadow?: Phaser.GameObjects.Image;
    nameTag?: Phaser.GameObjects.Text;
    classTimerText?: Phaser.GameObjects.Text;
    prefectLight?: Phaser.GameObjects.Light;
    chatBubble?: Phaser.GameObjects.Container;
    chatBubbleTimer?: Phaser.Time.TimerEvent;
    positionBuffer?: { x: number, y: number, timestamp: number }[];
    lastMoveTime?: number;
    serverPos?: { x: number, y: number };
    unconsciousUntil?: number;
    prestige?: number;
    gold?: number;
}