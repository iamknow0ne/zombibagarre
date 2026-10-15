# Next gameplay and performance pass

15 October 2026. Apple signing/notarization and Steam Deck troubleshooting remain deferred. The SNES demake and Android test edition are authorized; other ports remain deferred. Work is staged into tested releases, not an assertion that the whole game is finished.

## Vertical combat prerequisites — 4.52.1

- [x] Preserve actor-floor heights through wounds, remains, elemental reactions, melee/evolution effects and dropped loot; correct elevated nova/thermal origins.
- [x] Let hard cosmetic fragments land on roofs and remains fall after support loss; project raised blood onto nearby actual surfaces.
- [x] Stop paused corpse drift/particle accumulation; restore checkpoint weather controls consistently.
- [x] 679 regressions, 64 checkpoint continuations, production build and real browser effect/pause/weather-resume review.
- [x] Publish browser/Mac 4.52.1: source fcc3312, Pages 38737369692 passed, public BUILD 4.52.1 and clean captured startup checked. Mac hardware startup passed and uploaded ZIP digest matches.
- [ ] Before a roof encounter: floor-aware enemy movement/crowding, support-loss gravity, optional encounter isolation from wave completion, regional checkpoint ledger and height-aware reward support loss. Proposed first slice: one optional service-roof spitter guarding a cache, activated only on arrival.

See [release scope](RELEASE-4.52.1.md) and [QA evidence](qa/4.52.1/README.md). The developer elevated victim is staged; no rooftop enemy encounter is shipped yet.

## Resumable expeditions — 4.52.0

- [x] Separate bounded/versioned device checkpoint with explicit RNG state, active/parked regions and permanent-hero compatibility checks.
- [x] One-use paused restoration with pre-render validation and shared browser transaction locks.
- [x] Actual browser save/reload/restore, wave-one combat and wave-two upgrade/state preservation; compact landscape pause and portrait review.
- [x] Full final 656 regressions and 89 model checks passed in CI; 21 checkpoint/UI checks passed locally.
- [x] Publish browser/Mac 4.52.0 and update the local Android test APK without wiping saves. Source f82eed4; Pages 38734267560 passed 656 gameplay and 89 model checks; public BUILD 4.52.0 verified. Exact Mac archive passed hardware startup; upload digest matches.
- [ ] Finish clean physical-phone gameplay/performance/picker checks after the recurring Dolby system crash overlay is resolved.

See [release scope](RELEASE-4.52.0.md) and [QA evidence](qa/4.52.0/README.md).

## Release identity follow-up — 4.51.2

- [x] Generate title/loading/diagnostic version from package metadata and reject stale built labels before packaging.
- [x] Publish and verify corrected browser/Mac artifacts; update the local Android test install. Source ff53c54, Pages 38728843853 passed, public BUILD 4.51.2 verified with no console errors, uploaded Mac hash matches the hardware-startup-tested ZIP. Android visible device QA is still pending.

See [4.51.2 evidence](RELEASE-4.51.2.md). Gameplay/rendering is unchanged from the tested 4.51.1 patch.

## Reliability follow-up — 4.51.1

- [x] Prevent immediate falling-debris damage on region return and interior exit; cover both with actual collapse physics regressions.
- [x] Retry Android audio recovery after a rejected resume, without stale failures overriding later recovery.
- [x] Pass 635 regressions and a 6,000-frame browser combat resource check. Concurrent builds mean this is not an isolated FPS benchmark.
- [x] Publish 4.51.1 browser/macOS patch and update the Android test install. Public QA caught stale hard-coded labels; the 4.51.2 follow-up below corrects release identity.

See [4.51.1 evidence](RELEASE-4.51.1.md). The Android physical gameplay gate remains pending below.

## Android test edition — newly authorized

- [x] Add reproducible offline APK packaging, Android Back/lifecycle handling and native backup file pickers.
- [x] Build and verify the debug APK, including byte-identical game assets and signature; install/update it on the connected OnePlus 7 Pro (Android 11).
- [ ] Complete visible device gameplay, performance, save picker and background/resume checks. Phone unlocked and actual GPU/gameplay verified. Recurring Dolby Atmos system crash dialogs interrupt input and performance measurements; full touch, picker and endurance acceptance remain open.
- [ ] Publish an Android test milestone after actual device QA, clearly separate from a Play Store release and production signing.

See [Android build guide](ANDROID.md) and [device evidence](qa/android-4.51/README.md).
This platform is now authorized; Steam Deck and other deferred ports stay deferred.

## Active next work — world expansion

These items supersede historical “next” notes further down this file.

1. Finish the authorized Android physical-device checks once the recurring system crash dialog is resolved. Do not treat an activity launch, browser viewport emulation or CI build as phone gameplay evidence.
2. Add resumable expeditions before expanding travel: a separate versioned, bounded snapshot with explicit RNG state, region-qualified identities, corruption recovery and atomic restore. Permanent character saves must remain independently recoverable; 4.52.0 implements explicit safe-point Save & exit and paused resume; no automatic crash recovery or portable expedition backup.
3. Extend useful interiors and curated vertical encounters, with reliable return/collision/quest rewards and controller/touch interaction. The workshop/apartment and one service roof are implemented; indoor combat, indoor TPS/FPS and elevated enemy encounters are not complete.
4. Expand regional destinations and a late-run hidden-hangar quest, then ship launch/orbit/return and the first moon as separate tested slices. None of the spacecraft/planet milestones is implemented yet.

Continue ordinary full-expedition playthrough, native endurance and perspective
QA alongside those slices. Do not describe the entire game as complete based on
startup checks, short fixed-seed scenes or automated campaign simulations.

## Production cast — 4.51.0

- [x] Integrate distinct authored Saint, Torque and Vesper alongside Rook, with detailed first-person hands and per-identity distance geometry.
- [x] Preserve armour, custom dyes/hair/headwear and asynchronous portraits; add anatomical heads for customized survivors and traders.
- [x] Refine all six infected with shared textured head anatomy, organic surfaces and projected wounds; refine exposed boss faces and plant-boss forms.
- [x] Correct interior foot placement, overbright clothing dyes, eye seating and visible boss face occlusion.
- [x] 622 gameplay regressions, 89 actual-model art checks, production build and rendered cast/equipment/FPS/interior/boss/crawler review.
- [x] Publish browser and ad-hoc macOS 4.51.0: runtime 5af6fef, Pages 38723532216 passed, public BUILD 4.51.0 checked, uploaded ZIP digest matches the hardware-startup-tested archive.

See [4.51.0 evidence](RELEASE-4.51.0.md). Default-cast integration is complete;
custom garment variants remain stylized modular construction. Facial expression
animation and photorealistic likeness to painted lore art are not implemented.
Physical-device/endurance and broader gameplay gates below remain open.

## Character reliability follow-up — 4.50.1

- [x] Fix authored cap/hair clipping through helmets and buried enemy cheek wounds.
- [x] Correct live crawler direction, head orientation and ground-reaching arms while preserving gore and corpse behavior.
- [x] Losslessly pack the runtime Rook asset: 9.4% fewer bytes and four fewer resident textures in the controlled browser scene.
- [x] 611 gameplay regressions, 53 model/art checks, production build and browser helmet/wound/crawler review.
- [x] Publish browser and ad-hoc macOS 4.50.1: runtime 326883b, Pages 38712439117 passed, public BUILD 4.50.1 checked, uploaded ZIP digest matches the hardware-startup-tested archive.

See [4.50.1 evidence](RELEASE-4.50.1.md). Authored cast completion and target-device endurance remain open.

## Current character checkpoint — 4.50.0

- [x] Integrate authored default Rook v7 into the live world and interiors, preserving weapon grips, armour, fallback and resource ownership.
- [x] Refine all four survivor identities and three static traders; preserve customization and shop draw budgets.
- [x] Refine six ordinary enemy archetypes and eight boss surfaces; retain instancing, gore and authored combat poses.
- [x] 609 regression tests, 48 actual-model art checks, production build and browser cast/FPS/TPS/city/boss reviews.
- [x] Publish browser and Mac 4.50.0: runtime 73f5477, Pages 38710308987 passed, public BUILD 4.50.0 verified, exact uploaded Mac ZIP matched the hardware-startup-tested archive.
- [x] Integrate authored Saint/Torque/Vesper, anatomical infected, detailed FPS hands and LODs in 4.51.0. Painted-art photorealism is not claimed; see the current art boundary above.
- [ ] Sustain native and physical-device performance sessions; retain existing gameplay and traversal gates below.

See [4.50.0 evidence](RELEASE-4.50.0.md). The older development-only Rook notes below describe historical checkpoints; default Rook is now integrated in production.

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

## 4.49.1 perspective cover correction

- [x] Reproduce and fix electric shots starting beyond a close roof parapet.
- [x] 578 tests, build and actual FPS browser reproduction: two shots consumed,
  target health remains 1,000; clear elevated arcs and normal chains still pass.
- [x] Exact Mac package hardware startup passed; uploaded archive hash verified.
  Runtime `f400484`, Pages `38620125402` passed, public menu shows BUILD 4.49.1.

See [patch evidence](RELEASE-4.49.1.md). The wider perspective gate remains open.

## 4.49 service roof and movement checkpoint

- [x] One curated existing-building roof with shared collision/render deck, parapets and HVAC; safe mapped approach, grapple ascent and exit gap.
- [x] Shared structural health, support removal on collapse, nearby enemy pressure and single-hit blast/melee ownership.
- [x] Detailed Rook development travel locomotion, forward/backward/strafe/stop, planted-foot anchors and following-camera review; 29 art tests pass.
- [x] 575 gameplay tests, 29 art tests, four full automated campaigns, production build and exact packaged Mac hardware startup.
- [x] Publish and verify browser/Mac 4.49: runtime `da2f11a`, Pages `38616849197` passed, public menu reports BUILD 4.49.0 with no browser errors, and uploaded Mac archive digest matches the hardware-tested ZIP.

This closes the first accurate service-roof route, not all rooftops or elevated
enemy encounters. See [4.49 evidence](RELEASE-4.49.md). Flat-ground development
locomotion is implemented; production animation, aiming layers, equipment/LOD
and portrait likeness remain open.

## 4.48.2 reliability checkpoint

- [x] Fix body-overlapping platform edge landings using matching solid collision footprints.
- [x] Remove per-mesh temporary arrays from building cutaway AO; retain nested/failed-pass restoration and clear retained references.
- [x] 563 tests, four full automated campaign routes, production build, real browser landing/cutaway inspection, exact packaged Mac hardware startup.
- [x] Publish and verify the 4.48.2 browser and Mac artifacts: runtime `3247ee9`, Pages `38613075915` passed, public menu reports BUILD 4.48.2 and uploaded archive digest matches the locally tested ZIP.

See [patch evidence](RELEASE-4.48.2.md). No whole-game FPS improvement, ordinary
full playthrough, physical device validation or final art completion is claimed.

## Next concrete slice

The detailed development character now has preserved v5 material/cap refinements,
a three-strike katana study, both-direction dodge, rifle/reload and travel motion.
43 art tests pass; 28 motion checks also pass on actual v5 geometry. Browser pose
review and production build pass. See [motion evidence](art-direction/ROOK-MOTION-CHECKPOINT.md)
and [v5 limits](art-direction/ROOK-V5-CANDIDATE.md). It is not the production hero.

The preserved v6 candidate now has shaped pockets/flaps, rolled collars, cuffs
and surface-bound seams, with 5,200 fewer triangles and unchanged draw count.
The actual browser caught and verified a fix for inverted panel normals. Final
v6 passes 28 motion and 5 preservation/attachment tests. See [v6 evidence](art-direction/ROOK-V6-GARMENT.md).

Next: facial likeness, strap attachment and scarf/cuff refinement; then
terrain/turning, aim layers, LOD and production integration, including saved
armour and FPS hands. The electric muzzle/parapet bug is fixed in 4.49.1; wider
perspective QA, ordinary expedition and native sustained-session testing remain
open. Hangar/orbit/moon remain downstream of these gates.


4.48.1 follow-up audit: corrected enemy geometry ownership during corpse
settling and final ankle orientation after recoil, melee and traversal layers.
559 tests and production build pass; a real WebGL 30-cycle corpse check returns
to its geometry baseline after every removal. See [patch evidence](RELEASE-4.48.1.md).
The detailed character production/animation gate below remains open.
Patch `2b16066` is published; Pages `38603232939` passed and the public menu
shows 4.48.1. The Mac archive digest matches the locally hardware-tested package.

4.48 visual checkpoint: live survivor clothing/proportion/gait refinements and
six rebuilt ordinary enemies are implemented; 553 tests, production build and
Apple Silicon GPU startup pass. Browser rifle/paired-blade animation sequences
have zero reported grip errors. See [4.48 evidence](RELEASE-4.48.md). Rook v3 is
still a separate development asset; authored combat animation, material/LOD
optimization and a production adapter remain the next substantial art gate.
Runtime commit `c538ec1` is published: Pages `38601520008` passed and the public
menu displays 4.48.0. The Mac download digest matches the hardware-tested local
archive. Independent Mac CI `38601576344` passed, including Metal hardware startup.

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
Pages run `38597047051` passed; the actual public `/retro/play.html` loaded its
bundled emulator and displayed the correct SNES title screen on 14 October 2026.

## 4.49.2 — phone landscape HUD

- [x] Separate compact viewport presentation from touch/controller ownership. A connected PlayStation pad no longer restores the desktop HUD on a phone.
- [x] Compact edge panels, short notices, smaller boss/quest strips and bottom traversal controls. Hide redundant score/status and inactive melee controls; keep the full map and pause details available.
- [x] Browser QA at 844×390, 1280×550, 390×844 and desktop 1280×720; touch ↔ controller transitions, boss/evolution notices, map opening and directional dodge.
- [x] 579 tests pass; production build passes. Actual DOM measurements at 844×390: no overlapping HUD buttons and all visible button targets at least 44×44, with both touch and simulated DualSense.
- [ ] Physical phone and controller verification remains with the user. Browser fixture input does not establish hardware behavior.
- Browser-only patch; macOS download remains the tested 4.49.1 edition.

## 4.49.3 — perspective/arrival reliability and Mac refresh

- [x] Arc crosshair contact above cover, with physical muzzle blockage preserved and matching rendered chain segments.
- [x] Safe shelter exits avoid frozen incoming projectiles and burning surfaces through the shared regional arrival checks.
- [x] 583 tests, four automated 32-wave campaign routes, production build and real browser reproductions.
- [x] Exact Apple Silicon archive hardware startup; separate temporary-profile native UI session cleared two waves, selected upgrades, used Focus/dodge, tracked a quest and quit cleanly. Short gameplay check only (48 seconds simulation time); sustained soak and full ordinary expedition remain open.
- [x] Package includes the 4.49.2 mobile HUD fix. See [4.49.3 evidence](RELEASE-4.49.3.md).

Next remains wider perspective/traversal validation and production character art, then the hangar/orbit/moon slices. This checkpoint does not close those gates. No active tool goal was present when this follow-up started; the repository checklist remains the source of remaining work.

4.49.3 publication verified: runtime `8502f13`, Pages `38624878872` passed,
public menu BUILD 4.49.3; the uploaded Mac archive digest matches the local
hardware-tested package. Automatic Steam Deck build cancellation requested.

## 4.49.4 — grapple recovery and render selection

- [x] Recover from sustained blocked-body grapples beneath low cover, while allowing brief collisions to clear normally.
- [x] Preserve nearest-piece destruction ordering and recent-wound bar selection with less CPU sorting/transform work.
- [x] 591 automated tests; standard Open City 32-wave simulated campaign; actual browser grapple/landing/firing/movement recovery; production build.
- [x] Exact Apple Silicon archive signature verification and offline startup with GPU enabled. This pass is startup coverage, not a new native playthrough.
- [x] Fixed-seed combat/collapse before-after samples retain identical draw/triangle/effect counts. CPU microbenchmarks improve; short samples do not establish overall FPS improvement.
- [x] Investigated the 100-second GPU geometry rise: late +75 is exactly +54 first-use registrations of existing props plus +21 active lightning geometries; scene owners and actor batches remain flat, with a stable non-scene registration gap. No concrete leak found in this bounded check. Sustained native soak remains open.

See [4.49.4 evidence](RELEASE-4.49.4.md). Published runtime `cfec6aa`; Pages `38634225917` passed; public BUILD 4.49.4 confirmed; GitHub Mac digest matches the tested archive. Deferred Steam Deck workflow `38634360316` cancelled. Broader perspective validation, production character art, sustained native soak and ordinary full expedition remain open; hangar/orbit/moon remain downstream. Apple signing, Steam Deck and other ports stay deferred.

The cropped public menu follow-up is addressed in 4.49.5; see the checkpoint below.

## 4.49.5 — menu access and Hero Arsenal

- [x] Height-aware, scrollable main menu with consistent navigation targets, landscape two-column setup and legible notification badges.
- [x] Fix unlocked gun selection before dual-wield training; preserve locked-request state, ammo/reload and trained/testing pairs.
- [x] 593 tests and production build; actual browser menu QA across six sizes, Hero Arsenal selection, keyboard scrolling and compact controller HUD regression.
- [x] Publish and verify browser and exact Mac package. Runtime `5de4869`; Pages `38641595937` passed; public BUILD 4.49.5 confirmed without startup errors; uploaded Mac digest matches the hardware-tested archive. See [4.49.5 evidence](RELEASE-4.49.5.md).

Next remains wider perspective/traversal validation and production character art, ordinary expedition and sustained native soak. Hangar/orbit/moon remain downstream. No physical controller/phone result is claimed.


## 4.49.6 — perspective input and canopy collision

- [x] Fix fallback mouse look stopping when right-button aim and left-button fire are held together; preserve independent releases.
- [x] Align side/underside clearance so rising edge entry cannot pass through a canopy.
- [x] Move grapple marker masts beside the roof landing lane; retain original ring/cable targets and physics.
- [x] Browser checks: four simulated mouse sequences, zero canopy penetration and recovered ground movement, generated service-roof grapple/landing in TPS and FPS, clear FPS view after the marker fix.
- [x] Standard Open City automated 32-wave campaign completed. Ordinary full playthrough and hardware device checks remain open.
- [x] 597 final tests, production build and exact Apple Silicon package signature/offline GPU startup.
- [x] Runtime `1f20ffb` published; Pages `38648564212` passed and public BUILD 4.49.6 confirmed without startup errors. Uploaded Mac archive digest matches the exact hardware-startup-tested ZIP. See [4.49.6 evidence](RELEASE-4.49.6.md).

Next: production character art and animation integration remains a major visual gap; wider perspective/collision checks, ordinary full expedition and sustained native soak remain open. Do not promote the development Rook asset until its likeness, equipment/LOD, aim layers and FPS adapters pass actual gameplay review. Hangar/orbit/moon remain downstream.

## 4.49.7 — perspective first-input correction

- [x] Resolve newly initialized camera aim before transforming movement; preserve look delta and one-shot dodge when switching TPS/FPS.
- [x] 599 tests and production build; four actual browser fixture cases align movement with camera forward. Inputs are explicitly simulated.
- [x] Exact Apple Silicon package signature and automated offline GPU startup passed. Hands-on native session was blocked by the locked desktop; no new gameplay/soak result is claimed.
- [x] Published runtime `30f85a1`; Pages `38655128767` passed and actual public BUILD 4.49.7 loaded without startup errors. Uploaded Mac archive digest matches the exact tested ZIP. See [4.49.7 evidence](RELEASE-4.49.7.md).
- [x] Rook v7 sling/waist-attachment candidate: 33 art/motion tests, 120 sampled poses and actual browser front/back/recoil/reload/blade review. Accepted only as a development construction candidate; v6 remains the default, production hero unchanged. See [art evidence](art-direction/ROOK-V7-SLING.md).

Remaining major gates: character likeness/scarf, animation and production adapter (armour, LOD and FPS hands), wider perspective QA, ordinary full expedition and sustained native soak. Hangar/orbit/moon remain downstream.


## 4.49.8 — downward TPS and boss-lane arrival safety

- [x] Rotate the chase-camera boom with pitch so downward aim and actual bullets stay ahead of the hero; retain roof contact and cover retraction.
- [x] Check the full boss attack lane when choosing shelter exits and regional arrivals, using the combat predicate and body margin.
- [x] 605 tests, production build, actual browser street/roof shots and threatened-shelter exit with health preserved on queued attack resolution.
- [x] Frozen browser fixture completed 300 seconds of simulated combat. Late geometry counts fluctuate within a bounded range, textures and static ownership remain steady; this is not a native soak or controlled FPS comparison.
- [x] Exact Apple Silicon archive signature and offline GPU startup passed.
- [x] Published runtime `7b6548f`; Pages `38693865678` passed and actual public BUILD 4.49.8 loaded without errors. GitHub Mac asset digest matches the exact tested ZIP. See [4.49.8 evidence](RELEASE-4.49.8.md).

Next: wider perspective/visibility checks and production character art remain the immediate gates, with ordinary expedition and sustained native gameplay still open. The first accurate service roof is complete; additional roofs/elevated enemy encounters and hangar/orbit/moon remain unfinished.

## 4.49.9 — paused camera visibility and development aim

- [x] Restore solid facades immediately when switching to FPS/TPS, including zero-delta paused frames; restore the current hero cutaway on returning to diorama.
- [x] 606 gameplay tests, production build and actual rendered browser camera roundtrip with no simulation advance or browser errors.
- [x] Rook v7 development-only rifle/recoil aim layer: 36 art/motion tests, 72 envelope samples, planted skin geometry and grip checks; actual front/profile browser inspection and compact keyboard-accessible viewer controls.
- [x] Exact Apple Silicon package signature/offline GPU startup passed; published runtime `02caf2a`, Pages `38700639072` passed, public BUILD 4.49.9 confirmed without errors, and uploaded archive checksum matches. See [4.49.9 evidence](RELEASE-4.49.9.md).

Next: detailed character likeness and production integration, including moving aim,
turning, armour, LOD and FPS hands. Broader perspective/collision QA, ordinary full
expedition and sustained native gameplay remain open. The first roof is complete;
additional elevated encounters and hangar/orbit/moon remain unfinished.

## Development checkpoint — moving rifle aim

- [x] Detailed v7 rifle travel combines bounded aiming with forward/backward/strafe/stop foot placement and preserves armed/unarmed travel continuity.
- [x] Paused aim edits retain movement history instead of replaying the last direction; actual browser position check and new regression cover this.
- [x] Collapsible character inspector gives the model more room while retaining labeled keyboard controls. Actual forward/backward/strafe/stop browser review passed without errors.
- [x] Add a reproducible candidate-model character suite to browser CI. See [implementation and QA](art-direction/ROOK-MOVING-AIM.md).

Production release stays 4.49.9. Independent 70-test perspective/traversal audit
found no new reproducible defect. Next art gates are turning/terrain, moving
combat, likeness/garments and the equipment/LOD/FPS production adapter. The wider
ordinary-expedition and native-soak gates above remain open.
