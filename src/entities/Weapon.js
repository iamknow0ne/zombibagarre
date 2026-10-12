import * as THREE from 'three';
import { Projectile } from './Projectile.js';

export class Weapon {
    constructor(type, player, game) {
        this.type = type;
        this.player = player;
        this.game = game;
        this.level = 1;
        this.maxLevel = 8;

        // Base stats
        this.fireRate = 500;
        this.damage = 20;
        this.projectileSpeed = 30;
        this.projectileCount = 1;
        this.spread = 0;
        this.pierce = 0; // How many enemies can projectile pierce
        this.area = 1; // Area multiplier
        this.knockback = 0;
        this.lifesteal = 0;

        // Special mechanics
        this.specialMechanic = null;
        this.modifiers = []; // Boon-like modifiers
        this.canEvolve = false;
        this.evolutionRequirement = null;

        this.setupWeaponType();
    }

    setupWeaponType() {
        switch (this.type) {
            case 'pistol':
                this.fireRate = 400;
                this.damage = 25;
                this.projectileSpeed = 35;
                this.color = 0xffffff;
                this.description = "Balanced starter weapon";
                this.evolutionRequirement = 'accuracy';
                break;

            case 'shotgun':
                this.fireRate = 1200;
                this.damage = 15;
                this.projectileSpeed = 25;
                this.projectileCount = 8;
                this.spread = 0.4;
                this.knockback = 5;
                this.color = 0xff6600;
                this.description = "Devastating close-range spread";
                this.evolutionRequirement = 'multishot';
                break;

            case 'rifle':
                this.fireRate = 120;
                this.damage = 12;
                this.projectileSpeed = 45;
                this.pierce = 1;
                this.color = 0x00ff00;
                this.description = "Rapid-fire precision weapon";
                this.evolutionRequirement = 'pierce';
                break;

            case 'smg':
                this.fireRate = 80;
                this.damage = 8;
                this.projectileSpeed = 30;
                this.spread = 0.15;
                this.color = 0x00ffff;
                this.description = "Bullet hose with high DPS";
                this.evolutionRequirement = 'speed';
                break;

            case 'sniper':
                this.fireRate = 1500;
                this.damage = 80;
                this.projectileSpeed = 60;
                this.pierce = 3;
                this.color = 0xff00ff;
                this.description = "One-shot powerhouse";
                this.specialMechanic = 'crit_chance_high';
                this.evolutionRequirement = 'critical';
                break;

            case 'launcher':
                this.fireRate = 2000;
                this.damage = 50;
                this.projectileSpeed = 20;
                this.area = 3;
                this.color = 0xff0000;
                this.description = "Explosive area damage";
                this.specialMechanic = 'explosive';
                this.evolutionRequirement = 'area';
                break;

            case 'laser':
                this.fireRate = 50;
                this.damage = 3;
                this.projectileSpeed = 50;
                this.pierce = 999;
                this.color = 0x00ffff;
                this.description = "Continuous beam weapon";
                this.specialMechanic = 'beam';
                this.evolutionRequirement = 'duration';
                break;

            case 'flamethrower':
                this.fireRate = 100;
                this.damage = 5;
                this.projectileSpeed = 15;
                this.projectileCount = 3;
                this.spread = 0.3;
                this.area = 1.5;
                this.color = 0xff4400;
                this.description = "Burns enemies over time";
                this.specialMechanic = 'burn';
                this.evolutionRequirement = 'burn';
                break;

            case 'railgun':
                this.fireRate = 2500;
                this.damage = 150;
                this.projectileSpeed = 80;
                this.pierce = 999;
                this.color = 0x8800ff;
                this.description = "Charge-up lightning bolt";
                this.specialMechanic = 'chain_lightning';
                this.evolutionRequirement = 'lightning';
                break;

            case 'minigun':
                this.fireRate = 60;
                this.damage = 6;
                this.projectileSpeed = 35;
                this.spread = 0.2;
                this.color = 0xffaa00;
                this.description = "Spin-up for maximum DPS";
                this.specialMechanic = 'spinup';
                this.evolutionRequirement = 'spinup';
                break;

            case 'crossbow':
                this.fireRate = 800;
                this.damage = 40;
                this.projectileSpeed = 40;
                this.pierce = 2;
                this.color = 0x00aa00;
                this.description = "Silent multi-pierce weapon";
                this.specialMechanic = 'multishot_pierce';
                this.evolutionRequirement = 'multishot';
                break;

            case 'plasma':
                this.fireRate = 300;
                this.damage = 30;
                this.projectileSpeed = 25;
                this.area = 2;
                this.color = 0x00ff88;
                this.description = "Energy balls that bounce";
                this.specialMechanic = 'bounce';
                this.evolutionRequirement = 'bounce';
                break;

            default:
                console.warn(`Unknown weapon type: ${this.type}`);
        }
    }

    // Add modifier (boon-like system)
    addModifier(modifier) {
        this.modifiers.push(modifier);
        console.log(`🔮 Added modifier to ${this.type}: ${modifier.name}`);
        this.applyModifier(modifier);
    }

    applyModifier(modifier) {
        switch (modifier.type) {
            case 'damage_percent':
                this.damage *= (1 + modifier.value);
                break;
            case 'fire_rate':
                this.fireRate *= modifier.value;
                break;
            case 'pierce':
                this.pierce += modifier.value;
                break;
            case 'area':
                this.area *= (1 + modifier.value);
                break;
            case 'multishot':
                this.projectileCount += modifier.value;
                break;
            case 'lifesteal':
                this.lifesteal += modifier.value;
                break;
            case 'chain':
                this.specialMechanic = 'chain';
                break;
            case 'explosive':
                this.specialMechanic = 'explosive';
                break;
        }
    }

    // Level up weapon
    levelUp() {
        if (this.level < this.maxLevel) {
            this.level++;

            // Increase stats per level
            this.damage += 5;
            this.fireRate = Math.max(50, this.fireRate * 0.95); // 5% faster

            console.log(`⬆️ ${this.type} leveled up to ${this.level}`);

            // Check for evolution
            if (this.level === this.maxLevel && this.canEvolve) {
                console.log(`✨ ${this.type} ready to evolve!`);
            }

            return true;
        }
        return false;
    }

    fire(direction) {
        // Muzzle flash and smoke
        const muzzlePos = this.player.position.clone();
        muzzlePos.y = 1.5;
        this.game.particles.spawnMuzzleFlash(muzzlePos, direction, this.type);

        // Shell ejection (not for energy weapons)
        if (!['laser', 'plasma', 'railgun'].includes(this.type)) {
            const shellPos = this.player.position.clone();
            shellPos.y = 1.3;
            shellPos.x += 0.3;
            this.game.particles.spawnShellEjection(shellPos, this.type);
        }

        // Special mechanics
        if (this.specialMechanic === 'spinup') {
            this.handleSpinup();
        }

        // Fire projectiles
        const count = this.projectileCount;
        for (let i = 0; i < count; i++) {
            const spreadX = (Math.random() - 0.5) * this.spread;
            const spreadZ = (Math.random() - 0.5) * this.spread;

            const spreadDirection = direction.clone();
            spreadDirection.x += spreadX;
            spreadDirection.z += spreadZ;
            spreadDirection.normalize();

            const projectile = this.createProjectile(spreadDirection);
            this.game.addProjectile(projectile);
        }

        // Special multi-shot mechanics
        if (this.specialMechanic === 'multishot_pierce') {
            // Crossbow fires additional arrows in a spread
            const angles = [-0.2, 0.2];
            angles.forEach(angle => {
                const rotatedDir = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                const projectile = this.createProjectile(rotatedDir);
                this.game.addProjectile(projectile);
            });
        }
    }

    handleSpinup() {
        if (!this.spinupLevel) this.spinupLevel = 0;

        this.spinupLevel = Math.min(5, this.spinupLevel + 1);
        this.damage = 6 + (this.spinupLevel * 2); // Ramp up damage
        this.fireRate = Math.max(30, 60 - (this.spinupLevel * 5)); // Faster fire rate
    }

    createProjectile(direction) {
        const startPosition = this.player.position.clone();
        startPosition.y = 1.5;

        // Calculate base damage: weapon damage + player damage upgrades
        let baseDamage = this.damage + this.player.damage;

        // Apply damage powerup buff
        if (this.player.activePowerups.damage.active) {
            baseDamage *= this.player.activePowerups.damage.multiplier;
        }

        // Check for critical hit (enhanced for sniper)
        let critChance = this.game.combat.critChance;
        if (this.specialMechanic === 'crit_chance_high') {
            critChance = 0.5; // 50% crit for sniper
        }
        const isCritical = Math.random() < critChance;
        const finalDamage = this.game.combat.calculateDamage(baseDamage, isCritical);

        const projectile = new Projectile(
            this.player.scene,
            startPosition,
            direction,
            finalDamage,
            this.projectileSpeed,
            'player',
            this.game,
            this.color
        );

        // Apply weapon properties to projectile
        projectile.isCritical = isCritical;
        projectile.pierce = this.pierce;
        projectile.area = this.area;
        projectile.knockback = this.knockback;
        projectile.lifesteal = this.lifesteal;
        projectile.specialMechanic = this.specialMechanic;
        projectile.sourceWeapon = this.type;

        // Special projectile modifications
        if (this.specialMechanic === 'explosive') {
            projectile.isExplosive = true;
        }
        if (this.specialMechanic === 'burn') {
            projectile.applyBurn = true;
        }
        if (this.specialMechanic === 'chain_lightning') {
            projectile.chainLightning = true;
        }
        if (this.specialMechanic === 'bounce') {
            projectile.bounceCount = 3;
        }

        return projectile;
    }

    getInfo() {
        return {
            type: this.type,
            level: this.level,
            fireRate: this.fireRate,
            damage: this.damage,
            description: this.description,
            modifiers: this.modifiers.length,
            canEvolve: this.level === this.maxLevel && this.canEvolve
        };
    }
}
