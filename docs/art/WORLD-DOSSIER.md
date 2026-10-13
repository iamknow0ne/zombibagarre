# World Dossier / 4.30

Two original world illustrations generated with the built-in OpenAI image-generation tool on 13 October 2026. No stock assets or artist references. Original PNGs are preserved in public/art and served locally with the game. These are narrative illustrations, not screenshots or promises of currently implemented geometry or NPC behaviour. The two themes are alternative interpretations of Saint-Roch with shared gameplay and progression.

## Direction

A field archive with an editorial split: one large uncropped illustration and one reading column. Coal #142125, bone #eee8d8, amber #f18147; Blackout uses restrained cyan #81d6d8 for selected controls. Existing Impact display type, monospace labels, Georgia reading text. Square edges, 44px minimum buttons, thin separators, no decorative motion. Mobile stacks the painting above the reading panel; sticky close control, native scrolling and chapter buttons support touch and controller menu navigation. Assets load only when a dossier is first opened. Settings and saves are never changed by reading.

## Lore

Canonical in-game text is in src/rebuild/Lore.js: two opening stories, six contact portraits, six faction/threat entries and four survivor hooks. Quarantine follows residents keeping an abandoned French town alive beneath the Bell Warden. Blackout explores the Lazarus network restoring dead citizens without consent. The Lamplighters and Unlinked are narrative factions, not new gameplay systems. Illustrations show world characters rather than exact playable outfit skins.

## Verification

- 225 existing tests passed; production build passed (existing Three.js bundle-size advisory remains).
- Browser: both 1536px artworks decoded; world and chapter switching, next chapter, Escape close, opening from pause and returning to pause verified. No browser console errors in the test session.
- At 390 × 844, the dossier has no horizontal overflow. Uncropped art, readable stacked text and sticky close button verified. Title-menu links now have two columns and 48px minimum hit areas on small screens.
- Saved desktop and phone captures in docs/screenshots/world-dossier-*-4.30.png. Physical controller hardware was not retested; the dossier uses the existing native-button controller navigation.
- Design review: AI Slop 1/10; Distinctiveness 8/10. Editorial archive, place-specific artwork, restrained theme accents, no new glow/card styling or decorative animation. Illustration and gameplay remain clearly distinguished.

## Artwork 01 / The last evening in Saint-Roch

Asset: public/art/quarantine-key-art-v1.png

Exact prompt:

Create one original premium video-game key illustration for ZOMBIE BAGARRE: QUARANTINE. Landscape 1536x1024 composition, NO text, NO logos, NO lettering, not a mockup. A beautiful, haunted small French town called Saint-Roch at blue hour after a zombie outbreak. Cinematic street-level wide shot with a charismatic female survivor seen three-quarter from behind in foreground left, short dark hair, weathered orange field jacket, practical layered armour and backpack, holding a compact improvised firearm safely lowered. Beside her a helmet clipped to an abandoned motorbike. Visually distinct warm limestone facades, slate mansard rooftops, an old stone bell tower rising through distant smoke, canal reflecting small fires at right, hanging ivy, fallen plane-tree leaves, barricades, scattered tiny threatening human silhouettes deep in the street. Restrained amber shop window light against petrol-blue shadows; distant enormous bell-bearing armoured infected silhouette partially obscured by smoke, ominous not goofy. Grounded European survival noir; human resilience and the question of what the bells are summoning. Deliberate strong silhouette, tactile hand-painted surfaces, stunning sophisticated art direction, razor-sharp illustrated details with selective atmospheric depth, natural anatomy and perspective. Not pixel art, not anime, not photorealistic stock photography, not oversaturated. Strong readable focal point and generous city context. Absolutely no interface or labels. Entire finished image is the painting.

## Artwork 02 / A city learning to live offline

Asset: public/art/blackout-key-art-v1.png

Exact prompt:

Create one original premium video-game key illustration for ZOMBIE BAGARRE: BLACKOUT / 2089, a cyberpunk survival world. Landscape 1536x1024, no text, no logos or lettering. A beautifully composed cinematic painting of Neo Saint-Roch: old French limestone architecture and a bell tower enclosed by imposing layered concrete arcologies, rooftops threaded with cables, canal and stone bridge remaining below. Foreground right: charismatic female street medic with closely cropped silver hair, warm ochre waterproof coat, graphite armour and a small precise illuminated cyan neural interface behind her ear, examining a severed glowing data cable in her gloved hand. Balanced natural human proportions; faint scars, determined humanity. A second small hooded courier with amber visor leads civilians across the bridge in middle distance. Flooded wet paving reflects cyan service lights and amber emergency beacons. Background immense signal warden with a halo-shaped industrial antenna barely visible among building-sized pylons and fog; subtle tiny red infected implant lights in shadowy human silhouettes. The city power grid has failed; selective working lights, not a sea of random neon. A few pale blossoming trees growing around old stone give a sense of place and contrast to metal. Rich tactile weathered materials, painterly premium illustrated realism, crisp edges on focal subjects, detailed practical costumes, dramatic volumetric atmosphere, strong readable layered composition, sophisticated restrained petrol blue, bone, cyan and warm amber palette. Theme: the network promised eternal life and the dead came back online. Not pixelated, not anime, not generic purple cyberpunk, no interface, no readable advertising, no title. Entire image is the finished painting.
