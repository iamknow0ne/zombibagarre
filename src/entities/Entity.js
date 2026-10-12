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
            this.disposeMesh(this.mesh);
        }
    }

    disposeMesh(mesh) {
        // Recursively dispose of mesh and all children
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }

        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => this.disposeMaterial(mat));
            } else {
                this.disposeMaterial(mesh.material);
            }
        }

        // Dispose children (for Groups)
        if (mesh.children && mesh.children.length > 0) {
            for (let i = mesh.children.length - 1; i >= 0; i--) {
                this.disposeMesh(mesh.children[i]);
            }
        }
    }

    disposeMaterial(material) {
        // Dispose textures
        if (material.map) material.map.dispose();
        if (material.lightMap) material.lightMap.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.specularMap) material.specularMap.dispose();
        if (material.envMap) material.envMap.dispose();

        material.dispose();
    }
}