import { Entity } from '../../shared/ecs/components';
import RAPIER from '@dimforge/rapier2d-compat';

export type ClientEntity = Entity & {
    shadow?: Phaser.GameObjects.Image;
    nameTag?: Phaser.GameObjects.Text;
    isLocal?: boolean;
    lastDir?: string;
    positionBuffer?: { x: number, y: number, timestamp: number }[];
    lastMoveTime?: number;
    serverPos?: { x: number, y: number };
    collider?: RAPIER.Collider;
    unconsciousUntil?: number;
};