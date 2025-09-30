import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { CameraController } from './Camera.js';
import { GameRenderer } from './Renderer.js';
import { InputManager } from './InputManager.js';
import { Player } from '../entities/Player.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ParticleManager } from '../graphics/ParticleManager.js';
import { EventBus } from '../utils/EventBus.js';

export class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.clock = new THREE.Clock();

        // Event system
        this.events = new EventBus();

        // Core managers
        this.sceneManager = new SceneManager();
        this.renderer = new GameRenderer(document.getElementById('gameCanvas'));
        this.camera = new CameraController(window.innerWidth / window.innerHeight);
        this.input = new InputManager();
        this.particles = new ParticleManager(this.sceneManager.scene);

        // Game systems
        this.waveSystem = new WaveSystem(this);
        this.physics = new PhysicsSystem();
        this.combat = new CombatSystem(this);

        // Game state
        this.wave = 1;
        this.score = 0;
        this.money = 150;
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 150;

        // Entity collections
        this.entities = {
            player: null,
            enemies: [],
            projectiles: [],
            powerups: []
        };

        // Setup post-processing
        this.renderer.setupPostProcessing(this.sceneManager.scene, this.camera.camera);

        // Bind methods
        this.update = this.update.bind(this);
        this.resize = this.resize.bind(this);

        // Setup resize handler
        window.addEventListener('resize', this.resize);

        console.log('🎮 Zombie Bagarre 3D - Game initialized');
    }

    async init() {
        console.log('🚀 Initializing game...');

        // Create player
        const characterData = {
            modelPath: '/assets/models/soldier.glb',
            maxHealth: 200,
            speed: 5,
            damage: 1
        };

        this.entities.player = new Player(this.sceneManager.scene, characterData, this);
        await this.entities.player.init();

        console.log('✅ Game initialized successfully');
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.clock.start();
        this.waveSystem.startWave();
        this.update();

        console.log('▶️ Game started');
    }

    pause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ Game paused' : '▶️ Game resumed');
    }

    update() {
        if (!this.isRunning) return;

        requestAnimationFrame(this.update);

        const deltaTime = this.clock.getDelta();

        if (this.isPaused) {
            this.renderer.render(this.sceneManager.scene, this.camera.camera);
            return;
        }

        // Update systems
        this.input.update();
        this.waveSystem.update(deltaTime);
        this.physics.update(deltaTime);
        this.combat.update(deltaTime);
        this.particles.update(deltaTime);

        // Update entities
        if (this.entities.player) {
            this.entities.player.update(deltaTime);
            this.camera.follow(this.entities.player.mesh, deltaTime);
        }

        for (let i = this.entities.enemies.length - 1; i >= 0; i--) {
            const enemy = this.entities.enemies[i];
            enemy.update(deltaTime, this.entities.player.mesh.position);

            if (!enemy.alive) {
                this.entities.enemies.splice(i, 1);
            }
        }

        for (let i = this.entities.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.entities.projectiles[i];
            projectile.update(deltaTime);

            if (!projectile.alive) {
                this.entities.projectiles.splice(i, 1);
            }
        }

        // Update camera
        this.camera.update(deltaTime);

        // Update scene
        this.sceneManager.update(deltaTime);

        // Render
        this.renderer.render(this.sceneManager.scene, this.camera.camera);
    }

    resize() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.camera.aspect = aspect;
        this.camera.camera.updateProjectionMatrix();
        this.renderer.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.composer.setSize(window.innerWidth, window.innerHeight);
    }

    addEnemy(enemy) {
        this.entities.enemies.push(enemy);
    }

    addProjectile(projectile) {
        this.entities.projectiles.push(projectile);
    }

    addExperience(amount) {
        this.experience += amount;
        this.events.emit('experience-gained', { amount, total: this.experience });

        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = 100 + (50 * this.level);

        this.events.emit('level-up', { level: this.level });
        console.log(`🆙 Level up! Now level ${this.level}`);

        // Pause for level up screen
        this.isPaused = true;
    }

    addMoney(amount) {
        this.money += amount;
        this.events.emit('money-changed', { amount: this.money });
    }

    spawnBloodEffect(position) {
        this.particles.spawnBloodExplosion(position, 50);
    }

    screenShake(intensity, duration) {
        this.camera.shake(intensity, duration);
    }

    gameOver() {
        this.isRunning = false;
        this.events.emit('game-over', {
            score: this.score,
            wave: this.wave,
            level: this.level
        });
        console.log('💀 Game Over');
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('resize', this.resize);
        this.input.destroy();
        this.renderer.renderer.dispose();
        console.log('🗑️ Game destroyed');
    }
}