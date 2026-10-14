# 4.45.2 — Character and weapon resource cleanup

14 October 2026. Reliability patch; the textured character study is development
work and does not replace the playable hero.

## Fixed

Replacing a character, armour piece or weapon while the camera had faded it
could dispose the temporary material but leave its original allocated. Cleanup
now handles both, supports arrays of materials, releases owned texture channels
and deduplicates resource references. Shared fabric/weapon caches and Three.js
sprite geometry remain available. World teardown releases its own effect
textures, and first-person overlays drop borrowed references when their source
is replaced.

In a reproduction with the real survivor mesh, the previous path disposed
**0 of 13 original materials**; the corrected path disposes **13 of 13 exactly
once**, as well as all 37 temporary fade materials. This is a resource-lifetime
fix, not a measured FPS increase.

## Validation and package

- 496/496 gameplay regression tests passed. New coverage includes repeated
  actual survivor/armour/weapon replacement, material arrays, texture ownership,
  world shutdown and borrowed first-person references.
- Production build passed with the existing bundle-size warning.
- Browser fixture rebuilt the world across SMG, katana and marksman changes and
  FPS/TPS transitions. Firing still produced headshots (SMG target 10000 to
  9978.55; marksman 10000 to 9793.75), with no captured console errors/warnings.
  [Retained frame](screenshots/perspective-rebuild-4.45.2.png).
- Apple Silicon macOS package passed strict nested ad-hoc signature checks and
  isolated hardware startup: offline world, shaders, menu and desktop bridge;
  default graphics backend, GPU enabled. It remains **unnotarized**.
- The art preview, source assets and prototype GLBs are absent from `dist` and
  the packaged game. No existing application or personal save was replaced.

Archive: `Zombie-Bagarre-4.45.2-macOS-arm64.zip` (133,462,879 bytes).
SHA-256: `3270eeb753880334ddbee241306ae8eed71a3a99aaec95c68c145bc5e7af3ff5`.

This startup check is not a full native expedition. Physical controller/phone,
sustained GPU-memory soak, broader perspective QA, Apple signing/notarization
and Steam Deck validation remain open/deferred as described in NEXT-PASS.

## Separate art and travel work

Rook v2 has embedded skin, hair/eye and canvas textures, improved scarf/harness
surface fitting and corrected eye cutouts. The real GLB is inspected in Three.js
beside the portrait. Its 31 skinned meshes, 68,466 triangles, four embedded PNGs
and two deformation studies pass the developer validator; seven malformed-asset
regressions pass. Node checks deliberately use image placeholders, so browser
texture inspection is separate. See [art validation](art-direction/ROOK-VALIDATION.md).

Facial likeness, garment design, full material maps, grounded combat animation,
LOD/batching and the gameplay adapter are **unfinished**. This preview is not a
claim of AAA character quality. The city/country roundtrip remains unimplemented;
its [saved design](REGIONAL-TRAVEL-DESIGN.md) defines safe arrival, no healing or
reward duplication, frozen regional state and explicit session-only persistence.
