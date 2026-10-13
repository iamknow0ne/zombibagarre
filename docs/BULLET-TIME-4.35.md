# Focus / bullet time — 4.35

Focus belongs in the combat loop as a short, player-triggered resource. It gives room to read a boss attack, aim a precision shot or fire while diving through a crowded street. It is available in both progression modes and can be disabled in Settings.

Reference: [Rockstar's explanation of Bullet Time](https://support.rockstargames.com/articles/6mgfz9AeJqbn3vsyCiMSxH/what-is-bullet-time-and-how-can-i-use-it-to-my-advantage) describes slow action with real-time aiming. That timing relationship informs this implementation; no Max Payne assets, branding or animations are used.

## Controls and balance

- Keyboard: **C** toggles Focus; **Space** dodges.
- Controller: **Circle / B** toggles Focus on foot by default; **Cross / A** dodges. Focus is remappable and appears on the controller diagram. Existing custom bindings are preserved when the new action is introduced.
- Touch: a **48-pixel hourglass** between the existing action pairs, showing charge and a small meter. No additional HUD row. Pointer capture remains independent for movement, aim and action fingers.
- Start with 100 charge; activation needs at least 25. Drain is 22 per real second, giving roughly 4.5 seconds from full without kills. Each shooting dive costs 10 more.
- Normal kills restore 10, precision/critical/finisher kills restore 16, and kills during Focus restore 3. A hard six-second burst limit prevents indefinite crowd farming.
- Recovery starts after a two-second delay at five charge per second, with a 1.2-second reactivation cooldown. Paused time gives no recovery.
- World speed eases to 32%. Movement, attacks, projectiles, enemy tells, weather, collision integration and visual effects share the slowed simulation clock. Input/aim sampling stays responsive. Player fire rate is also slowed; there is no artificial damage multiplier.
- A firearm dodge during Focus becomes a directional shooting dive with lift, body lean, levelled guns and grip-solving arms. Normal dodge collision and protection rules still apply. Melee retains its existing dodge and combos.
- Menus, pause, death, vehicles, focus loss and weapon wheels end Focus. The existing wheel slowdown never multiplies with Focus. Circle / B remains Back in menus and the handbrake when driving.

## Presentation

Muted sound, a short entry/exit cue, a bounded vibration cue, subtle screen-edge shading, a 3.5% camera emphasis outside boss fights and longer existing projectile streaks. No extra particle system or postprocessing pass. Cinematic effects have a separate toggle; reduced motion suppresses the camera change and screen-edge overlay. The hourglass uses the existing coal, bone and amber field-equipment palette.

The settings explain the ability, charge requirement, controls and interaction rules. Escape handling also avoids opening and immediately dismissing Pause with the same key.

## Validation

**265 tests passed** and the production build succeeded. The existing bundle-size advisory remains. No new rendering pass or dependency was added.

Automated coverage includes real-time charge across frame sizes, hard duration limits, projectile/world slowdown, immediate aiming, precision rewards, duplicate-kill prevention, firing while diving, wall collision, melee isolation, cancellation/reset, binding migration, and level gun barrels with reachable grips during dives.

Browser verification uses the development touch and virtual-controller fixtures. These exercise real DOM pointer handlers and gamepad polling, not physical phone/controller hardware. The touch report records a held movement stick, active dive and ammunition consumed while the world runs at 0.32 speed. Controller and keyboard activation, wheel cancellation, settings and compact phone controls are checked separately. Physical vibration feel remains unverified.

Design review: hierarchy 4/5, clarity 4/5, accessibility 4/5, product specificity 4/5, restraint 5/5. The icon uses existing symbols and palette, charge stays legible, touch targets remain 48 pixels wide at a 320-pixel viewport, and there is no flashing or extra fullscreen text. Device ergonomics and long-session combat tuning still benefit from real playtesting.

![Compact mobile Focus control](screenshots/focus-mobile-4.35.png)
