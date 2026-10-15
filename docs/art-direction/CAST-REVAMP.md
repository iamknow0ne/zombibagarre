# Production cast revamp

15 October 2026. Production cast integrated in 4.51.0; release validation is tracked below.

The target is the recognizable four-person cast established by the lore portraits,
with anatomical faces/hands, tailored clothing, material separation and coherent
motion in actual gameplay. A recolored Rook is not an acceptable replacement for
Saint or Vesper. Source licenses, reproducible builders and asset hashes must
travel with the assets.

## Acceptance checklist

- [x] Rook integrated with weapons, armour and helmet masking (4.50).
- [x] Saint: distinct adult face, braids, beret, ivory trench and medical satchel.
- [x] Torque: broader anatomy, beard, mechanic's clothing and goggles.
- [x] Vesper: distinct adult face, tied hair, red band and split navy coat.
- [x] All four reviewed in the live renderer, close and distant, moving/armed,
      paired weapons, melee, helmet on/off and an interior.
- [x] Detailed FPS arms: fingers and sleeves follow live weapon grips, no visible
      cut openings or torso intrusion, pause/camera/reload transitions preserved.
- [x] Skinned distance LOD: close views retain detail, street views reduce geometry,
      threshold hysteresis and repeated appearance rebuilds retain ownership.
- [x] Ordinary enemy heads: anatomical surface with readable damage and identity;
      all six archetypes retain gore, crawl, corpse and instancing behavior.
- [x] Boss silhouettes and surface construction reviewed during actual attacks.
- [x] Custom appearances, armour and traders retain their identities; unsupported
      customization must remain explicitly documented rather than silently lost.
- [ ] Runtime regressions, actual browser review, production build and packaged
      Mac startup pass; publication checked against exact tested artifact.

Physical phone/controller feel and sustained target-device benchmarks remain
separate evidence gates. Passing model assertions cannot establish visual quality.

## Current implementation

A keyed, lazy asset library now supplies all four distinct authored identities.
Skin, hair and clothing dyes operate on per-instance materials. Custom hairstyles
and headwear are fitted against immutable bind-pose skull bounds; equipped helmets
mask them. Custom face, eye, scar, coat and accessory choices retain the modular
body with newly anatomical heads. Traders use the same anatomy. These modular
variants remain visually simpler than the default authored garments.

Each survivor has detailed and distance geometry sharing original textures and
rig data. Screen-space size selects the level; first-person hands stay detailed.
Skeleton consolidation remains within each actor. Original texture payloads,
source files, reproducible builders and license provenance accompany the assets.

All six infected use textured anatomical heads. Organic torsos, projected wounds,
crawl/death behavior and boss surface refinements have rendered and regression
coverage. See [4.51.0 evidence](../RELEASE-4.51.0.md).

## Art boundary

Default-cast integration and the cast-wide anatomical pass are complete. Bespoke
high-detail meshes for every modular garment, facial expressions/dialogue and
photorealistic parity with painted portraits are not included in this milestone.
Do not describe those as implemented or infer target-device FPS from model budgets.
