# Quarantine rebuild — design and validation

## Direction

Stylized 2.5D survival action: orthographic perspective, planar movement, sculpted French buildings and animated characters. Cold dusk, amber lamps, subdued materials, visible combat feedback and an unobstructed aiming area. Coal, concrete, bone and emergency orange; condensed display typography with small operational labels. The rendered world doubles as title artwork. Graphics are procedural low-poly assets, not a claim of AAA studio asset fidelity.

## Implementation

Eight generated biomes and 32 waves, with a boss every fourth wave and final extraction. Seeded layouts vary from 52–72 units wide and 44–58 deep, using four outlines: broken block, crossroads, highland basin and river bend. Jungle, mountains, badlands and marsh extend the original city, docks, gardens and foundry. Each district has its own boss name and appearance palette; the eight encounters reuse four attack archetypes.

Layout generation reserves arrival, boss and extraction space; validates the playable polygon and cover connectivity at boss radius; and derives safe spawn points from the actual boundary. Movement, dashes, direct routes and pathfinding respect concave edges. Buildings follow boundary segments. Each district derives its own seed independently of combat randomness.

Version 4.2 allows two firearms or one exclusive melee weapon. Guns target, fire and reload independently. Weapon pairs unlock plasma arc, shattershot, double tap and breach & clear, while matching guns use staggered akimbo fire; perks add thermal shock, deadshot, second wind and demolitionist. Four permanent upgrade tracks supplement run-specific perks.

Breakable objects include cars, barriers, planted trees, crates, barrels, rocks, urban facades and individual industrial buildings. Buildings have 2,400 health and three degradation stages at 75%, 50% and 25% remaining health. Impacts leave soot/crack decals and shatter panes; stage transitions strip wall sections and throw masonry before final collapse. Blast damage uses the nearest surface rather than the building center. Small set dressing, wilderness perimeter trees/mountains and the ground/boundary remain scenery. This is staged visual destruction, not a rigid-body fracture simulation.

Ballistic headshots are chance-based (32% rifle, 22% revolver, 7% other ballistic weapons) with extra damage and head fragments. Surviving heavy hits may sever an arm or legs; crawlers continue attacking at reduced speed and damage. Death visuals distinguish ordinary shots, exploding heads, blast dismemberment, burns and electrocution. Gore settings suppress fragments and blood. Flames use animated fractal noise, turbulence, changing opacity and rising embers; explosion debris varies in scale, shape, spin, velocity and bounce.

## Earlier validation — biome expansion (before 4.1)

- 32 automated gameplay/map tests passed, including 320 generated layouts (40 seeds in all eight biomes), deterministic generation, varied dimensions/outlines, connected boss-sized routes and concave-boundary movement.
- Regression tests cover nearest-face blast damage, gradual building degradation, cursor-directed grenades while auto firing, live crawling injuries and death-event causes, alongside the existing weapons, synergies, progression and effects checks.
- The full standard-difficulty 32-wave simulation completed with normal combat damage and no invulnerability: victory after 1,388 simulated seconds and 1,664 kills. The bot exercises simulation geometry and generated cover; browser-created facade colliders are tested separately. This is not a manual campaign playthrough or a comprehensive balance study. Earlier 16-wave checks passed all difficulties; the extended relaxed/nightmare campaigns have not been rerun.
- Browser-rendered test range: all eight biomes inspected; building test showed 4 shattered panes after one grenade and, after nine, stage 2 damage with 12 missing sections and 21 broken windows while the building remained standing. Death range showed four distinct deaths plus a living crawler and an arm injury. Fire range confirmed four burning/electrified enemies and an ignited prop. Chain-explosion range showed eight corpses, three destroyed props and mixed debris.
- Screenshot review prompted fixes to buildings floating beyond concave terrain, industrial prefab placement, wilderness road markings, flame color/shape, perimeter tree foundations and foreground mountain height.
- Fixed a mixed-geometry batching defect that could drop charred corpse parts. Added a renderer regression test and rechecked settled death animations with no browser warnings/errors.
- Production build and normal browser startup/combat checked. Previous rebuild checks covered desktop and narrow layouts, pause/resume, arsenal, settings and retry. Real touch hardware and performance on other GPUs have not been validated.

## Evidence

`docs/screenshots/` contains actual browser captures. Files from the visual range are explicitly labelled “STAGED QA”; they exercise real game events but do not represent a normal campaign save. `scripts/campaign-check.mjs` reproduces the full-campaign check. The development-only range at `/dev/visual-qa.html` supports repeatable visual inspection without altering local records.


## 4.1 open city, vehicles and material effects

Default Open City uses a 232×232 connected grid, 22 destructible buildings, four canal crossings and seeded building heights, dimensions, materials, trees, cover and parked vehicles. Eight landmarks reward exploration; their names reference campaign locations, but the city itself renders urban, park and industrial areas. The original eight-biome campaign remains selectable. City geometry and damage persist through the 32-wave progression; distant ordinary enemies relocate to the vicinity of the player. The atlas pauses action and supports street/landmark waypoints; its line is a destination bearing, not turn-by-turn routing.

V enters or exits nearby cars. Directional steering has acceleration, angular smoothing, coasting and Space braking. Vehicle hull absorbs attacks, impacts damage cars, speed determines ramming damage, and entering the canal sinks the vehicle and ejects the survivor onto the last safe ground. Vehicles share a base car body and arcade handling; there is no traffic AI or general rigid-body physics.

Katana and dual swords extend the arsenal to ten weapons and add Blade Dance. Both can be equipped alongside guns. Three-hit sequences alternate swings and widen the finisher; blades consume no ammunition, cut limbs and damage timber more strongly than masonry. Animation now uses continuously interpolated body, knee and elbow motion, with idle breathing, movement blending and sword twists. Scout, Medic, Rider and Ronin have distinct palettes and headgear.

Deaths select among six fall poses with randomized speed and twist, combined with existing headshot, explosion, burn, electricity and crawling outcomes. Brick, concrete, wood, metal, glass and earth debris use separate profiles for geometry, fragment size, surface, spin and bounce. Falling particles detect water and trigger appropriately sized splashes. Small splashes are grouped spatially to avoid a pile of bright rings. Water explosions suppress flames and use pale spray/smoke; dock and canal surfaces use their correct elevations.

Buildings shed roughly 24%, 48% and 72% of exterior sections across their three damage stages. Final destruction sinks and tilts the structure, removes collision and leaves scattered rubble. Facade panels and windows are combined into material batches for rendering, then rebuilt after damage. Source sections retain their damage state, so batching does not restore broken walls. Foreground buildings fade only when they intersect the camera-to-survivor line. The city overview uses a more distant camera to avoid clipping.

### 4.1 validation

- All 40 automated tests and the production build passed. The build retains a warning about the Three.js chunk size.
- City tests cover deterministic generation, connected streets, persistent destruction, bridges versus canal routes, car acceleration/braking/ramming, wall collision, safe exit, sinking, water shots/blasts, sword combos, varied deaths and routes around city blocks. A coarse-grid distance penalty initially stalled enemies at corners; normalizing it to the grid spacing fixed the reproduced case.
- Renderer regression checks verify mixed-geometry corpse batching and intact/broken facade batches, including fading and material restoration.
- Standard-difficulty open-city bot completed all 32 waves and extraction with normal combat damage: victory at 1,125.3 simulated seconds, 1,660 kills, 280 final health and no remaining enemies. This run includes city building colliders and uses a 30 Hz simulation step. It does not prove player balance on every seed or a manual full playthrough.
- Browser: normal city start, vehicle entry and paused atlas; staged car movement, sword combo, canal explosion, falling metal fragments, six consecutive deaths and repeated facade blasts through complete collapse. Nine facade blasts reached stage 2 with 59 missing panels; sixteen collapsed the building. Six ordinary deaths selected poses [2, 5, 1, 3, 0, 5].
- Visual QA fixed canal asphalt occlusion, premature water-droplet removal, excessive splash rings/exhaust, incorrect vehicle orientation, overly broad building fading and city overview clipping. Material batches reduce facade draw calls without removing destructibility. Four nearby dynamic lamps supplement emissive street lights; transparent smoke cards are excluded from the ambient-occlusion pass to prevent rectangular shadows.
- Screenshots in `docs/screenshots/` are actual browser renders. Staged scenes are labelled as such. No real touch-device or cross-GPU certification is implied.

Design review: the existing coal/bone/amber interface, condensed labels and square controls remain consistent. The atlas is functional street navigation rather than a generic dashboard. City scale, map legibility and combat visibility are improved; the procedural low-poly art still has visible repetition and should not be described as photorealistic or AAA asset production.


## 4.2 controller, loadouts and public browser release

DualSense uses the browser standard Gamepad mapping with radial stick dead zones, twin-stick movement/aiming, R2 fire, L1 grenades, dodge, reload, vehicle controls, map, arsenal and pause. Menu navigation handles buttons, native selects and sliders. Input must return to neutral after menus; disconnecting pauses play. The actual connected controller was detected in the Mac browser. Automated mapping checks cover analog axes, button edges and disconnection; that is separate from a complete hands-on hardware playthrough.

Two firearm slots accept mixed or matching guns. Matching guns maintain independent magazines, cooldowns and reloads; reload acts on both. Melee is exclusive through the arsenal and number-key switching. Blade stance adds movement speed, quicker invulnerable dodges and finisher recovery. Models hide all firearms while a blade is selected.

Grenades visibly travel on a tumbling arc before landing and detonating. Debris uses twelve irregular closed mesh variants per material, with differing silhouettes, thickness, scale and spin. Rubble uses the same fragments; sparks and embers no longer use cuboids. Blast-shattered windows now immediately rebuild the facade batch.

Loading is a field-transmission screen with large condensed type, an original line-art skyline, real initialization milestones, a progress indicator and a retry state. Shader compilation occurs before the menu opens. No remote assets or fonts are required. GitHub Actions builds and deploys the tested production artifact with relative asset paths.

### 4.2 validation

- All 47 automated tests passed, including 320 generated districts, independent duplicate-gun ammunition, exclusive melee, ninja movement/finishers, grenade trajectory, controller sampling and varied debris meshes.
- Standard-difficulty city simulation completed 32 waves and extraction using only launcher + arc, normal damage and no invulnerability: 1,282.4 simulated seconds, 1,663 kills, 190 health, zero enemies remaining. This is deterministic simulation evidence, not a manual full playthrough.
- Actual browser inspection: loading screen to ready, hardware controller detection, arsenal main/off-hand selectors, matching guns, disabled off-hand in blade stance, visible thrown grenade frozen at 2.14 units above ground, chain explosions with 67 material fragments and 14 gibs, eight corpses spanning all six poses, and sword-only rendering with two live crawlers. No console errors in the staged renderer.
- Visual fixes from review: grenade enlarged for readability at the gameplay camera; blade icons replace the old rifle silhouettes; focus survives arsenal re-rendering; blast glass batching updates in the same event.

Design review (1–5): hierarchy 4, product specificity 4, consistency 4, interaction clarity 4, responsiveness 4. The loading screen uses the established coal/bone/amber system, square controls and operational typography. Progress and menu focus have accessible labels; reduced motion remains available. The art remains stylized procedural low-poly, with repetitive character construction and no claim of photorealistic or AAA production quality.


## 4.3 inhabited streets and encounter variety

Design intent: preserve the coal/bone/amber field interface and condensed display type while making the world more recognisable at gameplay distance. Priorities were repeated silhouettes, flat street materials, identical enemies and buildings masking the hero. Use geometry and material detail tied to the setting, rather than full-screen decorative effects. UI additions use an 8/12/16 px rhythm, square edges, operational mono labels and a small left-side radio readout; they do not compete with aiming or wave information.

City buildings now derive one of five architectural styles from their block: tenement, hotel, civic, foundry or warehouse. Rooflines, fixtures, warm windows, shutters, balconies, striped awnings, loading doors, industrial metal panels/pipes, posters and addresses differentiate them. Streets add paving, drainage, crossings, signage and irregular wet patches. Parks have textured lawns, paths and one of three central furniture arrangements. Decorative street furniture remains scenery; existing cover and buildings retain their collision/destruction rules.

Occlusion tests use parallel orthographic sightlines and a shoulder margin down to the feet. Obstructing buildings clip to 0.7 m walls with a translucent footprint instead of stacking transparent floors over the player. Roof decorations are grouped with their parent roof, so destroyed roofs do not leave floating dormers. Five facade styles still use the staged structural destruction system.

Six civilian variants change clothing, headgear and facial details without consuming simulation randomness. Rounded torsos and tapered arms reduce the block shape; clothing and face details are batched separately from animated joints. Kill events carry appearance identity into corpses.

Three city side encounters are placed at reachable, separated street points using the run seed. Each has a distinct guard arrangement and reward. The relay requires eight uncontested seconds nearby on foot after its guards die; the convoy and enforcer require clearing their marked guards. Optional guards count towards the current wave and do not disappear when the player leaves. Completion is permanent for the run. Existing 32-wave progression and eight-biome campaign remain intact.

Validation:
- 52 automated checks cover the existing combat/campaign/maps, 40 city seeds for encounter placement, pause/contesting/vehicle restrictions, once-only rewards, guard persistence, roof-edge occlusion and textured/shadow-aware batching.
- The standard 32-wave city bot again reached victory at 1,282.4 simulated seconds with 1,663 kills, 190 health and no enemies. That central-street route does not exercise the optional encounters; those have separate scenario tests.
- Real browser renders inspected the central streets, foundry, gardens, six character variants, active relay guards and repeated facade damage. Nine facade blasts reached stage 2 with 59 missing sections and 42 broken windows. Test-range screenshots are labelled staged.
- A five-second high-quality, static-city motion check in the local in-app browser improved from roughly 35 to 42 fps after reducing unnecessary decoration shadows (1,584 to 1,254 draw calls across rendering passes in that scene). This is a short local measurement, not a cross-device or crowded-combat performance guarantee. The Three.js bundle-size advisory remains.
- The richer assets are still procedural stylised models. The street grid remains fixed, with seeded placements and building parameters; small scenery is not structurally simulated. There is no claim of AAA asset fidelity.

Anti-slop review: AI Slop Score 1/10 (some common interface conventions remain); Distinctiveness 8/10. Signature elements are the French storefront vocabulary, field-transmission interface and readable architectural cutaways. Material and silhouette variety carry the polish. Remaining repetition is strongest in the fixed street grid and base humanoid anatomy.

The final browser pass also checked normal combat through the first upgrade, the three atlas destinations and a selected relay waypoint. At 390×844, wave status and vehicle/encounter labels were separated to avoid the minimap; the temporary viewport was restored after inspection. No real touch hardware certification is implied.
