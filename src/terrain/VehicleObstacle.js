import * as THREE from 'three';

export class VehicleObstacle {
    constructor(scene, position, variation = 0) {
        this.scene = scene;
        this.position = position || new THREE.Vector3(0, 0, 0);
        this.variation = variation % 3; // 0 = car, 1 = bus, 2 = military
        this.mesh = null;

        this.createVehicle();
    }

    createVehicle() {
        const group = new THREE.Group();

        switch (this.variation) {
            case 0:
                this.createBurntCar(group);
                break;
            case 1:
                this.createDestroyedBus(group);
                break;
            case 2:
                this.createMilitaryVehicle(group);
                break;
        }

        // Ensure position exists before copying
        if (this.position && this.position.copy) {
            group.position.copy(this.position);
        } else {
            console.error('❌ VehicleObstacle: Invalid position!', this.position);
            group.position.set(0, 0, 0);
        }

        group.rotation.y = Math.random() * Math.PI * 2; // Random orientation

        this.mesh = group;
        this.scene.add(group);
    }

    createBurntCar(group) {
        // Burnt/rusty materials
        const carMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.95,
            metalness: 0.2,
            emissive: 0x330000,
            emissiveIntensity: 0.05
        });

        // Main car body (smaller sedan)
        const bodyGeo = new THREE.BoxGeometry(4, 1.2, 2);
        const body = new THREE.Mesh(bodyGeo, carMat);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Car roof (cabin)
        const roofGeo = new THREE.BoxGeometry(2.5, 1, 1.8);
        const roof = new THREE.Mesh(roofGeo, carMat);
        roof.position.set(-0.2, 1.7, 0);
        roof.castShadow = true;
        group.add(roof);

        // Hood
        const hoodGeo = new THREE.BoxGeometry(1.5, 0.3, 2);
        const hood = new THREE.Mesh(hoodGeo, carMat);
        hood.position.set(1.7, 1.0, 0);
        hood.rotation.x = 0.2; // Bent hood
        hood.castShadow = true;
        group.add(hood);

        // Destroyed wheels (flattened)
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 1.0
        });

        const wheelPositions = [
            { x: 1.3, z: 1.2 },
            { x: 1.3, z: -1.2 },
            { x: -1.3, z: 1.2 },
            { x: -1.3, z: -1.2 }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.4, 12);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, 0.2, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Broken windows (shattered glass effect)
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x112233,
            transparent: true,
            opacity: 0.2,
            roughness: 0.3
        });

        // Windshield (cracked)
        const windshieldGeo = new THREE.PlaneGeometry(1.8, 1);
        const windshield = new THREE.Mesh(windshieldGeo, glassMat);
        windshield.position.set(0.8, 1.7, 0);
        windshield.rotation.y = Math.PI / 2;
        windshield.rotation.x = -0.3;
        group.add(windshield);

        // Side windows
        for (let i = 0; i < 2; i++) {
            const windowGeo = new THREE.PlaneGeometry(2, 0.8);
            const window = new THREE.Mesh(windowGeo, glassMat);
            window.position.set(-0.2, 1.7, i === 0 ? 0.91 : -0.91);
            group.add(window);
        }

        // Damage details - exposed metal
        const damageMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.4
        });

        // Dent on side
        const dentGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const dent = new THREE.Mesh(dentGeo, damageMat);
        dent.position.set(-1, 0.8, 1);
        dent.scale.set(0.5, 0.8, 1.5);
        group.add(dent);

        // Random chance to flip the car
        if (Math.random() < 0.3) {
            group.rotation.z = Math.PI; // Upside down
            group.position.y += 1;
        }
    }

    createDestroyedBus(group) {
        // Burnt bus material
        const busMat = new THREE.MeshStandardMaterial({
            color: 0x2a1a0a,
            roughness: 0.95,
            metalness: 0.1,
            emissive: 0x221100,
            emissiveIntensity: 0.1
        });

        // Main bus body (larger, longer)
        const bodyGeo = new THREE.BoxGeometry(8, 2.5, 2.5);
        const body = new THREE.Mesh(bodyGeo, busMat);
        body.position.y = 1.5;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Bus roof
        const roofGeo = new THREE.BoxGeometry(7.5, 0.3, 2.3);
        const roof = new THREE.Mesh(roofGeo, busMat);
        roof.position.y = 2.9;
        roof.castShadow = true;
        group.add(roof);

        // Destroyed front
        const frontGeo = new THREE.BoxGeometry(0.5, 2, 2.3);
        const front = new THREE.Mesh(frontGeo, busMat);
        front.position.set(4.2, 1.3, 0);
        front.rotation.x = 0.3; // Crushed front
        front.castShadow = true;
        group.add(front);

        // Wheels (flattened/burnt)
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 1.0
        });

        const wheelPositions = [
            { x: 3, z: 1.3 },
            { x: 3, z: -1.3 },
            { x: -3, z: 1.3 },
            { x: -3, z: -1.3 }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.5, 12);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, 0.3, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Broken windows (multiple)
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.1,
            roughness: 0.9
        });

        // Side windows (bus has many)
        for (let i = 0; i < 5; i++) {
            const windowGeo = new THREE.PlaneGeometry(1.2, 1.2);
            const window1 = new THREE.Mesh(windowGeo, glassMat);
            window1.position.set(-2 + i * 2, 2, 1.26);
            group.add(window1);

            const window2 = new THREE.Mesh(windowGeo, glassMat);
            window2.position.set(-2 + i * 2, 2, -1.26);
            window2.rotation.y = Math.PI;
            group.add(window2);
        }

        // Burn damage - charred sections
        const charredMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 1.0,
            emissive: 0x110000,
            emissiveIntensity: 0.2
        });

        // Charred patches on sides
        for (let i = 0; i < 3; i++) {
            const charGeo = new THREE.CircleGeometry(0.8, 8);
            const char = new THREE.Mesh(charGeo, charredMat);
            char.position.set(
                (Math.random() - 0.5) * 6,
                1.5 + Math.random(),
                1.27
            );
            group.add(char);
        }

        // Tilt the bus slightly (collapsed suspension)
        group.rotation.z = (Math.random() - 0.5) * 0.2;
    }

    createMilitaryVehicle(group) {
        // Military olive/desert material
        const militaryMat = new THREE.MeshStandardMaterial({
            color: 0x3d3d2a,
            roughness: 0.85,
            metalness: 0.3
        });

        // Larger armored body
        const bodyGeo = new THREE.BoxGeometry(5, 2, 3);
        const body = new THREE.Mesh(bodyGeo, militaryMat);
        body.position.y = 1.2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Cabin/driver compartment
        const cabinGeo = new THREE.BoxGeometry(2.5, 1.5, 2.8);
        const cabin = new THREE.Mesh(cabinGeo, militaryMat);
        cabin.position.set(1, 2.9, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // Armored front
        const frontGeo = new THREE.BoxGeometry(0.8, 1.5, 2.8);
        const front = new THREE.Mesh(frontGeo, militaryMat);
        front.position.set(2.8, 1.8, 0);
        front.rotation.x = 0.15;
        front.castShadow = true;
        group.add(front);

        // Large military wheels
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.2
        });

        const wheelPositions = [
            { x: 2, z: 1.6 },
            { x: 2, z: -1.6 },
            { x: -1.5, z: 1.6 },
            { x: -1.5, z: -1.6 }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.6, 16);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, 0.4, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);

            // Wheel tread detail
            const treadGeo = new THREE.TorusGeometry(0.65, 0.1, 8, 16);
            const tread = new THREE.Mesh(treadGeo, wheelMat);
            tread.position.set(pos.x, 0.4, pos.z);
            tread.rotation.y = Math.PI / 2;
            group.add(tread);
        }

        // Armored windows (small slits)
        const armorGlassMat = new THREE.MeshStandardMaterial({
            color: 0x002233,
            transparent: true,
            opacity: 0.4,
            roughness: 0.2,
            metalness: 0.5
        });

        // Front windshield slit
        const windshieldGeo = new THREE.PlaneGeometry(2, 0.3);
        const windshield = new THREE.Mesh(windshieldGeo, armorGlassMat);
        windshield.position.set(2.2, 2.5, 0);
        windshield.rotation.y = Math.PI / 2;
        windshield.rotation.x = -0.2;
        group.add(windshield);

        // Side vision slits
        for (let i = 0; i < 2; i++) {
            const slitGeo = new THREE.PlaneGeometry(0.8, 0.2);
            const slit = new THREE.Mesh(slitGeo, armorGlassMat);
            slit.position.set(1, 3, i === 0 ? 1.41 : -1.41);
            group.add(slit);
        }

        // Battle damage - bullet holes
        const damageMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        for (let i = 0; i < 12; i++) {
            const holeGeo = new THREE.CircleGeometry(0.08, 6);
            const hole = new THREE.Mesh(holeGeo, damageMat);
            hole.position.set(
                (Math.random() - 0.5) * 4,
                1 + Math.random() * 1.5,
                1.51
            );
            group.add(hole);
        }

        // Mounted turret (destroyed/bent)
        const turretMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.8,
            metalness: 0.5
        });

        const turretGeo = new THREE.CylinderGeometry(0.4, 0.5, 1, 8);
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.set(-1, 3.5, 0);
        turret.rotation.z = 0.5; // Damaged/bent
        turret.castShadow = true;
        group.add(turret);

        // Gun barrel (bent/broken)
        const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
        const barrel = new THREE.Mesh(barrelGeo, turretMat);
        barrel.position.set(-0.5, 4, 0);
        barrel.rotation.z = Math.PI / 2 - 0.3; // Drooping barrel
        barrel.castShadow = true;
        group.add(barrel);
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
