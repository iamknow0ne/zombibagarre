import { GoldPickup } from '../entities/GoldPickup.js';

/**
 * EconomySystem - Manages gold currency, drops, and special loot
 */
export class EconomySystem {
    constructor(game) {
        this.game = game;

        // Gold pickup tracking
        this.goldPickups = [];
        this.maxGoldOnScreen = 200; // Performance limit

        // Statistics
        this.totalGoldEarned = 0;
        this.totalGoldSpent = 0;

        // Special loot types
        this.specialLootTypes = {
            goldBag: {
                name: 'Gold Bag',
                multiplier: 5,
                chance: 0.05, // 5% from elites
                color: 0xffdd00
            },
            goldChest: {
                name: 'Gold Chest',
                multiplier: 10,
                chance: 0.02, // 2% from bosses
                color: 0xff00ff
            }
        };

        console.log('💰 Economy system initialized');
    }

    /**
     * Spawn gold pickup at position
     */
    spawnGold(position, amount, specialType = null) {
        // Clean up old gold pickups if too many
        if (this.goldPickups.length >= this.maxGoldOnScreen) {
            const oldest = this.goldPickups.shift();
            if (oldest && oldest.alive) {
                oldest.destroy();
            }
        }

        // Apply special loot multiplier
        if (specialType && this.specialLootTypes[specialType]) {
            amount *= this.specialLootTypes[specialType].multiplier;
        }

        const gold = new GoldPickup(
            this.game.sceneManager.scene,
            position.clone(),
            amount,
            this.game
        );

        this.goldPickups.push(gold);

        // Visual effect for special loot
        if (specialType) {
            this.spawnSpecialLootEffect(position, specialType);
        }

        return gold;
    }

    /**
     * Spawn gold from enemy death
     */
    spawnGoldFromEnemy(enemy) {
        const goldAmount = this.game.difficulty.calculateGoldReward(
            enemy.type,
            this.game.wave
        );

        // Check for special loot drop
        let specialType = null;

        if (enemy.type === 'boss') {
            // Boss always drops chest
            specialType = 'goldChest';
        } else if (enemy.type === 'elite' || enemy.type === 'tank') {
            // Elite/Tank has chance for gold bag
            if (this.game.difficulty.shouldDropSpecialLoot()) {
                specialType = 'goldBag';
            }
        }

        // Spawn with slight randomized position (spread effect)
        const spawnPos = enemy.position.clone();
        spawnPos.x += (Math.random() - 0.5) * 2;
        spawnPos.z += (Math.random() - 0.5) * 2;
        spawnPos.y = 1; // Hover above ground

        return this.spawnGold(spawnPos, goldAmount, specialType);
    }

    /**
     * Special loot visual effect
     */
    spawnSpecialLootEffect(position, lootType) {
        const loot = this.specialLootTypes[lootType];
        if (!loot) return;

        // Epic explosion effect
        this.game.particles.spawnDeathExplosion(position, 2);

        // Colored sparks
        for (let i = 0; i < 30; i++) {
            this.game.particles.spawnHitSpark(position, 5);
        }

        // Screen shake
        this.game.screenShake(2, 0.5);

        // Play special sound
        this.playSpecialLootSound(lootType);
    }

    /**
     * Play sound for special loot
     */
    playSpecialLootSound(lootType) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Epic sound for legendary drops
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);

            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Silently fail
        }
    }

    /**
     * Update all gold pickups
     */
    update(deltaTime) {
        // Update all gold pickups
        for (let i = this.goldPickups.length - 1; i >= 0; i--) {
            const gold = this.goldPickups[i];

            if (!gold.alive) {
                this.goldPickups.splice(i, 1);
                continue;
            }

            gold.update(deltaTime);
        }
    }

    /**
     * Add gold to player
     */
    addGold(amount) {
        const player = this.game.entities.player;
        if (!player) return;

        player.gold = (player.gold || 0) + amount;
        this.totalGoldEarned += amount;

        // Update UI
        this.game.events.emit('gold-changed', {
            amount: player.gold,
            added: amount
        });

        console.log(`💰 +${amount} gold (Total: ${player.gold})`);
    }

    /**
     * Remove gold from player (purchases)
     */
    spendGold(amount) {
        const player = this.game.entities.player;
        if (!player || player.gold < amount) {
            return false;
        }

        player.gold -= amount;
        this.totalGoldSpent += amount;

        this.game.events.emit('gold-changed', {
            amount: player.gold,
            spent: amount
        });

        return true;
    }

    /**
     * Get player gold
     */
    getGold() {
        const player = this.game.entities.player;
        return player ? (player.gold || 0) : 0;
    }

    /**
     * Clean up all gold pickups
     */
    cleanup() {
        for (const gold of this.goldPickups) {
            if (gold.alive) {
                gold.destroy();
            }
        }
        this.goldPickups = [];
    }

    /**
     * Get economy stats for UI
     */
    getStats() {
        return {
            currentGold: this.getGold(),
            totalEarned: this.totalGoldEarned,
            totalSpent: this.totalGoldSpent,
            netGold: this.totalGoldEarned - this.totalGoldSpent,
            goldOnGround: this.goldPickups.length
        };
    }
}
