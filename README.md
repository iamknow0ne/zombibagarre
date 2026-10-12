# Zombie Bagarre — Quarantine

[Play in your browser](https://iamknow0ne.github.io/zombibagarre/) — share this link with friends. No installation or account is needed.

A single-player 2.5D survival game built with Three.js. Version 4.2 includes an open city with connected streets, a canal, bridges, drivable cars and a street atlas. Explore on foot or behind the wheel while surviving 32 escalating waves. The separate biome campaign retains eight generated environments: French quarter, docks, gardens, factories, jungle, snowy mountains, badlands and marsh.

## Play locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000/. WebGL and a modern browser are required. `npm run build` creates the production site in `dist`; `npm run preview` serves that build.

## What is in this version

- Open City is the default: one persistent 232×232 street network with 22 destructible buildings, parks, an industrial waterfront, four bridges, discoverable supply landmarks and parked vehicles. The seed changes building proportions, materials, cover and parking. The street grid remains fixed. Destruction persists between waves.
- Seeded procedural district maps in Biome Campaign: four nonrectangular outlines, varying dimensions, cover placement, fuel clusters and boundary-aligned buildings vary each run. **New Map** previews a different route. The same run seed produces the same eight district layouts. These are bounded combat arenas, not infinite terrain.
- Ten weapons: carbine, shotgun, SMG, heavy revolver, piercing rifle, flamethrower, grenade launcher, electric projector, katana and dual swords. Pair any two firearms, including matching guns, with independent magazines and reloads. Selecting either blade replaces both guns.
- Four damage synergies plus matching-gun akimbo timing, fourteen selectable perks, four perk combinations and eight supply pickups. Scrap buys four kinds of permanent upgrades, each with five ranks, at base camp.
- Burning enemies spread fire to nearby enemies and destructible trees/props. Electricity chains and marks charged targets. Frost slows enemies and gives visible ice feedback.
- Progressive building damage: bullet and blast scars, shattered panes, three stages of missing wall sections, then final collapse. Explosions damage the nearest wall face, so grenades work against the sides of large buildings.
- Four survivor outfits with distinct palettes and headgear; continuous joint animation blends footsteps, knees, elbows, idle breathing, aiming and sword swings.
- Katana and dual swords have three-hit combos, wider finishers, blade trails, limb cuts and timber damage. Blade stance grants 22% faster movement, a 1.1-second dodge cooldown and finisher dodge recovery.
- Six randomized fall poses with varied timing and twist, plus severed arms/legs, living legless crawlers, falling corpses, charred burn deaths and electrical spasms. Precision weapons have a higher headshot chance; all hits still use planar aiming. Gore can be disabled.
- Turbulent animated flames, rising smoke and embers, blast lighting and chained fuel explosions. Brick, concrete, wood, metal, glass and earth debris have different sizes, shapes, bounce and surface properties. Canal shots, explosions, falling debris and sinking cars produce spray and fading ripples.
- Seven enemy types and eight boss encounters using four distinct telegraphed attack archetypes. Three difficulty settings, pause on focus loss, game-over/retry, extraction/victory and local records.
- Original procedural scene assets and synthesized audio; no external asset or font downloads at runtime.

## Controls

| Action | Desktop |
| --- | --- |
| Move | WASD / ZQSD / arrows, or right-click a destination |
| Aim and shoot | Mouse; hold left button for manual fire |
| Toggle auto targeting/fire | T or the HUD button |
| Dodge / melee / grenade | Space / F / E |
| Reload equipped guns | R |
| Change lead weapon | 1–8 ranged; 9 katana; 0 dual swords; wheel cycles equipped weapons |
| Enter / exit vehicle | V or vehicle button |
| Drive / brake | Movement keys / hold Space |
| City atlas / waypoint | M; click a street or landmark |
| Configure two guns or one blade | B / Arsenal |
| Pause | P / Escape |

### DualSense / standard gamepads

Connect by USB or Bluetooth, focus the game and press a button. The bottom corner shows when the controller is detected. Browser Gamepad support and standard mapping are required.

| Action | DualSense |
| --- | --- |
| Move / aim | Left / right stick |
| Shoot or swing | R2 |
| Grenade / dodge | L1 / Cross or Circle |
| Reload / enter or exit car | Square / Triangle |
| Brake / cycle guns | L2 / R1 |
| Toggle auto fire / arsenal | L3 / R3 |
| Map / pause | Share / Options |
| Menus | D-pad moves focus, Cross selects, Circle closes; left/right changes a selected option |

Disconnecting pauses active play. Release the sticks and buttons after closing a menu before moving or attacking.

Touchscreen controls use a movement stick, action buttons, swap/reload and auto fire. Touch hardware has not been validated in this checkout. Settings include sound volume, three graphics levels, gore and reduced motion. Records, scrap, upgrades and settings use browser-local storage. Clearing browser data removes them; runs are not saved mid-campaign.

## Verification

```sh
npm test                  # 47 tests, including 320 generated district layouts
npm run test:campaign     # deterministic full-campaign bot, all difficulties
npm run test:campaign -- standard
npm run test:campaign -- standard city  # extended city simulation
npm run build
```

`/dev/visual-qa.html` on the development server is a staged effects test range using the real simulation and renderer. It freezes each scenario for inspection, offers small time steps, and never writes player saves. It is not included in the production bundle. Screenshots and detailed validation notes are in `docs/`.

## Publishing

GitHub Pages deploys the production `dist/` artifact through `.github/workflows/pages.yml`. Every push to `main` runs a clean install, all tests and the build before deployment; pull requests run the same checks without publishing. Repository Settings → Pages must use **GitHub Actions** as the source. Vite uses relative asset URLs so the game loads under `/zombibagarre/`. Build outputs and local environment files are ignored. The repository preserves the former game code for reference.

The new loading screen reports initialization stages and warms rendering materials before showing the menu. All gameplay runs in the browser; there is no multiplayer server. Progress is local to each browser and origin, so localhost records do not transfer to the public site.

## Source layout

`src/rebuild/Simulation.js` owns gameplay, `Map.js` and `City.js` generate the shared collision/render plans; `Effects.js` defines material debris and death motion; `Atlas.js` draws the street map, `World.js` renders it, and `Input.js` / `Audio.js` handle controls and sound. `src/main.js` connects these to the interface. The former implementation remains in `src/legacy-main.js` and `legacy-3d.html` for reference; the main page imports only the rebuilt game.

The city is a finite free-roaming survival map, not a GTA mission/traffic simulation. Buildings collapse through authored damage stages rather than physical structural fracture; small street dressing and terrain remain scenery. Animation uses procedural 3D joints rather than sprite-frame sheets.
