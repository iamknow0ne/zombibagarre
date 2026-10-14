# Next gameplay and performance pass

14 October 2026. Apple signing/notarization, Steam Deck troubleshooting and other ports remain deferred. Work is staged into tested releases, not an assertion that the whole game is finished.

## Active milestone — performance and reliability

- [x] Capture fixed-seed city and combat frame-time baselines; add destruction/weather/long-session coverage.
- [x] Fix measured rendering hot paths or resource growth without lowering visible quality.
- [x] Audit vehicle, throwable and camera transitions; cover reproduced bugs. Continue the broader quest/control audit in subsequent slices.
- [ ] Complete a normal expedition through user-facing controls. First boss beaten, wave 5 reached, earned SMG unlock checked; full 32-wave human run remains pending.
- [x] Run 364-test regression suite, four campaign routes, and browser portrait/landscape checks. Physical controller/phone validation remains open.
- [ ] Publish tested browser and unsigned macOS update with measured results and limitations.

## Following milestones

- [ ] Integrate jumping/grappling with main-world collision, combat and all input modes.
- [ ] Finish perspective-mode aiming, collision and visibility validation.
- [ ] Ship one useful enterable workshop and apartment loot quest, with stable identifiers and safe exits.
- [ ] Add region travel/save boundaries, then the country road and hidden hangar chapter.
- [ ] Add launch/orbit/return and first moon as independently testable slices.

## QA inventory

Measure fixed seed, scene, quality, viewport, frame count, CPU stage time, draw calls, geometry/texture counts and frame-time percentiles. Compare repeat runs; do not label hosted/browser timings as phone or Deck FPS. Check pause/resume, restart, death/extraction, repeat quest rewards, cancelled touches and input-device transitions. Inspect visible combat, upgrade, map and settings states at desktop and phone sizes. Physical multitouch, controller haptic feel and sustained target-device thermals remain unverified without those devices.

## Ownership

Root: browser profiling, normal playthrough, integration and release. Performance subagent: rendering/effects/resource lifetimes. Gameplay subagent: simulation, progression and adversarial regression tests.

## Next concrete slice

Complete main-world traversal design and collision/combat integration before introducing interiors. Keep jumping, dodge and grenade bindings distinct across keyboard, controller and touch. Inspect elevated projectile origins, melee/AOE/contact damage, falling supports and safe recovery. Use two agents for isolated implementation/review work. See [4.42 evidence](RELEASE-4.42.md).
