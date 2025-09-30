export class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    update(deltaTime) {
        // Combat logic handled by entities themselves
        // This system can be used for combo tracking, damage multipliers, etc.
    }

    calculateDamage(baseDamage, isCritical = false) {
        let damage = baseDamage;

        if (isCritical) {
            damage *= 2;
        }

        return damage;
    }

    checkCritical() {
        // 10% crit chance
        return Math.random() < 0.1;
    }
}