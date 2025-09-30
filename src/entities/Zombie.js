import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Zombie extends Entity {
    constructor(scene, spawnPos, type = 'normal', game) {
        super(scene, spawnPos);

        this.game = game;
        this.type = type;

        // Stats based on type
        if (type === 'elite') {
            this.speed = 3;
            this.maxHealth = 150;
            this.damage = 30;
            this.color = 0xff0000;
            this.emissive = 0x880000;
            this.scale = 1.5;
        } else if (type === 'boss') {
            this.speed = 2;
            this.maxHealth = 5000;
            this.damage = 50;
            this.color = 0x8800ff;
            this.emissive = 0x440088;
            this.scale = 3;
        } else {
            this.speed = 2;
            this.maxHealth = 100;
            this.damage = 20;
            this.color = 0x00ff00;
            this.emissive = 0x008800;
            this.scale = 1;
        }

        this.health = this.maxHealth;

        this.attackCooldown = 0;
        this.attackRange = 2;
        this.attackRate = 1000; // ms

        this.damageFlashTime = 0;

        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.emissive,
            emissiveIntensity: 0.2,
            roughness: 0.8,
            metalness: 0.1
        });

        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 1;
        this.bodyMesh.castShadow = true;
        group.add(this.bodyMesh);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.5;
        head.castShadow = true;
        group.add(head);

        // Glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 2.6, 0.4);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 2.6, 0.4);
        group.add(rightEye);

        this.mesh = group;
        this.mesh.scale.setScalar(this.scale);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime, playerPosition) {
        if (!playerPosition) return;

        // Move toward player
        const direction = playerPosition.clone().sub(this.position);
        const distance = direction.length();
        direction.normalize();

        // Attack if in range
        const attackDistance = this.attackRange * this.scale;
        if (distance <= attackDistance) {
            this.attackCooldown -= deltaTime * 1000;
            if (this.attackCooldown <= 0) {
                this.attack();
                this.attackCooldown = this.attackRate;
            }
            this.velocity.set(0, 0, 0); // Stop moving when attacking
        } else {
            this.velocity.set(
                direction.x * this.speed,
                0,
                direction.z * this.speed
            );
        }

        // Face player
        const angle = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = angle;

        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= deltaTime;
            if (this.damageFlashTime <= 0) {
                this.bodyMesh.material.emissive.setHex(this.emissive);
            }
        }

        super.update(deltaTime);
    }

    attack() {
        // Deal damage to player
        if (this.game.entities.player) {
            const dist = this.position.distanceTo(this.game.entities.player.position);
            const attackDistance = this.attackRange * this.scale;

            if (dist <= attackDistance) {
                this.game.entities.player.takeDamage(this.damage);
                console.log(`🧟 Zombie attacked player for ${this.damage} damage`);
            }
        }
    }

    takeDamage(damage) {
        this.health -= damage;

        // Damage flash effect
        this.bodyMesh.material.emissive.setHex(0xffffff);
        this.damageFlashTime = 0.1;

        // Show damage number
        // TODO: Implement floating damage numbers

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        console.log(`☠️ Zombie died (${this.type})`);

        // Blood explosion
        this.game.spawnBloodEffect(this.position);

        // Award XP and money
        const xpReward = this.type === 'elite' ? 30 : this.type === 'boss' ? 500 : 10;
        const moneyReward = this.type === 'elite' ? 15 : this.type === 'boss' ? 200 : 5;

        this.game.addExperience(xpReward);
        this.game.addMoney(moneyReward);
        this.game.score += xpReward;

        // Screen shake for boss death
        if (this.type === 'boss') {
            this.game.screenShake(5, 1);
        }

        this.destroy();
    }
}