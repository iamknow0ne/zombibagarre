# Next gameplay and performance pass

14 October 2026. Apple signing/notarization, Steam Deck troubleshooting and other ports remain deferred. Work is staged into tested releases, not an assertion that the whole game is finished.

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
- [ ] Add region travel/save boundaries, then the country road and hidden hangar chapter.
- [ ] Add launch/orbit/return and first moon as independently testable slices.

## QA inventory

Measure fixed seed, scene, quality, viewport, frame count, CPU stage time, draw calls, geometry/texture counts and frame-time percentiles. Compare repeat runs; do not label hosted/browser timings as phone or Deck FPS. Check pause/resume, restart, death/extraction, repeat quest rewards, cancelled touches and input-device transitions. Inspect visible combat, upgrade, map and settings states at desktop and phone sizes. Physical multitouch, controller haptic feel and sustained target-device thermals remain unverified without those devices.

## Ownership

Root: browser profiling, normal playthrough, integration and release. Performance subagent: rendering/effects/resource lifetimes. Gameplay subagent: simulation, progression and adversarial regression tests.

## Next concrete slice

Latest user priority: close the visual gap between the lore portraits and playable characters. The source/art review and first Rook reference sheet are saved in [character art direction](art-direction/CHARACTER-DIRECTION.md). Next produce and validate one rigged, textured Rook in actual gameplay before expanding the character pipeline. The reference image is concept only; no new character model has shipped. Do not claim further procedural detail alone satisfies this request.

The first low-platform city route and two-room workshop/apartment quest are implemented. Longer ordinary-expedition QA, perspective visibility/aiming and region travel remain open after this art milestone. Do not skip directly to procedural planets before travel, return and save semantics work. Indoor combat, indoor TPS/FPS and more room templates are separate extensions. Use two agents for isolated implementation/review work. See [4.44 evidence](RELEASE-4.44.md) and [the interior implementation](INTERIOR-INTEGRATION.md).

## 4.44 delivery checkpoint

462 automated tests and production build passed. Standard Open City bot completed all 32 waves. Browser fixture checks covered the workshop/apartment quest and compact portrait/landscape controls. Renderer disposal was tested over 50 room visits; hardware memory soak and physical controller/multitouch remain open. The exact Mac archive passed hardware startup with GPU enabled. Versioned output: `release/4.44.0`. Apple signing and Steam Deck remain deferred.

Runtime commit `2adb321` is published. Pages run 38571087231 and Mac run 38571335466 passed; the public menu shows 4.44.0 and the uploaded archive digest matches the locally tested ZIP.

## 4.43 delivery checkpoint

Runtime commit `b9dd004c65662be51cac1e89bd30f79f269b974e`: 435 tests passed; production build and final Apple Silicon hardware boot passed. Exact archive SHA-256 is recorded in RELEASE-4.43. The final package is in `release/4.43.0-verified`; older running 4.42 and 4.43 test windows were preserved. The user was actively interacting with the earlier 4.43 test app, so manual testing of the refreshed package was not forced. Pages run 38567261359 and macOS run 38567403722 passed, including hardware boot; uploaded archive digest matches. Apple ID/signing and Steam Deck remain deferred.

## 4.45 controls checkpoint

Keyboard rebinding and nine settings submenus are implemented. 483 regression tests and the production build passed; desktop/phone viewport checks and virtual-controller Back navigation were exercised. Mappings are included in backup/restore and rooftop training. See [4.45 evidence](RELEASE-4.45.md). The portrait-faithful Rook asset milestone above remains the next art priority.
