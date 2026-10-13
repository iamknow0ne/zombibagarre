# Controller arsenal · 4.32

## Playing

Settings → Controller & combat now has independent **Left hand** and **Right hand** weapon bindings.

- **D-PAD WEAPON WHEELS** assigns Left / Right to the matching hand.
- **L1 / R1 WEAPON WHEELS** assigns the shoulder buttons and moves ordnance to D-pad Down. This works with either firing preset; picking a cycling preset keeps your firing buttons.
- Tap and release to cycle once. Hold for 300 ms to open that hand’s wheel. Combat and effects run at **18% speed** while the wheel is open. The world remains dangerous.
- Point the right stick toward a weapon and release the held button to equip it. Returning the stick to centre keeps the highlighted choice. Circle / B cancels. Mouse/touch can select a slot; arrows and Enter also work after opening.
- Left-hand selection preserves the main weapon, includes an Empty option, and supports matching firearms. Melee stays exclusive. Hero mode requires dual-wield training, and every selection respects weapon unlocks.
- Opening a menu, losing focus, disconnecting, dying or reaching an upgrade screen cancels selection. Active movement, auto fire and new attacks are suppressed while choosing.

Saved controls are migrated: the old previous-right-weapon binding becomes left-hand cycling. Other custom bindings remain. Choose either cycling preset for the new complete layout.

## Steam Deck in a browser

1. Keep Steam running. Add Brave or Chrome as a non-Steam application and launch it through Steam with a **Gamepad** layout. In Desktop Mode with Steam’s default layout, holding Menu switches between desktop and gamepad controls.
2. Open the game, focus its tab and press a controller button. Use **L2 + R2 LAYOUT** for trigger firing if preferred.
3. If the browser exposes a standard gamepad, controls work through the existing canonical mapping. Steam/Valve IDs use A/B/X/Y and LB/RB/LT/RT prompts.
4. If Settings reports an unmapped device, expand **Steam Deck / unrecognized controller setup** and choose **Configure controller**. Follow the 20 prompts: 16 controls, then four stick directions. Release between prompts. Triggers and D-pad directions can be buttons or signed axes. Calibration is saved for the exact controller ID and feeds combat, menus, driving and the atlas through the same normalized input path.
5. **Force standard button order** is an explicit fallback for unlabelled devices already using that order. Use calibration when the order differs.
6. If no controller appears at all, check Steam’s **Settings → Controller → Test Controller Inputs**, the browser’s Gamepad availability and its package/device permissions. Calibration cannot recover inputs hidden by Steam Input or the browser sandbox. Do not disable browser security protections.

This implements browser-side compatibility, not SteamOS-level device access. Physical Steam Deck testing in Brave and Chrome remains outstanding. A/B/X/Y prompts do not imply access to Deck-exclusive back buttons, gyro or trackpads; Steam can map these to ordinary controls. Vibration remains dependent on the browser’s exposed actuator.

## Fullscreen

Fullscreen buttons are in the main menu, pause menu and Settings. They request fullscreen for the whole game document, retaining menus and touch controls. The button follows the browser’s actual fullscreen state and exits on a second click. Escape also exits through the browser. An unsupported or denied request displays a useful message; no fake fullscreen state is shown. Browsers can require a mouse/touch gesture even when the button is selected with a gamepad.

## Design

A tactical radial selector using the existing coal (#142125), bone (#eee8d8) and amber (#f18147) palette. Real weapon model portraits are cached by evolution tier; the centre shows the selected weapon and tier. Selection has both a border and color highlight. No blur, added combat lights, decorative animation or continuous preview renderer. The background HUD becomes inert while selecting. Mobile sizing uses viewport limits. Approximate self-review: slop 1/10; distinctiveness 8/10. Remaining trade-off: the complete testing arsenal is dense on short landscape screens.

## Verification

- Final full local suite: 245 tests passed. Production build passed (4.75 seconds); existing bundle-size warnings remain.
- Unit coverage: quick tap versus hold, commit versus cancel, independent hands, matching guns, empty off hand, progression locks, exclusive melee, old-setting migration, radial selection dead zone, raw trigger/hat axes, reversed stick capture, sparse device lists, non-finite axes, fullscreen success/failure, focus loss and disconnect cleanup.
- Browser QA uses the development-only virtual pad on `/?controllerQA=1`, with persistence suppressed. This exercises the actual input loop and menus; it is not physical hardware proof.
- Visually checked left/right wheels, selected a revolver with the right stick and release, then added a left-hand carbine without replacing it. Checked the 1280×800 Deck-size layout and 390×844 phone-size layout. Fullscreen entered and exited from Settings.
- Completed the 20-step calibration flow with a virtual raw Linux-style pad (11 buttons / 8 axes, including hat and trigger axes). The saved mapping then closed Settings with B and started a run with A, reaching the first upgrade screen. No browser runtime errors were reported during these checks.
- Screenshots: [Deck-size wheel](screenshots/controller-wheel-4.32.png), [phone-size wheel](screenshots/controller-wheel-mobile-4.32.png).

## Research

- [MDN: Gamepad mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping): mapping describes browser normalization; an unknown layout needs explicit handling.
- [Valve: Steam Deck troubleshooting](https://help.steampowered.com/en/faqs/view/69E3-14AF-9764-4C28): controller input testing and Steam layouts.
- [Valve: desktop controller layout update](https://www.steamdeck.com/en/news?p=127): default desktop/gamepad switching with a long Menu press. Custom Steam layouts may differ.
- [Microsoft: browser gaming on Steam Deck](https://support.microsoft.com/en-us/edge/xbox-cloud-gaming-in-microsoft-edge-with-steam-deck): browser package access and Steam configuration are separate from website code. Its Edge-specific permission command is not applied to Brave/Chrome here.
- [MDN: requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen): user activation and promise rejection handling.

Sources checked 13 October 2026.
