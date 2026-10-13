# Rooftop Run · traversal lab

[Play the course](https://iamknow0ne.github.io/zombibagarre/traversal.html), or select **Rooftop Training** on the main menu. For development use `http://localhost:3000/traversal.html` (use the port printed by Vite). Opening the HTML with `file://` does not run the module-based game.

This is an opt-in movement prototype, separate from expeditions. It reads control calibration and graphics preferences, but never loads or writes character progression. **Watch Demo** traverses the same collision boxes, jump trajectory and grapple motor as manual play. Move or press jump/grapple to take over. Controller users can start the demo through the pause menu.

| Action | Keyboard | PlayStation | Steam Deck / Xbox | Touch |
|---|---|---|---|---|
| Move / air steering | WASD, ZQSD, arrows | Left stick | Left stick | Left joystick |
| Jump | Space | Cross | A | Up-arrow button |
| Grapple / release | E or G | L1 | LB | Hook button |
| Select anchor | T / Shift+T | D-pad left / right | D-pad left / right | Target button |
| Retry checkpoint | R | Triangle | Y | Return-arrow button |
| Pause | Escape / P | Options | Menu | Pause button |

These are **training bindings**. Space / Cross / A remains dodge in the regular game. The lab uses standard controller action assignments with the existing device calibration, dead zones and controller-family prompts. Ordinary rumble is requested on jump, attach and landing when the browser exposes a supported actuator. Physical Steam Deck / DualSense feedback has not been verified for this course.

## Route

1. **Cargo · 1.15 m:** move toward the striped container and jump. A normal jump reaches approximately 1.8 m above takeoff.
2. **Rooftop · 3.6 m:** grapple to the amber rooftop anchor. The cable pulls the survivor upward; it releases automatically near the anchor, then gravity settles the landing.
3. **Relay · 6.5 m:** use the next marked anchor to cross the gap.
4. **Summit · 10.5 m:** reach the highest roof. You can keep moving and jumping after completion.

Each first landing records a checkpoint. Retry returns to that roof. Falling is safe in training; restart clears the course. You can visit the roofs out of order, but all four landings are needed for completion. Grapples have a 23 m reach and require an unobstructed line to a live anchor. Pressing grapple again releases it without teleporting; air steering helps adjust the landing.

## What this validates

- Feet-height and vertical velocity, gravity, short jump buffering and coyote time.
- Shared render/collision dimensions, roof support, departure from ledges, ceiling contact and loss of destroyed supports.
- Substepped movement and swept axis collision, grapple acceleration, automatic reel completion and manual release.
- Cable, raised camera focus, height readout, airborne/landing poses, rooftop footprint ring, restrained landing particles and controller-family hints.
- Independent touch pointers via the existing joystick and touch-action handling; compact portrait/landscape controls.

The campaign still has ground-based combat, vehicles, quests and enemy navigation. This release does **not** enable arbitrary city roof traversal, aerial combat, enemy climbing, swinging pendulum physics, grapple attacks or destructible course buildings. Support-loss behavior is tested in the physics module; the course's four platforms remain intact. Extending traversal into expeditions needs those systems to share the same height model first.

## Verification

`npm test` includes traversal tests for jump height, landing, wall/ceiling collision, support loss, buffered/late jumps, invalid anchors, each rooftop grapple, manual release and the full guided route. Browser QA covers the visible jump, all four demo checkpoints, manual grappling, pause/retry and phone layout. Browser emulation is not physical device verification.

![Rooftop Run summit](screenshots/rooftop-training-4.38.jpg)
