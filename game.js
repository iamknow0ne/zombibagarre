class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        
        // Game state - Properly balanced for challenging gameplay
        this.wave = 1;
        this.score = 0;
        this.gameStartTime = Date.now(); // Track game start time for survival timer
        this.money = 150;  // Balanced starting money for meaningful choices
        this.soldierCost = 75;  // Affordable soldier cost progression
        this.upgradeCost = 125; // Reasonable upgrade costs
        this.speedCost = 100;
        this.damageMultiplier = 1;
        this.speedMultiplier = 1;

        // Experience and Level System - PHASE 2.1: Linear scaling
        this.experience = 0;
        this.level = 1;
        this.experienceToNextLevel = 150; // First level: 100 + (50*1) = 150
        this.levelUpPending = false;

        // Weapon and Item System
        this.weapons = [{ id: 'rifle', name: 'Rifle', level: 1 }]; // Start with rifle
        this.passiveItems = [];
        this.maxWeapons = 6;
        this.maxPassiveItems = 6;

        // Meta Progression (persists between runs)
        this.loadMetaProgression();

        // Character System
        this.selectedCharacter = this.getSelectedCharacter() || 'soldier';
        this.characters = this.initCharacters();

        // Evolution System
        this.evolutions = this.initEvolutions();
        this.evolvedWeapons = [];
        
        // Player
        this.player = null;
        
        // Game objects
        this.soldiers = [];
        this.zombies = [];
        this.bullets = [];
        this.powerups = [];
        this.particles = [];
        this.enemyProjectiles = []; // Initialize enemy projectiles array
        this.hazards = []; // Initialize hazards array

        // Wave management
        this.zombiesInWave = 10; // Match wave 1 calculation: 8 + (1*2.5) + 0 = 10
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.killCount = 0; // Total kill counter
        this.waveDelay = 2000; // Shorter delay for faster paced challenge
        this.nextWaveTime = 0;
        this.eliteSpawnChance = 0.1; // PHASE 1.2: Elite enemy spawn rate

        // Controls
        this.keys = {};

        // Event cleanup tracking
        this.eventListeners = [];
        this.activeTimeouts = [];
        this.activeIntervals = [];

        // Timing
        this.lastTime = 0;
        this.powerupSpawnTimer = 0;
        this.survivalTime = 0;

        // Treasure Chest System
        this.treasureChests = [];

        // PHASE 1.1: Boss Arena System
        this.bossArenaActive = false;
        this.arenaFogWalls = [];
        this.inBossTransition = false;

        // PHASE 4.2: Damage Numbers System
        this.floatingTexts = [];

        // Visual Effects System
        this.screenShake = { intensity: 0, duration: 0 };
        this.chromaticAberration = { strength: 0 };
        this.timeDistortion = { factor: 1, targetFactor: 1 };
        this.backgroundEffects = [];

        // Audio System
        this.audioSystem = new AudioSystem();
        this.comboSystem = new ComboSystem();

        // Achievement System
        this.achievementSystem = new AchievementSystem(this);

        // Enable auto-save every 2 minutes
        this.enableAutoSave(2);

        this.init();
    }

    initCharacters() {
        return {
            soldier: {
                name: 'Soldier',
                description: 'Balanced fighter with rifle',
                startWeapon: 'rifle',
                maxHealth: 200,
                speed: 120,
                damage: 1.0,
                cooldown: 1.0,
                unlock: 'default'
            },
            commando: {
                name: 'Commando',
                description: 'High damage, slower movement',
                startWeapon: 'shotgun',
                maxHealth: 250,
                speed: 90,
                damage: 1.5,
                cooldown: 0.8,
                unlock: 'reach_wave_10'
            },
            scout: {
                name: 'Scout',
                description: 'Fast and agile',
                startWeapon: 'machinegun',
                maxHealth: 150,
                speed: 180,
                damage: 0.8,
                cooldown: 1.2,
                unlock: 'kill_500_zombies'
            },
            engineer: {
                name: 'Engineer',
                description: 'Starts with drone companion',
                startWeapon: 'laser',
                maxHealth: 180,
                speed: 110,
                damage: 1.0,
                cooldown: 1.0,
                unlock: 'collect_50_powerups',
                specialAbility: 'drone'
            },
            tank: {
                name: 'Tank',
                description: 'Heavy armor, slow but durable',
                startWeapon: 'rocket',
                maxHealth: 400,
                speed: 60,
                damage: 1.2,
                cooldown: 0.7,
                unlock: 'survive_30_minutes'
            }
        };
    }

    initEvolutions() {
        return {
            // Weapon Evolutions (weapon + passive item = evolved weapon)
            'rifle': {
                requires: 'ammo_box',
                evolvedForm: 'plasma_rifle',
                level: 8
            },
            'shotgun': {
                requires: 'spread_shot',
                evolvedForm: 'dragon_breath',
                level: 8
            },
            'machinegun': {
                requires: 'rapid_fire',
                evolvedForm: 'gatling_laser',
                level: 8
            },
            'laser': {
                requires: 'energy_core',
                evolvedForm: 'death_ray',
                level: 8
            },
            'rocket': {
                requires: 'explosive_rounds',
                evolvedForm: 'missile_barrage',
                level: 8
            },
            'knife': {
                requires: 'piercing',
                evolvedForm: 'soul_reaper',
                level: 8
            },
            'grenade': {
                requires: 'blast_radius',
                evolvedForm: 'holy_bomb',
                level: 8
            },
            // Union Evolutions (weapon + weapon = united weapon)
            'dual_pistols': {
                requires: 'pistol',
                evolvedForm: 'phieraggi',
                level: 8,
                isUnion: true
            }
        };
    }

    loadMetaProgression() {
        try {
            const saved = localStorage.getItem('zombieSurvivalMeta');
            if (saved) {
                const meta = JSON.parse(saved);
                // Validate the loaded data structure
                if (meta && typeof meta === 'object' && meta.totalCoins !== undefined) {
                    this.metaProgression = meta;
                } else {
                    console.warn('Invalid meta progression data, using defaults');
                    this.createDefaultMetaProgression();
                }
            } else {
                this.createDefaultMetaProgression();
            }
        } catch (error) {
            console.error('Failed to load meta progression:', error);
            this.createDefaultMetaProgression();
            // Clear corrupted data
            try {
                localStorage.removeItem('zombieSurvivalMeta');
            } catch (clearError) {
                console.error('Failed to clear corrupted save data:', clearError);
            }
        }
    }

    createDefaultMetaProgression() {
        this.metaProgression = {
            totalCoins: 0,
            unlockedCharacters: ['soldier'],
            unlockedWeapons: ['rifle', 'shotgun', 'machinegun'],
            permanentUpgrades: {
                maxHealth: 0,
                damage: 0,
                speed: 0,
                luck: 0,
                experience: 0
            },
            achievements: [],
            statistics: {
                totalKills: 0,
                totalDeaths: 0,
                highestWave: 1,
                longestSurvival: 0,
                totalPowerupsCollected: 0
            }
        };
    }

    saveMetaProgression() {
        try {
            localStorage.setItem('zombieSurvivalMeta', JSON.stringify(this.metaProgression));
        } catch (error) {
            console.error('Failed to save meta progression:', error);
            // Could be quota exceeded or other localStorage issues
        }
    }

    // Save current game state
    saveGame() {
        try {
            const gameState = {
                version: '1.0', // For future compatibility
                timestamp: Date.now(),

                // Game Progress
                wave: this.wave,
                score: this.score,
                money: this.money,
                level: this.level,
                experience: this.experience,
                experienceToNextLevel: this.experienceToNextLevel,
                killCount: this.killCount,
                gameStartTime: this.gameStartTime,
                survivalTime: this.survivalTime,

                // Character and upgrades
                selectedCharacter: this.selectedCharacter,
                damageMultiplier: this.damageMultiplier,
                speedMultiplier: this.speedMultiplier,
                soldierCost: this.soldierCost,
                upgradeCost: this.upgradeCost,
                speedCost: this.speedCost,

                // Weapons and items
                weapons: this.weapons,
                passiveItems: this.passiveItems,
                evolvedWeapons: this.evolvedWeapons,

                // Player state (if game is running)
                player: this.player ? {
                    x: this.player.x,
                    y: this.player.y,
                    health: this.player.health,
                    maxHealth: this.player.maxHealth
                } : null,

                // Combo system state
                comboData: this.comboSystem.getComboData(),

                // Achievement system state
                achievements: this.achievementSystem.achievements,

                // Wave state
                zombiesInWave: this.zombiesInWave,
                zombiesSpawned: this.zombiesSpawned,
                zombiesKilled: this.zombiesKilled
            };

            localStorage.setItem('zombieSurvivalSave', JSON.stringify(gameState));

            // Show save confirmation
            this.showNotification('Game saved successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            this.showNotification('Failed to save game', 'error');
            return false;
        }
    }

    // Load game state
    loadGame() {
        try {
            const savedData = localStorage.getItem('zombieSurvivalSave');
            if (!savedData) {
                return false; // No save data exists
            }

            const gameState = JSON.parse(savedData);

            // Validate save data version and structure
            if (!gameState.version || !gameState.timestamp) {
                console.warn('Invalid save data structure');
                return false;
            }

            // Stop current game
            this.isRunning = false;
            this.cleanup();

            // Restore game progress
            this.wave = gameState.wave || 1;
            this.score = gameState.score || 0;
            this.money = gameState.money || 150;
            this.level = gameState.level || 1;
            this.experience = gameState.experience || 0;
            this.experienceToNextLevel = gameState.experienceToNextLevel || 100;
            this.killCount = gameState.killCount || 0;
            this.gameStartTime = gameState.gameStartTime || Date.now();
            this.survivalTime = gameState.survivalTime || 0;

            // Restore character and upgrades
            this.selectedCharacter = gameState.selectedCharacter || 'soldier';
            this.damageMultiplier = gameState.damageMultiplier || 1;
            this.speedMultiplier = gameState.speedMultiplier || 1;
            this.soldierCost = gameState.soldierCost || 75;
            this.upgradeCost = gameState.upgradeCost || 150;
            this.speedCost = gameState.speedCost || 100;

            // Restore weapons and items
            this.weapons = gameState.weapons || [{ id: 'rifle', name: 'Rifle', level: 1 }];
            this.passiveItems = gameState.passiveItems || [];
            this.evolvedWeapons = gameState.evolvedWeapons || [];

            // Restore combo system
            if (gameState.comboData) {
                this.comboSystem.kills = gameState.comboData.kills || 0;
                this.comboSystem.comboLevel = gameState.comboData.comboLevel || -1;
                this.comboSystem.comboMultiplier = gameState.comboData.multiplier || 1;
                this.comboSystem.lastKillTime = Date.now(); // Reset timing
            }

            // Restore achievement system
            if (gameState.achievements) {
                for (const [id, achievement] of Object.entries(gameState.achievements)) {
                    if (this.achievementSystem.achievements[id]) {
                        this.achievementSystem.achievements[id].unlocked = achievement.unlocked;
                    }
                }
            }

            // Restore wave state
            this.zombiesInWave = gameState.zombiesInWave || 25;
            this.zombiesSpawned = gameState.zombiesSpawned || 0;
            this.zombiesKilled = gameState.zombiesKilled || 0;

            // Clear game objects (will be repopulated)
            this.soldiers = [];
            this.zombies = [];
            this.bullets = [];
            this.powerups = [];
            this.particles = [];
            this.enemyProjectiles = [];
            this.treasureChests = [];

            // Recreate player if saved
            if (gameState.player) {
                this.createPlayer();
                this.player.x = gameState.player.x;
                this.player.y = gameState.player.y;
                this.player.health = gameState.player.health;
                this.player.maxHealth = gameState.player.maxHealth;
            } else {
                this.createPlayer();
            }

            // Update UI with loaded state
            this.updateUI();

            // Show load confirmation
            this.showNotification(`Game loaded! Wave ${this.wave}`, 'success');

            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.showNotification('Failed to load saved game', 'error');
            return false;
        }
    }

    // Delete saved game
    deleteSave() {
        try {
            localStorage.removeItem('zombieSurvivalSave');
            this.showNotification('Save game deleted', 'info');
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    // Check if save game exists
    hasSavedGame() {
        try {
            const savedData = localStorage.getItem('zombieSurvivalSave');
            return !!savedData;
        } catch (error) {
            return false;
        }
    }

    // Get save game info
    getSaveGameInfo() {
        try {
            const savedData = localStorage.getItem('zombieSurvivalSave');
            if (savedData) {
                const gameState = JSON.parse(savedData);
                return {
                    wave: gameState.wave || 1,
                    level: gameState.level || 1,
                    score: gameState.score || 0,
                    character: gameState.selectedCharacter || 'soldier',
                    timestamp: gameState.timestamp,
                    timeAgo: this.getTimeAgo(gameState.timestamp)
                };
            }
        } catch (error) {
            console.error('Failed to get save info:', error);
        }
        return null;
    }

    // Auto-save functionality
    enableAutoSave(intervalMinutes = 5) {
        // Clear any existing auto-save interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Set up auto-save every N minutes (only when game is running)
        this.autoSaveInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.saveGame();
            }
        }, intervalMinutes * 60 * 1000);

        // Store interval reference for cleanup
        this.activeIntervals.push(this.autoSaveInterval);
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // Notification system for save/load feedback
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        // Set background color based on type
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getSelectedCharacter() {
        try {
            return localStorage.getItem('selectedCharacter') || 'soldier';
        } catch (error) {
            console.error('Failed to get selected character:', error);
            return 'soldier';
        }
    }
    
    init() {
        this.setupCanvas();
        this.cacheDOMElements(); // Cache DOM elements for performance
        this.setupEventListeners();
        this.createPlayer();
        this.startGame();
        this.updateUI();
    }

    cacheDOMElements() {
        // Cache frequently accessed DOM elements to avoid repeated getElementById calls
        this.domElements = {
            // UI Elements
            levelNumber: document.getElementById('levelNumber'),
            expValue: document.getElementById('expValue'),
            expMax: document.getElementById('expMax'),
            expBar: document.getElementById('expBar'),
            healthBar: document.getElementById('healthBar'),
            healthText: document.getElementById('healthText'),
            waveNumber: document.getElementById('waveNumber'),
            waveProgressBar: document.getElementById('waveProgressBar'),
            waveProgressText: document.getElementById('waveProgressText'),
            moneyValue: document.getElementById('moneyValue'),
            currentWeapon: document.getElementById('currentWeapon'),
            ammoCount: document.getElementById('ammoCount'),

            // Boss Elements
            bossHealthContainer: document.getElementById('bossHealthContainer'),
            bossHealthBar: document.getElementById('bossHealthBar'),
            bossHealthText: document.getElementById('bossHealthText'),
            bossDisplayName: document.getElementById('bossDisplayName'),

            // Game Over Elements
            finalScore: document.getElementById('finalScore'),
            finalWave: document.getElementById('finalWave'),
            gameOver: document.getElementById('gameOver')
        };
    }

    setupCanvas() {
        // Make canvas responsive to screen size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        // Mobile optimization: reduce DPR on mobile devices for better performance
        const isMobile = window.innerWidth <= 768 ||
                         ('ontouchstart' in window) ||
                         (navigator.maxTouchPoints > 0);

        const dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 2) : (window.devicePixelRatio || 1);
        const rect = this.canvas.getBoundingClientRect();

        // Set the actual canvas size in memory (scaled by device pixel ratio)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Scale the canvas back down using CSS
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        // CRITICAL FIX: Reset transform before applying scale
        // Setting canvas.width/height automatically resets the context, so scale is safe here
        // No need to reset transform as canvas resize already did it
        this.ctx.scale(dpr, dpr);

        // Store logical dimensions for game calculations
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;

        // Set to fullscreen battlefield view - no zoom reduction
        this.globalZoom = 1.0; // Fullscreen battlefield view for maximum immersion
    }

    getCanvasWidth() {
        return this.logicalWidth || this.canvas.width || 800;
    }

    getCanvasHeight() {
        return this.logicalHeight || this.canvas.height || 600;
    }
    
    setupEventListeners() {
        // Prevent mobile page scrolling and zoom
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) e.preventDefault(); // Prevent zoom
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
        }, { passive: false });

        // Store listeners for cleanup
        const buySoldierHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.buySoldier();
        };
        const upgradeDamageHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.upgradeDamage();
        };
        const upgradeSpeedHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.upgradeSpeed();
        };
        const pauseHandler = () => this.togglePause();
        const restartHandler = () => this.restart();
        const resumeHandler = () => this.resumeGame();

        // Pause menu handlers
        this.setupPauseMenuHandlers();

        const keydownHandler = (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;

            // Save/Load shortcuts
            if (e.ctrlKey || e.metaKey) { // Support both Ctrl and Cmd (Mac)
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault(); // Prevent browser save dialog
                        if (this.isRunning) {
                            this.saveGame();
                            this.audioSystem.playSound('button_click');
                        }
                        break;
                    case 'l':
                        e.preventDefault(); // Prevent browser location bar
                        if (this.hasSavedGame()) {
                            this.loadGame();
                            this.audioSystem.playSound('button_click');
                            // Start the loaded game
                            if (!this.isRunning) {
                                this.startGame();
                            }
                        } else {
                            this.showNotification('No saved game found', 'warning');
                        }
                        break;
                }
            }

            // Regular pause with P key
            if (e.key.toLowerCase() === 'p' && this.isRunning) {
                this.togglePause();
            }
        };

        const keyupHandler = (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        };

        const canvasClickHandler = (e) => this.handleCanvasClick(e);

        // Add event listeners and track them with error handling
        try {
            const buySoldierEl = document.getElementById('buySoldier');
            const upgradeDamageEl = document.getElementById('upgradeDamage');
            const upgradeSpeedEl = document.getElementById('upgradeSpeed');
            const pauseEl = document.getElementById('pauseBtn');
            const restartEl = document.getElementById('restartBtn');

            if (buySoldierEl) {
                buySoldierEl.addEventListener('click', buySoldierHandler);
                buySoldierEl.addEventListener('touchend', buySoldierHandler);
            }
            if (upgradeDamageEl) {
                upgradeDamageEl.addEventListener('click', upgradeDamageHandler);
                upgradeDamageEl.addEventListener('touchend', upgradeDamageHandler);
            }
            if (upgradeSpeedEl) {
                upgradeSpeedEl.addEventListener('click', upgradeSpeedHandler);
                upgradeSpeedEl.addEventListener('touchend', upgradeSpeedHandler);
            }

            pauseEl?.addEventListener('click', pauseHandler);
            restartEl?.addEventListener('click', restartHandler);
            window.addEventListener('keydown', keydownHandler);
            window.addEventListener('keyup', keyupHandler);
            this.canvas?.addEventListener('click', canvasClickHandler);

            // Store for cleanup (only valid elements)
            this.eventListeners.push(
                ...(buySoldierEl ? [
                    { element: buySoldierEl, event: 'click', handler: buySoldierHandler },
                    { element: buySoldierEl, event: 'touchend', handler: buySoldierHandler }
                ] : []),
                ...(upgradeDamageEl ? [
                    { element: upgradeDamageEl, event: 'click', handler: upgradeDamageHandler },
                    { element: upgradeDamageEl, event: 'touchend', handler: upgradeDamageHandler }
                ] : []),
                ...(upgradeSpeedEl ? [
                    { element: upgradeSpeedEl, event: 'click', handler: upgradeSpeedHandler },
                    { element: upgradeSpeedEl, event: 'touchend', handler: upgradeSpeedHandler }
                ] : []),
                ...(pauseEl ? [{ element: pauseEl, event: 'click', handler: pauseHandler }] : []),
                ...(restartEl ? [{ element: restartEl, event: 'click', handler: restartHandler }] : []),
                { element: window, event: 'keydown', handler: keydownHandler },
                { element: window, event: 'keyup', handler: keyupHandler },
                ...(this.canvas ? [{ element: this.canvas, event: 'click', handler: canvasClickHandler }] : [])
            );
        } catch (error) {
            console.error('Failed to setup some event listeners:', error);
        }
    }

    // Wrapper methods to track timeouts and intervals for cleanup
    createTimeout(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        this.activeTimeouts.push(timeoutId);
        return timeoutId;
    }

    createInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.activeIntervals.push(intervalId);
        return intervalId;
    }

    // Cleanup method to remove all event listeners and clear timeouts/intervals
    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        // Clear timeouts
        this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.activeTimeouts = [];

        // Clear intervals
        this.activeIntervals.forEach(intervalId => clearInterval(intervalId));
        this.activeIntervals = [];
    }

    handleCanvasClick(e) {
        // Power-ups are now collected by player collision, not clicking
        // This method is kept for potential future use
    }
    
    createPlayer() {
        // Start player in the center of the screen with 4-directional movement
        this.player = new Player(this.getCanvasWidth() / 2, this.getCanvasHeight() / 2, this);

        // Add starting weapon based on character
        const character = this.characters[this.selectedCharacter];
        if (character && character.startWeapon) {
            this.addOrUpgradeWeapon(character.startWeapon, character.startWeapon.charAt(0).toUpperCase() + character.startWeapon.slice(1));
        }
    }
    
    buySoldier() {
        const adjustedCost = this.getAdjustedUpgradeCost(this.soldierCost);
        if (this.money >= adjustedCost) {
            this.audioSystem.playSound('purchase');
            this.money -= adjustedCost;
            // Spawn soldiers around the player in a circle formation
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 20;
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;
            // Ensure soldier spawn position is within bounds
            const boundedX = Math.max(30, Math.min(this.getCanvasWidth() - 30, x));
            const boundedY = Math.max(30, Math.min(this.getCanvasHeight() - 30, y));
            this.soldiers.push(new Soldier(boundedX, boundedY, this));
            this.soldierCost = Math.floor(this.soldierCost * 1.5); // Increased scaling
            this.updateUI();
        }
    }
    
    upgradeDamage() {
        const adjustedCost = this.getAdjustedUpgradeCost(this.upgradeCost);
        if (this.money >= adjustedCost) {
            this.audioSystem.playSound('upgrade');
            this.money -= adjustedCost;
            this.damageMultiplier += 0.4; // Slightly reduced bonus
            this.upgradeCost = Math.floor(this.upgradeCost * 1.7); // Increased scaling
            this.updateUI();
        }
    }

    upgradeSpeed() {
        const adjustedCost = this.getAdjustedUpgradeCost(this.speedCost);
        if (this.money >= adjustedCost) {
            this.audioSystem.playSound('upgrade');
            this.money -= adjustedCost;
            this.speedMultiplier += 0.25; // Slightly reduced bonus
            this.speedCost = Math.floor(this.speedCost * 1.6); // Increased scaling
            this.updateUI();
        }
    }

    getAdjustedUpgradeCost(baseCost) {
        // PHASE 1.3: REMOVED wave-based inflation - costs stay constant
        return baseCost;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pauseMenu');
        if (this.isPaused) {
            if (pauseMenu) pauseMenu.style.display = 'flex';
            // Update pause menu with current stats
            this.updatePauseMenuStats();
        } else {
            if (pauseMenu) pauseMenu.style.display = 'none';
        }
    }

    resumeGame() {
        this.isPaused = false;
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) pauseMenu.style.display = 'none';
    }

    setupPauseMenuHandlers() {
        try {
            // Tab switching
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    // Add active class to clicked tab
                    btn.classList.add('active');
                    const targetTab = btn.getAttribute('data-tab');
                    const targetContent = document.getElementById(targetTab + 'Tab');
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                });
            });

            // Resume and restart buttons
            const resumeBtn = document.getElementById('resumeBtn');
            const restartBtn = document.getElementById('restartBtn');

            if (resumeBtn) {
                resumeBtn.addEventListener('click', () => this.resumeGame());
            }
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    this.restart();
                    this.resumeGame();
                });
            }

            // Save and load buttons
            const saveBtn = document.getElementById('saveBtn');
            const loadBtn = document.getElementById('loadBtn');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveGame();
                    this.audioSystem.playSound('button_click');
                });
            }
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    if (this.hasSavedGame()) {
                        this.loadGame();
                        this.audioSystem.playSound('button_click');
                        this.resumeGame();
                        if (!this.isRunning) {
                            this.startGame();
                        }
                    } else {
                        this.showNotification('No saved game found', 'warning');
                    }
                });
            }
        } catch (error) {
            console.error('Failed to setup pause menu handlers:', error);
        }
    }

    updatePauseMenuStats() {
        // Update all stats in the pause menu
        this.updateUI();

        // Update weapons and passives in pause menu tabs
        this.updateWeaponsPanel();
        this.updatePassivesPanel();
    }
    
    startGame() {
        this.isRunning = true;
        this.gameLoop();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(deltaTime * this.timeDistortion.factor);
        }

        // Update visual effects (always update even when paused)
        VisualEffects.updateEffects(this, deltaTime);
        VisualEffects.updateBackgroundEffects(this, deltaTime);
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update survival time
        this.survivalTime = Date.now() - this.gameStartTime;

        // Check survival time achievements (only check every few seconds to avoid spam)
        if (Math.floor(this.survivalTime / 1000) % 30 === 0 && Math.floor(this.survivalTime / 1000) > 0) {
            this.achievementSystem.checkAchievements('survival_time', this.survivalTime);
        }

        // Update combo system
        const comboUpdate = this.comboSystem.update();
        if (comboUpdate.comboLost) {
            // Optional: Play combo lost sound or visual effect
        }

        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // Update wave spawning
        this.updateWaveSpawning(deltaTime);
        
        // Update game objects - Optimized for demo performance
        for (let i = this.soldiers.length - 1; i >= 0; i--) {
            this.soldiers[i].update(deltaTime);
        }

        for (let i = this.zombies.length - 1; i >= 0; i--) {
            this.zombies[i].update(deltaTime);
            if (this.zombies[i].health <= 0) {
                this.zombies.splice(i, 1);
            }
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(deltaTime);
            if (!this.bullets[i].active) {
                this.bullets.splice(i, 1);
            }
        }

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            this.powerups[i].update(deltaTime);
            if (!this.powerups[i].active) {
                this.powerups.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (!this.particles[i].active) {
                this.particles.splice(i, 1);
            }
        }

        // PHASE 4.2: Update floating damage numbers
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.lifetime -= deltaTime;
            text.y += text.velocity.y * deltaTime / 1000;
            text.x += text.velocity.x * deltaTime / 1000;
            text.velocity.y -= 200 * deltaTime / 1000; // Gravity

            if (text.lifetime <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        for (let i = this.treasureChests.length - 1; i >= 0; i--) {
            this.treasureChests[i].glowTime += deltaTime;
        }

        // Update enemy projectiles - Optimized
        const boundary = 300;
        const canvasW = this.getCanvasWidth();
        const canvasH = this.getCanvasHeight();

        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            projectile.x += projectile.vx * deltaTime / 1000;
            projectile.y += projectile.vy * deltaTime / 1000;

            if (projectile.x < -boundary || projectile.x > canvasW + boundary ||
                projectile.y < -boundary || projectile.y > canvasH + boundary) {
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // Update hazards - Optimized
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            this.hazards[i].duration -= deltaTime;
            if (this.hazards[i].duration <= 0) {
                this.hazards.splice(i, 1);
            }
        }
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn powerups rarely - balanced for challenge
        this.powerupSpawnTimer += deltaTime;
        if (this.powerupSpawnTimer > 12000 + Math.random() * 8000) { // 12-20 seconds instead of 3-7 seconds
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
        
        // Check game over
        if (!this.player || this.player.health <= 0) {
            this.gameOver();
        }
    }
    
    updateWaveSpawning(deltaTime) {
        // PHASE 1.1: Don't spawn during boss transition
        if (this.inBossTransition) return;

        if (this.zombiesSpawned < this.zombiesInWave) {
            // Spawn zombies in manageable bursts - challenging but fair frequency
            const spawnRate = Math.min(0.15, 0.04 + (this.wave * 0.002)); // Reasonable spawn rate
            if (Math.random() < spawnRate) {
                this.spawnZombieBurst();
            }
            // Also spawn individual zombies for steady pressure
            if (Math.random() < Math.min(0.08, 0.02 + (this.wave * 0.001))) {
                this.spawnZombie();
            }
        } else if (this.zombies.length === 0) {
            this.nextWaveTime += deltaTime;
            if (this.nextWaveTime >= this.waveDelay) {
                this.startNextWave();
            }
        }
    }
    
    startNextWave() {
        this.wave++;
        this.audioSystem.playSound('wave_complete');

        // Check wave-based achievements
        this.achievementSystem.checkAchievements('wave', this.wave);

        // PHASE 1.2: LOGARITHMIC WAVE SCALING - Sustainable difficulty curve
        // Quality over quantity: Fewer enemies but more elite types
        const baseSize = 8;
        const linearGrowth = Math.floor(this.wave * 1.5); // Reduced from 2.5
        const logarithmicGrowth = Math.floor(Math.log(this.wave + 1) * 10); // Logarithmic scaling

        // CAP: Never more than 40 simultaneous enemies
        const calculatedSize = baseSize + linearGrowth + logarithmicGrowth;
        this.zombiesInWave = Math.min(40, calculatedSize);

        // Increase elite spawn rates instead of quantity
        this.eliteSpawnChance = Math.min(0.5, 0.1 + (this.wave * 0.02));

        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.nextWaveTime = 0;

        // Check if this is a boss wave (every 5 waves)
        if (this.wave % 5 === 0) {
            this.spawnBoss();
            // Boss waves: Reduce regular enemy count by 50%
            this.zombiesInWave = Math.floor(this.zombiesInWave * 0.5);
        }

        this.updateUI();
    }

    spawnBoss() {
        let bossType = 'boss'; // Default boss type

        // Determine boss type based on wave number
        if (this.wave >= 50) bossType = 'final_nightmare';
        else if (this.wave >= 45) bossType = 'ice_queen';
        else if (this.wave >= 40) bossType = 'thunder_titan';
        else if (this.wave >= 35) bossType = 'void_spawner';
        else if (this.wave >= 30) bossType = 'crystal_guardian';
        else if (this.wave >= 25) bossType = 'flame_berserker';
        else if (this.wave >= 20) bossType = 'shadow_reaper';
        else if (this.wave >= 15) bossType = 'plague_mother';
        else if (this.wave >= 10) bossType = 'iron_colossus';
        else if (this.wave >= 5) bossType = 'horde_king';

        // PHASE 1.1: BOSS ARENA SYSTEM - Clear all enemies and create safe zone
        this.inBossTransition = true;

        // Clear remaining non-boss enemies for clean arena
        this.zombies = this.zombies.filter(z => z.isBoss && z.isBoss());

        // Create boss arena with fog walls (Dark Souls style)
        this.createBossArena();

        // Show fog gate warning first
        this.showFogGateWarning(bossType);

        // CRITICAL FIX: Spawn boss OFF-SCREEN at top, not on player
        const bossX = this.getCanvasWidth() / 2;
        const bossY = -200; // OFF screen - boss walks in dramatically

        // Wait 3 seconds for player to prepare, then spawn boss
        this.createTimeout(() => {
            const boss = new Zombie(bossX, bossY, bossType, this);
            boss.isBossWaveSpawn = true;
            this.zombies.push(boss);

            // Create dramatic boss entrance effect at spawn location
            for (let i = 0; i < 30; i++) {
                this.particles.push(new Particle(bossX, bossY, boss.color, 'large', 'explosion'));
            }
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(bossX, bossY, '#FFD700', 'medium', 'energy'));
            }
            // Add magic sparkles for dramatic effect
            for (let i = 0; i < 15; i++) {
                this.particles.push(new Particle(
                    bossX + (Math.random() - 0.5) * 100,
                    bossY + (Math.random() - 0.5) * 100,
                    '#ffffff',
                    'small',
                    'magic'
                ));
            }

            // Show boss health bar
            this.showBossHealthBar(boss);

            // Add dramatic visual effects
            VisualEffects.addScreenShake(this, 15, 1000);
            VisualEffects.createBackgroundEffect(this, 'energy_ripple', bossX, bossY);
            VisualEffects.addTimeDistortion(this, 0.3, 2000);

            // End transition - allow combat
            this.inBossTransition = false;
        }, 3000);
    }

    // NEW: Dark Souls style fog gate warning
    showFogGateWarning(bossType) {
        const bossNames = {
            'horde_king': 'THE HORDE KING APPROACHES!',
            'iron_colossus': 'IRON COLOSSUS AWAKENS!',
            'plague_mother': 'PLAGUE MOTHER EMERGES!',
            'shadow_reaper': 'SHADOW REAPER MANIFESTS!',
            'flame_berserker': 'FLAME BERSERKER RAGES!',
            'crystal_guardian': 'CRYSTAL GUARDIAN RISES!',
            'void_spawner': 'VOID SPAWNER OPENS THE ABYSS!',
            'thunder_titan': 'THUNDER TITAN STORMS!',
            'ice_queen': 'ICE QUEEN FREEZES ALL!',
            'final_nightmare': 'THE FINAL NIGHTMARE AWAKENS!'
        };

        const bossWarning = document.getElementById('bossWarning');
        const bossName = document.getElementById('bossName');

        if (bossWarning && bossName) {
            bossName.textContent = bossNames[bossType] || 'BOSS APPROACHES!';
            bossWarning.classList.remove('hidden');

            // Show for full 3 seconds of preparation time
            this.createTimeout(() => {
                bossWarning.classList.add('hidden');
            }, 3000);
        }
    }

    // NEW: Create boss arena boundaries
    createBossArena() {
        this.bossArenaActive = true;

        // Create visual fog walls at screen edges (for rendering)
        this.arenaFogWalls = [
            { x: -50, y: 0, width: 50, height: this.getCanvasHeight() }, // Left
            { x: this.getCanvasWidth(), y: 0, width: 50, height: this.getCanvasHeight() }, // Right
            { x: 0, y: -50, width: this.getCanvasWidth(), height: 50 }, // Top
            { x: 0, y: this.getCanvasHeight(), width: this.getCanvasWidth(), height: 50 } // Bottom
        ];
    }

    // NEW: Clear boss arena after boss death
    clearBossArena() {
        this.bossArenaActive = false;
        this.arenaFogWalls = [];
    }


    showBossHealthBar(boss) {
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        const bossDisplayName = document.getElementById('bossDisplayName');
        const bossHealthBar = document.getElementById('bossHealthBar');
        const bossHealthText = document.getElementById('bossHealthText');

        if (bossHealthContainer && bossDisplayName && bossHealthBar && bossHealthText) {
            // Get display name for boss
            const bossDisplayNames = {
                'horde_king': 'THE HORDE KING',
                'iron_colossus': 'IRON COLOSSUS',
                'plague_mother': 'PLAGUE MOTHER',
                'shadow_reaper': 'SHADOW REAPER',
                'flame_berserker': 'FLAME BERSERKER',
                'crystal_guardian': 'CRYSTAL GUARDIAN',
                'void_spawner': 'VOID SPAWNER',
                'thunder_titan': 'THUNDER TITAN',
                'ice_queen': 'ICE QUEEN',
                'final_nightmare': 'FINAL NIGHTMARE',
                'boss': 'ANCIENT EVIL',
                'mega_boss': 'NIGHTMARE INCARNATE'
            };

            bossDisplayName.textContent = bossDisplayNames[boss.type] || 'UNKNOWN HORROR';

            // Store reference to current boss for updates
            this.currentBoss = boss;

            // Show the health bar
            bossHealthContainer.classList.remove('hidden');

            // Initial health display
            this.updateBossHealthBar();
        }
    }

    updateBossHealthBar() {
        if (!this.currentBoss) return;

        const dom = this.domElements || {};
        if (dom.bossHealthBar && dom.bossHealthText) {
            const healthPercentage = (this.currentBoss.health / this.currentBoss.maxHealth) * 100;
            dom.bossHealthBar.style.width = healthPercentage + '%';
            dom.bossHealthText.textContent = `${Math.ceil(this.currentBoss.health)}/${this.currentBoss.maxHealth}`;
        }
    }

    hideBossHealthBar() {
        const dom = this.domElements || {};
        if (dom.bossHealthContainer) {
            dom.bossHealthContainer.classList.add('hidden');
            this.currentBoss = null;
        }

        // PHASE 1.1: Clear boss arena when boss dies
        this.clearBossArena();
    }

    spawnZombieBurst() {
        // Scale burst size with wave progression for massive hordes
        const maxBurstSize = Math.min(50, 15 + Math.floor(this.wave / 1.5)); // Much larger bursts
        const burstSize = Math.min(maxBurstSize, this.zombiesInWave - this.zombiesSpawned);
        const formations = [
            'line', 'v_formation', 'cluster', 'diamond', 'arrow', 'circle'
        ];
        const formation = formations[Math.floor(Math.random() * formations.length)];
        
        for (let i = 0; i < burstSize; i++) {
            const pos = this.getFormationPosition(formation, i, burstSize);
            let type = 'basic';
            
            // Dynamic zombie type selection based on wave - includes new monster types
            const rand = Math.random();

            // Aggressive monster introduction for challenging gameplay
            if (this.wave >= 1 && rand < 0.2) type = 'crawler';   // Swarm units - early and common
            if (this.wave >= 2 && rand < 0.3) type = 'fast';
            if (this.wave >= 3 && rand < 0.15) type = 'spitter';  // Ranged enemies - common threat
            if (this.wave >= 4 && rand < 0.25) type = 'tank';
            if (this.wave >= 5 && rand < 0.12) type = 'jumper';   // Teleporters - frequent threat
            if (this.wave >= 6 && rand < 0.18) type = 'brute';    // Heavy hitters - common
            if (this.wave >= 7 && rand < 0.08) type = 'exploder'; // Suicide bombers - dangerous
            if (this.wave >= 8 && rand < 0.15) type = 'shielder'; // Tanks with shields - common
            if (this.wave >= 10 && rand < 0.08) type = 'healer';  // Support units - earlier and more common
            if (this.wave >= 12 && rand < 0.06) type = 'summoner'; // Spawn creators - moderately common
            if (this.wave >= 15 && rand < 0.05) type = 'phase_walker'; // Phasing enemies - challenging
            if (this.wave >= 17 && rand < 0.04) type = 'stalker'; // Stealth units - late game threat

            // Legacy boss spawns (rare in regular waves)
            if (this.wave >= 8 && rand < 0.02) type = 'boss';
            if (this.wave >= 10 && rand < 0.01) type = 'mega_boss';
            
            this.zombies.push(new Zombie(pos.x, pos.y, type, this));
            this.zombiesSpawned++;
        }
    }
    
    getFormationPosition(formation, index, total) {
        const centerX = this.getCanvasWidth() / 2;
        const baseY = -200 - Math.random() * 100; // Increased spawn distance for zoom-out
        
        switch (formation) {
            case 'line':
                return {
                    x: (this.getCanvasWidth() / total) * index + 50,
                    y: baseY
                };
            case 'v_formation':
                const vOffset = Math.abs(index - total/2) * 30;
                return {
                    x: centerX + (index - total/2) * 40,
                    y: baseY - vOffset
                };
            case 'cluster':
                const angle = (index / total) * Math.PI * 2;
                return {
                    x: centerX + Math.cos(angle) * 80,
                    y: baseY + Math.sin(angle) * 40
                };
            case 'diamond':
                const side = Math.floor(index / (total/4));
                const pos = index % (total/4);
                return {
                    x: centerX + (side < 2 ? -1 : 1) * pos * 30,
                    y: baseY + (side % 2 === 0 ? -1 : 1) * pos * 20
                };
            case 'arrow':
                const row = Math.floor(index / 3);
                const col = index % 3;
                return {
                    x: centerX + (col - 1) * (40 + row * 20),
                    y: baseY - row * 30
                };
            case 'circle':
                const circleAngle = (index / total) * Math.PI * 2;
                return {
                    x: centerX + Math.cos(circleAngle) * 100,
                    y: baseY + Math.sin(circleAngle) * 60
                };
            default:
                return {
                    x: Math.random() * this.getCanvasWidth(),
                    y: baseY
                };
        }
    }
    
    spawnZombie() {
        // Spawn from all sides for massive horde attacks
        const formations = [
            // Top spawn (traditional) - increased distance for zoom-out
            () => ({ x: Math.random() * (this.getCanvasWidth() - 100) + 50, y: -200 }),
            // Left side spawn for flanking - increased distance for zoom-out
            () => ({ x: -200, y: Math.random() * (this.getCanvasHeight() - 200) + 100 }),
            // Right side spawn for flanking - increased distance for zoom-out
            () => ({ x: this.getCanvasWidth() + 200, y: Math.random() * (this.getCanvasHeight() - 200) + 100 }),
            // Double line from top
            () => ({
                x: Math.random() * (this.getCanvasWidth() - 100) + 50,
                y: -200 - (Math.random() * 2) * 40 // Increased spawn distance for zoom-out
            }),
            // Corner clusters for aggressive spawning - increased margins for zoom-out
            () => {
                const corner = Math.floor(Math.random() * 4);
                const margin = 200; // Much larger margin to account for zoom-out
                switch(corner) {
                    case 0: return { x: -margin, y: -margin }; // Top-left
                    case 1: return { x: this.getCanvasWidth() + margin, y: -margin }; // Top-right
                    case 2: return { x: -margin, y: this.getCanvasHeight() + margin }; // Bottom-left
                    case 3: return { x: this.getCanvasWidth() + margin, y: this.getCanvasHeight() + margin }; // Bottom-right
                }
            },
            // Random edge spawn for chaos - increased margins for zoom-out view
            () => {
                const edge = Math.floor(Math.random() * 4);
                const spawnMargin = 200; // Much larger margin to account for zoom-out
                switch(edge) {
                    case 0: return { x: Math.random() * this.getCanvasWidth(), y: -spawnMargin }; // Top
                    case 1: return { x: this.getCanvasWidth() + spawnMargin, y: Math.random() * this.getCanvasHeight() }; // Right
                    case 2: return { x: Math.random() * this.getCanvasWidth(), y: this.getCanvasHeight() + spawnMargin }; // Bottom
                    case 3: return { x: -spawnMargin, y: Math.random() * this.getCanvasHeight() }; // Left
                }
            }
        ];
        
        const formation = formations[Math.floor(Math.random() * formations.length)];
        const pos = formation();
        
        // PHASE 1.2: Elite-focused spawning system
        let type = 'basic';
        const rand = Math.random();

        // Check if this should be an elite spawn
        const isEliteSpawn = rand < this.eliteSpawnChance;

        if (isEliteSpawn) {
            // Elite enemy pool - more dangerous, appears based on wave
            const eliteTypes = [];
            if (this.wave >= 5) eliteTypes.push('jumper', 'tank', 'brute');
            if (this.wave >= 10) eliteTypes.push('healer', 'shielder', 'exploder');
            if (this.wave >= 15) eliteTypes.push('summoner', 'phase_walker');
            if (this.wave >= 20) eliteTypes.push('stalker');

            if (eliteTypes.length > 0) {
                type = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
            }
        } else {
            // Regular enemy pool - basic wave filler
            const regularTypes = ['basic', 'crawler', 'fast'];
            if (this.wave >= 3) regularTypes.push('spitter');
            if (this.wave >= 8) regularTypes.push('tank');

            type = regularTypes[Math.floor(Math.random() * regularTypes.length)];
        }
        
        // Add zombie with enhanced scaling
        const zombie = new Zombie(pos.x, pos.y, type, this);

        // Progressive difficulty scaling
        this.applyWaveScaling(zombie);

        this.zombies.push(zombie);
    }

    applyWaveScaling(zombie) {
        // Health scaling: gradual increase that becomes more dramatic later
        const healthMultiplier = 1 + Math.pow(this.wave * 0.08, 1.2);
        zombie.maxHealth *= healthMultiplier;
        zombie.health = zombie.maxHealth;

        // Damage scaling: more conservative to avoid frustration
        const damageMultiplier = 1 + (this.wave * 0.04);
        zombie.damage = Math.floor(zombie.damage * damageMultiplier);

        // Speed scaling: slight increase to maintain challenge
        const speedMultiplier = 1 + Math.min(0.5, this.wave * 0.02);
        zombie.speed *= speedMultiplier;

        // Late game elite enhancements
        if (this.wave >= 15) {
            zombie.maxHealth *= 1.2; // Extra health boost for late game
            zombie.health = zombie.maxHealth;
        }

        if (this.wave >= 25) {
            zombie.damage = Math.floor(zombie.damage * 1.3); // Extra damage for ultra late game
        }
    }
    
    determinePowerupRarity() {
        const rand = Math.random();
        if (rand < 0.60) return 'common';    // 60% chance
        if (rand < 0.85) return 'rare';      // 25% chance
        if (rand < 0.97) return 'epic';      // 12% chance
        return 'legendary';                   // 3% chance
    }

    getPowerupsByRarity(rarity) {
        const powerupTiers = {
            common: [
                'damage', 'soldiers', 'money', 'health', 'multishot',
                'x2', 'shotgun', 'machinegun', 'freeze', 'shield'
            ],
            rare: [
                'x3', 'laser', 'rocket', 'tank_vehicle', 'helicopter',
                'speed_boost', 'bomb', 'double_xp', 'coin_magnet'
            ],
            epic: [
                'x5', 'plasma', 'railgun', 'drone', 'mech_suit',
                'time_slow', 'poison_cloud', 'emp_blast', 'bullet_rain'
            ],
            legendary: [
                'x10', 'flamethrower', 'artillery', 'invincibility',
                'lightning_storm', 'nuke', 'mystery_box', 'zombie_weakness'
            ]
        };
        return powerupTiers[rarity] || powerupTiers.common;
    }

    spawnPowerup() {
        const x = 50 + Math.random() * (this.getCanvasWidth() - 100);
        const y = -30; // Spawn from top of screen

        // Determine rarity first
        const rarity = this.determinePowerupRarity();

        // Get appropriate powerups for this rarity
        const availablePowerups = this.getPowerupsByRarity(rarity);
        const type = availablePowerups[Math.floor(Math.random() * availablePowerups.length)];

        this.powerups.push(new Powerup(x, y, type, rarity));
    }
    
    checkCollisions() {
        // Bullet vs Zombie
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let bulletHit = false;

            for (let j = this.zombies.length - 1; j >= 0; j--) {
                const zombie = this.zombies[j];
                const dist = Math.sqrt((bullet.x - zombie.x) ** 2 + (bullet.y - zombie.y) ** 2);
                if (dist < 25) {
                    // Handle weapon-specific effects
                    this.handleWeaponEffect(bullet, zombie);

                    if (zombie.health <= 0) {
                        this.zombieKilled(zombie);
                        this.zombies.splice(j, 1);
                    }

                    // Handle piercing for laser and evolved weapons
                    if (bullet.type === 'laser' || bullet.type === 'gatling_laser' || bullet.type === 'plasma_rifle' ||
                        bullet.type === 'death_ray' || bullet.piercing > 0) {
                        bullet.pierceCount = (bullet.pierceCount || 0) + 1;
                        const maxPierce = bullet.piercing || (bullet.type === 'death_ray' ? 5 : 3);
                        if (bullet.pierceCount >= maxPierce) {
                            bulletHit = true;
                        }
                    } else if (bullet.type === 'knife' || bullet.type === 'soul_reaper') {
                        // Knives don't get removed on hit (spinning blades)
                        bulletHit = false;
                    } else {
                        bulletHit = true;
                    }

                    if (bulletHit) break;
                }
            }

            if (bulletHit) {
                this.bullets.splice(i, 1);
            }
        }

        // Zombie vs Player
        if (this.player) {
            for (let i = this.zombies.length - 1; i >= 0; i--) {
                const zombie = this.zombies[i];
                const dist = Math.sqrt((zombie.x - this.player.x) ** 2 + (zombie.y - this.player.y) ** 2);
                if (dist < 35) {
                    this.player.takeDamage(zombie.damage);
                    // Create enhanced damage effect
                    for (let k = 0; k < 5; k++) {
                        this.particles.push(new Particle(this.player.x, this.player.y, '#ff4444', 'medium', 'blood'));
                    }
                    // Add impact effects
                    VisualEffects.addScreenShake(this, zombie.damage * 0.3, 200);
                    VisualEffects.addChromaticAberration(this, 1);
                    this.zombies.splice(i, 1);
                }
            }
        }

        // Zombie vs Soldiers
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            for (let j = this.soldiers.length - 1; j >= 0; j--) {
                const soldier = this.soldiers[j];
                const dist = Math.sqrt((zombie.x - soldier.x) ** 2 + (zombie.y - soldier.y) ** 2);
                if (dist < 30) {
                    soldier.takeDamage(zombie.damage);
                    if (soldier.health <= 0) {
                        this.soldiers.splice(j, 1);
                    }
                    this.zombies.splice(i, 1);
                    break;
                }
            }
        }

        // Player vs Power-ups
        if (this.player) {
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                const dist = Math.sqrt((this.player.x - powerup.x) ** 2 + (this.player.y - powerup.y) ** 2);
                if (dist < 30) {
                    this.collectPowerup(powerup, i);
                    break;
                }
            }
        }

        // Player vs Treasure Chests
        if (this.player) {
            for (let i = this.treasureChests.length - 1; i >= 0; i--) {
                const chest = this.treasureChests[i];
                const dist = Math.sqrt((this.player.x - chest.x) ** 2 + (this.player.y - chest.y) ** 2);
                if (dist < 40) {
                    this.collectTreasureChest(chest, i);
                    break;
                }
            }
        }

        // Enemy Projectile vs Player collision
        if (this.player) {
            for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
                const projectile = this.enemyProjectiles[i];
                const dist = Math.sqrt((this.player.x - projectile.x) ** 2 + (this.player.y - projectile.y) ** 2);
                if (dist < 20) {
                    this.player.takeDamage(projectile.damage);
                    // Create enhanced hit effect
                    for (let k = 0; k < 3; k++) {
                        this.particles.push(new Particle(this.player.x, this.player.y, '#ff4444', 'medium', 'blood'));
                    }
                    // Add projectile-specific effects
                    if (projectile.type === 'spit') {
                        for (let k = 0; k < 2; k++) {
                            this.particles.push(new Particle(this.player.x, this.player.y, '#00ff00', 'small', 'magic'));
                        }
                    }
                    VisualEffects.addScreenShake(this, projectile.damage * 0.2, 150);
                    this.enemyProjectiles.splice(i, 1);
                }
            }
        }

        // Hazard vs Player collision
        if (this.player) {
            this.hazards.forEach(hazard => {
                const dist = Math.sqrt((this.player.x - hazard.x) ** 2 + (this.player.y - hazard.y) ** 2);
                if (dist <= hazard.radius) {
                    // Apply hazard effects based on type
                    switch (hazard.type) {
                        case 'poison':
                            this.player.takeDamage(hazard.damage * 0.5); // Fixed damage per collision
                            this.player.poisoned = true;
                            this.player.poisonTime = 1000;
                            this.player.poisonDamage = hazard.damage * 0.5;
                            break;
                        case 'fire':
                            this.player.takeDamage(hazard.damage * 0.75); // Fixed damage per collision
                            this.player.burnDamage = hazard.damage * 0.3;
                            this.player.burnTime = 2000;
                            break;
                        case 'ice':
                            this.player.speedBoostTime = -3000; // Slow effect
                            break;
                    }
                }
            });
        }
    }

    handleWeaponEffect(bullet, zombie) {
        let damage = bullet.damage;

        // Check for explosive rounds passive item
        const explosiveRounds = this.passiveItems.find(p => p.id === 'explosive_rounds');
        const shouldExplode = explosiveRounds ||
                            bullet.type === 'rocket' ||
                            bullet.type === 'grenade' ||
                            bullet.type === 'holy_bomb' ||
                            bullet.type === 'missile_barrage';

        if (shouldExplode) {
            // Create explosion effect
            const explosionDamage = explosiveRounds ? damage * (1 + explosiveRounds.level * 0.5) : damage;
            this.createExplosion(bullet.x, bullet.y, explosionDamage, bullet.type);
        } else {
            switch (bullet.type) {
                case 'flamethrower':
                case 'dragon_breath':
                    // Fire damage over time
                    zombie.takeDamage(damage);
                    this.createFireEffect(zombie);
                    this.createWeaponHitEffect(zombie.x, zombie.y, bullet.type);
                    // Apply burn effect
                    zombie.burnDamage = damage * 0.1;
                    zombie.burnTime = 3000; // 3 seconds
                    break;

                case 'laser':
                case 'gatling_laser':
                case 'plasma_rifle':
                case 'death_ray':
                    // Energy weapons - piercing damage
                    zombie.takeDamage(damage);
                    this.createEnergyEffect(zombie);
                    this.createWeaponHitEffect(zombie.x, zombie.y, bullet.type);
                    break;

                case 'knife':
                case 'soul_reaper':
                    // Melee weapon - continuous damage
                    zombie.takeDamage(damage * 0.5); // Reduced damage for continuous hit
                    this.createSlashEffect(zombie);
                    break;

                default:
                    // Standard weapons
                    zombie.takeDamage(damage);
                    this.createHitEffect(zombie);
                    this.createWeaponHitEffect(zombie.x, zombie.y, bullet.type);
                    break;
            }
        }
    }

    createExplosion(x, y, damage, weaponType) {
        let explosionRadius = 80;

        // Increase radius for evolved weapons
        if (weaponType === 'holy_bomb' || weaponType === 'missile_barrage') {
            explosionRadius = 120;
        }

        // Check for blast radius passive item
        const blastRadius = this.passiveItems.find(p => p.id === 'blast_radius');
        if (blastRadius) {
            explosionRadius *= (1 + (blastRadius.level * 0.5)); // +50% radius per level
        }

        // Damage all zombies in explosion radius
        this.zombies.forEach(zombie => {
            const dist = Math.sqrt((zombie.x - x) ** 2 + (zombie.y - y) ** 2);
            if (dist <= explosionRadius) {
                const falloffDamage = damage * (1 - (dist / explosionRadius) * 0.5); // 50% falloff at edge
                zombie.takeDamage(falloffDamage);
            }
        });

        // Create enhanced explosion particles
        const particleCount = weaponType === 'holy_bomb' ? 25 : 15;
        const particleType = weaponType === 'holy_bomb' ? 'magic' : 'explosion';
        const mainColor = weaponType === 'holy_bomb' ? '#FFD700' : '#ff4444';

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = Math.random() * explosionRadius;
            this.particles.push(new Particle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                mainColor,
                'large',
                particleType
            ));
        }

        // Add extra central burst for dramatic effect
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(x, y, mainColor, 'medium', 'energy'));
        }

        // Add visual effects
        VisualEffects.addScreenShake(this, explosionRadius * 0.3, 400);
        VisualEffects.createBackgroundEffect(this, 'shockwave', x, y);
        if (weaponType === 'holy_bomb') {
            VisualEffects.addChromaticAberration(this, 3);
            VisualEffects.addTimeDistortion(this, 0.5, 500);
        }
    }

    createFireEffect(zombie) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 20,
                zombie.y + (Math.random() - 0.5) * 20,
                '#ff6600',
                'medium',
                'fire'
            ));
        }
    }

    createEnergyEffect(zombie) {
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 15,
                zombie.y + (Math.random() - 0.5) * 15,
                '#00ffff',
                'small',
                'energy'
            ));
        }
        // Add electric discharge
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 25,
                zombie.y + (Math.random() - 0.5) * 25,
                '#ffffff',
                'small',
                'electric'
            ));
        }
    }

    createSlashEffect(zombie) {
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 10,
                zombie.y + (Math.random() - 0.5) * 10,
                '#cccccc',
                'small',
                'normal'
            ));
        }
        // Add metallic sparkles
        for (let i = 0; i < 2; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 20,
                zombie.y + (Math.random() - 0.5) * 20,
                '#ffffff',
                'small',
                'magic'
            ));
        }
    }

    createHitEffect(zombie) {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                zombie.x + (Math.random() - 0.5) * 10,
                zombie.y + (Math.random() - 0.5) * 10,
                '#ffff00',
                'small'
            ));
        }
    }
    
    zombieKilled(zombie) {
        // Base rewards with wave scaling for balance
        let scoreGain = zombie.scoreValue;
        let moneyGain = zombie.moneyValue;
        let expGain = zombie.experienceValue || 6;

        // PHASE 1.3: REMOVED depletion mechanic - consistent rewards

        // Milestone bonuses ONLY
        if (this.wave % 5 === 0) {
            moneyGain *= 2; // Double money on boss waves
            expGain *= 1.5;
        }

        // Boss bonuses
        if (zombie.isBoss()) {
            moneyGain *= 5; // Bosses are very lucrative
            scoreGain *= 3;
            expGain *= 3;

            // Special boss rewards - show victory screen and drop special item (only for official boss wave spawns)
            if (zombie.isBoss() && zombie.isBossWaveSpawn) {
                // Check boss achievement
                this.metaProgression.statistics.bossesKilled = (this.metaProgression.statistics.bossesKilled || 0) + 1;
                this.achievementSystem.checkAchievements('bosses_killed', this.metaProgression.statistics.bossesKilled);

                this.hideBossHealthBar(); // Hide boss health bar when boss dies
                this.showBossVictoryScreen(zombie);
                this.dropSpecialItem(zombie);
            }
        }

        // Hide boss health bar for any boss death (including legacy ones)
        if (this.currentBoss === zombie) {
            this.hideBossHealthBar();
        }

        // Play kill sound and update combo
        this.audioSystem.playSound('zombie_death');
        const comboResult = this.comboSystem.addKill();

        // Apply rewards with combo multiplier
        const comboMultiplier = comboResult ? comboResult.multiplier : this.comboSystem.getComboData().multiplier;
        const finalScoreGain = Math.floor(scoreGain * comboMultiplier);
        const finalMoneyGain = Math.floor(moneyGain * comboMultiplier);

        this.score += finalScoreGain;
        this.money += finalMoneyGain;

        // Check score-based achievements (throttled - only check every 10 kills to prevent spam)
        if (this.killCount % 10 === 0) {
            this.achievementSystem.checkAchievements('score', this.score);
        }
        this.zombiesKilled++;
        this.killCount++; // Total kill counter for statistics

        // Combo level up feedback
        if (comboResult.levelUp) {
            this.audioSystem.playSound('combo_kill', { comboLevel: comboResult.kills });

            // Check combo achievements
            this.achievementSystem.checkAchievements('combo', comboResult.kills);

            // Add visual effect for combo level up
            this.particles.push(new Particle(
                zombie.x, zombie.y - 30,
                0, -50,
                '#FFD700', 'large', 'magic',
                1000
            ));

            // Screen shake for epic combos
            if (comboResult.kills >= 50) {
                this.screenShake.intensity = 15;
                this.screenShake.duration = 300;
            }
        }

        this.gainExperience(expGain);

        // Check kill-based achievements (throttled - only check every 5 kills to prevent spam)
        if (this.killCount % 5 === 0 || this.killCount === 1) { // Always check first kill for "First Blood"
            this.achievementSystem.checkAchievements('kills', this.killCount);
        }

        // Update meta progression
        this.metaProgression.statistics.totalKills++;

        // Resource scarcity events (random challenges)
        if (Math.random() < 0.05 && this.wave >= 10) {
            this.triggerScarcityEvent();
        }

        // Create enhanced death effect particles based on zombie type
        const particleCount = zombie.type.includes('boss') ? 15 : 8;
        const particleType = zombie.type.includes('boss') ? 'explosion' :
                           zombie.type === 'healer' ? 'magic' :
                           zombie.type === 'spitter' ? 'blood' :
                           zombie.type === 'phase_walker' ? 'energy' : 'blood';

        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(zombie.x, zombie.y, '#ff4444', 'large', particleType));
        }

        // Add extra effects for special zombie types
        if (zombie.type === 'exploder') {
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(zombie.x, zombie.y, '#ff6600', 'medium', 'explosion'));
            }
        }

        this.updateUI();
    }

    // PHASE 4.2: Show floating damage number
    showDamageNumber(x, y, damage, isCrit = false) {
        const damageText = {
            x: x,
            y: y,
            text: Math.floor(damage),
            color: isCrit ? '#ff6b35' : '#ffffff',
            fontSize: isCrit ? 32 : 24,
            lifetime: 1000,
            velocity: { x: (Math.random() - 0.5) * 20, y: -100 }
        };
        this.floatingTexts.push(damageText);
    }

    showBossVictoryScreen(boss) {
        const bossVictory = document.getElementById('bossVictory');
        const specialItemText = document.getElementById('specialItemText');

        if (bossVictory && specialItemText) {
            // Get the special item name for this boss
            const specialItem = this.getBossSpecialItem(boss.type);
            specialItemText.textContent = `${specialItem.name} ACQUIRED!`;

            // Show the retro victory screen
            bossVictory.classList.remove('hidden');

            // Hide it after 4 seconds
            this.createTimeout(() => {
                bossVictory.classList.add('hidden');
            }, 4000);
        }
    }

    getBossSpecialItem(bossType) {
        const bossItems = {
            'boss': { name: 'POWER CORE', effect: 'damage', value: 1.5 },
            'iron_colossus': { name: 'STEEL PLATES', effect: 'armor', value: 50 },
            'plague_mother': { name: 'ANTIDOTE', effect: 'health_regen', value: 2 },
            'shadow_reaper': { name: 'DARK ESSENCE', effect: 'speed', value: 1.3 },
            'flame_berserker': { name: 'FIRE CRYSTAL', effect: 'fire_damage', value: 2.0 },
            'crystal_guardian': { name: 'CRYSTAL SHARD', effect: 'piercing', value: 3 },
            'void_spawner': { name: 'VOID FRAGMENT', effect: 'range', value: 200 },
            'thunder_titan': { name: 'STORM CORE', effect: 'attack_speed', value: 1.4 },
            'ice_queen': { name: 'ICE CROWN', effect: 'freeze_chance', value: 0.3 },
            'final_nightmare': { name: 'NIGHTMARE ORB', effect: 'all_stats', value: 1.25 }
        };

        return bossItems[bossType] || bossItems['boss'];
    }

    dropSpecialItem(boss) {
        const specialItem = this.getBossSpecialItem(boss.type);

        // Apply the special item effect immediately
        this.applySpecialItemEffect(specialItem);

        // Show popup with the effect
        this.showMultiplierPopup(
            boss.x,
            boss.y,
            `+${specialItem.name}!`,
            true
        );

        // Add to player's special items collection for tracking
        if (!this.specialItems) this.specialItems = [];
        this.specialItems.push(specialItem);
    }

    applySpecialItemEffect(item) {
        switch (item.effect) {
            case 'damage':
                this.damageMultiplier *= item.value;
                break;
            case 'armor':
                if (this.player) this.player.maxHealth += item.value;
                break;
            case 'health_regen':
                this.healthRegenRate = (this.healthRegenRate || 0) + item.value;
                break;
            case 'speed':
                this.speedMultiplier *= item.value;
                break;
            case 'fire_damage':
                this.fireDamageMultiplier = (this.fireDamageMultiplier || 1) * item.value;
                break;
            case 'piercing':
                this.piercingBonus = (this.piercingBonus || 0) + item.value;
                break;
            case 'range':
                this.rangeBonus = (this.rangeBonus || 0) + item.value;
                break;
            case 'attack_speed':
                this.attackSpeedMultiplier = (this.attackSpeedMultiplier || 1) * item.value;
                break;
            case 'freeze_chance':
                this.freezeChance = (this.freezeChance || 0) + item.value;
                break;
            case 'all_stats':
                this.damageMultiplier *= item.value;
                this.speedMultiplier *= item.value;
                this.attackSpeedMultiplier = (this.attackSpeedMultiplier || 1) * item.value;
                break;
        }
    }

    triggerScarcityEvent() {
        const events = [
            {
                name: "Supply Drop Delayed",
                effect: () => {
                    this.money = Math.max(0, this.money - 50);
                    this.showMultiplierPopup(this.getCanvasWidth() / 2, this.getCanvasHeight() / 2, "SUPPLY SHORTAGE: -$50", false);
                }
            },
            {
                name: "Equipment Malfunction",
                effect: () => {
                    if (this.weapons.length > 1) {
                        // Temporarily disable a random weapon for 30 seconds
                        const weapon = this.weapons[Math.floor(Math.random() * this.weapons.length)];
                        weapon.disabled = true;
                        this.createTimeout(() => { weapon.disabled = false; }, 30000);
                        this.showMultiplierPopup(this.getCanvasWidth() / 2, this.getCanvasHeight() / 2, "WEAPON JAMMED!", false);
                    }
                }
            },
            {
                name: "Zombie Adaptation",
                effect: () => {
                    // Temporarily increase zombie resistance
                    this.zombieResistanceBonus = 0.2; // 20% damage reduction
                    this.createTimeout(() => { this.zombieResistanceBonus = 0; }, 45000);
                    this.showMultiplierPopup(this.getCanvasWidth() / 2, this.getCanvasHeight() / 2, "ZOMBIES ADAPTED: +20% RESISTANCE", false);
                }
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
    }

    gainExperience(amount) {
        this.experience += amount;

        // Check for level up
        while (this.experience >= this.experienceToNextLevel) {
            this.experience -= this.experienceToNextLevel;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;

        // Check level-based achievements
        this.achievementSystem.checkAchievements('level', this.level);

        // Stunning level up visual effects
        VisualEffects.addScreenShake(this, 4, 800);
        VisualEffects.addTimeDistortion(this, 0.3, 1000);

        // Create radial burst of golden particles around player
        const playerX = this.player.x;
        const playerY = this.player.y;

        // Golden energy burst
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const distance = Math.random() * 80 + 20;
            this.particles.push(new Particle(
                playerX + Math.cos(angle) * distance,
                playerY + Math.sin(angle) * distance,
                `hsl(${45 + Math.random() * 15}, 100%, ${60 + Math.random() * 30}%)`,
                'large',
                'magic'
            ));
        }

        // Ascending light particles
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.particles.push(new Particle(
                    playerX + (Math.random() - 0.5) * 60,
                    playerY + (Math.random() - 0.5) * 60,
                    `hsl(${200 + Math.random() * 60}, 80%, ${70 + Math.random() * 20}%)`,
                    'medium',
                    'energy'
                ));
            }, i * 50);
        }

        // PHASE 2.1: LINEAR XP SCALING - Sustainable level progression
        const baseXP = 100;
        const linearGrowth = 50 * this.level;
        const diminishingFactor = Math.pow(1.15, Math.max(0, this.level - 10));

        this.experienceToNextLevel = Math.floor(baseXP + linearGrowth + diminishingFactor);
        // Level 10: ~650 XP (was 3,466)
        // Level 20: ~1,450 XP (was 113,780)
        // Level 30: ~2,653 XP (was insane)

        this.levelUpPending = true;
        this.isPaused = true; // Pause game for level up choice
        this.showLevelUpChoices();
    }

    showLevelUpChoices() {
        const choices = this.generateLevelUpChoices();
        this.showLevelUpUI(choices);
    }

    generateLevelUpChoices() {
        const allChoices = [
            // Early Weapons (Available from start)
            { type: 'weapon', id: 'rifle', name: 'Rifle', description: 'Auto-targeting rifle', minWave: 1 },
            { type: 'weapon', id: 'shotgun', name: 'Shotgun', description: 'Spread shot weapon', minWave: 1 },

            // Mid-Game Weapons (Progressive unlock)
            { type: 'weapon', id: 'machinegun', name: 'Machine Gun', description: 'Rapid fire weapon', minWave: 3 },
            { type: 'weapon', id: 'laser', name: 'Laser', description: 'Piercing energy beam', minWave: 5 },
            { type: 'weapon', id: 'knife', name: 'Knife', description: 'Melee spinning blade', minWave: 7 },

            // Late Game Weapons (High wave requirement)
            { type: 'weapon', id: 'pistol', name: 'Pistol', description: 'Fast firing sidearm', minWave: 8 },
            { type: 'weapon', id: 'rocket', name: 'Rocket Launcher', description: 'Explosive projectiles', minWave: 10 },
            { type: 'weapon', id: 'grenade', name: 'Grenade', description: 'Area explosion', minWave: 12 },

            // Basic Passive Items (Available early)
            { type: 'passive', id: 'ammo_box', name: 'Ammo Box', description: '+25% damage', minWave: 1 },
            { type: 'passive', id: 'health_boost', name: 'Health Boost', description: '+50 max health', minWave: 1 },
            { type: 'passive', id: 'speed_boost', name: 'Speed Boost', description: '+25% movement speed', minWave: 2 },

            // Intermediate Passive Items
            { type: 'passive', id: 'rapid_fire', name: 'Rapid Fire', description: '+30% fire rate', minWave: 3 },
            { type: 'passive', id: 'spread_shot', name: 'Spread Shot', description: '+2 projectiles', minWave: 4 },
            { type: 'passive', id: 'energy_core', name: 'Energy Core', description: '+50% projectile speed', minWave: 6 },

            // Advanced Passive Items (Late game)
            { type: 'passive', id: 'piercing', name: 'Piercing', description: 'Bullets pierce through enemies', minWave: 8 },
            { type: 'passive', id: 'explosive_rounds', name: 'Explosive Rounds', description: 'Bullets explode on impact', minWave: 10 },
            { type: 'passive', id: 'blast_radius', name: 'Blast Radius', description: '+100% explosion size', minWave: 12 },
            { type: 'passive', id: 'luck', name: 'Luck', description: '+20% rare item chance', minWave: 15 },

            // Upgrades for existing items
            { type: 'upgrade', target: 'weapon', description: 'Level up a weapon' },
            { type: 'upgrade', target: 'passive', description: 'Level up a passive item' }
        ];

        // Filter based on wave requirements and what player already has
        const availableChoices = allChoices.filter(choice => {
            // Check wave requirement first
            if (choice.minWave && this.wave < choice.minWave) {
                return false;
            }

            if (choice.type === 'weapon') {
                const weapon = this.weapons.find(w => w.id === choice.id);
                return !weapon || weapon.level < 8; // Max level 8
            } else if (choice.type === 'passive') {
                const passive = this.passiveItems.find(p => p.id === choice.id);
                return !passive || passive.level < 5; // Max level 5
            } else if (choice.type === 'upgrade') {
                if (choice.target === 'weapon') {
                    return this.weapons.length > 0;
                } else {
                    return this.passiveItems.length > 0;
                }
            }
            return true;
        });

        // Apply luck effect - bias towards rare items
        const luck = this.passiveItems.find(p => p.id === 'luck');
        const luckMultiplier = luck ? (1 + luck.level * 0.2) : 1; // 20% better chance per level

        // Categorize choices by rarity
        const rareChoices = availableChoices.filter(choice =>
            choice.type === 'weapon' ||
            (choice.type === 'passive' && ['explosive_rounds', 'piercing', 'blast_radius'].includes(choice.id))
        );
        const commonChoices = availableChoices.filter(choice => !rareChoices.includes(choice));

        // Randomly select 3-4 choices with luck bias
        const numChoices = Math.min(4, availableChoices.length);
        const selectedChoices = [];

        for (let i = 0; i < numChoices; i++) {
            let choicesPool = availableChoices;

            // With luck, bias towards rare items
            if (rareChoices.length > 0 && Math.random() < (0.3 * luckMultiplier)) {
                choicesPool = rareChoices;
            }

            const randomIndex = Math.floor(Math.random() * choicesPool.length);
            const selectedChoice = choicesPool[randomIndex];
            selectedChoices.push(selectedChoice);

            // Remove from both pools
            availableChoices.splice(availableChoices.indexOf(selectedChoice), 1);
            if (rareChoices.includes(selectedChoice)) {
                rareChoices.splice(rareChoices.indexOf(selectedChoice), 1);
            }
            if (commonChoices.includes(selectedChoice)) {
                commonChoices.splice(commonChoices.indexOf(selectedChoice), 1);
            }
        }

        return selectedChoices;
    }

    showLevelUpUI(choices) {
        // Create level up UI
        const levelUpDiv = document.createElement('div');
        levelUpDiv.id = 'levelUpUI';
        levelUpDiv.innerHTML = `
            <div class="level-up-container">
                <h2>Level ${this.level}!</h2>
                <p>Choose an upgrade:</p>
                <div class="choices">
                    ${choices.map((choice, index) => `
                        <button class="choice-btn" data-choice="${index}">
                            <div class="choice-name">${choice.name || this.getUpgradeDescription(choice)}</div>
                            <div class="choice-description">${choice.description}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(levelUpDiv);

        // Add event listeners
        choices.forEach((choice, index) => {
            const btn = levelUpDiv.querySelector(`[data-choice="${index}"]`);
            btn.addEventListener('click', () => this.selectLevelUpChoice(choice, levelUpDiv));
        });
    }

    getUpgradeDescription(choice) {
        if (choice.type === 'upgrade' && choice.target === 'weapon') {
            const weapons = this.weapons.filter(w => w.level < 8);
            if (weapons.length > 0) {
                const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                return `Upgrade ${weapon.name}`;
            }
        } else if (choice.type === 'upgrade' && choice.target === 'passive') {
            const passives = this.passiveItems.filter(p => p.level < 5);
            if (passives.length > 0) {
                const passive = passives[Math.floor(Math.random() * passives.length)];
                return `Upgrade ${passive.name}`;
            }
        }
        return 'Upgrade';
    }

    selectLevelUpChoice(choice, levelUpDiv) {
        this.applyLevelUpChoice(choice);
        levelUpDiv.remove();
        this.levelUpPending = false;
        this.isPaused = false;
        this.checkForEvolutions();
    }

    applyLevelUpChoice(choice) {
        if (choice.type === 'weapon') {
            this.addOrUpgradeWeapon(choice.id, choice.name);
        } else if (choice.type === 'passive') {
            this.addOrUpgradePassiveItem(choice.id, choice.name);
        } else if (choice.type === 'upgrade') {
            if (choice.target === 'weapon') {
                this.upgradeRandomWeapon();
            } else {
                this.upgradeRandomPassiveItem();
            }
        }
    }

    addOrUpgradeWeapon(id, name) {
        const existingWeapon = this.weapons.find(w => w.id === id);
        if (existingWeapon) {
            existingWeapon.level++;
            // Check for max weapon level achievement
            if (existingWeapon.level === 8) {
                this.achievementSystem.checkAchievements('max_weapon_level', existingWeapon.level);
            }
        } else if (this.weapons.length < this.maxWeapons) {
            this.weapons.push({
                id: id,
                name: name,
                level: 1
            });
            // Check weapons unlocked achievement
            this.achievementSystem.checkAchievements('weapons_unlocked', this.weapons.length);
        }
    }

    addOrUpgradePassiveItem(id, name) {
        const existingItem = this.passiveItems.find(p => p.id === id);
        if (existingItem) {
            existingItem.level++;
        } else if (this.passiveItems.length < this.maxPassiveItems) {
            this.passiveItems.push({
                id: id,
                name: name,
                level: 1
            });
        }

        // Apply immediate effects for certain passive items
        this.applyPassiveEffect(id);
    }

    applyPassiveEffect(id) {
        const item = this.passiveItems.find(p => p.id === id);
        if (!item) return;

        switch (id) {
            case 'health_boost':
                // Increase max health and heal player
                const healthIncrease = 50 * item.level;
                const oldMaxHealth = this.player.maxHealth;
                this.player.maxHealth = 200 + healthIncrease; // Base 200 + boost
                this.player.health += (this.player.maxHealth - oldMaxHealth); // Heal the difference
                break;

            case 'speed_boost':
                // Increase player speed (applied in player update)
                // Effect is calculated dynamically in player movement
                break;

            case 'rapid_fire':
                // Increase fire rate (applied in weapon shooting logic)
                // Effect is calculated dynamically during shooting
                break;

            case 'ammo_box':
                // Increase damage (applied in weapon shooting logic)
                // Effect is calculated dynamically during shooting
                break;

            case 'energy_core':
                // Increase projectile speed (applied in weapon shooting logic)
                // Effect is calculated dynamically during shooting
                break;

            case 'spread_shot':
                // Add extra projectiles for shotgun (applied in weapon shooting logic)
                // Effect is calculated dynamically during shooting
                break;

            case 'piercing':
                // Allow bullets to pierce through enemies (applied after bullet creation)
                // Effect is calculated dynamically after bullet creation
                break;

            case 'explosive_rounds':
                // Make bullets explode on impact (applied in bullet collision logic)
                // Effect is calculated dynamically during bullet hits
                break;

            case 'blast_radius':
                // Increase explosion radius (applied with explosive_rounds)
                // Effect is calculated dynamically during explosions
                break;

            case 'luck':
                // Increase rare item chance (applied in loot generation)
                // Effect is calculated dynamically during loot drops
                break;

            // Other passive effects are applied in real-time during shooting/gameplay
        }
    }

    upgradeRandomWeapon() {
        const upgradeable = this.weapons.filter(w => w.level < 8);
        if (upgradeable.length > 0) {
            const weapon = upgradeable[Math.floor(Math.random() * upgradeable.length)];
            weapon.level++;
        }
    }

    upgradeRandomPassiveItem() {
        const upgradeable = this.passiveItems.filter(p => p.level < 5);
        if (upgradeable.length > 0) {
            const item = upgradeable[Math.floor(Math.random() * upgradeable.length)];
            item.level++;
        }
    }

    checkForEvolutions() {
        for (const weaponId in this.evolutions) {
            const evolution = this.evolutions[weaponId];
            const weapon = this.weapons.find(w => w.id === weaponId && w.level >= evolution.level);
            const requiredItem = this.passiveItems.find(p => p.id === evolution.requires);

            if (weapon && requiredItem && !this.evolvedWeapons.includes(weaponId)) {
                this.spawnEvolutionChest(weaponId, evolution);
                break; // Only one evolution per level up
            }
        }
    }

    spawnEvolutionChest(weaponId, evolution) {
        const x = this.getCanvasWidth() / 2;
        const y = this.getCanvasHeight() / 2;

        this.treasureChests.push({
            x: x,
            y: y,
            type: 'evolution',
            weaponId: weaponId,
            evolution: evolution,
            collected: false,
            glowTime: 0
        });
    }

    collectTreasureChest(chest, index) {
        if (chest.type === 'evolution') {
            // Evolve the weapon
            this.evolveWeapon(chest.weaponId, chest.evolution);
            this.showMultiplierPopup(chest.x, chest.y, `${chest.evolution.evolvedForm.toUpperCase()} EVOLVED!`, true);
        }

        // Remove chest from array
        this.treasureChests.splice(index, 1);
    }

    evolveWeapon(weaponId, evolution) {
        // Mark this weapon as evolved
        this.evolvedWeapons.push(weaponId);

        // Remove the base weapon and required passive
        this.weapons = this.weapons.filter(w => w.id !== weaponId);
        this.passiveItems = this.passiveItems.filter(p => p.id !== evolution.requires);

        // Add the evolved weapon
        this.weapons.push({
            id: evolution.evolvedForm,
            name: evolution.evolvedForm.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            level: 1,
            isEvolved: true
        });

        // Spectacular evolution visual effects
        const centerX = this.getCanvasWidth() / 2;
        const centerY = this.getCanvasHeight() / 2;

        VisualEffects.addScreenShake(this, 6, 1500);
        VisualEffects.addChromaticAberration(this, 0.6, 2000);
        VisualEffects.addTimeDistortion(this, 0.2, 1500);

        // Multi-layered evolution explosion
        setTimeout(() => {
            // Central divine burst
            for (let i = 0; i < 60; i++) {
                const angle = (i / 60) * Math.PI * 2;
                const distance = Math.random() * 120 + 40;
                this.particles.push(new Particle(
                    centerX + Math.cos(angle) * distance,
                    centerY + Math.sin(angle) * distance,
                    `hsl(${280 + Math.random() * 60}, 100%, ${60 + Math.random() * 30}%)`,
                    'massive',
                    'magic'
                ));
            }
        }, 100);

        // Spiraling energy ribbons
        for (let spiral = 0; spiral < 4; spiral++) {
            setTimeout(() => {
                for (let i = 0; i < 15; i++) {
                    const angle = (spiral * Math.PI / 2) + (i * 0.3);
                    const distance = i * 15 + 50;
                    this.particles.push(new Particle(
                        centerX + Math.cos(angle) * distance,
                        centerY + Math.sin(angle) * distance,
                        `hsl(${45 + Math.random() * 30}, 100%, ${70 + Math.random() * 20}%)`,
                        'large',
                        'energy'
                    ));
                }
            }, spiral * 200);
        }

        // Ascending transcendence particles
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                this.particles.push(new Particle(
                    centerX + (Math.random() - 0.5) * 200,
                    centerY + (Math.random() - 0.5) * 200,
                    `hsl(${160 + Math.random() * 80}, 90%, ${50 + Math.random() * 40}%)`,
                    'medium',
                    'electric'
                ));
            }, i * 100);
        }
    }

    renderTreasureChest(chest) {
        const ctx = this.ctx;
        const glow = Math.sin(chest.glowTime / 300) * 0.3 + 0.7;

        // Draw glow effect
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20 * glow;

        // Draw chest base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(chest.x - 20, chest.y - 15, 40, 30);

        // Draw chest lid
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(chest.x - 18, chest.y - 25, 36, 15);

        // Draw gold trim
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(chest.x - 20, chest.y - 17, 40, 3);
        ctx.fillRect(chest.x - 20, chest.y + 12, 40, 3);
        ctx.fillRect(chest.x - 2, chest.y - 25, 4, 30);

        // Draw lock
        ctx.fillStyle = '#DAA520';
        ctx.beginPath();
        ctx.arc(chest.x, chest.y - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw keyhole
        ctx.fillStyle = '#000';
        ctx.fillRect(chest.x - 1, chest.y - 7, 2, 4);

        // Draw sparkles
        for (let i = 0; i < 8; i++) {
            const angle = (chest.glowTime / 200 + i * Math.PI / 4) % (Math.PI * 2);
            const sparkleX = chest.x + Math.cos(angle) * (30 + Math.sin(chest.glowTime / 150) * 10);
            const sparkleY = chest.y + Math.sin(angle) * (30 + Math.sin(chest.glowTime / 150) * 10);

            ctx.fillStyle = '#FFD700';
            ctx.save();
            ctx.translate(sparkleX, sparkleY);
            ctx.rotate(chest.glowTime / 100);
            ctx.fillRect(-2, -2, 4, 4);
            ctx.fillRect(-1, -4, 2, 8);
            ctx.restore();
        }

        ctx.restore();

        // Draw "EVOLUTION!" text above chest
        if (chest.type === 'evolution') {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText('EVOLUTION!', chest.x, chest.y - 40);
            ctx.fillText('EVOLUTION!', chest.x, chest.y - 40);

            ctx.font = 'bold 12px Arial';
            ctx.strokeText('Press to collect', chest.x, chest.y + 40);
            ctx.fillText('Press to collect', chest.x, chest.y + 40);
        }
    }
    
    collectPowerup(powerup, index) {
        this.powerups.splice(index, 1);

        // Update meta progression
        this.metaProgression.statistics.totalPowerupsCollected++;
        
        let message = '';
        let isGood = true;
        
        switch (powerup.type) {
            // Basic power-ups
            case 'damage':
                this.damageMultiplier += 0.5;
                message = 'DAMAGE +50%!';
                break;
            case 'soldiers':
                // Spawn soldier power-up around the player
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 20;
                const x = this.player.x + Math.cos(angle) * distance;
                const y = this.player.y + Math.sin(angle) * distance;
                // Ensure power-up soldier spawn position is within bounds
                const boundedX = Math.max(30, Math.min(this.getCanvasWidth() - 30, x));
                const boundedY = Math.max(30, Math.min(this.getCanvasHeight() - 30, y));
                this.soldiers.push(new Soldier(boundedX, boundedY, this));
                message = 'NEW SOLDIER!';
                break;
            case 'money':
                this.money += 200;
                message = '+$200!';
                break;
            case 'health':
                this.player.heal(75);
                message = 'HEALTH +75!';
                break;
            case 'multishot':
                this.player.multishotTime = 15000;
                message = 'MULTISHOT 15s!';
                break;
                
            // Score Multipliers
            case 'x2':
                this.score += Math.floor(this.score * 0.5);
                this.money += 100;
                message = 'SCORE x2!';
                break;
            case 'x3':
                this.score += Math.floor(this.score * 1);
                this.money += 200;
                message = 'SCORE x3!';
                break;
            case 'x5':
                this.score += Math.floor(this.score * 2);
                this.money += 400;
                message = 'SCORE x5!';
                break;
            case 'x10':
                this.score += Math.floor(this.score * 5);
                this.money += 1000;
                message = 'MEGA x10!';
                break;
                
            // Vehicles/Drones
            case 'tank_vehicle':
                this.player.vehicles.push(new Vehicle(this.player.x, this.player.y, 'tank', this));
                message = 'TANK DEPLOYED!';
                break;
            case 'helicopter':
                this.player.vehicles.push(new Vehicle(this.player.x, this.player.y - 50, 'helicopter', this));
                message = 'HELICOPTER!';
                break;
            case 'drone':
                this.player.drones.push(new Drone(this.player.x, this.player.y - 40, this));
                message = 'DRONE ACTIVE!';
                break;
            case 'mech_suit':
                this.player.vehicles.push(new Vehicle(this.player.x, this.player.y, 'mech', this));
                message = 'MECH SUIT!';
                break;
            case 'artillery':
                this.player.vehicles.push(new Vehicle(this.player.x, this.player.y + 40, 'artillery', this));
                message = 'ARTILLERY!';
                break;
                
            // Special Abilities
            case 'freeze':
                this.player.freezeTime = 8000;
                // Freeze all zombies
                this.zombies.forEach(zombie => zombie.frozen = true);
                setTimeout(() => {
                    this.zombies.forEach(zombie => zombie.frozen = false);
                }, 8000);
                message = 'FREEZE!';
                break;
            case 'shield':
                this.player.shieldTime = 12000;
                message = 'SHIELD!';
                break;
            case 'speed_boost':
                this.player.speedBoostTime = 10000;
                message = 'SPEED BOOST!';
                break;
            case 'time_slow':
                this.player.timeSlowTime = 8000;
                message = 'TIME SLOW!';
                break;
            case 'invincibility':
                this.player.invincibilityTime = 5000;
                message = 'INVINCIBLE!';
                break;
            case 'lightning_storm':
                // Strike random zombies with lightning
                for (let i = 0; i < 8; i++) {
                    if (this.zombies.length > 0) {
                        const randomZombie = this.zombies[Math.floor(Math.random() * this.zombies.length)];
                        randomZombie.takeDamage(500);
                        // Lightning effect
                        for (let j = 0; j < 10; j++) {
                            this.particles.push(new Particle(randomZombie.x, randomZombie.y, '#00ffff', 'large'));
                        }
                    }
                }
                message = 'LIGHTNING STORM!';
                break;
                
            // Area Effects
            case 'bomb':
                let killedCount = 0;
                for (let i = this.zombies.length - 1; i >= 0; i--) {
                    const zombie = this.zombies[i];
                    const dist = Math.sqrt((powerup.x - zombie.x) ** 2 + (powerup.y - zombie.y) ** 2);
                    if (dist < 120) {
                        this.zombieKilled(zombie);
                        this.zombies.splice(i, 1);
                        killedCount++;
                    }
                }
                message = `BOMB! ${killedCount} KILLS!`;
                for (let i = 0; i < 20; i++) {
                    this.particles.push(new Particle(powerup.x, powerup.y, '#ff8800', 'large'));
                }
                break;
            case 'nuke':
                let nukeKills = 0;
                for (let i = this.zombies.length - 1; i >= 0; i--) {
                    const zombie = this.zombies[i];
                    const dist = Math.sqrt((powerup.x - zombie.x) ** 2 + (powerup.y - zombie.y) ** 2);
                    if (dist < 200) {
                        this.zombieKilled(zombie);
                        this.zombies.splice(i, 1);
                        nukeKills++;
                    }
                }
                message = `NUKE! ${nukeKills} KILLS!`;
                for (let i = 0; i < 50; i++) {
                    this.particles.push(new Particle(powerup.x, powerup.y, '#ffff00', 'large'));
                }
                break;
            case 'poison_cloud':
                // Create poison cloud that damages zombies over time
                for (let i = 0; i < this.zombies.length; i++) {
                    const zombie = this.zombies[i];
                    const dist = Math.sqrt((powerup.x - zombie.x) ** 2 + (powerup.y - zombie.y) ** 2);
                    if (dist < 150) {
                        zombie.poisoned = true;
                        zombie.poisonDamage = 20;
                        zombie.poisonTime = 5000;
                    }
                }
                message = 'POISON CLOUD!';
                break;
            case 'emp_blast':
                // Disable all zombies temporarily
                this.zombies.forEach(zombie => {
                    zombie.stunned = true;
                    setTimeout(() => zombie.stunned = false, 4000);
                });
                message = 'EMP BLAST!';
                break;
                
            // Risk/Reward
            case 'lose_soldier':
                if (this.soldiers.length > 0) {
                    this.soldiers.splice(Math.floor(Math.random() * this.soldiers.length), 1);
                    message = 'LOST SOLDIER!';
                    isGood = false;
                } else {
                    this.player.takeDamage(50);
                    message = 'PLAYER DAMAGE!';
                    isGood = false;
                }
                break;
            case 'lose_health':
                this.player.takeDamage(40);
                message = 'HEALTH LOST!';
                isGood = false;
                break;
            case 'mystery_box':
                // Random good effect
                const goodEffects = ['damage', 'soldiers', 'money', 'health', 'x5', 'shield'];
                const randomGood = goodEffects[Math.floor(Math.random() * goodEffects.length)];
                this.collectPowerup({ type: randomGood, x: powerup.x, y: powerup.y }, -1);
                message = 'MYSTERY BONUS!';
                break;
            case 'cursed_treasure':
                // High reward but with a cost
                this.money += 500;
                this.score += 1000;
                this.player.takeDamage(30);
                message = 'CURSED GOLD!';
                break;
                
            // Progression
            case 'double_xp':
                this.score += this.score; // Double current score
                message = 'DOUBLE XP!';
                break;
            case 'coin_magnet':
                this.money += 300;
                // Auto-collect nearby power-ups
                for (let i = this.powerups.length - 1; i >= 0; i--) {
                    const otherPowerup = this.powerups[i];
                    const dist = Math.sqrt((powerup.x - otherPowerup.x) ** 2 + (powerup.y - otherPowerup.y) ** 2);
                    if (dist < 100 && otherPowerup !== powerup) {
                        this.collectPowerup(otherPowerup, i);
                    }
                }
                message = 'COIN MAGNET!';
                break;
            case 'bullet_rain':
                // Create bullets falling from sky
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => {
                        this.bullets.push(new Bullet(
                            Math.random() * this.getCanvasWidth(),
                            -10,
                            0,
                            300,
                            this.player.damage * 2,
                            'rain',
                            this,
                            1
                        ));
                    }, i * 100);
                }
                message = 'BULLET RAIN!';
                break;
            case 'zombie_weakness':
                // Make all zombies take double damage for a time
                this.zombies.forEach(zombie => {
                    zombie.vulnerable = true;
                    setTimeout(() => zombie.vulnerable = false, 10000);
                });
                message = 'ZOMBIE WEAKNESS!';
                break;
        }
        
        this.showMultiplierPopup(powerup.x, powerup.y, message, isGood);
        this.createPowerupCollectionEffect(powerup.x, powerup.y, powerup.type, powerup.rarity || 'common');
        this.updateUI();
    }
    
    showMultiplierPopup(x, y, text, isGood = true) {
        const popup = document.createElement('div');
        popup.className = 'multiplier-popup';
        popup.textContent = text;

        // Get canvas position relative to viewport
        const canvasRect = this.canvas.getBoundingClientRect();
        const popupX = canvasRect.left + x;
        const popupY = canvasRect.top + y;

        popup.style.left = popupX + 'px';
        popup.style.top = popupY + 'px';
        popup.style.color = isGood ? '#FFD700' : '#ff4444';

        document.body.appendChild(popup); // Append to body for proper positioning

        this.createTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 2000);
    }
    
    render() {
        // Clear canvas first with no transformations
        this.ctx.save();

        // Clear canvas with dynamic night sky gradient (full screen, no zoom)
        const timeOffset = Date.now() * 0.001;
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.getCanvasHeight());

        // Add subtle color shifting based on game state
        const hue1 = 240 + Math.sin(timeOffset * 0.5) * 15;
        const hue2 = 250 + Math.sin(timeOffset * 0.3) * 20;

        gradient.addColorStop(0, `hsl(${hue1}, 70%, 8%)`);
        gradient.addColorStop(0.7, `hsl(${hue2}, 60%, 15%)`);
        gradient.addColorStop(1, `hsl(${hue1 + 10}, 50%, 20%)`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.getCanvasWidth(), this.getCanvasHeight());

        // Now apply transformations for all game elements
        this.ctx.save();

        // Apply global zoom for massive battlefield view
        if (this.globalZoom && this.globalZoom !== 1.0) {
            const centerX = this.getCanvasWidth() / 2;
            const centerY = this.getCanvasHeight() / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(this.globalZoom, this.globalZoom);
            this.ctx.translate(-centerX, -centerY);
        }

        // Apply screen shake if active
        VisualEffects.applyScreenShake(this, this.ctx);

        // Draw stars (affected by zoom)
        this.drawStars();

        // Draw ground (affected by zoom)
        const groundGradient = this.ctx.createLinearGradient(0, this.getCanvasHeight() - 120, 0, this.getCanvasHeight());
        groundGradient.addColorStop(0, '#2d3436');
        groundGradient.addColorStop(1, '#636e72');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.getCanvasHeight() - 120, this.getCanvasWidth(), 120);

        // Draw battle lines (affected by zoom)
        this.ctx.strokeStyle = '#74b9ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        for (let i = 1; i < 4; i++) {
            const y = (this.getCanvasHeight() / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.getCanvasWidth(), y);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);

        // Render background effects (affected by zoom)
        VisualEffects.renderBackgroundEffects(this, this.ctx);

        // Render game objects (back to front) - Optimized for demo performance
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].render(this.ctx);
        }

        // PHASE 4.2: Render floating damage numbers
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (let i = 0; i < this.floatingTexts.length; i++) {
            const text = this.floatingTexts[i];
            const alpha = Math.min(1, text.lifetime / 300); // Fade out
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `bold ${text.fontSize}px Arial`;
            this.ctx.fillStyle = text.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text.text, text.x, text.y);
            this.ctx.fillText(text.text, text.x, text.y);
        }
        this.ctx.restore();

        for (let i = 0; i < this.powerups.length; i++) {
            this.powerups[i].render(this.ctx);
        }

        for (let i = 0; i < this.treasureChests.length; i++) {
            this.renderTreasureChest(this.treasureChests[i]);
        }

        for (let i = 0; i < this.zombies.length; i++) {
            this.zombies[i].render(this.ctx);
        }

        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].render(this.ctx);
        }

        // Render enemy projectiles
        for (let i = 0; i < this.enemyProjectiles.length; i++) {
            this.renderEnemyProjectile(this.enemyProjectiles[i]);
        }

        // Render hazards (poison clouds, fire areas, etc.)
        for (let i = 0; i < this.hazards.length; i++) {
            this.renderHazard(this.hazards[i]);
        }

        for (let i = 0; i < this.soldiers.length; i++) {
            this.soldiers[i].render(this.ctx);
        }

        // Render player
        if (this.player) {
            // DEBUG: Check if player has valid coordinates
            if (isNaN(this.player.x) || isNaN(this.player.y)) {
                console.error('Player has invalid coordinates:', this.player.x, this.player.y);
                this.player.x = this.getCanvasWidth() / 2;
                this.player.y = this.getCanvasHeight() / 2;
            }
            this.player.render(this.ctx);

            // Render vehicles and drones - Optimized
            for (let i = 0; i < this.player.vehicles.length; i++) {
                this.player.vehicles[i].render(this.ctx);
            }
            for (let i = 0; i < this.player.drones.length; i++) {
                this.player.drones[i].render(this.ctx);
            }
        }

        // Restore game world transform before drawing UI elements
        this.ctx.restore();

        // Draw UI elements without zoom transformation
        this.ctx.save();

        // Draw wave countdown (UI - no zoom)
        if (this.zombiesSpawned >= this.zombiesInWave && this.zombies.length === 0) {
            const timeLeft = Math.ceil((this.waveDelay - this.nextWaveTime) / 1000);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(`Next wave in: ${timeLeft}`, this.getCanvasWidth() / 2, 60);
            this.ctx.fillText(`Next wave in: ${timeLeft}`, this.getCanvasWidth() / 2, 60);
        }

        // Draw wave progress (UI - no zoom)
        const progress = this.zombiesKilled / this.zombiesInWave;
        const barWidth = 200;
        const barHeight = 8;
        const barX = this.getCanvasWidth() - barWidth - 20;
        const barY = 20;

        this.ctx.fillStyle = '#2d3436';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        this.ctx.fillStyle = '#00b894';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Restore UI context
        this.ctx.restore();

        // Restore main context
        this.ctx.restore();
    }

    renderEnemyProjectile(projectile) {
        const ctx = this.ctx;

        // Draw projectile based on type
        switch (projectile.type) {
            case 'spit':
                ctx.fillStyle = '#00b894';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2);
                ctx.fill();
                // Add glow effect
                ctx.shadowColor = '#00b894';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;

            default:
                // Default enemy projectile appearance
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    renderHazard(hazard) {
        const ctx = this.ctx;
        const alpha = Math.max(0.3, hazard.duration / 8000); // Fade out over time

        switch (hazard.type) {
            case 'poison':
                // Green poison cloud
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#00b894';
                ctx.beginPath();
                ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
                ctx.fill();

                // Add pulsing effect
                const pulseRadius = hazard.radius * (0.8 + Math.sin(Date.now() / 300) * 0.2);
                ctx.globalAlpha = alpha * 0.5;
                ctx.beginPath();
                ctx.arc(hazard.x, hazard.y, pulseRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            case 'fire':
                // Red fire area
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#e17055';
                ctx.beginPath();
                ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
                ctx.fill();

                // Add flickering effect
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5;
                    const flickerRadius = hazard.radius * (0.6 + Math.random() * 0.4);
                    ctx.globalAlpha = alpha * Math.random();
                    ctx.beginPath();
                    ctx.arc(
                        hazard.x + Math.cos(angle) * 20,
                        hazard.y + Math.sin(angle) * 20,
                        flickerRadius * 0.3,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
                ctx.restore();
                break;

            case 'ice':
                // Blue ice area
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#81ecec';
                ctx.beginPath();
                ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
                ctx.fill();

                // Add crystalline pattern
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = alpha * 0.8;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    ctx.beginPath();
                    ctx.moveTo(hazard.x, hazard.y);
                    ctx.lineTo(
                        hazard.x + Math.cos(angle) * hazard.radius,
                        hazard.y + Math.sin(angle) * hazard.radius
                    );
                    ctx.stroke();
                }
                ctx.restore();
                break;
        }
    }

    drawStars() {
        // Static stars for performance
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 167) % this.getCanvasWidth();
            const y = (i * 251) % (this.getCanvasHeight() / 2);
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    updateUI() {
        try {
            // Use cached DOM elements for better performance
            const dom = this.domElements || {};

            // Update level and experience
            if (dom.levelNumber) dom.levelNumber.textContent = this.level;
            if (dom.expValue) dom.expValue.textContent = this.experience;
            if (dom.expMax) dom.expMax.textContent = this.experienceToNextLevel;

            // Update experience bar
            if (dom.expBar) {
                const expPercentage = (this.experience / this.experienceToNextLevel) * 100;
                dom.expBar.style.width = expPercentage + '%';
            }

            // Update player health
            if (this.player && dom.healthBar && dom.healthText) {
                const healthPercentage = (this.player.health / this.player.maxHealth) * 100;
                dom.healthBar.style.width = healthPercentage + '%';
                dom.healthText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
            }

            // Update wave info
            if (dom.waveNumber) dom.waveNumber.textContent = this.wave;

            // Update wave progress
            if (dom.waveProgressBar) {
                const waveProgress = this.zombiesKilled / this.zombiesInWave;
                const waveProgressPercentage = Math.min(100, waveProgress * 100);
                dom.waveProgressBar.style.width = waveProgressPercentage + '%';
            }
            if (dom.waveProgressText) {
                dom.waveProgressText.textContent = `${this.zombiesKilled}/${this.zombiesInWave} enemies`;
            }

            // Update current weapon display in top bar (using cached elements)
            if (dom.currentWeapon) {
                if (this.weapons.length > 0) {
                    const primaryWeapon = this.weapons[0];
                    dom.currentWeapon.textContent = primaryWeapon.name.toUpperCase();
                } else {
                    dom.currentWeapon.textContent = 'RIFLE';
                }
            }
            if (dom.ammoCount) {
                dom.ammoCount.textContent = '∞'; // Infinite ammo for now
            }

            // Update combat stats
            const scoreEl = document.getElementById('scoreValue');
            const killCountEl = document.getElementById('killCountValue');
            if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
            if (killCountEl) killCountEl.textContent = this.killCount.toLocaleString();

            // Update survival time
            const currentTime = Date.now();
            const survivalSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);
            const minutes = Math.floor(survivalSeconds / 60);
            const seconds = survivalSeconds % 60;
            const survivalTimeEl = document.getElementById('survivalTimeValue');
            if (survivalTimeEl) {
                survivalTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Update resources
            const moneyEl = document.getElementById('moneyValue');
            const soldierCountEl = document.getElementById('soldierCount');
            const powerupCountEl = document.getElementById('powerupCount');
            if (moneyEl) moneyEl.textContent = this.money;
            if (soldierCountEl) soldierCountEl.textContent = this.soldiers.length;
            if (powerupCountEl) powerupCountEl.textContent = this.powerups.length;

            // Update multipliers
            const damageMultEl = document.getElementById('damageMultValue');
            const speedMultEl = document.getElementById('speedMultValue');
            if (damageMultEl) damageMultEl.textContent = `${this.damageMultiplier.toFixed(1)}x`;
            if (speedMultEl) speedMultEl.textContent = `${this.speedMultiplier.toFixed(1)}x`;

            // Update character display
            const characterEl = document.getElementById('characterValue');
            if (characterEl) {
                const characterName = this.characters[this.selectedCharacter].name.toUpperCase();
                characterEl.textContent = characterName;
            }

            // Update combo display
            const comboData = this.comboSystem.getComboData();
            const comboDisplayEl = document.getElementById('comboDisplay');
            const comboMultiplierEl = document.getElementById('comboMultiplier');

            if (comboDisplayEl && comboData.comboName) {
                comboDisplayEl.textContent = `${comboData.comboName} (${comboData.kills})`;
                comboDisplayEl.style.display = 'block';
                comboDisplayEl.style.color = comboData.kills >= 50 ? '#ff6b35' : '#FFD700';
            } else if (comboDisplayEl) {
                comboDisplayEl.style.display = 'none';
            }

            if (comboMultiplierEl && comboData.multiplier > 1) {
                comboMultiplierEl.textContent = `${comboData.multiplier.toFixed(1)}x COMBO`;
                comboMultiplierEl.style.display = 'block';
            } else if (comboMultiplierEl) {
                comboMultiplierEl.style.display = 'none';
            }

            // Update weapon and passive information
            this.updateWeaponsPanel();
            this.updatePassivesPanel();
            this.updateStatusEffects();

            // Update buttons
            const adjustedSoldierCost = this.getAdjustedUpgradeCost(this.soldierCost);
            const adjustedUpgradeCost = this.getAdjustedUpgradeCost(this.upgradeCost);
            const adjustedSpeedCost = this.getAdjustedUpgradeCost(this.speedCost);

            const buySoldierBtn = document.getElementById('buySoldier');
            const upgradeDamageBtn = document.getElementById('upgradeDamage');
            const upgradeSpeedBtn = document.getElementById('upgradeSpeed');

            if (buySoldierBtn) {
                const labelEl = buySoldierBtn.querySelector('.btn-label');
                const costEl = buySoldierBtn.querySelector('.btn-cost');
                if (labelEl) labelEl.textContent = 'Buy Soldier';
                if (costEl) costEl.textContent = `$${adjustedSoldierCost}`;
                buySoldierBtn.disabled = this.money < adjustedSoldierCost;
            }
            if (upgradeDamageBtn) {
                const labelEl = upgradeDamageBtn.querySelector('.btn-label');
                const costEl = upgradeDamageBtn.querySelector('.btn-cost');
                if (labelEl) labelEl.textContent = 'Upgrade DMG';
                if (costEl) costEl.textContent = `$${adjustedUpgradeCost}`;
                upgradeDamageBtn.disabled = this.money < adjustedUpgradeCost;
            }
            if (upgradeSpeedBtn) {
                const labelEl = upgradeSpeedBtn.querySelector('.btn-label');
                const costEl = upgradeSpeedBtn.querySelector('.btn-cost');
                if (labelEl) labelEl.textContent = 'Upgrade SPD';
                if (costEl) costEl.textContent = `$${adjustedSpeedCost}`;
                upgradeSpeedBtn.disabled = this.money < adjustedSpeedCost;
            }
        } catch (error) {
            console.error('Failed to update UI:', error);
        }
    }

    updateWeaponsPanel() {
        const weaponsList = document.getElementById('weaponsList');
        if (!weaponsList) return;

        weaponsList.innerHTML = '';

        // Show current weapons
        this.weapons.forEach(weapon => {
            const weaponItem = document.createElement('div');
            weaponItem.className = 'weapon-item';

            // Check if weapon is evolved
            const isEvolved = ['plasma_rifle', 'gatling_laser', 'missile_barrage', 'soul_reaper', 'holy_bomb', 'dragon_breath', 'death_ray'].includes(weapon.id);
            if (isEvolved) {
                weaponItem.classList.add('weapon-evolved');
            }

            const weaponName = document.createElement('span');
            weaponName.className = 'weapon-name';
            weaponName.textContent = (weapon.name || weapon.id).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

            const weaponLevel = document.createElement('span');
            weaponLevel.className = 'weapon-level';
            weaponLevel.textContent = `Lv.${weapon.level || 1}`;

            weaponItem.appendChild(weaponName);
            weaponItem.appendChild(weaponLevel);
            weaponsList.appendChild(weaponItem);
        });

        // Show placeholder if no weapons
        if (this.weapons.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#888';
            placeholder.style.fontSize = '12px';
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '10px';
            placeholder.textContent = 'No weapons equipped';
            weaponsList.appendChild(placeholder);
        }
    }

    updatePassivesPanel() {
        const passivesList = document.getElementById('passivesList');
        if (!passivesList) return;

        passivesList.innerHTML = '';

        // Show passive items
        this.passiveItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'passive-item';

            const itemName = document.createElement('span');
            itemName.className = 'passive-name';
            itemName.textContent = (item.name || item.id).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

            const itemLevel = document.createElement('span');
            itemLevel.className = 'passive-level';
            itemLevel.textContent = `Lv.${item.level || 1}`;

            itemElement.appendChild(itemName);
            itemElement.appendChild(itemLevel);
            passivesList.appendChild(itemElement);
        });

        // Show placeholder if no passives
        if (this.passiveItems.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#888';
            placeholder.style.fontSize = '12px';
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '10px';
            placeholder.textContent = 'No passive items';
            passivesList.appendChild(placeholder);
        }
    }

    updateStatusEffects() {
        const statusEffects = document.getElementById('statusEffects');
        if (!statusEffects) return;

        statusEffects.innerHTML = '';

        // Show active status effects
        if (this.player) {
            if (this.player.shieldTime > 0) {
                const shieldEffect = document.createElement('div');
                shieldEffect.className = 'status-effect';
                shieldEffect.style.borderColor = '#00ffff';
                shieldEffect.style.color = '#00ffff';
                shieldEffect.textContent = '🛡 SHIELD';
                statusEffects.appendChild(shieldEffect);
            }

            if (this.player.speedBoostTime > 0) {
                const speedEffect = document.createElement('div');
                speedEffect.className = 'status-effect';
                speedEffect.style.borderColor = '#ffff00';
                speedEffect.style.color = '#ffff00';
                speedEffect.textContent = '⚡ SPEED';
                statusEffects.appendChild(speedEffect);
            }

            if (this.player.invincibilityTime > 0) {
                const invincEffect = document.createElement('div');
                invincEffect.className = 'status-effect';
                invincEffect.style.borderColor = '#ffffff';
                invincEffect.style.color = '#ffffff';
                invincEffect.textContent = '✨ INVINCIBLE';
                statusEffects.appendChild(invincEffect);
            }

            if (this.player.multishotTime > 0) {
                const multishotEffect = document.createElement('div');
                multishotEffect.className = 'status-effect';
                multishotEffect.style.borderColor = '#ff6b6b';
                multishotEffect.style.color = '#ff6b6b';
                multishotEffect.textContent = '💥 MULTISHOT';
                statusEffects.appendChild(multishotEffect);
            }
        }
    }
    
    gameOver() {
        this.isRunning = false;

        // Dramatic game over visual effects
        VisualEffects.addScreenShake(this, 8, 2000);
        VisualEffects.addChromaticAberration(this, 0.8, 3000);

        // Create dramatic explosion pattern around player
        const playerX = this.player ? this.player.x : this.canvas.width / 2;
        const playerY = this.player ? this.player.y : this.canvas.height / 2;

        // Central massive explosion
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            this.particles.push(new Particle(
                playerX + Math.cos(angle) * distance,
                playerY + Math.sin(angle) * distance,
                `hsl(${Math.random() < 0.5 ? 0 : 30}, 100%, ${50 + Math.random() * 40}%)`,
                'massive',
                'explosion'
            ));
        }

        // Expanding shockwave particles
        for (let ring = 0; ring < 3; ring++) {
            setTimeout(() => {
                for (let i = 0; i < 30; i++) {
                    const angle = (i / 30) * Math.PI * 2;
                    const distance = 150 + ring * 100;
                    this.particles.push(new Particle(
                        playerX + Math.cos(angle) * distance,
                        playerY + Math.sin(angle) * distance,
                        `hsl(${220 + Math.random() * 40}, 80%, ${40 + Math.random() * 30}%)`,
                        'large',
                        'energy'
                    ));
                }
            }, ring * 300);
        }

        // Update meta progression statistics
        this.metaProgression.statistics.totalDeaths++;
        if (this.wave > this.metaProgression.statistics.highestWave) {
            this.metaProgression.statistics.highestWave = this.wave;
        }
        if (this.survivalTime > this.metaProgression.statistics.longestSurvival) {
            this.metaProgression.statistics.longestSurvival = this.survivalTime;
        }
        this.metaProgression.totalCoins += Math.floor(this.score / 100); // Convert score to coins

        // Save meta progression
        this.saveMetaProgression();

        // Safe DOM updates with cached elements
        const dom = this.domElements || {};

        if (dom.finalScore) dom.finalScore.textContent = this.score;
        if (dom.finalWave) dom.finalWave.textContent = this.wave;
        if (dom.gameOver) dom.gameOver.classList.remove('hidden');
    }
    
    restart() {
        // Clean up existing event listeners and timers
        this.cleanup();

        document.getElementById('gameOver').classList.add('hidden');

        // Reset game state
        this.wave = 1;
        this.score = 0;
        this.gameStartTime = Date.now(); // Reset survival timer
        this.money = 150;  // Balanced starting money for meaningful choices
        this.soldierCost = 75;
        this.upgradeCost = 125;
        this.speedCost = 100;
        this.damageMultiplier = 1;
        this.speedMultiplier = 1;
        
        // Reset arrays
        this.soldiers = [];
        this.zombies = [];
        this.bullets = [];
        this.powerups = [];
        this.particles = [];
        this.treasureChests = [];
        this.enemyProjectiles = [];
        this.hazards = [];

        // Reset level/experience system
        this.experience = 0;
        this.level = 1;
        this.experienceToNextLevel = 150;
        this.levelUpPending = false;

        // Reset weapon/item system
        this.weapons = [{ id: 'rifle', name: 'Rifle', level: 1 }]; // Start with rifle
        this.passiveItems = [];
        this.evolvedWeapons = [];

        this.zombiesInWave = 10; // Match wave 1 calculation: 8 + (1*2.5) + 0 = 10
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.killCount = 0; // Reset total kill counter
        this.nextWaveTime = 0;
        this.powerupSpawnTimer = 0;
        this.gameStartTime = Date.now();
        this.survivalTime = 0;
        
        this.createPlayer();
        this.setupEventListeners(); // Re-setup event listeners after cleanup
        this.updateUI();
        this.startGame();
    }
}

class Player {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;

        // Get character stats
        const character = game.characters[game.selectedCharacter];
        this.health = character.maxHealth;
        this.maxHealth = character.maxHealth;
        this.speed = character.speed;
        this.fireRate = 300; // Base fire rate in milliseconds
        this.lastShot = 0;
        this.damage = 35 * character.damage; // Balanced base damage
        this.multishotTime = 0;
        this.width = 25;
        this.height = 35;
        
        // Weapon system
        this.currentWeapon = 'basic';
        this.weaponTime = 0;
        this.weaponCooldowns = {}; // Individual weapon cooldowns

        // Special abilities
        this.shieldTime = 0;
        this.freezeTime = 0;
        this.invincibilityTime = 0;
        this.timeSlowTime = 0;
        this.speedBoostTime = 0;

        // PHASE 3.1: DODGE ROLL SYSTEM
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.isDashing = false;
        this.dashSpeed = 600; // Fast dash movement
        this.dashAngle = 0;
        this.iframes = 0; // Invincibility frames during dash
        this.dashMaxCooldown = 1500; // 1.5 second cooldown
        this.dashMaxDuration = 200; // 0.2 second dash

        // Vehicle/Drone system
        this.vehicles = [];
        this.drones = [];

        // Initialize character-specific abilities
        this.initializeCharacterAbilities(character);
    }

    initializeCharacterAbilities(character) {
        // Set starting weapon
        if (character.startWeapon) {
            this.currentWeapon = character.startWeapon;
        }

        // Handle special abilities
        if (character.specialAbility === 'drone') {
            // Engineer starts with a drone
            this.drones.push(new Drone(this.x, this.y - 40, this.game));
        }
    }
    
    update(deltaTime) {
        this.lastShot += deltaTime;
        this.multishotTime = Math.max(0, this.multishotTime - deltaTime);

        // Update weapon cooldowns
        for (let weaponId in this.weaponCooldowns) {
            this.weaponCooldowns[weaponId] = Math.max(0, this.weaponCooldowns[weaponId] - deltaTime);
        }

        // Update special abilities
        this.weaponTime = Math.max(0, this.weaponTime - deltaTime);
        this.shieldTime = Math.max(0, this.shieldTime - deltaTime);
        this.freezeTime = Math.max(0, this.freezeTime - deltaTime);
        this.invincibilityTime = Math.max(0, this.invincibilityTime - deltaTime);
        this.timeSlowTime = Math.max(0, this.timeSlowTime - deltaTime);
        this.speedBoostTime = Math.max(0, this.speedBoostTime - deltaTime);

        // PHASE 3.1: Update dash system
        this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime);
        this.dashDuration = Math.max(0, this.dashDuration - deltaTime);
        this.iframes = Math.max(0, this.iframes - deltaTime);

        if (this.dashDuration <= 0) {
            this.isDashing = false;
        }

        // Legacy weapon system cleanup - remove old power-up weapons when they expire
        if (this.weaponTime <= 0 && this.currentWeapon !== 'basic') {
            this.currentWeapon = 'basic';
        }

        // PHASE 3.1: Check for dash input (Spacebar or Shift)
        if ((this.game.keys[' '] || this.game.keys['shift']) && this.dashCooldown <= 0 && !this.isDashing) {
            this.startDash();
        }

        // Handle movement
        let speedMultiplier = this.speedBoostTime > 0 ? 2 : 1;

        // Apply speed boost passive item effect
        const speedBoost = this.game.passiveItems.find(p => p.id === 'speed_boost');
        if (speedBoost) {
            speedMultiplier *= (1 + (0.25 * speedBoost.level)); // 25% faster per level
        }

        const speed = this.speed * this.game.speedMultiplier * speedMultiplier;

        // PHASE 3.1: Dash movement overrides normal movement
        if (this.isDashing) {
            // Fast dash in locked direction
            this.x += Math.cos(this.dashAngle) * this.dashSpeed * deltaTime / 1000;
            this.y += Math.sin(this.dashAngle) * this.dashSpeed * deltaTime / 1000;

            // Keep within bounds
            this.x = Math.max(this.width/2, Math.min(this.game.getCanvasWidth() - this.width/2, this.x));
            this.y = Math.max(this.height/2, Math.min(this.game.getCanvasHeight() - this.height/2 - 30, this.y));

            // Create dash trail particles
            if (Math.random() < 0.5) {
                this.game.particles.push(new Particle(
                    this.x,
                    this.y,
                    'rgba(255, 255, 255, 0.6)',
                    'medium',
                    'energy'
                ));
            }
        } else {
            // Normal movement (left/right)
            if (this.game.keys['a'] || this.game.keys['arrowleft']) {
                this.x = Math.max(this.width/2, this.x - speed * deltaTime / 1000);
            }
            if (this.game.keys['d'] || this.game.keys['arrowright']) {
                this.x = Math.min(this.game.getCanvasWidth() - this.width/2, this.x + speed * deltaTime / 1000);
            }

            // Normal movement (up/down)
            if (this.game.keys['w'] || this.game.keys['arrowup']) {
                this.y = Math.max(this.height/2, this.y - speed * deltaTime / 1000);
            }
            if (this.game.keys['s'] || this.game.keys['arrowdown']) {
                this.y = Math.min(this.game.getCanvasHeight() - this.height/2 - 30, this.y + speed * deltaTime / 1000); // Leave space at bottom for UI
            }
        }
        
        // Auto-shoot with all weapons - always try to shoot if zombies exist
        const target = this.findNearestZombie();
        if (target) {
            // Only shoot if we have a valid target within range
            this.shootAllWeapons(target);
        }
        
        // Update vehicles and drones
        this.vehicles.forEach(vehicle => vehicle.update(deltaTime));
        this.drones.forEach(drone => drone.update(deltaTime));
        this.vehicles = this.vehicles.filter(vehicle => vehicle.active);
        this.drones = this.drones.filter(drone => drone.active);
    }
    
    getFireRate() {
        // Base fire rate modified by passive items
        let baseRate = this.fireRate;

        // Apply rapid fire passive item effect
        const rapidFire = this.game.passiveItems.find(p => p.id === 'rapid_fire');
        if (rapidFire) {
            baseRate *= (1 - (0.3 * rapidFire.level)); // 30% faster per level
        }

        return baseRate;
    }

    shootAllWeapons(target) {
        if (!target) return; // Safety check

        // Fire all equipped weapons that are off cooldown
        if (this.game.weapons.length === 0) {
            // Fallback to basic shot if no weapons - ensure it always fires initially
            const cooldown = this.weaponCooldowns['basic'] || 0;
            if (cooldown <= 0) {
                this.shootWeapon('basic', target, 1);
                this.weaponCooldowns['basic'] = this.getWeaponFireRate('basic');
            }
        } else {
            // Fire each weapon independently based on its cooldown
            this.game.weapons.forEach(weapon => {
                const cooldown = this.weaponCooldowns[weapon.id] || 0;
                if (cooldown <= 0) {
                    this.shootWeapon(weapon.id, target, weapon.level);
                    this.weaponCooldowns[weapon.id] = this.getWeaponFireRate(weapon.id);
                }
            });
        }
    }

    getWeaponFireRate(weaponId) {
        let baseRate = this.fireRate;

        // Different weapons have different base fire rates
        const weaponRates = {
            'basic': 1.0,
            'rifle': 0.8,      // Faster than basic
            'shotgun': 1.5,    // Slower, powerful shots
            'machinegun': 0.3, // Very fast
            'laser': 0.6,      // Fast energy weapon
            'rocket': 2.0,     // Slow, explosive
            'knife': 0.1,      // Very fast melee
            'grenade': 1.8,    // Slow area damage

            // Evolved weapons - generally faster
            'plasma_rifle': 0.5,
            'dragon_breath': 1.2,
            'gatling_laser': 0.15,
            'death_ray': 0.4,
            'missile_barrage': 1.5,
            'soul_reaper': 0.05,
            'holy_bomb': 1.6
        };

        const rate = weaponRates[weaponId] || 1.0;
        baseRate *= rate;

        // Apply rapid fire passive item effect
        const rapidFire = this.game.passiveItems.find(p => p.id === 'rapid_fire');
        if (rapidFire) {
            baseRate *= (1 - (0.3 * rapidFire.level)); // 30% faster per level
        }

        return baseRate; // Already in milliseconds
    }

    shootWeapon(weaponId, target, weaponLevel) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const bulletSpeed = 500;
        let baseDamage = this.damage * this.game.damageMultiplier;

        // Play weapon sound
        this.game.audioSystem.playSound('weapon_' + weaponId, 0.3);

        // Apply ammo box passive item effect
        const ammoBox = this.game.passiveItems.find(p => p.id === 'ammo_box');
        if (ammoBox) {
            baseDamage *= (1 + (0.25 * ammoBox.level)); // 25% more damage per level
        }

        // Reasonable damage scaling for weapon upgrades
        baseDamage *= (1 + (weaponLevel - 1) * 0.20); // 20% more damage per weapon level

        // Apply energy core speed boost to all weapons
        const energyCore = this.game.passiveItems.find(p => p.id === 'energy_core');
        let enhancedBulletSpeed = bulletSpeed;
        if (energyCore) {
            enhancedBulletSpeed *= (1 + (0.5 * energyCore.level)); // 50% faster per level
        }

        switch (weaponId) {
            case 'rifle':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * enhancedBulletSpeed,
                    Math.sin(angle) * enhancedBulletSpeed,
                    baseDamage,
                    'rifle',
                    this.game,
                    weaponLevel
                ));
                // Add weapon fire effect
                this.createMuzzleFlash('rifle', weaponLevel);
                break;

            case 'shotgun':
                // Spread shot
                let projectiles = 5;
                const spreadShot = this.game.passiveItems.find(p => p.id === 'spread_shot');
                if (spreadShot) {
                    projectiles += spreadShot.level * 2; // +2 projectiles per level
                }

                const spreadRange = projectiles - 1;
                for (let i = 0; i < projectiles; i++) {
                    const spreadAngle = angle + ((i - spreadRange/2) * 0.2);
                    this.game.bullets.push(new Bullet(
                        this.x, this.y - 10,
                        Math.cos(spreadAngle) * enhancedBulletSpeed,
                        Math.sin(spreadAngle) * enhancedBulletSpeed,
                        baseDamage * 0.7,
                        'shotgun',
                        this.game,
                        weaponLevel
                    ));
                }
                // Add weapon fire effect
                this.createMuzzleFlash('shotgun', weaponLevel);
                break;

            case 'machinegun':
                // Fast, slightly inaccurate shots
                const spread = (Math.random() - 0.5) * 0.3;
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle + spread) * enhancedBulletSpeed,
                    Math.sin(angle + spread) * enhancedBulletSpeed,
                    baseDamage * 0.6,
                    'machinegun',
                    this.game,
                    weaponLevel
                ));
                // Add weapon fire effect
                this.createMuzzleFlash('machinegun', weaponLevel);
                break;

            case 'laser':
                // Laser gets additional speed boost on top of energy core
                let speed = enhancedBulletSpeed * 2;

                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    baseDamage * 1.5,
                    'laser',
                    this.game,
                    weaponLevel
                ));
                // Add weapon fire effect
                this.createMuzzleFlash('laser', weaponLevel);
                break;

            case 'rocket':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * (300 + (enhancedBulletSpeed - bulletSpeed)),
                    Math.sin(angle) * (300 + (enhancedBulletSpeed - bulletSpeed)),
                    baseDamage * 3,
                    'rocket',
                    this.game,
                    weaponLevel
                ));
                // Add weapon fire effect
                this.createMuzzleFlash('rocket', weaponLevel);
                break;

            case 'knife':
                // Spinning blade around player
                for (let i = 0; i < weaponLevel; i++) {
                    const knifeAngle = (Date.now() / 500 + i * (Math.PI * 2 / weaponLevel)) % (Math.PI * 2);
                    this.game.bullets.push(new Bullet(
                        this.x + Math.cos(knifeAngle) * 50,
                        this.y + Math.sin(knifeAngle) * 50,
                        Math.cos(knifeAngle) * 100,
                        Math.sin(knifeAngle) * 100,
                        baseDamage * 0.8,
                        'knife',
                        this.game,
                        weaponLevel
                    ));
                }
                break;

            case 'plasma':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * enhancedBulletSpeed,
                    Math.sin(angle) * enhancedBulletSpeed,
                    baseDamage * 2,
                    'plasma',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('plasma', weaponLevel);
                break;

            case 'railgun':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * enhancedBulletSpeed * 3,
                    Math.sin(angle) * enhancedBulletSpeed * 3,
                    baseDamage * 4,
                    'railgun',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('railgun', weaponLevel);
                break;

            case 'flamethrower':
                // Wide flame spread
                for (let i = -2; i <= 2; i++) {
                    const flameAngle = angle + (i * 0.2);
                    this.game.bullets.push(new Bullet(
                        this.x, this.y - 10,
                        Math.cos(flameAngle) * (200 + Math.random() * 100),
                        Math.sin(flameAngle) * (200 + Math.random() * 100),
                        baseDamage * 1.2,
                        'flamethrower',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('flamethrower', weaponLevel);
                break;

            case 'pistol':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * enhancedBulletSpeed,
                    Math.sin(angle) * enhancedBulletSpeed,
                    baseDamage * 0.8,
                    'pistol',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('pistol', weaponLevel);
                break;

            case 'dual_pistols':
                // Fire two bullets at slightly different angles
                for (let i = 0; i < 2; i++) {
                    const offsetAngle = angle + (i - 0.5) * 0.1;
                    this.game.bullets.push(new Bullet(
                        this.x + (i - 0.5) * 10, this.y - 10,
                        Math.cos(offsetAngle) * enhancedBulletSpeed,
                        Math.sin(offsetAngle) * enhancedBulletSpeed,
                        baseDamage * 0.9,
                        'dual_pistols',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('dual_pistols', weaponLevel);
                break;

            case 'grenade':
                // Lob grenades in arc
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * 200,
                    Math.sin(angle) * 200 - 100, // Arc trajectory
                    baseDamage * 2,
                    'grenade',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('grenade', weaponLevel);
                break;

            // Evolved weapons - more powerful versions
            case 'plasma_rifle':
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * bulletSpeed * 1.5,
                    Math.sin(angle) * bulletSpeed * 1.5,
                    baseDamage * 2.5,
                    'plasma_rifle',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('plasma_rifle', weaponLevel);
                break;

            case 'dragon_breath':
                // Wide flame spread
                for (let i = -4; i <= 4; i++) {
                    const flameAngle = angle + (i * 0.15);
                    this.game.bullets.push(new Bullet(
                        this.x, this.y - 10,
                        Math.cos(flameAngle) * (300 + Math.random() * 200),
                        Math.sin(flameAngle) * (300 + Math.random() * 200),
                        baseDamage * 1.2,
                        'dragon_breath',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('dragon_breath', weaponLevel);
                break;

            case 'gatling_laser':
                // Multiple laser beams
                for (let i = -1; i <= 1; i++) {
                    const laserAngle = angle + (i * 0.1);
                    this.game.bullets.push(new Bullet(
                        this.x, this.y - 10,
                        Math.cos(laserAngle) * bulletSpeed * 3,
                        Math.sin(laserAngle) * bulletSpeed * 3,
                        baseDamage * 2,
                        'gatling_laser',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('gatling_laser', weaponLevel);
                break;

            case 'death_ray':
                // Piercing death beam
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * bulletSpeed * 4,
                    Math.sin(angle) * bulletSpeed * 4,
                    baseDamage * 4,
                    'death_ray',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('death_ray', weaponLevel);
                break;

            case 'missile_barrage':
                // Multiple homing missiles
                for (let i = 0; i < 3; i++) {
                    const timeoutId = setTimeout(() => {
                        this.game.bullets.push(new Bullet(
                            this.x, this.y - 10,
                            Math.cos(angle + (Math.random() - 0.5) * 0.5) * 400,
                            Math.sin(angle + (Math.random() - 0.5) * 0.5) * 400,
                            baseDamage * 3.5,
                            'missile_barrage',
                            this.game,
                            weaponLevel
                        ));
                    }, i * 100);
                    // Track timeout for cleanup
                    this.game.activeTimeouts.push(timeoutId);
                }
                this.createMuzzleFlash('rocket', weaponLevel);
                break;

            case 'soul_reaper':
                // Piercing spinning blades
                for (let i = 0; i < weaponLevel * 2; i++) {
                    const reapAngle = (Date.now() / 300 + i * (Math.PI / weaponLevel)) % (Math.PI * 2);
                    this.game.bullets.push(new Bullet(
                        this.x + Math.cos(reapAngle) * 80,
                        this.y + Math.sin(reapAngle) * 80,
                        Math.cos(reapAngle) * 150,
                        Math.sin(reapAngle) * 150,
                        baseDamage * 1.5,
                        'soul_reaper',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('soul_reaper', weaponLevel);
                break;

            case 'holy_bomb':
                // Screen-clearing explosion
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * 150,
                    Math.sin(angle) * 150 - 80,
                    baseDamage * 5,
                    'holy_bomb',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('holy_bomb', weaponLevel);
                break;

            case 'phieraggi':
                // Ultimate dual weapon - fires in multiple directions
                const phieraggiShots = 8;
                for (let i = 0; i < phieraggiShots; i++) {
                    const phieraggiAngle = (Math.PI * 2 * i) / phieraggiShots;
                    this.game.bullets.push(new Bullet(
                        this.x, this.y - 10,
                        Math.cos(phieraggiAngle) * enhancedBulletSpeed * 1.5,
                        Math.sin(phieraggiAngle) * enhancedBulletSpeed * 1.5,
                        baseDamage * 2,
                        'phieraggi',
                        this.game,
                        weaponLevel
                    ));
                }
                this.createMuzzleFlash('laser', weaponLevel);
                break;

            default:
                // Basic shot
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(angle) * bulletSpeed,
                    Math.sin(angle) * bulletSpeed,
                    baseDamage,
                    'basic',
                    this.game,
                    weaponLevel
                ));
                this.createMuzzleFlash('rifle', weaponLevel);
                break;
        }

        // Apply piercing effect to bullets if passive item exists
        const piercing = this.game.passiveItems.find(p => p.id === 'piercing');
        if (piercing && this.game.bullets.length > 0) {
            const lastBullet = this.game.bullets[this.game.bullets.length - 1];
            lastBullet.piercing = piercing.level; // Can pierce through this many enemies
        }

        // Apply multishot enhancement (from legacy powerup system)
        if (this.multishotTime > 0 && weaponId !== 'knife' && weaponId !== 'soul_reaper') {
            for (let i = -1; i <= 1; i += 2) {
                const spreadAngle = angle + (i * 0.3);
                this.game.bullets.push(new Bullet(
                    this.x, this.y - 10,
                    Math.cos(spreadAngle) * bulletSpeed,
                    Math.sin(spreadAngle) * bulletSpeed,
                    baseDamage * 0.8,
                    weaponId + '_multi',
                    this.game,
                    weaponLevel
                ));
            }
        }
    }
    
    getWeaponRange() {
        // Reasonable weapon range for balanced gameplay
        const baseRange = 180; // Decent starting range
        const levelBonus = this.game.level * 20; // +20 range per level
        const specialItemBonus = this.game.rangeBonus || 0; // Bonus from special items
        const maxRange = 800; // Good maximum range
        return Math.min(maxRange, baseRange + levelBonus + specialItemBonus);
    }

    findNearestZombie() {
        if (this.game.zombies.length === 0) return null;

        let nearest = null;
        let minDist = this.getWeaponRange(); // Progressive range based on level

        // First pass: find zombies in preferred range
        this.game.zombies.forEach(zombie => {
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist) {
                nearest = zombie;
                minDist = dist;
            }
        });

        // If no zombie in range, find the absolute closest one
        if (!nearest) {
            minDist = Infinity;
            this.game.zombies.forEach(zombie => {
                const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
                if (dist < minDist) {
                    nearest = zombie;
                    minDist = dist;
                }
            });
        }

        return nearest;
    }

    createMuzzleFlash(weaponType, weaponLevel = 1) {
        // Much more subtle level scaling for visual effects
        const levelMultiplier = 1 + (weaponLevel - 1) * 0.15; // Only 15% more particles per level
        const sizeMultiplier = 1 + (weaponLevel - 1) * 0.1; // Only 10% larger effects per level

        // Create weapon-specific muzzle flash effects with subtle scaling
        const effectMap = {
            'rifle': () => this.createBasicMuzzleFlash('#ffd700', Math.floor(2 * levelMultiplier), sizeMultiplier),
            'shotgun': () => this.createBasicMuzzleFlash('#ffaa00', Math.floor(3 * levelMultiplier), sizeMultiplier),
            'machinegun': () => this.createBasicMuzzleFlash('#ffcc00', Math.floor(2 * levelMultiplier), sizeMultiplier),
            'laser': () => this.createEnergyMuzzleFlash('#00ffff', Math.floor(3 * levelMultiplier), sizeMultiplier),
            'rocket': () => this.createExplosiveMuzzleFlash('#ff4444', Math.floor(4 * levelMultiplier), sizeMultiplier),
            'flamethrower': () => this.createFlameMuzzleFlash('#ff6600', Math.floor(5 * levelMultiplier), sizeMultiplier),
            'plasma': () => this.createEnergyMuzzleFlash('#9b59b6', Math.floor(4 * levelMultiplier), sizeMultiplier),
            'railgun': () => this.createEnergyMuzzleFlash('#34495e', Math.floor(5 * levelMultiplier), sizeMultiplier),
            'pistol': () => this.createBasicMuzzleFlash('#ffd700', Math.floor(1 * levelMultiplier), sizeMultiplier),
            'dual_pistols': () => this.createBasicMuzzleFlash('#ffdd00', Math.floor(2 * levelMultiplier), sizeMultiplier),
            'grenade': () => this.createExplosiveMuzzleFlash('#ff6600', Math.floor(3 * levelMultiplier), sizeMultiplier),

            // Evolved weapons - still subtle but slightly more visible
            'plasma_rifle': () => this.createEnergyMuzzleFlash('#e74c3c', Math.floor(5 * levelMultiplier), sizeMultiplier),
            'dragon_breath': () => this.createFlameMuzzleFlash('#e17055', Math.floor(6 * levelMultiplier), sizeMultiplier),
            'gatling_laser': () => this.createEnergyMuzzleFlash('#3498db', Math.floor(5 * levelMultiplier), sizeMultiplier),
            'death_ray': () => this.createEnergyMuzzleFlash('#2c3e50', Math.floor(6 * levelMultiplier), sizeMultiplier),
            'missile_barrage': () => this.createExplosiveMuzzleFlash('#e67e22', Math.floor(5 * levelMultiplier), sizeMultiplier),
            'soul_reaper': () => this.createEnergyMuzzleFlash('#8e44ad', Math.floor(6 * levelMultiplier), sizeMultiplier),
            'holy_bomb': () => this.createExplosiveMuzzleFlash('#f39c12', Math.floor(7 * levelMultiplier), sizeMultiplier),
            'phieraggi': () => this.createEnergyMuzzleFlash('#ff00ff', Math.floor(8 * levelMultiplier), sizeMultiplier)
        };

        if (effectMap[weaponType]) {
            effectMap[weaponType]();
        } else {
            this.createBasicMuzzleFlash('#ffd700', Math.floor(3 * levelMultiplier), sizeMultiplier);
        }
    }

    createBasicMuzzleFlash(color, count, sizeMultiplier = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (Math.random() * 8 + 3) * sizeMultiplier;
            const size = sizeMultiplier > 2 ? 'large' : sizeMultiplier > 1.5 ? 'medium' : 'small';
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                color,
                size,
                'sparks'
            ));
        }
    }

    createEnergyMuzzleFlash(color, count, sizeMultiplier = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (Math.random() * 12 + 5) * sizeMultiplier;
            const size = sizeMultiplier > 2 ? 'large' : 'medium';
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                color,
                size,
                'electric'
            ));
        }
    }

    createExplosiveMuzzleFlash(color, count, sizeMultiplier = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (Math.random() * 10 + 4) * sizeMultiplier;
            const size = sizeMultiplier > 2 ? 'large' : 'medium';
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                i % 2 === 0 ? color : '#ff8800',
                size,
                'explosion'
            ));
        }
    }

    createFlameMuzzleFlash(color, count, sizeMultiplier = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (Math.random() * 15 + 5) * sizeMultiplier;
            const size = 'large';
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                i % 3 === 0 ? color : (i % 3 === 1 ? '#ff4400' : '#ffaa00'),
                size,
                'fire'
            ));
        }
    }


    // PHASE 3.1: startDash method
    startDash() {
        // Calculate dash direction from current input
        let dx = 0;
        let dy = 0;

        if (this.game.keys['a'] || this.game.keys['arrowleft']) dx -= 1;
        if (this.game.keys['d'] || this.game.keys['arrowright']) dx += 1;
        if (this.game.keys['w'] || this.game.keys['arrowup']) dy -= 1;
        if (this.game.keys['s'] || this.game.keys['arrowdown']) dy += 1;

        // If no direction, dash in facing direction (default down)
        if (dx === 0 && dy === 0) {
            dy = 1;
        }

        this.dashAngle = Math.atan2(dy, dx);
        this.isDashing = true;
        this.dashDuration = this.dashMaxDuration;
        this.dashCooldown = this.dashMaxCooldown;
        this.iframes = this.dashMaxDuration; // Invincible during entire dash

        // Visual feedback
        this.game.audioSystem.playSound('dash'); // Will fail gracefully if sound doesn't exist
    }

    takeDamage(damage) {
        // PHASE 3.1: Invincibility from dash roll
        if (this.iframes > 0) return;

        // Invincibility prevents all damage
        if (this.invincibilityTime > 0) return;

        // Shield reduces damage by 75%
        if (this.shieldTime > 0) {
            damage *= 0.25;
        }

        this.health = Math.max(0, this.health - damage);
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    render(ctx) {
        // PHASE 3.1: Dash visual effect
        if (this.isDashing) {
            // Draw afterimage/trail
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 20, this.width/2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // PHASE 3.1: Flash white during invincibility frames
        if (this.iframes > 0) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x - this.width/2 - 2, this.y - this.height/2 - 2, this.width + 4, this.height + 4);
            ctx.restore();
        }

        // Draw player body (soldier)
        ctx.fillStyle = '#2d5a3d';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Draw player armor details
        ctx.fillStyle = '#3d6a4d';
        ctx.fillRect(this.x - this.width/2 + 3, this.y - this.height/2 + 5, this.width - 6, 8);
        ctx.fillRect(this.x - this.width/2 + 3, this.y - this.height/2 + 15, this.width - 6, 8);
        
        // Draw player head
        ctx.fillStyle = '#fdbcb4';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 - 8, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw helmet
        ctx.fillStyle = '#4a5d23';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 - 8, 12, Math.PI, 2 * Math.PI);
        ctx.fill();
        
        // Draw weapon
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y - 5);
        ctx.lineTo(this.x + this.width/2 + 20, this.y - 5);
        ctx.stroke();
        
        // Draw weapon barrel
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2 + 20, this.y - 5);
        ctx.lineTo(this.x + this.width/2 + 30, this.y - 5);
        ctx.stroke();
        
        // Draw health bar
        const barWidth = 40;
        const barHeight = 6;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 25, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.3 ? '#00ff00' : '#ff8800';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 25, barWidth * healthPercent, barHeight);
        
        // Draw special ability effects
        if (this.multishotTime > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.shieldTime > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.invincibilityTime > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.speedBoostTime > 0) {
            // Speed trails
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = `rgba(0, 255, 0, ${0.3 - i * 0.1})`;
                ctx.fillRect(this.x - this.width/2 - i * 5, this.y - this.height/2, this.width, this.height);
            }
        }
        
        // Draw current weapon indicator
        if (this.currentWeapon !== 'basic') {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.currentWeapon.toUpperCase(), this.x, this.y + this.height/2 + 15);
        }
    }
}

class Soldier {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.health = 80;
        this.maxHealth = 80;
        this.damage = 20;
        this.baseRange = 150; // Start with shorter range
        this.fireRate = 600;
        this.lastShot = 0;
        this.target = null;
        this.width = 18;
        this.height = 25;
    }
    
    update(deltaTime) {
        this.lastShot += deltaTime;
        
        // Find nearest zombie
        this.target = this.findNearestZombie();
        
        // Shoot at target
        if (this.target && this.lastShot >= this.fireRate) {
            this.shoot();
            this.lastShot = 0;
        }
    }
    
    getCurrentRange() {
        // Progressive range for soldiers based on player level
        const levelBonus = this.game.level * 20; // +20 range per level
        const specialItemBonus = (this.game.rangeBonus || 0) * 0.8; // 80% of player's range bonus
        const maxRange = 800; // Increased cap for soldiers
        return Math.min(maxRange, this.baseRange + levelBonus + specialItemBonus);
    }

    findNearestZombie() {
        let nearest = null;
        let minDist = this.getCurrentRange();
        
        this.game.zombies.forEach(zombie => {
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist) {
                nearest = zombie;
                minDist = dist;
            }
        });
        
        return nearest;
    }
    
    shoot() {
        if (!this.target) return;
        
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const bulletSpeed = 450;
        const damage = this.damage * this.game.damageMultiplier;
        
        this.game.bullets.push(new Bullet(
            this.x, this.y - 5,
            Math.cos(angle) * bulletSpeed,
            Math.sin(angle) * bulletSpeed,
            damage,
            'soldier',
            this.game,
            1
        ));
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    render(ctx) {
        // Draw soldier body
        ctx.fillStyle = '#4a5d23';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Draw soldier head
        ctx.fillStyle = '#fdbcb4';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 - 6, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw helmet
        ctx.fillStyle = '#3a4d1a';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 - 6, 8, Math.PI, 2 * Math.PI);
        ctx.fill();
        
        // Draw weapon
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y - 3);
        ctx.lineTo(this.x + this.width/2 + 15, this.y - 3);
        ctx.stroke();
        
        // Draw health bar
        const barWidth = 20;
        const barHeight = 3;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 18, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 18, barWidth * healthPercent, barHeight);
    }
}

class Zombie {
    constructor(x, y, type, game) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.game = game;
        this.speed = this.getSpeed();
        this.health = this.getHealth();
        this.maxHealth = this.health;
        this.damage = this.getDamage();
        this.scoreValue = this.getScoreValue();
        this.moneyValue = this.getMoneyValue();
        this.experienceValue = this.getExperienceValue();
        this.color = this.getColor();
        this.width = this.getWidth();
        this.height = this.getHeight();

        // Special ability timers and states
        this.lastSpecialAbility = 0;
        this.isPhased = false;
        this.phaseTime = 0;
        this.isInvisible = false;
        this.invisibilityTime = 0;
        this.shieldHealth = this.type === 'shielder' ? this.health * 0.5 : 0;
        this.healCooldown = 0;
        this.summonCooldown = 0;
        this.jumpCooldown = 0;
        this.spitCooldown = 0;
        this.chargeTarget = null;
        this.chargeCooldown = 0;

        // Boss-specific mechanics
        this.phase = 1;
        this.maxPhases = this.getBossPhases();
        this.bossAbilityCooldown = 0;
        this.enrageThreshold = 0.3; // 30% health triggers enrage
        this.isEnraged = false;
    }
    
    getSpeed() {
        switch (this.type) {
            // Original types - balanced speeds
            case 'fast': return 100; // Fast but manageable
            case 'tank': return 30; // Slow heavy unit
            case 'boss': return 45; // Moderate boss speed
            case 'mega_boss': return 25;

            // New 10 Monster Types - varied speeds
            case 'crawler': return 110; // Fast swarm unit
            case 'brute': return 20; // Very slow but powerful
            case 'spitter': return 50; // Medium ranged speed
            case 'jumper': return 70; // Mobile teleporter
            case 'shielder': return 40; // Slow protected unit
            case 'exploder': return 85; // Fast bomber
            case 'healer': return 35; // Slow support
            case 'summoner': return 30; // Slow spawner
            case 'phase_walker': return 65; // Elite mobility
            case 'stalker': return 60; // Moderate stealth

            // 10 Boss Types
            case 'horde_king': return 20; // Wave 5 boss
            case 'iron_colossus': return 10; // Wave 10 boss
            case 'plague_mother': return 25; // Wave 15 boss
            case 'shadow_reaper': return 60; // Wave 20 boss
            case 'flame_berserker': return 45; // Wave 25 boss
            case 'crystal_guardian': return 15; // Wave 30 boss
            case 'void_spawner': return 30; // Wave 35 boss
            case 'thunder_titan': return 20; // Wave 40 boss
            case 'ice_queen': return 35; // Wave 45 boss
            case 'final_nightmare': return 25; // Wave 50 boss

            default: return 75; // Reasonable basic zombie speed
        }
    }
    
    getHealth() {
        const baseHealth = 50 + this.game.wave * 12; // Reasonable base health and scaling
        switch (this.type) {
            // Original types - balanced
            case 'fast': return Math.floor(baseHealth * 0.7); // Glass cannon
            case 'tank': return Math.floor(baseHealth * 2.5); // Tanky but reasonable
            case 'boss': return Math.floor(baseHealth * 15); // Challenging bosses
            case 'mega_boss': return Math.floor(baseHealth * 25);

            // New 10 Monster Types - balanced variety
            case 'crawler': return Math.floor(baseHealth * 0.5); // Fragile swarm
            case 'brute': return Math.floor(baseHealth * 3.0); // Heavy but manageable
            case 'spitter': return Math.floor(baseHealth * 0.9); // Moderate ranged
            case 'jumper': return Math.floor(baseHealth * 1.2); // Mobile threat
            case 'shielder': return Math.floor(baseHealth * 2.0); // Protected tank
            case 'exploder': return Math.floor(baseHealth * 0.4); // Fragile bomber
            case 'healer': return Math.floor(baseHealth * 1.3); // Support unit
            case 'summoner': return Math.floor(baseHealth * 1.8); // Spawner threat
            case 'phase_walker': return Math.floor(baseHealth * 1.6); // Elite enemy
            case 'stalker': return Math.floor(baseHealth * 1.1); // Stealthy assassin

            // 10 Boss Types - EPIC TANK HEALTH (10x stronger than before!)
            case 'horde_king': return Math.floor(baseHealth * 200); // Wave 5 boss (was 20x, now 200x)
            case 'iron_colossus': return Math.floor(baseHealth * 300); // Wave 10 boss (was 30x, now 300x)
            case 'plague_mother': return Math.floor(baseHealth * 450); // Wave 15 boss (was 45x, now 450x)
            case 'shadow_reaper': return Math.floor(baseHealth * 600); // Wave 20 boss (was 60x, now 600x)
            case 'flame_berserker': return Math.floor(baseHealth * 800); // Wave 25 boss (was 80x, now 800x)
            case 'crystal_guardian': return Math.floor(baseHealth * 1000); // Wave 30 boss (was 100x, now 1000x)
            case 'void_spawner': return Math.floor(baseHealth * 1250); // Wave 35 boss (was 125x, now 1250x)
            case 'thunder_titan': return Math.floor(baseHealth * 1500); // Wave 40 boss (was 150x, now 1500x)
            case 'ice_queen': return Math.floor(baseHealth * 2000); // Wave 45 boss (was 200x, now 2000x)
            case 'final_nightmare': return Math.floor(baseHealth * 3000); // Wave 50 final boss (was 300x, now 3000x)

            default: return baseHealth;
        }
    }
    
    getDamage() {
        switch (this.type) {
            // Original types - balanced damage
            case 'fast': return 25; // Quick but light damage
            case 'tank': return 40; // Heavy but slow damage
            case 'boss': return 60; // Strong boss damage
            case 'mega_boss': return 100;

            // New 10 Monster Types - balanced damage variety
            case 'crawler': return 15; // Light swarm damage
            case 'brute': return 50; // Heavy slow attacker
            case 'spitter': return 30; // Ranged threat
            case 'jumper': return 35; // Ambush damage
            case 'shielder': return 35; // Protected damage
            case 'exploder': return 80; // Significant explosion
            case 'healer': return 20; // Light support damage
            case 'summoner': return 25; // Spawner threat
            case 'phase_walker': return 45; // Elite damage
            case 'stalker': return 40; // Stealth attack

            // 10 Boss Types - Challenging but fair damage
            case 'horde_king': return 80; // Wave 5 boss
            case 'iron_colossus': return 100; // Wave 10 boss
            case 'plague_mother': return 90; // Wave 15 boss (poison focus)
            case 'shadow_reaper': return 120; // Wave 20 boss
            case 'flame_berserker': return 140; // Wave 25 boss
            case 'crystal_guardian': return 110; // Wave 30 boss (shield focus)
            case 'void_spawner': return 130; // Wave 35 boss
            case 'thunder_titan': return 150; // Wave 40 boss
            case 'ice_queen': return 170; // Wave 45 boss
            case 'final_nightmare': return 250; // Wave 50 final boss

            default: return 20; // Reasonable base damage
        }
    }
    
    getScoreValue() {
        switch (this.type) {
            // Original types
            case 'fast': return 20;
            case 'tank': return 80;
            case 'boss': return 200;
            case 'mega_boss': return 500;

            // New 10 Monster Types
            case 'crawler': return 10; // Low value swarm
            case 'brute': return 100; // High value tank
            case 'spitter': return 35; // Medium value ranged
            case 'jumper': return 45; // Teleporter value
            case 'shielder': return 75; // Protected unit value
            case 'exploder': return 60; // Dangerous bomber value
            case 'healer': return 90; // High priority target
            case 'summoner': return 120; // Very high priority
            case 'phase_walker': return 85; // Phasing unit value
            case 'stalker': return 70; // Stealth unit value

            // 10 Boss Types - High score values
            case 'horde_king': return 800; // Wave 5 boss
            case 'iron_colossus': return 1200; // Wave 10 boss
            case 'plague_mother': return 1600; // Wave 15 boss
            case 'shadow_reaper': return 2000; // Wave 20 boss
            case 'flame_berserker': return 2500; // Wave 25 boss
            case 'crystal_guardian': return 3000; // Wave 30 boss
            case 'void_spawner': return 3500; // Wave 35 boss
            case 'thunder_titan': return 4000; // Wave 40 boss
            case 'ice_queen': return 4500; // Wave 45 boss
            case 'final_nightmare': return 5000; // Wave 50 final boss

            default: return 15;
        }
    }
    
    getMoneyValue() {
        switch (this.type) {
            // Original types
            case 'fast': return 12;
            case 'tank': return 35;
            case 'boss': return 100;
            case 'mega_boss': return 250;

            // New 10 Monster Types
            case 'crawler': return 5; // Low money swarm
            case 'brute': return 50; // High money tank
            case 'spitter': return 18; // Medium money ranged
            case 'jumper': return 22; // Teleporter money
            case 'shielder': return 40; // Protected unit money
            case 'exploder': return 30; // Bomber money
            case 'healer': return 45; // Support money
            case 'summoner': return 60; // Spawner money
            case 'phase_walker': return 42; // Phasing money
            case 'stalker': return 35; // Stealth money

            // 10 Boss Types - High money rewards
            case 'horde_king': return 400; // Wave 5 boss
            case 'iron_colossus': return 600; // Wave 10 boss
            case 'plague_mother': return 800; // Wave 15 boss
            case 'shadow_reaper': return 1000; // Wave 20 boss
            case 'flame_berserker': return 1250; // Wave 25 boss
            case 'crystal_guardian': return 1500; // Wave 30 boss
            case 'void_spawner': return 1750; // Wave 35 boss
            case 'thunder_titan': return 2000; // Wave 40 boss
            case 'ice_queen': return 2250; // Wave 45 boss
            case 'final_nightmare': return 2500; // Wave 50 final boss

            default: return 8;
        }
    }

    getExperienceValue() {
        switch (this.type) {
            // Original types - Reduced for balanced progression
            case 'fast': return 8;
            case 'tank': return 18;
            case 'boss': return 45;
            case 'mega_boss': return 85;

            // New 10 Monster Types - Reduced for proper challenge
            case 'crawler': return 4; // Low exp swarm
            case 'brute': return 22; // High exp tank
            case 'spitter': return 12; // Medium exp ranged
            case 'jumper': return 14; // Teleporter exp
            case 'shielder': return 20; // Protected unit exp
            case 'exploder': return 16; // Bomber exp
            case 'healer': return 25; // Support exp
            case 'summoner': return 30; // Spawner exp
            case 'phase_walker': return 24; // Phasing exp
            case 'stalker': return 20; // Stealth exp

            // 10 Boss Types - Balanced experience rewards
            case 'horde_king': return 120; // Wave 5 boss
            case 'iron_colossus': return 180; // Wave 10 boss
            case 'plague_mother': return 240; // Wave 15 boss
            case 'shadow_reaper': return 300; // Wave 20 boss
            case 'flame_berserker': return 375; // Wave 25 boss
            case 'crystal_guardian': return 450; // Wave 30 boss
            case 'void_spawner': return 525; // Wave 35 boss
            case 'thunder_titan': return 600; // Wave 40 boss
            case 'ice_queen': return 675; // Wave 45 boss
            case 'final_nightmare': return 750; // Wave 50 final boss

            default: return 6; // Basic zombie exp - reduced for balance
        }
    }
    
    getColor() {
        switch (this.type) {
            // Original types
            case 'fast': return '#ff6b6b';
            case 'tank': return '#4a4a4a';
            case 'boss': return '#8e44ad';
            case 'mega_boss': return '#e74c3c';

            // New 10 Monster Types with distinct colors
            case 'crawler': return '#ff9f43'; // Orange swarm
            case 'brute': return '#2d3436'; // Dark gray tank
            case 'spitter': return '#00b894'; // Green ranged
            case 'jumper': return '#a29bfe'; // Purple teleporter
            case 'shielder': return '#74b9ff'; // Blue protected
            case 'exploder': return '#fd79a8'; // Pink bomber
            case 'healer': return '#55a3ff'; // Light blue support
            case 'summoner': return '#6c5ce7'; // Purple spawner
            case 'phase_walker': return '#fd79a8'; // Pink phaser
            case 'stalker': return '#636e72'; // Gray stealth

            // 10 Boss Types with menacing colors
            case 'horde_king': return '#e17055'; // Red-brown horde
            case 'iron_colossus': return '#2d3436'; // Dark iron
            case 'plague_mother': return '#00b894'; // Sickly green
            case 'shadow_reaper': return '#2d3436'; // Shadow black
            case 'flame_berserker': return '#e17055'; // Flame red
            case 'crystal_guardian': return '#74b9ff'; // Crystal blue
            case 'void_spawner': return '#636e72'; // Void gray
            case 'thunder_titan': return '#fdcb6e'; // Lightning yellow
            case 'ice_queen': return '#81ecec'; // Ice cyan
            case 'final_nightmare': return '#2d3436'; // Nightmare black

            default: return '#6c5ce7';
        }
    }
    
    getWidth() {
        switch (this.type) {
            // Original types
            case 'tank': return 30;
            case 'boss': return 40;
            case 'mega_boss': return 60;

            // New 10 Monster Types with varied sizes
            case 'crawler': return 12; // Small swarm unit
            case 'brute': return 35; // Large tank
            case 'spitter': return 18; // Medium ranged
            case 'jumper': return 16; // Agile size
            case 'shielder': return 28; // Protected size
            case 'exploder': return 14; // Small bomber
            case 'healer': return 22; // Medium support
            case 'summoner': return 25; // Spawner size
            case 'phase_walker': return 20; // Standard phaser
            case 'stalker': return 18; // Stealth size

            // 10 Boss Types with imposing sizes
            case 'horde_king': return 50; // Wave 5 boss
            case 'iron_colossus': return 80; // Wave 10 boss - massive
            case 'plague_mother': return 55; // Wave 15 boss
            case 'shadow_reaper': return 45; // Wave 20 boss - agile
            case 'flame_berserker': return 60; // Wave 25 boss
            case 'crystal_guardian': return 70; // Wave 30 boss
            case 'void_spawner': return 65; // Wave 35 boss
            case 'thunder_titan': return 90; // Wave 40 boss - huge
            case 'ice_queen': return 75; // Wave 45 boss
            case 'final_nightmare': return 100; // Wave 50 - ultimate size

            default: return 20;
        }
    }

    getHeight() {
        switch (this.type) {
            // Original types
            case 'tank': return 35;
            case 'boss': return 45;
            case 'mega_boss': return 70;

            // New 10 Monster Types with varied heights
            case 'crawler': return 10; // Small swarm unit
            case 'brute': return 40; // Large tank
            case 'spitter': return 20; // Medium ranged
            case 'jumper': return 18; // Agile height
            case 'shielder': return 32; // Protected height
            case 'exploder': return 12; // Small bomber
            case 'healer': return 24; // Medium support
            case 'summoner': return 28; // Spawner height
            case 'phase_walker': return 22; // Standard phaser
            case 'stalker': return 20; // Stealth height

            // 10 Boss Types with imposing heights
            case 'horde_king': return 55; // Wave 5 boss
            case 'iron_colossus': return 95; // Wave 10 boss - massive
            case 'plague_mother': return 60; // Wave 15 boss
            case 'shadow_reaper': return 50; // Wave 20 boss - agile
            case 'flame_berserker': return 65; // Wave 25 boss
            case 'crystal_guardian': return 80; // Wave 30 boss
            case 'void_spawner': return 70; // Wave 35 boss
            case 'thunder_titan': return 105; // Wave 40 boss - huge
            case 'ice_queen': return 85; // Wave 45 boss
            case 'final_nightmare': return 120; // Wave 50 - ultimate height

            default: return 25;
        }
    }

    getBossPhases() {
        switch (this.type) {
            case 'horde_king': return 2;
            case 'iron_colossus': return 3;
            case 'plague_mother': return 2;
            case 'shadow_reaper': return 3;
            case 'flame_berserker': return 4;
            case 'crystal_guardian': return 3;
            case 'void_spawner': return 2;
            case 'thunder_titan': return 3;
            case 'ice_queen': return 3;
            case 'final_nightmare': return 5;
            default: return 1;
        }
    }

    isBoss() {
        return ['horde_king', 'iron_colossus', 'plague_mother', 'shadow_reaper',
                'flame_berserker', 'crystal_guardian', 'void_spawner', 'thunder_titan',
                'ice_queen', 'final_nightmare', 'boss', 'mega_boss'].includes(this.type);
    }

    update(deltaTime) {
        // Handle status effects
        if (this.poisoned && this.poisonTime > 0) {
            this.poisonTime -= deltaTime;
            if (this.poisonTime <= 0) {
                this.poisoned = false;
            } else {
                this.takeDamage(this.poisonDamage * deltaTime / 1000);
            }
        }

        // Handle burn damage from fire weapons
        if (this.burnTime > 0) {
            this.burnTime -= deltaTime;
            if (this.burnTime <= 0) {
                this.burnDamage = 0;
            } else {
                this.takeDamage(this.burnDamage * deltaTime / 1000);
                // Create fire particles occasionally
                if (Math.random() < 0.3) {
                    this.game.particles.push(new Particle(
                        this.x + (Math.random() - 0.5) * 20,
                        this.y + (Math.random() - 0.5) * 20,
                        '#ff6600',
                        'small'
                    ));
                }
            }
        }

        // Handle special abilities based on enemy type
        this.handleSpecialAbilities(deltaTime);

        // Check for boss phase transitions
        if (this.isBoss()) {
            this.handleBossPhases(deltaTime);
        }

        // Don't move if frozen or stunned
        if (this.frozen || this.stunned) return;
        
        // Move directly towards player position
        const player = this.game.player;
        const speedMultiplier = this.game.player?.timeSlowTime > 0 ? 0.5 : 1;

        if (player) {
            // Calculate direct path to player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) { // Don't move if very close to prevent jittering
                // Normalize direction and move directly towards player
                const moveX = (dx / distance) * this.speed * speedMultiplier * deltaTime / 1000;
                const moveY = (dy / distance) * this.speed * speedMultiplier * deltaTime / 1000;

                this.x += moveX;
                this.y += moveY;
            }
        } else {
            // Fallback: move downward if no player
            this.y += this.speed * speedMultiplier * deltaTime / 1000;
        }
        
        // Remove if off screen bottom - increased boundary for zoom-out
        if (this.y > this.game.getCanvasHeight() + 300) {
            this.health = 0;
        }
    }
    
    takeDamage(damage) {
        // Double damage if vulnerable
        const isCrit = this.vulnerable;
        if (isCrit) {
            damage *= 2;
        }
        this.health -= damage;

        // PHASE 4.2: Show damage number
        this.game.showDamageNumber(this.x, this.y - this.height/2, damage, isCrit);

        // Update boss health bar if this is the current boss
        if (this.game.currentBoss === this) {
            this.game.updateBossHealthBar();
        }
    }
    
    render(ctx) {
        // Draw zombie shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.height/2 + 5, this.width/2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw zombie body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Draw zombie details based on type
        if (this.type === 'tank') {
            // Armor plating
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(this.x - this.width/2 + 2, this.y - this.height/2 + 5, this.width - 4, 8);
            ctx.fillRect(this.x - this.width/2 + 2, this.y - this.height/2 + 15, this.width - 4, 8);
        } else if (this.type === 'boss') {
            // Boss markings
            ctx.fillStyle = '#e17055';
            ctx.fillRect(this.x - this.width/2 + 3, this.y - this.height/2 + 5, this.width - 6, 6);
            ctx.fillRect(this.x - this.width/2 + 3, this.y - this.height/2 + 15, this.width - 6, 6);
            ctx.fillRect(this.x - this.width/2 + 3, this.y - this.height/2 + 25, this.width - 6, 6);
        }
        
        // Draw zombie head
        const headSize = this.type === 'boss' ? 12 : this.type === 'tank' ? 10 : 8;
        ctx.fillStyle = '#a29bfe';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 - headSize/2, headSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw glowing eyes
        ctx.fillStyle = '#ff3838';
        ctx.beginPath();
        ctx.arc(this.x - headSize/3, this.y - this.height/2 - headSize/2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + headSize/3, this.y - this.height/2 - headSize/2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        const barWidth = this.width + 5;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - headSize - 8, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff4444';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - headSize - 8, barWidth * healthPercent, barHeight);
    }

    handleSpecialAbilities(deltaTime) {
        const player = this.game.player;
        if (!player) return;

        switch (this.type) {
            case 'crawler':
                // Swarm behavior - speeds up when near other crawlers
                const nearCrawlers = this.game.zombies.filter(z =>
                    z.type === 'crawler' && z !== this &&
                    Math.sqrt((z.x - this.x) ** 2 + (z.y - this.y) ** 2) < 50
                ).length;
                this.speed = this.getSpeed() + (nearCrawlers * 20);
                break;

            case 'brute':
                // Charge attack when close to player
                this.chargeCooldown -= deltaTime;
                const distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (distToPlayer < 150 && this.chargeCooldown <= 0) {
                    this.chargeTarget = { x: player.x, y: player.y };
                    this.chargeCooldown = 5000; // 5 second cooldown
                    this.speed = this.getSpeed() * 3; // Triple speed during charge
                }
                break;

            case 'spitter':
                // Ranged spit attack
                this.spitCooldown -= deltaTime;
                if (this.spitCooldown <= 0 && Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2) < 200) {
                    this.spitAttack(player);
                    this.spitCooldown = 3000; // 3 second cooldown
                }
                break;

            case 'jumper':
                // Teleport to player occasionally
                this.jumpCooldown -= deltaTime;
                if (this.jumpCooldown <= 0 && Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2) > 100) {
                    this.teleportToPlayer(player);
                    this.jumpCooldown = 8000; // 8 second cooldown
                }
                break;

            case 'shielder':
                // Shield mechanics - regenerate shield over time
                if (this.shieldHealth < this.maxHealth * 0.5) {
                    this.shieldHealth += deltaTime * 0.01; // Slow regeneration
                }
                break;

            case 'exploder':
                // Explode when close to player or on death
                if (Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2) < 30 || this.health <= 0) {
                    this.explode();
                }
                break;

            case 'healer':
                // Heal nearby enemies
                this.healCooldown -= deltaTime;
                if (this.healCooldown <= 0) {
                    this.healNearbyEnemies();
                    this.healCooldown = 4000; // 4 second cooldown
                }
                break;

            case 'summoner':
                // Spawn minions
                this.summonCooldown -= deltaTime;
                if (this.summonCooldown <= 0) {
                    this.summonMinions();
                    this.summonCooldown = 10000; // 10 second cooldown
                }
                break;

            case 'phase_walker':
                // Phase in and out of reality
                this.phaseTime -= deltaTime;
                if (this.phaseTime <= 0) {
                    this.isPhased = !this.isPhased;
                    this.phaseTime = this.isPhased ? 2000 : 3000; // 2s phased, 3s normal
                }
                break;

            case 'stalker':
                // Stealth mechanics
                this.invisibilityTime -= deltaTime;
                if (this.invisibilityTime <= 0) {
                    this.isInvisible = !this.isInvisible;
                    this.invisibilityTime = this.isInvisible ? 3000 : 4000; // 3s invisible, 4s visible
                }
                break;
        }
    }

    handleBossPhases(deltaTime) {
        // Check for phase transitions based on health
        const healthPercent = this.health / this.maxHealth;
        const phaseThreshold = 1 / this.maxPhases;
        const currentPhase = Math.ceil(healthPercent / phaseThreshold);

        if (currentPhase !== this.phase && currentPhase >= 1) {
            this.phase = currentPhase;
            this.onPhaseChange();
        }

        // Handle enrage when health is low
        if (healthPercent <= this.enrageThreshold && !this.isEnraged) {
            this.isEnraged = true;
            this.speed *= 1.5;
            this.damage *= 1.3;
        }

        // Boss-specific abilities
        this.bossAbilityCooldown -= deltaTime;
        if (this.bossAbilityCooldown <= 0) {
            this.useBossAbility();
            this.bossAbilityCooldown = 5000 - (this.phase * 500); // Faster abilities in later phases
        }
    }

    // Special ability implementations
    spitAttack(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        // Create a projectile (similar to bullet but enemy-owned)
        this.game.enemyProjectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 200,
            vy: Math.sin(angle) * 200,
            damage: this.damage * 0.7,
            type: 'spit',
            active: true
        });
    }

    teleportToPlayer(player) {
        // Teleport near player with some randomness
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        this.x = player.x + Math.cos(angle) * distance;
        this.y = player.y + Math.sin(angle) * distance;

        // Create teleport effect
        for (let i = 0; i < 10; i++) {
            this.game.particles.push(new Particle(this.x, this.y, '#a29bfe', 'medium'));
        }
    }

    explode() {
        const explosionRadius = 80;
        const player = this.game.player;

        // Damage player if in range
        if (player) {
            const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
            if (dist <= explosionRadius) {
                const damage = this.damage * (1 - dist / explosionRadius);
                player.takeDamage(damage);
            }
        }

        // Create explosion particles
        for (let i = 0; i < 15; i++) {
            this.game.particles.push(new Particle(this.x, this.y, '#fd79a8', 'large'));
        }

        this.health = 0; // Kill self after explosion
    }

    healNearbyEnemies() {
        const healRange = 100;
        const healAmount = this.damage * 0.5;

        this.game.zombies.forEach(zombie => {
            if (zombie !== this && zombie.health > 0) {
                const dist = Math.sqrt((zombie.x - this.x) ** 2 + (zombie.y - this.y) ** 2);
                if (dist <= healRange) {
                    zombie.health = Math.min(zombie.maxHealth, zombie.health + healAmount);
                    // Create heal effect
                    this.game.particles.push(new Particle(zombie.x, zombie.y, '#55a3ff', 'small'));
                }
            }
        });
    }

    summonMinions() {
        const minionCount = 2 + Math.floor(this.game.wave / 10);
        for (let i = 0; i < minionCount; i++) {
            const angle = (Math.PI * 2 * i) / minionCount;
            const distance = 50;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            this.game.zombies.push(new Zombie(x, y, 'crawler', this.game));
        }
    }

    onPhaseChange() {
        // Create phase change effect
        for (let i = 0; i < 20; i++) {
            this.game.particles.push(new Particle(this.x, this.y, this.color, 'large'));
        }
    }

    useBossAbility() {
        const player = this.game.player;
        if (!player) return;

        switch (this.type) {
            case 'horde_king':
                // Summon horde
                this.summonMinions();
                break;

            case 'iron_colossus':
                // Ground slam
                this.groundSlam();
                break;

            case 'plague_mother':
                // Poison cloud
                this.createPoisonCloud();
                break;

            case 'shadow_reaper':
                // Shadow dash
                this.shadowDash(player);
                break;

            case 'flame_berserker':
                // Fire nova
                this.fireNova();
                break;

            case 'crystal_guardian':
                // Crystal barrier
                this.crystalBarrier();
                break;

            case 'void_spawner':
                // Portal spawn
                this.portalSpawn();
                break;

            case 'thunder_titan':
                // Lightning storm
                this.lightningStorm();
                break;

            case 'ice_queen':
                // Frost wave
                this.frostWave();
                break;

            case 'final_nightmare':
                // All abilities based on phase
                if (this.phase <= 2) this.summonMinions();
                if (this.phase <= 3) this.fireNova();
                if (this.phase <= 4) this.lightningStorm();
                if (this.phase === 5) this.apocalypse();
                break;
        }
    }

    groundSlam() {
        // Create shockwave that damages player if close
        const shockwaveRadius = 150;
        const player = this.game.player;
        if (player) {
            const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
            if (dist <= shockwaveRadius) {
                player.takeDamage(this.damage * 1.5);
            }
        }
        // Visual effect
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * shockwaveRadius * 0.5,
                this.y + Math.sin(angle) * shockwaveRadius * 0.5,
                '#2d3436', 'medium'
            ));
        }
    }

    createPoisonCloud() {
        // Create poison area effect
        this.game.hazards.push({
            x: this.x,
            y: this.y,
            radius: 120,
            damage: this.damage * 0.3,
            duration: 8000,
            type: 'poison'
        });
    }

    shadowDash(target) {
        // Dash towards player
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.x += Math.cos(angle) * 200;
        this.y += Math.sin(angle) * 200;
        // Create shadow trail
        for (let i = 0; i < 10; i++) {
            this.game.particles.push(new Particle(this.x, this.y, '#2d3436', 'medium'));
        }
    }

    fireNova() {
        // Fire explosion around boss
        const novaRadius = 200;
        const player = this.game.player;
        if (player) {
            const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
            if (dist <= novaRadius) {
                player.takeDamage(this.damage);
                player.burnDamage = this.damage * 0.2;
                player.burnTime = 3000;
            }
        }
        // Visual effect
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * novaRadius * Math.random(),
                this.y + Math.sin(angle) * novaRadius * Math.random(),
                '#e17055', 'large'
            ));
        }
    }

    crystalBarrier() {
        // Increase shield health significantly
        this.shieldHealth = this.maxHealth;
    }

    portalSpawn() {
        // Spawn enemies from portals
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 150;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            this.game.zombies.push(new Zombie(x, y, 'fast', this.game));
        }
    }

    lightningStorm() {
        // Multiple lightning strikes
        const player = this.game.player;
        if (player) {
            // Strike at player location
            player.takeDamage(this.damage * 1.2);
            // Create lightning effect
            for (let i = 0; i < 20; i++) {
                this.game.particles.push(new Particle(player.x, player.y, '#fdcb6e', 'large'));
            }
        }
    }

    frostWave() {
        // Slow all enemies and damage player
        const player = this.game.player;
        if (player) {
            player.takeDamage(this.damage * 0.8);
            player.speedBoostTime = -5000; // Slow effect
        }
        // Visual effect
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * 250,
                this.y + Math.sin(angle) * 250,
                '#81ecec', 'medium'
            ));
        }
    }

    apocalypse() {
        // Ultimate ability - multiple effects
        this.fireNova();
        this.lightningStorm();
        this.summonMinions();
        this.createPoisonCloud();
    }
}

class Bullet {
    constructor(x, y, vx, vy, damage, type = 'soldier', game = null, weaponLevel = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.type = type;
        this.active = true;
        this.trail = [];
        this.piercing = this.getPiercingValue(type);
        this.pierceCount = 0;
        this.game = game;
        this.weaponLevel = weaponLevel;
        this.levelScale = 1 + (weaponLevel - 1) * 0.4; // 40% larger per level
    }

    getPiercingValue(type) {
        switch (type) {
            case 'laser':
            case 'railgun':
                return 3;
            case 'gatling_laser':
            case 'plasma_rifle':
                return 2;
            case 'death_ray':
                return 5; // Death ray pierces through more enemies
            case 'knife':
            case 'soul_reaper':
                return 999; // Knives are persistent
            default:
                return 0;
        }
    }
    
    update(deltaTime) {
        // Add to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) {
            this.trail.shift();
        }

        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;

        // Remove if off screen - use dynamic canvas dimensions if available
        const maxWidth = this.game ? this.game.getCanvasWidth() + 50 : 850;
        const maxHeight = this.game ? this.game.getCanvasHeight() + 50 : 650;

        if (this.x < -50 || this.x > maxWidth || this.y < -50 || this.y > maxHeight) {
            this.active = false;
        }
    }
    
    render(ctx) {
        // Get weapon-specific visuals
        const visuals = this.getWeaponVisuals();

        // Draw bullet trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = visuals.trailColor;
            ctx.lineWidth = visuals.trailWidth;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // Draw weapon-specific bullet
        ctx.fillStyle = visuals.color;
        ctx.shadowColor = visuals.glowColor;
        ctx.shadowBlur = visuals.glowSize;

        if (visuals.shape === 'square') {
            ctx.fillRect(this.x - visuals.size/2, this.y - visuals.size/2, visuals.size, visuals.size);
        } else if (visuals.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - visuals.size);
            ctx.lineTo(this.x - visuals.size, this.y + visuals.size);
            ctx.lineTo(this.x + visuals.size, this.y + visuals.size);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, visuals.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
    }

    getWeaponVisuals() {
        // Apply level scaling to all visual properties
        const baseVisuals = this.getBaseWeaponVisuals();
        const scale = this.levelScale || 1;

        return {
            size: Math.floor(baseVisuals.size * scale),
            color: baseVisuals.color,
            glowColor: baseVisuals.glowColor,
            glowSize: Math.floor(baseVisuals.glowSize * scale),
            trailColor: baseVisuals.trailColor,
            trailWidth: Math.floor(baseVisuals.trailWidth * scale),
            shape: baseVisuals.shape
        };
    }

    getBaseWeaponVisuals() {
        switch (this.type) {
            case 'rocket':
            case 'missile_barrage':
                return {
                    size: 6,
                    color: '#ff4444',
                    glowColor: '#ff0000',
                    glowSize: 12,
                    trailColor: 'rgba(255, 68, 68, 0.8)',
                    trailWidth: 4,
                    shape: 'triangle'
                };

            case 'grenade':
            case 'holy_bomb':
                return {
                    size: 5,
                    color: '#8B4513',
                    glowColor: '#654321',
                    glowSize: 8,
                    trailColor: 'rgba(139, 69, 19, 0.6)',
                    trailWidth: 3,
                    shape: 'circle'
                };

            case 'laser':
            case 'gatling_laser':
            case 'plasma_rifle':
                return {
                    size: 3,
                    color: '#00ffff',
                    glowColor: '#00cccc',
                    glowSize: 15,
                    trailColor: 'rgba(0, 255, 255, 0.9)',
                    trailWidth: 2,
                    shape: 'circle'
                };

            case 'flamethrower':
            case 'dragon_breath':
                return {
                    size: 4,
                    color: '#ff6600',
                    glowColor: '#ff4400',
                    glowSize: 10,
                    trailColor: 'rgba(255, 102, 0, 0.7)',
                    trailWidth: 3,
                    shape: 'circle'
                };

            case 'knife':
            case 'soul_reaper':
                return {
                    size: 4,
                    color: '#cccccc',
                    glowColor: '#aaaaaa',
                    glowSize: 6,
                    trailColor: 'rgba(204, 204, 204, 0.5)',
                    trailWidth: 2,
                    shape: 'square'
                };

            case 'death_ray':
                return {
                    size: 5,
                    color: '#ff00ff',
                    glowColor: '#cc00cc',
                    glowSize: 20,
                    trailColor: 'rgba(255, 0, 255, 0.9)',
                    trailWidth: 3,
                    shape: 'circle'
                };

            default:
                return {
                    size: 4,
                    color: '#ffd700',
                    glowColor: '#ffcc00',
                    glowSize: 8,
                    trailColor: 'rgba(255, 215, 0, 0.6)',
                    trailWidth: 2,
                    shape: 'circle'
                };
        }
    }
}

class Powerup {
    constructor(x, y, type, rarity = 'common') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.rarity = rarity;
        this.radius = this.getRarityRadius(rarity);
        this.active = true;
        this.pulseTime = 0;
        this.lifetime = 12000; // 12 seconds (enough time to fall through screen)
        this.age = 0;
        this.rotationAngle = 0;
        this.fallSpeed = 80; // Falling speed
        this.sideSpeed = (Math.random() - 0.5) * 20; // Slight horizontal movement
        this.sparkleTimer = 0;
        this.particles = []; // For legendary particle effects
    }

    getRarityRadius(rarity) {
        switch(rarity) {
            case 'common': return 20;
            case 'rare': return 24;
            case 'epic': return 28;
            case 'legendary': return 32;
            default: return 22;
        }
    }

    getRarityColor(rarity) {
        switch(rarity) {
            case 'common': return '#ffffff'; // White
            case 'rare': return '#00bfff'; // Blue
            case 'epic': return '#8a2be2'; // Purple
            case 'legendary': return '#ffd700'; // Gold
            default: return '#ffffff';
        }
    }

    getRarityGlow(rarity) {
        switch(rarity) {
            case 'common': return 'rgba(255, 255, 255, 0.3)';
            case 'rare': return 'rgba(0, 191, 255, 0.5)';
            case 'epic': return 'rgba(138, 43, 226, 0.7)';
            case 'legendary': return 'rgba(255, 215, 0, 0.9)';
            default: return 'rgba(255, 255, 255, 0.3)';
        }
    }
    
    update(deltaTime) {
        this.pulseTime += deltaTime;
        this.age += deltaTime;
        this.rotationAngle += deltaTime * 0.003;
        this.sparkleTimer += deltaTime;

        // Make power-ups fall down
        this.y += this.fallSpeed * deltaTime / 1000;
        this.x += this.sideSpeed * deltaTime / 1000;

        // Legendary items create particle trails
        if (this.rarity === 'legendary' && this.sparkleTimer > 100) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * 40,
                y: this.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 800,
                age: 0,
                color: this.getRarityColor(this.rarity)
            });
            this.sparkleTimer = 0;
        }

        // Update particles
        this.particles.forEach(particle => {
            particle.age += deltaTime;
            particle.x += particle.vx * deltaTime / 1000;
            particle.y += particle.vy * deltaTime / 1000;
        });
        this.particles = this.particles.filter(particle => particle.age < particle.life);

        // Remove if off screen or expired
        if (this.age >= this.lifetime || this.y > 650) {
            this.active = false;
        }
    }
    
    render(ctx) {
        const pulse = Math.sin(this.pulseTime / 300) * 0.3 + 1;
        const size = this.radius * pulse;

        // Render particle effects for legendary items
        if (this.rarity === 'legendary') {
            this.particles.forEach(particle => {
                const alpha = 1 - (particle.age / particle.life);
                ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw rarity glow effect
        if (this.rarity !== 'common') {
            ctx.save();
            ctx.shadowColor = this.getRarityColor(this.rarity);
            ctx.shadowBlur = this.rarity === 'legendary' ? 20 : this.rarity === 'epic' ? 15 : 10;
            ctx.globalCompositeOperation = 'lighter';

            ctx.fillStyle = this.getRarityGlow(this.rarity);
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw rotating background
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        // Draw powerup background with gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, this.getColor());
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw rarity border
        ctx.strokeStyle = this.getRarityColor(this.rarity);
        ctx.lineWidth = this.rarity === 'legendary' ? 4 : this.rarity === 'epic' ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Draw powerup symbol
        ctx.fillStyle = this.getRarityColor(this.rarity);
        ctx.font = `bold ${this.rarity === 'legendary' ? '22px' : '18px'} Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(this.getSymbol(), this.x, this.y);
        ctx.fillText(this.getSymbol(), this.x, this.y);

        // Draw rarity indicator below powerup
        if (this.rarity !== 'common') {
            ctx.fillStyle = this.getRarityColor(this.rarity);
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            const rarityText = this.rarity.toUpperCase();
            ctx.strokeText(rarityText, this.x, this.y + size + 15);
            ctx.fillText(rarityText, this.x, this.y + size + 15);
        }
    }
    
    getColor() {
        switch (this.type) {
            // Basic
            case 'damage': return '#e74c3c';
            case 'soldiers': return '#3498db';
            case 'money': return '#f1c40f';
            case 'health': return '#2ecc71';
            case 'multishot': return '#9b59b6';
            // Multipliers
            case 'x2': return '#ff6b35';
            case 'x3': return '#ff8c42';
            case 'x5': return '#ffa726';
            case 'x10': return '#e74c3c';
            // Weapons
            case 'shotgun': return '#8b4513';
            case 'machinegun': return '#2c3e50';
            case 'laser': return '#00ffff';
            case 'rocket': return '#ff4444';
            case 'plasma': return '#9b59b6';
            case 'railgun': return '#34495e';
            case 'flamethrower': return '#ff6600';
            // Vehicles
            case 'tank_vehicle': return '#556b2f';
            case 'helicopter': return '#708090';
            case 'drone': return '#4682b4';
            case 'mech_suit': return '#800080';
            case 'artillery': return '#8b4513';
            // Special Abilities
            case 'freeze': return '#87ceeb';
            case 'shield': return '#ffd700';
            case 'speed_boost': return '#00ff00';
            case 'time_slow': return '#9370db';
            case 'invincibility': return '#ffff00';
            case 'lightning_storm': return '#00ffff';
            // Area Effects
            case 'bomb': return '#e67e22';
            case 'nuke': return '#ff0000';
            case 'poison_cloud': return '#32cd32';
            case 'emp_blast': return '#4169e1';
            // Risk/Reward
            case 'lose_soldier': return '#c0392b';
            case 'lose_health': return '#8b0000';
            case 'mystery_box': return '#daa520';
            case 'cursed_treasure': return '#800080';
            // Progression
            case 'double_xp': return '#ffa500';
            case 'coin_magnet': return '#ffd700';
            case 'bullet_rain': return '#696969';
            case 'zombie_weakness': return '#ff69b4';
            default: return '#ffffff';
        }
    }
    
    getSymbol() {
        switch (this.type) {
            // Basic
            case 'damage': return '⚡';
            case 'soldiers': return '+';
            case 'money': return '$';
            case 'health': return '♥';
            case 'multishot': return '※';
            // Multipliers
            case 'x2': return '2x';
            case 'x3': return '3x';
            case 'x5': return '5x';
            case 'x10': return '10x';
            // Weapons
            case 'shotgun': return '🔫';
            case 'machinegun': return '🔫';
            case 'laser': return '⚡';
            case 'rocket': return '🚀';
            case 'plasma': return '⚡';
            case 'railgun': return '⚡';
            case 'flamethrower': return '🔥';
            // Vehicles
            case 'tank_vehicle': return '🚗';
            case 'helicopter': return '🚁';
            case 'drone': return '✈';
            case 'mech_suit': return '🤖';
            case 'artillery': return '💥';
            // Special Abilities
            case 'freeze': return '❄';
            case 'shield': return '🛡';
            case 'speed_boost': return '💨';
            case 'time_slow': return '⏱';
            case 'invincibility': return '⭐';
            case 'lightning_storm': return '⚡';
            // Area Effects
            case 'bomb': return '💣';
            case 'nuke': return '☢';
            case 'poison_cloud': return '☁';
            case 'emp_blast': return '⚡';
            // Risk/Reward
            case 'lose_soldier': return '💀';
            case 'lose_health': return '💔';
            case 'mystery_box': return '❓';
            case 'cursed_treasure': return '💰';
            // Progression
            case 'double_xp': return '⬆';
            case 'coin_magnet': return '🧲';
            case 'bullet_rain': return '🌧';
            case 'zombie_weakness': return '🎯';
            default: return '?';
        }
    }
}

class Particle {
    constructor(x, y, color, size = 'medium', type = 'normal') {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.vx = (Math.random() - 0.5) * 300;
        this.vy = (Math.random() - 0.5) * 300 - 100;
        this.color = color;
        this.life = size === 'small' ? 500 : size === 'large' ? 1500 : 1000;
        this.age = 0;
        this.active = true;
        this.size = size === 'small' ? 2 : size === 'large' ? 6 : 4;
        this.gravity = 400;
        this.type = type;

        // Advanced visual properties
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * 0.2;
        this.hue = this.getHueFromColor(color);
        this.saturation = 100;
        this.lightness = 50;
        this.trail = [];
        this.maxTrail = type === 'energy' ? 8 : 3;

        // Special effects based on type
        this.setupEffectType(type);
    }

    setupEffectType(type) {
        switch(type) {
            case 'explosion':
                this.vx = (Math.random() - 0.5) * 600;
                this.vy = (Math.random() - 0.5) * 600;
                this.gravity = 200;
                this.life = 800;
                this.maxTrail = 5;
                break;
            case 'energy':
                this.vx = (Math.random() - 0.5) * 150;
                this.vy = (Math.random() - 0.5) * 150;
                this.gravity = 0;
                this.life = 2000;
                this.angularVelocity = (Math.random() - 0.5) * 0.3;
                break;
            case 'magic':
                this.orbitRadius = Math.random() * 30 + 10;
                this.orbitSpeed = (Math.random() - 0.5) * 0.1;
                this.floating = true;
                this.gravity = -50;
                this.life = 3000;
                break;
            case 'blood':
                this.gravity = 600;
                this.life = 1200;
                this.size *= 0.7;
                break;
            case 'fire':
                this.vy -= Math.random() * 200;
                this.gravity = -100;
                this.life = 1000;
                this.flickerIntensity = Math.random() * 0.5;
                break;
            case 'electric':
                this.life = 300;
                this.zigzag = true;
                this.zigzagIntensity = 50;
                break;
        }
    }

    getHueFromColor(color) {
        const colorMap = {
            '#ff0000': 0,   // Red
            '#ff4444': 0,   // Light Red
            '#ffff00': 60,  // Yellow
            '#00ff00': 120, // Green
            '#00ffff': 180, // Cyan
            '#0000ff': 240, // Blue
            '#ff00ff': 300, // Magenta
            '#ffffff': 0,   // White
            '#FFD700': 50   // Gold
        };
        return colorMap[color] || Math.random() * 360;
    }

    update(deltaTime) {
        // Store previous position for trail
        this.trail.push({x: this.x, y: this.y, alpha: 1});
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }

        // Update trail alpha
        this.trail.forEach((point, index) => {
            point.alpha = index / this.trail.length;
        });

        // Special movement based on type
        if (this.type === 'magic' && this.floating) {
            this.angle += this.orbitSpeed * deltaTime / 16.67;
            this.x = this.startX + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.startY + Math.sin(this.angle) * this.orbitRadius * 0.5;
            this.y += this.vy * deltaTime / 1000;
            this.vy += this.gravity * deltaTime / 1000;
        } else if (this.type === 'electric' && this.zigzag) {
            this.x += this.vx * deltaTime / 1000 + Math.sin(this.age * 0.01) * this.zigzagIntensity;
            this.y += this.vy * deltaTime / 1000 + Math.cos(this.age * 0.015) * this.zigzagIntensity;
        } else {
            this.x += this.vx * deltaTime / 1000;
            this.y += this.vy * deltaTime / 1000;
            this.vy += this.gravity * deltaTime / 1000;
        }

        // Update rotation
        this.angle += this.angularVelocity * deltaTime / 16.67;

        // Update color animation for energy particles
        if (this.type === 'energy') {
            this.hue = (this.hue + deltaTime * 0.1) % 360;
        }

        this.age += deltaTime;

        // Remove particle if expired or moved off-screen
        if (this.age >= this.life) {
            this.active = false;
        }

        // Remove particles that have moved too far off-screen to prevent edge artifacts
        // Use generous boundaries that work regardless of zoom level
        const maxDistance = 2000; // Much larger boundary to handle zoom out
        if (Math.abs(this.x - this.startX) > maxDistance ||
            Math.abs(this.y - this.startY) > maxDistance ||
            this.x < -maxDistance || this.x > maxDistance ||
            this.y < -maxDistance || this.y > maxDistance) {
            this.active = false;
        }
    }

    render(ctx) {
        const alpha = 1 - (this.age / this.life);
        const currentSize = this.size * (0.2 + 0.8 * (1 - this.age / this.life * 0.5));

        ctx.save();

        // Render trail first
        this.renderTrail(ctx);

        // Apply composite operation for energy effects
        if (this.type === 'energy' || this.type === 'magic' || this.type === 'electric') {
            ctx.globalCompositeOperation = 'lighter';
        }

        // Render main particle with enhanced effects
        this.renderMainParticle(ctx, alpha, currentSize);

        ctx.restore();
    }

    renderTrail(ctx) {
        if (this.trail.length < 2) return;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];
            const trailAlpha = point.alpha * 0.3;

            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${trailAlpha})`;
            ctx.lineWidth = this.size * point.alpha * 0.5;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    }

    renderMainParticle(ctx, alpha, currentSize) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'energy') {
            // Pulsing energy effect
            const pulse = 1 + Math.sin(this.age * 0.01) * 0.3;
            const glowSize = currentSize * pulse * 2;

            // Outer glow
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${alpha * 0.8})`);
            gradient.addColorStop(0.3, `hsla(${this.hue}, 100%, 50%, ${alpha * 0.4})`);
            gradient.addColorStop(1, `hsla(${this.hue}, 100%, 30%, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.fillStyle = `hsla(${this.hue}, 100%, 90%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, currentSize * pulse, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'magic') {
            // Sparkle effect
            const sparkles = 6;
            for (let i = 0; i < sparkles; i++) {
                const sparkleAngle = (i / sparkles) * Math.PI * 2;
                const sparkleDistance = currentSize * 2;
                const sparkleX = Math.cos(sparkleAngle) * sparkleDistance;
                const sparkleY = Math.sin(sparkleAngle) * sparkleDistance;

                ctx.fillStyle = `hsla(${this.hue + i * 60}, 100%, 80%, ${alpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, currentSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Central star
            this.drawStar(ctx, 0, 0, 6, currentSize * 1.5, currentSize * 0.7, `hsla(${this.hue}, 100%, 90%, ${alpha})`);

        } else if (this.type === 'electric') {
            // Electric arc effect
            const branches = 4;
            for (let i = 0; i < branches; i++) {
                const branchAngle = (i / branches) * Math.PI * 2;
                const length = currentSize * 3;

                ctx.strokeStyle = `hsla(200, 100%, 80%, ${alpha * 0.8})`;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(0, 0);

                let x = 0, y = 0;
                const segments = 5;
                for (let j = 1; j <= segments; j++) {
                    x = Math.cos(branchAngle) * (length * j / segments) + (Math.random() - 0.5) * 10;
                    y = Math.sin(branchAngle) * (length * j / segments) + (Math.random() - 0.5) * 10;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

        } else if (this.type === 'fire') {
            // Flickering fire effect
            const flicker = 1 + Math.sin(this.age * 0.02) * this.flickerIntensity;
            const fireSize = currentSize * flicker;

            // Fire gradient
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fireSize * 2);
            gradient.addColorStop(0, `hsla(60, 100%, 90%, ${alpha})`);
            gradient.addColorStop(0.3, `hsla(30, 100%, 60%, ${alpha * 0.8})`);
            gradient.addColorStop(0.7, `hsla(0, 100%, 50%, ${alpha * 0.4})`);
            gradient.addColorStop(1, `hsla(0, 100%, 20%, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, fireSize * 2, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Standard particle with glow
            if (this.type === 'explosion') {
                ctx.globalCompositeOperation = 'lighter';

                // Explosion glow
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * 3);
                gradient.addColorStop(0, `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(0.5, `${this.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, `${this.color}00`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, currentSize * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Main particle
            ctx.fillStyle = `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStar(ctx, x, y, spikes, outerRadius, innerRadius, color) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(x, y - outerRadius);

        for (let i = 0; i < spikes; i++) {
            const xOuter = x + Math.cos(rot) * outerRadius;
            const yOuter = y + Math.sin(rot) * outerRadius;
            ctx.lineTo(xOuter, yOuter);
            rot += step;

            const xInner = x + Math.cos(rot) * innerRadius;
            const yInner = y + Math.sin(rot) * innerRadius;
            ctx.lineTo(xInner, yInner);
            rot += step;
        }

        ctx.lineTo(x, y - outerRadius);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
}

// Advanced Visual Effects System
class VisualEffects {
    static addScreenShake(game, intensity, duration) {
        game.screenShake = {
            intensity: Math.max(game.screenShake.intensity, intensity),
            duration: Math.max(game.screenShake.duration, duration)
        };
    }

    static addChromaticAberration(game, strength) {
        game.chromaticAberration.strength = Math.max(game.chromaticAberration.strength, strength);
    }

    static addTimeDistortion(game, factor, duration) {
        game.timeDistortion.targetFactor = factor;
        setTimeout(() => {
            game.timeDistortion.targetFactor = 1;
        }, duration);
    }

    static updateEffects(game, deltaTime) {
        // Update screen shake
        if (game.screenShake.duration > 0) {
            game.screenShake.duration -= deltaTime;
            if (game.screenShake.duration <= 0) {
                game.screenShake.intensity = 0;
            }
        }

        // Update chromatic aberration
        game.chromaticAberration.strength *= 0.95; // Fade out
        if (game.chromaticAberration.strength < 0.01) {
            game.chromaticAberration.strength = 0;
        }

        // Update time distortion
        const distortionSpeed = 0.02;
        if (game.timeDistortion.factor < game.timeDistortion.targetFactor) {
            game.timeDistortion.factor = Math.min(
                game.timeDistortion.targetFactor,
                game.timeDistortion.factor + distortionSpeed
            );
        } else if (game.timeDistortion.factor > game.timeDistortion.targetFactor) {
            game.timeDistortion.factor = Math.max(
                game.timeDistortion.targetFactor,
                game.timeDistortion.factor - distortionSpeed
            );
        }
    }

    static applyScreenShake(game, ctx) {
        if (game.screenShake.intensity > 0) {
            const shakeX = (Math.random() - 0.5) * game.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * game.screenShake.intensity;
            ctx.translate(shakeX, shakeY);
        }
    }

    static createBackgroundEffect(game, type, x, y) {
        game.backgroundEffects.push({
            type: type,
            x: x,
            y: y,
            age: 0,
            maxAge: type === 'shockwave' ? 1000 : 2000,
            active: true
        });
    }

    static updateBackgroundEffects(game, deltaTime) {
        game.backgroundEffects.forEach(effect => {
            effect.age += deltaTime;
            if (effect.age >= effect.maxAge) {
                effect.active = false;
            }
        });
        game.backgroundEffects = game.backgroundEffects.filter(effect => effect.active);
    }

    static renderBackgroundEffects(game, ctx) {
        game.backgroundEffects.forEach(effect => {
            const progress = effect.age / effect.maxAge;
            const alpha = 1 - progress;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            switch (effect.type) {
                case 'shockwave':
                    const radius = progress * 300;
                    const gradient = ctx.createRadialGradient(effect.x, effect.y, radius * 0.8, effect.x, effect.y, radius);
                    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
                    gradient.addColorStop(0.8, `rgba(255, 255, 255, ${alpha * 0.3})`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case 'energy_ripple':
                    for (let i = 0; i < 3; i++) {
                        const rippleRadius = (progress + i * 0.3) * 200;
                        const rippleAlpha = alpha * (1 - i * 0.3);

                        ctx.strokeStyle = `hsla(${(effect.age * 0.5) % 360}, 100%, 70%, ${rippleAlpha * 0.4})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(effect.x, effect.y, rippleRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
            }

            ctx.restore();
        });
    }
}

class Vehicle {
    constructor(x, y, type, game) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.game = game;
        this.active = true;
        this.health = this.getHealth();
        this.maxHealth = this.health;
        this.damage = this.getDamage();
        this.fireRate = this.getFireRate();
        this.lastShot = 0;
        this.lifetime = this.getLifetime();
        this.age = 0;
    }
    
    getHealth() {
        switch (this.type) {
            case 'tank': return 300;
            case 'helicopter': return 150;
            case 'mech': return 400;
            case 'artillery': return 200;
            default: return 100;
        }
    }
    
    getDamage() {
        switch (this.type) {
            case 'tank': return 80;
            case 'helicopter': return 50;
            case 'mech': return 100;
            case 'artillery': return 120;
            default: return 40;
        }
    }
    
    getFireRate() {
        switch (this.type) {
            case 'tank': return 1000;
            case 'helicopter': return 300;
            case 'mech': return 400;
            case 'artillery': return 2000;
            default: return 500;
        }
    }
    
    getLifetime() {
        switch (this.type) {
            case 'tank': return 30000;
            case 'helicopter': return 20000;
            case 'mech': return 25000;
            case 'artillery': return 15000;
            default: return 20000;
        }
    }
    
    update(deltaTime) {
        this.lastShot += deltaTime;
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }
        
        // Find and shoot at zombies
        const target = this.findNearestZombie();
        if (target && this.lastShot >= this.fireRate) {
            this.shoot(target);
            this.lastShot = 0;
        }
    }
    
    findNearestZombie() {
        let nearest = null;
        let minDist = 300;
        
        this.game.zombies.forEach(zombie => {
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist) {
                nearest = zombie;
                minDist = dist;
            }
        });
        
        return nearest;
    }
    
    shoot(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const bulletSpeed = 400;

        if (this.type === 'artillery') {
            // Artillery shoots explosive rounds with fire effects
            this.game.bullets.push(new Bullet(
                this.x, this.y,
                Math.cos(angle) * bulletSpeed,
                Math.sin(angle) * bulletSpeed,
                this.damage,
                'artillery',
                this.game,
                1
            ));

            // Artillery muzzle fire effect
            for (let i = 0; i < 8; i++) {
                const spreadAngle = angle + (Math.random() - 0.5) * 0.8;
                this.game.particles.push(new Particle(
                    this.x + Math.cos(angle) * 30,
                    this.y + Math.sin(angle) * 30,
                    `hsl(${25 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`,
                    'large',
                    'fire'
                ));
            }
            VisualEffects.addScreenShake(this.game, 3, 200);
        } else {
            // Regular bullet with energy muzzle flash
            this.game.bullets.push(new Bullet(
                this.x, this.y,
                Math.cos(angle) * bulletSpeed,
                Math.sin(angle) * bulletSpeed,
                this.damage,
                'vehicle',
                this.game,
                1
            ));

            // Muzzle flash effect
            for (let i = 0; i < 4; i++) {
                this.game.particles.push(new Particle(
                    this.x + Math.cos(angle) * 20,
                    this.y + Math.sin(angle) * 20,
                    `hsl(${40 + Math.random() * 20}, 100%, ${70 + Math.random() * 30}%)`,
                    'medium',
                    'energy'
                ));
            }
        }
    }
    
    render(ctx) {
        // Draw vehicle based on type
        switch (this.type) {
            case 'tank':
                ctx.fillStyle = '#556b2f';
                ctx.fillRect(this.x - 20, this.y - 15, 40, 30);
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(this.x - 15, this.y - 10, 30, 20);
                break;
            case 'helicopter':
                ctx.fillStyle = '#708090';
                ctx.fillRect(this.x - 15, this.y - 10, 30, 20);
                // Rotor
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x - 25, this.y);
                ctx.lineTo(this.x + 25, this.y);
                ctx.stroke();
                break;
            case 'mech':
                ctx.fillStyle = '#800080';
                ctx.fillRect(this.x - 18, this.y - 25, 36, 50);
                ctx.fillStyle = '#9b59b6';
                ctx.fillRect(this.x - 12, this.y - 20, 24, 15);
                break;
            case 'artillery':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(this.x - 15, this.y - 10, 30, 20);
                // Cannon
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(this.x + 15, this.y);
                ctx.lineTo(this.x + 30, this.y - 5);
                ctx.stroke();
                break;
        }
        
        // Health bar
        const barWidth = 30;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth/2, this.y - 30, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth/2, this.y - 30, barWidth * healthPercent, barHeight);
    }
}

class Drone {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.active = true;
        this.damage = 30;
        this.fireRate = 200;
        this.lastShot = 0;
        this.lifetime = 25000; // 25 seconds
        this.age = 0;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitRadius = 60;
    }
    
    update(deltaTime) {
        this.lastShot += deltaTime;
        this.age += deltaTime;
        this.orbitAngle += deltaTime * 0.003; // Orbit around player
        
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }
        
        // Orbit around player
        if (this.game.player) {
            this.x = this.game.player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
            this.y = this.game.player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
        }
        
        // Find and shoot at zombies
        const target = this.findNearestZombie();
        if (target && this.lastShot >= this.fireRate) {
            this.shoot(target);
            this.lastShot = 0;
        }
    }
    
    findNearestZombie() {
        let nearest = null;
        let minDist = 200;
        
        this.game.zombies.forEach(zombie => {
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < minDist) {
                nearest = zombie;
                minDist = dist;
            }
        });
        
        return nearest;
    }
    
    shoot(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const bulletSpeed = 500;

        this.game.bullets.push(new Bullet(
            this.x, this.y,
            Math.cos(angle) * bulletSpeed,
            Math.sin(angle) * bulletSpeed,
            this.damage,
            'drone',
            this.game,
            1
        ));

        // Drone laser effect
        for (let i = 0; i < 3; i++) {
            this.game.particles.push(new Particle(
                this.x + Math.cos(angle) * 10,
                this.y + Math.sin(angle) * 10,
                `hsl(${180 + Math.random() * 40}, 100%, ${60 + Math.random() * 30}%)`,
                'small',
                'electric'
            ));
        }
    }
    
    render(ctx) {
        // Draw drone
        ctx.fillStyle = '#4682b4';
        ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(this.x - 6, this.y - 6, 12, 12);
        
        // Propellers
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + this.orbitAngle * 10; // Fast spinning
            const x1 = this.x + Math.cos(angle) * 12;
            const y1 = this.y + Math.sin(angle) * 12;
            const x2 = this.x + Math.cos(angle + Math.PI) * 12;
            const y2 = this.y + Math.sin(angle + Math.PI) * 12;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
}

// Mobile Touch Controls Class
class MobileControls {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0,
            magnitude: 0,
            angle: 0
        };

        if (this.isMobile) {
            this.initializeMobileControls();
            this.updateMobileHUD();
        }
    }

    detectMobile() {
        return window.innerWidth <= 768 ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0) ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    initializeMobileControls() {
        this.setupVirtualJoystick();
        this.setupMobileButtons();
        this.startMobileHUDUpdates();
    }

    setupVirtualJoystick() {
        const joystick = document.getElementById('virtualJoystick');
        const joystickBase = document.getElementById('joystickBase');
        const joystickKnob = document.getElementById('joystickKnob');
        const joystickTouchArea = document.getElementById('joystickTouchArea');

        if (!joystick || !joystickBase || !joystickKnob || !joystickTouchArea) return;

        // Only add touch events on touch-capable devices
        if ('ontouchstart' in window) {
            // Listen for touches on the joystick touch area (left half of screen)
            joystickTouchArea.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];

                this.joystick.active = true;
                this.joystick.startX = touch.clientX;
                this.joystick.startY = touch.clientY;

                // Position joystick at touch location
                this.showJoystickAt(touch.clientX, touch.clientY);
                this.updateJoystickPosition(touch.clientX, touch.clientY);
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                if (!this.joystick.active) return;
                e.preventDefault();

                const touch = e.touches[0];
                this.updateJoystickPosition(touch.clientX, touch.clientY);
            }, { passive: false });

            document.addEventListener('touchend', () => {
                if (this.joystick.active) {
                    this.joystick.active = false;
                    this.hideJoystick();
                    this.resetJoystick();
                }
            });
        } else {
            // Mouse events for desktop testing
            joystickTouchArea.addEventListener('mousedown', (e) => {
                e.preventDefault();

                this.joystick.active = true;
                this.joystick.startX = e.clientX;
                this.joystick.startY = e.clientY;

                this.showJoystickAt(e.clientX, e.clientY);
                this.updateJoystickPosition(e.clientX, e.clientY);
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.joystick.active) return;
                this.updateJoystickPosition(e.clientX, e.clientY);
            });

            document.addEventListener('mouseup', () => {
                if (this.joystick.active) {
                    this.joystick.active = false;
                    this.hideJoystick();
                    this.resetJoystick();
                }
            });
        }
    }

    showJoystickAt(x, y) {
        const joystick = document.getElementById('virtualJoystick');
        if (joystick) {
            // Get current joystick size based on screen orientation
            const isPortrait = window.innerHeight > window.innerWidth;
            const isLandscape = window.innerWidth <= 768 && !isPortrait;

            let joystickSize;
            if (isLandscape) {
                joystickSize = 90; // Landscape size
            } else if (isPortrait) {
                joystickSize = 100; // Portrait size
            } else {
                joystickSize = 120; // Default desktop size
            }

            const halfSize = joystickSize / 2;

            // Center the joystick at the touch point
            joystick.style.left = (x - halfSize) + 'px';
            joystick.style.top = (y - halfSize) + 'px';
            joystick.classList.add('active');
        }
    }

    hideJoystick() {
        const joystick = document.getElementById('virtualJoystick');
        if (joystick) {
            joystick.classList.remove('active');
        }
    }

    updateJoystickPosition(clientX, clientY) {
        const joystickKnob = document.getElementById('joystickKnob');
        if (!joystickKnob) return;

        this.joystick.currentX = clientX;
        this.joystick.currentY = clientY;

        // Calculate delta from center
        this.joystick.deltaX = clientX - this.joystick.startX;
        this.joystick.deltaY = clientY - this.joystick.startY;

        // Calculate magnitude and clamp to joystick radius
        // Get current joystick size based on screen orientation
        const isPortrait = window.innerHeight > window.innerWidth;
        const isLandscape = window.innerWidth <= 768 && !isPortrait;

        let maxRadius;
        if (isLandscape) {
            maxRadius = 27.5; // 90/2 - 17.5 (knob radius)
        } else if (isPortrait) {
            maxRadius = 30; // 100/2 - 20 (knob radius)
        } else {
            maxRadius = 35; // 120/2 - 25 (knob radius)
        }

        this.joystick.magnitude = Math.min(maxRadius, Math.sqrt(this.joystick.deltaX ** 2 + this.joystick.deltaY ** 2));

        if (this.joystick.magnitude > maxRadius) {
            const normalizeRatio = maxRadius / Math.sqrt(this.joystick.deltaX ** 2 + this.joystick.deltaY ** 2);
            this.joystick.deltaX *= normalizeRatio;
            this.joystick.deltaY *= normalizeRatio;
        }

        // Update visual position
        joystickKnob.style.transform = `translate(${this.joystick.deltaX}px, ${this.joystick.deltaY}px)`;

        // Calculate angle and normalize magnitude (0-1)
        this.joystick.angle = Math.atan2(this.joystick.deltaY, this.joystick.deltaX);
        this.joystick.magnitude = Math.min(1, this.joystick.magnitude / maxRadius);

        // Update game movement
        this.updatePlayerMovement();
    }

    resetJoystick() {
        const joystickKnob = document.getElementById('joystickKnob');
        if (joystickKnob) {
            joystickKnob.style.transform = 'translate(0px, 0px)';
        }

        this.joystick.deltaX = 0;
        this.joystick.deltaY = 0;
        this.joystick.magnitude = 0;

        // Clear movement keys
        this.game.keys['w'] = false;
        this.game.keys['a'] = false;
        this.game.keys['s'] = false;
        this.game.keys['d'] = false;
    }

    updatePlayerMovement() {
        if (this.joystick.magnitude < 0.1) {
            // Dead zone
            this.game.keys['w'] = false;
            this.game.keys['a'] = false;
            this.game.keys['s'] = false;
            this.game.keys['d'] = false;
            return;
        }

        // Convert joystick input to movement keys
        // Get current joystick size based on screen orientation
        const isPortrait = window.innerHeight > window.innerWidth;
        const isLandscape = window.innerWidth <= 768 && !isPortrait;

        let maxRadius;
        if (isLandscape) {
            maxRadius = 27.5;
        } else if (isPortrait) {
            maxRadius = 30;
        } else {
            maxRadius = 35;
        }

        const normalizedX = this.joystick.deltaX / maxRadius;
        const normalizedY = this.joystick.deltaY / maxRadius;

        this.game.keys['w'] = normalizedY < -0.3;
        this.game.keys['s'] = normalizedY > 0.3;
        this.game.keys['a'] = normalizedX < -0.3;
        this.game.keys['d'] = normalizedX > 0.3;
    }

    setupMobileButtons() {
        const pauseBtn = document.getElementById('pauseMobileBtn');
        const buyBtn = document.getElementById('buyMobileBtn');
        const upgradeDamageBtn = document.getElementById('upgradeDamageMobileBtn');
        const upgradeSpeedBtn = document.getElementById('upgradeSpeedMobileBtn');

        // Use touch events on touch devices, click events on others
        const eventType = 'ontouchstart' in window ? 'touchstart' : 'click';
        const eventOptions = eventType === 'touchstart' ? { passive: false } : {};

        if (pauseBtn) {
            pauseBtn.addEventListener(eventType, (e) => {
                if (eventType === 'touchstart') e.preventDefault();
                this.game.togglePause();
            }, eventOptions);
        }

        if (buyBtn) {
            buyBtn.addEventListener(eventType, (e) => {
                if (eventType === 'touchstart') e.preventDefault();
                this.game.buySoldier();
            }, eventOptions);
        }

        if (upgradeDamageBtn) {
            upgradeDamageBtn.addEventListener(eventType, (e) => {
                if (eventType === 'touchstart') e.preventDefault();
                this.game.upgradeDamage();
            }, eventOptions);
        }

        if (upgradeSpeedBtn) {
            upgradeSpeedBtn.addEventListener(eventType, (e) => {
                if (eventType === 'touchstart') e.preventDefault();
                this.game.upgradeSpeed();
            }, eventOptions);
        }
    }


    startMobileHUDUpdates() {
        // Update mobile HUD every frame
        this.game.createInterval(() => {
            this.updateMobileHUD();
        }, 100); // 10fps for HUD updates (sufficient and efficient)
    }

    updateMobileHUD() {
        if (!this.isMobile) return;

        // Update level
        const levelEl = document.getElementById('mobileLevelNumber');
        if (levelEl) levelEl.textContent = this.game.level;

        // Update health
        const healthEl = document.getElementById('mobileHealth');
        if (healthEl && this.game.player) {
            healthEl.textContent = Math.ceil(this.game.player.health);
        }

        // Update wave
        const waveEl = document.getElementById('mobileWave');
        if (waveEl) waveEl.textContent = this.game.wave;

        // Update time
        const timeEl = document.getElementById('mobileTime');
        if (timeEl) {
            const minutes = Math.floor(this.game.survivalTime / 60000);
            const seconds = Math.floor((this.game.survivalTime % 60000) / 1000);
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update money
        const moneyEl = document.getElementById('mobileMoney');
        if (moneyEl) moneyEl.textContent = this.game.money;

        // Update weapon count
        const weaponsEl = document.getElementById('mobileWeapons');
        if (weaponsEl) weaponsEl.textContent = this.game.weapons.length;

        // Update kills
        const killsEl = document.getElementById('mobileKills');
        if (killsEl && this.game.player) {
            killsEl.textContent = this.game.player.killCount || 0;
        }

        // Update button states based on affordability
        this.updateMobileButtonStates();
    }

    updateMobileButtonStates() {
        const buyBtn = document.getElementById('buyMobileBtn');
        const upgradeDamageBtn = document.getElementById('upgradeDamageMobileBtn');
        const upgradeSpeedBtn = document.getElementById('upgradeSpeedMobileBtn');

        // Update soldier buy button (use actual cost)
        if (buyBtn) {
            const adjustedSoldierCost = this.game.getAdjustedUpgradeCost(this.game.soldierCost);
            if (this.game.money >= adjustedSoldierCost && this.game.soldiers.length < 10) {
                buyBtn.style.opacity = '1';
                buyBtn.style.filter = 'none';
            } else {
                buyBtn.style.opacity = '0.5';
                buyBtn.style.filter = 'grayscale(1)';
            }
        }

        // Update damage upgrade button (use actual cost)
        if (upgradeDamageBtn) {
            const adjustedUpgradeCost = this.game.getAdjustedUpgradeCost(this.game.upgradeCost);
            if (this.game.money >= adjustedUpgradeCost) {
                upgradeDamageBtn.style.opacity = '1';
                upgradeDamageBtn.style.filter = 'none';
            } else {
                upgradeDamageBtn.style.opacity = '0.5';
                upgradeDamageBtn.style.filter = 'grayscale(1)';
            }
        }

        // Update speed upgrade button (use actual cost)
        if (upgradeSpeedBtn) {
            const adjustedSpeedCost = this.game.getAdjustedUpgradeCost(this.game.speedCost);
            if (this.game.money >= adjustedSpeedCost) {
                upgradeSpeedBtn.style.opacity = '1';
                upgradeSpeedBtn.style.filter = 'none';
            } else {
                upgradeSpeedBtn.style.opacity = '0.5';
                upgradeSpeedBtn.style.filter = 'grayscale(1)';
            }
        }
    }
}

// Enhanced Visual Effects System
class EnhancedVisualEffects {
    static createWeaponFireEffect(game, x, y, weaponType) {
        const effects = {
            'laser': () => {
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 30 + 10;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#00ffff',
                        'small',
                        'electric'
                    ));
                }
            },
            'rocket': () => {
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 25 + 5;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        i % 2 === 0 ? '#ff4444' : '#ff8800',
                        'medium',
                        'explosion'
                    ));
                }
            },
            'flamethrower': () => {
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 40 + 10;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        i % 3 === 0 ? '#ff6600' : (i % 3 === 1 ? '#ff4400' : '#ffaa00'),
                        'large',
                        'fire'
                    ));
                }
            },
            'shotgun': () => {
                for (let i = 0; i < 6; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 20 + 5;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#ffd700',
                        'small',
                        'sparks'
                    ));
                }
            },
            'machinegun': () => {
                for (let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 15 + 3;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#ffcc00',
                        'small',
                        'sparks'
                    ));
                }
            },
            'plasma': () => {
                for (let i = 0; i < 10; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 35 + 15;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#9b59b6',
                        'medium',
                        'electric'
                    ));
                }
            },
            'railgun': () => {
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 50 + 20;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#34495e',
                        'large',
                        'electric'
                    ));
                }
            }
        };

        if (effects[weaponType]) {
            effects[weaponType]();
        } else {
            // Default effect
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 10 + 5;
                game.particles.push(new Particle(
                    x + Math.cos(angle) * distance,
                    y + Math.sin(angle) * distance,
                    '#ffd700',
                    'small',
                    'sparks'
                ));
            }
        }
    }

    static createWeaponHitEffect(game, x, y, weaponType) {
        const effects = {
            'laser': () => {
                for (let i = 0; i < 6; i++) {
                    game.particles.push(new Particle(x, y, '#00ffff', 'large', 'electric'));
                }
            },
            'rocket': () => {
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 60 + 20;
                    game.particles.push(new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        '#ff4444',
                        'large',
                        'explosion'
                    ));
                }
            },
            'flamethrower': () => {
                for (let i = 0; i < 8; i++) {
                    game.particles.push(new Particle(x, y, '#ff6600', 'medium', 'fire'));
                }
            },
            'plasma': () => {
                for (let i = 0; i < 10; i++) {
                    game.particles.push(new Particle(x, y, '#9b59b6', 'large', 'electric'));
                }
            }
        };

        if (effects[weaponType]) {
            effects[weaponType]();
        }
    }

    static createPowerupCollectionEffect(game, x, y, powerupType, rarity) {
        const baseCount = rarity === 'legendary' ? 25 : rarity === 'epic' ? 15 : rarity === 'rare' ? 10 : 5;
        const color = game.getRarityColor ? game.getRarityColor(rarity) : '#ffd700';

        for (let i = 0; i < baseCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 50 + 20;
            game.particles.push(new Particle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                color,
                rarity === 'legendary' ? 'large' : 'medium',
                'magic'
            ));
        }
    }
}

// Add missing powerup implementations to Game class
Game.prototype.createWeaponHitEffect = function(x, y, weaponType) {
    EnhancedVisualEffects.createWeaponHitEffect(this, x, y, weaponType);
};

Game.prototype.createWeaponFireEffect = function(x, y, weaponType) {
    EnhancedVisualEffects.createWeaponFireEffect(this, x, y, weaponType);
};

Game.prototype.createPowerupCollectionEffect = function(x, y, powerupType, rarity) {
    EnhancedVisualEffects.createPowerupCollectionEffect(this, x, y, powerupType, rarity);
};

// Enhanced Particle class with more visual types
const originalParticleUpdate = Particle.prototype.update;
Particle.prototype.update = function(deltaTime) {
    originalParticleUpdate.call(this, deltaTime);

    // Add special movement patterns
    if (this.type === 'electric') {
        this.x += Math.sin(this.age * 0.01) * 2;
        this.y += Math.cos(this.age * 0.01) * 2;
    } else if (this.type === 'sparks') {
        this.vy += 100 * deltaTime / 1000; // Gravity
    } else if (this.type === 'fire') {
        this.y -= 50 * deltaTime / 1000; // Float upward
        this.x += Math.sin(this.age * 0.005) * 1;
    }
};

// Character Selection Management
class CharacterSelection {
    constructor(splashScreen) {
        this.splashScreen = splashScreen;
        this.characterElement = document.getElementById('characterSelection');
        this.selectedCharacter = 'soldier'; // Default character
        this.setupEventListeners();
        this.checkUnlockedCharacters();
    }

    setupEventListeners() {
        // Character card selection
        const characterCards = document.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            card.addEventListener('click', () => {
                const character = card.dataset.character;
                if (!card.classList.contains('locked')) {
                    this.selectCharacter(character);
                }
            });
        });

        // Action buttons
        const selectBtn = document.getElementById('selectCharacterBtn2');
        const backBtn = document.getElementById('backToMenuBtn');

        selectBtn.addEventListener('click', () => {
            this.confirmSelection();
        });

        backBtn.addEventListener('click', () => {
            this.backToMenu();
        });
    }

    checkUnlockedCharacters() {
        const metaProgression = JSON.parse(localStorage.getItem('zombieBagarreProgress') || '{}');
        const stats = metaProgression.statistics || {};

        // Check unlock conditions
        const unlockConditions = {
            soldier: true, // Always unlocked
            commando: stats.highestWave >= 10,
            scout: stats.totalZombiesKilled >= 500,
            engineer: stats.totalPowerupsCollected >= 50,
            tank: stats.totalSurvivalTime >= 1800000 // 30 minutes
        };

        // Apply locked state to cards and update unlock progress
        Object.keys(unlockConditions).forEach(character => {
            const card = document.querySelector(`[data-character="${character}"]`);
            if (!unlockConditions[character]) {
                card.classList.add('locked');

                // Update unlock progress text
                const unlockEl = card.querySelector('.character-unlock span');
                if (unlockEl && character !== 'soldier') {
                    let progressText = '';
                    switch (character) {
                        case 'commando':
                            progressText = `🔒 Unlock: Reach Wave 10 (${stats.highestWave || 0}/10)`;
                            break;
                        case 'scout':
                            progressText = `🔒 Unlock: Kill 500 Zombies (${stats.totalZombiesKilled || 0}/500)`;
                            break;
                        case 'engineer':
                            progressText = `🔒 Unlock: Collect 50 Powerups (${stats.totalPowerupsCollected || 0}/50)`;
                            break;
                        case 'tank':
                            const minutes = Math.floor((stats.totalSurvivalTime || 0) / 60000);
                            progressText = `🔒 Unlock: Survive 30 Minutes (${minutes}/30)`;
                            break;
                    }
                    unlockEl.textContent = progressText;
                }
            }
        });

        // Select first unlocked character
        const unlockedCharacters = Object.keys(unlockConditions).filter(char => unlockConditions[char]);
        if (unlockedCharacters.length > 0) {
            this.selectCharacter(unlockedCharacters[0]);
        }
    }

    selectCharacter(character) {
        // Remove previous selection
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select new character
        const selectedCard = document.querySelector(`[data-character="${character}"]`);
        if (selectedCard && !selectedCard.classList.contains('locked')) {
            selectedCard.classList.add('selected');
            this.selectedCharacter = character;

            // Enable select button
            const selectBtn = document.getElementById('selectCharacterBtn2');
            selectBtn.classList.remove('disabled');
        }
    }

    show() {
        this.characterElement.classList.remove('hidden');
        this.checkUnlockedCharacters();
    }

    hide() {
        this.characterElement.classList.add('hidden');
    }

    confirmSelection() {
        if (this.selectedCharacter) {
            // Store selected character
            localStorage.setItem('selectedCharacter', this.selectedCharacter);

            // Hide character selection and start game
            this.hide();
            this.splashScreen.startGameWithCharacter(this.selectedCharacter);
        }
    }

    backToMenu() {
        this.hide();
        this.splashScreen.show();
    }
}

// Splash Screen Management
class SplashScreen {
    constructor() {
        this.splashElement = document.getElementById('splashScreen');
        this.startBtn = document.getElementById('startGameBtn');
        this.continueBtn = document.getElementById('continueGameBtn');
        this.selectCharacterBtn = document.getElementById('selectCharacterBtn');
        this.gameStarted = false;

        // Initialize character selection
        this.characterSelection = new CharacterSelection(this);

        this.setupEventListeners();
        this.checkSavedGame();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => {
            this.startGame();
        });

        this.continueBtn.addEventListener('click', () => {
            this.continueGame();
        });

        this.selectCharacterBtn.addEventListener('click', () => {
            this.showCharacterSelection();
        });

        // Allow Enter key to start game
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.gameStarted && !this.characterSelection.characterElement.classList.contains('hidden')) {
                this.startGame();
            }
        });
    }

    show() {
        this.splashElement.classList.remove('hidden');
    }

    hide() {
        this.splashElement.classList.add('hidden');
    }

    startGame() {
        if (this.gameStarted) return;

        // Get selected character from localStorage or default
        const selectedCharacter = localStorage.getItem('selectedCharacter') || 'soldier';
        this.startGameWithCharacter(selectedCharacter);
    }

    startGameWithCharacter(character) {
        if (this.gameStarted) return;

        this.gameStarted = true;

        // Hide both screens
        this.splashElement.style.animation = 'fadeOut 0.5s ease-out';
        this.characterSelection.hide();

        setTimeout(() => {
            this.hide();
            this.initializeGame(character);
        }, 500);
    }

    showCharacterSelection() {
        this.hide();
        this.characterSelection.show();
    }

    checkSavedGame() {
        // Create a temporary game instance to check for saved games
        const tempGame = new Game();

        if (tempGame.hasSavedGame()) {
            const saveInfo = tempGame.getSaveGameInfo();
            this.continueBtn.classList.remove('hidden');

            // Update button text with save info
            if (saveInfo) {
                this.continueBtn.textContent = `CONTINUE (Wave ${saveInfo.wave}, Level ${saveInfo.level})`;
            }
        } else {
            this.continueBtn.classList.add('hidden');
        }

        // Clean up temporary game instance
        tempGame.cleanup();
    }

    continueGame() {
        if (this.gameStarted) return;

        this.gameStarted = true;
        this.splashElement.style.animation = 'fadeOut 0.5s ease-out';

        setTimeout(() => {
            this.hide();

            // Create new game and load saved state
            const game = new Game();

            if (game.loadGame()) {
                const mobileControls = new MobileControls(game);
                game.mobileControls = mobileControls;

                // Start the loaded game
                game.startGame();
            } else {
                // Fallback to new game if load fails
                this.initializeGame('soldier');
            }
        }, 500);
    }

    initializeGame(selectedCharacter = 'soldier') {
        const game = new Game();

        // Set selected character
        game.selectedCharacter = selectedCharacter;

        const mobileControls = new MobileControls(game);

        // Store mobile controls reference in game for access
        game.mobileControls = mobileControls;

        // Auto-start the game
        game.startGame();
    }
}

// AudioSystem - Procedural sound generation for immersive audio
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.soundEnabled = true;
        this.volume = 0.5;
        this.audioContextInitialized = false;

        // Don't initialize AudioContext immediately - wait for user interaction
    }

    initAudioContext() {
        if (this.audioContextInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            this.audioContextInitialized = true;
        } catch (error) {
            console.warn('AudioContext not supported:', error);
            this.soundEnabled = false;
        }
    }

    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume();
        }
        return Promise.resolve();
    }

    createOscillator(type, frequency, duration, volume = 0.1) {
        if (!this.soundEnabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);

        return oscillator;
    }

    createNoise(duration, volume = 0.1, filterFreq = 1000) {
        if (!this.soundEnabled || !this.audioContext) return;

        const bufferSize = this.audioContext.sampleRate * duration;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, this.audioContext.currentTime);

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        noiseSource.start(this.audioContext.currentTime);

        return noiseSource;
    }

    playSound(soundType, options = {}) {
        if (!this.soundEnabled) return;

        // Initialize AudioContext on first user interaction
        if (!this.audioContextInitialized) {
            this.initAudioContext();
        }

        this.resumeAudioContext();

        const sounds = {
            'weapon_rifle': () => {
                this.createOscillator('square', 80 + Math.random() * 20, 0.1, 0.15);
                this.createNoise(0.05, 0.1, 2000);
            },
            'weapon_shotgun': () => {
                this.createNoise(0.2, 0.2, 800);
                this.createOscillator('sawtooth', 60, 0.3, 0.1);
            },
            'weapon_machinegun': () => {
                this.createOscillator('square', 100 + Math.random() * 30, 0.05, 0.1);
                this.createNoise(0.03, 0.08, 3000);
            },
            'weapon_plasma': () => {
                this.createOscillator('sine', 300 + Math.random() * 200, 0.15, 0.12);
                this.createOscillator('square', 150, 0.1, 0.08);
            },
            'weapon_laser': () => {
                this.createOscillator('sine', 800 + Math.random() * 400, 0.2, 0.1);
                this.createOscillator('triangle', 400, 0.15, 0.06);
            },
            'weapon_flamethrower': () => {
                this.createNoise(0.3, 0.15, 500);
                this.createOscillator('sawtooth', 40 + Math.random() * 20, 0.2, 0.08);
            },
            'weapon_rocket': () => {
                this.createOscillator('sawtooth', 50, 0.4, 0.2);
                this.createNoise(0.6, 0.25, 300);
            },
            'zombie_death': () => {
                this.createOscillator('sawtooth', 150 + Math.random() * 50, 0.3, 0.1);
                this.createNoise(0.2, 0.08, 1500);
            },
            'zombie_hit': () => {
                this.createOscillator('triangle', 200 + Math.random() * 100, 0.1, 0.06);
            },
            'powerup_pickup': () => {
                this.createOscillator('sine', 440, 0.1, 0.08);
                this.createOscillator('sine', 554, 0.15, 0.08);
                this.createOscillator('sine', 659, 0.2, 0.08);
            },
            'level_up': () => {
                this.createOscillator('sine', 523, 0.2, 0.1);
                this.createOscillator('sine', 659, 0.3, 0.1);
                this.createOscillator('sine', 784, 0.4, 0.1);
            },
            'purchase': () => {
                this.createOscillator('triangle', 330, 0.1, 0.08);
                this.createOscillator('triangle', 415, 0.15, 0.08);
            },
            'button_click': () => {
                this.createOscillator('square', 800, 0.05, 0.05);
            },
            'wave_start': () => {
                this.createOscillator('sine', 220, 0.5, 0.12);
                this.createOscillator('sine', 440, 0.4, 0.1);
            },
            'boss_spawn': () => {
                this.createOscillator('sawtooth', 40, 1.0, 0.2);
                this.createNoise(0.8, 0.15, 200);
            },
            'combo_kill': () => {
                const pitch = 440 + (options.comboLevel || 1) * 100;
                this.createOscillator('sine', pitch, 0.1, 0.08);
            }
        };

        if (sounds[soundType]) {
            sounds[soundType]();
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
}

// Achievement & Notification System
class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.achievements = this.initAchievements();
        this.notifications = [];
        this.loadProgress();
    }

    initAchievements() {
        return {
            // Kill-based achievements
            first_blood: { id: 'first_blood', name: 'First Blood', description: 'Kill your first zombie', condition: 'kills', threshold: 1, unlocked: false },
            monster_hunter: { id: 'monster_hunter', name: 'Monster Hunter', description: 'Kill 100 zombies', condition: 'kills', threshold: 100, unlocked: false },
            slayer: { id: 'slayer', name: 'Slayer', description: 'Kill 500 zombies', condition: 'kills', threshold: 500, unlocked: false },
            exterminator: { id: 'exterminator', name: 'Exterminator', description: 'Kill 1,000 zombies', condition: 'kills', threshold: 1000, unlocked: false },
            apocalypse_survivor: { id: 'apocalypse_survivor', name: 'Apocalypse Survivor', description: 'Kill 5,000 zombies', condition: 'kills', threshold: 5000, unlocked: false },

            // Wave-based achievements
            getting_started: { id: 'getting_started', name: 'Getting Started', description: 'Survive to wave 5', condition: 'wave', threshold: 5, unlocked: false },
            veteran: { id: 'veteran', name: 'Veteran', description: 'Survive to wave 10', condition: 'wave', threshold: 10, unlocked: false },
            elite: { id: 'elite', name: 'Elite', description: 'Survive to wave 20', condition: 'wave', threshold: 20, unlocked: false },
            legendary: { id: 'legendary', name: 'Legendary', description: 'Survive to wave 30', condition: 'wave', threshold: 30, unlocked: false },
            godlike: { id: 'godlike', name: 'Godlike', description: 'Survive to wave 50', condition: 'wave', threshold: 50, unlocked: false },

            // Level-based achievements
            power_up: { id: 'power_up', name: 'Power Up!', description: 'Reach level 10', condition: 'level', threshold: 10, unlocked: false },
            experienced: { id: 'experienced', name: 'Experienced', description: 'Reach level 25', condition: 'level', threshold: 25, unlocked: false },
            master: { id: 'master', name: 'Master', description: 'Reach level 50', condition: 'level', threshold: 50, unlocked: false },
            transcendent: { id: 'transcendent', name: 'Transcendent', description: 'Reach level 100', condition: 'level', threshold: 100, unlocked: false },

            // Score-based achievements
            high_scorer: { id: 'high_scorer', name: 'High Scorer', description: 'Score 100,000 points', condition: 'score', threshold: 100000, unlocked: false },
            point_master: { id: 'point_master', name: 'Point Master', description: 'Score 500,000 points', condition: 'score', threshold: 500000, unlocked: false },
            score_legend: { id: 'score_legend', name: 'Score Legend', description: 'Score 1,000,000 points', condition: 'score', threshold: 1000000, unlocked: false },

            // Combo achievements
            combo_starter: { id: 'combo_starter', name: 'Combo Starter', description: 'Get a 5 kill combo', condition: 'combo', threshold: 5, unlocked: false },
            combo_master: { id: 'combo_master', name: 'Combo Master', description: 'Get a 20 kill combo', condition: 'combo', threshold: 20, unlocked: false },
            combo_god: { id: 'combo_god', name: 'Combo God', description: 'Get a 50 kill combo', condition: 'combo', threshold: 50, unlocked: false },

            // Survival achievements
            survivor: { id: 'survivor', name: 'Survivor', description: 'Survive for 5 minutes', condition: 'survival_time', threshold: 300000, unlocked: false },
            endurance: { id: 'endurance', name: 'Endurance', description: 'Survive for 15 minutes', condition: 'survival_time', threshold: 900000, unlocked: false },
            marathon: { id: 'marathon', name: 'Marathon', description: 'Survive for 30 minutes', condition: 'survival_time', threshold: 1800000, unlocked: false },

            // Weapon achievements
            arsenal: { id: 'arsenal', name: 'Arsenal', description: 'Unlock 5 different weapons', condition: 'weapons_unlocked', threshold: 5, unlocked: false },
            weapon_master: { id: 'weapon_master', name: 'Weapon Master', description: 'Max level a weapon', condition: 'max_weapon_level', threshold: 8, unlocked: false },

            // Boss achievements
            boss_slayer: { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first boss', condition: 'bosses_killed', threshold: 1, unlocked: false },
            boss_hunter: { id: 'boss_hunter', name: 'Boss Hunter', description: 'Defeat 10 bosses', condition: 'bosses_killed', threshold: 10, unlocked: false },

            // Special achievements
            lucky: { id: 'lucky', name: 'Lucky', description: 'Find 10 legendary items', condition: 'legendary_items', threshold: 10, unlocked: false },
            wealthy: { id: 'wealthy', name: 'Wealthy', description: 'Earn 10,000 coins in one run', condition: 'money_earned', threshold: 10000, unlocked: false },
        };
    }

    checkAchievements(type, value) {
        const newUnlocks = [];

        for (const achievement of Object.values(this.achievements)) {
            if (!achievement.unlocked && achievement.condition === type && value >= achievement.threshold) {
                achievement.unlocked = true;
                newUnlocks.push(achievement);
                this.showAchievementNotification(achievement);

                // Play achievement sound
                this.game.audioSystem.playSound('level_up');

                // Add visual effects
                this.createAchievementEffects();
            }
        }

        if (newUnlocks.length > 0) {
            this.saveProgress();
        }

        return newUnlocks;
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-content">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;

        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            border: 3px solid #d35400;
            border-radius: 12px;
            padding: 20px;
            color: white;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 8px 25px rgba(243, 156, 18, 0.5);
            opacity: 0;
            transform: translateX(-50%) translateY(-20px) scale(0.8);
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 15px;
        `;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px) scale(0.8)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }

    createAchievementEffects() {
        // Screen flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(243,156,18,0.3) 0%, transparent 70%);
            pointer-events: none;
            z-index: 1500;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(flash);

        // Flash animation
        requestAnimationFrame(() => {
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => {
                    if (flash.parentNode) {
                        flash.parentNode.removeChild(flash);
                    }
                }, 300);
            }, 200);
        });

        // Particle effects around player
        if (this.game.player) {
            for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2;
                const distance = Math.random() * 60 + 30;
                this.game.particles.push(new Particle(
                    this.game.player.x + Math.cos(angle) * distance,
                    this.game.player.y + Math.sin(angle) * distance,
                    '#f39c12',
                    'large',
                    'magic',
                    2000
                ));
            }
        }
    }

    getUnlockedAchievements() {
        return Object.values(this.achievements).filter(a => a.unlocked);
    }

    getAchievementProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return null;

        let currentValue = 0;
        switch (achievement.condition) {
            case 'kills':
                currentValue = this.game.killCount;
                break;
            case 'wave':
                currentValue = this.game.wave;
                break;
            case 'level':
                currentValue = this.game.level;
                break;
            case 'score':
                currentValue = this.game.score;
                break;
            case 'combo':
                currentValue = this.game.comboSystem.kills;
                break;
            case 'survival_time':
                currentValue = this.game.survivalTime;
                break;
            case 'weapons_unlocked':
                currentValue = this.game.weapons.length;
                break;
            case 'bosses_killed':
                currentValue = this.game.metaProgression.statistics.bossesKilled || 0;
                break;
        }

        return {
            current: Math.min(currentValue, achievement.threshold),
            max: achievement.threshold,
            progress: Math.min(currentValue / achievement.threshold, 1),
            unlocked: achievement.unlocked
        };
    }

    saveProgress() {
        try {
            const progress = {};
            for (const [id, achievement] of Object.entries(this.achievements)) {
                progress[id] = achievement.unlocked;
            }
            localStorage.setItem('zombieAchievements', JSON.stringify(progress));
        } catch (error) {
            console.error('Failed to save achievement progress:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('zombieAchievements');
            if (saved) {
                const progress = JSON.parse(saved);
                for (const [id, unlocked] of Object.entries(progress)) {
                    if (this.achievements[id]) {
                        this.achievements[id].unlocked = unlocked;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load achievement progress:', error);
        }
    }
}

// ComboSystem - Kill streak tracking and multiplier bonuses
class ComboSystem {
    constructor() {
        this.kills = 0;
        this.comboLevel = 0;
        this.comboMultiplier = 1;
        this.lastKillTime = 0;
        this.comboTimeout = 3000; // 3 seconds between kills to maintain combo
        this.comboThresholds = [5, 10, 20, 35, 50, 75, 100, 150, 200];
        this.comboNames = [
            'KILLING SPREE', 'RAMPAGE', 'DOMINATING', 'UNSTOPPABLE',
            'GODLIKE', 'LEGENDARY', 'IMMORTAL', 'APOCALYPTIC', 'TRANSCENDENT'
        ];
        this.bonusMultipliers = [1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0];
    }

    addKill() {
        const currentTime = Date.now();

        // Check if combo has timed out
        if (currentTime - this.lastKillTime > this.comboTimeout) {
            this.resetCombo();
        }

        this.kills++;
        this.lastKillTime = currentTime;

        // Check for combo level up
        const newComboLevel = this.getComboLevelForKills(this.kills);
        if (newComboLevel > this.comboLevel) {
            this.comboLevel = newComboLevel;
            this.comboMultiplier = this.bonusMultipliers[this.comboLevel] || 1;
            return {
                levelUp: true,
                comboName: this.comboNames[this.comboLevel],
                multiplier: this.comboMultiplier,
                kills: this.kills
            };
        }

        return {
            levelUp: false,
            multiplier: this.comboMultiplier,
            kills: this.kills
        };
    }

    getComboLevelForKills(kills) {
        for (let i = this.comboThresholds.length - 1; i >= 0; i--) {
            if (kills >= this.comboThresholds[i]) {
                return i;
            }
        }
        return -1;
    }

    resetCombo() {
        this.kills = 0;
        this.comboLevel = -1;
        this.comboMultiplier = 1;
    }

    getComboData() {
        return {
            kills: this.kills,
            comboLevel: this.comboLevel,
            comboName: this.comboLevel >= 0 ? this.comboNames[this.comboLevel] : null,
            multiplier: this.comboMultiplier,
            nextThreshold: this.getNextThreshold()
        };
    }

    getNextThreshold() {
        const nextLevel = this.comboLevel + 1;
        return nextLevel < this.comboThresholds.length ? this.comboThresholds[nextLevel] : null;
    }

    update() {
        const currentTime = Date.now();
        if (this.kills > 0 && currentTime - this.lastKillTime > this.comboTimeout) {
            this.resetCombo();
            return { comboLost: true };
        }
        return { comboLost: false };
    }
}

// Add fadeOut animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;
document.head.appendChild(style);

// Initialize splash screen when page loads
window.addEventListener('load', () => {
    new SplashScreen();
});