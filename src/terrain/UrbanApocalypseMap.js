import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * UrbanApocalypseMap - AAA quality destroyed city environment
 * Features:
 * - HDR environment lighting from Polyhaven
 * - PBR materials for all buildings
 * - Destroyed/ruined city aesthetics
 * - Volumetric fog
 * - Dynamic shadows
 */
export class UrbanApocalypseMap {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Map configuration
        this.mapSize = 300; // Larger map for epic battles
        this.blockSize = 30;
        this.buildingHeight = { min: 10, max: 40 };

        // Environment assets
        this.pmremGenerator = null;
        this.envMap = null;

        // Building materials cache
        this.materials = {};

        console.log('🏙️ Initializing AAA Urban Apocalypse Map...');
    }

    async init() {
        // Setup HDR environment lighting (from Polyhaven)
        await this.setupHDREnvironment();

        // Create ground with PBR materials
        this.createGround();

        // Generate destroyed city blocks
        this.generateCityBlocks();

        // Add atmospheric effects
        this.addAtmosphericEffects();

        // Add ambient particles (dust, smoke, embers)
        this.addAmbientParticles();

        console.log('✅ AAA Urban Apocalypse Map loaded!');
    }

    /**
     * Setup HDR environment from Polyhaven for realistic lighting
     */
    async setupHDREnvironment() {
        // Try to load HDR, but use fallback if it fails
        try {
            this.pmremGenerator = new THREE.PMREMGenerator(this.renderer.renderer);
            this.pmremGenerator.compileEquirectangularShader();

            const rgbeLoader = new RGBELoader();

            // Check if HDR file exists before attempting to load
            const hdrPath = '/assets/hdri/urban_street.hdr';

            return new Promise((resolve) => {
                rgbeLoader.load(
                    hdrPath,
                    (texture) => {
                        try {
                            if (texture && texture.image) {
                                const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
                                this.envMap = envMap;

                                this.scene.environment = envMap;
                                this.scene.background = envMap;

                                texture.dispose();
                                this.pmremGenerator.dispose();

                                console.log('✅ HDR environment loaded');
                            } else {
                                console.warn('⚠️ HDR texture invalid, using fallback');
                                this.createFallbackSky();
                            }
                        } catch (err) {
                            console.warn('⚠️ Error processing HDR texture, using fallback', err);
                            this.createFallbackSky();
                        }
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn('⚠️ HDR environment not found, using fallback sky');
                        this.createFallbackSky();
                        resolve();
                    }
                );
            });
        } catch (error) {
            console.warn('⚠️ HDR loading failed, using fallback sky', error);
            this.createFallbackSky();
        }
    }

    /**
     * Fallback procedural sky if HDR not available
     */
    createFallbackSky() {
        // Create gradient sky
        const skyGeometry = new THREE.SphereGeometry(1000, 32, 15);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x2b1d0e) }, // Dark apocalyptic brown
                bottomColor: { value: new THREE.Color(0x5a3a2a) }, // Smoky brown
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Add ambient light for fallback
        const ambientLight = new THREE.AmbientLight(0x8b7355, 0.4);
        this.scene.add(ambientLight);
    }

    /**
     * Create ground with PBR materials
     */
    createGround() {
        // Concrete/asphalt ground with damage
        const groundGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize, 50, 50);

        // Add noise to ground for destroyed effect
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);

            // Crater-like deformations
            const distFromCenter = Math.sqrt(x * x + y * y);
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
            const crater = Math.max(0, 1 - distFromCenter / 50) * -2;

            positions.setZ(i, noise + crater * Math.random());
        }

        groundGeometry.computeVertexNormals();

        // PBR Material for ground
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.9,
            metalness: 0.1,
            envMapIntensity: 0.5
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        console.log('🌍 AAA ground created with PBR materials');
    }

    /**
     * Generate destroyed city blocks
     */
    generateCityBlocks() {
        const blocks = 15; // Number of city blocks
        const spacing = 35;

        for (let i = 0; i < blocks; i++) {
            const x = (Math.random() - 0.5) * this.mapSize * 0.8;
            const z = (Math.random() - 0.5) * this.mapSize * 0.8;

            const blockType = Math.random();

            if (blockType < 0.6) {
                this.createDestroyedBuilding(x, z);
            } else if (blockType < 0.8) {
                this.createRubblePile(x, z);
            } else {
                this.createBurningCar(x, z);
            }
        }
    }

    /**
     * Create a destroyed building with PBR materials
     */
    createDestroyedBuilding(x, z) {
        const height = THREE.MathUtils.randFloat(this.buildingHeight.min, this.buildingHeight.max);
        const width = THREE.MathUtils.randFloat(8, 15);
        const depth = THREE.MathUtils.randFloat(8, 15);

        // Building is partially destroyed
        const destroyPercent = Math.random() * 0.5 + 0.3; // 30-80% destroyed

        const building = new THREE.Group();

        // Main structure (remaining part)
        const geometry = new THREE.BoxGeometry(width, height * (1 - destroyPercent), depth);

        // PBR Material - damaged concrete
        const material = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
            roughness: 0.95,
            metalness: 0.05,
            envMapIntensity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height * (1 - destroyPercent) / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        building.add(mesh);

        // Add destroyed top section (rubble)
        if (destroyPercent > 0.4) {
            const rubbleCount = 5;
            for (let i = 0; i < rubbleCount; i++) {
                const rubbleSize = Math.random() * 3 + 1;
                const rubbleGeo = new THREE.BoxGeometry(rubbleSize, rubbleSize, rubbleSize);
                const rubbleMat = material.clone();
                const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);

                rubble.position.set(
                    (Math.random() - 0.5) * width,
                    height * (1 - destroyPercent) + Math.random() * 3,
                    (Math.random() - 0.5) * depth
                );

                rubble.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                rubble.castShadow = true;
                building.add(rubble);
            }
        }

        // Add broken windows (dark holes)
        const windowCount = Math.floor(height / 4);
        for (let i = 0; i < windowCount; i++) {
            const windowGeo = new THREE.PlaneGeometry(2, 2);
            const windowMat = new THREE.MeshStandardMaterial({
                color: 0x000000,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x1a1a1a,
                emissiveIntensity: 0.3
            });

            const window1 = new THREE.Mesh(windowGeo, windowMat);
            window1.position.set(width / 2 + 0.01, i * 4 + 2, 0);
            window1.rotation.y = Math.PI / 2;
            building.add(window1);
        }

        building.position.set(x, 0, z);
        this.scene.add(building);
    }

    /**
     * Create rubble pile
     */
    createRubblePile(x, z) {
        const pile = new THREE.Group();
        const rubbleCount = Math.floor(Math.random() * 10 + 5);

        const rubbleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 1.0,
            metalness: 0.0
        });

        for (let i = 0; i < rubbleCount; i++) {
            const size = Math.random() * 2 + 0.5;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const mesh = new THREE.Mesh(geometry, rubbleMaterial);

            mesh.position.set(
                (Math.random() - 0.5) * 5,
                size / 2 + Math.random() * 2,
                (Math.random() - 0.5) * 5
            );

            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            mesh.castShadow = true;
            mesh.receiveShadow = true;
            pile.add(mesh);
        }

        pile.position.set(x, 0, z);
        this.scene.add(pile);
    }

    /**
     * Create burning car wreck
     */
    createBurningCar(x, z) {
        const car = new THREE.Group();

        // Car body
        const bodyGeo = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.9,
            emissive: 0x000000
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        car.add(body);

        // Damaged/burning effect (emissive glow)
        if (Math.random() > 0.7) {
            const fireGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const fireMat = new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.7
            });
            const fire = new THREE.Mesh(fireGeo, fireMat);
            fire.position.set(0, 1.5, 0);
            car.add(fire);
        }

        car.position.set(x, 0, z);
        car.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(car);
    }

    /**
     * Add atmospheric fog
     */
    addAtmosphericEffects() {
        // Volumetric fog for depth
        this.scene.fog = new THREE.FogExp2(0x4a3a2a, 0.008);

        console.log('🌫️ Atmospheric fog added');
    }

    /**
     * Add ambient particles (dust, embers)
     */
    addAmbientParticles() {
        // Create floating dust/ash particles
        const particleCount = 500;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.mapSize;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapSize;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMat = new THREE.PointsMaterial({
            color: 0x8a8a8a,
            size: 0.2,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        this.scene.add(particles);

        console.log('✨ Ambient particles added');
    }

    /**
     * Update method for dynamic effects
     */
    update(deltaTime) {
        // Animate particles, fire, etc.
    }
}
