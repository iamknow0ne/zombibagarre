# Infected anatomical head

`infected-head.json` is derived from the MakeHuman official base mesh, adult male
morph and muscle morph, pinned at commit
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. These graphical assets are **CC0-1.0**.
Original notices, source data and SHA-256 manifest are preserved under
[`assets/source/rook/makehuman`](../source/rook/makehuman).
No MakeHuman program code, third-party community clothing or new download is
included in this asset.

The project-authored builder is `scripts/art/build_enemy_head.py`. It uses the
existing hash-verifying importer, extracts the head/upper neck, reduces it to
933 triangles with Blender 5.1.2, retains source UVs and converts to the runtime's
Y-up/+Z-forward head space. Output: 552 vertices, 47,397 bytes before compression.
The original source and Rook model are not modified. Rebuild from repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/build_enemy_head.py
```

The runtime clones this shared canonical mesh per enemy appearance, performs
small continuous jaw/cheek identity deformations, paints illness pigmentation,
projects cheek lesions and inserts eyes. The original ear, nose, lip and jaw
surfaces remain one anatomical mesh. This is an anatomical production upgrade,
not a completed portrait-specific sculpt, facial animation rig or individually
authored infected skin atlas. The original UVs support the shared source atlas
described below.

`infected-skin.png` is an **unchanged copy** of
`assets/source/rook/system-assets/skins/young_caucasian_male/young_lightskinned_male_diffuse.png`
from the official MakeHuman CC0 system asset pack. Its original license and hash
manifest remain in `assets/source/rook/system-assets`. It is shared across all
infected faces; head-only UVs sample the original atlas. Illness tinting stays
in runtime vertex color. This adds a cached 3.5 MB skin atlas rather than claiming
a newly authored painted texture. No source bitmap was edited.
