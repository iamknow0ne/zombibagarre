# Saint, Torque and Vesper: reproducible survivor assets

These are fully dressed, skinned character assets, built from distinct adult
MakeHuman morphology and original project tailoring. They are not portrait scans
and do not claim photorealistic likeness. Compare actual engine views as well as
the neutral full/face renders here before approving a release.

## Source and license

The shared base topology, skin weights, rig, eye attachment and source textures
are the reviewed assets documented in `../rook/README.md` and their retained
manifests. Additional African female, Asian female, African male and adult female
macrodetail targets come from the same official MakeHuman revision
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. `morphs/manifest.json` records each
original URL, SHA-256 and size. Original target headers identify CC0; the complete
license text remains at `../rook/makehuman/LICENSE.ASSETS.md`. No downloaded
program code is incorporated or executed.

The Python builder verifies every additional morph hash. Clothing construction,
braids, beret, topknot, band, satchel, goggles, mechanic equipment and facial-hair
shell are original project geometry. Existing raster images are used unchanged;
material tints and the retained wool normal map supply color/material variation.
The output's base-color multipliers are explicit standard glTF factors, including
where Blender does not export the equivalent preview multiply node automatically.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/art/build_survivor_cast.py -- --hero all
node --test scripts/art/survivor-cast.test.mjs
```

Blender needs normal host graphics access on this Mac. `--hero saint`, `torque`
and `vesper` build one identity. `--no-render` skips the neutral review captures,
not asset export or editable Blender source saving.

All models use the original 163 named bones, normalized weights, feet at zero
and forward +Z after glTF export. Male/female morphology changes the rest-pose
joint locations, so runtime retargeting must remain rest-pose-aware.

Each GLB holds LOD0 and a separately decimated LOD1 sharing images, materials and
rig. Mesh extras `castLOD` select the distance version. Only LOD0 is visible in
the saved neutral render scene. Runtime must select exactly one LOD; loading
both levels without visibility filtering intentionally does not represent the
production draw/triangle count. Headwear, hair and facial hair are separate
material batches so helmets can hide hats/hair while retaining eyebrows/beards.

The models provide geometry and skinning; production motion is driven by the
existing runtime animation adapter. No animation clips were invented or claimed.
The main application's actual gameplay/camera/equipment QA remains the release
authority. Neutral renders do not establish controller, phone or native-device
performance.

## Reviewed candidate measurements

`build-manifest.json` records exact GLB and corresponding neutral-render hashes.
The retained build was checked with five actual-file tests (all passed):

| Identity | GLB bytes | LOD0 / LOD1 triangles | Draws per selected LOD |
| --- | ---: | ---: | ---: |
| Saint | 8,056,296 | 44,822 / 19,263 | 13 |
| Torque | 7,756,524 | 37,862 / 16,266 | 12 |
| Vesper | 7,399,964 | 32,194 / 13,832 | 12 |

Each has exactly 163 bones and five shared, byte-identical source images across
both levels. Tests verify normalized actual exported weights, complete matching
LOD batches, distinct anatomical vertex payloads, source checksums and unchanged
image payloads. Headgear follows skull geometry; eyebrows and lapels are projected
onto anatomical/coat surfaces and separate material batches remain selectable.

The neutral renders use Eevee, with no bloom or depth of field. These assets now
have distinct adult morphology and readable identity silhouettes; face/hair and
clothing still use a stylized material treatment. The beard is a smooth skinned
facial-hair shell, not strand simulation. Photoreal portrait likeness, runtime
cloth collision and physical-device performance are not established by this asset
work or its test count. Runtime deformation/equipment review remains essential.
