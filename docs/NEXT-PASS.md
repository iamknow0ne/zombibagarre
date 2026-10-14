# Next gameplay and performance pass

14 October 2026. Apple signing/notarization, Steam Deck troubleshooting and other ports remain deferred, except the newly authorized SNES demake. Work is staged into tested releases, not an assertion that the whole game is finished.

## Completed milestone — performance and reliability

- [x] Capture fixed-seed city and combat frame-time baselines; add destruction/weather/long-session coverage.
- [x] Fix measured rendering hot paths or resource growth without lowering visible quality.
- [x] Audit vehicle, throwable and camera transitions; cover reproduced bugs. Continue the broader quest/control audit in subsequent slices.
- [ ] Complete a normal expedition through user-facing controls. First boss beaten, wave 5 reached, earned SMG unlock checked; full 32-wave human run remains pending.
- [x] Run 364-test regression suite, four campaign routes, and browser portrait/landscape checks. Physical controller/phone validation remains open.
- [x] Publish 4.42 browser and ad-hoc macOS update with measured results and limitations. Commit cc5358e; Pages and Mac CI passed; exact uploaded archive digest verified.

## Following milestones

- [x] Integrate the first low-platform Open City traversal route with height-aware combat and keyboard/controller/touch inputs (4.43).
- [ ] Extend traversal to curated service roofs with accurate parapet/accessory collision and elevated enemy threats.
- [ ] Finish perspective-mode aiming, collision and visibility validation.
- [x] Ship one useful enterable workshop and apartment loot quest, with stable identifiers and safe exits (4.44).
- [x] Implement the session-only city ↔ country-road roundtrip, guarded medicine delivery, safe arrival and preserved regional state. See [implementation and gates](REGIONAL-TRAVEL-DESIGN.md). Physical device checks remain open.
- [ ] Add launch/orbit/return and first moon as independently testable slices.

## QA inventory

Measure fixed seed, scene, quality, viewport, frame count, CPU stage time, draw calls, geometry/texture counts and frame-time percentiles. Compare repeat runs; do not label hosted/browser timings as phone or Deck FPS. Check pause/resume, restart, death/extraction, repeat quest rewards, cancelled touches and input-device transitions. Inspect visible combat, upgrade, map and settings states at desktop and phone sizes. Physical multitouch, controller haptic feel and sustained target-device thermals remain unverified without those devices.

## Ownership

Root: browser profiling, normal playthrough, integration and release. Performance subagent: rendering/effects/resource lifetimes. Gameplay subagent: simulation, progression and adversarial regression tests.

## Next concrete slice

Latest user priority: close the visual gap between the lore portraits and playable characters. The source/art review and first Rook reference sheet are saved in [character art direction](art-direction/CHARACTER-DIRECTION.md). A real anatomical/rigged prototype and reproducible Blender source now exist in `assets/characters` and `assets/source/rook`, with a standalone `/dev/character-art-qa.html` viewer and `scripts/art/validate-rook.mjs` check. This is a development asset only: no replacement character has shipped. Next refine Rook's facial likeness, garment construction and PBR maps, then authored combat animation and a rest-pose-aware runtime adapter. Validate the result in actual gameplay before expanding the pipeline. Do not claim the anatomical base or further procedural detail alone satisfies the art request.

The first low-platform city route and two-room workshop/apartment quest are implemented. Longer ordinary-expedition QA, perspective visibility/aiming and region travel remain open after this art milestone. Do not skip directly to procedural planets before travel, return and save semantics work. Indoor combat, indoor TPS/FPS and more room templates are separate extensions. Use two agents for isolated implementation/review work. See [4.44 evidence](RELEASE-4.44.md) and [the interior implementation](INTERIOR-INTEGRATION.md).

## 4.44 delivery checkpoint

462 automated tests and production build passed. Standard Open City bot completed all 32 waves. Browser fixture checks covered the workshop/apartment quest and compact portrait/landscape controls. Renderer disposal was tested over 50 room visits; hardware memory soak and physical controller/multitouch remain open. The exact Mac archive passed hardware startup with GPU enabled. Versioned output: `release/4.44.0`. Apple signing and Steam Deck remain deferred.

Runtime commit `2adb321` is published. Pages run 38571087231 and Mac run 38571335466 passed; the public menu shows 4.44.0 and the uploaded archive digest matches the locally tested ZIP.

## 4.43 delivery checkpoint

Runtime commit `b9dd004c65662be51cac1e89bd30f79f269b974e`: 435 tests passed; production build and final Apple Silicon hardware boot passed. Exact archive SHA-256 is recorded in RELEASE-4.43. The final package is in `release/4.43.0-verified`; older running 4.42 and 4.43 test windows were preserved. The user was actively interacting with the earlier 4.43 test app, so manual testing of the refreshed package was not forced. Pages run 38567261359 and macOS run 38567403722 passed, including hardware boot; uploaded archive digest matches. Apple ID/signing and Steam Deck remain deferred.

## 4.45 controls checkpoint

Keyboard rebinding and nine settings submenus are implemented. 483 regression tests and the production build passed; desktop/phone viewport checks and virtual-controller Back navigation were exercised. Mappings are included in backup/restore and rooftop training. See [4.45 evidence](RELEASE-4.45.md). The portrait-faithful Rook asset milestone above remains the next art priority.

## 4.45.1 perspective and art-production checkpoint

488 tests pass after correcting current-frame camera aim, initial look input
and avatar-fade material lifetime. This closes specific reproduced bugs, not
the entire perspective QA milestone. See [patch evidence](RELEASE-4.45.1.md).
The independent art validator imports the real GLB through Three.js and checks
all 50 meshes are skinned, finite attributes/weights and sampled deformation
for both clips. Geometry is about 69k triangles with 11 untextured materials;
mesh batching, LODs, painted materials and production motion remain open.

## 4.45.2 reliability and textured-study checkpoint

496 gameplay tests and production build passed. Material cleanup now releases
hidden originals during faded survivor/armour/weapon removal, preserves caches
and clears borrowed FPS references. Actual survivor reproduction: 0/13 original
materials released before, 13/13 after. Versioned Apple Silicon package hardware
startup passed; see [4.45.2 evidence](RELEASE-4.45.2.md). Full native expedition and
sustained hardware memory soak remain open.

Rook v2 is a separate textured development asset with a v1/v2 comparison viewer.
Skin and eyes/hair use pinned official CC0 data; canvas albedo is generated with
its exact prompt saved. Corrected eye cutouts and surface-fitted scarf panels
were reviewed in the browser. See [validation](art-direction/ROOK-VALIDATION.md).
The model still lacks Rook-specific likeness, complete painted materials and
production animation; do not enable it as the default hero yet. Continue those
quality gates before the runtime adapter, then expand to other characters.

## 4.46 regional travel checkpoint

The actual Open City now connects to seeded Old Mill Road through an on-foot
interaction, map markers and reciprocal signs. Lenoir offers a guarded medicine
delivery with a once-only return reward. Inactive regions freeze; returning
rebuilds damaged structures and moved vehicles without resetting the hero or city
wave. This is session-only expedition state, not a resumable save.

Automated coverage includes 50 roundtrips, safe/blocked arrival, renderer-preparation
rollback and actual navigation to gates across ten seeds. Browser fixture checks
have completed acceptance, real guard combat, collection, return and payment,
with the original damaged building health and spent magazine retained. 530 tests, four automated full campaigns, the production build and isolated Mac
hardware startup passed. See [release evidence](RELEASE-4.46.md). Runtime commit `766aeb7f3216ef00bca0273a5b828d7a89e679af` is published. Pages run
`38587969482` passed, the public loader reports 4.46.0, and GitHub’s uploaded
Mac archive digest matches the hardware-tested ZIP. Ordinary full playthrough
and physical devices remain open.

Next: service-roof traversal/collision and wider perspective checks; Rook portrait
likeness and authored combat animation; full ordinary expedition and sustained
native soak. Hangar/orbit/moon stay downstream of these first travel gates.

## 4.47 — newly authorized SNES demake / retro room

- [x] Original 256 KiB SNES survival cartridge and reproducible pinned SDK build.
- [x] The Last Checkpoint interior, atlas rumour, hero-level-3 unlock / sandbox bypass.
- [x] Lazy local emulator, frozen modern expedition, safe power-off return.
- [x] Browser boot/combat/retry/return and compact touch layout checks.
- [ ] Physical SNES, controller and phone verification.
- [ ] Expand the cartridge with authored stages, boss, music and saved progression.
- [ ] Add the remaining demakes as real cartridges before enabling their consoles.

See [4.47 evidence](RELEASE-4.47.md). The modern-game art and traversal checklist
above remains open; the new demake request did not complete those milestones.

Runtime commit `8a47128` and release `v4.47.0` are published, including the ROM
and the hardware-startup-tested, ad-hoc signed Apple Silicon app. SNES CI run
`38596857384` passed: the canonical Mac rebuild matches the released ROM exactly;
both Mac and Linux clean rebuilds are repeatable. Linux linker layout differs,
so its diagnostic ROM is not substituted into the tested release. The emulator
bundle hash check brings regression coverage to 545 tests.
