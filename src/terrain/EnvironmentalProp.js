import * as THREE from 'three';

export class EnvironmentalProp {
    constructor(scene, position, type = 0) {
        this.scene = scene;
        this.position = position || new THREE.Vector3(0, 0, 0);
        this.type = type % 5; // 0-4: concrete barrier, dumpster, streetlight, dead tree, sandbags
        this.mesh = null;

        this.createProp();
    }

    createProp() {
        const group = new THREE.Group();

        switch (this.type) {
            case 0:
                this.createConcreteBarrier(group);
                break;
            case 1:
                this.createDumpster(group);
                break;
            case 2:
                this.createStreetlight(group);
                break;
            case 3:
                this.createDeadTree(group);
                break;
            case 4:
                this.createSandbags(group);
                break;
        }

        // Ensure position exists before copying
        if (this.position && this.position.copy) {
            group.position.copy(this.position);
        } else {
            console.error('❌ EnvironmentalProp: Invalid position!', this.position);
            group.position.set(0, 0, 0);
        }

        this.mesh = group;
        this.scene.add(group);
    }

    createConcreteBarrier(group) {
        // Jersey barrier / K-rail concrete divider
        const concreteMat = new THREE.MeshStandardMaterial({
            color: 0x6a6a6a,
            roughness: 0.9,
            metalness: 0.05
        });

        // Main barrier body (trapezoid shape approximated with box)
        const barrierGeo = new THREE.BoxGeometry(3, 1, 0.6);
        const barrier = new THREE.Mesh(barrierGeo, concreteMat);
        barrier.position.y = 0.5;
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        group.add(barrier);

        // Top section (narrower)
        const topGeo = new THREE.BoxGeometry(2.8, 0.3, 0.4);
        const top = new THREE.Mesh(topGeo, concreteMat);
        top.position.y = 1.15;
        top.castShadow = true;
        group.add(top);

        // Random rotation for variety
        group.rotation.y = Math.random() * Math.PI * 2;

        // Add some cracks
        const crackMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
        for (let i = 0; i < 3; i++) {
            const points = [];
            const startX = (Math.random() - 0.5) * 2.5;
            points.push(new THREE.Vector3(startX, 0.3 + Math.random() * 0.5, 0.31));
            points.push(new THREE.Vector3(
                startX + (Math.random() - 0.5) * 1,
                points[0].y + Math.random() * 0.5,
                0.31
            ));

            const crackGeo = new THREE.BufferGeometry().setFromPoints(points);
            const crack = new THREE.Line(crackGeo, crackMat);
            group.add(crack);
        }
    }

    createDumpster(group) {
        // Metal dumpster (rusted, damaged)
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x3d5a3d,
            roughness: 0.8,
            metalness: 0.4,
            emissive: 0x0a1a0a,
            emissiveIntensity: 0.05
        });

        // Main container
        const bodyGeo = new THREE.BoxGeometry(2, 1.5, 1.2);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.position.y = 0.75;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Lid (partially open)
        const lidGeo = new THREE.BoxGeometry(2.2, 0.1, 1.3);
        const lid = new THREE.Mesh(lidGeo, metalMat);
        lid.position.set(0, 1.6, -0.4);
        lid.rotation.x = -0.8; // Opened
        lid.castShadow = true;
        group.add(lid);

        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });

        const wheelPositions = [
            { x: 0.8, z: 0.5 },
            { x: 0.8, z: -0.5 },
            { x: -0.8, z: 0.5 },
            { x: -0.8, z: -0.5 }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, 0.15, pos.z);
            wheel.rotation.x = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Rust/damage spots
        const rustMat = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        for (let i = 0; i < 8; i++) {
            const rustGeo = new THREE.CircleGeometry(0.1 + Math.random() * 0.1, 8);
            const rust = new THREE.Mesh(rustGeo, rustMat);
            rust.position.set(
                (Math.random() - 0.5) * 1.8,
                0.5 + Math.random() * 1,
                0.61
            );
            group.add(rust);
        }

        // Random orientation
        group.rotation.y = Math.random() * Math.PI * 2;
    }

    createStreetlight(group) {
        // Damaged/flickering streetlight
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.7,
            metalness: 0.6
        });

        // Pole (bent/damaged)
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.18, 6, 8);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3;
        pole.rotation.z = (Math.random() - 0.5) * 0.3; // Slight lean
        pole.castShadow = true;
        group.add(pole);

        // Lamp fixture
        const lampGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        const lamp = new THREE.Mesh(lampGeo, poleMat);
        lamp.position.set(
            Math.sin(pole.rotation.z) * 3,
            6,
            0
        );
        lamp.castShadow = true;
        group.add(lamp);

        // Light bulb (broken/dim)
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: Math.random() * 0.3, // Dim/broken
            transparent: true,
            opacity: 0.6
        });

        const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.copy(lamp.position);
        bulb.position.y -= 0.3;
        group.add(bulb);

        // Occasional working light
        if (Math.random() < 0.3) {
            const light = new THREE.PointLight(0xffaa00, 1, 8);
            light.position.copy(bulb.position);
            light.castShadow = true;
            group.add(light);
        }

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
        const base = new THREE.Mesh(baseGeo, poleMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);
    }

    createDeadTree(group) {
        // Burnt/dead tree
        const barkMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.95,
            metalness: 0.0,
            emissive: 0x0a0000,
            emissiveIntensity: 0.1
        });

        // Main trunk (twisted)
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 5, 8);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = 2.5;
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        trunk.castShadow = true;
        group.add(trunk);

        // Branches (bare, broken)
        const branchCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
            const height = 3 + Math.random() * 1.5;
            const angle = (i / branchCount) * Math.PI * 2;
            const length = 1 + Math.random() * 1.5;

            const branchGeo = new THREE.CylinderGeometry(0.08, 0.15, length, 6);
            const branch = new THREE.Mesh(branchGeo, barkMat);

            const baseX = Math.sin(trunk.rotation.z) * 2.5;
            branch.position.set(
                baseX + Math.cos(angle) * (length / 2),
                height,
                Math.sin(angle) * (length / 2)
            );

            branch.rotation.z = Math.cos(angle) * 0.8 + (Math.random() - 0.5) * 0.3;
            branch.rotation.y = angle;
            branch.castShadow = true;
            group.add(branch);

            // Some branches are broken off
            if (Math.random() < 0.4) {
                const brokenGeo = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 6);
                const broken = new THREE.Mesh(brokenGeo, barkMat);
                broken.position.copy(branch.position);
                broken.rotation.set(
                    Math.random() * 0.5,
                    angle + Math.PI,
                    Math.random() * 0.5
                );
                group.add(broken);
            }
        }

        // Burnt texture spots
        const charredMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        for (let i = 0; i < 5; i++) {
            const charGeo = new THREE.CircleGeometry(0.2 + Math.random() * 0.2, 8);
            const char = new THREE.Mesh(charGeo, charredMat);
            char.position.set(
                (Math.random() - 0.5) * 0.3,
                1 + Math.random() * 3,
                0.31
            );
            char.rotation.y = Math.random() * Math.PI * 2;
            group.add(char);
        }
    }

    createSandbags(group) {
        // Military sandbag fortification
        const sandbagMat = new THREE.MeshStandardMaterial({
            color: 0x5a4a3a,
            roughness: 0.95,
            metalness: 0.0
        });

        // Create a small wall of sandbags (2 layers)
        const positions = [
            // Bottom layer (4 bags)
            { x: -0.8, y: 0.25, z: 0 },
            { x: -0.3, y: 0.25, z: 0 },
            { x: 0.3, y: 0.25, z: 0 },
            { x: 0.8, y: 0.25, z: 0 },
            // Top layer (3 bags, offset)
            { x: -0.55, y: 0.75, z: 0 },
            { x: 0, y: 0.75, z: 0 },
            { x: 0.55, y: 0.75, z: 0 }
        ];

        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];

            // Each sandbag is slightly deformed
            const bagGeo = new THREE.BoxGeometry(
                0.5 + Math.random() * 0.1,
                0.4,
                0.6 + Math.random() * 0.1
            );
            const bag = new THREE.Mesh(bagGeo, sandbagMat.clone());

            bag.position.set(pos.x, pos.y, pos.z);
            bag.rotation.y = (Math.random() - 0.5) * 0.3;
            bag.rotation.z = (Math.random() - 0.5) * 0.1;

            // Slight color variation
            const colorVariation = 0.9 + Math.random() * 0.2;
            bag.material.color.multiplyScalar(colorVariation);

            bag.castShadow = true;
            bag.receiveShadow = true;
            group.add(bag);
        }

        // Add some loose sand spilling
        const sandMat = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
            roughness: 1.0
        });

        for (let i = 0; i < 3; i++) {
            const sandPileGeo = new THREE.ConeGeometry(0.2, 0.1, 8);
            const sandPile = new THREE.Mesh(sandPileGeo, sandMat);
            sandPile.position.set(
                (Math.random() - 0.5) * 1.5,
                0.05,
                (Math.random() - 0.5) * 0.5
            );
            sandPile.rotation.z = Math.PI;
            group.add(sandPile);
        }

        // Random orientation
        group.rotation.y = Math.random() * Math.PI * 2;
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
