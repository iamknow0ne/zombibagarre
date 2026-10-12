import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';

/**
 * ProjectilePool - Object pooling for projectiles to improve performance
 * Reuses projectile objects instead of creating/destroying constantly
 */
export class ProjectilePool {
    constructor(game, initialSize = 100) {
        this.game = game;
        this.pool = [];
        this.activeProjectiles = [];

        // Pre-allocate projectiles
        this.preallocate(initialSize);

        console.log(`🎯 Projectile pool initialized with ${initialSize} objects`);
    }

    preallocate(size) {
        for (let i = 0; i < size; i++) {
            const projectile = new Projectile(
                this.game.sceneManager.scene,
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(1, 0, 0),
                0,
                30,
                'player',
                this.game
            );
            projectile.alive = false;
            projectile.mesh.visible = false;
            this.pool.push(projectile);
        }
    }

    /**
     * Get a projectile from the pool
     */
    get(position, direction, damage, speed, owner, color) {
        let projectile;

        // Try to reuse from pool
        if (this.pool.length > 0) {
            projectile = this.pool.pop();
            this.reset(projectile, position, direction, damage, speed, owner, color);
        } else {
            // Pool exhausted, create new (but this should be rare)
            projectile = new Projectile(
                this.game.sceneManager.scene,
                position,
                direction,
                damage,
                speed,
                owner,
                this.game,
                color
            );
            console.warn('⚠️ Projectile pool exhausted, creating new projectile');
        }

        this.activeProjectiles.push(projectile);
        return projectile;
    }

    /**
     * Reset projectile to initial state
     */
    reset(projectile, position, direction, damage, speed, owner, color) {
        projectile.alive = true;
        projectile.position.copy(position);
        projectile.direction = direction.normalize();
        projectile.damage = damage;
        projectile.speed = speed || 30;
        projectile.owner = owner;
        projectile.age = 0;
        projectile.color = color || (owner === 'player' ? 0x00ffff : 0xff0000);

        // Reset weapon properties
        projectile.pierce = 0;
        projectile.piercedEnemies = [];
        projectile.area = 1;
        projectile.knockback = 0;
        projectile.lifesteal = 0;
        projectile.specialMechanic = null;
        projectile.sourceWeapon = null;
        projectile.isCritical = false;

        // Reset special mechanics
        projectile.isExplosive = false;
        projectile.applyBurn = false;
        projectile.chainLightning = false;
        projectile.bounceCount = 0;
        projectile.bouncesLeft = 0;
        projectile.applySlow = false;
        projectile.applyPoison = false;

        // Reset velocity
        projectile.velocity.copy(direction).multiplyScalar(speed);

        // Make visible
        if (projectile.mesh) {
            projectile.mesh.visible = true;
            projectile.mesh.position.copy(position);

            // Update material color
            if (projectile.mesh.material) {
                projectile.mesh.material.color.setHex(projectile.color);
                projectile.mesh.material.emissive.setHex(projectile.color);
            }
        }
    }

    /**
     * Return projectile to pool
     */
    release(projectile) {
        projectile.alive = false;

        if (projectile.mesh) {
            projectile.mesh.visible = false;
        }

        // Remove from active list
        const index = this.activeProjectiles.indexOf(projectile);
        if (index > -1) {
            this.activeProjectiles.splice(index, 1);
        }

        // Return to pool
        this.pool.push(projectile);
    }

    /**
     * Update all active projectiles
     */
    update(deltaTime) {
        // Update in reverse to safely remove
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];

            if (!projectile.alive) {
                this.release(projectile);
                continue;
            }

            projectile.update(deltaTime);
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            active: this.activeProjectiles.length,
            total: this.pool.length + this.activeProjectiles.length
        };
    }

    /**
     * Clean up all projectiles
     */
    cleanup() {
        for (const projectile of this.activeProjectiles) {
            if (projectile.mesh) {
                this.game.sceneManager.scene.remove(projectile.mesh);
            }
        }

        for (const projectile of this.pool) {
            if (projectile.mesh) {
                this.game.sceneManager.scene.remove(projectile.mesh);
                if (projectile.mesh.geometry) projectile.mesh.geometry.dispose();
                if (projectile.mesh.material) projectile.mesh.material.dispose();
            }
        }

        this.activeProjectiles = [];
        this.pool = [];
    }
}
