import * as THREE from 'three';

export class Entity {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.mesh = null;
        this.alive = true;
        this.components = new Map();
    }

    addComponent(name, component) {
        component.entity = this;
        this.components.set(name, component);
        return component;
    }

    getComponent(name) {
        return this.components.get(name);
    }

    update(deltaTime) {
        // Update all components
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    destroy() {
        this.alive = false;
        if (this.mesh) {
            this.scene.remove(this.mesh);

            // Dispose geometry and materials
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(mat => mat.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
    }
}