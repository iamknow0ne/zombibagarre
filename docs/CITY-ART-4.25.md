# Saint-Roch art pass / 4.25

Design direction before implementation: weathered French market-town diorama. Warm limestone and terracotta, charcoal slate, olive foliage, restrained coral flowers and amber windows. Retain the survivor-dossier settings typography, square controls, 44px targets and existing spacing; add one labelled visual-style selector, not another overlay. World art receives the pixel treatment while menus, aiming and combat text remain at native resolution. Classic remains the default. Generated environment sprites add organic silhouettes; actor rigs remain animated 3D, preserving armour, weapon poses and dismemberment.

Street work: remove the imposed starting cross, reduce arbitrary control-point wobble, split actual crossings into junctions, leave junction centres free of lane dashes, and rotate pedestrian markings to match sufficiently long approaches. Keep four seeded town forms and a single plan for visuals, navigation, parking and map rendering.

Traversal recommendation: first add a support-height model and low vaultable cover, then landable terraces/roof ledges, then grappling to explicit anchors. Character vertical position/velocity, landing validation, height-aware shots, enemy access, destroyed supports, vehicle transitions and touch/controller bindings all need to agree before this ships. Current collision, navigation and combat operate mainly on X/Z; simply animating a jump would let the character overlap obstacles without a valid landing. This release is the art/street pass, not an enabled traversal system.

Research checked 13 October 2026:
- Square Enix, FINAL FANTASY RESONANCE announcement: https://www.square-enix.com/asia/newsportal/en/topics/FFRS/post01.html — announced 22 October 2026 release.
- Official Japanese site: https://www.jp.square-enix.com/FFRS/ — lists the September demo and final trailer; use official pre-release footage as visual reference rather than reviews of the unreleased full game.
- Square Enix on PlayStation Blog: https://blog.playstation.com/2026/09/03/final-fantasy-resonance-ps5-demo-available-today-sephiroth-revealed/ — pixel-art concept and demo context.
- Acquire / Unreal Engine developer interview: https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US — coherent 2D/3D lighting and a richer world.
- Three.js RenderPixelatedPass: https://threejs.org/docs/pages/RenderPixelatedPass.html — reference for pixel rendering; inspect the installed r169 implementation before choosing integration.
- Epic Game Animation Sample: https://dev.epicgames.com/documentation/en-us/unreal-engine/game-animation-sample-project-in-unreal-engine — traversal state and movement/animation coordination. This is an architectural reference, not code or assets imported into this Three.js project.

Original asset production: built-in image generation. No reference game artwork is included. The two complete PNG atlases are stored in public/art; runtime UV selection samples their cells. See docs/art/CITY-ASSETS.md for prompts and intended cells.

## Validation and limits

- Full automated suite: 205/205 passed. After the final roadside-sign placement adjustment, the city-art, renderer and performance tests passed again (16/16). Production build passes; the existing Three.js bundle-size advisory remains.
- Topology coverage includes 64 seeds across all four street families and traversability/parking checks across 32 seeds. New tests cover crossing splits, bend exclusion, short approaches, sprite placement, texture restoration and alpha-cutout ambient occlusion.
- Browser review: generated atlases loaded successfully (219 sprite placements in seed 20261012); Pixel → Classic restores the original materials; no browser error logs during the art review. Corrected facade sprites to lie against walls instead of tilting into them. Reduced noisy texture sampling and preserved readable silhouettes.
- Responsive review at 390 × 844: the visual-style selector is 44px tall and both option names fit. Menus remain at native resolution. This is browser viewport validation, not physical-phone or controller hardware certification.
- Screenshots: `screenshots/pixel-city-425.png`, `screenshots/classic-city-425.png`, `screenshots/street-junction-425.png`, `screenshots/pixel-settings-mobile-425.png`. Art and junction screenshots are explicitly staged renderer scenes.
- Sprite layer is decorative; it does not introduce new obstacles, NPC simulation or combustible flowerpots. Attached dressing follows building visibility and collapse. The source atlases remain cached across world rebuilds; per-world geometry, cloned maps and materials are released. Maximum eight sprite draws; distant instances hide; updates run at 10Hz. No FPS improvement claim is made.
- Pixel mode uses a single colour post-process and disables the separate AO pass. Classic high quality retains AO. The generated environmental style is a prototype, not a complete replacement of character rigs with authored directional sprite sheets.

UI review: AI Slop Score 1/10 (palette 0, layout 0, components 0, type 1, decorative noise 0); Distinctiveness 8/10 (product fit 2, system 2, layout 1, type 1, signature 2). The existing field-equipment panel, amber accents and French streetscape remain consistent. Remaining art risk: repeated masonry patterns and low-poly trees are still visible beside the generated pixel assets. Future art work should add matching tree canopies, more wall variants and authored actor sheets only after animation/equipment coverage is planned.
