import * as THREE from 'three';
import { Zombie } from '../entities/Zombie.js';

export class WaveSystem {
    constructor(game) {
        this.game = game;

        this.zombiesInWave = 10;
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;

        this.waveDelay = 2000; // ms
        this.nextWaveTime = 0;
        this.spawnInterval = 1000; // ms between spawns
        this.lastSpawn = 0;

        this.eliteSpawnChance = 0.1;

        console.log('🌊 Wave system initialized');
    }

    startWave() {
        console.log(`🌊 Wave ${this.game.wave} starting!`);
        this.game.events.emit('wave-start', { wave: this.game.wave });

        // Calculate wave size with logarithmic scaling
        const baseSize = 8;
        const linearGrowth = Math.floor(this.game.wave * 1.5);
        const logarithmicGrowth = Math.floor(Math.log(this.game.wave + 1) * 10);
        const calculatedSize = baseSize + linearGrowth + logarithmicGrowth;

        this.zombiesInWave = Math.min(40, calculatedSize);
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;

        // Elite spawn chance increases with waves
        this.eliteSpawnChance = Math.min(0.5, 0.1 + (this.game.wave * 0.02));

        // Boss wave every 5 waves
        if (this.game.wave % 5 === 0) {
            this.spawnBoss();
        }

        this.lastSpawn = 0;
    }

    update(deltaTime) {
        // Check if wave is complete
        if (this.zombiesSpawned >= this.zombiesInWave && this.game.entities.enemies.length === 0) {
            this.nextWaveTime += deltaTime * 1000;

            if (this.nextWaveTime >= this.waveDelay) {
                this.nextWave();
            }
            return;
        }

        // Spawn zombies
        if (this.zombiesSpawned < this.zombiesInWave) {
            this.lastSpawn += deltaTime * 1000;

            if (this.lastSpawn >= this.spawnInterval) {
                this.spawnZombie();
                this.lastSpawn = 0;
            }
        }
    }

    spawnZombie() {
        const spawnPos = this.getRandomSpawnPosition();

        // Determine zombie type
        const isElite = Math.random() < this.eliteSpawnChance;
        const type = isElite ? 'elite' : 'normal';

        const zombie = new Zombie(this.game.sceneManager.scene, spawnPos, type, this.game);
        this.game.addEnemy(zombie);

        this.zombiesSpawned++;
    }

    spawnBoss() {
        console.log('👹 BOSS SPAWNING!');

        const spawnPos = new THREE.Vector3(
            0,
            0,
            -50 // Spawn far away from player
        );

        const boss = new Zombie(this.game.sceneManager.scene, spawnPos, 'boss', this.game);
        this.game.addEnemy(boss);

        this.zombiesSpawned++;

        // Visual/audio feedback
        this.game.screenShake(3, 1);
        this.game.events.emit('boss-spawn');
    }

    getRandomSpawnPosition() {
        const spawnDistance = 40;
        const angle = Math.random() * Math.PI * 2;

        return new THREE.Vector3(
            Math.cos(angle) * spawnDistance,
            0,
            Math.sin(angle) * spawnDistance
        );
    }

    nextWave() {
        this.game.wave++;
        this.nextWaveTime = 0;
        this.startWave();
    }
}