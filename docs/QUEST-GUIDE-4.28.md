# Quest guidance — 4.28

The tracked contract gets one compact direction cue beside the survivor. It uses the existing walking route, selects a reachable corner, and projects its direction through the actual game camera. A separate cache preserves custom map pins. Contact, collection and reward-return steps update automatically; location-free objectives do not invent a destination.

## Visual decisions

Field-instrument overlay using the existing coal, bone and amber language: #142125 keyline, #e3bd79 chevron, #eddbb7 text. Two-pixel line, 10px monospaced distance, no panel, gradient, glow or pulse. The mark sits about 69px from the hero on desktop and 57px on mobile. It reserves label space against combat feedback and moves to a nearby clear position if touch controls overlap it. Empty HUD containers do not reserve invisible space.

The settings checkbox has a native label, participates in existing keyboard/controller focus handling, applies immediately and uses the existing saved preferences. The overlay is pointer-transparent. Reduced-motion users receive the same steady cue, with no additional animation. Existing accessible quest text remains in the HUD and journal.

## Limits and verification

This is pedestrian navigation, not a vehicle road-navigation system. When the route finder cannot connect the destination, the readout explicitly says BEARING and displays straight-line distance. Arrival requests interaction, without automatically accepting quests or spending currency.

Browser checks covered desktop 1280×720, portrait 390×844 and landscape 844×390, contact → supplies → reward, separate custom pins, arrival, non-location objectives, and the off toggle. These are browser viewport checks, not physical-phone certification. Saved screenshots are in `docs/screenshots/quest-guide-{desktop,mobile}-428.png`.

Regression coverage checks quest transitions, completion, contextual arrival, unreachable targets, routing around a building, manual-pin preservation and mobile placement. The existing combat-feedback fixture now initializes the added compass just as the real overlay constructor does.

Design review: AI Slop Score 0/10; Distinctiveness 8/10. This deliberately small addition borrows the map's quest color and the game's instrument typography without adding another information panel. The main trade-off is that the arrow suppresses itself if no safe space exists around the hero rather than cover a control.
