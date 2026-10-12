// Hades-inspired Boon system for weapon modifiers
export class WeaponModifierSystem {
    constructor(game) {
        this.game = game;

        // Available modifiers (boons)
        this.modifierPool = this.createModifierPool();
    }

    createModifierPool() {
        return {
            // Zeus - Lightning/Chain effects
            zeus_chain: {
                name: "Zeus' Chain Lightning",
                type: 'chain',
                description: "Projectiles chain to nearby enemies",
                rarity: 'rare',
                compatibleWith: ['slow'], // Works best with slow weapons
                effect: (weapon) => {
                    weapon.specialMechanic = 'chain_lightning';
                }
            },

            zeus_static: {
                name: "Zeus' Static Discharge",
                type: 'damage_percent',
                value: 0.5,
                description: "+50% damage",
                rarity: 'common',
                compatibleWith: ['all']
            },

            // Ares - Damage over time
            ares_doom: {
                name: "Ares' Doom",
                type: 'doom',
                description: "Hits inflict escalating damage",
                rarity: 'epic',
                compatibleWith: ['slow'],
                effect: (weapon) => {
                    weapon.specialMechanic = 'doom';
                }
            },

            // Artemis - Critical hits
            artemis_crit: {
                name: "Artemis' Deadly Strike",
                type: 'crit',
                description: "+30% crit chance",
                rarity: 'rare',
                compatibleWith: ['slow'],
                effect: (weapon) => {
                    weapon.critBonus = 0.3;
                }
            },

            artemis_pierce: {
                name: "Artemis' True Shot",
                type: 'pierce',
                value: 2,
                description: "Projectiles pierce 2 more enemies",
                rarity: 'common',
                compatibleWith: ['all']
            },

            // Aphrodite - Percentage damage
            aphrodite_crush: {
                name: "Aphrodite's Heartbreak",
                type: 'damage_percent',
                value: 0.8,
                description: "+80% damage",
                rarity: 'epic',
                compatibleWith: ['slow']
            },

            // Poseidon - Knockback
            poseidon_wave: {
                name: "Poseidon's Tidal Wave",
                type: 'knockback',
                description: "Massive knockback and damage",
                rarity: 'rare',
                compatibleWith: ['slow'],
                effect: (weapon) => {
                    weapon.knockback = 15;
                    weapon.damage *= 1.3;
                }
            },

            // Dionysus - Damage over time
            dionysus_festive: {
                name: "Dionysus' Festive Fog",
                type: 'poison',
                description: "Projectiles poison enemies",
                rarity: 'common',
                compatibleWith: ['fast'],
                effect: (weapon) => {
                    weapon.applyPoison = true;
                }
            },

            // Demeter - Slow/Freeze
            demeter_frost: {
                name: "Demeter's Frost Strike",
                type: 'slow',
                description: "Hits slow enemies",
                rarity: 'common',
                compatibleWith: ['all'],
                effect: (weapon) => {
                    weapon.applySlow = true;
                }
            },

            // Athena - Deflect
            athena_deflect: {
                name: "Athena's Divine Dash",
                type: 'deflect',
                description: "Projectiles deflect back",
                rarity: 'epic',
                compatibleWith: ['all'],
                effect: (weapon) => {
                    weapon.deflect = true;
                }
            },

            // Generic powerful modifiers
            multishot: {
                name: "Multishot",
                type: 'multishot',
                value: 2,
                description: "Fire 2 additional projectiles",
                rarity: 'rare',
                compatibleWith: ['all']
            },

            explosive_rounds: {
                name: "Explosive Rounds",
                type: 'explosive',
                description: "Projectiles explode on impact",
                rarity: 'epic',
                compatibleWith: ['slow']
            },

            rapid_fire: {
                name: "Rapid Fire",
                type: 'fire_rate',
                value: 0.7,
                description: "30% faster fire rate",
                rarity: 'common',
                compatibleWith: ['all']
            },

            lifesteal: {
                name: "Vampiric Rounds",
                type: 'lifesteal',
                value: 0.15,
                description: "Heal 15% of damage dealt",
                rarity: 'epic',
                compatibleWith: ['all']
            },

            area_increase: {
                name: "Blast Radius",
                type: 'area',
                value: 0.5,
                description: "+50% area of effect",
                rarity: 'common',
                compatibleWith: ['all']
            }
        };
    }

    // Get random modifier compatible with weapon
    getRandomModifier(weapon) {
        const weaponSpeed = weapon.fireRate < 200 ? 'fast' : 'slow';
        const compatibleModifiers = Object.values(this.modifierPool).filter(mod => {
            return mod.compatibleWith.includes('all') || mod.compatibleWith.includes(weaponSpeed);
        });

        if (compatibleModifiers.length === 0) return null;

        return compatibleModifiers[Math.floor(Math.random() * compatibleModifiers.length)];
    }

    // Apply modifier to weapon
    applyModifier(weapon, modifierKey) {
        const modifier = this.modifierPool[modifierKey];
        if (!modifier) {
            console.warn(`Unknown modifier: ${modifierKey}`);
            return false;
        }

        // Add modifier to weapon
        weapon.addModifier(modifier);

        // Apply special effect if exists
        if (modifier.effect) {
            modifier.effect(weapon);
        }

        // Check for Duo Boons after adding modifier
        this.checkDuoBoon(weapon);

        return true;
    }

    // Duo boons - combine two modifiers for unique effect
    checkDuoBoon(weapon) {
        const modifierNames = weapon.modifiers.map(m => m.name);

        // Zeus + Artemis = Chain Lightning Crits
        if (modifierNames.includes("Zeus' Chain Lightning") && modifierNames.includes("Artemis' Deadly Strike")) {
            weapon.addModifier({
                name: "Lightning Rod (DUO)",
                type: 'duo',
                description: "Chain lightning has increased crit chance",
                effect: (w) => {
                    w.critBonus = (w.critBonus || 0) + 0.3;
                    w.specialMechanic = 'chain_lightning_crit';
                }
            });
            console.log("🌟 DUO BOON: Lightning Rod activated!");
        }

        // Ares + Aphrodite = Massive Doom damage
        if (modifierNames.includes("Ares' Doom") && modifierNames.includes("Aphrodite's Heartbreak")) {
            weapon.addModifier({
                name: "Heartbreak Strike (DUO)",
                type: 'duo',
                description: "Doom damage is massively increased",
                effect: (w) => {
                    w.damage *= 1.5;
                }
            });
            console.log("🌟 DUO BOON: Heartbreak Strike activated!");
        }
    }
}
