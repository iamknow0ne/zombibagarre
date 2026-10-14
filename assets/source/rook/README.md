# Rook anatomical and deformation prototype

This is **an asset-production study, not the replacement playable hero**. It
establishes a reproducible real mesh/UV/skin/skeleton pipeline in Blender. The
face is still a generic anatomical base; the clothing is a first construction
pass, and the materials are flat PBR factors without painted texture maps.
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

The asset uses the adult male target and 0.30 of the muscular build target.
The source importer checks pinned checksums before construction, retains UV
seams, caps normalized weights at four per vertex, and derives the 163-bone rig
from the source joint locations and rotation planes. Coordinates are converted
to Blender Z-up, with feet at zero and a 1.82 m anatomical stature. Export adds
the clothing/headwear height. The resulting GLB is Y-up and faces +Z.

## Rebuild and inspect

From the repository root, with Blender 5.1:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/build_rook_prototype.py
node scripts/art/validate-rook.mjs
```

On this Mac, Blender needs normal host graphics access; the restricted sandbox
crashes during Metal initialization before the Python importer starts.

Outputs:

- `assets/characters/rook-prototype-v1.glb`: actual skinned preview asset.
- `assets/source/rook/rook-prototype-v1.blend`: editable source scene.
- `docs/art-direction/rook-prototype-v1.png`: neutral-light Blender inspection.

Run the usual development server and open `/dev/character-art-qa.html` for the
actual Three.js import, clip selection, orbit views, normal inspection and draw
statistics. This page is development-only. Neither the asset nor the source
files are included in the normal production build.

## What is established

- Anatomical face/body/hand topology, UVs and real shared skeletal deformation.
- Initial wrapped jacket, trousers, boots, gloves, cap, scarf and harness.
- Breathing and walking **deformation studies**, not final locomotion clips.
- Export/import and animation validation using the installed Three.js version.

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
