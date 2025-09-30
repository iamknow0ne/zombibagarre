import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);

        this.setupLighting();
        this.setupEnvironment();
        this.setupFog();

        this.time = 0;
    }

    setupLighting() {
        // Ambient light for base visibility
        const ambient = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(ambient);

        // Main directional light (moonlight)
        this.dirLight = new THREE.DirectionalLight(0x6677ff, 0.8);
        this.dirLight.position.set(50, 100, 50);
        this.dirLight.castShadow = true;

        // Shadow configuration
        this.dirLight.shadow.camera.near = 1;
        this.dirLight.shadow.camera.far = 500;
        this.dirLight.shadow.camera.left = -100;
        this.dirLight.shadow.camera.right = 100;
        this.dirLight.shadow.camera.top = 100;
        this.dirLight.shadow.camera.bottom = -100;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.0001;

        this.scene.add(this.dirLight);

        // Hemisphere light for atmospheric effect
        const hemiLight = new THREE.HemisphereLight(0x8080ff, 0x404040, 0.5);
        this.scene.add(hemiLight);

        // Subtle fill light
        const fillLight = new THREE.DirectionalLight(0xff6644, 0.2);
        fillLight.position.set(-50, 20, -50);
        this.scene.add(fillLight);
    }

    setupEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.9,
            metalness: 0.1
        });

        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Add grid for better depth perception
        const gridHelper = new THREE.GridHelper(500, 50, 0x444466, 0x222233);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Add some atmosphere with particles
        this.createAtmosphericParticles();
    }

    createAtmosphericParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 400;
            positions[i + 1] = Math.random() * 100;
            positions[i + 2] = (Math.random() - 0.5) * 400;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        this.atmosphericParticles = new THREE.Points(geometry, material);
        this.scene.add(this.atmosphericParticles);
    }

    setupFog() {
        this.scene.fog = new THREE.FogExp2(0x0a0a15, 0.008);
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Gently rotate atmospheric particles
        if (this.atmosphericParticles) {
            this.atmosphericParticles.rotation.y += deltaTime * 0.01;
        }
    }

    addObject(object) {
        this.scene.add(object);
    }

    removeObject(object) {
        this.scene.remove(object);
    }
}