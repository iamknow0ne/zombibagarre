"""Small clean anatomical heads for customized survivors/NPCs, pinned CC0 data.
No default cast GLB is modified. Run with Blender --background --python this file.
"""
from pathlib import Path
import sys,json,hashlib
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(Path(__file__).parent))
import makehuman_rook as mh
MORPHS=ROOT/'assets/source/cast/morphs';manifest=json.loads((MORPHS/'manifest.json').read_text())
mh._verify(mh.SOURCE)
for row in manifest['files']:assert hashlib.sha256((MORPHS/row['path']).read_bytes()).hexdigest()==row['sha256']
result={}
for identity,morph in [('medic','african-female-young'),('biker','african-male-young'),('ronin','asian-female-young')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 raw,uvs,faces,groups=mh._obj(mh.SOURCE/mh.BASE);mh._target(raw,MORPHS/(morph+'.target'),1)
 if identity=='biker':mh._target(raw,mh.SOURCE/mh.MUSCLE,.78)
 ids={i for f in groups['body'] for i in f['vertices']};floor=min(raw[i].y for i in ids);scale=1.82/(max(raw[i].y for i in ids)-floor);coords=[Vector((p.x*scale,-p.z*scale,(p.y-floor)*scale)) for p in raw]
 spec=json.loads((mh.SOURCE/mh.RIG).read_text());weights=mh._weights(json.loads((mh.SOURCE/mh.WEIGHTS).read_text())['weights'],len(coords),spec['bones']);rig,joints=mh._armature(spec,coords,identity+'_rig')
 data=dict(rig=rig,coords=coords,groups=groups,faces=faces,uvs=uvs,weights=weights,joints=joints)
 fs=[f for f in groups['body'] if min(coords[i].z for i in f['vertices'])>1.555]
 obj=mh.mesh_from_faces(identity+' head',fs,data);obj.modifiers.clear();obj.parent=None;bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 dec=obj.modifiers.new('Distant face topology','DECIMATE');dec.ratio=.13;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name);obj.data.calc_loop_triangles()
 positions=[];normals=[];uv=[];indices=[];lookup={}
 convert=lambda p:(p.x*1.7,(p.z-1.69)*1.7,(-p.y-.071)*1.7)
 for tri in obj.data.loop_triangles:
  for li in tri.loops:
   loop=obj.data.loops[li];v=obj.data.vertices[loop.vertex_index];p=convert(v.co);n=v.normal;t=obj.data.uv_layers.active.data[li].uv;key=tuple(round(x,5) for x in (*p,n.x,n.z,-n.y,*t))
   if key not in lookup:lookup[key]=len(positions)//3;positions.extend(key[:3]);normals.extend(key[3:6]);uv.extend(key[6:])
   indices.append(lookup[key])
 eyes=[list(convert(rig.data.bones['eye.'+side].head_local)) for side in ['R','L']]
 result[identity]={'position':positions,'normal':normals,'uv':uv,'index':indices,'eyes':eyes,'morph':morph}
 print(identity,len(indices)//3,eyes)
asset={'provenance':{'license':'CC0-1.0','revision':mh.REVISION,'builder':'scripts/art/build_survivor_heads.py','morphManifest':'assets/source/cast/morphs/manifest.json'},'heads':result}
p=ROOT/'assets/characters/survivor-heads.json';p.write_text(json.dumps(asset,separators=(',',':'))+'\n');print('SURVIVOR_HEADS_COMPLETE',p.stat().st_size)
