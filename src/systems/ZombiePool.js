import { Zombie } from '../entities/Zombie.js';
import * as THREE from 'three';

/**
 * ZombiePool - Object pooling system for massive zombie hordes
 * Reuses zombie objects instead of creating/destroying for performance
 */
export class ZombiePool {
    constructor(game, initialSize = 200) {
        this.game = game;
        this.scene = game.sceneManager.scene;

        // Pool management
        this.pool = [];
        this.active = [];
        this.inactive = [];
        this.maxPoolSize = 250; // Hard cap for memory

        // Performance tracking
        this.stats = {
            totalSpawned: 0,
            totalRecycled: 0,
            currentActive: 0,
            poolSize: 0
        };

        // LOD (Level of Detail) system
        this.lodDistances = {
            high: 20,   // Full detail within 20 units
            medium: 40, // Medium detail 20-40 units
            low: 60     // Low detail 40-60 units
            // Beyond 60: culled or minimal
        };

        // Simplified meshes for LOD
        this.simplifiedGeometries = null;

        // Pre-create initial pool
        this.initialize(initialSize);

        console.log(`🧟 Zombie pool initialized (${initialSize} zombies pre-created)`);
    }

    /**
     * Initialize pool with pre-created zombies
     */
    initialize(size) {
        for (let i = 0; i < size; i++) {
            const zombie = this.createZombie();
            zombie.pooled = true;
            zombie.alive = false;
            zombie.mesh.visible = false;

            this.pool.push(zombie);
            this.inactive.push(zombie);
        }

        this.stats.poolSize = size;
        this.createSimplifiedGeometries();
    }

    /**
     * Create simplified geometries for LOD
     */
    createSimplifiedGeometries() {
        this.simplifiedGeometries = {
            high: {
                body: new THREE.BoxGeometry(1, 2, 0.8),
                head: new THREE.SphereGeometry(0.5, 16, 16),
                arms: new THREE.BoxGeometry(0.2, 1.2, 0.2)
            },
            medium: {
                body: new THREE.BoxGeometry(1, 2, 0.8),
                head: new THREE.SphereGeometry(0.5, 8, 8),
                arms: new THREE.BoxGeometry(0.2, 1.2, 0.2)
            },
            low: {
                // Single box for entire zombie
                body: new THREE.BoxGeometry(1, 2, 1)
            }
        };

        console.log('🎨 LOD geometries created');
    }

    /**
     * Create a new zombie (used for pool expansion)
     */
    createZombie() {
        const tempPos = new THREE.Vector3(0, -1000, 0); // Off-screen
        const zombie = new Zombie(this.scene, tempPos, 'normal', this.game);
        return zombie;
    }

    /**
     * Spawn zombie from pool
     */
    spawn(position, type, wave) {
        let zombie = this.inactive.pop();

        // Expand pool if needed (up to max)
        if (!zombie && this.pool.length < this.maxPoolSize) {
            zombie = this.createZombie();
            zombie.pooled = true;
            this.pool.push(zombie);
            console.log(`📦 Pool expanded to ${this.pool.length}`);
        }

        // Pool exhausted - skip spawn
        if (!zombie) {
            console.warn('⚠️ Zombie pool exhausted! Consider increasing maxPoolSize.');
            return null;
        }

        // Reset zombie to initial state
        this.resetZombie(zombie, position, type, wave);

        // Activate
        zombie.alive = true;
        zombie.mesh.visible = true;
        this.active.push(zombie);

        this.stats.totalSpawned++;
        this.stats.currentActive = this.active.length;

        return zombie;
    }

    /**
     * Reset zombie to reuse
     */
    resetZombie(zombie, position, type, wave) {
        // Apply difficulty stats
        const baseStats = this.getBaseStatsForType(type);
        const difficultyStats = this.game.difficulty.calculateEnemyStats(baseStats, wave);

        zombie.type = type;
        zombie.health = difficultyStats.health;
        zombie.maxHealth = difficultyStats.health;
        zombie.damage = difficultyStats.damage;
        zombie.speed = difficultyStats.speed;

        zombie.position.copy(position);
        zombie.mesh.position.copy(position);

        zombie.velocity.set(0, 0, 0);
        zombie.alive = true;
        zombie.damaged = false;
        zombie.isDying = false; // CRITICAL FIX: Reset dying flag to prevent invincibility!

        // Reset type-specific flags
        zombie.isElite = type === 'elite';
        zombie.isFast = type === 'fast';
        zombie.isTank = type === 'tank';
        zombie.isExploder = type === 'exploder';
        zombie.isToxic = type === 'toxic';
        zombie.isArmored = type === 'armored';
        zombie.isBerserker = type === 'berserker';
        zombie.isSpitter = type === 'spitter';
        zombie.isInvisible = type === 'invisible';
        zombie.isBoss = type === 'boss';

        // Reset visual
        this.updateZombieVisual(zombie, type);

        // Reset scale
        zombie.scale = type === 'boss' ? 3 : type === 'tank' ? 1.5 : type === 'berserker' ? 1.4 : 1;
        zombie.mesh.scale.setScalar(zombie.scale);

        // Reset attack cooldown
        zombie.attackCooldown = 0;

        // Reset LOD to high detail
        this.setLOD(zombie, 'high');
    }

    /**
     * Get base stats for zombie type
     */
    getBaseStatsForType(type) {
        const stats = {
            normal: { health: 50, damage: 15, speed: 2.5, count: 1 },
            fast: { health: 30, damage: 10, speed: 4.5, count: 1 },
            tank: { health: 200, damage: 30, speed: 1.5, count: 1 },
            elite: { health: 150, damage: 25, speed: 3, count: 1 },
            exploder: { health: 80, damage: 15, speed: 3, count: 1 },
            toxic: { health: 90, damage: 20, speed: 2, count: 1 },
            armored: { health: 250, damage: 20, speed: 2, count: 1 },
            berserker: { health: 180, damage: 40, speed: 3.5, count: 1 },
            spitter: { health: 90, damage: 20, speed: 1.5, count: 1 },
            invisible: { health: 70, damage: 25, speed: 3.5, count: 1 },
            boss: { health: 5000, damage: 50, speed: 2, count: 1 }
        };

        return stats[type] || stats.normal;
    }

    /**
     * Update zombie visual based on type
     */
    updateZombieVisual(zombie, type) {
        const colors = {
            normal: 0x666666,
            fast: 0xffaa00,
            tank: 0x8b4513,
            elite: 0xff0000,
            exploder: 0x00ff00,
            toxic: 0x00ff88,
            armored: 0x444444,
            berserker: 0xff0000,
            spitter: 0xaaff00,
            invisible: 0x8888ff,
            boss: 0x880000
        };

        zombie.color = colors[type] || colors.normal;

        // Update mesh color
        if (zombie.mesh && zombie.mesh.children) {
            zombie.mesh.traverse((child) => {
                if (child.material) {
                    // Check if properties exist before setting
                    if (child.material.color) {
                        child.material.color.setHex(zombie.color);
                    }
                    if (child.material.emissive) {
                        child.material.emissive.setHex(zombie.color);
                    }
                }
            });
        }
    }

    /**
     * Return zombie to pool
     */
    despawn(zombie) {
        if (!zombie.pooled) return;

        zombie.alive = false;
        zombie.mesh.visible = false;

        // Move off-screen
        zombie.position.set(0, -1000, 0);
        zombie.mesh.position.set(0, -1000, 0);

        // Remove from active
        const index = this.active.indexOf(zombie);
        if (index > -1) {
            this.active.splice(index, 1);
        }

        // Return to inactive pool
        this.inactive.push(zombie);

        this.stats.totalRecycled++;
        this.stats.currentActive = this.active.length;
    }

    /**
     * Update LOD for all active zombies
     */
    updateLOD(playerPosition) {
        for (const zombie of this.active) {
            if (!zombie.alive) continue;

            const distance = zombie.position.distanceTo(playerPosition);

            // Frustum culling - hide if too far
            if (distance > 80) {
                zombie.mesh.visible = false;
                continue;
            }

            zombie.mesh.visible = true;

            // LOD switching
            if (distance < this.lodDistances.high) {
                this.setLOD(zombie, 'high');
            } else if (distance < this.lodDistances.medium) {
                this.setLOD(zombie, 'medium');
            } else if (distance < this.lodDistances.low) {
                this.setLOD(zombie, 'low');
            }
        }
    }

    /**
     * Set LOD level for zombie
     */
    setLOD(zombie, level) {
        if (zombie.currentLOD === level) return;

        zombie.currentLOD = level;

        // Adjust geometry complexity based on LOD
        // (In production, would swap geometries)
        // For now, just adjust visibility of details

        if (zombie.mesh && zombie.mesh.children) {
            if (level === 'low') {
                // Hide arms for low detail
                zombie.mesh.children.forEach((child, i) => {
                    if (i > 2) child.visible = false; // Hide arms
                });
            } else {
                // Show all parts
                zombie.mesh.children.forEach(child => {
                    child.visible = true;
                });
            }
        }
    }

    /**
     * Get active zombies
     */
    getActive() {
        return this.active;
    }

    /**
     * Get pool stats
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: this.pool.length,
            available: this.inactive.length,
            utilizationPercent: (this.active.length / this.pool.length * 100).toFixed(1)
        };
    }

    /**
     * Cleanup pool
     */
    cleanup() {
        // Despawn all active zombies
        for (const zombie of [...this.active]) {
            this.despawn(zombie);
        }

        console.log('🧹 Zombie pool cleaned up');
    }
}
