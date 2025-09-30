import './styles.css';
import { Game } from './core/Game.js';

let game;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Zombie Bagarre 3D - Starting...');

    // Show loading screen
    showLoadingScreen();

    try {
        // Initialize game
        game = new Game();
        await game.init();

        // Hide loading, show start menu
        hideLoadingScreen();
        showStartMenu();

    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        showError(error.message);
    }
});

function showLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

function hideLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showStartMenu() {
    const menu = document.getElementById('menu');
    if (menu) {
        menu.style.display = 'flex';
    }

    // Setup start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
}

function startGame() {
    const menu = document.getElementById('menu');
    if (menu) {
        menu.style.display = 'none';
    }

    const hud = document.getElementById('hud');
    if (hud) {
        hud.style.display = 'block';
    }

    game.start();

    // Setup HUD updates
    setupHUD();
}

function setupHUD() {
    // Listen to game events and update HUD
    game.events.on('player-damaged', (data) => {
        updateHealthBar(data.health, data.maxHealth);
    });

    game.events.on('player-healed', (data) => {
        updateHealthBar(data.health, data.maxHealth);
    });

    game.events.on('experience-gained', (data) => {
        updateExperienceBar(data.total, game.experienceToNextLevel);
    });

    game.events.on('level-up', (data) => {
        showLevelUpScreen(data.level);
    });

    game.events.on('money-changed', (data) => {
        updateMoney(data.amount);
    });

    game.events.on('wave-start', (data) => {
        updateWave(data.wave);
    });

    game.events.on('game-over', (data) => {
        showGameOver(data);
    });

    // Initial update
    updateHealthBar(game.entities.player.health, game.entities.player.maxHealth);
    updateExperienceBar(game.experience, game.experienceToNextLevel);
    updateMoney(game.money);
    updateWave(game.wave);
}

function updateHealthBar(health, maxHealth) {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');

    if (healthFill) {
        const percent = (health / maxHealth) * 100;
        healthFill.style.width = `${percent}%`;
    }

    if (healthText) {
        healthText.textContent = `${Math.floor(health)} / ${maxHealth}`;
    }
}

function updateExperienceBar(exp, maxExp) {
    const expFill = document.getElementById('expFill');
    const levelText = document.getElementById('levelText');

    if (expFill) {
        const percent = (exp / maxExp) * 100;
        expFill.style.width = `${percent}%`;
    }

    if (levelText) {
        levelText.textContent = `Level ${game.level}`;
    }
}

function updateMoney(amount) {
    const moneyText = document.getElementById('moneyText');
    if (moneyText) {
        moneyText.textContent = `$${amount}`;
    }
}

function updateWave(wave) {
    const waveText = document.getElementById('waveText');
    if (waveText) {
        waveText.textContent = `Wave ${wave}`;
    }
}

function showLevelUpScreen(level) {
    const levelUpScreen = document.getElementById('levelUpScreen');
    if (levelUpScreen) {
        levelUpScreen.style.display = 'flex';
        document.getElementById('newLevel').textContent = level;

        // Continue button
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.onclick = () => {
                levelUpScreen.style.display = 'none';
                game.isPaused = false;
            };
        }
    }
}

function showGameOver(data) {
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
        document.getElementById('finalScore').textContent = data.score;
        document.getElementById('finalWave').textContent = data.wave;
        document.getElementById('finalLevel').textContent = data.level;

        // Restart button
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.onclick = () => {
                location.reload();
            };
        }
    }
}

function showError(message) {
    alert(`Error: ${message}\n\nPlease refresh the page.`);
}

// Handle window unload
window.addEventListener('beforeunload', () => {
    if (game) {
        game.destroy();
    }
});