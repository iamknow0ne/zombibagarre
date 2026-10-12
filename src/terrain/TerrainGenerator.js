import * as THREE from 'three';
import { ProceduralBuilding } from './ProceduralBuilding.js';
import { VehicleObstacle } from './VehicleObstacle.js';
import { EnvironmentalProp } from './EnvironmentalProp.js';

export class TerrainGenerator {
    constructor(scene, size = 500) {
        this.scene = scene;
        this.size = size;
        this.cellSize = 25; // Grid cell size
        this.grid = [];
        this.obstacles = [];

        console.log('🏙️ Terrain generator initialized');

        this.generateTerrain();
    }

    generateTerrain() {
        console.log('🏗️ Generating procedural destroyed city terrain...');
        this.createDestroyedGround();
        this.generateGrid();
        this.placeBuildings();
        this.placeVehicles();
        this.placeDebris();
        this.addAtmosphericDetails();
        console.log('✅ Terrain generation complete!');
    }

    createDestroyedGround() {
        // Main ground with cracked asphalt texture
        const groundGeometry = new THREE.PlaneGeometry(this.size, this.size, 100, 100);

        // Add height variation (cracks, potholes)
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);

            // Create cracks and potholes using noise
            const crack = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
            const pothole = Math.random() < 0.02 ? -Math.random() * 2 : 0;

            positions.setZ(i, crack + pothole);
        }

        groundGeometry.computeVertexNormals();

        // Advanced material with multiple textures (lighter for visibility)
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a, // Lighter grey for better visibility
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        });

        // Add detail to material
        this.createAsphaltTexture(groundMaterial);

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        console.log('🌍 Ground mesh created:', {
            size: this.size,
            position: ground.position,
            color: groundMaterial.color,
            visible: ground.visible
        });

        // Add scattered debris on ground
        this.addGroundDebris();
    }

    createAsphaltTexture(material) {
        // Create procedural asphalt texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base asphalt
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 512, 512);

        // Add noise/grain
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const brightness = Math.random() * 40 - 20;
            ctx.fillStyle = `rgb(${42 + brightness}, ${42 + brightness}, ${42 + brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // Add cracks
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            let x = Math.random() * 512;
            let y = Math.random() * 512;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                x += Math.random() * 50 - 25;
                y += Math.random() * 50 - 25;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Add dirt patches
        ctx.fillStyle = 'rgba(61, 47, 31, 0.3)';
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);

        material.map = texture;
        material.needsUpdate = true;
    }

    addGroundDebris() {
        // Scattered small debris (glass, rubble, papers)
        const debrisCount = 500;
        const debrisGeometry = new THREE.PlaneGeometry(0.5, 0.5);

        for (let i = 0; i < debrisCount; i++) {
            const x = (Math.random() - 0.5) * this.size * 0.9;
            const z = (Math.random() - 0.5) * this.size * 0.9;

            const material = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.5 ? 0x3d2f1f : 0x1a1a1a,
                roughness: Math.random(),
                metalness: Math.random() * 0.3,
                transparent: true,
                opacity: 0.7
            });

            const debris = new THREE.Mesh(debrisGeometry, material);
            debris.position.set(x, 0.05, z);
            debris.rotation.x = -Math.PI / 2;
            debris.rotation.z = Math.random() * Math.PI * 2;
            debris.scale.set(
                Math.random() + 0.5,
                Math.random() + 0.5,
                1
            );

            this.scene.add(debris);
        }
    }

    generateGrid() {
        const gridSize = Math.floor(this.size / this.cellSize);
        for (let x = 0; x < gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < gridSize; z++) {
                this.grid[x][z] = {
                    occupied: false,
                    type: null
                };
            }
        }
    }

    placeBuildings() {
        const buildingCount = 15; // Number of destroyed buildings

        for (let i = 0; i < buildingCount; i++) {
            const pos = this.findEmptySpot(3); // 3x3 cells
            if (pos) {
                const building = new ProceduralBuilding(
                    this.scene,
                    new THREE.Vector3(pos.x, 0, pos.z),
                    Math.floor(Math.random() * 3) // Building variation
                );

                this.obstacles.push(building);
                this.markOccupied(pos.gridX, pos.gridZ, 3);
            }
        }
    }

    placeVehicles() {
        const vehicleCount = 25;

        for (let i = 0; i < vehicleCount; i++) {
            const pos = this.findEmptySpot(1);
            if (pos) {
                const vehicle = new VehicleObstacle(
                    this.scene,
                    new THREE.Vector3(pos.x, 0, pos.z),
                    Math.floor(Math.random() * 3) // Vehicle type
                );

                this.obstacles.push(vehicle);
                this.markOccupied(pos.gridX, pos.gridZ, 1);
            }
        }
    }

    placeDebris() {
        const debrisCount = 40;

        for (let i = 0; i < debrisCount; i++) {
            const pos = this.findEmptySpot(1);
            if (pos) {
                const prop = new EnvironmentalProp(
                    this.scene,
                    new THREE.Vector3(pos.x, 0, pos.z),
                    Math.floor(Math.random() * 5) // Prop type
                );

                this.obstacles.push(prop);
                this.markOccupied(pos.gridX, pos.gridZ, 1);
            }
        }
    }

    addAtmosphericDetails() {
        // Distant smoke columns
        this.addSmokeColumns(5);

        // Flickering fires
        this.addFires(8);

        // Emergency lights
        this.addEmergencyLights(6);
    }

    addSmokeColumns(count) {
        // These will be added via particle system in ParticleManager
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = this.size * 0.4;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            // Store position for particle spawning
            if (!this.smokePositions) this.smokePositions = [];
            this.smokePositions.push(new THREE.Vector3(x, 0, z));
        }
    }

    addFires(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.findEmptySpot(1);
            if (pos) {
                // Fire light
                const fireLight = new THREE.PointLight(0xff4500, 3, 15);
                fireLight.position.set(pos.x, 1, pos.z);
                fireLight.castShadow = true;
                this.scene.add(fireLight);

                // Flickering animation (stored for update)
                fireLight.userData.baseIntensity = 3;
                fireLight.userData.isFlicker = true;

                if (!this.fireLights) this.fireLights = [];
                this.fireLights.push(fireLight);
            }
        }
    }

    addEmergencyLights(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.findEmptySpot(1);
            if (pos) {
                // Emergency light (red, blinking)
                const emergencyLight = new THREE.PointLight(0xff0000, 2, 10);
                emergencyLight.position.set(pos.x, 3, pos.z);
                this.scene.add(emergencyLight);

                emergencyLight.userData.isEmergency = true;
                emergencyLight.userData.blinkTimer = Math.random() * 2;

                if (!this.emergencyLights) this.emergencyLights = [];
                this.emergencyLights.push(emergencyLight);
            }
        }
    }

    findEmptySpot(size) {
        const gridSize = Math.floor(this.size / this.cellSize);
        const attempts = 100;

        for (let i = 0; i < attempts; i++) {
            const gridX = Math.floor(Math.random() * (gridSize - size));
            const gridZ = Math.floor(Math.random() * (gridSize - size));

            // Check if area is empty
            let isEmpty = true;
            for (let dx = 0; dx < size; dx++) {
                for (let dz = 0; dz < size; dz++) {
                    if (this.grid[gridX + dx][gridZ + dz].occupied) {
                        isEmpty = false;
                        break;
                    }
                }
                if (!isEmpty) break;
            }

            if (isEmpty) {
                const x = (gridX - gridSize / 2) * this.cellSize + this.cellSize / 2;
                const z = (gridZ - gridSize / 2) * this.cellSize + this.cellSize / 2;
                return { x, z, gridX, gridZ };
            }
        }

        return null;
    }

    markOccupied(gridX, gridZ, size) {
        for (let dx = 0; dx < size; dx++) {
            for (let dz = 0; dz < size; dz++) {
                if (this.grid[gridX + dx] && this.grid[gridX + dx][gridZ + dz]) {
                    this.grid[gridX + dx][gridZ + dz].occupied = true;
                }
            }
        }
    }

    update(deltaTime) {
        // Animate fire lights (flickering)
        if (this.fireLights) {
            for (const light of this.fireLights) {
                const flicker = Math.sin(Date.now() * 0.01) * 0.5 + Math.random() * 0.5;
                light.intensity = light.userData.baseIntensity + flicker;
            }
        }

        // Animate emergency lights (blinking)
        if (this.emergencyLights) {
            for (const light of this.emergencyLights) {
                light.userData.blinkTimer += deltaTime;
                if (light.userData.blinkTimer > 1) {
                    light.userData.blinkTimer = 0;
                    light.visible = !light.visible;
                }
            }
        }
    }

    getObstacles() {
        return this.obstacles;
    }

    getSmokePositions() {
        return this.smokePositions || [];
    }
}
