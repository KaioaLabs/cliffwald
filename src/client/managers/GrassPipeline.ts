import Phaser from 'phaser';

export class GrassPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    constructor(config: Phaser.Types.Renderer.WebGL.Pipelines.MultiPipelineConfig) {
        super(config);
    }
}
