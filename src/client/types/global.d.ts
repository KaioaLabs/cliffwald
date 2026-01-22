import { GameScene } from '../main';

declare global {
    interface Window {
        gameClient?: GameScene;
        QA_Probe?: () => any;
        game?: Phaser.Game;
    }
}

export {};
