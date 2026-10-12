import * as THREE from 'three';

export class DrivableVehicleSystem {
    constructor(game) {
        this.game = game;
        this.vehicles = [];
        this.currentVehicle = null; // Vehicle player is driving
        this.nearbyVehicle = null; // Vehicle player can enter

        // Vehicle stats
        this.vehicleTypes = {
            tank: {
                name: 'Tank',
                speed: 8,
                turnSpeed: 1.5,
                maxHealth: 500,
                damage: 100,
                fireRate: 1500,
                color: 0x3d3d2a,
                size: { x: 6, y: 2.5, z: 4 },
                weaponOffset: new THREE.Vector3(0, 2, 2)
            },
            car: {
                name: 'Car',
                speed: 20,
                turnSpeed: 3,
                maxHealth: 200,
                damage: 30,
                fireRate: 400,
                color: 0x4a4a4a,
                size: { x: 4.5, y: 1.5, z: 2.5 },
                weaponOffset: new THREE.Vector3(0, 1.5, 1.8)
            },
            motorcycle: {
                name: 'Motorcycle',
                speed: 30,
                turnSpeed: 5,
                maxHealth: 100,
                damage: 20,
                fireRate: 300,
                color: 0x8b0000,
                size: { x: 2, y: 1.2, z: 1 },
                weaponOffset: new THREE.Vector3(0, 1, 0.8)
            }
        };

        console.log('🚗 Drivable Vehicle System initialized');
    }

    spawnVehicles(count = 10, mapSize = 240) {
        const types = ['tank', 'car', 'motorcycle'];
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = count * 3; // Allow 3x attempts

        while (spawned < count && attempts < maxAttempts) {
            attempts++;

            const type = types[Math.floor(Math.random() * types.length)];
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * mapSize * 0.6, // Reduced range for better placement
                0,
                (Math.random() - 0.5) * mapSize * 0.6
            );

            // Optional: Check if position is clear (no obstacles nearby)
            if (this.game.sceneManager.obstacleSystem?.checkCollision(position, 5)) {
                continue; // Try again
            }

            const vehicle = this.createVehicle(type, position);
            if (vehicle) {
                spawned++;
            }
        }

        console.log(`🚗 Spawned ${spawned}/${count} drivable vehicles (${attempts} attempts)`);
    }

    createVehicle(type, position) {
        const stats = this.vehicleTypes[type];
        const group = new THREE.Group();

        // Vehicle body
        const bodyGeometry = new THREE.BoxGeometry(stats.size.x, stats.size.y, stats.size.z);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: stats.color,
            roughness: 0.7,
            metalness: 0.5
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = stats.size.y / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Vehicle-specific details
        switch (type) {
            case 'tank':
                this.addTankDetails(group, stats);
                break;
            case 'car':
                this.addCarDetails(group, stats);
                break;
            case 'motorcycle':
                this.addMotorcycleDetails(group, stats);
                break;
        }

        // Enter prompt (E to enter) - Glowing indicator
        const promptGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.1);
        const promptMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const prompt = new THREE.Mesh(promptGeometry, promptMaterial);
        prompt.position.y = stats.size.y + 2;
        prompt.visible = false;
        group.add(prompt);

        // Add pulsing glow effect
        prompt.userData.pulseTime = 0;

        group.position.copy(position);
        group.rotation.y = Math.random() * Math.PI * 2;

        this.game.sceneManager.scene.add(group);

        const vehicle = {
            type,
            stats,
            mesh: group,
            body,
            prompt,
            position: group.position,
            rotation: group.rotation,
            health: stats.maxHealth,
            maxHealth: stats.maxHealth,
            velocity: new THREE.Vector3(),
            lastFireTime: 0,
            occupied: false
        };

        this.vehicles.push(vehicle);
        console.log(`✅ Created ${type} vehicle at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
        return vehicle;
    }

    addTankDetails(group, stats) {
        // Turret
        const turretGeometry = new THREE.CylinderGeometry(1.2, 1.5, 1.5, 8);
        const turretMaterial = new THREE.MeshStandardMaterial({
            color: stats.color,
            roughness: 0.8,
            metalness: 0.6
        });
        const turret = new THREE.Mesh(turretGeometry, turretMaterial);
        turret.position.y = stats.size.y + 0.5;
        turret.castShadow = true;
        group.add(turret);

        // Cannon barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3, 8);
        const barrel = new THREE.Mesh(barrelGeometry, turretMaterial);
        barrel.position.set(0, stats.size.y + 0.5, 2);
        barrel.rotation.x = Math.PI / 2;
        barrel.castShadow = true;
        group.add(barrel);

        // Tracks (simplified)
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.95
        });

        for (let side = -1; side <= 1; side += 2) {
            const trackGeo = new THREE.BoxGeometry(stats.size.x - 0.5, 0.8, 0.6);
            const track = new THREE.Mesh(trackGeo, trackMaterial);
            track.position.set(0, 0.4, side * (stats.size.z / 2 + 0.3));
            track.castShadow = true;
            group.add(track);
        }
    }

    addCarDetails(group, stats) {
        // Windshield
        const windshieldGeo = new THREE.PlaneGeometry(stats.size.z - 0.2, stats.size.y - 0.3);
        const windshieldMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1
        });
        const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
        windshield.position.set(stats.size.x / 2 - 0.8, stats.size.y / 2 + 0.3, 0);
        windshield.rotation.y = Math.PI / 2;
        windshield.rotation.x = -0.2;
        group.add(windshield);

        // Wheels
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.9
        });

        const wheelPositions = [
            { x: stats.size.x / 2 - 1, z: stats.size.z / 2 + 0.3 },
            { x: stats.size.x / 2 - 1, z: -(stats.size.z / 2 + 0.3) },
            { x: -(stats.size.x / 2 - 1), z: stats.size.z / 2 + 0.3 },
            { x: -(stats.size.x / 2 - 1), z: -(stats.size.z / 2 + 0.3) }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.4, 12);
            const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
            wheel.position.set(pos.x, 0.25, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Headlights
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff88,
            emissive: 0xffff88,
            emissiveIntensity: 1.5
        });

        for (let i = -1; i <= 1; i += 2) {
            const lightGeo = new THREE.CircleGeometry(0.2, 8);
            const light = new THREE.Mesh(lightGeo, lightMaterial);
            light.position.set(stats.size.x / 2 + 0.01, stats.size.y / 2, i * (stats.size.z / 3));
            light.rotation.y = Math.PI / 2;
            group.add(light);
        }
    }

    addMotorcycleDetails(group, stats) {
        // Handlebars
        const handlebarMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.6,
            metalness: 0.7
        });

        const handlebarGeo = new THREE.CylinderGeometry(0.05, 0.05, stats.size.z + 0.5, 8);
        const handlebar = new THREE.Mesh(handlebarGeo, handlebarMat);
        handlebar.position.set(stats.size.x / 2 - 0.3, stats.size.y, 0);
        handlebar.rotation.z = Math.PI / 2;
        group.add(handlebar);

        // Wheels (2 wheels for motorcycle)
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.9
        });

        const wheelPositions = [
            { x: stats.size.x / 2 - 0.5, z: 0 },
            { x: -(stats.size.x / 2 - 0.5), z: 0 }
        ];

        for (const pos of wheelPositions) {
            const wheelGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.2, 16);
            const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
            wheel.position.set(pos.x, 0.35, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.8, 0.3, stats.size.z - 0.2);
        const seatMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8
        });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(-0.2, stats.size.y / 2 + 0.2, 0);
        group.add(seat);
    }

    update(deltaTime) {
        // Check proximity to vehicles for enter prompt
        if (!this.currentVehicle) {
            this.checkVehicleProximity();
        }

        // Update current vehicle if player is driving
        if (this.currentVehicle) {
            this.updateDriving(deltaTime);
        }

        // Update all vehicles
        for (const vehicle of this.vehicles) {
            // Apply velocity damping
            vehicle.velocity.multiplyScalar(0.95);

            // Update position
            vehicle.mesh.position.add(vehicle.velocity.clone().multiplyScalar(deltaTime));

            // Keep vehicles on ground
            vehicle.mesh.position.y = 0;

            // Pulse the prompt if visible
            if (vehicle.prompt.visible) {
                vehicle.prompt.userData.pulseTime += deltaTime * 3;
                const pulse = Math.sin(vehicle.prompt.userData.pulseTime) * 0.3 + 0.7;
                vehicle.prompt.material.opacity = pulse;

                // Make prompt face camera
                if (this.game.camera && this.game.camera.camera) {
                    vehicle.prompt.lookAt(this.game.camera.camera.position);
                }
            }

            // Update health bar if damaged
            if (vehicle.health < vehicle.maxHealth) {
                this.updateVehicleHealthBar(vehicle);
            }
        }
    }

    checkVehicleProximity() {
        if (!this.game.entities.player) return;

        const playerPos = this.game.entities.player.position;
        let closestVehicle = null;
        let closestDist = 5; // Enter radius

        for (const vehicle of this.vehicles) {
            if (vehicle.occupied) continue;

            const dist = playerPos.distanceTo(vehicle.position);
            if (dist < closestDist) {
                closestVehicle = vehicle;
                closestDist = dist;
            }
        }

        // Update prompts
        if (this.nearbyVehicle !== closestVehicle) {
            if (this.nearbyVehicle) {
                this.nearbyVehicle.prompt.visible = false;
            }
            this.nearbyVehicle = closestVehicle;
            if (this.nearbyVehicle) {
                this.nearbyVehicle.prompt.visible = true;
                if (this.game.camera && this.game.camera.camera) {
                    this.nearbyVehicle.prompt.lookAt(this.game.camera.camera.position);
                }
                console.log(`📍 Near ${this.nearbyVehicle.type} - Press E to enter`);
            }
        }
    }

    attemptEnterVehicle() {
        if (this.nearbyVehicle && !this.currentVehicle) {
            this.enterVehicle(this.nearbyVehicle);
        } else if (this.currentVehicle) {
            this.exitVehicle();
        }
    }

    enterVehicle(vehicle) {
        this.currentVehicle = vehicle;
        vehicle.occupied = true;
        vehicle.prompt.visible = false;

        // Hide player mesh
        this.game.entities.player.mesh.visible = false;

        // Sync player position to vehicle
        this.game.entities.player.position.copy(vehicle.position);

        console.log(`🚗 Entered ${vehicle.stats.name}!`);
        this.game.events.emit('vehicle-entered', { type: vehicle.type });
    }

    exitVehicle() {
        if (!this.currentVehicle) return;

        // Show player mesh
        this.game.entities.player.mesh.visible = true;

        // Eject player slightly to the side
        const exitOffset = new THREE.Vector3(
            Math.sin(this.currentVehicle.rotation.y + Math.PI / 2) * 3,
            0,
            Math.cos(this.currentVehicle.rotation.y + Math.PI / 2) * 3
        );
        this.game.entities.player.position.copy(this.currentVehicle.position).add(exitOffset);

        this.currentVehicle.occupied = false;
        this.currentVehicle = null;

        console.log('🚪 Exited vehicle');
        this.game.events.emit('vehicle-exited');
    }

    updateDriving(deltaTime) {
        const vehicle = this.currentVehicle;
        const input = this.game.input;

        // Movement (WASD or touch controls)
        const forward = new THREE.Vector3(
            Math.sin(vehicle.rotation.y),
            0,
            Math.cos(vehicle.rotation.y)
        );

        if (input.keys['w'] || input.keys['ArrowUp']) {
            vehicle.velocity.add(forward.clone().multiplyScalar(vehicle.stats.speed * deltaTime));
        }
        if (input.keys['s'] || input.keys['ArrowDown']) {
            vehicle.velocity.add(forward.clone().multiplyScalar(-vehicle.stats.speed * 0.5 * deltaTime));
        }

        // Turning (A/D or touch)
        if (input.keys['a'] || input.keys['ArrowLeft']) {
            vehicle.rotation.y += vehicle.stats.turnSpeed * deltaTime;
        }
        if (input.keys['d'] || input.keys['ArrowRight']) {
            vehicle.rotation.y -= vehicle.stats.turnSpeed * deltaTime;
        }

        // Limit max speed
        const maxSpeed = vehicle.stats.speed * 0.5;
        if (vehicle.velocity.length() > maxSpeed) {
            vehicle.velocity.normalize().multiplyScalar(maxSpeed);
        }

        // Sync player position to vehicle
        this.game.entities.player.position.copy(vehicle.position);
        this.game.entities.player.mesh.position.copy(vehicle.position);

        // Shooting (automatic while in vehicle)
        if (input.mouseDown || input.isShooting) {
            this.fireVehicleWeapon();
        }
    }

    fireVehicleWeapon() {
        const vehicle = this.currentVehicle;
        const now = Date.now();

        if (now - vehicle.lastFireTime < vehicle.stats.fireRate) return;

        vehicle.lastFireTime = now;

        // Calculate firing direction (vehicle forward)
        const direction = new THREE.Vector3(
            Math.sin(vehicle.rotation.y),
            0,
            Math.cos(vehicle.rotation.y)
        );

        // Calculate weapon spawn position
        const weaponPos = vehicle.position.clone().add(
            direction.clone().multiplyScalar(vehicle.stats.weaponOffset.z)
        );
        weaponPos.y = vehicle.stats.weaponOffset.y;

        // Create projectile
        const projectile = {
            position: weaponPos,
            velocity: direction.clone().multiplyScalar(40),
            damage: vehicle.stats.damage,
            lifetime: 3,
            age: 0,
            size: 0.5,
            color: 0xffaa00
        };

        // Add to game projectiles
        const geometry = new THREE.SphereGeometry(projectile.size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: projectile.color });
        projectile.mesh = new THREE.Mesh(geometry, material);
        projectile.mesh.position.copy(projectile.position);
        this.game.sceneManager.scene.add(projectile.mesh);

        this.game.entities.projectiles.push(projectile);

        // Muzzle flash
        this.game.particles.spawnMuzzleFlash(weaponPos, direction, vehicle.type);

        // Sound effect (if available)
        console.log(`💥 ${vehicle.stats.name} fired!`);
    }

    damageVehicle(vehicle, damage) {
        vehicle.health -= damage;

        if (vehicle.health <= 0) {
            this.destroyVehicle(vehicle);
        }
    }

    destroyVehicle(vehicle) {
        // Explosion
        this.game.particles.spawnDeathExplosion(vehicle.position, 3);
        this.game.screenShake(5, 0.8);

        // If player was in vehicle, eject them
        if (this.currentVehicle === vehicle) {
            this.exitVehicle();
            this.game.entities.player.takeDamage(50); // Explosion damage
        }

        // Remove from scene
        this.game.sceneManager.scene.remove(vehicle.mesh);

        // Dispose resources
        vehicle.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // Remove from array
        const index = this.vehicles.indexOf(vehicle);
        if (index > -1) {
            this.vehicles.splice(index, 1);
        }

        console.log(`💥 ${vehicle.stats.name} destroyed!`);
    }

    updateVehicleHealthBar(vehicle) {
        // Health bars could be added here (simplified for now)
        // Just flash the vehicle red when damaged
        const damageFlash = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        vehicle.body.material.emissive.setHex(0x880000);
        vehicle.body.material.emissiveIntensity = (1 - vehicle.health / vehicle.maxHealth) * damageFlash;
    }

    destroy() {
        // Clean up all vehicles
        for (const vehicle of this.vehicles) {
            this.game.sceneManager.scene.remove(vehicle.mesh);
            vehicle.mesh.traverse((child) => {
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
        this.vehicles = [];
        this.currentVehicle = null;
        this.nearbyVehicle = null;
    }
}
