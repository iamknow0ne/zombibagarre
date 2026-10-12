import './styles.css';
import { Game } from './core/Game.js';

let game;
let selectedCharacter = null;

// Character data
const CHARACTERS = {
    soldier: {
        maxHealth: 200,
        speed: 5,
        damage: 1.0,
        dashCooldownReduction: 0.2,
        startingWeapon: 'pistol'
    },
    tank: {
        maxHealth: 300,
        speed: 4,
        damage: 1.2,
        damageResistance: 0.3,
        startingWeapon: 'shotgun'
    },
    runner: {
        maxHealth: 150,
        speed: 7,
        damage: 0.8,
        speedBonus: 0.5,
        startingWeapon: 'smg'
    }
};

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Zombie Bagarre 3D - Starting...');

    // Show loading screen with animations
    showLoadingScreen();

    // Start loading bar animation
    const loadingFill = document.querySelector('.loading-fill');
    if (loadingFill) {
        loadingFill.style.animation = 'loading 3s ease-in-out forwards';
    }

    // Track loading time to ensure minimum display duration
    const startTime = Date.now();
    const minLoadTime = 3000; // 3 seconds minimum

    try {
        // Initialize game
        game = new Game();
        await game.init();

        // Apply difficulty from localStorage
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'normal';
        if (game.difficulty) {
            game.difficulty.setDifficulty(savedDifficulty);
            console.log(`🎮 Difficulty loaded: ${savedDifficulty}`);
        }

        // Calculate remaining time to show splashscreen animations
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsed);

        setTimeout(() => {
            // Fade out splashscreen
            const loadingScreen = document.getElementById('loading');
            if (loadingScreen) {
                loadingScreen.style.opacity = '1';
                loadingScreen.style.transition = 'opacity 0.8s ease-out';
                loadingScreen.style.opacity = '0';

                setTimeout(() => {
                    hideLoadingScreen();
                    showStartMenu();
                }, 800); // Wait for fade animation
            } else {
                hideLoadingScreen();
                showStartMenu();
            }
        }, remainingTime);

    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        console.error('Stack trace:', error.stack);
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

    // Setup start button - now shows character selection
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', showCharacterSelection);
    }

    // Setup settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
}

function showCharacterSelection() {
    const menu = document.getElementById('menu');
    const characterSelect = document.getElementById('characterSelect');

    if (menu) menu.style.display = 'none';
    if (characterSelect) characterSelect.style.display = 'flex';

    setupCharacterSelection();
}

function setupCharacterSelection() {
    // Setup character card selection
    const characterCards = document.querySelectorAll('.character-card');
    characterCards.forEach(card => {
        const selectBtn = card.querySelector('.select-character-btn');
        const characterType = card.getAttribute('data-character');

        // Hover effects
        card.addEventListener('click', (e) => {
            if (e.target === selectBtn) return; // Let button handle its own click

            // Highlight selected card
            characterCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharacter = characterType;
        });

        // Select button
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                selectedCharacter = characterType;
                console.log(`✅ Character selected: ${characterType}`);
                startGame();
            });
        }
    });

    // Back to menu button
    const backToMenu = document.getElementById('backToMenu');
    if (backToMenu) {
        backToMenu.addEventListener('click', () => {
            const characterSelect = document.getElementById('characterSelect');
            const menu = document.getElementById('menu');

            if (characterSelect) characterSelect.style.display = 'none';
            if (menu) menu.style.display = 'flex';
        });
    }
}

function startGame() {
    // Default to soldier if no character selected
    if (!selectedCharacter) {
        selectedCharacter = 'soldier';
    }

    const characterSelect = document.getElementById('characterSelect');
    const hud = document.getElementById('hud');

    if (characterSelect) characterSelect.style.display = 'none';
    if (hud) hud.style.display = 'block';

    // Apply character stats
    applyCharacterStats();

    game.start();

    // Setup HUD updates
    setupHUD();
}

function applyCharacterStats() {
    const charData = CHARACTERS[selectedCharacter];
    const player = game.entities.player;

    if (player && charData) {
        // Apply base stats
        player.maxHealth = charData.maxHealth;
        player.health = charData.maxHealth;
        player.speed = charData.speed;
        player.damage *= charData.damage;

        // Apply special perks
        if (charData.dashCooldownReduction) {
            player.dashMaxCooldown *= (1 - charData.dashCooldownReduction);
        }

        if (charData.damageResistance) {
            player.damageResistance = charData.damageResistance;
        }

        if (charData.speedBonus) {
            player.speed *= (1 + charData.speedBonus);
        }

        // Add starting weapon
        if (charData.startingWeapon && charData.startingWeapon !== 'pistol') {
            player.addWeapon(charData.startingWeapon);
        }

        console.log(`🎮 Character stats applied: ${selectedCharacter}`, charData);
    }
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

    // Listen for gold changes (new economy system)
    game.events.on('gold-changed', (data) => {
        updateMoney(data.amount); // Update HUD money display
        // Update shop if it's open
        const shopMenu = document.getElementById('shopMenu');
        if (shopMenu && shopMenu.style.display === 'flex') {
            updateShopDisplay();
        }
    });

    game.events.on('wave-start', (data) => {
        updateWave(data.wave);
    });

    game.events.on('game-over', (data) => {
        showGameOver(data);
    });

    game.events.on('game-paused', () => {
        showPauseMenu();
    });

    game.events.on('game-resumed', () => {
        hidePauseMenu();
    });

    game.events.on('boss-spawn', () => {
        showBossWarning();
    });

    game.events.on('weapon-changed', (data) => {
        updateWeaponDisplay(data.weapon);
    });

    game.events.on('zombie-killed', (data) => {
        updateKills(game.kills);

        // Check if boss was killed
        if (game.currentBoss && !game.currentBoss.alive) {
            // Boss defeated! Show victory screen
            setTimeout(() => {
                showBossVictoryScreen();
            }, 1000); // Delay for dramatic effect

            hideBossHealthBar();
            game.currentBoss = null;
        } else if (game.currentBoss && game.currentBoss.alive) {
            updateBossHealthBar(game.currentBoss);
        }
    });

    // Export functions to window for access from other modules
    window.showBossHealthBar = showBossHealthBar;
    window.updateBossHealthBar = updateBossHealthBar;
    window.hideBossHealthBar = hideBossHealthBar;

    // Setup shop button
    const openShopBtn = document.getElementById('openShop');
    if (openShopBtn) {
        openShopBtn.addEventListener('click', () => {
            game.pause();
            showShop();
        });
    }

    // Initial update - with null checks
    if (game.entities && game.entities.player) {
        updateHealthBar(game.entities.player.health, game.entities.player.maxHealth);
        // Use economy system for gold display
        const initialGold = game.economy ? game.economy.getGold() : 0;
        updateMoney(initialGold);
    }
    updateExperienceBar(game.experience, game.experienceToNextLevel);
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
        waveText.textContent = wave;
    }
}

function updateKills(kills) {
    const killsText = document.getElementById('killsText');
    if (killsText) {
        killsText.textContent = kills;
    }
}

function showLevelUpScreen(level) {
    // Play level up audio
    if (game.audio) {
        game.audio.playLevelUp();
    }

    const levelUpScreen = document.getElementById('levelUpScreen');
    if (levelUpScreen) {
        levelUpScreen.style.display = 'flex';
        document.getElementById('newLevel').textContent = level;

        // Get available skills
        const skills = game.skillSystem.getAvailableSkills();
        const skillChoicesDiv = document.getElementById('skillChoices');
        const continueBtn = document.getElementById('continueBtn');

        if (skills.length === 0) {
            // No skills available, just continue
            skillChoicesDiv.innerHTML = '<p style="grid-column: 1 / -1; color: #ffaa00;">All perks mastered! +50 HP bonus.</p>';
            game.entities.player.maxHealth += 50;
            game.entities.player.health = game.entities.player.maxHealth;
            continueBtn.style.display = 'block';
            continueBtn.onclick = () => {
                levelUpScreen.style.display = 'none';
                game.isPaused = false;
            };
        } else {
            // Show skill choices
            skillChoicesDiv.innerHTML = '';
            continueBtn.style.display = 'none';

            skills.forEach(skill => {
                const card = document.createElement('div');
                card.className = 'upgrade-card';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <h3 style="font-size: 48px; margin: 0;">${skill.icon}</h3>
                    <h4 style="color: #00ffff; margin: 10px 0;">${skill.name}</h4>
                    <p class="upgrade-level" style="margin: 5px 0;">Level ${skill.level + 1}/${skill.maxLevel}</p>
                    <p class="upgrade-desc" style="margin: 10px 0;">${skill.description}</p>
                `;

                card.onclick = () => {
                    // Apply skill
                    game.skillSystem.applySkill(skill.key);

                    // Close screen
                    levelUpScreen.style.display = 'none';
                    game.isPaused = false;
                };

                skillChoicesDiv.appendChild(card);
            });
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

function showPauseMenu() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = 'flex';

        // Setup resume button
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.onclick = () => {
                game.resume();
            };
        }

        // Setup quit button
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.onclick = () => {
                location.reload();
            };
        }
    }
}

function hidePauseMenu() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = 'none';
    }
}

function showBossWarning() {
    const bossWarning = document.getElementById('bossWarning');
    if (bossWarning) {
        bossWarning.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            bossWarning.style.display = 'none';
        }, 3000);
    }
}

function showBossHealthBar(boss) {
    const bossHealthBar = document.getElementById('bossHealthBar');
    const bossName = document.getElementById('bossName');
    const bossHealthFill = document.getElementById('bossHealthFill');
    const bossHealthText = document.getElementById('bossHealthText');

    if (bossHealthBar && boss) {
        bossHealthBar.style.display = 'block';
        bossName.textContent = '☠️ ZOMBIE BOSS ☠️';
        updateBossHealthBar(boss);
    }
}

function updateBossHealthBar(boss) {
    const bossHealthFill = document.getElementById('bossHealthFill');
    const bossHealthText = document.getElementById('bossHealthText');

    if (boss && bossHealthFill && bossHealthText) {
        const healthPercent = Math.max(0, boss.health / boss.maxHealth) * 100;
        bossHealthFill.style.width = healthPercent + '%';
        bossHealthText.textContent = `${Math.ceil(boss.health)} / ${boss.maxHealth}`;
    }
}

function hideBossHealthBar() {
    const bossHealthBar = document.getElementById('bossHealthBar');
    if (bossHealthBar) {
        bossHealthBar.style.display = 'none';
    }
}

function showBossVictoryScreen() {
    const victoryScreen = document.getElementById('bossVictoryScreen');
    if (!victoryScreen) return;

    // Pause the game
    game.pause();

    // Calculate boss reward (based on wave)
    const baseReward = 500;
    const waveBonus = (game.wave - 1) * 100; // Extra reward for later waves
    const totalReward = baseReward + waveBonus;

    // Award gold
    if (game.entities.player) {
        game.entities.player.addGold(totalReward);
    }

    // Update victory screen stats
    document.getElementById('bossReward').textContent = `$${totalReward}`;

    // Show screen
    victoryScreen.style.display = 'flex';

    // Setup continue button
    const continueBtn = document.getElementById('continueBossVictory');
    if (continueBtn) {
        continueBtn.onclick = () => {
            victoryScreen.style.display = 'none';
            game.resume();
        };
    }

    console.log(`🏆 Boss Victory! Reward: $${totalReward}`);
}

function showShop() {
    const shopMenu = document.getElementById('shopMenu');
    if (!shopMenu) return;

    shopMenu.style.display = 'flex';

    // Update money display
    updateShopDisplay();

    // Update build recap
    updateBuildRecap();

    // Setup upgrade buttons
    setupUpgradeButton('upgradeDamage', 'damage');
    setupUpgradeButton('upgradeFireRate', 'fireRate');
    setupUpgradeButton('upgradeHealth', 'health');
    setupUpgradeButton('upgradeSpeed', 'speed');

    // Setup close button
    const closeShopBtn = document.getElementById('closeShop');
    if (closeShopBtn) {
        closeShopBtn.onclick = () => {
            hideShop();
            game.resume();
        };
    }
}

function hideShop() {
    const shopMenu = document.getElementById('shopMenu');
    if (shopMenu) {
        shopMenu.style.display = 'none';
    }
}

function updateBuildRecap() {
    if (!game || !game.entities.player) return;

    const player = game.entities.player;
    const upgradeSystem = game.upgradeSystem;

    // Update Weapons
    const recapWeapons = document.getElementById('recapWeapons');
    if (recapWeapons) {
        recapWeapons.innerHTML = '';

        if (player.weapons && player.weapons.length > 0) {
            player.weapons.forEach((weapon, index) => {
                const weaponDiv = document.createElement('div');
                weaponDiv.className = 'recap-item';

                // Highlight current weapon
                if (index === player.currentWeaponIndex) {
                    weaponDiv.style.borderLeftColor = '#ff00ff';
                    weaponDiv.style.background = 'rgba(255, 0, 255, 0.1)';
                }

                weaponDiv.textContent = `${weapon.type.charAt(0).toUpperCase() + weapon.type.slice(1)}`;
                if (index === player.currentWeaponIndex) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'color: #ff00ff; font-size: 11px; margin-left: 5px;';
                    badge.textContent = '● ACTIVE';
                    weaponDiv.appendChild(badge);
                }

                recapWeapons.appendChild(weaponDiv);
            });
        } else {
            recapWeapons.innerHTML = '<div class="recap-empty">No weapons</div>';
        }
    }

    // Update Upgrades
    const recapUpgrades = document.getElementById('recapUpgrades');
    if (recapUpgrades) {
        recapUpgrades.innerHTML = '';

        const upgrades = [
            { name: 'Damage', level: upgradeSystem.upgrades.damage.level },
            { name: 'Fire Rate', level: upgradeSystem.upgrades.fireRate.level },
            { name: 'Max Health', level: upgradeSystem.upgrades.health.level },
            { name: 'Speed', level: upgradeSystem.upgrades.speed.level }
        ];

        upgrades.forEach(upgrade => {
            const upgradeDiv = document.createElement('div');
            upgradeDiv.className = 'recap-item';
            upgradeDiv.innerHTML = `
                <span class="recap-stat">${upgrade.name}</span>
                <span class="recap-value">Lv.${upgrade.level}</span>
            `;
            recapUpgrades.appendChild(upgradeDiv);
        });
    }

    // Update Skills/Perks
    const recapSkills = document.getElementById('recapSkills');
    if (recapSkills) {
        recapSkills.innerHTML = '';

        const activeSkills = [];
        const skills = game.skillSystem.skills;
        for (const [key, skill] of Object.entries(skills)) {
            if (skill.level > 0) {
                activeSkills.push({ icon: skill.icon, name: skill.name, level: skill.level });
            }
        }

        if (activeSkills.length > 0) {
            activeSkills.forEach(skill => {
                const skillDiv = document.createElement('div');
                skillDiv.className = 'recap-item';
                skillDiv.innerHTML = `
                    <span class="recap-stat">${skill.icon} ${skill.name}</span>
                    <span class="recap-value">Lv.${skill.level}</span>
                `;
                recapSkills.appendChild(skillDiv);
            });
        } else {
            recapSkills.innerHTML = '<div class="recap-empty">No skills unlocked</div>';
        }
    }
}

function showStatsScreen() {
    const statsScreen = document.getElementById('statsScreen');
    if (!statsScreen) return;

    statsScreen.style.display = 'flex';
    game.pause();

    // Populate stats
    const player = game.entities.player;
    const weapon = player.getCurrentWeapon();

    document.getElementById('statDamage').textContent = player.damage.toFixed(0);
    document.getElementById('statFireRate').textContent = weapon ? weapon.fireRate + 'ms' : 'N/A';
    document.getElementById('statCritChance').textContent = (game.combat.critChance * 100).toFixed(1) + '%';
    document.getElementById('statCritMult').textContent = game.combat.critMultiplier.toFixed(2) + 'x';
    document.getElementById('statWeapon').textContent = weapon ? weapon.type.toUpperCase() : 'PISTOL';
    document.getElementById('statHealth').textContent = `${player.health.toFixed(0)}/${player.maxHealth}`;
    document.getElementById('statSpeed').textContent = player.speed.toFixed(1);
    document.getElementById('statDash').textContent = player.dashMaxCooldown + 'ms';

    // Populate active perks
    const perksList = document.getElementById('activePerksList');
    perksList.innerHTML = '';
    const skills = game.skillSystem.skills;
    for (const [key, skill] of Object.entries(skills)) {
        if (skill.level > 0) {
            const perkDiv = document.createElement('div');
            perkDiv.style.cssText = 'background: rgba(255,170,0,0.1); border-left: 3px solid #ffaa00; padding: 5px 10px;';
            perkDiv.innerHTML = `<strong>${skill.icon} ${skill.name}</strong> <span style="color:#ffaa00;">Lv${skill.level}</span>`;
            perksList.appendChild(perkDiv);
        }
    }

    // Populate active buffs
    const buffsList = document.getElementById('activeBuffsList');
    buffsList.innerHTML = '';
    for (const [type, buff] of Object.entries(player.activePowerups)) {
        if (buff.active) {
            const buffDiv = document.createElement('div');
            buffDiv.style.cssText = 'background: rgba(0,255,255,0.2); border: 2px solid #00ffff; padding: 10px 15px; border-radius: 5px;';
            buffDiv.innerHTML = `<strong>${type.toUpperCase()}</strong><br><small>${(buff.duration / 1000).toFixed(1)}s (${buff.multiplier.toFixed(1)}x)</small>`;
            buffsList.appendChild(buffDiv);
        }
    }

    if (buffsList.children.length === 0) {
        buffsList.innerHTML = '<p style="color:#666;">No active buffs</p>';
    }
}

function hideStatsScreen() {
    const statsScreen = document.getElementById('statsScreen');
    if (statsScreen) {
        statsScreen.style.display = 'none';
        game.resume();
    }
}

// Add TAB key listener for stats screen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && game && game.isRunning && !game.isPaused) {
        e.preventDefault();
        showStatsScreen();
    } else if (e.key === 'Tab' && document.getElementById('statsScreen').style.display === 'flex') {
        e.preventDefault();
        hideStatsScreen();
    }
});

function setupUpgradeButton(buttonId, upgradeType) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.onclick = () => {
        const success = game.upgradeSystem.purchaseUpgrade(upgradeType);
        if (success) {
            updateShopDisplay();
            updateBuildRecap(); // Update build recap when upgrade purchased
        }
    };
}

function updateShopDisplay() {
    // Update gold (using economy system)
    const shopMoney = document.getElementById('shopMoney');
    if (shopMoney) {
        const currentGold = game.economy ? game.economy.getGold() : 0;
        shopMoney.textContent = currentGold;
    }

    // Update each upgrade's level and cost
    updateUpgradeDisplay('damage', 'damageLevel', 'damageCost');
    updateUpgradeDisplay('fireRate', 'fireRateLevel', 'fireRateCost');
    updateUpgradeDisplay('health', 'healthLevel', 'healthCost');
    updateUpgradeDisplay('speed', 'speedLevel', 'speedCost');
}

function updateUpgradeDisplay(upgradeType, levelId, costId) {
    const info = game.upgradeSystem.getUpgradeInfo(upgradeType);

    const levelEl = document.getElementById(levelId);
    if (levelEl) {
        levelEl.textContent = info.level;
    }

    const costEl = document.getElementById(costId);
    if (costEl) {
        costEl.textContent = info.cost;
    }

    // Disable button if can't afford
    const buttonMap = {
        damage: 'upgradeDamage',
        fireRate: 'upgradeFireRate',
        health: 'upgradeHealth',
        speed: 'upgradeSpeed'
    };

    const button = document.getElementById(buttonMap[upgradeType]);
    if (button) {
        if (game.upgradeSystem.canAfford(upgradeType)) {
            button.disabled = false;
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.style.opacity = '0.5';
        }
    }
}

function updateWeaponDisplay(weaponType) {
    const weaponText = document.getElementById('weaponText');
    if (weaponText) {
        weaponText.textContent = weaponType.toUpperCase();

        // Update color based on weapon type
        const colors = {
            pistol: '#ffffff',
            shotgun: '#ff6600',
            rifle: '#00ff00',
            smg: '#00ffff'
        };
        weaponText.style.color = colors[weaponType] || '#ffffff';
    }
}

function showSettings() {
    const menu = document.getElementById('menu');
    const settingsMenu = document.getElementById('settingsMenu');

    if (menu) menu.style.display = 'none';
    if (settingsMenu) settingsMenu.style.display = 'flex';

    setupSettingsControls();
}

function hideSettings() {
    const menu = document.getElementById('menu');
    const settingsMenu = document.getElementById('settingsMenu');

    if (settingsMenu) settingsMenu.style.display = 'none';
    if (menu) menu.style.display = 'flex';
}

// Track if settings have been initialized to prevent duplicate event listeners
let settingsInitialized = false;

function setupSettingsControls() {
    // Load saved settings from localStorage
    const settings = {
        difficulty: localStorage.getItem('gameDifficulty') || 'normal',
        quality: localStorage.getItem('graphicsQuality') || 'medium',
        effectsVolume: parseInt(localStorage.getItem('effectsVolume')) || 50,
        musicVolume: parseInt(localStorage.getItem('musicVolume')) || 30
    };

    // Difficulty selector
    const difficultyOptions = document.querySelectorAll('.difficulty-option');

    // Only attach event listeners once
    if (!settingsInitialized) {
        difficultyOptions.forEach(option => {
            const difficulty = option.getAttribute('data-difficulty');

            // Click handler (only attached once)
            option.addEventListener('click', () => {
                // Remove selection from all
                difficultyOptions.forEach(opt => opt.classList.remove('selected'));

                // Select clicked option
                option.classList.add('selected');

                // Save to localStorage
                localStorage.setItem('gameDifficulty', difficulty);

                // Apply to game if already initialized
                if (game && game.difficulty) {
                    game.difficulty.setDifficulty(difficulty);
                    console.log(`✅ Difficulty set to ${difficulty.toUpperCase()}`);
                }
            });
        });
        settingsInitialized = true;
    }

    // Always update visual selection when opening settings
    difficultyOptions.forEach(option => {
        const difficulty = option.getAttribute('data-difficulty');
        if (difficulty === settings.difficulty) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Quality dropdown
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
        qualitySelect.value = settings.quality;
        qualitySelect.onchange = () => {
            localStorage.setItem('graphicsQuality', qualitySelect.value);
            console.log(`Graphics quality set to ${qualitySelect.value}`);
        };
    }

    // Effects volume slider
    const effectsVolume = document.getElementById('effectsVolume');
    const effectsVolumeValue = document.getElementById('effectsVolumeValue');
    if (effectsVolume && effectsVolumeValue) {
        effectsVolume.value = settings.effectsVolume;
        effectsVolumeValue.textContent = `${settings.effectsVolume}%`;
        effectsVolume.oninput = () => {
            const value = effectsVolume.value;
            effectsVolumeValue.textContent = `${value}%`;
            localStorage.setItem('effectsVolume', value);
        };
    }

    // Music volume slider
    const musicVolume = document.getElementById('musicVolume');
    const musicVolumeValue = document.getElementById('musicVolumeValue');
    if (musicVolume && musicVolumeValue) {
        musicVolume.value = settings.musicVolume;
        musicVolumeValue.textContent = `${settings.musicVolume}%`;
        musicVolume.oninput = () => {
            const value = musicVolume.value;
            musicVolumeValue.textContent = `${value}%`;
            localStorage.setItem('musicVolume', value);
        };
    }

    // Fullscreen toggle
    const toggleFullscreen = document.getElementById('toggleFullscreen');
    if (toggleFullscreen) {
        toggleFullscreen.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        };
    }

    // Close settings button
    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) {
        closeSettings.onclick = hideSettings;
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