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
    }

    follow(target, deltaTime) {
        if (!target) return;

        // Calculate target camera position (isometric view)
        this.targetPosition.set(
            target.position.x,
            target.position.y + 60,
            target.position.z + 60
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