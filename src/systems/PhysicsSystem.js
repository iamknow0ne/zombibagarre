export class PhysicsSystem {
    constructor() {
        this.gravity = 9.8;
    }

    update(deltaTime) {
        // Simple collision detection and physics
        // Can be expanded with more complex physics later
    }

    checkCollision(entity1, entity2) {
        if (!entity1.mesh || !entity2.mesh) return false;

        const distance = entity1.position.distanceTo(entity2.position);
        const minDistance = 1; // Simple radius-based collision

        return distance < minDistance;
    }

    checkSphereCollision(pos1, radius1, pos2, radius2) {
        const distance = pos1.distanceTo(pos2);
        return distance < (radius1 + radius2);
    }
}