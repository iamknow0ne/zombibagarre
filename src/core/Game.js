import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { CameraController } from './Camera.js';
import { GameRenderer } from './Renderer.js';
import { InputManager } from './InputManager.js';
import { Player } from '../entities/Player.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { ParticleManager } from '../graphics/ParticleManager.js';
import { DamageNumberManager } from '../graphics/DamageNumberManager.js';
import { EventBus } from '../utils/EventBus.js';
import { WeaponModifierSystem } from '../systems/WeaponModifierSystem.js';
import { DifficultySystem } from '../systems/DifficultySystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { ZombiePool } from '../systems/ZombiePool.js';
import { TouchControls } from '../systems/TouchControls.js';
import { MultiWeaponSystem } from '../systems/MultiWeaponSystem.js';
import { DrivableVehicleSystem } from '../systems/DrivableVehicleSystem.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.clock = new THREE.Clock();

        // Event system
        this.events = new EventBus();

        // Core managers - Order matters for AAA graphics!
        this.renderer = new GameRenderer(document.getElementById('gameCanvas'));
        this.sceneManager = new SceneManager({
            useAAAGraphics: true, // Enable AAA mode
            renderer: this.renderer
        });
        this.camera = new CameraController(window.innerWidth / window.innerHeight);
        this.input = new InputManager();
        this.particles = new ParticleManager(this.sceneManager.scene);
        this.damageNumbers = new DamageNumberManager(this.sceneManager.scene, this.camera.camera);

        // Game systems
        this.audio = new AudioManager(); // Audio feedback
        this.difficulty = new DifficultySystem(this);
        this.economy = new EconomySystem(this);
        this.zombiePool = new ZombiePool(this, 200); // Pre-create 200 zombies
        this.projectilePool = new ProjectilePool(this, 150); // Pre-create 150 projectiles
        this.waveSystem = new WaveSystem(this);
        this.physics = new PhysicsSystem();
        this.combat = new CombatSystem(this);
        this.upgradeSystem = new UpgradeSystem(this);
        this.skillSystem = new SkillSystem(this);
        this.weaponModifiers = new WeaponModifierSystem(this);
        this.touchControls = new TouchControls(this);
        this.multiWeaponSystem = new MultiWeaponSystem(this);
        this.vehicleSystem = new DrivableVehicleSystem(this);

        // Game state
        this.wave = 1;
        this.score = 0;
        this.kills = 0;
        // Note: Gold is now managed by EconomySystem (player.gold)
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
        this.setupAtmosphericSmoke();
        this.vehicleSystem.spawnVehicles(10, 240); // Spawn 10 vehicles across map
        this.update();

        console.log('▶️ Game started');
    }

    setupAtmosphericSmoke() {
        // Get smoke positions from terrain and continuously spawn smoke particles
        const smokePositions = this.sceneManager.terrain?.getSmokePositions() || [];

        if (smokePositions.length > 0) {
            this.smokeSpawnTimer = 0;
            this.smokeSpawnInterval = 0.5; // Spawn smoke every 0.5 seconds

            this.events.on('update', (deltaTime) => {
                this.smokeSpawnTimer += deltaTime;

                if (this.smokeSpawnTimer >= this.smokeSpawnInterval) {
                    this.smokeSpawnTimer = 0;

                    // Spawn smoke from each position
                    for (const pos of smokePositions) {
                        this.particles.spawnSmokeColumn(pos);
                    }
                }
            });

            console.log(`🌫️ Atmospheric smoke initialized at ${smokePositions.length} positions`);
        }
    }

    pause() {
        this.isPaused = true;
        this.events.emit('game-paused');
        console.log('⏸️ Game paused');
    }

    resume() {
        this.isPaused = false;
        this.events.emit('game-resumed');
        console.log('▶️ Game resumed');
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
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

        // Check for pause input
        if (this.input.isPausePressed()) {
            this.togglePause();
        }

        // Check for vehicle enter/exit input (E key with debouncing)
        if (!this.lastEnterVehiclePress) this.lastEnterVehiclePress = 0;
        const now = Date.now();
        if (this.input.isEnterVehiclePressed() && now - this.lastEnterVehiclePress > 300) {
            this.lastEnterVehiclePress = now;
            this.vehicleSystem.attemptEnterVehicle();
        }

        this.waveSystem.update(deltaTime);
        this.difficulty.update(deltaTime);
        this.economy.update(deltaTime);
        this.physics.update(deltaTime);
        this.combat.update(deltaTime);
        this.particles.update(deltaTime);
        this.damageNumbers.update(deltaTime);
        this.touchControls.update(deltaTime);
        this.multiWeaponSystem.update(deltaTime);
        this.vehicleSystem.update(deltaTime);

        // Emit update event for atmospheric effects
        this.events.emit('update', deltaTime);

        // Update zombies from pool FIRST (before player needs to shoot)
        const activeZombies = this.zombiePool.getActive();

        // Legacy zombie array for compatibility - update BEFORE player update
        this.entities.enemies = activeZombies.filter(z => z.alive);

        if (this.entities.player) {
            for (let i = activeZombies.length - 1; i >= 0; i--) {
                const zombie = activeZombies[i];

                if (!zombie.alive) {
                    // Return to pool
                    this.zombiePool.despawn(zombie);
                    continue;
                }

                zombie.update(deltaTime, this.entities.player.position);
            }

            // Update LOD for zombies based on player distance
            this.zombiePool.updateLOD(this.entities.player.position);
        }

        // Update player AFTER enemies array is populated
        if (this.entities.player) {
            this.entities.player.update(deltaTime);
            this.camera.follow(this.entities.player.mesh, deltaTime);

            // Update vignette based on player health
            const healthPercent = this.entities.player.health / this.entities.player.maxHealth;
            this.renderer.updateHealthVignette(healthPercent);
        }

        // Use projectile pool for better performance
        this.projectilePool.update(deltaTime);

        // Keep legacy projectiles array updated for compatibility
        this.entities.projectiles = this.projectilePool.activeProjectiles;

        for (let i = this.entities.powerups.length - 1; i >= 0; i--) {
            const powerup = this.entities.powerups[i];
            powerup.update(deltaTime);

            if (!powerup.alive) {
                this.entities.powerups.splice(i, 1);
            }
        }

        // Update enemy projectiles (spitter acid shots)
        if (this.enemyProjectiles) {
            for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
                const proj = this.enemyProjectiles[i];
                proj.lifetime -= deltaTime;

                // Move projectile
                proj.position.x += proj.velocity.x * deltaTime;
                proj.position.z += proj.velocity.z * deltaTime;
                proj.mesh.position.copy(proj.position);
                proj.mesh.position.y = 1;

                // Check collision with player
                const dx = proj.position.x - this.entities.player.position.x;
                const dz = proj.position.z - this.entities.player.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 1) {
                    // Hit player
                    this.entities.player.takeDamage(proj.damage);
                    this.particles.spawnHitSpark(proj.position, 10);
                    this.sceneManager.scene.remove(proj.mesh);
                    this.enemyProjectiles.splice(i, 1);
                } else if (proj.lifetime <= 0) {
                    // Expired
                    this.sceneManager.scene.remove(proj.mesh);
                    this.enemyProjectiles.splice(i, 1);
                }
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

    addPowerup(powerup) {
        this.entities.powerups.push(powerup);
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

    // Note: Gold/money is now managed by EconomySystem
    // Use game.economy.addGold(amount) instead

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

        // Clean up renderer and composer
        if (this.renderer.composer) {
            this.renderer.composer.dispose();
        }
        this.renderer.renderer.dispose();

        // Clean up all entities
        if (this.entities.player) {
            this.entities.player.destroy();
        }
        this.entities.enemies.forEach(enemy => enemy.destroy());
        this.entities.projectiles.forEach(proj => proj.destroy());
        this.entities.powerups.forEach(powerup => powerup.destroy());

        console.log('🗑️ Game destroyed');
    }
}