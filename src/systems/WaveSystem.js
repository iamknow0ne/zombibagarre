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

        // Use difficulty system for zombie count
        this.zombiesInWave = this.game.difficulty.getZombieCount(this.game.wave);

        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;

        // Update spawn interval based on difficulty
        this.spawnInterval = this.game.difficulty.getSpawnInterval(this.game.wave);

        console.log(`📊 Wave ${this.game.wave}: ${this.zombiesInWave} zombies, spawn every ${this.spawnInterval}ms`);

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
                // Massive horde mode: spawn multiple zombies at once on later waves
                const batchSize = this.game.wave > 15 ? 5 :
                                 this.game.wave > 10 ? 3 :
                                 this.game.wave > 5 ? 2 : 1;

                for (let i = 0; i < batchSize && this.zombiesSpawned < this.zombiesInWave; i++) {
                    this.spawnZombie();
                }

                this.lastSpawn = 0;
            }
        }
    }

    spawnZombie() {
        const spawnPos = this.getRandomSpawnPosition();

        // Determine zombie type with progressive variety
        const roll = Math.random();
        let type = 'normal';

        // Use difficulty system for elite chance
        const eliteChance = this.game.difficulty.getCurrent().eliteSpawnChance;

        // Higher waves unlock more zombie types
        if (this.game.wave >= 10 && roll < 0.05) {
            type = 'invisible'; // 5% stealth zombies wave 10+
        } else if (this.game.wave >= 8 && roll < 0.1) {
            type = 'berserker'; // 5% berserkers wave 8+
        } else if (this.game.wave >= 6 && roll < 0.15) {
            type = 'armored'; // 5% armored wave 6+
        } else if (this.game.wave >= 5 && roll < 0.2) {
            type = 'spitter'; // 5% spitters wave 5+
        } else if (this.game.wave >= 4 && roll < 0.25) {
            type = 'toxic'; // 5% toxic wave 4+
        } else if (this.game.wave >= 3 && roll < 0.3) {
            type = 'exploder'; // 5% exploders wave 3+
        } else if (this.game.wave >= 2 && roll < 0.35) {
            type = 'tank'; // 5% tanks wave 2+
        } else if (roll < eliteChance) {
            type = 'elite'; // Progressive elite chance from difficulty
        } else if (roll < 0.4 + (this.game.wave * 0.02)) {
            type = 'fast'; // Fast zombies get more common
        }

        // Use zombie pool instead of creating new
        const zombie = this.game.zombiePool.spawn(spawnPos, type, this.game.wave);

        if (zombie) {
            // Pool handles adding to active list, Game.js updates enemies array
            this.zombiesSpawned++;
        } else {
            console.warn('⚠️ Failed to spawn zombie - pool exhausted');
        }
    }

    spawnBoss() {
        console.log('👹 BOSS SPAWNING!');

        const spawnPos = new THREE.Vector3(
            0,
            0,
            -50 // Spawn far away from player
        );

        // Use zombie pool for boss
        const boss = this.game.zombiePool.spawn(spawnPos, 'boss', this.game.wave);

        if (!boss) {
            console.error('❌ Failed to spawn boss!');
            return;
        }

        // Store boss reference and show health bar
        this.game.currentBoss = boss;
        if (window.showBossHealthBar) {
            window.showBossHealthBar(boss);
        }

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