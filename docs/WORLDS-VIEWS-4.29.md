# Sharp cities, Blackout and perspective views / 4.29

## Play and configure

Open Settings → World / Art Direction. Changes apply to the current world and persist with the existing settings save.

- Pixel Diorama defaults to **Sharp HD**: full scene resolution, source texture detail, mipmapped filtering and anisotropy. Retro retains enlarged scene pixels and quantized material sampling.
- **Blackout / 2089** is an alternate cyberpunk story treatment of Neo Saint-Roch. The Lazarus neural network controls the infected; Mara, Lenoir and Nocturne have new contact briefings. Industrial surfaces, luminous facade strips, advertising panels and utility sprites replace or supplement the old-town dressing. Switching back restores Quarantine's materials, light and story copy. Existing contracts, currencies, quest identities and character saves are shared, not a separate campaign.
- **Natural / Cinema / Illustrated** shader treatments affect the scene; HUD text remains outside the postprocessing pipeline.
- Foliage controls the density of extra plant sprites. Street detail controls utility props, cyberpunk signs and atmospheric ash. Existing structural buildings, trees and collision obstacles are retained.
- Ambient survivors are decorative scavengers following seeded, obstacle-checked sidewalk routes. Off / Sparse / Busy is independent of combat difficulty, hostile counts and quest contacts. Maximum 48 plans, six instanced body-part batches.
- Lighting Basic removes local lights and shadows; Standard enables two nearby street lights plus combat lighting; Full enables four and adds AO on High graphics in Diorama. Blackout uses restrained bloom only with High graphics + Full lighting.
- Graphics controls resolution (DPR ceilings 1 / 1.35 / 2) and shadows. For mobile, begin with Balanced, Standard lighting and Sparse survivors.

## Camera foundation and limits

Diorama remains recommended. Experimental third-person and first-person modes share the same simulation and saves. The camera retracts before live building, tree and crate footprints; driving falls back to a chase distance. Destroyed buildings no longer obstruct the camera.

Mouse: click the game to capture look; Escape releases and pauses. If the browser denies capture, right-drag looks and left mouse fires. Controller: left stick moves relative to the camera, right stick looks, existing hand bindings fire. Touch: left joystick moves relative to the camera; right joystick looks and attacks. Look speed uses elapsed time and stops after release. First-person view reuses equipped weapon and forearm animations; switching back restores the normal character.

These are **ground-plane combat prototypes**, not a full vertical shooter conversion. Looking up/down does not introduce vertical hitboxes, aiming at rooftop enemies, jumping, interiors or new traversal. Auto fire is suspended while the perspective camera is active. Ambient sprites and distant city geometry were originally authored for an elevated camera and can look flat from street level. Physical controller, phone and Safari pointer-lock behavior still need real-device checks.

## Asset audit and provenance

The existing Saint-Roch foliage atlas was retained: its source has sufficient detail; repeated quantization and nearest-only filtering caused the harsh appearance. Characters, armour and weapons already use articulated 3D meshes and do not need sprite replacements for these camera prototypes.

Two original PNG atlases were generated with the built-in image_gen tool on 13 October 2026, inspected, copied into public/art and connected to the runtime. No third-party game art was imported.

- public/art/blackout-sprites-v1.png — transparent 4 × 2 utility atlas: vending machine, terminal, cabinet, cargo cases, ventilation unit, batteries, hydroponic planter and hanging cables. Cases and ventilation also dress the original city. Props are cutout scenery, not new interactive shops.
- public/art/blackout-materials-v1.png — opaque 2 × 2 atlas: concrete, industrial wall panels, roof panels and paving. Both atlases preserve the generated original pixels.

### Sprite generation prompt

Use case: stylized-concept. Production-ready ORIGINAL cyberpunk environment sprite atlas for Zombie Bagarre. Transparent PNG, square canvas with exactly FOUR columns and TWO rows of equal size, eight isolated props fully inside each cell with 15 percent transparent padding. Top row: compact vending machine with cyan light strips; weathered amber street data terminal; tall utility cabinet with exposed cables; stacked blue-grey cargo cases. Bottom row: small rooftop ventilation unit; stacked battery cylinders with amber indicator lights; low hydroponic planter with lush green leaves; hanging cable bundle and junction box. Sharp high resolution painted game-art, crisp fine edges, realistic metal wear and screws, stylish detailed miniature props, restrained petroleum blue, warm amber and pale cyan palette. Slight elevated three-quarter view consistent for all props, no pixel clusters, no blur, no surrounding scenery, no text, no logos, no gridlines, no shadows outside objects. Actual alpha transparent background.

### Material generation prompt

Use case: stylized-concept. Create an original high resolution sharp game material atlas, square canvas divided into EXACTLY four equally sized quadrants, NO gutters borders labels or text. Upper left: light warm grey architectural concrete panels with narrow seams and fine pitting. Upper right: weathered muted blue-grey industrial steel wall panels with bolts, fine scratches and occasional thin copper conduit lines. Lower left: dark graphite roof panels with small ventilation slots and metal seams. Lower right: grey stone sidewalk pavers with worn corners. Flat orthographic front-facing albedo textures with uniform diffuse illumination, tiny crisp details, each quadrant seamless repeatable tile, no perspective, no lighting glow, no objects or shadow gradients. Premium miniature city game texture, detailed stylized realism, NOT pixel art, no chunky pixels, no blur. Coherent subdued palette so city lighting can color these surfaces.

## Research, consulted 13 October 2026

- [Three.js texture guide](https://threejs.org/manual/pages/textures.html): magnification/minification filters, mipmaps, texture atlases and GPU memory. Applied linear magnification, trilinear minification and anisotropy; kept screen-pixel enlargement opt-in.
- [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html): perspective projection, aspect and clipping. Implemented a separate camera rig while keeping the orthographic camera intact.
- [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API): relative mouse movement, user-gesture entry and unlock handling. Added a browser-denial fallback instead of requiring capture.
- [Three.js UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html): thresholded bloom. Restricted it to the expensive lighting preset and retained readable silhouettes.

The installed renderer remains Three.js r169; code was checked against the local module implementation rather than assuming current documentation APIs all exist in that version.

## Design decisions

Retain the existing field-equipment settings layout, bone text, coal backgrounds, amber labels, restrained borders and native select controls. Cyberpunk cyan is attached to electrical fixtures and story identity; it does not recolor all menus. Separate style from density and resolution. Mark experimental views at selection time and describe input and combat limitations directly.

Review: no new generic card grid, ornamental gradients or hover motion; controls are labelled and keyboard/gamepad navigable. Text and HUD stay full resolution. Main readability constraint is the game's already long settings dialog; all options remain scrollable on phone widths.

## Validation

225 automated tests passed after the main implementation, covering existing combat, progression, mobile controls and rendering contracts plus settings migration, frame-rate independent look, release-to-stop behavior, camera-relative movement, obstruction clearance and deterministic ambient routes. After final control and first-person presentation fixes, 25 targeted tests and the production build also passed.

Browser inspection: sharper Diorama and Blackout materials, theme restoration, three camera modes, first-person equipment, illustrated/retro treatments, low-detail rendering and phone controls. Scripted dual-thumb input moved and fired in TPS and FPS; release stopped turning. Switching back restored the orthographic camera and auto fire. Directional touch dodge travelled 5.75 m in the checked case. No browser console errors were recorded. A 390 × 844 capture is saved as blackout-mobile-429.png. Development fixtures are staged, not campaign completion or hardware performance proof. Captures in docs/screenshots include sharp-diorama-429.png, blackout-diorama-429.png, blackout-tps-429.png and blackout-fps-429.png.

The existing large Three.js bundle advisory remains; build output is valid.

