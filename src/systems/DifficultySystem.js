/**
 * DifficultySystem - Manages 3 difficulty levels with progressive scaling
 * Affects enemy stats, gold drops, XP, and boss encounters
 */

export class DifficultySystem {
    constructor(game) {
        this.game = game;
        this.currentDifficulty = 'normal'; // 'easy', 'normal', 'hard'

        // Difficulty configurations
        this.difficulties = {
            easy: {
                name: 'Easy',
                description: 'Casual survival - Learn the ropes',
                icon: '🌱',
                color: '#00ff00',

                // Enemy modifiers
                zombieHealthMultiplier: 0.5,     // Very weak zombies
                zombieDamageMultiplier: 0.5,     // Low damage
                zombieSpeedMultiplier: 0.7,      // Slow zombies
                zombieCountMultiplier: 0.6,      // Few zombies
                eliteSpawnChance: 0.03,          // 3% elites

                // Boss modifiers
                bossHealthMultiplier: 0.5,
                bossAggressionMultiplier: 0.6,
                bossDamageMultiplier: 0.5,

                // Rewards
                goldDropMultiplier: 1.5,         // More gold for easier mode
                expMultiplier: 1.8,
                specialLootChance: 0.2,

                // Wave scaling
                waveScalingFactor: 0.06,         // +6% per wave
                maxZombiesOnScreen: 60
            },

            normal: {
                name: 'Normal',
                description: 'Standard survival challenge',
                icon: '⚔️',
                color: '#ffaa00',

                zombieHealthMultiplier: 1.8,     // Increased significantly
                zombieDamageMultiplier: 1.8,     // Increased significantly
                zombieSpeedMultiplier: 1.3,      // Faster
                zombieCountMultiplier: 1.8,      // More zombies
                eliteSpawnChance: 0.20,          // 20% elites

                bossHealthMultiplier: 2.0,       // Double health
                bossAggressionMultiplier: 1.5,   // More aggressive
                bossDamageMultiplier: 2.0,       // Double damage

                goldDropMultiplier: 1.3,
                expMultiplier: 1.3,
                specialLootChance: 0.15,

                waveScalingFactor: 0.18,         // +18% per wave
                maxZombiesOnScreen: 250
            },

            hard: {
                name: 'Hard',
                description: 'NIGHTMARE MODE - Only for veterans!',
                icon: '💀',
                color: '#ff0000',

                zombieHealthMultiplier: 3.5,      // MASSIVE health increase
                zombieDamageMultiplier: 3.0,      // Triple damage!
                zombieSpeedMultiplier: 1.8,       // Much faster
                zombieCountMultiplier: 3.5,       // Way more zombies!
                eliteSpawnChance: 0.45,           // 45% elites (nearly half!)

                bossHealthMultiplier: 4.0,        // 4x boss health
                bossAggressionMultiplier: 2.0,    // 2x aggression
                bossDamageMultiplier: 3.5,        // 3.5x damage

                goldDropMultiplier: 3.0,          // Better rewards for insane risk
                expMultiplier: 2.5,
                specialLootChance: 0.4,

                waveScalingFactor: 0.25,          // +25% PER WAVE!
                maxZombiesOnScreen: 400           // 400 zombies max!
            }
        };

        console.log('🎯 Difficulty system initialized');
    }

    /**
     * Set the current difficulty level
     */
    setDifficulty(difficulty) {
        if (!this.difficulties[difficulty]) {
            console.error(`❌ Invalid difficulty: ${difficulty}`);
            return false;
        }

        this.currentDifficulty = difficulty;
        console.log(`🎯 Difficulty set to: ${this.difficulties[difficulty].name}`);

        // Emit event for UI updates
        this.game.events.emit('difficulty-changed', {
            difficulty: difficulty,
            config: this.difficulties[difficulty]
        });

        return true;
    }

    /**
     * Get current difficulty configuration
     */
    getCurrent() {
        return this.difficulties[this.currentDifficulty];
    }

    /**
     * Get current difficulty name
     */
    getCurrentName() {
        return this.currentDifficulty;
    }

    /**
     * Get all available difficulties
     */
    getAll() {
        return this.difficulties;
    }

    /**
     * Calculate enemy stats based on difficulty and wave
     */
    calculateEnemyStats(baseStats, wave) {
        const diff = this.getCurrent();

        // Progressive wave scaling
        const waveMultiplier = 1 + (wave * diff.waveScalingFactor);

        // Apply difficulty multipliers
        return {
            health: Math.floor(baseStats.health * diff.zombieHealthMultiplier * waveMultiplier),
            damage: Math.floor(baseStats.damage * diff.zombieDamageMultiplier * waveMultiplier),
            speed: baseStats.speed * diff.zombieSpeedMultiplier,
            count: Math.floor(baseStats.count * diff.zombieCountMultiplier * waveMultiplier),
            eliteChance: diff.eliteSpawnChance
        };
    }

    /**
     * Calculate boss stats with special multipliers
     */
    calculateBossStats(baseStats, wave) {
        const diff = this.getCurrent();

        // Bosses scale more aggressively
        const waveMultiplier = 1 + (wave * diff.waveScalingFactor * 1.5);

        return {
            health: Math.floor(baseStats.health * diff.bossHealthMultiplier * waveMultiplier),
            damage: Math.floor(baseStats.damage * diff.bossDamageMultiplier * waveMultiplier),
            speed: baseStats.speed * diff.zombieSpeedMultiplier,
            aggression: diff.bossAggressionMultiplier
        };
    }

    /**
     * Get zombie count for current wave
     */
    getZombieCount(wave) {
        const diff = this.getCurrent();

        // Base count with logarithmic scaling for infinite progression
        const baseCount = 8;
        const linearGrowth = Math.floor(wave * 1.5);
        const logarithmicGrowth = Math.floor(Math.log(wave + 1) * 10);

        const calculatedCount = (baseCount + linearGrowth + logarithmicGrowth) * diff.zombieCountMultiplier;

        // Cap to max zombies for performance
        return Math.min(Math.floor(calculatedCount), diff.maxZombiesOnScreen);
    }

    /**
     * Get spawn interval (time between zombie spawns)
     */
    getSpawnInterval(wave) {
        const diff = this.getCurrent();

        // Base spawn interval: 1000ms
        // Decreases over time for massive hordes
        const baseInterval = 1000;
        const waveReduction = wave * 20; // -20ms per wave
        const minInterval = diff.zombieCountMultiplier > 1 ? 100 : 200; // Faster on hard

        return Math.max(minInterval, baseInterval - waveReduction);
    }

    /**
     * Should spawn elite zombie?
     */
    shouldSpawnElite() {
        const diff = this.getCurrent();
        return Math.random() < diff.eliteChance;
    }

    /**
     * Calculate gold reward for enemy type
     */
    calculateGoldReward(enemyType, wave) {
        const diff = this.getCurrent();

        // Base gold values
        const baseGold = {
            normal: 1,
            fast: 2,
            tank: 5,
            elite: 10,
            exploder: 3,
            toxic: 4,
            armored: 6,
            berserker: 7,
            spitter: 5,
            invisible: 8,
            boss: 100
        };

        const gold = (baseGold[enemyType] || 1);
        const waveBonus = Math.floor(wave / 5); // +1 gold per 5 waves

        return Math.floor((gold + waveBonus) * diff.goldDropMultiplier);
    }

    /**
     * Calculate XP reward
     */
    calculateXPReward(enemyType, wave) {
        const diff = this.getCurrent();

        const baseXP = {
            normal: 10,
            fast: 15,
            tank: 25,
            elite: 50,
            exploder: 20,
            toxic: 20,
            armored: 30,
            berserker: 35,
            spitter: 25,
            invisible: 40,
            boss: 500
        };

        const xp = (baseXP[enemyType] || 10);

        return Math.floor(xp * diff.expMultiplier);
    }

    /**
     * Should drop special loot?
     */
    shouldDropSpecialLoot() {
        const diff = this.getCurrent();
        return Math.random() < diff.specialLootChance;
    }

    /**
     * Get difficulty info for UI display
     */
    getDifficultyInfo(difficultyName) {
        const diff = this.difficulties[difficultyName];
        if (!diff) return null;

        return {
            name: diff.name,
            description: diff.description,
            icon: diff.icon,
            color: diff.color,
            stats: {
                'Enemy Health': `${Math.round(diff.zombieHealthMultiplier * 100)}%`,
                'Enemy Damage': `${Math.round(diff.zombieDamageMultiplier * 100)}%`,
                'Enemy Speed': `${Math.round(diff.zombieSpeedMultiplier * 100)}%`,
                'Horde Size': `${Math.round(diff.zombieCountMultiplier * 100)}%`,
                'Gold Rewards': `${Math.round(diff.goldDropMultiplier * 100)}%`,
                'Boss Health': `${Math.round(diff.bossHealthMultiplier * 100)}%`
            }
        };
    }

    /**
     * Get max zombies for current difficulty
     */
    getMaxZombies() {
        return this.getCurrent().maxZombiesOnScreen;
    }

    /**
     * Update difficulty (if settings change mid-game)
     */
    update(deltaTime) {
        // Can be used for dynamic difficulty adjustments in future
    }
}
