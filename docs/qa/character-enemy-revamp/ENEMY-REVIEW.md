# Enemy character revision 3 — 15 October 2026

Implemented in the production ordinary-enemy factory and animator, not only the art viewer.

- All six ordinary archetypes: reshaped jaw/temple/cheek contour, recessed eyes, rounded nasal bridge, subtle under-eye pigmentation, skull-projected cheek lesions, narrowed runner waist, broader volatile torso, contoured upper sleeves, turned collars, torn hem outlines and stained cloth vertex colors.
- Shared four material responses and rigid-bone instancing retained. All 36 type/appearance combinations remain below the existing 4,600-triangle and 23-mesh limits; observed maximum 4,253 triangles. Head, arm and leg visibility stays owned by the existing gore/corpse paths.
- Distinct deterministic motion: civilian asymmetric drag, coordinated runner arm swing, slower heavy brute shoulder sway, restrained armored chest, spitter neck/throat anticipation, volatile splayed arms and shallow backward lean. Wrist/head lag follows the speed-driven base gait. It does not modify movement, health or collision state.
- All eight boss profiles: bevelled plate edges and material-specific vertex staining/corrosion; world-space textures, authored silhouettes, phase articulation and attack mechanics retained. Boss budgets 3,968–11,552 triangles, 20–39 meshes.

## Evidence

18 focused tests passed: `enemy-visuals`, `enemy-render-regression`, `enemy-motion`, `bosses`, `boss-surface`. Tests exercise real production animation integration, deterministic paused poses, visible-part instancing, corpse batching/disposal, all eight phase rigs, UV/color preservation, and model budgets. Run log `/tmp/zb-enemy-revamp-tests.log`.

Actual browser review at `dev/actors-qa.html`: six-enemy lineup walking, front silhouettes and walker facial close-up. No console errors. `enemy-lineup.png` records the final production models at a single stepped pose; sustained walking was also reviewed before the final hem-winding correction. `walker-face.png` records the final surface-projected lesion and face.

Actual browser `dev/boss-qa.html`: Cinder King arrival and phase II in the city, with furnace doors opening, telegraph UI and phase effects. `cinder-king-live.png`. No console errors. Other seven profiles were validated by model/phase tests, not individually browser-reviewed in this subtask.

## Limits

This is a production visual/animation refinement of the existing stylized low-poly roster. It does not establish parity with cinematic lore artwork, add new enemy types, or replace all enemies with authored skinned high-detail assets. Collision and attack balance are unchanged. No physical phone, controller or native hardware performance claim is made. Full root release QA remains separate.
