export class UpgradeSystem {
    constructor(game) {
        this.game = game;

        // Upgrade levels
        this.upgrades = {
            damage: { level: 1, cost: 100, costMultiplier: 1.5 },
            fireRate: { level: 1, cost: 100, costMultiplier: 1.5 },
            health: { level: 1, cost: 150, costMultiplier: 1.6 },
            speed: { level: 1, cost: 100, costMultiplier: 1.5 }
        };

        console.log('🛒 Upgrade system initialized');
    }

    canAfford(upgradeType) {
        const upgrade = this.upgrades[upgradeType];
        const currentGold = this.game.economy.getGold();
        return currentGold >= upgrade.cost;
    }

    purchaseUpgrade(upgradeType) {
        const upgrade = this.upgrades[upgradeType];

        if (!this.canAfford(upgradeType)) {
            console.log(`❌ Cannot afford ${upgradeType} upgrade (Need: ${upgrade.cost}, Have: ${this.game.economy.getGold()})`);
            return false;
        }

        // Deduct gold using economy system
        const success = this.game.economy.spendGold(upgrade.cost);
        if (!success) {
            console.log(`❌ Failed to spend gold for ${upgradeType}`);
            return false;
        }

        // Increase level
        upgrade.level++;

        // Increase cost for next purchase
        upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);

        // Apply upgrade effect
        this.applyUpgrade(upgradeType);

        console.log(`✅ Purchased ${upgradeType} upgrade (Level ${upgrade.level})`);
        return true;
    }

    applyUpgrade(upgradeType) {
        const player = this.game.entities.player;
        if (!player) return;

        switch (upgradeType) {
            case 'damage':
                player.damage += 10;
                break;

            case 'fireRate':
                // Reduce fire delay by 10% for all weapons (faster shooting)
                for (const weapon of player.weapons) {
                    weapon.fireRate = Math.max(50, weapon.fireRate * 0.9);
                }
                console.log(`🔥 Fire rate improved for all weapons!`);
                break;

            case 'health':
                // Increase max health and heal
                player.maxHealth += 50;
                player.health = player.maxHealth;
                this.game.events.emit('player-healed', {
                    health: player.health,
                    maxHealth: player.maxHealth
                });
                break;

            case 'speed':
                // Increase speed by 10%
                player.speed *= 1.1;
                break;
        }
    }

    getUpgradeInfo(upgradeType) {
        return this.upgrades[upgradeType];
    }
}
