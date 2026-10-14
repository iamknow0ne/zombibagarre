"""Development-only continuous leather sling; preserves v6 and its animation rig."""
import bpy,bmesh,math,json,struct,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v6.blend'))
scene=bpy.context.scene;scene.frame_set(0);rig=next(o for o in scene.objects if o.type=='ARMATURE')
coat=next(o for o in scene.objects if o.type=='MESH' and 'Field jacket' in o.name)
leather=next(o for o in scene.objects if o.type=='MESH' and 'Leather / dark' in o.name)
brass=next(o for o in scene.objects if o.type=='MESH' and 'Hardware / aged' in o.name)
seam=next(o for o in scene.objects if o.type=='MESH' and 'Canvas / seam' in o.name)
def components(obj):
 p=list(range(len(obj.data.vertices)))
 def find(i):
  while p[i]!=i:p[i]=p[p[i]];i=p[i]
  return i
 for e in obj.data.edges:a,b=e.vertices;p[find(a)]=find(b)
 g={}
 for v in obj.data.vertices:g.setdefault(find(v.index),[]).append(v.index)
 return sorted(g.values(),key=len,reverse=True)
base=set(components(coat)[0]);coat.data.calc_loop_triangles();positions=[coat.matrix_world@v.co for v in coat.data.vertices];triangles=[tuple(t.vertices) for t in coat.data.loop_triangles if all(i in base for i in t.vertices)]
surface=BVHTree.FromPolygons(positions,triangles,all_triangles=True)
weights=[{coat.vertex_groups[g.group].name:g.weight for g in v.groups} for v in coat.data.vertices]
provenance=[];objects=[]
fit_path=ROOT/'assets/source/rook/rook-v7-fitted-weights.json';fitted={}
if fit_path.exists():fitted={(r['material'],tuple(r['p'])):r['weights'] for r in json.loads(fit_path.read_text())['vertices']}
bone_names={name.replace('.','').replace(':','').replace('/',''):name for name in rig.data.bones.keys()}
def yup(p):return [round(p.x,7),round(p.z,7),round(-p.y,7)]
def support(p,offset=.006,radial=False):
 if radial:
  direction=Vector((p.x,p.y,0)).normalized();hit,n,index,_=surface.ray_cast(Vector((direction.x,direction.y,p.z)),-direction)
 elif p.z>1.45:
  # Rotate the projection continuously around the shoulder instead of switching
  # abruptly between nearest-point and horizontal rays at a y threshold.
  direction=Vector((0,p.y,p.z-1.45)).normalized();origin=Vector((p.x,0,1.45))+direction
  hit,n,index,_=surface.ray_cast(origin,-direction)
 else:
  side=1 if p.y>0 else -1;hit,n,index,_=surface.ray_cast(Vector((p.x,side,p.z)),Vector((0,-side,0)))
 if hit is None:hit,n,index,_=surface.find_nearest(p)
 ids=triangles[index];a,b,c=[positions[i] for i in ids];v0=b-a;v1=c-a;v2=hit-a;d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1);den=d00*d11-d01*d01;wb=(d11*d20-d01*d21)/den;wc=(d00*d21-d01*d20)/den;bary=[1-wb-wc,wb,wc];w={}
 for vertex,k in zip(ids,bary):
  for name,value in weights[vertex].items():w[name]=w.get(name,0)+max(0,k)*value
 w=sorted(w.items(),key=lambda x:-x[1])[:4];total=sum(v for _,v in w)
 return {'p':hit+n*offset,'n':n,'weights':{k:v/total for k,v in w},'triangle':[positions[i].copy() for i in ids],'bary':bary}
def add(name,records,faces,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([r['p'] for r in records],[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.parent=rig;mesh.materials.append(material);uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:
   p=records[mesh.loops[loop].vertex_index]['p'];uv.data[loop].uv=(p.x*7.4925,p.z*7.4925)
 for i,r in enumerate(records):
  fit=fitted.get((material.name,tuple(yup(r['p']))))
  if fit:r['weights']={bone_names[k]:v for k,v in fit.items()}
  for bone,value in r['weights'].items():vg=obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone);vg.add([i],value,'REPLACE')
  provenance.append({'part':name,'material':material.name,'p':yup(r['p']),'triangle':[yup(p) for p in r['triangle']],'bary':r['bary']})
 mod=obj.modifiers.new('Shared deform rig','ARMATURE');mod.object=rig;objects.append(obj);return obj
# Remove the disconnected diagonal and the two buried tubular belt halves.
# Gloves, boots and brim remain exact.
old=[g for g in components(leather) if len(g)==224 and min(leather.data.vertices[i].co.z for i in g)>1.07]
assert len(old)==1,'Unexpected old sling topology'
old_belt=[g for g in components(leather) if len(g)==392 and max(leather.data.vertices[i].co.z for i in g)<1.01];assert len(old_belt)==2
bm=bmesh.new();bm.from_mesh(leather.data);bm.verts.ensure_lookup_table();removed=old[0]+sum(old_belt,[]);bmesh.ops.delete(bm,geom=[bm.verts[i] for i in removed],context='VERTS');bm.to_mesh(leather.data);bm.free()
# A closed-body sling: from the front belt, over the left shoulder, back to the rear belt.
anchors=[(.13,-.16,.993),(.093,-.18,1.09),(.026,-.19,1.22),(-.055,-.19,1.36),(-.132,-.14,1.49),(-.163,-.09,1.548),(-.17,-.025,1.575),(-.17,.045,1.562),(-.153,.105,1.515),(-.11,.14,1.40),(-.035,.15,1.26),(.05,.14,1.12),(.128,.115,.993)]
anchors=list(map(Vector,anchors));path=[]
for i in range(len(anchors)-1):
 a,b,c,d=anchors[max(i-1,0)],anchors[i],anchors[i+1],anchors[min(i+2,len(anchors)-1)]
 for j in range(8):
  t=j/8;path.append((2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
path.append(anchors[-1]);records=[];cols=4
for i,p in enumerate(path):
 r=support(p);t=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized();side=t.cross(r['n']).normalized()
 # Bridge the pocket volume smoothly, avoiding an abrupt step at the flap edge.
 clearance=.006
 if p.y<-.07 and 1.25<p.z<1.49:clearance+=.019*math.sin(math.pi*(p.z-1.25)/.24)**.55
 for j in range(cols+1):
  u=j/cols;r=support(p+side*((u-.5)*.033),clearance+.0007*math.sin(math.pi*u));records.append(r)
faces=[]
for i in range(len(path)-1):
 for j in range(cols):a=i*(cols+1)+j;faces.append((a,a+1,a+cols+2,a+cols+1))
count=len(records)
for r in list(records):q=dict(r);q['p']=r['p']-r['n']*.0028;records.append(q)
faces += [tuple(i+count for i in reversed(f)) for f in list(faces)]
boundary=list(range(cols+1))+[i*(cols+1)+cols for i in range(1,len(path))]+[(len(path)-1)*(cols+1)+j for j in range(cols-1,-1,-1)]+[i*(cols+1) for i in range(len(path)-2,0,-1)]
for i,a in enumerate(boundary):b=boundary[(i+1)%len(boundary)];faces.append((a,b,b+count,a+count))
add('Rook v7 / continuous shoulder sling',records,faces,leather.data.materials[0])
def tube(name,rs,radius,material,sides=6):
 out=[];faces=[]
 for i,r in enumerate(rs):
  tangent=(rs[min(i+1,len(rs)-1)]['p']-rs[max(0,i-1)]['p']).normalized();side=tangent.cross(r['n']).normalized()
  for j in range(sides):q=dict(r);q['p']=r['p']+(r['n']*math.cos(j*math.tau/sides)+side*math.sin(j*math.tau/sides))*radius;out.append(q)
  if i:
   for j in range(sides):a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces+=[tuple(reversed(range(sides))),tuple((len(rs)-1)*sides+j for j in range(sides))]
 add(name,out,faces,material)
for side in [0,cols]:
 rs=[]
 for i in range(len(path)):
  r=dict(records[i*(cols+1)+side]);r['p']=r['p']+r['n']*.0007;rs.append(r)
 tube('Rook v7 / sling edge stitch '+str(side),rs,.0005,seam.data.materials[0],4)
# A restrained rectangular brass adjuster and keeper bars, seated on the actual sling.
def hardware(row,label,length=.025):
 center=records[row*(cols+1)+2];t=(records[(row+1)*(cols+1)+2]['p']-records[(row-1)*(cols+1)+2]['p']).normalized();s=t.cross(center['n']).normalized();rs=[]
 corners=[(-.020,-length/2),(.020,-length/2),(.020,length/2),(-.020,length/2),(-.020,-length/2)]
 for i in range(4):
  for k in range(4):
   u=k/4;x=corners[i][0]*(1-u)+corners[i+1][0]*u;y=corners[i][1]*(1-u)+corners[i+1][1]*u;q=support(center['p']+s*x+t*y);q['p']=center['p']+s*x+t*y+center['n']*.003;rs.append(q)
 rs.append(dict(rs[0]));tube('Rook v7 / '+label+' brass frame',rs,.0021,brass.data.materials[0],6)
 rs=[]
 for k in range(9):q=support(center['p']+s*((k/8-.5)*.04));q['p']=center['p']+s*((k/8-.5)*.04)+center['n']*.003;rs.append(q)
 tube('Rook v7 / '+label+' brass bar',rs,.0017,brass.data.materials[0],6)
hardware(30,'shoulder adjuster');hardware(2,'front belt anchor',.018);hardware(len(path)-3,'rear belt anchor',.018)
# Replace the buried round belt with a thin closed leather band on the coat.
belt=[];steps=96;belt_faces=[]
for layer in range(2):
 for row in range(3):
  for i in range(steps):
   angle=i*math.tau/steps;belt.append(support(Vector((math.sin(angle)*.23,-math.cos(angle)*.23,.985+(row-1)*.015)),.009-layer*.003,radial=True))
for layer in range(2):
 for row in range(2):
  for i in range(steps):
   a=layer*3*steps+row*steps+i;b=layer*3*steps+row*steps+(i+1)%steps;f=(a,b,b+steps,a+steps);belt_faces.append(tuple(reversed(f)) if layer else f)
for row in [0,2]:
 for i in range(steps):
  a=row*steps+i;b=row*steps+(i+1)%steps;belt_faces.append((a,b,b+3*steps,a+3*steps))
add('Rook v7 / fitted waist belt',belt,belt_faces,leather.data.materials[0])
for row in [0,2]:tube('Rook v7 / waist belt seam '+str(row),belt[row*steps:(row+1)*steps]+[belt[row*steps]],.0005,seam.data.materials[0],4)
# Keep the authored buckle, moving it onto the visible band without changing its shape.
for group in components(brass):
 center=sum((brass.matrix_world@brass.data.vertices[i].co for i in group),Vector())/len(group)
 if abs(center.x)<.01 and .97<center.z<1.02:
  target=support(center,.016)['p'];delta=target-center
  for i in group:brass.data.vertices[i].co+=delta
brass.data.update()
# Join into existing batches: no new materials or draw calls.
for target in [leather,brass,seam]:
 bpy.ops.object.select_all(action='DESELECT');target.select_set(True)
 matching=[obj for obj in objects if obj.data.materials[0]==target.data.materials[0]]
 objects=[obj for obj in objects if obj not in matching]
 for obj in matching:obj.select_set(True)
 bpy.context.view_layer.objects.active=target;bpy.ops.object.join()
for obj in scene.objects:
 if obj.name.startswith('Rook v6'):obj.name=obj.name.replace('Rook v6','Rook v7',1)
out=ROOT/'assets/characters/rook-prototype-v7.glb';bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
 if obj.type=='ARMATURE' or obj.type=='MESH' and obj.name!='Preview floor':obj.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=True,export_image_format='AUTO')
source=(ROOT/'assets/characters/rook-prototype-v6.glb').read_bytes();source_json=json.loads(source[20:20+struct.unpack_from('<I',source,12)[0]]);factors={m['name']:m.get('pbrMetallicRoughness',{}).get('baseColorFactor') for m in source_json['materials']};raw=out.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length]);tail=raw[20+length:]
for m in gltf['materials']:
 if factors.get(m['name']):m['pbrMetallicRoughness']['baseColorFactor']=factors[m['name']]
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);out.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
(ROOT/'assets/source/rook/rook-v7-surface-bindings.json').write_text(json.dumps({'scope':'Sling, stitch and hardware source coat supports; Y-up metres.','vertices':provenance},separators=(',',':')))
scene.render.engine='CYCLES';scene.cycles.samples=32;camera=scene.camera
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v7.blend'))
if '--no-render' not in sys.argv:
 for suffix,location,target,scale in [('jacket',(.55,-2.8,1.50),(0,-.025,1.35),.82),('back',(-.9,2.8,1.55),(0,0,1.30),.90)]:
  camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(ROOT/f'docs/art-direction/rook-prototype-v7-{suffix}.png');bpy.ops.render.render(write_still=True)
print('ROOK_V7_SLING_COMPLETE',out)
