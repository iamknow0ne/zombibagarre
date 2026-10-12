export class SkillSystem {
    constructor(game) {
        this.game = game;

        // Available skills/perks
        this.skills = {
            // Combat perks
            criticalMaster: {
                name: 'Critical Master',
                description: '+5% crit chance',
                icon: '🎯',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    this.game.combat.critChance = (this.game.combat.critChance || 0.1) + 0.05;
                }
            },
            deadlyShots: {
                name: 'Deadly Shots',
                description: '+25% crit damage',
                icon: '💀',
                maxLevel: 4,
                level: 0,
                effect: () => {
                    this.game.combat.critMultiplier = (this.game.combat.critMultiplier || 2.0) + 0.25;
                }
            },
            rapidFire: {
                name: 'Rapid Fire',
                description: '-15% fire rate',
                icon: '⚡',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    const player = this.game.entities.player;
                    player.fireRate = Math.max(50, player.fireRate * 0.85);
                }
            },

            // Survival perks
            ironSkin: {
                name: 'Iron Skin',
                description: '+100 max HP',
                icon: '🛡️',
                maxLevel: 5,
                level: 0,
                effect: () => {
                    const player = this.game.entities.player;
                    player.maxHealth += 100;
                    player.health = player.maxHealth;
                    this.game.events.emit('player-healed', {
                        health: player.health,
                        maxHealth: player.maxHealth
                    });
                }
            },
            quickFeet: {
                name: 'Quick Feet',
                description: '+15% speed',
                icon: '💨',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    this.game.entities.player.speed *= 1.15;
                }
            },
            dashMaster: {
                name: 'Dash Master',
                description: '-30% dash cooldown',
                icon: '🌀',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    this.game.entities.player.dashMaxCooldown *= 0.7;
                }
            },

            // Economic perks
            greedy: {
                name: 'Greedy',
                description: '+50% money from kills',
                icon: '💰',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    // Applied in zombie death
                }
            },
            experienced: {
                name: 'Experienced',
                description: '+30% XP gain',
                icon: '📈',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    // Applied in XP gain
                }
            },

            // Multi-weapon perks
            dualWield: {
                name: 'Dual Wield',
                description: 'Unlock 2nd weapon slot',
                icon: '🔫🔫',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    if (this.game.multiWeaponSystem && this.game.multiWeaponSystem.canUnlockSlot()) {
                        this.game.multiWeaponSystem.unlockSlot();
                        console.log('🔓 2nd weapon slot unlocked!');
                    }
                }
            },
            tripleWield: {
                name: 'Triple Wield',
                description: 'Unlock 3rd weapon slot',
                icon: '🔫🔫🔫',
                maxLevel: 1,
                level: 0,
                requires: 'dualWield', // Requires dual wield first
                effect: () => {
                    if (this.game.multiWeaponSystem && this.game.multiWeaponSystem.canUnlockSlot()) {
                        this.game.multiWeaponSystem.unlockSlot();
                        console.log('🔓 3rd weapon slot unlocked!');
                    }
                }
            },

            // Weapon-specific perks
            shotgunMaster: {
                name: 'Shotgun Master',
                description: '+2 shotgun pellets',
                icon: '🔫',
                maxLevel: 3,
                level: 0,
                requiresWeapon: 'shotgun',
                effect: () => {
                    const weapon = this.findPlayerWeapon('shotgun');
                    if (weapon) weapon.projectileCount += 2;
                }
            },
            rifleMaster: {
                name: 'Rifle Master',
                description: '+50% rifle damage',
                icon: '🎯',
                maxLevel: 3,
                level: 0,
                requiresWeapon: 'rifle',
                effect: () => {
                    const weapon = this.findPlayerWeapon('rifle');
                    if (weapon) weapon.damage = Math.floor(weapon.damage * 1.5);
                }
            },
            smgMaster: {
                name: 'SMG Master',
                description: '-20% SMG fire rate',
                icon: '🔥',
                maxLevel: 3,
                level: 0,
                requiresWeapon: 'smg',
                effect: () => {
                    const weapon = this.findPlayerWeapon('smg');
                    if (weapon) weapon.fireRate = Math.floor(weapon.fireRate * 0.8);
                }
            },

            // Special perks
            vampire: {
                name: 'Vampire',
                description: 'Heal 5 HP per kill',
                icon: '🩸',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    // Applied in zombie death
                }
            },
            explosiveRounds: {
                name: 'Explosive Rounds',
                description: '10% chance for explosion',
                icon: '💥',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    // Applied in projectile hit
                }
            },

            // Weapon Modifier perks (Hades-style boons)
            zeus_blessing: {
                name: "Zeus' Blessing",
                description: 'Current weapon chains lightning',
                icon: '⚡',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'zeus_chain');
                    }
                }
            },
            artemis_blessing: {
                name: "Artemis' Blessing",
                description: 'Current weapon +30% crit chance',
                icon: '🏹',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'artemis_crit');
                    }
                }
            },
            aphrodite_blessing: {
                name: "Aphrodite's Blessing",
                description: 'Current weapon +80% damage',
                icon: '💖',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'aphrodite_crush');
                    }
                }
            },
            multishot_blessing: {
                name: 'Multishot',
                description: '+2 projectiles to current weapon',
                icon: '🎯',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'multishot');
                    }
                }
            },
            lifesteal_blessing: {
                name: 'Vampiric Rounds',
                description: 'Weapon heals 15% of damage',
                icon: '🩸',
                maxLevel: 1,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'lifesteal');
                    }
                }
            },
            piercing_shots: {
                name: 'Piercing Shots',
                description: '+2 pierce to current weapon',
                icon: '➡️',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'artemis_pierce');
                    }
                }
            },
            area_boost: {
                name: 'Blast Radius',
                description: '+50% area to current weapon',
                icon: '💥',
                maxLevel: 3,
                level: 0,
                effect: () => {
                    const weapon = this.game.entities.player.getCurrentWeapon();
                    if (weapon) {
                        this.game.weaponModifiers.applyModifier(weapon, 'area_increase');
                    }
                }
            }
        };

        console.log('🎓 Skill system initialized');
    }

    findPlayerWeapon(type) {
        const player = this.game.entities.player;
        if (!player) return null;
        return player.weapons.find(w => w.type === type);
    }

    getAvailableSkills() {
        const player = this.game.entities.player;
        const available = [];

        for (const [key, skill] of Object.entries(this.skills)) {
            // Skip maxed skills
            if (skill.level >= skill.maxLevel) continue;

            // Skip weapon-specific skills if weapon not unlocked
            if (skill.requiresWeapon) {
                const hasWeapon = player.weapons.some(w => w.type === skill.requiresWeapon);
                if (!hasWeapon) continue;
            }

            // Skip skills with unmet prerequisites
            if (skill.requires) {
                const prereqSkill = this.skills[skill.requires];
                if (!prereqSkill || prereqSkill.level === 0) {
                    continue; // Prerequisite not unlocked yet
                }
            }

            available.push({ key, ...skill });
        }

        // Randomly select 3 skills to offer
        const shuffled = available.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    applySkill(skillKey) {
        const skill = this.skills[skillKey];
        if (!skill) return false;

        if (skill.level >= skill.maxLevel) {
            console.log(`❌ ${skill.name} is already maxed out`);
            return false;
        }

        skill.level++;
        skill.effect();

        console.log(`✅ Acquired ${skill.name} (Level ${skill.level}/${skill.maxLevel})`);
        return true;
    }

    getSkillLevel(skillKey) {
        return this.skills[skillKey]?.level || 0;
    }

    // Modifiers for other systems
    getMoneyMultiplier() {
        return 1 + (this.getSkillLevel('greedy') * 0.5);
    }

    getXPMultiplier() {
        return 1 + (this.getSkillLevel('experienced') * 0.3);
    }

    hasVampire() {
        return this.getSkillLevel('vampire') > 0;
    }

    hasExplosiveRounds() {
        return this.getSkillLevel('explosiveRounds') > 0;
    }
}
