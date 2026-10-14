# 4.49.6 — Aim-and-fire controls and canopy clearance

TPS/FPS mouse look now continues while holding both right-button aim and left-button fire when pointer capture is unavailable. The fallback previously accepted only the right button alone, freezing look as soon as firing began. Releasing either button still leaves the other action intact.

Jumping into the edge of a raised canopy now uses the same head-clearance tolerance for its side and underside. Previously a 9 mm disagreement could admit the character's head inside the slab, beyond the next upward collision sweep. The fix keeps the body outside during ascent and permits movement underneath after descent.

## Verification

- **597 automated tests passed** on the final code, followed by a successful production build with the existing large-chunk advisory.
- Exact Apple Silicon package passed signature verification and offline hardware startup with WebGL GPU enabled. This is startup coverage, not a new native playthrough.
- Mac archive SHA-256: `9910c7ab1acc1f7c6bab7d0301c1468a391a91ea6c9c60a50c78150978bb06b3`.

- Both regressions failed before their fixes. Traversal coverage includes four approach directions, three update rates and two body heights, plus the campaign simulation path.
- Actual browser input fixture exercised the real Input listeners and ViewRig: right-drag, aim plus fire, release fire while aiming, and release aim all passed. The combined chord produced look delta 11/4 and yaw change −0.02750 instead of freezing. [Input results](qa/4.49.6/pointer.txt). These are explicitly simulated browser events, not a physical mouse/controller test.
- Actual rendered campaign fixture: zero measured head penetration after the critical canopy entry; the hero then landed at street height and continued underneath. [Entry](qa/4.49.6/canopy-edge.json) · [recovery](qa/4.49.6/canopy-recovery.json).
- Standard Open City automated campaign completed all 32 waves, 1,623 kills, 980.8 simulated seconds. [Campaign log](qa/4.49.6/campaign.log). This does not replace a full ordinary playthrough.
- Service-roof grapple landed on the correct support at height 3.41 in TPS; switching to FPS preserved position and placed the camera at height 4.96. That visual check exposed the central marker pole blocking the first-person view; see the marker correction below.

## Grapple marker correction

The marker now uses a side mast and overhead arm, leaving the landing lane clear. Its ring and cable endpoint stay at the authored grapple coordinate; narrow supports omit the mast. Tests cover all four roof approach orientations, roof bounds, overhead clearance, cable endpoint and disposal. The actual browser replay confirmed that the FPS crosshair and view are clear after landing, while TPS retains the visible fixture beside the hero.

[Before](qa/4.49.6/roof-fps-before.png) · [After](qa/4.49.6/roof-fps-after.png) · [TPS after](qa/4.49.6/roof-tps-after.png) · [Final landing state](qa/4.49.6/roof-fps-after.json)

## Scope

This is a focused reliability checkpoint. Wider perspective validation, authored character art and production integration, ordinary full expedition, sustained native soak and hangar/orbit/moon progression remain open. Apple Developer ID signing/notarization, Steam Deck and other ports remain deferred. No physical phone/controller result or whole-game completion is claimed.
