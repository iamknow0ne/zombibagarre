import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(scene, position, direction, damage, game, owner = 'player') {
        super(scene, position);

        this.game = game;
        this.direction = direction.normalize();
        this.damage = damage;
        this.speed = 30;
        this.owner = owner; // 'player' or 'enemy'
        this.lifetime = 3; // seconds
        this.age = 0;

        this.velocity.copy(this.direction).multiplyScalar(this.speed);

        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: this.owner === 'player' ? 0x00ffff : 0xff0000,
            emissive: this.owner === 'player' ? 0x00ffff : 0xff0000,
            emissiveIntensity: 1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Add trail effect (simple glow)
        const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.owner === 'player' ? 0x00ffff : 0xff0000,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glow);
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Check lifetime
        if (this.age >= this.lifetime) {
            this.alive = false;
            this.destroy();
            return;
        }

        // Check collisions
        if (this.owner === 'player') {
            this.checkEnemyCollisions();
        }

        super.update(deltaTime);
    }

    checkEnemyCollisions() {
        for (const enemy of this.game.entities.enemies) {
            const distance = this.position.distanceTo(enemy.position);
            const hitRadius = 1 * enemy.scale; // Account for enemy scale

            if (distance < hitRadius) {
                enemy.takeDamage(this.damage);
                this.alive = false;
                this.createHitEffect();
                this.destroy();
                return;
            }
        }
    }

    createHitEffect() {
        // Small particle burst on hit
        this.game.particles.spawnHitSpark(this.position, 10);
    }
}