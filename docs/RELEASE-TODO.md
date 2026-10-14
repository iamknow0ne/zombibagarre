# Browser and macOS release checklist

Updated 14 October 2026. This is the active, bounded release goal: a working browser update and a macOS app to try. Steam Deck hardware troubleshooting is deferred. Larger world expansions and other ports are outside this release.

## Owners

- Main agent: integration, startup investigation, browser/mobile/controller QA, versioning and publication.
- mac_release: macOS packaging, startup smoke test, release workflow and installation instructions.
- reliability_review: independent save/HUD review, focused fixes and regression tests.

## Work queue

- [x] Implement portable save envelopes, import/export, restore previews and recovery copies.
- [x] Add visible storage errors and protect imported saves from outgoing page writes.
- [x] Consolidate touch/controller HUD ownership and avoid redundant shared markup writes.
- [x] Verify export/import, invalid imports, quota recovery and expedition restore protection in the browser fixture.
- [x] Complete independent reliability review and its fixes.
- [x] Resolve reproduced startup/testing race and verify normal startup.
- [x] Verify phone portrait/landscape settings and combat HUD; controller/touch transitions.
- [x] Run final automated suite, production build and appropriate campaign checks.
- [x] Build macOS application and distributable archive with GPU acceleration enabled.
- [x] Smoke-test packaged Mac startup and exercise actual menus/gameplay.
- [x] Verify save portability and document installation, update and signing limitations.
- [x] Update version, release notes and README with verified evidence and download links.
- [x] Commit and push; verify browser deployment and publish the tested macOS archive.
- [x] Confirm repository state, publish delivery links and disable the autonomous follow-up.

## Acceptance criteria

No known reproducible startup blocker in the tested browser or local Mac package; the regression suite and production build pass; the Mac app reaches playable gameplay; save replacement has validation, explicit preview and recovery; mobile controls remain usable in tested layouts. Published artifacts must correspond to the tested source. Real hardware observations must be distinguished from simulated controls. A local unsigned/ad-hoc signed Mac build is not notarized distribution and must be labelled accordingly.

## Deferred

Steam Deck launch confirmation, suspend/resume and GPU measurements; physical phone multitouch and controller haptics; full TPS/FPS and main-world verticality integration; interiors, country travel and space chapter; Android/iOS/tvOS and retro ports. These do not block this narrowly defined release but remain unfinished product work.

## Delivered

Browser 4.41.0 is live on GitHub Pages. The [macOS prerelease](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.41.0) contains the locally tested Apple Silicon app and verified checksum. [Mac CI](https://github.com/iamknow0ne/zombibagarre/actions/runs/38545228402) passed tests, packaging and normal-backend startup on its exposed Metal device. The bounded release is complete; the hourly follow-up is disabled. Deferred product work above remains open.
