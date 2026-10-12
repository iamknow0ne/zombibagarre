import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(scene, position, direction, damage, speed, owner, game, color = null) {
        super(scene, position);

        this.game = game;
        this.direction = direction.normalize();
        this.damage = damage;
        this.speed = speed || 30;
        this.owner = owner; // 'player' or 'enemy'
        this.lifetime = 3; // seconds
        this.age = 0;
        this.color = color || (this.owner === 'player' ? 0x00ffff : 0xff0000);
        this.isCritical = false;

        // Weapon properties
        this.pierce = 0;
        this.piercedEnemies = [];
        this.area = 1;
        this.knockback = 0;
        this.lifesteal = 0;
        this.specialMechanic = null;
        this.sourceWeapon = null;

        // Special mechanic properties
        this.isExplosive = false;
        this.applyBurn = false;
        this.chainLightning = false;
        this.bounceCount = 0;
        this.bouncesLeft = 0;
        this.applySlow = false;
        this.applyPoison = false;

        this.velocity.copy(this.direction).multiplyScalar(this.speed);

        this.createMesh();
    }

    createMesh() {
        // AAA Projectile Graphics
        const size = this.isCritical ? 0.3 : 0.2;
        const glowSize = this.isCritical ? 0.6 : 0.4;
        const critColor = this.isCritical ? 0xffff00 : this.color;

        // Special shapes for different weapon types with higher detail
        let geometry;
        if (this.sourceWeapon === 'laser') {
            geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
            geometry.rotateZ(Math.PI / 2);
        } else if (this.sourceWeapon === 'plasma' || this.bounceCount > 0) {
            geometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
        } else if (this.sourceWeapon === 'railgun') {
            geometry = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 16);
            geometry.rotateZ(Math.PI / 2);
        } else if (this.sourceWeapon === 'flamethrower') {
            geometry = new THREE.SphereGeometry(size * 1.2, 12, 12);
        } else {
            geometry = new THREE.SphereGeometry(size, 12, 12);
        }

        // AAA Material based on weapon type
        const material = this.createProjectileMaterial(critColor);

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Enhanced glow effect
        const glowGeometry = new THREE.SphereGeometry(glowSize, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: critColor,
            transparent: true,
            opacity: this.isCritical ? 0.6 : 0.4,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glow);

        // Energy weapons get additional core glow
        if (['laser', 'plasma', 'railgun'].includes(this.sourceWeapon)) {
            this.addEnergyCore();
        }

        // Explosive projectiles get pulsing glow
        if (this.isExplosive || this.specialMechanic === 'explosive') {
            this.addExplosiveGlow();
        }

        // Initialize bounce tracking
        if (this.bounceCount > 0) {
            this.bouncesLeft = this.bounceCount;
        }
    }

    /**
     * Create AAA material based on weapon type
     */
    createProjectileMaterial(color) {
        const isEnergyWeapon = ['laser', 'plasma', 'railgun'].includes(this.sourceWeapon);
        const isBullet = ['pistol', 'rifle', 'smg', 'shotgun', 'minigun'].includes(this.sourceWeapon);

        // Energy weapons: glowing with transmission
        if (isEnergyWeapon) {
            return new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: this.isCritical ? 3.0 : 2.0,
                roughness: 0.1,
                metalness: 0.2
            });
        }

        // Bullet projectiles: metallic
        if (isBullet) {
            return new THREE.MeshStandardMaterial({
                color: this.isCritical ? 0xffff00 : 0xcccccc,
                emissive: color,
                emissiveIntensity: this.isCritical ? 1.5 : 0.5,
                roughness: 0.3,
                metalness: 0.9
            });
        }

        // Flamethrower: fire-like
        if (this.sourceWeapon === 'flamethrower') {
            return new THREE.MeshStandardMaterial({
                color: 0xff4400,
                emissive: 0xff4400,
                emissiveIntensity: 3.0,
                roughness: 0.2,
                metalness: 0.0
            });
        }

        // Default: enhanced standard with glow
        return new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: this.isCritical ? 2.5 : 1.5,
            roughness: 0.4,
            metalness: 0.6,
            envMapIntensity: 1.5
        });
    }

    /**
     * Add glowing energy core for energy weapons
     */
    addEnergyCore() {
        const coreSize = 0.15;
        const coreGeo = new THREE.SphereGeometry(coreSize, 12, 12);
        const coreMat = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 4.0,
            roughness: 0.0,
            metalness: 0.0
        });

        const core = new THREE.Mesh(coreGeo, coreMat);
        this.mesh.add(core);

        // Add point light for energy weapons
        const coreLight = new THREE.PointLight(this.color, 2, 5);
        this.mesh.add(coreLight);
    }

    /**
     * Add pulsing glow for explosive projectiles
     */
    addExplosiveGlow() {
        const glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.explosiveGlow = new THREE.Mesh(glowGeo, glowMat);
        this.mesh.add(this.explosiveGlow);
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Check lifetime
        if (this.age >= this.lifetime) {
            this.alive = false;
            this.destroy();
            return;
        }

        // Store old position for raycast
        const oldPosition = this.position.clone();

        // Move
        super.update(deltaTime);

        // Rotate projectile to face direction (for laser beam visual)
        if (this.sourceWeapon === 'laser') {
            const angle = Math.atan2(this.direction.x, this.direction.z);
            this.mesh.rotation.y = angle;
        }

        // Rotate railgun projectile
        if (this.sourceWeapon === 'railgun') {
            const angle = Math.atan2(this.direction.x, this.direction.z);
            this.mesh.rotation.y = angle;
        }

        // Pulsing glow for explosive projectiles
        if (this.explosiveGlow) {
            const pulse = Math.sin(this.age * 10) * 0.3 + 0.7; // 0.4 to 1.0
            this.explosiveGlow.material.opacity = pulse * 0.5;
            this.explosiveGlow.scale.setScalar(0.8 + pulse * 0.4);
        }

        // Check collisions
        if (this.owner === 'player') {
            this.checkEnemyCollisions(oldPosition);
        }
    }

    checkEnemyCollisions(oldPosition) {
        const enemyCount = this.game.entities.enemies.length;
        if (enemyCount === 0) return;

        for (const enemy of this.game.entities.enemies) {
            if (!enemy.alive) continue;

            // Skip if already pierced this enemy
            if (this.piercedEnemies.includes(enemy)) continue;

            const baseRadius = 0.8;
            const projectileRadius = 0.2 * this.area; // Area affects collision size
            const hitRadius = (baseRadius * enemy.scale) + projectileRadius;

            // Check current position
            const dx = this.position.x - enemy.position.x;
            const dz = this.position.z - enemy.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < hitRadius) {
                this.hitEnemy(enemy);
                return;
            }

            // Raycast check
            if (oldPosition) {
                const closestPoint = this.getClosestPointOnSegment2D(
                    oldPosition,
                    this.position,
                    enemy.position
                );
                const rdx = closestPoint.x - enemy.position.x;
                const rdz = closestPoint.z - enemy.position.z;
                const rayDistance = Math.sqrt(rdx * rdx + rdz * rdz);

                if (rayDistance < hitRadius) {
                    this.hitEnemy(enemy);
                    return;
                }
            }
        }
    }

    hitEnemy(enemy) {
        console.log(`💥 ${this.isCritical ? 'CRIT ' : ''}HIT! Damage: ${this.damage}, Pierce: ${this.pierce}`);

        // Apply main damage
        enemy.takeDamage(this.damage, this.isCritical);

        // Lifesteal
        if (this.lifesteal > 0) {
            const healAmount = Math.floor(this.damage * this.lifesteal);
            this.game.entities.player.heal(healAmount);
        }

        // Knockback
        if (this.knockback > 0) {
            const knockDir = new THREE.Vector3(
                enemy.position.x - this.position.x,
                0,
                enemy.position.z - this.position.z
            ).normalize();
            enemy.position.x += knockDir.x * this.knockback;
            enemy.position.z += knockDir.z * this.knockback;
        }

        // Apply status effects
        if (this.applyBurn) {
            this.applyBurnEffect(enemy);
        }
        if (this.applyPoison) {
            this.applyPoisonEffect(enemy);
        }
        if (this.applySlow) {
            this.applySlowEffect(enemy);
        }

        // Explosive rounds skill
        if (this.game.skillSystem.hasExplosiveRounds() && Math.random() < 0.1) {
            this.explode(enemy.position);
        }

        // Area damage
        if (this.area > 1.5) {
            this.areaBlast(enemy.position);
        }

        // Chain lightning
        if (this.chainLightning || this.specialMechanic === 'chain_lightning') {
            this.chainToNearbyEnemy(enemy);
        }

        // Explosive projectile
        if (this.isExplosive || this.specialMechanic === 'explosive') {
            this.explode(enemy.position);
        }

        // Bounce mechanic
        if (this.bouncesLeft > 0) {
            this.piercedEnemies.push(enemy);
            this.bouncesLeft--;
            this.bounceToNearbyEnemy(enemy);
            this.createHitEffect();
            return; // Don't destroy
        }

        // Pierce mechanic
        if (this.pierce > 0 && this.piercedEnemies.length < this.pierce) {
            this.piercedEnemies.push(enemy);
            this.createHitEffect();
            return; // Don't destroy, keep going
        }

        // Default: destroy projectile
        this.alive = false;
        this.createHitEffect();
        this.destroy();
    }

    applyBurnEffect(enemy) {
        if (!enemy.burnStacks) enemy.burnStacks = 0;
        enemy.burnStacks = Math.min(3, enemy.burnStacks + 1);

        if (!enemy.burnInterval) {
            enemy.burnInterval = setInterval(() => {
                if (enemy.burnStacks > 0 && enemy.health > 0) {
                    enemy.takeDamage(3 * enemy.burnStacks);
                    enemy.burnStacks--;
                    this.game.particles.spawnHitSpark(enemy.position, 3);
                } else {
                    clearInterval(enemy.burnInterval);
                    enemy.burnInterval = null;
                }
            }, 500);
        }
    }

    applyPoisonEffect(enemy) {
        if (!enemy.poisonStacks) enemy.poisonStacks = 0;
        enemy.poisonStacks = Math.min(3, enemy.poisonStacks + 1);

        if (!enemy.poisonInterval) {
            enemy.poisonInterval = setInterval(() => {
                if (enemy.poisonStacks > 0 && enemy.health > 0) {
                    enemy.takeDamage(5 * enemy.poisonStacks);
                    enemy.poisonStacks--;
                } else {
                    clearInterval(enemy.poisonInterval);
                    enemy.poisonInterval = null;
                }
            }, 1000);
        }
    }

    applySlowEffect(enemy) {
        const originalSpeed = enemy.speed;
        enemy.speed *= 0.5;

        setTimeout(() => {
            if (enemy.alive) {
                enemy.speed = originalSpeed;
            }
        }, 2000);
    }

    chainToNearbyEnemy(hitEnemy) {
        const chainRange = 10;
        const chainDamage = this.damage * 0.7; // 70% of original damage

        let nearestEnemy = null;
        let nearestDist = chainRange;

        for (const enemy of this.game.entities.enemies) {
            if (!enemy.alive || enemy === hitEnemy) continue;
            if (this.piercedEnemies.includes(enemy)) continue;

            const dx = enemy.position.x - hitEnemy.position.x;
            const dz = enemy.position.z - hitEnemy.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy) {
            console.log('⚡ CHAIN LIGHTNING!');
            nearestEnemy.takeDamage(chainDamage, false);
            this.game.particles.spawnHitSpark(nearestEnemy.position, 15);
        }
    }

    bounceToNearbyEnemy(hitEnemy) {
        const bounceRange = 15;

        let nearestEnemy = null;
        let nearestDist = bounceRange;

        for (const enemy of this.game.entities.enemies) {
            if (!enemy.alive || enemy === hitEnemy) continue;
            if (this.piercedEnemies.includes(enemy)) continue;

            const dx = enemy.position.x - hitEnemy.position.x;
            const dz = enemy.position.z - hitEnemy.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy) {
            console.log('🔵 PLASMA BOUNCE!');
            // Redirect projectile toward new enemy
            const newDirection = new THREE.Vector3(
                nearestEnemy.position.x - this.position.x,
                0,
                nearestEnemy.position.z - this.position.z
            ).normalize();

            this.direction = newDirection;
            this.velocity.copy(this.direction).multiplyScalar(this.speed);
        }
    }

    areaBlast(position) {
        const blastRadius = 3 * this.area;
        const blastDamage = this.damage * 0.4;

        this.game.particles.spawnDeathExplosion(position, this.area);

        for (const enemy of this.game.entities.enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.position.x - position.x;
            const dz = enemy.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < blastRadius && !this.piercedEnemies.includes(enemy)) {
                enemy.takeDamage(blastDamage, false);
            }
        }
    }

    explode(position) {
        console.log('💥 EXPLOSION!');
        this.game.particles.spawnDeathExplosion(position, 2);
        this.game.screenShake(2, 0.2);

        const explosionRadius = 4;
        const explosionDamage = this.damage * 0.6;

        for (const enemy of this.game.entities.enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.position.x - position.x;
            const dz = enemy.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < explosionRadius) {
                enemy.takeDamage(explosionDamage, false);
            }
        }
    }

    getClosestPointOnSegment2D(A, B, P) {
        const ABx = B.x - A.x;
        const ABz = B.z - A.z;
        const APx = P.x - A.x;
        const APz = P.z - A.z;

        const ab2 = ABx * ABx + ABz * ABz;

        if (ab2 === 0) return new THREE.Vector3(A.x, A.y, A.z);

        const t = Math.max(0, Math.min(1, (APx * ABx + APz * ABz) / ab2));
        return new THREE.Vector3(
            A.x + ABx * t,
            A.y,
            A.z + ABz * t
        );
    }

    createHitEffect() {
        this.game.particles.spawnImpactEffect(this.position, this.isCritical);
        this.game.particles.spawnHitSpark(this.position, this.isCritical ? 20 : 10);
    }
}
