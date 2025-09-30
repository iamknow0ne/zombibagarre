import * as THREE from 'three';
import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';

export class Player extends Entity {
    constructor(scene, characterData, game) {
        super(scene, new THREE.Vector3(0, 0, 0));

        this.game = game;
        this.characterData = characterData;

        // Stats
        this.maxHealth = characterData.maxHealth;
        this.health = this.maxHealth;
        this.speed = characterData.speed;
        this.damage = 35 * characterData.damage;
        this.fireRate = 300; // ms
        this.lastShot = 0;

        // Dash system
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.isDashing = false;
        this.dashSpeed = 15;
        this.dashAngle = 0;
        this.iframes = 0;
        this.dashMaxCooldown = 1500;
        this.dashMaxDuration = 200;

        // Visual feedback
        this.damageFlashTime = 0;
    }

    async init() {
        // Create simple player mesh (will be replaced with GLTF model later)
        this.createMesh();
        console.log('👤 Player created');
    }

    createMesh() {
        // Create a simple soldier-like shape
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a3d,
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdbac,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2;
        head.castShadow = true;
        group.add(head);

        // Weapon indicator (glowing sphere)
        const weaponGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });
        this.weaponIndicator = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weaponIndicator.position.set(0.5, 1.2, 0);
        group.add(this.weaponIndicator);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Store body reference for damage flash
        this.bodyMesh = body;
    }

    update(deltaTime) {
        // Handle input
        const movement = this.game.input.getMovementVector();

        // Update dash
        if (this.isDashing) {
            this.dashDuration -= deltaTime * 1000;
            this.iframes -= deltaTime * 1000;

            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.dashDuration = 0;
            }

            // Dash movement
            this.velocity.set(
                Math.cos(this.dashAngle) * this.dashSpeed,
                0,
                Math.sin(this.dashAngle) * this.dashSpeed
            );
        } else {
            // Normal movement
            this.velocity.set(movement.x * this.speed, 0, movement.z * this.speed);

            // Face movement direction
            if (movement.x !== 0 || movement.z !== 0) {
                const angle = Math.atan2(movement.x, movement.z);
                this.mesh.rotation.y = angle;
            }
        }

        // Dash input
        this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime * 1000);
        if (this.game.input.isDashPressed() && this.dashCooldown <= 0 && !this.isDashing) {
            this.startDash(movement);
        }

        // Shooting (auto-fire towards nearest enemy)
        this.lastShot += deltaTime * 1000;
        if (this.lastShot >= this.fireRate) {
            this.shoot();
            this.lastShot = 0;
        }

        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= deltaTime;
            if (this.damageFlashTime <= 0) {
                this.bodyMesh.material.emissive.setHex(0x000000);
            }
        }

        // Weapon indicator pulse
        if (this.weaponIndicator) {
            this.weaponIndicator.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        }

        super.update(deltaTime);
    }

    startDash(direction) {
        if (direction.x === 0 && direction.z === 0) {
            direction.z = -1; // Default forward dash
        }

        this.isDashing = true;
        this.dashDuration = this.dashMaxDuration;
        this.iframes = 200;
        this.dashCooldown = this.dashMaxCooldown;
        this.dashAngle = Math.atan2(direction.x, direction.z);

        // Visual feedback
        this.mesh.scale.set(1.2, 0.8, 1.2);
        setTimeout(() => {
            this.mesh.scale.set(1, 1, 1);
        }, 200);

        console.log('💨 Dash!');
    }

    shoot() {
        // Find nearest enemy
        const nearestEnemy = this.findNearestEnemy();
        if (!nearestEnemy) return;

        // Calculate direction to enemy
        const direction = new THREE.Vector3()
            .subVectors(nearestEnemy.position, this.position)
            .normalize();

        // Create projectile
        const projectilePos = this.position.clone();
        projectilePos.y += 1; // Shoot from chest height

        const projectile = new Projectile(
            this.scene,
            projectilePos,
            direction,
            this.damage,
            this.game,
            'player'
        );

        this.game.addProjectile(projectile);

        // Muzzle flash effect
        this.createMuzzleFlash();
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;

        for (const enemy of this.game.entities.enemies) {
            const dist = this.position.distanceTo(enemy.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    createMuzzleFlash() {
        if (!this.weaponIndicator) return;

        const flash = new THREE.PointLight(0x00ffff, 3, 5);
        flash.position.copy(this.weaponIndicator.position);
        this.mesh.add(flash);

        setTimeout(() => {
            this.mesh.remove(flash);
        }, 50);
    }

    takeDamage(damage) {
        if (this.iframes > 0) return; // Invincible during dash

        this.health -= damage;
        this.game.events.emit('player-damaged', { health: this.health, maxHealth: this.maxHealth });

        // Visual feedback
        this.bodyMesh.material.emissive.setHex(0xff0000);
        this.damageFlashTime = 0.2;

        // Screen shake
        this.game.screenShake(2, 0.2);

        console.log(`💔 Player took ${damage} damage. Health: ${this.health}/${this.maxHealth}`);

        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.game.events.emit('player-healed', { health: this.health, maxHealth: this.maxHealth });
        console.log(`💚 Player healed ${amount}. Health: ${this.health}/${this.maxHealth}`);
    }

    die() {
        console.log('💀 Player died');
        this.game.gameOver();
        this.destroy();
    }
}