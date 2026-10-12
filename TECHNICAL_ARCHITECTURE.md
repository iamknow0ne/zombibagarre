# 🏗️ TECHNICAL ARCHITECTURE - Production Build

## 📐 System Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                      GAME CORE                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Game.js                            │  │
│  │  - Main loop (60 FPS)                                │  │
│  │  - Entity management                                  │  │
│  │  - System coordination                                │  │
│  └─────────┬────────────────────────────────────────────┘  │
│            │                                                │
│  ┌─────────▼────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ DifficultySystem │  │ EconomySystem│  │MultiWeaponSys│  │
│  │  - 3 levels      │  │  - Gold drops│  │  - 3 weapons │  │
│  │  - Multipliers   │  │  - Shop      │  │  - Combos    │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   GAMEPLAY SYSTEMS                          │
│                                                              │
│  WaveSystem ──► DifficultySystem ──► Zombie Spawning        │
│      │                                      │                │
│      ▼                                      ▼                │
│  EconomySystem ◄─── Gold Drops ◄─── Zombie Death            │
│      │                                                       │
│      ▼                                                       │
│  UpgradeSystem ◄─── Shop Menu ◄─── Player Input             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    UI/UX LAYER                              │
│                                                              │
│  Splashscreen → CharacterSelect → GameplayHUD → Shop        │
│       │              │                 │            │        │
│       ▼              ▼                 ▼            ▼        │
│   Loading      3 Characters      Build Recap   Upgrades     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  INPUT SYSTEMS                              │
│                                                              │
│  Desktop: InputManager (keyboard + mouse)                   │
│  Mobile:  TouchControls (virtual joystick + buttons)        │
│           │                                                  │
│           ▼                                                  │
│      Player.js (unified input handling)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 NEW FILES TO CREATE

### Core Systems (5 files)
```
src/systems/
├── DifficultySystem.js       [CRITICAL] - 3 difficulty levels
├── EconomySystem.js           [CRITICAL] - Gold currency & drops
├── MultiWeaponSystem.js       [HIGH] - 3-weapon simultaneous firing
├── CharacterSystem.js         [CRITICAL] - 3 playable classes
└── TeleportSystem.js          [MEDIUM] - Teleport pad mechanics
```

### Controls (2 files)
```
src/core/
├── TouchControls.js           [CRITICAL] - Mobile virtual controls
└── ControlScheme.js           [MEDIUM] - Customizable key bindings
```

### Entities (3 files)
```
src/entities/
├── DrivableVehicle.js         [MEDIUM] - Player-controlled vehicles
├── GoldPickup.js              [CRITICAL] - Gold drop collectibles
└── SpecialLoot.js             [MEDIUM] - Rare loot chests
```

### Visuals (1 file)
```
src/graphics/
└── GoreManager.js             [HIGH] - Enhanced gore system
```

### UI Components (1 file)
```
src/ui/
└── BuildRecapTable.js         [CRITICAL] - Shop build display
```

**TOTAL NEW FILES:** 12

---

## 🔄 FILES TO MODIFY (Major Changes)

### Game.js
```javascript
// ADD: New system integrations
this.difficulty = new DifficultySystem(this);
this.economy = new EconomySystem(this);
this.multiWeapon = new MultiWeaponSystem(this);
this.characters = new CharacterSystem(this);

// MODIFY: Update loop to handle multi-weapon
update(deltaTime) {
  // ... existing code
  this.multiWeapon.update(deltaTime);
  this.economy.update(deltaTime);
}
```

### Player.js
```javascript
// ADD: Character class properties
this.characterClass = null; // Set in character select

// MODIFY: Weapon system
this.activeWeaponSet = []; // Array of 3 weapons
this.allWeapons = []; // Pool of 10 weapons

// ADD: Touch control support
if (this.game.isMobile) {
  this.handleTouchInput();
} else {
  this.handleKeyboardInput();
}

// MODIFY: Fire method
fire() {
  // Fire all 3 weapons in activeWeaponSet
  for (const weapon of this.activeWeaponSet) {
    if (weapon) weapon.fire(this.aimDirection);
  }
}
```

### WaveSystem.js
```javascript
// MODIFY: Apply difficulty multipliers
spawnZombie() {
  const diff = this.game.difficulty.getCurrent();

  const zombie = new Zombie(/* ... */);
  zombie.health *= diff.healthMultiplier;
  zombie.damage *= diff.damageMultiplier;
  zombie.speed *= diff.speedMultiplier;

  // NEW: Gold drop on death
  zombie.goldReward = this.calculateGoldReward(zombie.type);
}

// NEW: Massive horde spawning
if (this.game.wave > 15) {
  this.spawnMultipleZombies(5); // 5 at once
}
```

### Zombie.js
```javascript
// ADD: Gold drop on death
die() {
  // ... existing death logic

  // Spawn gold pickup
  if (this.goldReward > 0) {
    const gold = new GoldPickup(
      this.scene,
      this.position.clone(),
      this.goldReward,
      this.game
    );
    this.game.addGoldPickup(gold);
  }

  // Enhanced gore
  if (this.game.settings.gore) {
    this.game.gore.spawnFleshExplosion(this.position, this.scale);
  }
}
```

### main.js
```javascript
// ADD: Character selection screen handling
function showCharacterSelect() {
  const characters = game.characters.getAvailable();
  // Render 3D character previews
  // Handle selection
}

// ADD: Build recap in shop
function updateShopBuildRecap() {
  const recap = new BuildRecapTable(game);
  recap.render('#shopMenu .build-recap-container');
}

// MODIFY: Mobile detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isMobile) {
  game.initTouchControls();
  document.body.classList.add('mobile');
}
```

### index.html
```html
<!-- NEW: Character Selection Screen -->
<div id="characterSelect" class="screen" style="display: none;">
  <div class="screen-content">
    <h2>CHOOSE YOUR SURVIVOR</h2>
    <div class="character-grid">
      <div class="character-card" data-class="tank">
        <canvas id="tankPreview"></canvas>
        <h3>🛡️ TANK</h3>
        <div class="stats">
          <div>HP: <span class="stat-bar hp">█████</span></div>
          <div>DMG: <span class="stat-bar dmg">███</span></div>
          <div>SPD: <span class="stat-bar spd">███</span></div>
        </div>
        <button class="btn select-character">SELECT</button>
      </div>
      <!-- Repeat for Assassin, Engineer -->
    </div>
  </div>
</div>

<!-- NEW: Mobile Touch Controls -->
<div id="mobileControls" style="display: none;">
  <div id="joystick" class="virtual-joystick">
    <div class="joystick-base"></div>
    <div class="joystick-stick"></div>
  </div>
  <button id="dashBtn" class="mobile-btn">⚡ DASH</button>
  <div id="weaponSwitcher" class="weapon-buttons">
    <button data-slot="0">1</button>
    <button data-slot="1">2</button>
    <button data-slot="2">3</button>
  </div>
</div>

<!-- MODIFY: Shop Menu - Add Build Recap -->
<div id="shopMenu">
  <!-- ... existing shop UI ... -->

  <!-- NEW: Build Recap Section -->
  <div class="build-recap-container">
    <h3>📊 CURRENT BUILD</h3>
    <div id="buildRecapTable">
      <!-- Populated by BuildRecapTable.js -->
    </div>
  </div>
</div>
```

### styles.css
```css
/* NEW: Mobile Controls */
.virtual-joystick {
  position: fixed;
  bottom: 40px;
  left: 40px;
  width: 150px;
  height: 150px;
  background: rgba(0, 255, 255, 0.2);
  border: 2px solid #00ffff;
  border-radius: 50%;
  touch-action: none;
}

.joystick-stick {
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(0, 255, 255, 0.6);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.1s;
}

.mobile-btn {
  position: fixed;
  bottom: 40px;
  right: 40px;
  width: 80px;
  height: 80px;
  background: rgba(255, 100, 0, 0.8);
  border: 3px solid #ff6600;
  border-radius: 50%;
  color: white;
  font-size: 24px;
  font-weight: bold;
  box-shadow: 0 0 20px rgba(255, 100, 0, 0.6);
}

/* NEW: Character Select */
.character-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 30px;
}

.character-card {
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #00ffff;
  padding: 20px;
  border-radius: 10px;
  transition: all 0.3s;
}

.character-card:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
}

.character-card canvas {
  width: 100%;
  height: 200px;
  background: #000;
  margin-bottom: 15px;
}

/* NEW: Build Recap Table */
.build-recap-container {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ffff;
  padding: 20px;
  margin-top: 30px;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

#buildRecapTable {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.build-stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.build-stat-row:hover {
  background: rgba(0, 255, 255, 0.1);
}
```

---

## 🎮 CORE ALGORITHM IMPLEMENTATIONS

### 1. Difficulty Scaling Algorithm
```javascript
// DifficultySystem.js
calculateEnemyStats(baseStats, wave, difficulty) {
  const waveMultiplier = 1 + (wave * 0.1); // +10% per wave
  const diffMultiplier = this.difficulties[difficulty];

  return {
    health: baseStats.health * diffMultiplier.health * waveMultiplier,
    damage: baseStats.damage * diffMultiplier.damage * waveMultiplier,
    speed: baseStats.speed * diffMultiplier.speed,
    count: Math.floor(baseStats.count * diffMultiplier.count * waveMultiplier)
  };
}
```

### 2. Multi-Weapon Firing System
```javascript
// MultiWeaponSystem.js
fire(player) {
  const weapons = player.activeWeaponSet.filter(w => w !== null);

  // Use slowest fire rate to prevent spam
  const slowestRate = Math.max(...weapons.map(w => w.fireRate));

  if (this.canFire(slowestRate)) {
    weapons.forEach(weapon => {
      weapon.fire(player.aimDirection);
    });

    this.lastFired = Date.now();
  }
}
```

### 3. Touch Joystick Control
```javascript
// TouchControls.js
handleTouchMove(touch) {
  const joystick = this.elements.joystick;
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const deltaX = touch.clientX - centerX;
  const deltaY = touch.clientY - centerY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const maxDistance = rect.width / 2;

  // Clamp to circle
  const clampedDistance = Math.min(distance, maxDistance);
  const angle = Math.atan2(deltaY, deltaX);

  const stickX = Math.cos(angle) * clampedDistance;
  const stickY = Math.sin(angle) * clampedDistance;

  // Update visual
  this.elements.stick.style.transform =
    `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

  // Return normalized movement vector
  return {
    x: stickX / maxDistance,
    z: stickY / maxDistance
  };
}
```

### 4. Gold Drop System
```javascript
// EconomySystem.js
calculateGoldDrop(enemyType, difficulty, wave) {
  const baseGold = {
    normal: 1,
    fast: 2,
    elite: 10,
    tank: 5,
    boss: 100
  }[enemyType] || 1;

  const diffMultiplier = difficulty === 'hard' ? 2.0 :
                        difficulty === 'normal' ? 1.0 : 0.7;
  const waveBonus = Math.floor(wave / 5); // +1 gold per 5 waves

  return Math.floor(baseGold * diffMultiplier) + waveBonus;
}

spawnGoldPickup(position, amount) {
  const gold = new GoldPickup(this.scene, position, amount, this.game);

  // Magnetic pull to player when near
  gold.update = (deltaTime) => {
    const player = this.game.entities.player;
    const distance = gold.position.distanceTo(player.position);

    if (distance < 5) {
      const direction = new THREE.Vector3()
        .subVectors(player.position, gold.position)
        .normalize();

      gold.position.add(direction.multiplyScalar(10 * deltaTime));
    }

    if (distance < 1) {
      player.addGold(gold.amount);
      gold.collect();
    }
  };
}
```

### 5. Object Pooling for Zombies
```javascript
// Game.js
class ZombiePool {
  constructor(size = 200) {
    this.pool = [];
    this.active = [];
    this.inactive = [];

    // Pre-create zombie objects
    for (let i = 0; i < size; i++) {
      const zombie = new Zombie(/* ... */);
      zombie.alive = false;
      this.pool.push(zombie);
      this.inactive.push(zombie);
    }
  }

  spawn(position, type) {
    let zombie = this.inactive.pop();

    if (!zombie) {
      console.warn('Zombie pool exhausted!');
      zombie = new Zombie(/* ... */);
    }

    zombie.reset(position, type);
    zombie.alive = true;
    this.active.push(zombie);

    return zombie;
  }

  despawn(zombie) {
    zombie.alive = false;
    const index = this.active.indexOf(zombie);
    if (index > -1) {
      this.active.splice(index, 1);
      this.inactive.push(zombie);
    }
  }
}
```

---

## 🔍 PERFORMANCE OPTIMIZATION STRATEGY

### Desktop (Target: 60 FPS)
- Max zombies: 150
- Particle limit: 500
- Blood decals: 200
- LOD: Full detail within 30 units
- Shadow quality: High

### Mobile (Target: 30 FPS)
- Max zombies: 50
- Particle limit: 150
- Blood decals: 50
- LOD: Simplified meshes beyond 15 units
- Shadow quality: Low
- Post-processing: Disabled
- Texture resolution: 512x512 max

### Optimization Techniques
```javascript
// 1. Frustum Culling
if (!camera.frustum.intersectsObject(zombie.mesh)) {
  zombie.mesh.visible = false;
  continue; // Skip update
}

// 2. Distance-based LOD
const distance = zombie.position.distanceTo(player.position);
if (distance > 30) {
  zombie.mesh.geometry = simplifiedGeometry;
} else {
  zombie.mesh.geometry = detailedGeometry;
}

// 3. Batch rendering for particles
const particleGeometry = new THREE.InstancedBufferGeometry();
// Single draw call for all particles

// 4. Throttle updates
if (frameCount % 3 === 0) {
  // Update distant zombies every 3 frames
  updateDistantZombies();
}
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (Per System)
- DifficultySystem: Test multipliers at all levels
- EconomySystem: Test gold drop calculations
- MultiWeaponSystem: Test weapon firing order
- TouchControls: Test joystick boundaries

### Integration Tests
- Character selection → Gameplay transition
- Shop purchases → Stat updates
- Difficulty change → Enemy stat scaling
- Mobile controls → Player movement

### Performance Tests
```javascript
// FPS Monitor
class PerformanceMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
  }

  update() {
    const now = performance.now();
    const fps = 1000 / (now - this.lastTime);
    this.frames.push(fps);
    this.lastTime = now;

    if (this.frames.length > 60) {
      const avg = this.frames.reduce((a, b) => a + b) / this.frames.length;
      console.log(`Avg FPS: ${avg.toFixed(1)}`);

      if (avg < 30) {
        console.warn('⚠️ Performance degradation detected!');
      }

      this.frames = [];
    }
  }
}
```

### Playtest Checklist
- [ ] Easy mode: Playable for 30+ minutes
- [ ] Normal mode: Balanced difficulty
- [ ] Hard mode: Challenging but fair
- [ ] Mobile: Responsive controls
- [ ] All characters: Unique feel
- [ ] All weapons: Balanced damage
- [ ] Multi-weapon combos: No exploits
- [ ] Gold economy: Fair progression
- [ ] Boss fights: Epic and satisfying
- [ ] Memory: No leaks after 1 hour

---

## 📦 BUILD CONFIGURATION

### vite.config.js
```javascript
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'game-core': [
            './src/core/Game.js',
            './src/core/SceneManager.js'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true
  }
});
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] Run `npm run build`
- [ ] Test production build locally (`npm run preview`)
- [ ] Check bundle size (<5MB total)
- [ ] Lighthouse audit score >90
- [ ] Mobile responsiveness test
- [ ] Cross-browser test (Chrome, Firefox, Safari)
- [ ] No console errors in production

### Deploy
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Test live URL
- [ ] Analytics tracking enabled
- [ ] Error monitoring active

### Post-Deploy
- [ ] Share demo link
- [ ] Record gameplay video
- [ ] Create feature showcase
- [ ] Document known issues
- [ ] Gather initial feedback

---

**This architecture ensures:**
✅ Scalability (easy to add features)
✅ Performance (60 FPS desktop, 30 FPS mobile)
✅ Maintainability (clean separation of concerns)
✅ Testability (modular systems)
✅ Client-ready (polished, professional)
