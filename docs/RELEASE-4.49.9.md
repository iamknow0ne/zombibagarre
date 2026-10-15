# 4.49.9 — solid cover on camera changes

Switching from diorama to FPS/TPS used to retain the hero cutaway briefly; while
paused, its zero-delta update could leave the opening indefinitely. Perspective
views now restore solid building facades immediately. Returning to diorama also
restores the hero opening on the first paused frame, using the current position.

## Validation

- 606 gameplay tests passed, including paused and running perspective transitions.
- Production build passed; the existing large-chunk advisory remains.
- Actual local browser fixture, seed 20261012, 1280×720, high quality: at frozen
  simulation time 1.00 s, diorama → FPS → TPS → diorama produced aperture radii
  2.9 → 0 → 0 → 2.9. The building stayed visible. Rendered FPS wall and returning
  diorama opening were inspected, with no browser errors.
- The fixture now points toward its inspection building when changing view mode,
  so this test visibly reviews the facade rather than a street behind the hero.

Raw DOM reports and screenshots: [QA evidence](qa/4.49.9/).

## Separate development art checkpoint

Rook v7 has a bounded rifle/recoil aim layer distributed across three spine joints.
36 actual-model art/motion tests passed, including 72 aim samples, grip/stock
attachment, unchanged skinned sole vertices and smoothing. Browser front/profile,
upward aim, downward recoil, reset and reload exclusion checks passed.
See [aim-layer evidence and limitations](art-direction/ROOK-AIM-LAYER.md).
This is a development viewer capability: the production hero and v6 viewer default
remain unchanged. Final likeness, moving aim, armour, LOD and FPS adapters remain open.

## Release verification

The exact Apple Silicon archive passed ad-hoc signature verification and automated
offline startup with GPU enabled. SHA-256:
`a3da38ac19569c7f5373a3bedc23296c5a9e294fb792eaefd022e43d2ed5bdde`.
Runtime commit `02caf2acb5e511f03e66d0547e31ae014eed0346` is published.
Pages run `38700639072` passed, and the actual public menu reports BUILD 4.49.9
with no browser errors. GitHub release `413539029` reports the same archive digest
and size 141,689,958 bytes. Release: https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.49.9
The automatic deferred Steam Deck job `38700793423` was cancelled.
No physical phone/controller test, ordinary full expedition, native sustained soak,
or overall FPS improvement is claimed. Hangar/orbit/moon remain downstream.
