# Rook development aim layer — 15 October 2026

The detailed model still has no production gameplay adapter. This pass closes a
bounded prerequisite: the carbine can now aim above, below and to either side of
its neutral direction while retaining its actual grip and shoulder attachment.
It does not change the model, materials, default character or production game.

`createRookMotionController(...).setAim({yaw, pitch})` accepts radians relative
to the model's forward direction. Positive yaw points toward model +X; positive
pitch raises the muzzle. The safe inspection envelope is ±35° yaw and ±30° pitch;
inputs beyond it clamp, and non-finite values throw. Rifle-ready and rifle-recoil
studies support the layer. Reload, melee and travel retain their authored poses.

Aiming is shared across the lumbar, thoracic and upper-chest joints with
35/40/25 percent weights. The arms and head follow the chest, and the weapon and
its already-solved contact landmarks receive that same final chest transform.
The lower body stays planted. This avoids solving a new unreachable hand target
or rotating the whole character merely to aim. Recoil remains relative to the
aimed barrel. Normal playback smooths target changes with frame-rate-independent
exponential response; seeking settles the target immediately for inspection.
Mode switches keep the existing visual crossfade, including its documented
limitation that grip diagnostics describe the settled target, not every blended
frame.

## Verified code and geometry evidence

All **36 v7 art/motion tests passed**, including three new aim-layer tests loading
the actual v7 GLB. The new tests cover:

- 72 rifle/recoil samples across time and the bounded yaw/pitch envelope; both
  palms remain within 3 mm of their weapon landmarks, and the butt plate follows
  the chest transform within 0.01 mm.
- Unchanged lower-body bone transforms, actual skinned sole vertices and bind
  matrices; finite sampled skin geometry at every tested aim combination.
- Contribution from all three spine joints, placed/rotated-model invariance,
  preservation of non-rifle poses, 30/120 Hz smoothing agreement, paused seeking,
  clamping, reset and disposed-controller validation.

Node replaces image decoding, so these tests do not certify rendered materials,
face quality, garment intersections or gameplay quality. Browser evidence should
be recorded separately after inspecting the final viewer.

## Remaining integration gates

This is an inspection capability, not runtime combat. Moving while aiming,
turn-in-place beyond this cone, vertical target acquisition, aim-aware reload,
weapon-specific pose profiles, equipment/armour deformation, LOD and FPS hands
remain open. The v7 face likeness and scarf construction are also unfinished.
Production adoption still requires a real gameplay adapter and visual/performance
review in ordinary combat; the tested aim envelope alone is not that approval.

## Browser inspection

The actual v7 model was rendered in the local character viewer at 1280×720.
Rifle aim at +35°/+30° was inspected from front and profile; recoil at
−35°/−30° was inspected full body. The torso, arms and gun move together and
feet remain visually planted. The downward recoil sample reports 2.7 mm settled
IK error with one clamped target; this is within the existing 3 mm tested envelope,
not zero error. Reset returns both axes to zero, and reload hides the aim controls.
Both viewers reported no browser errors. Screenshots are in `docs/qa/4.49.9`.
The upper-angle lean remains pronounced at the envelope limit and needs gameplay
review before production; this pass does not certify final animation quality.

The inspector keeps the existing charcoal/olive, bone and amber palette, 44 px
controls, 2 px corners and compact canvas-plus-toolbar layout. New native sliders
have labels, degree outputs, visible keyboard focus and a center-aim button; they
appear only for rifle and recoil. Motion is inspection playback, not UI decoration.
Self-review: accessibility 4/5, consistency 5/5, task clarity 4/5; the existing
large developer toolbar still trades canvas space for explicit review controls.
