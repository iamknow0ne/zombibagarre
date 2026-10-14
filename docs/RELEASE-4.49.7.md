# 4.49.7 — Consistent movement when changing perspective

The first movement input after entering or switching TPS/FPS now uses the newly resolved camera heading. Previously movement could use the previous yaw while aiming initialized a different view, briefly moving the hero opposite to the visible forward direction. Camera-relative movement is now calculated after aim resolves the camera, preserving the first look delta and one-shot dodge input.

## Verification

- **599 automated tests passed**, followed by a successful production build with the existing large-chunk advisory.
- Exact 4.49.7 Apple Silicon package passed signature verification and automated offline startup with GPU enabled, even with the desktop locked. This confirms startup, not hands-on gameplay.
- Mac archive SHA-256: `cb5e987757468e99268c8e155acba5773b946d17a03ec4318896e618f86729b9`.
- Regression tests cover initial FPS/TPS at three hero headings, both perspective transitions, diagonal movement and one-shot dodge. An older touch test now declares its intended hero heading explicitly instead of assuming stale camera yaw.
- Actual browser fixture passed four initial/switched-camera sequences through the real Input listeners and ViewRig. Movement and camera-forward vectors match, with alignment dot products of 1. [Raw evidence](qa/4.49.7/camera-movement.json). The fixture explicitly synthesizes input; it is not a physical device test.
- A planned hands-on native session could not proceed because the Mac was locked. The launched 4.49.6 test app reached GPU-enabled ready state and was stopped. No native playthrough or sustained soak is claimed from that attempt.

## Development art

A separate [Rook sling-attachment candidate](art-direction/ROOK-V7-SLING.md) passed 33 art/motion tests and bounded browser appearance review. It is excluded from the production bundle. This release does not replace the playable hero or claim completed character likeness, animation, armour integration or LODs.

## Publication

Runtime `30f85a189e42b0cf7b568da5593d130cad38e673`; Pages workflow `38655128767` succeeded. The public menu displayed BUILD 4.49.7 and the browser reported no startup errors. [Menu capture](qa/4.49.7/public-menu.png).

[Mac release](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.49.7) published after verifying asset `642026416` (141,690,491 bytes) matches the tested local archive digest above. It is an Apple Silicon build without Developer ID signing/notarization.

Deferred Steam Deck workflow `38655383323` was cancelled.

## Remaining work

Production character art and animation integration, wider perspective/visibility checks, ordinary full expedition and sustained native soak remain open. Hangar/orbit/moon remain downstream. Developer ID signing/notarization, Steam Deck and other ports remain deferred.
