import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from '../shaders/VignetteShader.js';

export class GameRenderer {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false, // SMAA handles this
            powerPreference: 'high-performance',
            stencil: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // AAA Shadow Settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true; // Dynamic shadows

        // AAA Rendering Settings
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5; // Increased for HDR
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Physical light units for realism
        this.renderer.physicallyCorrectLights = true;

        // Set clear color (fallback if scene background isn't working)
        this.renderer.setClearColor(0x4a5a6a, 1.0);

        const clearColor = new THREE.Color();
        this.renderer.getClearColor(clearColor);
        console.log('🎨 Renderer initialized with clear color:', clearColor);
    }

    setupPostProcessing(scene, camera) {
        this.composer = new EffectComposer(this.renderer);

        // Base render pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Bloom for glowing effects (minimal)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.4,  // Minimal strength
            0.3,  // Small radius
            0.85  // High threshold = minimal bloom
        );
        this.composer.addPass(this.bloomPass);

        // SMAA Anti-aliasing for smooth edges
        const smaaPass = new SMAAPass(
            window.innerWidth * this.renderer.getPixelRatio(),
            window.innerHeight * this.renderer.getPixelRatio()
        );
        this.composer.addPass(smaaPass);

        // Vignette for cinematic feel
        this.vignettePass = new ShaderPass(VignetteShader);
        this.vignettePass.uniforms['offset'].value = 0.95;
        this.vignettePass.uniforms['darkness'].value = 0.8;
        this.composer.addPass(this.vignettePass);

        // Output pass for proper color space conversion
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        console.log('✨ Optimized Post-processing initialized (Bloom + SMAA + Vignette)');
    }

    render(scene, camera) {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(scene, camera);
        }
    }

    setBloomIntensity(intensity) {
        if (this.bloomPass) {
            this.bloomPass.strength = intensity;
        }
    }

    /**
     * Set vignette intensity (useful for low health feedback)
     */
    setVignetteIntensity(darkness, offset = 0.95) {
        if (this.vignettePass) {
            this.vignettePass.uniforms['darkness'].value = darkness;
            this.vignettePass.uniforms['offset'].value = offset;
        }
    }

    /**
     * Update vignette based on player health percentage
     */
    updateHealthVignette(healthPercent) {
        if (!this.vignettePass) return;

        // Increase vignette darkness when low on health
        const baseDarkness = 0.8;
        const maxDarkness = 1.8;

        // Health < 30% -> increase vignette significantly
        if (healthPercent < 0.3) {
            const intensity = baseDarkness + ((1 - healthPercent / 0.3) * (maxDarkness - baseDarkness));
            this.setVignetteIntensity(intensity, 0.9);
        } else {
            this.setVignetteIntensity(baseDarkness, 0.95);
        }
    }
}