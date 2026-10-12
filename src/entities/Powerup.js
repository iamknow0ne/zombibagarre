import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Powerup extends Entity {
    constructor(scene, position, type, game) {
        super(scene, position);

        this.game = game;
        this.type = type; // 'health', 'speed', 'damage', 'shield'

        // Powerup properties
        this.lifetime = 10; // seconds before disappearing
        this.age = 0;
        this.pickupRadius = 2;
        this.rotationSpeed = 2;

        // Set properties based on type
        this.setupType();
        this.createMesh();
    }

    setupType() {
        switch (this.type) {
            case 'health':
                this.color = 0x00ff00;
                this.effect = () => {
                    this.game.entities.player.heal(50);
                };
                break;

            case 'speed':
                this.color = 0x00ffff;
                this.duration = 5000; // 5 seconds
                this.effect = () => {
                    this.game.entities.player.activatePowerup('speed', 5000, 1.5);
                };
                break;

            case 'damage':
                this.color = 0xff6600;
                this.duration = 5000;
                this.effect = () => {
                    this.game.entities.player.activatePowerup('damage', 5000, 1.5);
                };
                break;

            case 'shield':
                this.color = 0xffff00;
                this.duration = 3000;
                this.effect = () => {
                    const player = this.game.entities.player;
                    player.iframes = this.duration;
                };
                break;

            case 'weapon_shotgun':
                this.color = 0xff6600;
                this.effect = () => {
                    this.game.entities.player.addWeapon('shotgun');
                };
                break;

            case 'weapon_rifle':
                this.color = 0x00ff00;
                this.effect = () => {
                    this.game.entities.player.addWeapon('rifle');
                };
                break;

            case 'weapon_smg':
                this.color = 0x00ffff;
                this.effect = () => {
                    this.game.entities.player.addWeapon('smg');
                };
                break;

            case 'weapon_sniper':
                this.color = 0xff00ff;
                this.effect = () => {
                    this.game.entities.player.addWeapon('sniper');
                };
                break;

            case 'weapon_launcher':
                this.color = 0xff0000;
                this.effect = () => {
                    this.game.entities.player.addWeapon('launcher');
                };
                break;

            case 'weapon_laser':
                this.color = 0x00ffff;
                this.effect = () => {
                    this.game.entities.player.addWeapon('laser');
                };
                break;

            case 'weapon_flamethrower':
                this.color = 0xff4400;
                this.effect = () => {
                    this.game.entities.player.addWeapon('flamethrower');
                };
                break;

            case 'weapon_railgun':
                this.color = 0x8800ff;
                this.effect = () => {
                    this.game.entities.player.addWeapon('railgun');
                };
                break;

            case 'weapon_minigun':
                this.color = 0xffaa00;
                this.effect = () => {
                    this.game.entities.player.addWeapon('minigun');
                };
                break;

            case 'weapon_crossbow':
                this.color = 0x00aa00;
                this.effect = () => {
                    this.game.entities.player.addWeapon('crossbow');
                };
                break;

            case 'weapon_plasma':
                this.color = 0x00ff88;
                this.effect = () => {
                    this.game.entities.player.addWeapon('plasma');
                };
                break;

            case 'firerate':
                this.color = 0xffaa00;
                this.duration = 5000;
                this.effect = () => {
                    this.game.entities.player.activatePowerup('fireRate', 5000, 0.5); // 0.5 = 2x fire rate
                };
                break;

            default:
                this.color = 0xffffff;
                this.effect = () => {};
        }
    }

    createMesh() {
        // Create a rotating crystal-like shape
        const geometry = new THREE.OctahedronGeometry(0.8, 0);
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 1; // Hover above ground
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Add glow
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glow);

        // Add floating text label
        this.createLabel();
    }

    createLabel() {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 256;

        // Get label text and color
        const labelText = this.getLabelText();
        const colors = this.getLabelColors();

        // Draw background with border
        const borderRadius = 20;
        context.fillStyle = colors.background;
        this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, borderRadius);
        context.fill();

        // Draw border
        context.strokeStyle = colors.border;
        context.lineWidth = 6;
        this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, borderRadius);
        context.stroke();

        // Draw text with shadow
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 10;
        context.shadowOffsetX = 3;
        context.shadowOffsetY = 3;

        context.font = 'Bold 48px Arial';
        context.fillStyle = colors.text;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(labelText, canvas.width / 2, canvas.height / 2);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0,
            depthTest: false  // Always render on top
        });

        this.label = new THREE.Sprite(spriteMaterial);
        this.label.scale.set(4, 2, 1);  // Bigger label
        this.label.position.y = 3; // Float higher above powerup
        this.mesh.add(this.label);
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    getLabelColors() {
        switch (this.type) {
            case 'health':
                return { background: 'rgba(0, 180, 0, 0.9)', border: '#00ff00', text: '#ffffff' };
            case 'speed':
                return { background: 'rgba(0, 120, 255, 0.9)', border: '#00ccff', text: '#ffffff' };
            case 'damage':
                return { background: 'rgba(255, 50, 50, 0.9)', border: '#ff6666', text: '#ffffff' };
            case 'shield':
                return { background: 'rgba(120, 120, 255, 0.9)', border: '#8888ff', text: '#ffffff' };
            case 'weapon_shotgun':
            case 'weapon_rifle':
            case 'weapon_smg':
            case 'weapon_sniper':
            case 'weapon_launcher':
            case 'weapon_laser':
            case 'weapon_flamethrower':
            case 'weapon_railgun':
            case 'weapon_minigun':
            case 'weapon_crossbow':
            case 'weapon_plasma':
                return { background: 'rgba(255, 150, 0, 0.9)', border: '#ffaa00', text: '#ffffff' };
            case 'firerate':
                return { background: 'rgba(255, 255, 0, 0.9)', border: '#ffff66', text: '#000000' };
            default:
                return { background: 'rgba(150, 150, 150, 0.9)', border: '#aaaaaa', text: '#ffffff' };
        }
    }

    getLabelText() {
        switch (this.type) {
            case 'health': return 'HEALTH +50';
            case 'speed': return 'SPEED BOOST';
            case 'damage': return 'DAMAGE +50%';
            case 'shield': return 'SHIELD';
            case 'weapon_shotgun': return 'SHOTGUN';
            case 'weapon_rifle': return 'RIFLE';
            case 'weapon_smg': return 'SMG';
            case 'weapon_sniper': return 'SNIPER';
            case 'weapon_launcher': return 'LAUNCHER';
            case 'weapon_laser': return 'LASER';
            case 'weapon_flamethrower': return 'FLAMETHROWER';
            case 'weapon_railgun': return 'RAILGUN';
            case 'weapon_minigun': return 'MINIGUN';
            case 'weapon_crossbow': return 'CROSSBOW';
            case 'weapon_plasma': return 'PLASMA';
            case 'firerate': return 'FIRE RATE +100%';
            default: return 'POWERUP';
        }
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Check lifetime
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }

        // Rotate
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;

        // Bob up and down
        const bobOffset = Math.sin(this.age * 3) * 0.2;
        this.mesh.position.y = 1 + bobOffset;

        // Fade out near end of lifetime
        if (this.age > this.lifetime - 2) {
            const fadeProgress = (this.lifetime - this.age) / 2;
            this.mesh.material.opacity = fadeProgress;
            this.mesh.material.transparent = true;
        }

        // Check for player pickup
        this.checkPickup();

        super.update(deltaTime);
    }

    checkPickup() {
        const player = this.game.entities.player;
        if (!player) return;

        // Use 2D distance (ignore Y - powerups float at y=1, player at y=0)
        const dx = this.position.x - player.position.x;
        const dz = this.position.z - player.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < this.pickupRadius) {
            this.pickup();
        }
    }

    pickup() {
        if (!this.alive) return;

        console.log(`💎 Picked up ${this.type} powerup`);

        // Apply effect
        this.effect();

        // Visual feedback
        this.game.particles.spawnHitSpark(this.position, 30);

        // Audio feedback - simple beep using Web Audio API
        this.playPickupSound();

        // Destroy powerup
        this.destroy();
    }

    playPickupSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different types
            const frequencies = {
                health: 523.25,      // C5
                speed: 659.25,       // E5
                damage: 783.99,      // G5
                shield: 880.00,      // A5
                weapon_shotgun: 1046.50, // C6
                weapon_rifle: 1046.50,
                weapon_smg: 1046.50,
                firerate: 987.77     // B5
            };

            oscillator.frequency.value = frequencies[this.type] || 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Silently fail if audio not supported
        }
    }
}
