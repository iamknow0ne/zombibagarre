export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.critChance = 0.1; // 10% base
        this.critMultiplier = 2.0; // 2x base

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimeout = 3.0; // seconds
        this.comboMultiplier = 1.0;

        // Kill streak tracking
        this.killStreak = 0;
        this.maxKillStreak = 0;

        // Combat stats
        this.totalDamageDealt = 0;
        this.totalCriticalHits = 0;
        this.totalOverkillDamage = 0;

        // Overkill system (extra damage carries to nearby enemies)
        this.overkillEnabled = false;
        this.overkillRange = 5;
        this.overkillPercent = 0.5; // 50% of overkill damage

        console.log('⚔️ Combat system initialized');
    }

    update(deltaTime) {
        // Update combo timer
        if (this.comboCount > 0) {
            this.comboTimer -= deltaTime;

            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }

        // Update combo multiplier based on count
        this.updateComboMultiplier();
    }

    /**
     * Register a kill for combo/streak tracking
     */
    registerKill() {
        this.comboCount++;
        this.killStreak++;
        this.comboTimer = this.comboTimeout;

        if (this.killStreak > this.maxKillStreak) {
            this.maxKillStreak = this.killStreak;
        }

        // Emit combo events for UI feedback
        if (this.comboCount >= 5) {
            this.game.events.emit('combo', {
                count: this.comboCount,
                multiplier: this.comboMultiplier
            });
        }

        // Bonus effects at combo milestones
        if (this.comboCount === 10) {
            console.log('🔥 10X COMBO!');
            this.game.particles.spawnHitSpark(this.game.entities.player.position, 50);
            if (this.game.audio) this.game.audio.playPowerup();
        } else if (this.comboCount === 25) {
            console.log('💥 25X ULTRA COMBO!');
            this.game.screenShake(3, 0.5);
            if (this.game.audio) this.game.audio.playExplosion(2.0);
        } else if (this.comboCount === 50) {
            console.log('⚡ 50X LEGENDARY COMBO!');
            this.game.screenShake(5, 1.0);
            if (this.game.audio) this.game.audio.playExplosion(3.0);
        }
    }

    /**
     * Reset combo (when timer expires or player takes damage)
     */
    resetCombo() {
        if (this.comboCount >= 5) {
            console.log(`🔄 Combo ended at ${this.comboCount}x`);
        }
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1.0;
    }

    /**
     * Reset kill streak (player death)
     */
    resetKillStreak() {
        if (this.killStreak > 0) {
            console.log(`💀 Kill streak ended at ${this.killStreak}`);
        }
        this.killStreak = 0;
        this.resetCombo();
    }

    /**
     * Update combo multiplier based on combo count
     */
    updateComboMultiplier() {
        // Progressive damage bonus: +2% per combo kill, capped at +100%
        const bonusPercent = Math.min(this.comboCount * 0.02, 1.0);
        this.comboMultiplier = 1.0 + bonusPercent;
    }

    /**
     * Calculate final damage with all modifiers
     */
    calculateDamage(baseDamage, isCritical = false, applyCombo = true) {
        let damage = baseDamage;

        // Apply critical hit multiplier
        if (isCritical) {
            damage *= this.critMultiplier;
            this.totalCriticalHits++;
        }

        // Apply combo multiplier
        if (applyCombo && this.comboMultiplier > 1.0) {
            damage *= this.comboMultiplier;
        }

        const finalDamage = Math.floor(damage);
        this.totalDamageDealt += finalDamage;

        return finalDamage;
    }

    /**
     * Handle overkill damage (damage exceeding enemy health)
     */
    handleOverkill(overkillAmount, position) {
        if (!this.overkillEnabled || overkillAmount <= 0) return;

        this.totalOverkillDamage += overkillAmount;

        // Find nearby enemies to distribute overkill damage
        const overkillDamage = Math.floor(overkillAmount * this.overkillPercent);

        if (overkillDamage <= 0) return;

        const enemies = this.game.entities.enemies;
        let damagedCount = 0;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.position.x - position.x;
            const dz = enemy.position.z - position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < this.overkillRange) {
                enemy.takeDamage(overkillDamage, false);
                this.game.particles.spawnHitSpark(enemy.position, 5);
                damagedCount++;

                if (damagedCount >= 3) break; // Limit to 3 nearby enemies
            }
        }

        if (damagedCount > 0) {
            console.log(`💥 Overkill! ${overkillDamage} damage to ${damagedCount} nearby enemies`);
        }
    }

    /**
     * Check for critical hit
     */
    checkCritical() {
        return Math.random() < this.critChance;
    }

    /**
     * Increase crit chance (from skills/upgrades)
     */
    addCritChance(amount) {
        this.critChance = Math.min(0.75, this.critChance + amount); // Cap at 75%
    }

    /**
     * Increase crit multiplier (from skills/upgrades)
     */
    addCritMultiplier(amount) {
        this.critMultiplier += amount;
    }

    /**
     * Enable overkill system
     */
    enableOverkill() {
        this.overkillEnabled = true;
        console.log('💥 Overkill damage enabled!');
    }

    /**
     * Get combat stats for UI
     */
    getStats() {
        return {
            combo: this.comboCount,
            comboMultiplier: this.comboMultiplier,
            killStreak: this.killStreak,
            maxKillStreak: this.maxKillStreak,
            totalDamage: this.totalDamageDealt,
            criticalHits: this.totalCriticalHits,
            overkillDamage: this.totalOverkillDamage
        };
    }
}