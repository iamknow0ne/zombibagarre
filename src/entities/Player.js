import * as THREE from 'three';
import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { Weapon } from './Weapon.js';
import { createEliteSoldierMesh } from './PlayerGraphics.js';

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

        // Economy
        this.gold = 150; // Starting gold

        // Character perks
        this.damageResistance = 0; // Percentage damage reduction (0-1)

        // Weapon system
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.addWeapon('pistol'); // Start with pistol
        this.lastWeaponSwitch = 0;
        this.weaponSwitchCooldown = 200; // ms

        // Dash system
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.isDashing = false;
        this.dashSpeed = 15;
        this.dashAngle = 0;
        this.iframes = 0;
        this.dashMaxCooldown = 1500;
        this.dashMaxDuration = 200;

        // Active powerup buffs
        this.activePowerups = {
            speed: { active: false, duration: 0, multiplier: 1 },
            damage: { active: false, duration: 0, multiplier: 1 },
            fireRate: { active: false, duration: 0, multiplier: 1 }
        };

        // Visual feedback
        this.damageFlashTime = 0;

        // Map bounds (match ground size from SceneManager)
        this.mapBounds = { minX: -240, maxX: 240, minZ: -240, maxZ: 240 };
    }

    async init() {
        // Create simple player mesh (will be replaced with GLTF model later)
        this.createMesh();
        console.log('👤 Player created');
    }

    createMesh() {
        // Use stunning AAA graphics system
        const result = createEliteSoldierMesh(this.scene, this.position);

        this.mesh = result.mesh;
        this.bodyMesh = result.bodyMesh;
        this.helmetMesh = result.helmetMesh;
        this.weaponIndicator = result.weaponIndicator;
        this.weaponCore = result.weaponCore;

        console.log('✨ ELITE SOLDIER deployed with stunning AAA graphics');
        return;

        // === OLD CODE BELOW (disabled) ===
        const group = new THREE.Group();

        // === TORSO (Tactical Vest) ===
        const torsoGeo = new THREE.BoxGeometry(1.2, 1.8, 0.7);
        const torsoMat = this.createTacticalArmorMaterial(0x3a4a3a); // Dark military green
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.2;
        torso.castShadow = true;
        torso.receiveShadow = true;
        group.add(torso);

        // Armor plates (front)
        const plateMat = this.createMetalPlateMaterial();
        const plateGeo = new THREE.BoxGeometry(0.8, 0.6, 0.1);

        const chestPlate = new THREE.Mesh(plateGeo, plateMat);
        chestPlate.position.set(0, 1.5, 0.4);
        chestPlate.castShadow = true;
        group.add(chestPlate);

        const abPlate = new THREE.Mesh(plateGeo, plateMat);
        abPlate.position.set(0, 0.8, 0.4);
        abPlate.castShadow = true;
        group.add(abPlate);

        // === HEAD (Helmet) ===
        const headGeo = new THREE.SphereGeometry(0.45, 24, 24);
        const helmetMat = this.createHelmetMaterial();
        const head = new THREE.Mesh(headGeo, helmetMat);
        head.position.y = 2.4;
        head.scale.set(1, 1.1, 1); // Slightly elongated
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);

        // Helmet visor (glowing)
        const visorGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8,
            metalness: 1.0,
            roughness: 0.1
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 2.4, 0.42);
        group.add(visor);

        // === ARMS ===
        const armGeo = new THREE.CapsuleGeometry(0.15, 1.2, 8, 16);
        const armMat = this.createTacticalArmorMaterial(0x2a3a2a);

        // Left arm
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.7, 1.2, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        group.add(leftArm);

        // Right arm (weapon holding)
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.7, 1.2, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        group.add(rightArm);

        // === LEGS ===
        const legGeo = new THREE.CapsuleGeometry(0.18, 1.3, 8, 16);
        const legMat = this.createTacticalArmorMaterial(0x2a2a2a);

        // Left leg
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.3, 0.3, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        // Right leg
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.3, 0.3, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // === WEAPON (Glowing Energy Rifle) ===
        const weaponGroup = new THREE.Group();

        // Rifle body
        const rifleBodyGeo = new THREE.BoxGeometry(0.15, 0.15, 1.2);
        const rifleMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.3,
            metalness: 0.9,
            envMapIntensity: 1.5
        });
        const rifleBody = new THREE.Mesh(rifleBodyGeo, rifleMat);
        weaponGroup.add(rifleBody);

        // Energy core (glowing)
        const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2.0,
            metalness: 0.5,
            roughness: 0.1
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.rotation.z = Math.PI / 2;
        core.position.set(0, 0, 0.3);
        weaponGroup.add(core);

        weaponGroup.position.set(0.5, 1.3, 0.5);
        weaponGroup.rotation.y = Math.PI / 4;
        group.add(weaponGroup);
        this.weaponIndicator = weaponGroup;
        this.weaponCore = core; // Store reference to the glowing core for color updates

        // === RIM LIGHTING EFFECT ===
        this.addRimLighting(group);

        // === SETUP ===
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Store references
        this.bodyMesh = torso;
        this.helmetMesh = head;

        console.log('✨ AAA Character created with advanced materials');
    }

    /**
     * Create tactical armor material with PBR properties
     */
    createTacticalArmorMaterial(baseColor) {
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.8,
            metalness: 0.3,
            envMapIntensity: 1.0,
            // Adds subtle normal variation
            bumpScale: 0.05
        });
    }

    /**
     * Create metal plate material with high reflectivity
     */
    createMetalPlateMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.4,
            metalness: 0.95,
            envMapIntensity: 2.0
        });
    }

    /**
     * Create helmet material with advanced reflection
     */
    createHelmetMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x2a3a3a,
            roughness: 0.3,
            metalness: 0.8
        });
    }

    /**
     * Add rim lighting for character pop
     */
    addRimLighting(group) {
        // Rim light effect using point light
        const rimLight = new THREE.PointLight(0x00ffff, 2, 3);
        rimLight.position.set(0, 2, -1.5); // Behind character
        group.add(rimLight);

        // Store for animation
        this.rimLight = rimLight;
    }

    update(deltaTime) {
        // Handle input (combine keyboard and touch)
        const keyboardMovement = this.game.input.getMovementVector();
        const touchMovement = this.game.touchControls ? this.game.touchControls.getMovementVector() : { x: 0, y: 0 };

        // Use touch if active, otherwise keyboard
        const movement = {
            x: touchMovement.x !== 0 ? touchMovement.x : keyboardMovement.x,
            z: touchMovement.y !== 0 ? touchMovement.y : keyboardMovement.z
        };

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
            // Normal movement (with speed buff)
            const speedMultiplier = this.activePowerups.speed.active ? this.activePowerups.speed.multiplier : 1;
            this.velocity.set(movement.x * this.speed * speedMultiplier, 0, movement.z * this.speed * speedMultiplier);

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

        // Shooting (auto-fire towards nearest enemy with fire rate buff)
        const weapon = this.getCurrentWeapon();
        let currentFireRate = weapon ? weapon.fireRate : this.fireRate;

        // Apply fire rate buff
        if (this.activePowerups.fireRate.active) {
            currentFireRate *= this.activePowerups.fireRate.multiplier;
        }

        this.lastShot += deltaTime * 1000;
        if (this.lastShot >= currentFireRate) {
            this.shoot();
            this.lastShot = 0;
        }

        // Weapon switching (1-9, 0 keys) with cooldown
        this.lastWeaponSwitch += deltaTime * 1000;
        if (this.lastWeaponSwitch >= this.weaponSwitchCooldown) {
            const weaponKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
            for (let i = 0; i < weaponKeys.length; i++) {
                if (this.game.input.isKeyPressed(weaponKeys[i])) {
                    const weaponIndex = i === 9 ? 9 : i; // 0 key = 10th weapon (index 9)
                    this.switchWeapon(weaponIndex);
                    this.lastWeaponSwitch = 0;
                    break;
                }
            }
        }

        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= deltaTime;
            if (this.damageFlashTime <= 0) {
                this.bodyMesh.material.emissive.setHex(0x000000);
            }
        }

        // Update active powerup durations
        let powerupsChanged = false;
        for (const [key, buff] of Object.entries(this.activePowerups)) {
            if (buff.active) {
                buff.duration -= deltaTime * 1000;
                if (buff.duration <= 0) {
                    buff.active = false;
                    buff.duration = 0;
                    console.log(`⏰ ${key} powerup expired`);
                    powerupsChanged = true;
                } else {
                    powerupsChanged = true; // Update timer display
                }
            }
        }
        if (powerupsChanged) {
            this.updatePowerupDisplay();
        }

        // Visual feedback for invincibility
        if (this.iframes > 0) {
            // Flash the player body to indicate invincibility
            const flashSpeed = 10;
            const flash = Math.sin(Date.now() * flashSpeed * 0.001) > 0;
            this.bodyMesh.material.opacity = flash ? 0.3 : 1.0;
            this.bodyMesh.material.transparent = true;
        } else {
            this.bodyMesh.material.opacity = 1.0;
            this.bodyMesh.material.transparent = false;
        }

        // Weapon indicator pulse (use weaponCore for the glowing effect)
        if (this.weaponCore && this.weaponCore.material) {
            this.weaponCore.material.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
        }

        // Check obstacle collision before moving
        if (this.game.sceneManager && this.game.sceneManager.obstacleSystem) {
            const nextPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
            const playerRadius = 0.8; // Player collision radius

            if (this.game.sceneManager.obstacleSystem.checkCollision(nextPosition, playerRadius)) {
                // Collision detected - try sliding along obstacles
                // Try X-only movement
                const nextX = this.position.clone();
                nextX.x = nextPosition.x;
                if (!this.game.sceneManager.obstacleSystem.checkCollision(nextX, playerRadius)) {
                    this.velocity.z = 0; // Slide along X axis
                } else {
                    // Try Z-only movement
                    const nextZ = this.position.clone();
                    nextZ.z = nextPosition.z;
                    if (!this.game.sceneManager.obstacleSystem.checkCollision(nextZ, playerRadius)) {
                        this.velocity.x = 0; // Slide along Z axis
                    } else {
                        // Can't move in either direction - stop
                        this.velocity.set(0, 0, 0);
                    }
                }
            }
        }

        super.update(deltaTime);

        // Clamp position to map bounds
        this.position.x = Math.max(this.mapBounds.minX, Math.min(this.mapBounds.maxX, this.position.x));
        this.position.z = Math.max(this.mapBounds.minZ, Math.min(this.mapBounds.maxZ, this.position.z));
        this.position.y = 0; // Keep on ground

        // Update mesh position after clamping
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
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

        // Check if multi-weapon system is available and has weapons
        if (this.game.multiWeaponSystem) {
            const activeWeapons = this.game.multiWeaponSystem.getActiveWeapons();

            if (activeWeapons.length > 0) {
                // Use multi-weapon system
                this.game.multiWeaponSystem.fireAll(direction, this.position);

                // Calculate average recoil from all weapons
                let totalRecoil = 0;
                for (const slot of activeWeapons) {
                    const weapon = slot.weapon;
                    const recoil = weapon.type === 'shotgun' ? 0.8 :
                                  weapon.type === 'pistol' ? 0.15 :
                                  weapon.type === 'rifle' ? 0.1 :
                                  weapon.type === 'smg' ? 0.08 : 0.1;
                    totalRecoil += recoil;
                }
                const avgRecoil = totalRecoil / activeWeapons.length;
                this.game.screenShake(avgRecoil * activeWeapons.length * 0.5, 0.08);

                this.updateWeaponIndicator();
                this.createMuzzleFlash();
                return;
            }
        }

        // Fallback to single weapon system
        const weapon = this.getCurrentWeapon();
        if (weapon) {
            weapon.fire(direction);
            this.updateWeaponIndicator();

            // Weapon recoil (camera shake)
            const recoilIntensity = weapon.type === 'shotgun' ? 0.8 :
                                   weapon.type === 'pistol' ? 0.15 :
                                   weapon.type === 'rifle' ? 0.1 :
                                   weapon.type === 'smg' ? 0.08 : 0.1;
            this.game.screenShake(recoilIntensity, 0.08);
        }

        // Muzzle flash effect
        this.createMuzzleFlash();
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;

        for (const enemy of this.game.entities.enemies) {
            // Use 2D distance
            const dx = enemy.position.x - this.position.x;
            const dz = enemy.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

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

        // Apply damage resistance (Tank perk)
        const actualDamage = damage * (1 - this.damageResistance);

        this.health -= actualDamage;
        this.game.events.emit('player-damaged', { health: this.health, maxHealth: this.maxHealth });

        // Reset combo on damage
        if (this.game.combat) {
            this.game.combat.resetCombo();
        }

        // Audio feedback
        if (this.game.audio) {
            this.game.audio.playPlayerHurt();
        }

        // Visual feedback
        this.bodyMesh.material.emissive.setHex(0xff0000);
        this.damageFlashTime = 0.2;

        // Screen shake
        this.game.screenShake(2, 0.2);

        console.log(`💔 Player took ${actualDamage.toFixed(1)} damage (${damage} - ${(this.damageResistance * 100).toFixed(0)}% resistance). Health: ${this.health.toFixed(0)}/${this.maxHealth}`);

        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.game.events.emit('player-healed', { health: this.health, maxHealth: this.maxHealth });
        console.log(`💚 Player healed ${amount}. Health: ${this.health}/${this.maxHealth}`);
    }

    addGold(amount) {
        // Delegate to EconomySystem for consistency
        if (this.game.economy) {
            this.game.economy.addGold(amount);
        } else {
            // Fallback if economy system not available
            this.gold += amount;
            this.game.events.emit('gold-changed', {
                amount: this.gold,
                added: amount
            });
            console.log(`💰 +${amount} gold (Total: ${this.gold})`);
        }
    }

    die() {
        console.log('💀 Player died');

        // Reset kill streak and combo
        if (this.game.combat) {
            this.game.combat.resetKillStreak();
        }

        this.game.gameOver();
        this.destroy();
    }

    addWeapon(weaponType) {
        // Don't add duplicate weapons
        if (this.weapons.some(w => w.type === weaponType)) {
            console.log(`Already have ${weaponType}`);
            return;
        }

        const weapon = new Weapon(weaponType, this, this.game);
        this.weapons.push(weapon);
        console.log(`🔫 Added weapon: ${weaponType}`);

        // Auto-distribute weapons to multi-weapon system
        if (this.game.multiWeaponSystem) {
            this.game.multiWeaponSystem.autoDistribute(this.weapons);
        }

        // Auto-switch to new weapon if it's not pistol
        if (weaponType !== 'pistol') {
            this.currentWeaponIndex = this.weapons.length - 1;
            this.updateWeaponIndicator();
            this.game.events.emit('weapon-changed', { weapon: weaponType });
        }
    }

    activatePowerup(type, duration, multiplier) {
        if (this.activePowerups[type]) {
            // Stack duration if buff is active
            if (this.activePowerups[type].active) {
                this.activePowerups[type].duration += duration;
                // Max 3 stacks (15 seconds)
                this.activePowerups[type].duration = Math.min(this.activePowerups[type].duration, duration * 3);
                // Increase multiplier slightly for stacking (max 2x base)
                this.activePowerups[type].multiplier = Math.min(multiplier * 1.5, multiplier * 2);
                console.log(`⬆️ ${type} powerup stacked! Duration: ${this.activePowerups[type].duration}ms`);
            } else {
                this.activePowerups[type].active = true;
                this.activePowerups[type].duration = duration;
                this.activePowerups[type].multiplier = multiplier;
                console.log(`✨ ${type} powerup activated!`);
            }

            // Update HUD
            this.updatePowerupDisplay();
        }
    }

    updatePowerupDisplay() {
        const container = document.getElementById('activePowerupsDisplay');
        if (!container) return;

        // Clear existing indicators
        container.innerHTML = '';

        // Add indicators for active powerups
        for (const [type, buff] of Object.entries(this.activePowerups)) {
            if (buff.active) {
                const indicator = document.createElement('div');
                indicator.className = `powerup-indicator ${type}`;
                indicator.id = `powerup-${type}`;

                const icon = type === 'speed' ? '💨' : type === 'damage' ? '🔥' : '⚡';
                const name = type === 'speed' ? 'SPEED BOOST' : type === 'damage' ? 'DAMAGE +50%' : 'FIRE RATE +100%';
                const timeLeft = Math.ceil(buff.duration / 1000);

                indicator.innerHTML = `
                    <span>${icon} ${name}</span>
                    <span class="powerup-timer">${timeLeft}s</span>
                `;
                container.appendChild(indicator);
            }
        }
    }

    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex] || null;
    }

    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
            this.updateWeaponIndicator();
            const weapon = this.weapons[index];
            this.game.events.emit('weapon-changed', { weapon: weapon.type });
            console.log(`🔄 Switched to ${weapon.type}`);
        }
    }

    updateWeaponIndicator() {
        if (!this.weaponCore) return;

        const weapon = this.getCurrentWeapon();
        if (weapon && weapon.color) {
            this.weaponCore.material.color.setHex(weapon.color);
            this.weaponCore.material.emissive.setHex(weapon.color);
        }
    }
}