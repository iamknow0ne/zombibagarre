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
- [ ] Ship one useful enterable workshop and apartment loot quest, with stable identifiers and safe exits.
- [ ] Add region travel/save boundaries, then the country road and hidden hangar chapter.
- [ ] Add launch/orbit/return and first moon as independently testable slices.

## QA inventory

Measure fixed seed, scene, quality, viewport, frame count, CPU stage time, draw calls, geometry/texture counts and frame-time percentiles. Compare repeat runs; do not label hosted/browser timings as phone or Deck FPS. Check pause/resume, restart, death/extraction, repeat quest rewards, cancelled touches and input-device transitions. Inspect visible combat, upgrade, map and settings states at desktop and phone sizes. Physical multitouch, controller haptic feel and sustained target-device thermals remain unverified without those devices.

## Ownership

Root: browser profiling, normal playthrough, integration and release. Performance subagent: rendering/effects/resource lifetimes. Gameplay subagent: simulation, progression and adversarial regression tests.

## Next concrete slice

The first Open City service route is implemented and tested in 4.43. Next, validate longer ordinary gameplay and perspective visibility, then build one enterable workshop and an apartment loot quest with safe exits. Keep jumping, dodge and grenade bindings distinct across keyboard, controller and touch. Inspect elevated projectile origins, melee/AOE/contact damage, falling supports and safe recovery. Use two agents for isolated implementation/review work. See [4.43 evidence](RELEASE-4.43.md), [the traversal scope](TRAVERSAL-INTEGRATION.md) and [the unimplemented interior plan](INTERIOR-INTEGRATION.md).

## 4.43 delivery checkpoint

Runtime commit `b9dd004c65662be51cac1e89bd30f79f269b974e`: 435 tests passed; production build and final Apple Silicon hardware boot passed. Exact archive SHA-256 is recorded in RELEASE-4.43. The final package is in `release/4.43.0-verified`; older running 4.42 and 4.43 test windows were preserved. The user was actively interacting with the earlier 4.43 test app, so manual testing of the refreshed package was not forced. Pages run 38567261359 and macOS run 38567403722 passed, including hardware boot; uploaded archive digest matches. Apple ID/signing and Steam Deck remain deferred.
