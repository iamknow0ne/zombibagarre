# 4.36 / Illustrated field archive and completion pass

This release closes the alternate-camera aiming gap, improves busy-scene performance and integrates original survivor and boss illustrations. It builds on the existing campaign, RPG, destruction, weather, controller and Focus systems; it is not a claim that every possible device or game state has been exhaustively tested.

## Player-facing changes

- Eight original painted portraits in two atlases: four survivor identities and four Warden families. The World Dossier now includes a Warden chapter with origins, attack cues and regional variations. Named survivor entries connect the portraits to customization. Identity choices have artwork while the actual 3D equipment preview remains accurate.
- All eight raster assets have optimized WebP delivery copies. The six existing city/world images total **2,954,660 bytes**, down from **16,380,640 bytes** (82% less), without changing dimensions. New portrait atlases add 835,974 bytes and load only where used. Original PNGs are retained. Texture-load failures are removed from the promise cache so a later request can retry.
- FPS/TPS crosshair targeting now resolves height, bodies, cover and ground. Manual headshots depend on actual impact height. Looking above an enemy misses; low cover can be shot over. Guns, muzzle particles and flame jets follow aim pitch; first-person arms avoid applying pitch twice. Arc fire requires a target under the crosshair in these views.
- Perspective rounds pass over water until they reach its surface. Impact marks and debris follow the height of upper-storey and roof hits. Airbursts carry their elevation into effects and damage; distant ground targets and water below cannot be hit merely because they share the same map position. Diorama retains its established aim assistance and ground-targeted weapon behavior.
- Broad-phase city and crowded-projectile collision queries reduce nearby-hit work while preserving exact swept collision checks, moving vehicles and stable contact order. Balanced uses existing ground-contact shading for ordinary enemies; High retains full articulated shadows. Boss and hero shadows remain.
- The campaign QA bot now keeps its evacuation destination during the city extraction state. This fixes the QA harness, not player extraction logic. The touch fixture also waits for the resumed iframe to refresh disabled controls before sending a synthetic touch; parent-panel clicks otherwise caused false-negative Focus checks.

## Performance evidence

Same local browser, 1280 × 720, Balanced, fixed seed 20261012, 60 enemies and dual flame/arc. 60 warm-up frames, then 180 measured frames. Benchmarks are short desktop samples, not a guarantee for phones or Steam Deck.

| Metric | Baseline | Final isolated run |
| --- | ---: | ---: |
| FPS | 80.3 | 104.0 |
| Mean frame time | 12.45 ms | 9.62 ms |
| Frame time p95 | 17.4 ms | 16.9 ms |
| Mean simulation time | 2.86 ms | 1.66 ms |
| Mean world time | 8.34 ms | 7.15 ms |
| Mean draw calls | 1,284 | 1,080 |
| Mean triangles | 283,249 | 227,241 |

An intermediate run with another game view and campaign checks active measured 54.7 FPS, illustrating why background workload matters. An earlier collision-only run measured 84.5 FPS / 1.88 ms simulation. The structural reduction in draw calls is more repeatable than a single FPS number. Reproduce with `dev/performance-qa.html`.

## Verification

- 278 automated tests and the production build pass. Coverage includes combat, melee contact timing, gun evolution, critical hits, Focus, gamepad bindings/haptics protocols, mobile dodge input, inventory/skills/quests, topology, vehicle collisions, weather, fires/water, surface blood, collapse, boss attacks and effects, rendering/cutaways and save normalization.
- New tests: 1,500 randomized spatial queries over 700 obstacles; moving vehicles and geometry invalidation; height-aware contacts, cover/ground/sky/headshots/water/airbursts; aim/reload/recoil grip continuity across firearm types; shadow quality restoration; existence and byte integrity of all runtime art atlases.
- All 32 biome-campaign waves completed at relaxed, standard and nightmare with the deterministic combat bot. Open city completed all 32 waves and extraction at standard. Results: relaxed 1,556 kills / 1,225.8 simulated seconds; standard 1,594 / 1,316.5; nightmare 1,580 / 1,263.8; city standard 1,608 / 1,052.7. This checks completion, not a substitute for human difficulty evaluation.
- Browser: desktop dossier and customization, 390 × 844 portrait phone layout without horizontal overflow, character selection, sharp city textures/sprites, TPS and FPS rendering. Perspective range confirms FPS and TPS headshots (206.25 damage), tall cover blocks (one impact / no enemy damage), low cover permits a headshot, and sky aiming misses. No captured browser errors in the perspective range. The scripted phone fixture confirms a moving-stick dodge and active Focus dive at 0.32 world speed while firing; the busy 844 × 390 landscape HUD was visually inspected.
- Originals, generation prompts and runtime mappings: [portrait asset record](art/PORTRAITS-4.36.md). Browser evidence: `docs/screenshots/*4.36.png`.

## Feature audit boundaries

| Area | Current implementation and validation |
| --- | --- |
| Campaign and open city | 32 waves, eight biome campaign, multiple city forms, extraction; automated full completions |
| Arsenal | 13 weapons, primary melee, paired ranged slots, four evolutions, melee combos, four throwable types; simulation and animation tests |
| RPG | Permanent hero, skills/attributes, tiered armour and appearance, shops, contracts, hidden encounters/relics, notices, quest tracking/map guidance; progression and quest tests |
| World | Degradable buildings, collapse fragments/rubble collisions, material debris, blood on surfaces, fire propagation, water cooling, rain/snow/night logic; environment/destruction tests |
| Bosses | Authored large rigs, phases, duel encounter scheduling, warning/impact geometry, family VFX and field-guide lore; boss tests |
| Presentation | Classic/sharp/retro, two themes, three grades, detail controls, day/weather, illustrated lore, character customization, loading; asset/browser checks |
| Controls | Keyboard/mouse, touch, Gamepad, independent hands/wheels, controller diagrams, Focus, fullscreen, vibration and optional WebHID; automated controls/protocol tests |
| Alternate cameras | FPS/TPS rendered and manual vertical firearm aiming tested; still experimental due to the game's ground-based world and remaining physical-device validation |

Not implemented: the previously proposed jumping, rooftop traversal and grappling design. These were research proposals, not existing controls. The city is a ground-based 2.5D game. Advanced DualSense trigger feel, Bluetooth/USB output and native Steam Deck/mobile ergonomics still require physical-device checks. Browsers do not expose every PS5 controller capability. No physical-hardware validation is claimed in this release.

## Visual review

Direction: an illustrated Saint-Roch field archive with grounded survivor identities and architectural boss folklore. Coal `#142125`, bone `#eee8d8`, amber `#f18147`; condensed display headings, mono controls, serif lore; 8/12px spacing and square field plates. Portraits support identity rather than replacing the real equipment model. Mobile uses one-column identity choices and scrollable dossiers. Buttons retain accessible names and pressed state, minimum 44px targets, visible focus and an always reachable dialog close. No new decorative animation or additional in-combat panel.

Self-review (5-point scale): specificity 5, hierarchy 4, typography 4, color discipline 5, responsive behavior 4, accessibility 4, motion restraint 5. This rates the changed UI, not a claim that the entire game's procedural models match the fidelity of its painted artwork. The compressed city textures retain readable edges and transparent sprite cutouts in the inspected browser views.
