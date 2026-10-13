# 4.17 / Tactile streets and grounded movement

Art direction: weathered French quarantine streets. Preserve coal, limestone, desaturated verdigris and rust; reserve bright amber for fire and combat cues. Keep the playfield dominant, existing condensed HUD typography, compact 8/12px spacing and unobstructed touch controls. No new panels or decorative UI animation.

Material pass: continuous metre-scaled aggregate asphalt, jointed stone paving, mineral plaster, brickwork, roof seams, scratched metal and fibrous bark. Seeded textures, bump and roughness variation; no external asset downloads. Shared maps and batched geometry limit draw calls. Keep contrast subdued enough that enemies, warnings and pickups remain legible.

Motion pass: distance-driven gait, planted stance when stopped, acceleration/braking lean, lateral strafing, a compressed dodge landing and short directional hit reactions. Visual damping must never delay movement input, damage timing or weapon contact. Footfall dust and shallow-water spray remain bounded and stop while paused. Reduced motion suppresses optional dust and camera impulse.

Review gates: inspect city facades, close character motion, weapon grips and a phone-sized playfield. Verify damage timing, frame-rate independence and paused poses. Distinctiveness target >=7/10; no generic UI components, decorative glow or extra information added to the HUD.

Validation: 155/155 automated tests pass, including existing city encounters and boss coverage; 12/12 motion and weapon grip tests passed again after preserving per-enemy gait offsets. Production build passes. Browser inspection covered factory cladding/roof/paving, normal-distance streets, five seconds of scripted movement with 24 shots, 12 footfalls, a dodge and reload, fire/electric combat and the Bell Warden phase transition. Touch fixture confirmed directional dodge with the stick held, and clear controls at 844×390; these are simulated browser pointers, not physical phone/controller validation. No console errors in the inspected scenes. Material-specific wear remains subtle at normal camera distance; this pass retains the existing stylized geometry.
