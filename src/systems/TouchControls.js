import * as THREE from 'three';

export class TouchControls {
    constructor(game) {
        this.game = game;

        // Touch state
        this.touches = new Map();
        this.joystickActive = false;
        this.joystickStart = new THREE.Vector2();
        this.joystickCurrent = new THREE.Vector2();
        this.movementVector = new THREE.Vector2();

        // UI elements
        this.joystickBase = null;
        this.joystickStick = null;
        this.dashButton = null;

        // Configuration
        this.joystickRadius = 60;
        this.joystickDeadzone = 0.15;
        this.joystickMaxDistance = 50;

        // Detect if on mobile device
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (this.isMobile) {
            this.createTouchUI();
            this.setupEventListeners();
            console.log('📱 Mobile touch controls initialized');
        }
    }

    createTouchUI() {
        // Create joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.style.cssText = `
            position: fixed;
            left: 40px;
            bottom: 40px;
            width: ${this.joystickRadius * 2}px;
            height: ${this.joystickRadius * 2}px;
            z-index: 1000;
            opacity: 0.7;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `;

        // Joystick base (outer circle)
        this.joystickBase = document.createElement('div');
        this.joystickBase.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(0, 255, 255, 0.2);
            border: 3px solid rgba(0, 255, 255, 0.5);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        `;

        // Joystick stick (inner circle)
        this.joystickStick = document.createElement('div');
        this.joystickStick.style.cssText = `
            position: absolute;
            width: 50%;
            height: 50%;
            top: 25%;
            left: 25%;
            border-radius: 50%;
            background: rgba(0, 255, 255, 0.6);
            border: 2px solid #00ffff;
            box-shadow: 0 0 15px #00ffff;
            transition: transform 0.05s;
        `;

        joystickContainer.appendChild(this.joystickBase);
        joystickContainer.appendChild(this.joystickStick);
        document.body.appendChild(joystickContainer);

        // Create dash button
        this.dashButton = document.createElement('div');
        this.dashButton.id = 'dash-button';
        this.dashButton.innerHTML = '💨';
        this.dashButton.style.cssText = `
            position: fixed;
            right: 40px;
            bottom: 120px;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: rgba(255, 100, 0, 0.3);
            border: 3px solid rgba(255, 100, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            z-index: 1000;
            opacity: 0.7;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            box-shadow: 0 0 20px rgba(255, 100, 0, 0.3);
        `;
        document.body.appendChild(this.dashButton);

        // Create pause button
        const pauseButton = document.createElement('div');
        pauseButton.id = 'pause-button';
        pauseButton.innerHTML = '⏸️';
        pauseButton.style.cssText = `
            position: fixed;
            right: 40px;
            top: 40px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(255, 255, 0, 0.3);
            border: 3px solid rgba(255, 255, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            z-index: 1000;
            opacity: 0.7;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            box-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
        `;
        document.body.appendChild(pauseButton);

        // Pause button handler
        pauseButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game && this.game.togglePause) {
                this.game.togglePause();
            }
            pauseButton.style.transform = 'scale(0.9)';
        });

        pauseButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            pauseButton.style.transform = 'scale(1)';
        });
    }

    setupEventListeners() {
        // Joystick touch events
        const joystickContainer = document.getElementById('joystick-container');

        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickContainer.getBoundingClientRect();

            this.joystickStart.set(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            );

            this.joystickCurrent.set(touch.clientX, touch.clientY);
            this.joystickActive = true;
            this.updateJoystick(touch);
        });

        joystickContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystickActive) {
                const touch = e.touches[0];
                this.updateJoystick(touch);
            }
        });

        joystickContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystickActive = false;
            this.movementVector.set(0, 0);

            // Reset stick position
            if (this.joystickStick) {
                this.joystickStick.style.transform = 'translate(0, 0)';
            }
        });

        // Dash button events
        this.dashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game && this.game.entities.player) {
                const player = this.game.entities.player;

                // Use movement direction or forward if no movement
                const direction = new THREE.Vector2(
                    this.movementVector.x || 0,
                    this.movementVector.y || -1
                );

                player.startDash({ x: direction.x, z: direction.y });
            }

            // Visual feedback
            this.dashButton.style.transform = 'scale(0.9)';
            this.dashButton.style.background = 'rgba(255, 100, 0, 0.6)';
        });

        this.dashButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.dashButton.style.transform = 'scale(1)';
            this.dashButton.style.background = 'rgba(255, 100, 0, 0.3)';
        });

        // Prevent default touch behavior on game canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        }
    }

    updateJoystick(touch) {
        // Calculate offset from joystick center
        const dx = touch.clientX - this.joystickStart.x;
        const dy = touch.clientY - this.joystickStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max distance
        let x = dx;
        let y = dy;

        if (distance > this.joystickMaxDistance) {
            const angle = Math.atan2(dy, dx);
            x = Math.cos(angle) * this.joystickMaxDistance;
            y = Math.sin(angle) * this.joystickMaxDistance;
        }

        // Update stick visual position
        if (this.joystickStick) {
            this.joystickStick.style.transform = `translate(${x}px, ${y}px)`;
        }

        // Calculate normalized movement vector
        const normalizedX = x / this.joystickMaxDistance;
        const normalizedY = y / this.joystickMaxDistance;

        // Apply deadzone
        if (Math.abs(normalizedX) < this.joystickDeadzone && Math.abs(normalizedY) < this.joystickDeadzone) {
            this.movementVector.set(0, 0);
        } else {
            this.movementVector.set(normalizedX, normalizedY);
        }
    }

    getMovementVector() {
        if (!this.isMobile) {
            return new THREE.Vector2(0, 0);
        }

        return new THREE.Vector2(this.movementVector.x, this.movementVector.y);
    }

    update(deltaTime) {
        // Update dash button cooldown indicator
        if (this.isMobile && this.dashButton && this.game && this.game.entities.player) {
            const player = this.game.entities.player;
            const cooldownPercent = 1 - (player.dashCooldown / player.dashMaxCooldown);

            if (player.dashCooldown > 0) {
                this.dashButton.style.opacity = '0.3';
                this.dashButton.style.background = `conic-gradient(
                    rgba(255, 100, 0, 0.6) ${cooldownPercent * 360}deg,
                    rgba(100, 100, 100, 0.3) ${cooldownPercent * 360}deg
                )`;
            } else {
                this.dashButton.style.opacity = '0.7';
                this.dashButton.style.background = 'rgba(255, 100, 0, 0.3)';
            }
        }
    }

    destroy() {
        // Remove UI elements
        const joystickContainer = document.getElementById('joystick-container');
        const dashButton = document.getElementById('dash-button');
        const pauseButton = document.getElementById('pause-button');

        if (joystickContainer) joystickContainer.remove();
        if (dashButton) dashButton.remove();
        if (pauseButton) pauseButton.remove();

        console.log('📱 Touch controls destroyed');
    }
}
