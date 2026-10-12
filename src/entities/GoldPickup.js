import * as THREE from 'three';
import { Entity } from './Entity.js';

/**
 * GoldPickup - Collectible gold coins dropped by enemies
 */
export class GoldPickup extends Entity {
    constructor(scene, position, amount, game) {
        super(scene, position);

        this.game = game;
        this.amount = amount; // Gold value
        this.lifetime = 30; // Seconds before despawn
        this.age = 0;

        // Magnetic properties
        this.magneticRadius = 8; // Auto-collect when player within range
        this.magneticSpeed = 15;
        this.isBeingPulled = false;

        // Visual properties
        this.bobSpeed = 3; // Floating animation speed
        this.bobHeight = 0.3; // How much it bobs up/down
        this.rotationSpeed = 2; // Spin speed
        this.baseY = position.y;

        // Size based on amount
        this.size = this.calculateSize(amount);

        // Collection state
        this.collected = false;

        this.createMesh();
    }

    calculateSize(amount) {
        if (amount >= 100) return 1.2; // Boss/special loot
        if (amount >= 20) return 0.8;  // Elite enemy
        if (amount >= 5) return 0.5;   // Tank/strong enemy
        return 0.3; // Normal enemy
    }

    createMesh() {
        // Gold coin visual (octahedron = gem-like)
        const geometry = new THREE.OctahedronGeometry(this.size, 0);

        // Determine color based on amount
        let color = 0xffdd00; // Yellow gold
        if (this.amount >= 100) color = 0xff00ff; // Purple for legendary
        else if (this.amount >= 20) color = 0xff6600; // Orange for rare
        else if (this.amount >= 5) color = 0x00ffff; // Cyan for uncommon

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.6,
            metalness: 0.9,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(this.size * 2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glow);

        // Particle trail for legendary drops
        if (this.amount >= 100) {
            this.createParticleTrail();
        }
    }

    createParticleTrail() {
        // Sparkle particles around legendary gold
        this.particleInterval = setInterval(() => {
            if (!this.alive || this.collected) {
                clearInterval(this.particleInterval);
                return;
            }

            // Spawn sparkle
            for (let i = 0; i < 3; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                );

                const sparklePos = this.position.clone().add(offset);
                this.game.particles.spawnHitSpark(sparklePos, 3);
            }
        }, 200);
    }

    update(deltaTime) {
        if (!this.alive || this.collected) return;

        this.age += deltaTime;

        // Despawn after lifetime
        if (this.age >= this.lifetime) {
            this.alive = false;
            this.destroy();
            return;
        }

        // Flash effect before despawning (last 5 seconds)
        if (this.age > this.lifetime - 5) {
            const flashSpeed = 5;
            const opacity = (Math.sin(this.age * flashSpeed) + 1) / 2;
            this.mesh.material.opacity = opacity;
            this.mesh.material.transparent = true;
        }

        // Bobbing animation
        const bobOffset = Math.sin(this.age * this.bobSpeed) * this.bobHeight;
        this.position.y = this.baseY + bobOffset;

        // Spin animation
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;

        // Check magnetic pull to player
        const player = this.game.entities.player;
        if (player && player.alive) {
            const distance = this.position.distanceTo(player.position);

            // Magnetic attraction
            if (distance < this.magneticRadius) {
                this.isBeingPulled = true;

                // Pull towards player
                const direction = new THREE.Vector3()
                    .subVectors(player.position, this.position)
                    .normalize();

                // Accelerate as it gets closer
                const pullSpeed = this.magneticSpeed * (1 + (this.magneticRadius - distance) / this.magneticRadius);

                this.velocity.copy(direction.multiplyScalar(pullSpeed));

                // Play magnetic sound effect (low frequency)
                if (!this.playedMagnetSound) {
                    this.playMagnetSound();
                    this.playedMagnetSound = true;
                }
            }

            // Collection radius
            if (distance < 1.5) {
                this.collect();
                return;
            }
        }

        // Apply velocity (either magnetic or falling)
        super.update(deltaTime);

        // Update mesh position
        this.mesh.position.copy(this.position);
    }

    collect() {
        if (this.collected) return;

        this.collected = true;
        this.alive = false;

        // Add gold to player
        this.game.entities.player.addGold(this.amount);

        // Play collection sound
        this.playCollectSound();

        // Spawn collection particles
        this.game.particles.spawnHitSpark(this.position, 10);

        // Show floating text
        this.game.damageNumbers.spawnDamageNumber(
            this.position,
            `+${this.amount}💰`,
            false,
            false
        );

        // Remove from scene
        this.destroy();
    }

    playMagnetSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 220; // Low hum
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Silently fail if audio not supported
        }
    }

    playCollectSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Pitch based on amount
            const freq = this.amount >= 100 ? 880 : // Legendary
                        this.amount >= 20 ? 659 :  // Rare
                        this.amount >= 5 ? 523 :   // Uncommon
                        440; // Common

            oscillator.frequency.value = freq;
            oscillator.type = 'triangle';

            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Silently fail
        }
    }

    destroy() {
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }

        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();

            // Dispose glow
            if (this.mesh.children.length > 0) {
                this.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }

        this.alive = false;
    }
}
