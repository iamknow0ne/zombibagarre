import * as THREE from 'three';

export class BiomeSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentBiome = null;

        // Available biomes with distinct visual styles
        this.biomes = {
            'apocalyptic_city': {
                name: 'Apocalyptic City',
                sky: { color: 0x7a6a5a, fog: 0x6a5a4a, fogDensity: 0.0008 }, // Reduced fog for better visibility
                lighting: { ambient: 0xff8866, ambientIntensity: 1.0, sun: 0xffaa66, sunIntensity: 1.8 }, // Brighter
                ground: { base: 0x5a5a5a, detail: 0x6a6a6a },
                atmosphere: 'smoke'
            },
            'frozen_wasteland': {
                name: 'Frozen Wasteland',
                sky: { color: 0xaaccee, fog: 0x88aacc, fogDensity: 0.001 }, // Reduced fog
                lighting: { ambient: 0xccddff, ambientIntensity: 1.1, sun: 0xffffff, sunIntensity: 2.2 }, // Brighter
                ground: { base: 0xddeeff, detail: 0xccddee },
                atmosphere: 'snow'
            },
            'toxic_swamp': {
                name: 'Toxic Swamp',
                sky: { color: 0x667755, fog: 0x778866, fogDensity: 0.0012 }, // Reduced fog
                lighting: { ambient: 0xaabb66, ambientIntensity: 0.9, sun: 0xccdd88, sunIntensity: 1.5 }, // Brighter
                ground: { base: 0x556644, detail: 0x667755 },
                atmosphere: 'toxic'
            },
            'desert_ruins': {
                name: 'Desert Ruins',
                sky: { color: 0xffcc88, fog: 0xddaa66, fogDensity: 0.0005 }, // Minimal fog
                lighting: { ambient: 0xffdd99, ambientIntensity: 1.2, sun: 0xffffaa, sunIntensity: 2.5 }, // Very bright
                ground: { base: 0xddbb88, detail: 0xeecc99 },
                atmosphere: 'dust'
            },
            'dark_forest': {
                name: 'Dark Forest',
                sky: { color: 0x4a6a4a, fog: 0x3a5a3a, fogDensity: 0.0015 }, // Reduced fog
                lighting: { ambient: 0x66aa66, ambientIntensity: 0.9, sun: 0x99cc99, sunIntensity: 1.5 }, // Brighter
                ground: { base: 0x4a6a3a, detail: 0x5a7a4a },
                atmosphere: 'fog'
            }
        };
    }

    selectRandomBiome() {
        const biomeKeys = Object.keys(this.biomes);
        const randomKey = biomeKeys[Math.floor(Math.random() * biomeKeys.length)];
        this.currentBiome = this.biomes[randomKey];
        console.log(`🌍 Selected biome: ${this.currentBiome.name}`);
        return randomKey;
    }

    getCurrentBiome() {
        return this.currentBiome;
    }

    applyBiomeToScene(sceneManager) {
        if (!this.currentBiome) return;

        // Update scene background
        sceneManager.scene.background = new THREE.Color(this.currentBiome.sky.color);

        // Update fog
        sceneManager.scene.fog = new THREE.FogExp2(
            this.currentBiome.sky.fog,
            this.currentBiome.sky.fogDensity
        );

        console.log(`🎨 Applied ${this.currentBiome.name} visuals to scene`);
    }

    updateLighting(sceneManager) {
        if (!this.currentBiome) return;

        // Remove old lights
        const lights = sceneManager.scene.children.filter(
            child => child instanceof THREE.Light
        );
        lights.forEach(light => sceneManager.scene.remove(light));

        // Add biome-specific ambient light
        const ambient = new THREE.AmbientLight(
            this.currentBiome.lighting.ambient,
            this.currentBiome.lighting.ambientIntensity
        );
        sceneManager.scene.add(ambient);

        // Add biome-specific directional light (sun)
        const sun = new THREE.DirectionalLight(
            this.currentBiome.lighting.sun,
            this.currentBiome.lighting.sunIntensity
        );
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -150;
        sun.shadow.camera.right = 150;
        sun.shadow.camera.top = 150;
        sun.shadow.camera.bottom = -150;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sceneManager.scene.add(sun);

        // Add hemisphere light for better atmosphere
        const hemi = new THREE.HemisphereLight(
            this.currentBiome.sky.color,
            this.currentBiome.ground.base,
            0.4
        );
        sceneManager.scene.add(hemi);

        console.log(`💡 Applied ${this.currentBiome.name} lighting`);
    }
}
