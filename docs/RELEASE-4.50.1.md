# 4.50.1 — Character visibility and crawler corrections

15 October 2026. Follow-up reliability audit of the production cast integration.

## Fixed

- Equipped helmets now hide the detailed Rook cap/brim and hair. Removing the
  helmet or selecting Hide Helmet restores the original authored geometry.
  Only headwear triangle indices change; body, face and garment vertices remain
  identical. Alternate indices share the world-owned geometry lifetime.
- Cheek wounds no longer disappear inside curved enemy skulls. Subdivided surface
  projection keeps both wound layers visible across all 36 ordinary variants.
  Model budget remains below 4,600 triangles and 23 meshes.
- Live crawlers now advance head-first, with a forward-looking head, alternating
  arm reach/ground contact and trailing retained legs. The pose accounts for
  elevated terrain, archetype/elite/flash scale and gore visibility. Dead-body
  poses, enemy movement speeds, collision and damage mechanics are unchanged.

## Lossless asset packing

Rook's shipped GLB is **16,692,588 bytes**, down from **18,422,648 bytes**: 1,730,060
bytes (9.4%) less. Four duplicate embedded images are shared instead of repeated.
The compiler preserves every texture payload and geometry buffer byte, along
with the original skin, material, skeleton and animation data. It does not resize
or recompress images.

The close-diorama browser fixture reports **33 GPU textures instead of 37**, with
unchanged 165 scene draws, 161,382 rendered triangles and 111 geometries in the
same unarmoured rifle scene. This is an asset/residency improvement, not evidence
of a general FPS gain on mobile or a sustained native benchmark.

`npm run dev`, `npm run build` and `npm run test:rook` generate the ignored runtime
derivative automatically. The authored v7 asset stays unchanged in the repository.
Runtime SHA-256: `ebad5652276b5032f0ae4f772e63f52b3d728dc72c5298b8a95741417057e0be`.

## QA

**611 gameplay tests and 53 actual-model art tests pass.** Production build passes
with the existing JavaScript chunk-size warning.

Browser checks: visible/hidden Warden helmet on detailed Rook, packed-asset load,
walker front and runner three-quarter wounds, live crawler approach and paused
pose. No console errors. Evidence: [screenshots and reports](qa/cast-fixes-4.50.1/).

Model regressions cover delayed load after FPS hands exist, paused camera changes,
helmet geometry restoration/ownership, actual packed GLB compatibility, wound
visibility on all 36 variants, all six crawling archetypes at four headings,
elevated/scaled hand contact and dismembered/retained limb visibility.

The full authored cast revamp, detailed FPS hands, LODs, normal full expedition,
sustained native sessions and physical phone/controller QA remain open. Apple
notarization and Steam Deck work remain deferred.

## macOS package

The exact Apple Silicon package passed ad-hoc signature validation and hardware
startup smoke: offline world, shaders, menu and desktop bridge ready with GPU
enabled. This does not establish sustained gameplay performance.

`Zombie-Bagarre-4.50.1-macOS-arm64.zip`

SHA-256: `895911697cab75a1fcdc9f76e94e46e5cc2aecbf5bdd02a181e7dac1043afc85`

## Publication

Runtime commit: `326883bc1fe574fc709f085d73093f719b1b04d4`.
GitHub Pages workflow **38712439117** passed. The public menu shows BUILD 4.50.1
and emitted no console errors during the deployment check; screenshot is in
`qa/cast-fixes-4.50.1/public-menu.png`.

[macOS release v4.50.1](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.50.1)
is published. GitHub's uploaded ZIP digest matches the exact locally tested archive
above. This is an ad-hoc signed Apple Silicon build, without Developer ID
notarization.
