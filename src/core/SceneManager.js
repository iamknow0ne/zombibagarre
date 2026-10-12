import * as THREE from 'three';
import { BiomeSystem } from '../terrain/BiomeSystem.js';
import { ProceduralTerrain } from '../terrain/ProceduralTerrain.js';
import { ObstacleSystem } from '../systems/ObstacleSystem.js';
import { UrbanApocalypseMap } from '../terrain/UrbanApocalypseMap.js';

export class SceneManager {
    constructor(options = {}) {
        this.scene = new THREE.Scene();

        // AAA Mode: Urban Apocalypse with HDR lighting
        this.useAAAGraphics = options.useAAAGraphics ?? true; // Enable AAA by default
        this.renderer = options.renderer;

        if (this.useAAAGraphics) {
            console.log('🌟 AAA GRAPHICS MODE ENABLED');
            this.setupAAAEnvironment();
        } else {
            // Initialize biome system (legacy)
            this.biomeSystem = new BiomeSystem(this.scene);
            this.biomeSystem.selectRandomBiome();

            // Apply biome visuals to scene
            this.biomeSystem.applyBiomeToScene(this);

            console.log('🎬 Scene initialized with biome:', this.biomeSystem.getCurrentBiome().name);
            console.log('🔍 Scene background:', this.scene.background);
            console.log('🔍 Scene fog:', this.scene.fog);

            this.setupLighting();
            this.setupEnvironment();
        }

        this.time = 0;
    }

    async setupAAAEnvironment() {
        console.log('🏗️ Setting up AAA Urban Apocalypse environment...');

        // Create urban apocalypse map with HDR lighting
        this.urbanMap = new UrbanApocalypseMap(this.scene, this.renderer);
        await this.urbanMap.init();

        // === AAA THREE-POINT LIGHTING SYSTEM ===

        // Key Light - Main directional light (sun) with optimized shadows
        const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
        keyLight.position.set(50, 100, 50);
        keyLight.castShadow = true;

        // Low shadow settings for maximum performance
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 500;
        keyLight.shadow.camera.left = -150;
        keyLight.shadow.camera.right = 150;
        keyLight.shadow.camera.top = 150;
        keyLight.shadow.camera.bottom = -150;
        keyLight.shadow.bias = -0.0001;
        keyLight.shadow.normalBias = 0.02;

        this.scene.add(keyLight);

        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x7a6a5a, 1.0);
        this.scene.add(ambientLight);

        // Hemisphere light for natural lighting (cheaper than multiple directional lights)
        const hemisphereLight = new THREE.HemisphereLight(
            0x88aaff, // Sky color
            0x554433, // Ground color
            0.5
        );
        this.scene.add(hemisphereLight);

        console.log('✅ AAA environment loaded');
    }

    setupLighting() {
        // Apply biome-specific lighting (legacy mode)
        this.biomeSystem.updateLighting(this);
    }

    setupEnvironment() {
        // Create procedural terrain with biome-specific visuals
        this.terrain = new ProceduralTerrain(this.scene, this.biomeSystem, 400);
        this.terrain.generate();

        // Create obstacle system (cars, trees, buildings)
        this.obstacleSystem = new ObstacleSystem(this.scene);
        this.obstacleSystem.generateObstacles(240); // Map size

        // Add some atmosphere with particles
        this.createAtmosphericParticles();

        console.log('🌍 Environment setup complete');
    }

    createAtmosphericParticles() {
        // Dust/ash particles for apocalyptic atmosphere
        const particleCount = 300; // Optimized particle count
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Spread particles across the scene
            positions[i3] = (Math.random() - 0.5) * 500;
            positions[i3 + 1] = Math.random() * 120 + 5; // Keep above ground
            positions[i3 + 2] = (Math.random() - 0.5) * 500;

            // Random sizes for depth variation
            sizes[i] = Math.random() * 1.5 + 0.3;

            // Gentle drift velocities
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = (Math.random() - 0.8) * 0.3; // Slight downward drift
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.particleVelocities = velocities;

        const material = new THREE.PointsMaterial({
            color: 0xddccbb,
            size: 1.0,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true, // Particles get smaller with distance
            depthWrite: false
        });

        this.atmosphericParticles = new THREE.Points(geometry, material);
        this.scene.add(this.atmosphericParticles);
    }


    update(deltaTime) {
        this.time += deltaTime;

        // Animate atmospheric particles with drift
        if (this.atmosphericParticles && this.particleVelocities) {
            const positions = this.atmosphericParticles.geometry.attributes.position.array;
            const velocities = this.particleVelocities;

            for (let i = 0; i < positions.length; i += 3) {
                // Apply velocity
                positions[i] += velocities[i] * deltaTime;
                positions[i + 1] += velocities[i + 1] * deltaTime;
                positions[i + 2] += velocities[i + 2] * deltaTime;

                // Wrap particles that drift too far
                if (positions[i] > 250) positions[i] = -250;
                if (positions[i] < -250) positions[i] = 250;
                if (positions[i + 1] < 5) positions[i + 1] = 120; // Reset to top when they fall
                if (positions[i + 1] > 125) positions[i + 1] = 5;
                if (positions[i + 2] > 250) positions[i + 2] = -250;
                if (positions[i + 2] < -250) positions[i + 2] = 250;
            }

            this.atmosphericParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Update terrain effects (fires, emergency lights)
        if (this.terrain) {
            this.terrain.update(deltaTime);
        }
    }

    addObject(object) {
        this.scene.add(object);
    }

    removeObject(object) {
        this.scene.remove(object);
    }
}