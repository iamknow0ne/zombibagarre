# 4.18 / Rendering and simulation performance

Measured locally in the same Codex browser with the deterministic `dev/performance-qa.html` fixture: seed 20261012, fixed simulation steps, 60 warm-up frames followed by 180 measured frames. Combat uses 60 high-health enemies and flame/electric weapons. Baseline is commit 48ebd92 (4.17); the mobile-size baseline is served from a separate copy of that commit. These are browser stress tests, not physical phone measurements or a promise of 60 FPS. Frame scheduling, host load and shader compilation introduce run-to-run variance. No image-resolution or particle-count reduction was applied to these comparisons.

| Scene | Quality / viewport | Before FPS | After FPS | Before draw calls | After draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| City | High / 1280×720 | 26.3 | 31.2 | 899 | 642 |
| 60-enemy combat | High / 1280×720 | 9.6 | 22.1 | 6,961 | 1,724 |
| 60-enemy combat | Balanced / 844×390 | 14.5 | 27.8 | 3,654 | 1,246 |

Full distributions and CPU stage timings are in `performance-4.18-results.json`. On the high-quality combat test, simulation time fell from 26.48 to 5.65 ms and world update/render submission from 72.50 to 27.49 ms. The high-quality image retains the same AO, shadow resolution, materials, articulated poses and effects.

## Changes

- Vertex-colour batching preserves per-part colours while merging rigid character pieces; bones, heads and limbs remain independent.
- Live enemy bone meshes use shared instanced GPU draws by type and appearance. Per-enemy transforms and hidden limbs are still evaluated; corpses and bosses retain their independent rendering paths.
- Ambient occlusion reuses the colour pass's shadow maps and world matrices; only visible excluded objects are temporarily hidden, instead of copying every object's visibility three times.
- Fixed scenery transforms are cached; dynamic vehicles, actors, effects and newly attached blood decals remain live. Nearby lamp selection is refreshed when the player moves three metres.
- Allocation-free slab intersections and conservative broad-phase boundary rejection retain exact collision results. Target acquisition tests nearest candidates first; navigation only checks visibility of candidates that can improve the route.
- Full-rate gameplay and input are preserved. Menu rendering is capped at 30 Hz, paused rendering at 10 Hz, and hidden-tab rendering is skipped. Resize/settings changes force a fresh render.

## Verification

Automated coverage compares thousands of ray and concave-boundary cases against the previous algorithms; checks batch geometry/colour, independent poses and limb hiding, empty batches, shared-material lifetime, AO restoration and render scheduling. Existing gameplay, boss, driving, touch, destruction and weapon suites remain required. Browser verification checks a live crowd, dismemberment, building destruction and the production build.

Validation completed: 163/163 tests passed and the production build succeeded. Browser checks retained flame/electric combat, four distinct death results with a living crawler and missing arm, projected blood, building blast scars and four broken windows. The full touch-test game completed a wave, accepted an upgrade and continued to wave two with simultaneous movement/firing verified. No console errors were recorded. Physical controller/phone performance was not measured.
