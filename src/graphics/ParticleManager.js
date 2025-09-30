import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 5000;

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

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update age
            particle.age += deltaTime;

            // Check lifetime
            if (particle.age >= particle.lifetime) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            // Apply velocity and gravity
            particle.velocity.y -= particle.gravity * deltaTime;
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Update mesh
            particle.mesh.position.copy(particle.position);

            // Fade out
            const alpha = 1 - (particle.age / particle.lifetime);
            particle.mesh.material.opacity = alpha;
        }
    }
}