"""Export an anatomical infected head from pinned CC0 MakeHuman graphical data.

Run with Blender --background --python scripts/art/build_enemy_head.py.
The existing original importer verifies source hashes; no network or source
modification occurs. This static, UV-preserving mesh is owned by EnemyVisuals.
"""
from pathlib import Path
import sys, json, hashlib
import bpy
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from makehuman_rook import build_base,mesh_from_faces,REVISION,BASE,SOURCE
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
data=build_base()
faces=[f for f in data['groups']['body'] if min(data['coords'][i].z for i in f['vertices'])>1.555]
head=mesh_from_faces('Infected anatomical head',faces,data)
head.modifiers.clear();head.parent=None
# Keep the nose, mouth, eye socket and ear silhouette in one continuous surface.
bpy.context.view_layer.objects.active=head;head.select_set(True)
dec=head.modifiers.new('Horde head topology','DECIMATE');dec.ratio=.11;dec.use_collapse_triangulate=True
bpy.ops.object.modifier_apply(modifier=dec.name)
head.data.calc_loop_triangles()
if not 700 <= len(head.data.loop_triangles) <= 1000:
 raise RuntimeError('Anatomical head exceeded its reviewed triangle budget')
# Blender Z-up / -Y forward -> head-local Y-up / +Z forward. The neck cut is
# hidden inside the existing collar and the forehead remains inside headwear.
positions=[];normals=[];uvs=[];indices=[];lookup={}
for tri in head.data.loop_triangles:
 for loop_index in tri.loops:
  loop=head.data.loops[loop_index];v=head.data.vertices[loop.vertex_index];p=v.co;n=v.normal;uv=head.data.uv_layers.active.data[loop_index].uv
  point=(p.x*1.7,(p.z-1.69)*1.7,(-p.y-.071)*1.7)
  normal=(n.x,n.z,-n.y)
  key=tuple(round(a,5) for a in (*point,*normal,*uv))
  if key not in lookup:
   lookup[key]=len(positions)//3;positions.extend(key[:3]);normals.extend(key[3:6]);uvs.extend(key[6:])
  indices.append(lookup[key])
asset={'provenance':{'license':'CC0-1.0','source':'MakeHuman official graphical base and adult male/muscle morphs','revision':REVISION,'baseSHA256':hashlib.sha256((SOURCE/BASE).read_bytes()).hexdigest(),'builder':'scripts/art/build_enemy_head.py'},'position':positions,'normal':normals,'uv':uvs,'index':indices}
encoded=json.dumps(asset,separators=(',',':'))+'\n'
if len(encoded.encode())>80000:raise RuntimeError('Head asset exceeded its transfer budget')
path=ROOT/'assets/characters/infected-head.json';path.write_text(encoded)
print('INFECTED_HEAD_EXPORTED',len(indices)//3,len(positions)//3,path.stat().st_size)
