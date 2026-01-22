import Phaser from 'phaser';
import { Pane } from 'tweakpane';
import waterFrag from '../shaders/water.frag?raw';

export class WaterShaderTestScene extends Phaser.Scene {
    private waterShader!: Phaser.GameObjects.Shader;
    private customPipeline!: Phaser.Renderer.WebGL.Pipelines.PostFXPipeline;
    private pane!: Pane;

    constructor() {
        super('WaterShaderTestScene');
    }

    preload() {
        // No preloading needed for raw string
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Define uniforms explicitly because we are skipping the GLSL parser
        const uniforms = {
            time: { type: '1f', value: 0 },
            // resolution: { type: '2f', value: new Phaser.Math.Vector2(width, height) },
            speed: { type: '1f', value: 0.1 },
            distortionAmount: { type: '1f', value: 0.05 },
            pixelCount: { type: '1f', value: 200.0 },
            deepColor: { type: '3f', value: new Phaser.Math.Vector3(0.1, 0.3, 0.6) },
            shallowColor: { type: '3f', value: new Phaser.Math.Vector3(0.2, 0.5, 0.8) },
            foamColor: { type: '3f', value: new Phaser.Math.Vector3(1.0, 1.0, 1.0) }
        };

        // Create BaseShader object with uniforms
        const baseShader = new Phaser.Display.BaseShader('waterShader', waterFrag, undefined, uniforms);

        // 1. Generate Noise Texture
        const noiseTexture = this.textures.createCanvas('noise', 256, 256);
        if (noiseTexture) {
            const ctx = noiseTexture.getContext();
            const imgData = ctx.createImageData(256, 256);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const val = Math.floor(Math.random() * 255);
                imgData.data[i] = val;     // R
                imgData.data[i + 1] = val; // G
                imgData.data[i + 2] = val; // B
                imgData.data[i + 3] = 255; // Alpha
            }
            ctx.putImageData(imgData, 0, 0);
            noiseTexture.refresh();
        }

        // 2. Add Shader Object
        // We use a Shader Game Object which acts as a plane with the shader
        // We pass ['noise'] as the texture list, which binds to uMainSampler
        
        // CACHE APPROACH
        if (!this.cache.shader.exists('waterShader')) {
            this.cache.shader.add('waterShader', baseShader);
        }
        this.waterShader = this.add.shader('waterShader', width / 2, height / 2, width, height, ['noise']);

        // Set uniforms
        // this.waterShader.setUniform('resolution', new Phaser.Math.Vector2(width, height));
        this.waterShader.setUniform('speed', 0.1);
        this.waterShader.setUniform('distortionAmount', 0.05);
        this.waterShader.setUniform('pixelCount', 200.0); // Adjust for pixel art look
        this.waterShader.setUniform('deepColor', new Phaser.Math.Vector3(0.1, 0.3, 0.6));
        this.waterShader.setUniform('shallowColor', new Phaser.Math.Vector3(0.2, 0.5, 0.8));
        this.waterShader.setUniform('foamColor', new Phaser.Math.Vector3(1.0, 1.0, 1.0));
        
        // 3. Tweakpane for Debugging
        this.pane = new Pane({ title: 'Water Shader Params' });
        
        const params = {
            speed: 0.1,
            distortion: 0.05,
            pixels: 200,
            deep: { r: 0.1, g: 0.3, b: 0.6 },
            shallow: { r: 0.2, g: 0.5, b: 0.8 },
            sparkleThreshold: 0.90
        };

        this.pane.addBinding(params, 'speed', { min: 0, max: 1.0 }).on('change', (ev) => {
            this.waterShader.setUniform('speed', ev.value);
        });

        this.pane.addBinding(params, 'distortion', { min: 0, max: 0.2 }).on('change', (ev) => {
            this.waterShader.setUniform('distortionAmount', ev.value);
        });

        this.pane.addBinding(params, 'pixels', { min: 10, max: 1000 }).on('change', (ev) => {
            this.waterShader.setUniform('pixelCount', ev.value);
        });
        
        /*
        this.pane.addBinding(params, 'deep', { color: { type: 'float' } }).on('change', (ev) => {
             this.waterShader.setUniform('deepColor', { x: ev.value.r, y: ev.value.g, z: ev.value.b });
        });
        
        this.pane.addBinding(params, 'shallow', { color: { type: 'float' } }).on('change', (ev) => {
             this.waterShader.setUniform('shallowColor', { x: ev.value.r, y: ev.value.g, z: ev.value.b });
        });
        */

        this.add.text(10, 10, 'The Survivalists Style Water Test', { color: '#ffffff', backgroundColor: '#000000' });
    }
}
