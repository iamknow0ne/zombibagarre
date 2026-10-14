# Rook anatomical and deformation prototype

This is **an asset-production study, not the replacement playable hero**. It
establishes a reproducible real mesh/UV/skin/skeleton pipeline in Blender. The
face is still a generic anatomical base; the clothing is a first construction
pass. V1 retains flat PBR factors. V2 adds mapped skin, cutout hair/eyes and a
generated olive-canvas albedo; it is not a complete painted PBR material set.
It does not meet the portrait-likeness or gameplay-integration acceptance gate.

## Source and licensing

The graphical data in `makehuman/` comes from the official
[MakeHuman repository](https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482),
revision `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. The mesh, morph targets,
rig and weights are CC0 assets. Original notices and both the project license
explanation and full asset license are retained. `makehuman/manifest.json`
records the revision, filenames, sizes and SHA-256 hashes. No MakeHuman program
code is incorporated into the importer. Do not apply this licensing assumption
to arbitrary community clothing, texture or animation downloads.

`system-assets/` is a small selection from the official
[CC0 system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
Its manifest records the archive URL/hash, individual hashes and license
evidence; original notices are retained in the source material/attachment files.
The original importer implements the documented hm08 attachment mapping and
checks the selected data hashes. No downloaded program code is executed.

`textures/olive-canvas-albedo-v1.png` is an original project texture generated
with the built-in imagegen tool. The exact prompt is stored beside it. Its
actual resolution is 1254×1254; tiling and material scale have been inspected in
the preview, but it is not a baked garment atlas or a normal/roughness set.

The asset uses the adult male target and 0.30 of the muscular build target.
The source importer checks pinned checksums before construction, retains UV
seams, caps normalized weights at four per vertex, and derives the 163-bone rig
from the source joint locations and rotation planes. Coordinates are converted
to Blender Z-up, with feet at zero and a 1.82 m anatomical stature. Export adds
the clothing/headwear height. The resulting GLB is Y-up and faces +Z.

## Rebuild and inspect

From the repository root, with Blender 5.1:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/build_rook_prototype.py -- --study v2
node scripts/art/validate-rook.mjs assets/characters/rook-prototype-v2.glb
node --test scripts/art/validate-rook.test.mjs
```

On this Mac, Blender needs normal host graphics access; the restricted sandbox
crashes during Metal initialization before the Python importer starts.

Outputs:

- `assets/characters/rook-prototype-v2.glb`: actual textured/skinned preview asset.
- `assets/source/rook/rook-prototype-v2.blend`: editable scene with packed textures.
- `docs/art-direction/rook-prototype-v2.png`: neutral-light Blender inspection.

Use `--study v1` to rebuild the preserved untextured study. The viewer switches
between both assets. See [validation evidence](../../../docs/art-direction/ROOK-VALIDATION.md)
for geometry/material counts and Node-versus-browser validation boundaries.

Run the usual development server and open `/dev/character-art-qa.html` for the
actual Three.js import, clip selection, orbit views, normal inspection and draw
statistics. This page is development-only. Neither the asset nor the source
files are included in the normal production build.

## What is established

- Anatomical face/body/hand topology, UVs and real shared skeletal deformation.
- Initial wrapped jacket, trousers, boots, gloves, cap, scarf and harness.
- Breathing and walking **deformation studies**, not final locomotion clips.
- Export/import and animation validation using the installed Three.js version.
- V2 replaces guessed eyes and temple tubes with UV-mapped attachments, fixes
  eye cutout opacity, surface-fits subdivided scarf/harness panels and extends
  glove coverage. Browser close/full/back views and both clips were inspected.

## Required before gameplay replacement

- Sculpt Rook's specific face, hair, stubble and cap silhouette from the original
  portrait; retain the younger angular identity rather than the generic base.
- Rework cuffs, collar, garment thickness, pockets, harness seams and boots.
  Stress-test intersections and distortion across the complete combat range.
- Paint and bake skin/cloth/leather base-color, normal and roughness maps.
- Author grounded locomotion, grip/recoil/reload and melee transitions. The
  present A-pose walk is expressly not an acceptable game animation.
- Consolidate material/mesh batches, remove hidden body geometry, reduce the
  deform rig where appropriate and add measured distance/mobile LODs.
- Implement/rest-pose-test the character adapter, equipment sockets, saved
  customization, FPS hands, portraits/interiors and resource ownership.
- Compare the model at real game distance and close range against the existing
  portrait and current hero. Do not substitute a Blender render for gameplay QA.
