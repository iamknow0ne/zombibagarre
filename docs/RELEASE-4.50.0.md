# 4.50.0 — Live character and enemy art checkpoint

15 October 2026. This release moves the detailed Rook candidate into production
and improves the existing cast. It does not declare cinematic artwork parity or
completion of the remaining character-art work.

## In the game

- Default Rook uses the authored v7 skinned body, garments and textures. The live
  rig drives weapon grips, melee, movement and traversal; armour remains attached.
  Async loading preserves a functional procedural fallback. Custom appearances
  and other identities retain their own models rather than inheriting Rook's face.
- Saint, Torque and Vesper gain distinct proportions, tailored curved coat tails,
  cloth/leather variation, rescue supplies, biker hardware and layered wraps.
  Existing hairstyles, accessories, armour and skin choices remain supported.
- All six ordinary enemy archetypes gain refined faces, anatomy, stained/torn
  clothing and distinct deterministic motion. All eight boss profiles gain bevelled
  plates and material weathering while retaining their phases and combat rigs.
- The three traders use posed survivor construction. Static geometry is baked by
  surface type to keep the existing shop draw-count limit.
- Skeleton/material lifetime handling, delayed model attachment and preserved FPS
  overlays are covered. The retargeter reuses scratch values and avoids repeated
  descendant updates; varied-pose transforms matched exactly before/after this optimization.

## Verification

- **609 gameplay/regression tests pass.** An initial shop draw-budget failure was
  fixed by batching posed traders; the entire suite then passed.
- **48 actual-model art tests pass**, including all weapons, dual slots, armour
  present before delayed load, finite posed skins, model failure/release races,
  independent instances, shared-resource disposal and FPS frustum visibility.
- Production build passes. Existing large JavaScript chunk warning remains.
- Browser: all four survivor identities, Rook rifle/dual + Warden armour/katana,
  custom appearance fallback, TPS movement and FPS overlay inspected in the real
  World/Simulation fixture. The fixture originally omitted application of camera
  settings; that test setup was corrected before FPS visual acceptance.
- Actual main-game city expedition started; detailed Rook rendered in combat.
  Bloom Mother and Cinder King phase II reviewed in the main-game boss fixture.
  Ordinary enemy lineup and close face review recorded. No browser console errors.
- Ordinary enemy variants remain below **4,253 triangles / 23 meshes**; bosses below
  **11,552 triangles / 39 meshes**. These are model budgets, not measured device FPS.

[Cast screenshots](qa/cast-runtime/) · [Enemy evidence](qa/character-enemy-revamp/ENEMY-REVIEW.md)

## Remaining art gates

Rook is the only authored high-detail skinned survivor. Saint, Torque, Vesper,
custom outfits and enemies are still procedural models. Facial likeness to the
lore art, dedicated detailed FPS hands, outfit variants and distance-based LODs
remain work. The GLB adds about 18 MB of asynchronously loaded content. Physical
phone/controller tests, sustained native sessions and a complete normal expedition
are not established by this release. Apple notarization and Steam Deck remain deferred.

## macOS package

Exact Apple Silicon package built and ad-hoc signature verified. Hardware startup
smoke passed: offline world, shaders, menu and desktop bridge initialized, with
GPU enabled. This is startup evidence, not a sustained gameplay benchmark.

`Zombie-Bagarre-4.50.0-macOS-arm64.zip`

SHA-256: `5eba8379422f097ae050f087360bfdd4d8b7b67bf90111979ba9c1c4026b96aa`

## Publication evidence

Runtime commit `73f547731401857a536bc496ba214de85a322ad7`.
[Pages run 38710308987](https://github.com/iamknow0ne/zombibagarre/actions/runs/38710308987)
passed gameplay tests, model-art tests, build and deployment. Public menu verified
BUILD 4.50.0 with no browser console errors; screenshot in the cast evidence folder.
[macOS release](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.50.0)
is published and its uploaded ZIP digest matches the tested package above.
The automatic Steam Deck workflow remains deferred.
