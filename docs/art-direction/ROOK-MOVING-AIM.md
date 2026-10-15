# Rook moving aim — 15 October 2026

The development character can now keep a rifle shouldered while walking forward,
backpedaling, strafing and settling to a stop. `rifle-locomotion` combines the
existing bounded aim layer with travel-space foot placement, restrained pelvis
sway and directional lean. Switching between armed and unarmed travel retains
position, velocity and gait phase rather than resetting the character to origin.

This does not replace the production hero or alter the v7 model. The model's face,
garments and materials are unchanged; their visual quality remains unfinished.

## Controls and pause behavior

Choose **Attached sling v7 · candidate → Motion · Travel with rifle** in the
local character viewer. Travel direction/speed and aim sliders work together.
The new **Hide inspector** control expands the character's usable canvas area;
**Show inspector** restores all controls and keyboard access.

The pause review uncovered a specific issue: calling the timeline seek operation
when editing aim reconstructed travel from only the current direction. After a
mixed-direction path, that could move the character unexpectedly. `settleAim()`
now settles the aim/pose without changing time, travel history or foot anchors.
Explicit timeline scrubbing still replays the current input from rest, as labeled.

## Evidence

- Four new actual-v7 tests cover 480 directional moving-aim samples, both grip
  landmarks, stock/shoulder placement, skinned boot clearance, stopped feet,
  interrupted armed/unarmed transitions, 30/120 Hz equivalence and paused edits.
- All 40 character tests passed in the final combined run.
- `npm run test:rook` pins the candidate model and runs the complete focused
  character suite. It is also included in the browser publication workflow.
- Actual browser review at 1280×720 exercised forward, backward and rightward
  travel, stop, aim edits, reset and inspector expansion/collapse. The camera
  followed the hero, the gun remained coordinated with the upper body and feet
  settled on the floor. No browser errors were recorded.
- Paused position stayed at x −42.14 / z 7.22 m after aiming from 7°/6° to
  −35°/30° and back to neutral. Raw reports and screenshots are in
  [the review folder](../qa/rook-moving-aim/).
- The production build passed, with its existing large-chunk advisory.
- Independent gameplay review passed 70 perspective/ballistics/traversal tests.
  No new production defect was reproduced, so no speculative runtime fix or new
  macOS package was introduced. Browser and Mac release remain 4.49.9.

## Inspector design

Developer-tool direction, canvas as the primary object, one compact inspector.
Existing charcoal/olive, bone and amber palette, system text and monospace
measurements, 44 px controls, 2 px corners and 4/6/8/12 spacing are retained.
The disclosure has `aria-expanded`/`aria-controls`, visible keyboard focus and
reframes the canvas without decorative animation. Hidden controls leave the tab
order. Self-review: AI Slop 1/10, distinctiveness 8/10. The expanded toolbar still
uses substantial space; collapsing it now provides an explicit inspection mode.
No physical mobile-device usability claim is made for this desktop art tool.

## Remaining gates

Flat ground only. Terrain adaptation, turn-in-place, moving recoil/reload,
weapon-specific animation, armour deformation, LOD, FPS hands and a production
adapter remain open. Grip accuracy assertions apply to settled target poses;
intermediate hand crossfades are not certified by these tests. Reference likeness
and garment refinement still require separate art work and rendered review.
