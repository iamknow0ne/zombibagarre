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

        // Use 2D distance (ignore Y)
        const dx = entity1.position.x - entity2.position.x;
        const dz = entity1.position.z - entity2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const minDistance = 1; // Simple radius-based collision

        return distance < minDistance;
    }

    checkSphereCollision(pos1, radius1, pos2, radius2) {
        // Use 2D distance (ignore Y)
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < (radius1 + radius2);
    }
}