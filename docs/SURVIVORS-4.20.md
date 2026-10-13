# Survivor identities / 4.20

Design intent: make Saint-Roch's survivors identifiable through face, silhouette, practical clothing and personal details. The character menu reuses the existing field dossier, with a studio-lit preview and clearly labelled cosmetic controls. No new combat HUD clutter.

Tokens: dark teal #142125, inset #101a1e, raised #213237, bone #eee6cf, muted #b4bbaa and oxidized orange #e99b62. Existing display/mono typography, 8/12/16/24 spacing, 44px controls. Four identity buttons, a persistent portrait on desktop and stacked portrait/controls on mobile. Selection uses a border and pressed state. No decorative UI animation.

## Characters

- Rook, Saint, Torque and Vesper: four named identities and signature appearances with short backstories.
- Twelve cosmetic categories: six skin tones, three face structures, six hairstyles, six hair colors, six eye colors, four facial-hair choices, five markings, four jacket silhouettes, eight clothing palettes, five headwear choices, five accessories and cosmetic helmet visibility.
- Shaped jaw/forehead, eyes, nose, brows, facial details, separate hair/headwear, layered jackets, belts, seams, pockets, articulated coat tails, fingers, shaped boots and rounded equipment plates.
- Small shared procedural weave/grain textures distinguish cloth and leather. Parts are merged by bone/material. A single detailed player uses fewer than 45 base meshes and 26,000 triangles across the signature presets; the existing instanced enemy system is unchanged.
- Profile migration keeps old saves and whitelists appearance values. Cosmetics do not change stats, hitboxes or hand attachment dimensions. Identity selection resets cosmetics to that identity's signature; equipment stays equipped. Individual changes and helmet visibility are permanent.
- Four preview views: three-quarter, front, back and face. Portraits render only when their visual signature/view changes. Inventory always uses the full-body view.

These are improved procedural stylized models. This release does not claim scanned faces, hand-authored cinematic assets, cinematic facial animation or AAA production quality. Those remain a separate art-production investment.

## Mechanics and balance corrections

- Permanent movement and reload contributions now track multiplicative expedition upgrade factors. Changing equipment or reallocating points yields the same result regardless of order, without duplicating bonuses or healing the player.
- Ballistic Weave's 60% expedition cap no longer overwrites permanent armour resistance. Incoming damage still respects the existing overall 80% protection cap.
- Second Wind is an existing intentional synergy. Its doubled regeneration and kill healing remain intact; the dossier now displays effective recovery and identifies the synergy.
- Identical dual firearms preserve the stowed second gun's magazine, reload progress and firing cooldown per weapon type. Re-equipping cannot provide free ammunition or cancel a reload. Wave refills also reset stowed twin reserves.
- Enemy melee damage checks line of sight when the wind-up resolves, preventing damage through solid walls.

## Verification

- 177 automated tests pass, including eight new checks for save migration, valid preset/rig geometry, cosmetic-only helmet hiding, upgrade/respec order, defensive caps, Second Wind, twin-magazine exploits and melee obstruction.
- Production build passes. Three.js retains the existing bundle-size advisory.
- Standard campaign simulation reaches victory after all 32 waves: 1,461 kills, 1,265.4 simulated seconds, no enemies left. This is a deterministic bot regression check, not proof that every build or difficulty is equally balanced.
- Browser checks: switched identities and cosmetic options, confirmed retained appearance after closing/reopening, inspected gun and blade poses/effects, no observed runtime errors. At 390 × 844, appearance controls are 44px high and the dialog has equal client/scroll width (350px).
- Virtual DualSense: D-pad focuses Appearance, Cross opens it, horizontal input changes the face selector, and Circle closes the menu. A new expedition retains the chosen appearance and starts with the correct equipped health.
- Save serialization is tested; development QA deliberately suppresses writes to the user's live progression.
- Desktop responsive and virtual gamepad validation do not substitute for physical phone/DualSense testing.
- Visual review: distinctiveness 7/10, generic UI styling risk 2/10. The dossier and named survivor wardrobe fit the game; close-up facial anatomy remains deliberately simplified. No claim of AAA parity.
