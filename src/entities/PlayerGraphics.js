import * as THREE from 'three';

/**
 * Elite Soldier Graphics - AAA Quality Player Model
 * Stunning visuals with advanced PBR materials, detailed armor, and dynamic lighting
 */
export function createEliteSoldierMesh(scene, position) {
    const group = new THREE.Group();

    // === TORSO - Advanced Combat Armor ===
    const torsoGeo = new THREE.CapsuleGeometry(0.45, 1.4, 24, 48);
    const torsoMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a1a,
        roughness: 0.6,
        metalness: 0.4
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.6;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Hexagonal armor plates on chest
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0x5a6a6a,
        roughness: 0.25,
        metalness: 0.95
    });

    const plateSize = 0.16;
    for (let row = 0; row < 3; row++) {
        for (let col = -1; col <= 1; col++) {
            const plate = new THREE.Mesh(
                new THREE.CylinderGeometry(plateSize, plateSize, 0.06, 6),
                plateMat
            );
            plate.rotation.x = Math.PI / 2;
            plate.position.set(
                col * plateSize * 1.9,
                1.5 + row * plateSize * 1.6,
                0.48
            );
            plate.castShadow = true;
            group.add(plate);
        }
    }

    // Tactical belt with pouches
    const beltGeo = new THREE.BoxGeometry(1.0, 0.15, 0.8);
    const beltMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.9,
        metalness: 0.2
    });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.8, 0);
    belt.castShadow = true;
    group.add(belt);

    // === HEAD - Advanced Combat Helmet ===
    const headGeo = new THREE.SphereGeometry(0.52, 32, 32);
    const helmetMat = new THREE.MeshStandardMaterial({
        color: 0x2a3a3a,
        roughness: 0.22,
        metalness: 0.88
    });
    const head = new THREE.Mesh(headGeo, helmetMat);
    head.position.y = 2.55;
    head.scale.set(1, 1.18, 1);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // Glowing HUD visor
    const visorGeo = new THREE.BoxGeometry(0.68, 0.2, 0.14);
    const visorMat = new THREE.MeshStandardMaterial({
        color: 0x00eeff,
        emissive: 0x00eeff,
        emissiveIntensity: 1.5,
        metalness: 1.0,
        roughness: 0.03
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.55, 0.5);
    group.add(visor);

    // Helmet antenna
    const antennaMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.4,
        metalness: 0.9
    });
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.4),
        antennaMat
    );
    antenna.position.set(0.3, 2.9, -0.1);
    antenna.rotation.z = -0.3;
    group.add(antenna);

    // Helmet lights (tactical illumination)
    const helmetLight = new THREE.PointLight(0x00eeff, 2.0, 5);
    helmetLight.position.set(0, 2.55, 0.65);
    group.add(helmetLight);

    // === ARMS - Powered Exoskeleton Arms ===
    const armMat = new THREE.MeshStandardMaterial({
        color: 0x2a3a2a,
        roughness: 0.65,
        metalness: 0.45
    });

    // LEFT ARM
    const leftArmUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.19, 0.75, 16, 32),
        armMat
    );
    leftArmUpper.position.set(-0.78, 1.85, 0);
    leftArmUpper.rotation.z = 0.42;
    leftArmUpper.castShadow = true;
    group.add(leftArmUpper);

    const leftArmLower = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.17, 0.75, 16, 32),
        armMat
    );
    leftArmLower.position.set(-0.98, 1.1, 0.12);
    leftArmLower.rotation.z = 0.32;
    leftArmLower.castShadow = true;
    group.add(leftArmLower);

    // Shoulder armor plate
    const shoulderGuard = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 16, 16),
        plateMat
    );
    shoulderGuard.position.set(-0.68, 2.15, 0);
    shoulderGuard.scale.set(1, 0.65, 1);
    shoulderGuard.castShadow = true;
    group.add(shoulderGuard);

    // RIGHT ARM
    const rightArmUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.19, 0.75, 16, 32),
        armMat
    );
    rightArmUpper.position.set(0.78, 1.85, 0);
    rightArmUpper.rotation.z = -0.42;
    rightArmUpper.castShadow = true;
    group.add(rightArmUpper);

    const rightArmLower = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.17, 0.75, 16, 32),
        armMat
    );
    rightArmLower.position.set(0.98, 1.1, 0.12);
    rightArmLower.rotation.z = -0.32;
    rightArmLower.castShadow = true;
    group.add(rightArmLower);

    // === LEGS - Reinforced Combat Legs ===
    const legMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.7,
        metalness: 0.55
    });

    // LEFT LEG
    const leftThigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.85, 16, 32),
        legMat
    );
    leftThigh.position.set(-0.37, 1.05, 0);
    leftThigh.castShadow = true;
    group.add(leftThigh);

    const leftShin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.85, 16, 32),
        legMat
    );
    leftShin.position.set(-0.37, 0.42, 0);
    leftShin.castShadow = true;
    group.add(leftShin);

    // RIGHT LEG
    const rightThigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.85, 16, 32),
        legMat
    );
    rightThigh.position.set(0.37, 1.05, 0);
    rightThigh.castShadow = true;
    group.add(rightThigh);

    const rightShin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.20, 0.85, 16, 32),
        legMat
    );
    rightShin.position.set(0.37, 0.42, 0);
    rightShin.castShadow = true;
    group.add(rightShin);

    // Knee guards with glowing energy conduits
    const kneeGuardMat = new THREE.MeshStandardMaterial({
        color: 0x4a5a5a,
        emissive: 0x004455,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.9
    });

    const leftKnee = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 16),
        kneeGuardMat
    );
    leftKnee.position.set(-0.37, 0.73, 0.18);
    leftKnee.scale.set(1, 0.65, 0.85);
    leftKnee.castShadow = true;
    group.add(leftKnee);

    const rightKnee = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 16),
        kneeGuardMat
    );
    rightKnee.position.set(0.37, 0.73, 0.18);
    rightKnee.scale.set(1, 0.65, 0.85);
    rightKnee.castShadow = true;
    group.add(rightKnee);

    // === WEAPON - Advanced Energy Rifle ===
    const weaponGroup = new THREE.Group();

    // Main rifle body (carbon fiber composite)
    const rifleBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.24, 1.6),
        new THREE.MeshStandardMaterial({
            color: 0x080808,
            roughness: 0.2,
            metalness: 0.96
        })
    );
    rifleBody.castShadow = true;
    weaponGroup.add(rifleBody);

    // Upper rail system
    const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 1.4),
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.4,
            metalness: 0.9
        })
    );
    rail.position.set(0, 0.15, 0);
    weaponGroup.add(rail);

    // Energy core (pulsing plasma chamber)
    const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.5, 24),
        new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 4.0,
            metalness: 0.2,
            roughness: 0.02
        })
    );
    core.rotation.z = Math.PI / 2;
    core.position.set(0, 0, 0.45);
    weaponGroup.add(core);

    // Muzzle device with cooling fins
    const muzzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.10, 0.3, 12),
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.25,
            metalness: 0.92
        })
    );
    muzzle.rotation.z = Math.PI / 2;
    muzzle.position.set(0, 0, 0.95);
    weaponGroup.add(muzzle);

    // Cooling fins
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.2, 0.08),
            new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.4,
                metalness: 0.8
            })
        );
        fin.position.set(0, Math.cos(i * Math.PI / 2) * 0.13, 0.95);
        fin.position.y += Math.sin(i * Math.PI / 2) * 0.13;
        weaponGroup.add(fin);
    }

    // Weapon light (tactical flashlight)
    const weaponLight = new THREE.PointLight(0x00ffff, 3.0, 7);
    weaponLight.position.set(0, 0, 0.45);
    weaponGroup.add(weaponLight);

    // Scope with lens glare
    const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.25, 16),
        new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.2,
            metalness: 0.9
        })
    );
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.22, -0.1);
    weaponGroup.add(scope);

    // Scope lens (reflective glass)
    const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.07, 32),
        new THREE.MeshStandardMaterial({
            color: 0x88ddff,
            emissive: 0x004466,
            emissiveIntensity: 0.3,
            metalness: 1.0,
            roughness: 0.05
        })
    );
    lens.position.set(0, 0.22, -0.225);
    lens.rotation.y = Math.PI / 2;
    weaponGroup.add(lens);

    weaponGroup.position.set(0.65, 1.45, 0.65);
    weaponGroup.rotation.set(-0.12, Math.PI / 5.5, 0);
    group.add(weaponGroup);

    // === ATMOSPHERIC LIGHTING ===
    // Rim light (hero lighting)
    const rimLight = new THREE.PointLight(0x00ffff, 2.5, 4);
    rimLight.position.set(0, 2.2, -2);
    group.add(rimLight);

    // Back fill light (warm contrast)
    const backLight = new THREE.PointLight(0xff6600, 1.5, 6);
    backLight.position.set(0, 1.8, -2.5);
    group.add(backLight);

    // Ground reflection light
    const groundLight = new THREE.PointLight(0x4488aa, 0.8, 3);
    groundLight.position.set(0, 0.1, 0);
    group.add(groundLight);

    group.position.copy(position);
    scene.add(group);

    return {
        mesh: group,
        bodyMesh: torso,
        helmetMesh: head,
        weaponIndicator: weaponGroup,
        weaponCore: core
    };
}
