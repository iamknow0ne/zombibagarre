import * as THREE from 'three';

export class CameraController {
    constructor(aspect) {
        // Isometric-style perspective camera
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 60, 60);
        this.camera.lookAt(0, 0, 0);

        // Camera shake properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = new THREE.Vector3();
        this.originalPosition = this.camera.position.clone();

        // Follow properties
        this.targetPosition = new THREE.Vector3();
        this.smoothFactor = 5;

        // Camera bounds (arena size)
        this.bounds = {
            minX: -200,
            maxX: 200,
            minZ: -200,
            maxZ: 200
        };
    }

    follow(target, deltaTime) {
        if (!target) return;

        // Calculate target camera position (isometric view)
        let targetX = target.position.x;
        let targetZ = target.position.z;

        // Clamp to bounds
        targetX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetX));
        targetZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, targetZ));

        this.targetPosition.set(
            targetX,
            target.position.y + 60,
            targetZ + 60
        );

        // Smooth follow
        this.camera.position.lerp(this.targetPosition, deltaTime * this.smoothFactor);

        // Look at player
        const lookAtTarget = new THREE.Vector3(
            target.position.x,
            target.position.y + 5,
            target.position.z
        );
        this.camera.lookAt(lookAtTarget);
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    update(deltaTime) {
        if (this.shakeDuration > 0) {
            // Apply camera shake
            this.shakeOffset.set(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );

            this.camera.position.add(this.shakeOffset);

            this.shakeDuration -= deltaTime;

            if (this.shakeDuration <= 0) {
                this.shakeDuration = 0;
                this.shakeIntensity = 0;
            }
        }
    }

    setZoom(zoom) {
        this.camera.zoom = zoom;
        this.camera.updateProjectionMatrix();
    }
}