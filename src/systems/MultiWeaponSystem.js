import * as THREE from 'three';

export class MultiWeaponSystem {
    constructor(game) {
        this.game = game;

        // Active weapon slots (max 3)
        this.weaponSlots = [
            { weapon: null, offset: 0 },        // Center weapon
            { weapon: null, offset: -0.15 },    // Left weapon (-8.6 degrees)
            { weapon: null, offset: 0.15 }      // Right weapon (+8.6 degrees)
        ];

        // Unlocked slots (start with 1)
        this.unlockedSlots = 1;

        console.log('🔫 Multi-weapon system initialized');
    }

    // Assign a weapon to a specific slot
    assignWeapon(slotIndex, weapon) {
        if (slotIndex >= this.unlockedSlots) {
            console.warn(`⚠️ Slot ${slotIndex} is not unlocked yet`);
            return false;
        }

        if (slotIndex < 0 || slotIndex >= this.weaponSlots.length) {
            console.warn(`⚠️ Invalid slot index: ${slotIndex}`);
            return false;
        }

        this.weaponSlots[slotIndex].weapon = weapon;
        console.log(`✅ Weapon ${weapon.type} assigned to slot ${slotIndex}`);
        return true;
    }

    // Remove weapon from slot
    removeWeapon(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.weaponSlots.length) {
            this.weaponSlots[slotIndex].weapon = null;
        }
    }

    // Get all active weapons
    getActiveWeapons() {
        return this.weaponSlots
            .slice(0, this.unlockedSlots)
            .filter(slot => slot.weapon !== null);
    }

    // Fire all active weapons
    fireAll(direction, playerPosition) {
        const activeWeapons = this.getActiveWeapons();

        if (activeWeapons.length === 0) return;

        for (const slot of activeWeapons) {
            if (!slot.weapon) continue;

            // Calculate angle offset for spread
            const baseAngle = Math.atan2(direction.x, direction.z);
            const offsetAngle = baseAngle + slot.offset;

            // Create new direction vector with offset (THREE.Vector3)
            const offsetDirection = new THREE.Vector3(
                Math.sin(offsetAngle),
                0,
                Math.cos(offsetAngle)
            );

            // Fire weapon with offset direction
            slot.weapon.fire(offsetDirection);
        }

        // Each weapon creates its own muzzle flash, no need for extra visual feedback
    }

    // Unlock additional weapon slot
    unlockSlot() {
        if (this.unlockedSlots < this.weaponSlots.length) {
            this.unlockedSlots++;
            console.log(`🔓 Weapon slot ${this.unlockedSlots} unlocked!`);
            this.game.events.emit('weapon-slot-unlocked', { slot: this.unlockedSlots });
            return true;
        }
        return false;
    }

    // Check if can unlock next slot
    canUnlockSlot() {
        return this.unlockedSlots < this.weaponSlots.length;
    }

    // Get next slot unlock cost
    getNextSlotCost() {
        const costs = [0, 500, 1000]; // Slot 1 free, Slot 2 = 500g, Slot 3 = 1000g
        return costs[this.unlockedSlots] || 0;
    }

    // Get weapon in specific slot
    getWeaponInSlot(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.weaponSlots.length) {
            return this.weaponSlots[slotIndex].weapon;
        }
        return null;
    }

    // Check if all slots are filled
    allSlotsFilled() {
        for (let i = 0; i < this.unlockedSlots; i++) {
            if (!this.weaponSlots[i].weapon) {
                return false;
            }
        }
        return true;
    }

    // Get slot info for UI display
    getSlotInfo() {
        return this.weaponSlots.slice(0, this.unlockedSlots).map((slot, index) => ({
            index,
            weapon: slot.weapon ? slot.weapon.type : null,
            locked: index >= this.unlockedSlots
        }));
    }

    // Auto-distribute weapons across slots (when player has multiple weapons)
    autoDistribute(weapons) {
        // Clear all slots
        for (let i = 0; i < this.weaponSlots.length; i++) {
            this.weaponSlots[i].weapon = null;
        }

        // Distribute weapons to unlocked slots
        for (let i = 0; i < Math.min(weapons.length, this.unlockedSlots); i++) {
            this.weaponSlots[i].weapon = weapons[i];
        }

        console.log(`🔄 Auto-distributed ${weapons.length} weapons across ${this.unlockedSlots} slots`);
    }

    update(deltaTime) {
        // Update could handle weapon cooldowns or special effects
    }

    destroy() {
        // Clean up
        for (let i = 0; i < this.weaponSlots.length; i++) {
            this.weaponSlots[i].weapon = null;
        }
    }
}
