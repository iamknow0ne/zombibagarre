import * as THREE from 'three';

export class ProceduralBuilding {
    constructor(scene, position, variation = 0) {
        this.scene = scene;
        this.position = position || new THREE.Vector3(0, 0, 0);
        this.variation = variation;
        this.mesh = null;

        this.createBuilding();
    }

    createBuilding() {
        const group = new THREE.Group();

        switch (this.variation) {
            case 0:
                this.createCollapsedBuilding(group);
                break;
            case 1:
                this.createBurntShell(group);
                break;
            case 2:
                this.createLeaningStructure(group);
                break;
        }

        // Ensure position exists before copying
        if (this.position && this.position.copy) {
            group.position.copy(this.position);
        } else {
            console.error('❌ ProceduralBuilding: Invalid position!', this.position);
            group.position.set(0, 0, 0);
        }

        this.mesh = group;
        this.scene.add(group);
    }

    createCollapsedBuilding(group) {
        // Main structure (partially destroyed)
        const mainHeight = 15 + Math.random() * 10;
        const width = 15 + Math.random() * 5;
        const depth = 12 + Math.random() * 5;

        // Concrete material
        const concreteMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9,
            metalness: 0.1
        });

        // Main wall (damaged)
        const wallGeo = new THREE.BoxGeometry(width, mainHeight, 1);
        const wall = new THREE.Mesh(wallGeo, concreteMat);
        wall.position.y = mainHeight / 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);

        // Add holes/damage
        this.addDamageHoles(wall, group);

        // Partial roof (collapsed section)
        const roofGeo = new THREE.BoxGeometry(width * 0.6, 0.5, depth);
        const roof = new THREE.Mesh(roofGeo, concreteMat);
        roof.position.set(-width * 0.2, mainHeight, 0);
        roof.rotation.z = -0.3; // Tilted
        roof.castShadow = true;
        group.add(roof);

        // Exposed rebar
        this.addRebar(group, mainHeight, width);

        // Rubble pile
        this.addRubble(group, width, depth);

        // Broken windows
        this.addBrokenWindows(group, mainHeight, width);
    }

    createBurntShell(group) {
        const height = 20 + Math.random() * 15;
        const width = 12;

        // Burnt/darkened material
        const burntMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.95,
            metalness: 0.05,
            emissive: 0x330000,
            emissiveIntensity: 0.1
        });

        // Four walls (hollow)
        const wallThickness = 0.5;

        // Front and back
        for (let i = 0; i < 2; i++) {
            const wallGeo = new THREE.BoxGeometry(width, height, wallThickness);
            const wall = new THREE.Mesh(wallGeo, burntMat);
            wall.position.set(0, height / 2, i === 0 ? width / 2 : -width / 2);
            wall.castShadow = true;
            group.add(wall);

            // Add burn marks
            this.addBurnMarks(wall);
        }

        // Sides
        for (let i = 0; i < 2; i++) {
            const wallGeo = new THREE.BoxGeometry(wallThickness, height, width);
            const wall = new THREE.Mesh(wallGeo, burntMat);
            wall.position.set(i === 0 ? width / 2 : -width / 2, height / 2, 0);
            wall.castShadow = true;
            group.add(wall);
        }

        // Debris inside
        this.addInteriorDebris(group, width, height);
    }

    createLeaningStructure(group) {
        const height = 18;
        const width = 10;

        const concreteMat = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.85,
            metalness: 0.15
        });

        // Main structure (leaning)
        const buildingGeo = new THREE.BoxGeometry(width, height, width);
        const building = new THREE.Mesh(buildingGeo, concreteMat);
        building.position.y = height / 2;
        building.rotation.z = 0.15; // Leaning angle
        building.position.x = Math.sin(0.15) * (height / 2); // Offset for lean
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        // Support debris at base
        const supportGeo = new THREE.ConeGeometry(width * 0.6, height * 0.3, 6);
        const support = new THREE.Mesh(supportGeo, concreteMat);
        support.position.y = 1;
        support.rotation.z = Math.PI;
        group.add(support);

        // Cracks
        this.addCracks(building, group);
    }

    addDamageHoles(wall, group) {
        // Create holes using CSG would be complex, so we'll add dark spots
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        for (let i = 0; i < 5; i++) {
            const holeGeo = new THREE.CircleGeometry(Math.random() * 2 + 1, 8);
            const hole = new THREE.Mesh(holeGeo, holeMat);
            hole.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 12 + 2,
                0.6
            );
            group.add(hole);
        }
    }

    addRebar(group, height, width) {
        const rebarMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.6
        });

        for (let i = 0; i < 3; i++) {
            const rebarGeo = new THREE.CylinderGeometry(0.1, 0.1, height * 0.4);
            const rebar = new THREE.Mesh(rebarGeo, rebarMat);
            rebar.position.set(
                (Math.random() - 0.5) * width,
                height * 0.8,
                Math.random() * 2
            );
            rebar.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(rebar);
        }
    }

    addRubble(group, width, depth) {
        const rubbleMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.9
        });

        for (let i = 0; i < 15; i++) {
            const size = Math.random() * 2 + 0.5;
            const rubbleGeo = new THREE.BoxGeometry(size, size * 0.7, size * 0.8);
            const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);
            rubble.position.set(
                (Math.random() - 0.5) * width,
                size / 2,
                (Math.random() - 0.5) * depth
            );
            rubble.rotation.set(
                Math.random() * 0.5,
                Math.random() * Math.PI,
                Math.random() * 0.5
            );
            rubble.castShadow = true;
            group.add(rubble);
        }
    }

    addBrokenWindows(group, height, width) {
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.1
        });

        const windowsPerFloor = 4;
        const floors = Math.floor(height / 3);

        for (let floor = 0; floor < floors; floor++) {
            for (let w = 0; w < windowsPerFloor; w++) {
                if (Math.random() > 0.3) { // 70% chance of window
                    const windowGeo = new THREE.PlaneGeometry(1.5, 2);
                    const window = new THREE.Mesh(windowGeo, glassMat);
                    window.position.set(
                        (w - windowsPerFloor / 2) * 3,
                        floor * 3 + 2,
                        0.6
                    );
                    group.add(window);
                }
            }
        }
    }

    addBurnMarks(wall) {
        // Add darker patches for burn marks via material modification
        wall.material = wall.material.clone();
        wall.material.emissive.setHex(0x331100);
        wall.material.emissiveIntensity = 0.2;
    }

    addInteriorDebris(group, width, height) {
        const debrisMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.9
        });

        for (let i = 0; i < 10; i++) {
            const debrisGeo = new THREE.BoxGeometry(
                Math.random() * 2,
                Math.random() * 1,
                Math.random() * 2
            );
            const debris = new THREE.Mesh(debrisGeo, debrisMat);
            debris.position.set(
                (Math.random() - 0.5) * width * 0.8,
                Math.random() * 2,
                (Math.random() - 0.5) * width * 0.8
            );
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            group.add(debris);
        }
    }

    addCracks(building, group) {
        // Visual cracks using dark lines
        const crackMat = new THREE.LineBasicMaterial({ color: 0x000000 });

        for (let i = 0; i < 5; i++) {
            const points = [];
            const startY = Math.random() * 15;
            points.push(new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                startY,
                5.1
            ));

            for (let j = 0; j < 3; j++) {
                points.push(new THREE.Vector3(
                    points[points.length - 1].x + (Math.random() - 0.5) * 3,
                    points[points.length - 1].y - Math.random() * 4,
                    5.1
                ));
            }

            const crackGeo = new THREE.BufferGeometry().setFromPoints(points);
            const crack = new THREE.Line(crackGeo, crackMat);
            group.add(crack);
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Dispose geometries and materials
            this.mesh.traverse((child) => {
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
    }
}
