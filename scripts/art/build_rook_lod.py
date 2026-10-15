"""Pack preserved Rook v7 with a skinned distance LOD; never alter its source."""
import bpy,json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v7.blend'))
scene=bpy.context.scene;scene.frame_set(0)
meshes=[o for o in scene.objects if o.type=='MESH' and o.name!='Preview floor']
for obj in meshes:
    low=obj.copy();low.data=obj.data.copy();scene.collection.objects.link(low)
    low.name='LOD1 / '+obj.name;low['castLOD']=1
    obj.name='LOD0 / '+obj.name;obj['castLOD']=0
    bpy.ops.object.select_all(action='DESELECT');low.select_set(True);bpy.context.view_layer.objects.active=low
    dec=low.modifiers.new('Distance silhouette','DECIMATE');dec.ratio=.38;dec.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=dec.name)
    low.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='ARMATURE' or obj.type=='MESH' and obj.name!='Preview floor':obj.select_set(True)
out=ROOT/'assets/characters/rook-cast-v7.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_extras=True)
# Preserve original glTF material multipliers (Blender's packed scene may predate
# the reviewed final factors). Names, maps and actual image payloads stay shared.
source=(ROOT/'assets/characters/rook-prototype-v7.glb').read_bytes();sj=json.loads(source[20:20+struct.unpack_from('<I',source,12)[0]])
factors={m['name']:m.get('pbrMetallicRoughness',{}).get('baseColorFactor') for m in sj['materials']}
raw=out.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length]);tail=raw[20+length:]
for m in gltf['materials']:
    if factors.get(m['name']):m['pbrMetallicRoughness']['baseColorFactor']=factors[m['name']]
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
out.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
print('ROOK_CAST_LOD_COMPLETE',out)
