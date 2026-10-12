import * as THREE from 'three';

export class ObstacleSystem {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.obstacleColliders = []; // For physics collision

        console.log('🏗️ Obstacle system initialized');
    }

    generateObstacles(mapSize = 240) {
        // Clear existing obstacles
        this.clearObstacles();

        // Spawn different obstacle types
        this.spawnCars(15, mapSize);
        this.spawnTrees(30, mapSize);
        this.spawnBuildings(8, mapSize);
        this.spawnDebris(25, mapSize);

        console.log(`🏗️ Generated ${this.obstacles.length} obstacles`);
    }

    spawnCars(count, mapSize) {
        const carTypes = [
            { width: 4, height: 2.5, length: 8, color: 0x3366cc }, // Sedan
            { width: 5, height: 3, length: 10, color: 0xff6600 }, // SUV
            { width: 3, height: 2, length: 6, color: 0xffff00 }, // Compact
            { width: 5, height: 3.5, length: 12, color: 0x999999 } // Van
        ];

        for (let i = 0; i < count; i++) {
            const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
            const car = this.createCar(carType);

            // Random position (avoid center spawn area)
            const angle = Math.random() * Math.PI * 2;
            const distance = mapSize * 0.3 + Math.random() * mapSize * 0.5;
            car.position.set(
                Math.cos(angle) * distance,
                carType.height / 2,
                Math.sin(angle) * distance
            );

            // Random rotation
            car.rotation.y = Math.random() * Math.PI * 2;

            this.scene.add(car);
            this.obstacles.push({ mesh: car, type: 'car' });
            this.obstacleColliders.push({
                position: car.position,
                radius: Math.max(carType.width, carType.length) * 0.6
            });
        }
    }

    createCar(type) {
        const group = new THREE.Group();

        // Car body
        const bodyGeometry = new THREE.BoxGeometry(type.width, type.height, type.length);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: type.color,
            roughness: 0.6,
            metalness: 0.4
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Windows (darker)
        const windowGeometry = new THREE.BoxGeometry(type.width * 0.9, type.height * 0.4, type.length * 0.5);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.2,
            metalness: 0.8
        });
        const windows = new THREE.Mesh(windowGeometry, windowMaterial);
        windows.position.y = type.height * 0.3;
        group.add(windows);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9
        });

        const wheelPositions = [
            [-type.width / 2 - 0.2, -type.height / 3, type.length / 3],
            [type.width / 2 + 0.2, -type.height / 3, type.length / 3],
            [-type.width / 2 - 0.2, -type.height / 3, -type.length / 3],
            [type.width / 2 + 0.2, -type.height / 3, -type.length / 3]
        ];

        for (const pos of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Headlights (emissive)
        const lightGeometry = new THREE.BoxGeometry(type.width * 0.3, 0.3, 0.2);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });

        const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
        leftLight.position.set(-type.width / 3, 0, type.length / 2 + 0.1);
        group.add(leftLight);

        const rightLight = new THREE.Mesh(lightGeometry, lightMaterial.clone());
        rightLight.position.set(type.width / 3, 0, type.length / 2 + 0.1);
        group.add(rightLight);

        return group;
    }

    spawnTrees(count, mapSize) {
        for (let i = 0; i < count; i++) {
            const tree = this.createTree();

            // Random position (avoid center spawn area)
            const angle = Math.random() * Math.PI * 2;
            const distance = mapSize * 0.4 + Math.random() * mapSize * 0.4;
            tree.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            this.scene.add(tree);
            this.obstacles.push({ mesh: tree, type: 'tree' });
            this.obstacleColliders.push({
                position: tree.position,
                radius: 1.5
            });
        }
    }

    createTree() {
        const group = new THREE.Group();

        // Trunk
        const trunkHeight = 6 + Math.random() * 4;
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a2511,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Foliage (spherical canopy)
        const foliageGeometry = new THREE.SphereGeometry(3 + Math.random() * 2, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a2d,
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = trunkHeight + 2;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        group.add(foliage);

        return group;
    }

    spawnBuildings(count, mapSize) {
        for (let i = 0; i < count; i++) {
            const building = this.createBuilding();

            // Random position (further from center)
            const angle = Math.random() * Math.PI * 2;
            const distance = mapSize * 0.6 + Math.random() * mapSize * 0.3;
            building.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            // Random rotation (90-degree increments)
            building.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;

            this.scene.add(building);
            this.obstacles.push({ mesh: building, type: 'building' });
            this.obstacleColliders.push({
                position: building.position,
                radius: 8
            });
        }
    }

    createBuilding() {
        const group = new THREE.Group();

        // Random building dimensions
        const width = 10 + Math.random() * 8;
        const height = 12 + Math.random() * 15;
        const depth = 10 + Math.random() * 8;

        // Main structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.7,
            metalness: 0.2
        });
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        buildingMesh.position.y = height / 2;
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        group.add(buildingMesh);

        // Windows (grid pattern)
        const windowSize = 1.5;
        const windowSpacing = 2.5;
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0xffff88 : 0x111111, // Some lit, some dark
            emissive: Math.random() > 0.5 ? 0xffff88 : 0x000000,
            emissiveIntensity: 0.3
        });

        for (let y = 2; y < height - 2; y += windowSpacing) {
            for (let x = -width / 2 + 1.5; x < width / 2 - 1; x += windowSpacing) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(windowSize, windowSize, 0.1),
                    windowMaterial.clone()
                );
                window.position.set(x, y, depth / 2 + 0.05);
                group.add(window);
            }
        }

        // Roof
        const roofGeometry = new THREE.BoxGeometry(width + 1, 1, depth + 1);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + 0.5;
        roof.castShadow = true;
        group.add(roof);

        return group;
    }

    spawnDebris(count, mapSize) {
        const debrisTypes = [
            { size: [2, 1, 3], color: 0x666666 }, // Concrete block
            { size: [1, 0.5, 1], color: 0x8B4513 }, // Wooden crate
            { size: [0.8, 0.8, 0.8], color: 0x999999 } // Metal box
        ];

        for (let i = 0; i < count; i++) {
            const debrisType = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];

            const geometry = new THREE.BoxGeometry(...debrisType.size);
            const material = new THREE.MeshStandardMaterial({
                color: debrisType.color,
                roughness: 0.9
            });

            const debris = new THREE.Mesh(geometry, material);

            // Random position
            const angle = Math.random() * Math.PI * 2;
            const distance = mapSize * 0.2 + Math.random() * mapSize * 0.6;
            debris.position.set(
                Math.cos(angle) * distance,
                debrisType.size[1] / 2,
                Math.sin(angle) * distance
            );

            // Random rotation
            debris.rotation.set(
                Math.random() * 0.3,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3
            );

            debris.castShadow = true;
            debris.receiveShadow = true;

            this.scene.add(debris);
            this.obstacles.push({ mesh: debris, type: 'debris' });
            this.obstacleColliders.push({
                position: debris.position,
                radius: Math.max(...debrisType.size) * 0.7
            });
        }
    }

    // Check collision with obstacles
    checkCollision(position, radius = 1) {
        for (const collider of this.obstacleColliders) {
            const dx = position.x - collider.position.x;
            const dz = position.z - collider.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < radius + collider.radius) {
                return true; // Collision detected
            }
        }
        return false;
    }

    clearObstacles() {
        for (const obstacle of this.obstacles) {
            this.scene.remove(obstacle.mesh);
            // Dispose geometry and materials
            obstacle.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.obstacles = [];
        this.obstacleColliders = [];
    }

    destroy() {
        this.clearObstacles();
    }
}
