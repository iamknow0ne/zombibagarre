# Zombie Bagarre — Quarantine

[Play in your browser](https://iamknow0ne.github.io/zombibagarre/) — share this link with friends. No installation or account is needed.

A single-player 2.5D survival game built with Three.js. Version 4.15 includes an open city with connected streets, ponds, fountains, a canal, bridges, drivable cars and a street atlas. Explore on foot or behind the wheel while surviving 32 escalating waves. The separate biome campaign retains eight generated environments: French quarter, docks, gardens, factories, jungle, snowy mountains, badlands and marsh.

## Play locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000/. WebGL and a modern browser are required. `npm run build` creates the production site in `dist`; `npm run preview` serves that build.

## What is in this version

- Open City is the default: a persistent generated city with one of four street-network families, variable nonrectangular boundaries and dimensions, independently destructible building wings, smaller infill houses, parks, canals, road bridges, discoverable supply landmarks and parked vehicles. Roads, plot positions, architecture, water and parking vary by seed. Destruction persists between waves.
- Seeded procedural district maps in Biome Campaign: four nonrectangular outlines, varying dimensions, cover placement, fuel clusters and boundary-aligned buildings vary each run. **New Map** previews a different route. The same run seed produces the same eight district layouts. These are bounded combat arenas, not infinite terrain.
- Ten weapons: carbine, shotgun, SMG, heavy revolver, piercing rifle, flamethrower, grenade launcher, electric projector, katana and dual swords. Pair any two firearms, including matching guns, with independent magazines and reloads. Selecting either blade replaces both guns.
- Four damage synergies plus matching-gun akimbo timing, 32 upgrade families with four tiers each, four perk combinations and eight supply pickups. Scrap buys four kinds of permanent upgrades, each with five ranks, at base camp.
- Burning enemies spread fire to nearby enemies and destructible trees/props. Electricity chains and marks charged targets. Frost slows enemies and gives visible ice feedback.
- Progressive building damage: bullet and blast scars, shattered panes, three stages of missing wall sections, then final collapse. Explosions damage the nearest wall face, so grenades work against the sides of large buildings.
- Four survivor outfits with distinct palettes and headgear; continuous joint animation blends footsteps, knees, elbows, idle breathing, aiming and sword swings.
- Katana and dual swords have three-hit combos, wider finishers, blade trails, limb cuts and timber damage. Blade stance grants 22% faster movement, a 1.1-second dodge cooldown and finisher dodge recovery.
- Six randomized fall poses with varied timing and twist, plus severed arms/legs, living legless crawlers, falling corpses, charred burn deaths and electrical spasms. Precision weapons have a higher headshot chance; all hits still use planar aiming. Gore can be disabled.
- Turbulent animated flames, rising smoke and embers, blast lighting and chained fuel explosions. Brick, concrete, wood, metal, glass and earth debris have different sizes, shapes, bounce and surface properties. Canal shots, explosions, falling debris and sinking cars produce spray and fading ripples.
- Seven enemy types and eight boss encounters using four distinct telegraphed attack archetypes. Three difficulty settings, pause on focus loss, game-over/retry, extraction/victory and local records.
- Original procedural scene assets and synthesized audio; no external asset or font downloads at runtime.

## New in 4.15.1

- Mobile dodge activates immediately on touch-down, including a second finger while the movement stick is held. The dodge follows movement direction and releasing the button leaves the stick active.
- Grenade, reload, weapon switching and auto-fire use the same multi-touch-safe button handling. Compatibility clicks cannot repeat a touch action; mouse and keyboard activation remain supported.

## New in 4.15 — permanent survivors, fresh expeditions

- Character levels persist up to level 30. Start with three points and gain two per level; allocate Vigor, Might, Agility, Focus and Fortune, or learn four passive skills. Free reallocation lets you try different builds.
- Equip 36 armour pieces across head, chest and legs, with Common, Rare, Epic and Legendary tiers. Pathfinder favours mobility, Bastion protection and Revenant damage. Armour and four dyes change the actual animated character and dossier portrait.
- Three city traders: Mara sells armour, Dr. Lenoir sells scout gear and healing, and Nocturne sells revenant gear and offers secret-encounter clues. Five contracts connect supply cases, combat, district exploration and the existing street encounters.
- Two optional named boss variants guard permanent relics: Ashbringer ignites with katana cuts; Tempest adds electric chains. Completing the street contracts also unlocks Black Star, a stronger, wider-blast launcher. Relics modify existing weapon families and retain their run-local weapon evolutions.
- Open **Character** on the title screen or **Pause → Character & Journal**. Track contacts and revealed secrets on the atlas, approach on foot, then press V / Triangle / the touch interaction button. Trading pauses combat. The dossier has controller navigation, touch-sized controls and a persistent Back button.
- Levels, allocated points, learned skills and discovered equipment are saved in this browser. Crowns, accepted/completed quests, world discoveries and wave upgrades reset every expedition. Existing Base Camp scrap upgrades remain separate. There is no cloud save or expedition save/resume.

## New in 4.14.1

- Restored easy point-to-drive handling: cars turn toward the stick even from rest, slow automatically for tight corners and stop promptly when released. No sideways drift in easy mode.
- Touch always uses easy handling. It is also the default for new keyboard/controller settings; existing saved driving preferences are preserved, and steering/pedals remain available in Settings → Driving.
- All eight vehicle profiles retain their collision bodies, health, reversing and ramming behaviour.

## New in 4.14

- Mobile combat uses a compact health/wave/ammo header and separate thumb controls. The minimap becomes a map button; detailed score, evolution, buffs and encounters move into pause, alongside Arsenal and Street Map shortcuts.
- Boss bars and short notifications occupy dedicated upper lanes. Floating damage and enemy bars avoid touch controls and HUD plates, with a lower mobile density.
- Portrait, small phones and short landscape screens have distinct spacing. Driving keeps only the steering stick, reverse, brake, exit and essential vehicle readout.
- Verified in browser at 390×844, 320×568 and 844×390 with scripted touch gestures. Physical-phone Safari/Chrome testing remains a separate device check.

## New in 4.13

- Buildings shed independently falling masonry and floor sections, with gravity, wall and roof collisions, secondary fractures, impact dust, and destructible rubble cover. Durability and debris quantity scale with building size.
- Fire spreads through combustible facade bays and neighbouring foliage, consumes fuel and leaves scorch marks. Water impacts extinguish nearby fire and briefly prevent reignition; larger water explosions reach farther.
- Generated parks include ponds, reeds, lily pads and fountains with animated jets and ripples. Additional trees occupy vacant ground while preserving street routes, with subtle canopy motion.
- The structural simulation is bounded and uses coarse collision bodies and pile support for browser performance. It is not a full structural-engineering or fluid solver. Very old debris and its matching colliders retire when the shared budget is reached.

## New in 4.12

- **32 upgrade families, each with four run-local tiers:** Common (bone), Rare (blue), Epic (violet) and Legendary (gold). Every family has its own vector icon. Cards show the next benefit, owned-to-next rank and four rank bars. Your Build lists all acquired perks and their tiers.
- Taking an owned upgrade evolves it by one tier; Legendary is the cap. Rare/Epic/Legendary offers unlock after clearing waves 3/7/12. Each new offer favors a combat, survival and utility choice, avoids the previous trio when possible, and weights owned perks so focused builds can evolve. Weapon-specific perks require a matching equipped weapon or effect.
- Seventeen new upgrade paths include dodge shield/ambush, wave armour and grenade supply, critical power, boss hunting, close/long-range attacks, finishing wounded enemies, blade-finisher healing, elemental specialization, reload/pickup healing, faster mastery and vehicle repair.
- Two rerolls per run, with one more after each boss wave (five stored maximum). Rerolls replace the trio without advancing the wave. All tiers reset on a new run; permanent Base Camp progression is unchanged.
- Existing perk gains are rebalanced for capped ranks: Deadeye grants 12 percentage points per tier; Vital Strike can raise critical damage above its base ×2. The arsenal shows the current multiplier. Choice cards, rerolls and the build collection work with touch, keyboard and controller.

## New in 4.11

- Rebuilt mobile controls around two independent thumb zones: left moves, right aims and attacks. Floating sticks start under your thumbs; fixed placement is available in Settings. Dodge, grenade, reload and weapon switching use larger buttons with live cooldown/ammunition feedback.
- Touch aim assist follows nearby visible enemies in your aim direction. AUTO toggles automatic targeting; the arsenal supports choosing both guns or a blade. Driving uses the left stick with release-to-brake and large reverse/brake controls.
- Drag the city map to pan, pinch to zoom and tap to mark. Gestures no longer place unwanted markers. Rotation, interruptions and cancelled touches clear held controls safely.
- Settings save touch placement, size, opacity and aim assist. Portrait, landscape and small-phone HUDs leave more room for the action, respect screen safe areas and use a closer on-foot camera. First-time touchscreen players start with Balanced graphics.

## New in 4.10

- Floating damage numbers use bone for bullets, orange for fire, cyan for electricity, coral for blasts and pale green for blades. Headshots, finishers and critical hits get distinct callouts. Number size follows calculated damage, including evolution, perks, synergies and overkill; rapid hits are combined into short bursts.
- Recently wounded enemies show compact health bars with a delayed damage trail. Dense fights prioritize heavier/critical hits and suppress overlapping indicators. Feedback is bounded and reduced-motion mode removes drift and impact scaling.
- All ten weapons have their own base critical chance (2–16%). Critical hits deal double damage, each evolution adds 2 percentage points, and Deadeye adds 20 points, capped at 80% total. Headshots multiply by 1.65 and can also be critical. Lingering burn ticks cannot critically hit. Check current weapon chances in the arsenal.
- Settings independently control damage numbers, enemy/boss health bars, critical emphasis and damage colors. These display preferences persist and work with keyboard, touch and controller menus; they do not disable the combat mechanics.
- Development-only `/dev/combat-qa.html` demonstrates damage types, power growth and a crowded encounter. The phone QA page can also show combat feedback at 390×844.

## New in 4.9

- Four genuinely different city plans: **Old Town** has irregular rings and spokes; **River Port** bends around a cut-in waterfront; **Valley Town** stretches along a crooked main street; **Hill Districts** connects separate neighbourhood loops. Hill Districts names the layout family; terrain remains level.
- Seeded road bends, junction positions, loop counts, city outlines, dimensions, canals, crossings and large/small building plots replace the fixed square grid. The same seed reproduces the same city. New Map avoids immediately repeating the previous city family.
- The street atlas, rendered roads, collision boundaries, enemy spawn points, encounters, landmarks and parked vehicles consume the same generated plan. Concave boundaries block paths that would cut across empty space outside the city.
- Local `/dev/city-qa.html` compares four actual generated atlases and links to their 3D inspection scenes. It is excluded from the published game.

## New in 4.8

- Rebuilt all ten weapon models with distinct receivers, barrels, grips, mechanical parts and material finishes. Four evolution appearances per weapon add visible hardware, culminating in named Signature weapons. The armoury shows portraits rendered from the actual models.
- Four procedural firing or cutting variations per weapon, plus weapon-specific reload poses, moving pumps/bolts/cylinders, timed casing ejection and hand-following grips. These are blended procedural animations, not motion-capture clips.
- Earn run-local weapon mastery from actual damage to enemies: **Field → Modified at 1,000 → Elite at 3,500 → Signature at 8,000** total damage. Mastery survives weapon switches and resets on a new run. Matching guns share mastery while keeping separate magazines. Field Armorer grants 650 mastery to each distinct equipped weapon type.
- Signature effects include incendiary shotgun pellets, ricocheting SMG rounds, explosive fourth revolver shots, penetrating rifle airbursts, blue-core flame jets/fire pools, launcher subcharges, longer electrical cascades and blade finisher waves. Other tiers improve damage, handling, capacity and weapon-specific stats.
- Blood now adheres to actual walls, intact windows, props, vehicle bodywork and raised pavement, with irregular splashes, smaller droplets and vertical runs. Stains move with their surface, disappear with destroyed geometry, and darken as they dry. Gore settings clear existing blood and remains.
- Softer directional muzzle flashes, distinct tracers, branching electricity, flame jets, material-aware impact shards/sparks and scaled explosions. Debris tumbles, bounces, loses energy and splashes in water.
- Bullets hit the nearest contact along their path, including thin cover at close range. Penetration loses damage, heavy enemies resist knockback, and launcher rounds follow gravity before bursting. Secondary explosions are finite and visual effects stay capped.

## New in 4.7

- Eight distinct vehicles: sedan, sports coupe, patrol interceptor, delivery van, pickup, ambulance, armoured carrier and dune buggy. Each has its own dimensions, acceleration, top speed, grip and durability.
- Speed-dependent steering, analog pedals, service braking into reverse, handbrake slides, full-body collisions and safer exits. Turning wheels, brake lights, suspension movement, engine pitch and collision feedback follow the vehicle.
- Racing and assisted driving styles plus steering sensitivity in Settings. A driving dashboard shows speed, gear, hull and current controls. Touch steering brakes when released, with separate brake/reverse buttons.
- Firearm loadouts cannot render stale blade attachments. Switching out of melee clears blade trails immediately, including while paused. Reload any older open game tab to load this version.

## New in 4.6

- Seeded building plots mix detached buildings, paired buildings with alleys, L-shaped corners, open courtyards and stepped wings; plans rotate and shift within each block.
- One to seven storeys, varied widths and depths, flat roofs, pitched roofs, terraces and lower annexes break up the skyline. Factory and waterfront buildings retain their district character.
- Windows, awnings and signs fit the generated facade widths. Collision and destruction follow each actual wing, leaving alleys and courtyards usable. Prop and parking clearance protect these routes.
- Biome campaign facades also vary in width, height, setback and spacing. That release retained the fixed city grid, which v4.9 replaces with generated street networks.

## New in 4.5

- Articulated grips keep both hands on each weapon, with distinct firearm models, recoil, moving actions, magazines, muzzle flashes and spent casings.
- Distance-driven footsteps, strafing and backpedalling, plus shoulder movement and a settled firing stance.
- Katana and twin-sword anticipation, contact and recovery; damage lands at contact. Hold to combo, tap late to buffer the next stroke, or dodge to cancel. Blade trails follow the actual steel.
- Distinct firearm sound envelopes and stronger melee finisher feedback. Gamepad, keyboard/mouse and touch share the same combat timing.
- Local `/dev/weapon-qa.html` tests close-up poses, reloads and eight-second movement/attack sequences without touching saved progress.

## Controller pass (4.4)

- Independent hand attacks, fully remappable controller combat controls and controller-aware prompts.
- Controller navigation through menus, settings, loadouts, upgrades and the atlas; free map crosshair, zoom/pan, marker removal and layer filters.
- Optional vibration and experimental direct DualSense trigger/lightbar output with lifecycle reset handling.
- Manual touch aim/fire, with a revised narrow-screen control layout.

## City detail pass (4.3)

- Five city architecture styles: shuttered apartments, balcony hotels, a civic clock tower, industrial sheds and dock warehouses. Tiled roofs, dormers, vents, water tanks, storefront awnings, posters, lit windows and street signs add detail.
- Paved sidewalks, crossings, drains, irregular wet patches and planted parks with paths, benches, fountains, flower beds or pavilions.
- Camera-blocking buildings cut away to low walls, keeping the survivor and nearby fighting visible. Rooftop accessories disappear when their roof is destroyed.
- Six civilian outfit/headgear combinations, facial details, rounded torsos and articulated tapered arms. Corpses retain the living enemy's appearance.
- Three seeded optional city encounters: clear a supply convoy for ammunition and grenades; secure a radio relay on foot for armour; defeat an enforcer for maximum health. Find the amber squares on the atlas. Each reward is granted once per run, and encounter progress survives wave transitions.
- Shared sign materials, textured mesh batching and selective shadows keep small decorations from consuming unnecessary rendering work.

## Controls

| Action | Desktop |
| --- | --- |
| Move | WASD / ZQSD / arrows, or right-click a destination |
| Aim and shoot | Mouse; hold left button for manual fire |
| Toggle auto targeting/fire | T or the HUD button |
| Dodge / melee / grenade | Space / F / E |
| Reload equipped guns | R |
| Change lead weapon | 1–8 ranged; 9 katana; 0 dual swords; wheel cycles the right-hand weapon |
| Enter / exit vehicle | V or vehicle button |
| Drive / brake | W/S accelerate, brake and reverse; A/D steer; Space handbrake |
| City atlas / waypoint | M; click a street or landmark |
| Configure two guns or one blade | B / Arsenal |
| Pause | P / Escape |

### DualSense / standard gamepads

Connect by USB or Bluetooth, focus the game and press a button. Settings includes remappable combat buttons, L2/R3 and L2/R2 presets, move/aim dead zones, aim response, aim assist, inversion, vibration intensity and button-symbol selection. Reassigning an occupied button swaps the two actions to avoid conflicts. The active input selects keyboard or PlayStation/Xbox/numbered prompts.

| Action | Default DualSense mapping |
| --- | --- |
| Move / aim | Left / right stick |
| Right weapon / left weapon | R3 / L2 (L2/R2 preset available) |
| Grenade / dodge | L1 / Cross |
| Reload / enter or exit car | Square / Triangle |
| Drive | R2 accelerate, L2 brake/reverse, left stick steer, Circle handbrake |
| Cycle right weapon | R1 / D-pad Left |
| Toggle auto fire / arsenal | L3 / D-pad Up |
| Map / pause | Create or touchpad click / Options |
| Menus | D-pad or left stick moves focus; Cross selects; Circle returns; left/right adjusts values |
| Atlas | Right stick cursor, left stick pan, L2/R2 zoom, Cross mark, Square clear, R3 centre; D-pad reaches filters and destinations |

Manual controller attacks fire only the chosen hand and override auto fire while held. Either attack button swings an equipped blade. A visible aiming reticle and a Triangle prompt above nearby cars clarify the target. Keyboard/mouse fire still fires the equipped guns together. Disconnecting pauses active play. Release controls after closing a menu to prevent accidental attacks.

Weapon-specific vibration uses the browser's supported actuator; unsupported devices continue without feedback. **Settings → DualSense extras → Connect DualSense** optionally opens the WebHID device chooser in compatible desktop browsers. Direct output supports standard DualSense and Edge IDs, USB and Bluetooth report framing, per-weapon trigger resistance and a health lightbar. Trigger effects apply only to attacks assigned to L2/R2. They reset on pause, blur, disconnect and disable. This path is experimental: protocol/queue tests pass, but trigger feel and Bluetooth/USB hardware output have not been physically validated. Standard Gamepad vibration is not PS5 audio haptics; speaker, microphone and gyro are not used. The device chooser requires a mouse/touch gesture; gameplay and menus do not require WebHID.

While driving, combat buttons become driving controls. Settings offers racing steering or point-to-drive assistance; assisted keyboard reverse uses Shift. Stop before exiting with V / Triangle. On touch, release the stick to brake or hold the separate Reverse button.

On touchscreens, the left stick moves and the right stick aims/fires, including when auto fire is off. Dodge, grenade, melee, swap, reload, map and vehicle controls remain available. The 390×844 layout and pointer-drag control path have been checked; physical phone hardware has not been validated. Settings, records, scrap and upgrades use browser-local storage; runs are not saved mid-campaign.

## Verification

```sh
npm test                  # combat, rendering, controls, driving and generated maps
npm run test:campaign     # deterministic full-campaign bot, all difficulties
npm run test:campaign -- standard
npm run test:campaign -- standard city  # extended city simulation
npm run build
```

`/dev/visual-qa.html` on the development server is a staged effects test range using the real simulation and renderer. It freezes each scenario for inspection, offers small time steps, and never writes player saves. It is not included in the production bundle. Screenshots and detailed validation notes are in `docs/`. `/?controllerQA=1` in development exposes an explicitly labelled virtual-pad adapter for controller regression checks; it makes the test survivor invulnerable and suppresses record writes. It is stripped from production builds.

## Publishing

GitHub Pages deploys the production `dist/` artifact through `.github/workflows/pages.yml`. Every push to `main` runs a clean install, all tests and the build before deployment; pull requests run the same checks without publishing. Repository Settings → Pages must use **GitHub Actions** as the source. Vite uses relative asset URLs so the game loads under `/zombibagarre/`. Build outputs and local environment files are ignored. The repository preserves the former game code for reference.

The new loading screen reports initialization stages and warms rendering materials before showing the menu. All gameplay runs in the browser; there is no multiplayer server. Progress is local to each browser and origin, so localhost records do not transfer to the public site.

## Source layout

`src/rebuild/Simulation.js` owns gameplay, `Map.js` and `City.js` generate the shared collision/render plans; `Effects.js` defines material debris and death motion; `Atlas.js` draws the street map, `World.js` renders it, and `Input.js` / `Audio.js` handle controls and sound. `src/main.js` connects these to the interface. The former implementation remains in `src/legacy-main.js` and `legacy-3d.html` for reference; the main page imports only the rebuilt game.

The city is a finite free-roaming survival map, not a GTA mission/traffic simulation. Buildings collapse through authored damage stages rather than physical structural fracture; small street dressing and terrain remain scenery. Animation uses procedural 3D joints rather than sprite-frame sheets.
