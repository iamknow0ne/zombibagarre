import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 5000;
        this.bloodSplatters = []; // Ground blood decals
        this.fleshChunks = []; // 3D flesh pieces
        this.severedLimbs = []; // Realistic dismembered body parts
        this.corpses = []; // Dead zombie corpses

        console.log('✨ Particle manager initialized');
    }

    spawnBloodExplosion(position, count = 50) {
        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8 + 2,
                    (Math.random() - 0.5) * 10
                ),
                color: new THREE.Color(0x8B0000),
                size: Math.random() * 0.5 + 0.2,
                lifetime: 1.0,
                age: 0,
                gravity: 9.8
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    // ENHANCED GORE SYSTEM ⭐
    spawnGoreExplosion(position, intensity = 1.0) {
        // Spawn blood particles (existing effect)
        this.spawnBloodExplosion(position, Math.floor(30 * intensity));

        // Spawn flesh chunks
        this.spawnFleshChunks(position, Math.floor(8 * intensity));

        // Spawn SEVERED LIMBS (realistic dismemberment!)
        this.spawnSeveredLimbs(position, Math.floor(3 * intensity));

        // Create blood splatters on ground
        this.createBloodSplatters(position, Math.floor(5 * intensity));

        // Spawn blood mist
        this.spawnBloodMist(position, Math.floor(15 * intensity));
    }

    spawnFleshChunks(position, count = 8) {
        for (let i = 0; i < count; i++) {
            const chunkSize = Math.random() * 0.4 + 0.2;
            const geometry = new THREE.BoxGeometry(chunkSize, chunkSize * 0.6, chunkSize);
            const material = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.5 ? 0x8B0000 : 0xA52A2A, // Dark red or brown
                roughness: 0.8,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            mesh.castShadow = true;

            // Random rotation
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.scene.add(mesh);

            const chunk = {
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 12,
                    Math.random() * 10 + 3,
                    (Math.random() - 0.5) * 12
                ),
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                ),
                lifetime: 5.0,
                age: 0,
                grounded: false
            };

            this.fleshChunks.push(chunk);
        }
    }

    createBloodSplatters(position, count = 5) {
        for (let i = 0; i < count; i++) {
            // Random splatter size and position near impact
            const splatSize = Math.random() * 1.5 + 0.8;
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                0,
                (Math.random() - 0.5) * 3
            );

            // Create circular splatter decal
            const geometry = new THREE.CircleGeometry(splatSize, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x8B0000,
                transparent: true,
                opacity: Math.random() * 0.5 + 0.3,
                depthWrite: false
            });

            const splatter = new THREE.Mesh(geometry, material);
            splatter.rotation.x = -Math.PI / 2; // Flat on ground
            splatter.position.copy(position).add(offset);
            splatter.position.y = 0.01; // Slightly above ground to avoid z-fighting

            // Random rotation for variation
            splatter.rotation.z = Math.random() * Math.PI * 2;

            this.scene.add(splatter);

            this.bloodSplatters.push({
                mesh: splatter,
                lifetime: 30.0, // Splatters last longer
                age: 0
            });

            // Limit blood splatters to prevent performance issues
            if (this.bloodSplatters.length > 200) {
                const old = this.bloodSplatters.shift();
                this.scene.remove(old.mesh);
                old.mesh.geometry.dispose();
                old.mesh.material.dispose();
            }
        }
    }

    spawnBloodMist(position, count = 15) {
        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 2,
                    (Math.random() - 0.5) * 3
                ),
                color: new THREE.Color(0xFF0000).lerp(new THREE.Color(0x8B0000), Math.random()),
                size: Math.random() * 0.8 + 0.4,
                lifetime: 0.8,
                age: 0,
                gravity: -1.5, // Float upward like mist
                isMist: true
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    // REALISTIC DISMEMBERMENT SYSTEM 🔪
    spawnSeveredLimbs(position, count = 3) {
        const limbTypes = ['arm', 'leg', 'head', 'torso'];

        for (let i = 0; i < count; i++) {
            const limbType = limbTypes[Math.floor(Math.random() * limbTypes.length)];
            const group = new THREE.Group();

            // Create limb based on type
            switch (limbType) {
                case 'arm':
                    this.createArmLimb(group);
                    break;
                case 'leg':
                    this.createLegLimb(group);
                    break;
                case 'head':
                    this.createHeadLimb(group);
                    break;
                case 'torso':
                    this.createTorsoLimb(group);
                    break;
            }

            group.position.copy(position);
            group.position.y += 1; // Start slightly elevated

            // Random rotation
            group.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            group.castShadow = true;
            group.receiveShadow = true;

            this.scene.add(group);

            const limb = {
                type: limbType,
                mesh: group,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 15, // Explosive velocity!
                    Math.random() * 12 + 4,
                    (Math.random() - 0.5) * 15
                ),
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15
                ),
                lifetime: 30.0, // Persist for 30 seconds
                age: 0,
                grounded: false
            };

            this.severedLimbs.push(limb);
        }

        // Limit limb count for performance
        while (this.severedLimbs.length > 50) {
            const old = this.severedLimbs.shift();
            this.scene.remove(old.mesh);
            old.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }

    createArmLimb(group) {
        const armMat = new THREE.MeshStandardMaterial({
            color: 0x8B4545, // Dark reddish flesh
            roughness: 0.95,
            metalness: 0
        });

        // Upper arm
        const upperArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.1, 0.8, 8),
            armMat
        );
        upperArm.position.y = 0.4;
        group.add(upperArm);

        // Forearm
        const forearm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8),
            armMat
        );
        forearm.position.y = -0.35;
        group.add(forearm);

        // Hand (simplified)
        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.2, 0.1),
            armMat
        );
        hand.position.y = -0.75;
        group.add(hand);

        // Blood dripping from severed end
        const bloodDrip = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x8B0000 })
        );
        bloodDrip.position.y = 0.8;
        group.add(bloodDrip);
    }

    createLegLimb(group) {
        const legMat = new THREE.MeshStandardMaterial({
            color: 0x8B4545, // Dark reddish flesh
            roughness: 0.95,
            metalness: 0
        });

        // Thigh
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.13, 1, 8),
            legMat
        );
        thigh.position.y = 0.5;
        group.add(thigh);

        // Shin
        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.1, 0.9, 8),
            legMat
        );
        shin.position.y = -0.45;
        group.add(shin);

        // Foot
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.15, 0.3),
            legMat
        );
        foot.position.set(0, -0.95, 0.05);
        group.add(foot);

        // Blood
        const blood = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x8B0000 })
        );
        blood.position.y = 1;
        group.add(blood);
    }

    createHeadLimb(group) {
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x9B5555, // Pale reddish skin
            roughness: 0.85,
            metalness: 0
        });

        // Skull
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 12, 12),
            headMat
        );
        head.scale.y = 1.1; // Slightly elongated
        group.add(head);

        // Eyes (glowing)
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0
        });

        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            eyeMat
        );
        leftEye.position.set(-0.15, 0.1, 0.4);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            eyeMat
        );
        rightEye.position.set(0.15, 0.1, 0.4);
        group.add(rightEye);

        // Jaw (hanging open)
        const jaw = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.15, 0.25),
            headMat
        );
        jaw.position.set(0, -0.3, 0.3);
        jaw.rotation.x = 0.3; // Open mouth
        group.add(jaw);

        // Severed neck
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8),
            headMat
        );
        neck.position.y = -0.6;
        group.add(neck);

        // Blood fountain from neck
        const blood = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x8B0000 })
        );
        blood.position.y = -0.75;
        group.add(blood);
    }

    createTorsoLimb(group) {
        const torsoMat = new THREE.MeshStandardMaterial({
            color: 0x8B4545, // Dark reddish flesh
            roughness: 0.95,
            metalness: 0
        });

        // Chest
        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1, 0.5),
            torsoMat
        );
        group.add(chest);

        // Ribs (exposed)
        const ribMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.2
        });

        for (let i = 0; i < 3; i++) {
            const rib = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.05, 0.1),
                ribMat
            );
            rib.position.set(0, 0.3 - i * 0.25, 0.26);
            rib.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.1;
            group.add(rib);
        }

        // Blood
        const blood = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 1.05, 0.55),
            new THREE.MeshBasicMaterial({
                color: 0x8B0000,
                transparent: true,
                opacity: 0.6
            })
        );
        group.add(blood);
    }

    spawnHitSpark(position, count = 10) {
        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 5
                ),
                color: new THREE.Color(0xffff00),
                size: Math.random() * 0.3 + 0.1,
                lifetime: 0.5,
                age: 0,
                gravity: 2
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    spawnMuzzleFlash(position, direction, weaponType = 'pistol') {
        // Muzzle flash particles
        const flashCount = weaponType === 'shotgun' ? 30 : 15;
        for (let i = 0; i < flashCount; i++) {
            const spread = weaponType === 'shotgun' ? 0.8 : 0.3;
            const velocity = direction.clone().multiplyScalar(8);
            velocity.x += (Math.random() - 0.5) * spread * 10;
            velocity.y += (Math.random() - 0.5) * spread * 10;
            velocity.z += (Math.random() - 0.5) * spread * 10;

            const particle = {
                position: position.clone(),
                velocity: velocity,
                color: new THREE.Color(weaponType === 'rifle' ? 0x00ffff : 0xffaa00),
                size: Math.random() * 0.4 + 0.2,
                lifetime: 0.15,
                age: 0,
                gravity: 0
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }

        // Smoke puff
        for (let i = 0; i < 5; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    direction.x * 2 + (Math.random() - 0.5),
                    direction.y * 2 + Math.random(),
                    direction.z * 2 + (Math.random() - 0.5)
                ),
                color: new THREE.Color(0x666666),
                size: Math.random() * 0.5 + 0.3,
                lifetime: 0.8,
                age: 0,
                gravity: -0.5
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    spawnShellEjection(position, weaponType = 'pistol') {
        const shellCount = weaponType === 'shotgun' ? 1 : weaponType === 'smg' ? 1 : 1;

        for (let i = 0; i < shellCount; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    Math.random() * 3 + 2, // Eject to the right
                    Math.random() * 4 + 2,
                    (Math.random() - 0.5) * 2
                ),
                color: new THREE.Color(0xddaa00),
                size: 0.15,
                lifetime: 1.5,
                age: 0,
                gravity: 9.8,
                rotation: 0,
                rotationSpeed: Math.random() * 20 + 10
            };

            this.particles.push(particle);
            this.createShellMesh(particle);
        }
    }

    spawnImpactEffect(position, isCritical = false) {
        const count = isCritical ? 30 : 15;
        const color = isCritical ? 0xff0000 : 0x888888;

        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    Math.random() * 6,
                    (Math.random() - 0.5) * 6
                ),
                color: new THREE.Color(color),
                size: Math.random() * 0.3 + 0.1,
                lifetime: 0.6,
                age: 0,
                gravity: 8
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    spawnDeathExplosion(position, scale = 1) {
        const count = Math.floor(100 * scale);

        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    Math.random() * 12 + 3,
                    (Math.random() - 0.5) * 15
                ),
                color: new THREE.Color(
                    Math.random() > 0.7 ? 0xff0000 : 0x8B0000
                ),
                size: Math.random() * 0.6 + 0.3,
                lifetime: 1.5,
                age: 0,
                gravity: 9.8
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }

    createParticleMesh(particle) {
        const geometry = new THREE.SphereGeometry(particle.size, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: particle.color,
            transparent: true,
            opacity: 1
        });

        particle.mesh = new THREE.Mesh(geometry, material);
        particle.mesh.position.copy(particle.position);
        this.scene.add(particle.mesh);
    }

    createShellMesh(particle) {
        // Create a small cylindrical shell casing
        const geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6);
        const material = new THREE.MeshStandardMaterial({
            color: particle.color,
            metalness: 0.8,
            roughness: 0.3
        });

        particle.mesh = new THREE.Mesh(geometry, material);
        particle.mesh.position.copy(particle.position);
        particle.mesh.castShadow = true;
        this.scene.add(particle.mesh);
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Skip particles without meshes (corrupted during errors)
            if (!particle.mesh) {
                this.particles.splice(i, 1);
                continue;
            }

            // Update age
            particle.age += deltaTime;

            // Check lifetime
            if (particle.age >= particle.lifetime) {
                if (particle.mesh) {
                    this.scene.remove(particle.mesh);
                    if (particle.mesh.geometry) particle.mesh.geometry.dispose();
                    if (particle.mesh.material) particle.mesh.material.dispose();
                }
                this.particles.splice(i, 1);
                continue;
            }

            // Apply velocity and gravity
            particle.velocity.y -= particle.gravity * deltaTime;
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Update mesh
            particle.mesh.position.copy(particle.position);

            // Rotate shells
            if (particle.rotationSpeed !== undefined) {
                particle.rotation += particle.rotationSpeed * deltaTime;
                particle.mesh.rotation.x = particle.rotation;
                particle.mesh.rotation.z = particle.rotation * 0.7;
            }

            // Fade out (skip for shells - they should stay visible until they disappear)
            if (particle.rotationSpeed === undefined) {
                const alpha = 1 - (particle.age / particle.lifetime);
                particle.mesh.material.opacity = alpha;
            }

            // Special handling for smoke columns
            if (particle.type === 'smokeColumn') {
                const progress = particle.age / particle.lifetime;
                particle.mesh.scale.setScalar(1 + progress * 3);
                // Drift sideways with sine wave
                particle.velocity.x = Math.sin(particle.age * 0.5) * 2;
                particle.velocity.z = Math.cos(particle.age * 0.7) * 2;
            }

            // Special handling for blood mist
            if (particle.isMist) {
                const alpha = 1 - (particle.age / particle.lifetime);
                particle.mesh.material.opacity = alpha * 0.6; // More transparent
            }
        }

        // Update flesh chunks
        for (let i = this.fleshChunks.length - 1; i >= 0; i--) {
            const chunk = this.fleshChunks[i];

            chunk.age += deltaTime;

            // Remove old chunks
            if (chunk.age >= chunk.lifetime) {
                this.scene.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
                chunk.mesh.material.dispose();
                this.fleshChunks.splice(i, 1);
                continue;
            }

            if (!chunk.grounded) {
                // Apply gravity and velocity
                chunk.velocity.y -= 20 * deltaTime;
                chunk.mesh.position.add(chunk.velocity.clone().multiplyScalar(deltaTime));

                // Apply rotation
                chunk.mesh.rotation.x += chunk.angularVelocity.x * deltaTime;
                chunk.mesh.rotation.y += chunk.angularVelocity.y * deltaTime;
                chunk.mesh.rotation.z += chunk.angularVelocity.z * deltaTime;

                // Check if hit ground
                if (chunk.mesh.position.y <= 0.1) {
                    chunk.grounded = true;
                    chunk.mesh.position.y = 0.1;
                    chunk.angularVelocity.multiplyScalar(0); // Stop rotation
                }
            } else {
                // Fade out when grounded
                const fadeProgress = (chunk.age - 1) / (chunk.lifetime - 1);
                chunk.mesh.material.opacity = Math.max(0, 1 - fadeProgress);
                chunk.mesh.material.transparent = true;
            }
        }

        // Update severed limbs (realistic dismemberment)
        for (let i = this.severedLimbs.length - 1; i >= 0; i--) {
            const limb = this.severedLimbs[i];

            limb.age += deltaTime;

            // Remove old limbs
            if (limb.age >= limb.lifetime) {
                this.scene.remove(limb.mesh);
                limb.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.severedLimbs.splice(i, 1);
                continue;
            }

            if (!limb.grounded) {
                // Apply gravity
                limb.velocity.y -= 25 * deltaTime; // Heavier than flesh chunks

                // Update position
                limb.mesh.position.add(limb.velocity.clone().multiplyScalar(deltaTime));

                // Apply rotation (tumbling through air)
                limb.mesh.rotation.x += limb.angularVelocity.x * deltaTime;
                limb.mesh.rotation.y += limb.angularVelocity.y * deltaTime;
                limb.mesh.rotation.z += limb.angularVelocity.z * deltaTime;

                // Check if hit ground
                if (limb.mesh.position.y <= 0.1) {
                    limb.grounded = true;
                    limb.mesh.position.y = 0.1;

                    // Bounce slightly on impact
                    if (limb.velocity.y < -5) {
                        limb.velocity.y = Math.abs(limb.velocity.y) * 0.3;
                    } else {
                        limb.angularVelocity.multiplyScalar(0); // Stop rotation
                    }
                }
            } else {
                // Slow fade after grounded (limbs persist longer)
                const fadeStart = limb.lifetime * 0.8; // Start fading at 80% of lifetime
                if (limb.age > fadeStart) {
                    const fadeProgress = (limb.age - fadeStart) / (limb.lifetime - fadeStart);

                    limb.mesh.traverse((child) => {
                        if (child.material && !child.material.isBasicMaterial) {
                            child.material.opacity = Math.max(0, 1 - fadeProgress);
                            child.material.transparent = true;
                        }
                    });
                }
            }
        }

        // Update blood splatters
        for (let i = this.bloodSplatters.length - 1; i >= 0; i--) {
            const splatter = this.bloodSplatters[i];

            splatter.age += deltaTime;

            // Fade out over lifetime
            if (splatter.age >= splatter.lifetime) {
                this.scene.remove(splatter.mesh);
                splatter.mesh.geometry.dispose();
                splatter.mesh.material.dispose();
                this.bloodSplatters.splice(i, 1);
            } else {
                // Gradual fade
                const fadeStart = splatter.lifetime * 0.7; // Start fading at 70% of lifetime
                if (splatter.age > fadeStart) {
                    const fadeProgress = (splatter.age - fadeStart) / (splatter.lifetime - fadeStart);
                    const initialOpacity = splatter.mesh.material.opacity;
                    splatter.mesh.material.opacity = initialOpacity * (1 - fadeProgress);
                }
            }
        }
    }

    spawnSmokeColumn(position) {
        // Continuous smoke rising from distant fires
        const count = 5;
        for (let i = 0; i < count; i++) {
            const particle = {
                type: 'smokeColumn',
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    2 + Math.random() * 2, // Rising smoke
                    (Math.random() - 0.5) * 0.5
                ),
                color: new THREE.Color(0x1a1a1a),
                size: 2 + Math.random(),
                lifetime: 8 + Math.random() * 4, // Long-lived
                age: 0,
                gravity: -0.2 // Slight upward drift
            };

            this.particles.push(particle);
            this.createParticleMesh(particle);
        }
    }
}