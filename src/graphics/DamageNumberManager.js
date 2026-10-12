import * as THREE from 'three';

export class DamageNumberManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.numbers = [];
        this.maxNumbers = 100;
    }

    spawnDamageNumber(position, damage, isCritical = false, isBoss = false) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        // Draw text
        const fontSize = isCritical ? 72 : 48;
        context.font = `bold ${fontSize}px Orbitron, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Color based on type
        let color = '#ffffff';
        if (isCritical) color = '#ffff00'; // Yellow for critical
        if (isBoss) color = '#ff00ff'; // Magenta for boss damage

        // Outline
        context.strokeStyle = '#000000';
        context.lineWidth = 8;
        context.strokeText(Math.floor(damage).toString(), 128, 64);

        // Fill
        context.fillStyle = color;
        context.fillText(Math.floor(damage).toString(), 128, 64);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create sprite material
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.position.y += 2; // Spawn above entity
        sprite.scale.set(4, 2, 1);

        this.scene.add(sprite);

        // Store damage number data
        const damageNumber = {
            sprite,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                5 + Math.random() * 3,
                (Math.random() - 0.5) * 2
            ),
            lifetime: 1.5,
            age: 0,
            material,
            texture
        };

        this.numbers.push(damageNumber);

        // Remove oldest if too many
        if (this.numbers.length > this.maxNumbers) {
            const old = this.numbers.shift();
            this.scene.remove(old.sprite);
            old.material.dispose();
            old.texture.dispose();
        }
    }

    update(deltaTime) {
        for (let i = this.numbers.length - 1; i >= 0; i--) {
            const number = this.numbers[i];

            // Update age
            number.age += deltaTime;

            // Check lifetime
            if (number.age >= number.lifetime) {
                this.scene.remove(number.sprite);
                number.material.dispose();
                number.texture.dispose();
                this.numbers.splice(i, 1);
                continue;
            }

            // Apply physics
            number.velocity.y -= 9.8 * deltaTime;
            number.sprite.position.add(number.velocity.clone().multiplyScalar(deltaTime));

            // Fade out
            const alpha = 1 - (number.age / number.lifetime);
            number.material.opacity = alpha;

            // Scale up slightly at start
            if (number.age < 0.2) {
                const scale = 1 + (number.age / 0.2) * 0.5;
                number.sprite.scale.set(4 * scale, 2 * scale, 1);
            }
        }
    }
}
