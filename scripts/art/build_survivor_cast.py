"""Dressed adult cast, original tailoring over pinned CC0 MakeHuman data.
Run Blender --background --python scripts/art/build_survivor_cast.py -- --hero saint.
No downloaded code or raster manipulation. Texture bytes reuse reviewed originals.
"""
import sys, math, json, hashlib, argparse, struct
from pathlib import Path
import bpy, bmesh
from mathutils.bvhtree import BVHTree
from mathutils import Vector
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).resolve().parent))
import makehuman_rook as mh
P=argparse.ArgumentParser();P.add_argument('--hero',choices=['saint','torque','vesper','all'],default='all');P.add_argument('--no-render',action='store_true');OPT=P.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
SOURCE=ROOT/'assets/source/cast';MORPH=SOURCE/'morphs';SYSTEM=ROOT/'assets/source/rook/system-assets';TEX=ROOT/'assets/source/rook/textures/v3'
IDENTITIES={
'saint':dict(height=1.74,morph='african-female-young',skin=(.17,.075,.037),coat=(.71,.65,.49),scarf=(.045,.047,.037),hair=(.003,.002,.0015)),
'torque':dict(height=1.87,morph='african-male-young',skin=(.26,.12,.065),coat=(.18,.10,.055),scarf=(.075,.067,.045),hair=(.004,.0025,.0018)),
'vesper':dict(height=1.71,morph='asian-female-young',skin=(.77,.55,.39),coat=(.035,.062,.11),scarf=(.29,.025,.035),hair=(.0025,.0018,.0015))}

def build(identity):
 cfg=IDENTITIES[identity];H=cfg['height'];s=H/1.82
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 mh._verify(mh.SOURCE)
 manifest=json.loads((MORPH/'manifest.json').read_text())
 for item in manifest['files']:
  assert hashlib.sha256((MORPH/item['path']).read_bytes()).hexdigest()==item['sha256']
 raw,uvs,faces,groups=mh._obj(mh.SOURCE/mh.BASE)
 mh._target(raw,MORPH/(cfg['morph']+'.target'),1)
 if identity=='torque':mh._target(raw,mh.SOURCE/mh.MUSCLE,.78)
 else:mh._target(raw,MORPH/'universal-female-young-averagemuscle-averageweight.target',1)
 ids={i for f in groups['body'] for i in f['vertices']};floor=min(raw[i].y for i in ids);scale=H/(max(raw[i].y for i in ids)-floor)
 coords=[Vector((p.x*scale,-p.z*scale,(p.y-floor)*scale)) for p in raw]
 spec=json.loads((mh.SOURCE/mh.RIG).read_text());weights=mh._weights(json.loads((mh.SOURCE/mh.WEIGHTS).read_text())['weights'],len(coords),spec['bones']);rig,joints=mh._armature(spec,coords,identity.title()+'_Rig')
 rig['identity']=identity;rig['cast_version']=1
 data=dict(rig=rig,coords=coords,groups=groups,faces=faces,uvs=uvs,weights=weights,joints=joints,source_coords=raw,scale=scale,floor=floor)
 def mat(name,color,rough=.8,metal=0,texture=None):
  m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Specular IOR Level'].default_value=.08 if name.startswith(('Hair /','Facehair /')) else .2
  if texture:
   im=bpy.data.images.load(str(texture),check_existing=True);im.pack();t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
   mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*color,1);m.node_tree.links.new(t.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
  return m
 skin=mat('Skin / '+identity,cfg['skin'],.67,texture=SYSTEM/'skins/young_caucasian_male/young_lightskinned_male_diffuse.png')
 coat=mat('Field jacket / '+identity,cfg['coat'],.9)
 normal=bpy.data.images.load(str(TEX/'rook-wool-normal-v3.png'),check_existing=True);normal.colorspace_settings.name='Non-Color';normal.pack();nt=coat.node_tree.nodes.new('ShaderNodeTexImage');nt.image=normal;nm=coat.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.32;coat.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);coat.node_tree.links.new(nm.outputs[0],coat.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
 pants=mat('Trousers / charcoal',(.12,.14,.15),.9,texture=TEX/'rook-trousers-albedo-v3.png')
 leather=mat('Leather / chestnut',(.35,.20,.11),.61,texture=TEX/'rook-leather-albedo-v3.png')
 scarf=mat('Scarf / '+identity,cfg['scarf'],.95)
 lapel=mat('Cloth / lapels',tuple(c*.72 for c in cfg['coat']),.95)
 metal=mat('Hardware / aged brass',(.35,.23,.11),.4,.75)
 hair=mat('Hair / '+identity,cfg['hair'],.85)
 facehair=mat('Facehair / '+identity,cfg['hair'],.85)
 headwear=mat('Headwear / '+identity,(.065,.002,.004) if identity!='torque' else (.16,.10,.04),.9)
 eye=mat('Eyes / mapped brown',(.60,.55,.50),.5)
 im=bpy.data.images.load(str(SYSTEM/'eyes/materials/brownlight_eye.png'),check_existing=True);im.pack();t=eye.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;p=eye.node_tree.nodes.get('Principled BSDF');mix=eye.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.60,.55,.50,1);eye.node_tree.links.new(t.outputs['Color'],mix.inputs[1]);eye.node_tree.links.new(mix.outputs[0],p.inputs['Base Color']);eye.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha']);eye.surface_render_method='DITHERED'
 seams=mat('Cloth / tailored seams',tuple(min(1,c*1.08+.005) for c in cfg['coat']),.9)
 accent=mat('Accent / emblem',(.065,.002,.004) if identity=='saint' else (.72,.51,.25),.65)
 lens=mat('Headwear / optics',(.17,.20,.18),.26,.7)
 def center(f):return sum((coords[i] for i in f['vertices']),Vector())/len(f['vertices'])
 def bind(obj,m,bone='spine02'):
  if obj.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
  assert bone in rig.data.bones, bone
  if m:obj.data.materials.append(m)
  vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE');mod=obj.modifiers.new('Shared skeleton','ARMATURE');mod.object=rig;obj.parent=rig
  for p in obj.data.polygons:p.use_smooth=True
  return obj
 def orb(name,pos,sc,m,bone='head',segments=20):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=6 if segments<=12 else 10,location=tuple(v*s for v in pos));o=bpy.context.object;o.name=name;o.scale=tuple(v*s for v in sc);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bind(o,m,bone)
 def tube(name,points,r,m,bone='spine02',res=1):
  c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=3;c.bevel_depth=r*s;c.bevel_resolution=res;sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
  for p,v in zip(sp.bezier_points,points):p.co=tuple(k*s for k in v);p.handle_left_type=p.handle_right_type='AUTO'
  o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return bind(o,m,bone)
 def mesh(name,verts,polys,m,bone='spine02'):
  me=bpy.data.meshes.new(name);me.from_pydata([tuple(k*s for k in v) for v in verts],[],polys);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return bind(o,m,bone)
 def panel(name,verts,m,bone='spine02'):
  o=mesh(name,verts,[list(range(len(verts)))],m,bone);so=o.modifiers.new('Sewn thickness','SOLIDIFY');so.thickness=.006*s;be=o.modifiers.new('Turned edge','BEVEL');be.width=.003*s;be.segments=2;return o
 def garment(name,select,m,inflate):
  fs=[f for f in groups['helper-tights'] if select(center(f)/s)]
  o=mh.mesh_from_faces(name,fs,data,offset=inflate*s);o.data.materials.append(m)
  for v in o.data.vertices:
   x,y,z=v.co/s;v.co.y+=s*.0025*math.sin(z*90+abs(x)*30)
  counts={}
  for p in o.data.polygons:
   for a,b in p.edge_keys:
    key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
  boundary={i for pair,n in counts.items() if n==1 for i in pair};neighbors={i:[] for i in boundary}
  for (a,b),n in counts.items():
   if n==1:neighbors[a].append(b);neighbors[b].append(a)
  for repeat in range(3):
   changes={i:(o.data.vertices[i].co+sum((o.data.vertices[j].co for j in neighbors[i]),Vector())/len(neighbors[i]))*.5 for i in boundary if neighbors[i]}
   for i,co in changes.items():o.data.vertices[i].co=co
  if name=='Tailored coat bodice':
   for i in boundary:
    if o.data.vertices[i].co.z<1.1*s and abs(o.data.vertices[i].co.x)<.3*s:o.data.vertices[i].co.z=.99*s
  if name=='Boots':
   for i in boundary:
    if o.data.vertices[i].co.z>.15*s:o.data.vertices[i].co.z=.25*s
  if name=='Tailored coat bodice':
   for v in o.data.vertices:
    x,y,z=v.co/s
    if abs(x)<.19 and 1.05<z<1.46 and y<-.07:v.co.y=min(v.co.y,-.176*s+.022*s*(x/.19)**2)
  o.data.update()
  return o
 # Only exposed skin retained. Arms are clothed; hands retain anatomical fingers.
 visible=[f for f in groups['body'] if (center(f).z>1.49*s or (abs(center(f).x)>.44*s and center(f).z<1.32*s))]
 body=mh.mesh_from_faces('Face neck and articulated hands',visible,data);body.data.materials.append(skin)
 jacket=garment('Tailored coat bodice',lambda p:.98<p.z<1.55 and abs(p.x)<.47,coat,.027)
 garment('Trousers',lambda p:.16<p.z<1.01,pants,.016)
 garment('Boots',lambda p:p.z<.25,leather,.032)
 # Narrow skinned cuffs bridge sleeves to wrists, reducing raw-cut silhouette.
 # Sleeve ends use a smoothed single coat surface; no intersecting cuff overlay.
 eyes=mh.mesh_from_proxy('Eyes', 'eyes/high-poly/high-poly.mhclo',data);eyes.data.materials.append(eye)
 # Source head top and landmarks are morphology-derived; face never borrows male Rook geometry.
 # Fitted scalp cap, only above brow and behind ears.
 scalpfs=[f for f in groups['body'] if center(f).z>1.69*s and (center(f).y>-.07*s or center(f).z>(1.765-.035*abs(center(f).x/s)/.1)*s)]
 scalp=mh.mesh_from_faces('Hair scalp',scalpfs,data,offset=.006*s);scalp.data.materials.append(hair)
 counts={}
 for poly in scalp.data.polygons:
  for a,b in poly.edge_keys:
   key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
 neighbors={}
 for (a,b),count in counts.items():
  if count==1:neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
 for repeat in range(3):
  moved={i:(scalp.data.vertices[i].co+sum((scalp.data.vertices[j].co for j in ids),Vector())/len(ids))*.5 for i,ids in neighbors.items()}
  for i,p in moved.items():scalp.data.vertices[i].co=p
 if identity=='saint':
  for v in scalp.data.vertices:v.co.z=min(v.co.z,1.81*s)
 # Eyebrows follow morph-specific front surface rather than floating bars.
 body.data.calc_loop_triangles();headsurface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[tuple(t.vertices) for t in body.data.loop_triangles],all_triangles=True)
 def headwrap(z,offset=.006):
  points=[]
  for i in range(25):
   a=i/24*math.tau;direction=Vector((math.cos(a),math.sin(a),0));hit,_,_,_=headsurface.ray_cast(direction*(.3*s)+Vector((0,0,z*s)),-direction)
   if hit is None:raise ValueError('Head wrap missed skull')
   points.append(tuple(hit/s+direction*offset))
  return points
 def front(x,z):
  hit,_,_,_=headsurface.ray_cast(Vector((x*s,-1,z*s)),Vector((0,1,0)))
  return (hit.y/s-.003) if hit is not None else -.09
 for sign in [-1,1]:
  brow=tube('Brow',[(sign*x,front(sign*x,z),z) for x,z in [(.024,1.716),(.037,1.719),(.051,1.716),(.064,1.707)]],.0022,facehair,'head')
  for v in brow.data.vertices:
   p=brow.matrix_world@v.co;hit,normal,_,_=headsurface.ray_cast(Vector((p.x,-1,p.z)),Vector((0,1,0)))
   if hit is not None:v.co=brow.matrix_world.inverted()@(hit+normal*.0015*s)
 # Coat shaping, lapels, waist belt and buttons. Construction scaled by identity.
 for sign in [-1,1]:
  panel('Turned lapel',[(sign*.04,-.105,1.535),(sign*.105,-.135,1.505),(sign*.095,-.164,1.445),(sign*.055,-.157,1.47)],lapel,'spine01')
  panel('Pocket welt',[(sign*.055,-.19,1.16),(sign*.15,-.181,1.19),(sign*.15,-.184,1.155),(sign*.055,-.193,1.125)],leather)
 for z in [1.12,1.21,1.30]:orb('Coat button',(.022,-.188,z),(.009,.005,.009),metal,'spine02',12)
 # Sleeves/panels use coat nearest surface skin weights, so arm raises don't detach seams.
 kd=KDTree(len(jacket.data.vertices))
 for v in jacket.data.vertices:kd.insert(v.co,v.index)
 kd.balance()
 def follow_coat(o):
  for vg in list(o.vertex_groups):o.vertex_groups.remove(vg)
  for v in o.data.vertices:
   world=o.matrix_world@v.co;_,idx,_=kd.find(world);source=jacket.data.vertices[idx]
   for g in source.groups:
    name=jacket.vertex_groups[g.group].name;vg=o.vertex_groups.get(name) or o.vertex_groups.new(name=name);vg.add([v.index],g.weight,'REPLACE')
 # Fit lapels and pocket panels to coat support, retaining a shallow raised edge.
 jacket.data.calc_loop_triangles();surface=BVHTree.FromPolygons([v.co for v in jacket.data.vertices],[tuple(t.vertices) for t in jacket.data.loop_triangles],all_triangles=True)
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and (o.name.startswith('Turned lapel') or o.name.startswith('Lapel piping') or o.name.startswith('Pocket welt') or o.name.startswith('Coat button')):
   if o.name.startswith('Turned lapel') or o.name.startswith('Pocket welt'):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=6,use_grid_fill=True);bm.to_mesh(o.data);bm.free()
   for v in o.data.vertices:
    point=o.matrix_world@v.co;hit,normal,index,distance=surface.ray_cast(Vector((point.x,-1,point.z)),Vector((0,1,0)))
    if hit is not None:v.co=o.matrix_world.inverted()@(hit+Vector((0,-.012*s,0)))
   follow_coat(o)
 # Trench and split-coat skirt panels: open centre front/back and a side vent.
 if identity!='torque':
  for side in [-1,1]:
   verts=[];polys=[];rows=10;cols=12
   for row in range(rows+1):
    t=row/rows;z=1.06-(.49 if identity=='saint' else .47)*t
    for col in range(cols+1):
     a=(.16+(math.pi-.32)*col/cols)*side
     direction=Vector((math.sin(a),-math.cos(a),0))
     hit,_,_,_=surface.ray_cast(direction*(.6*s)+Vector((0,0,1.005*s)),-direction)
     if hit is None:raise ValueError('Cannot fit continuous coat waist')
     top=hit/s+direction*.003
     # Match bodice boundary exactly, then flare around the upper thigh envelope.
     flare=math.sin(t*math.pi/2)
     x=top.x*(1-flare)+math.sin(a)*.30*flare
     y=top.y*(1-flare)-math.cos(a)*.27*flare+.003*math.sin(t*19+a*5)*t
     verts.append((x,y,1.005-(.44 if identity=='saint' else .49)*t))
   for row in range(rows):
    for col in range(cols):
     a=row*(cols+1)+col;polys.append((a,a+1,a+cols+2,a+cols+1))
   o=mesh('Split coat skirt',verts,polys,coat,'root');so=o.modifiers.new('Coat hem thickness','SOLIDIFY');so.thickness=.006*s
   # blend hem to same-side upper thigh; waist remains pelvis-supported.
   for v in o.data.vertices:
    t=max(0,min(.55,(.98-v.co.z/s)*1.2));o.vertex_groups['root'].add([v.index],1-t,'REPLACE');vg=o.vertex_groups.get('upperleg01.'+('L' if side>0 else 'R')) or o.vertex_groups.new(name='upperleg01.'+('L' if side>0 else 'R'));vg.add([v.index],t,'REPLACE')
   tube('Coat hem piping',[verts[rows*(cols+1)+j] for j in range(cols+1)],.003,seams,'root')
 # Head and gear identities.
 if identity=='saint':
  beret=orb('Slanted red beret',(-.018,.002,1.810),(.116,.099,.045),headwear);beret.rotation_euler.y=-.18
  orb('Beret insignia',(-.055,-.089,1.82),(.016,.004,.018),headwear,'head')
  # Intertwined paired strands follow a common braid centreline, not wavy hoses.
  for side in [-1,1]:
   for strand in range(3):
    for phase in [0,math.pi]:
     points=[]
     for i in range(33):
      t=i/32;twist=t*math.tau*7+phase
      points.append((side*(.075+.016*strand+.006*math.sin(t*4))+.0038*math.cos(twist),.018+.10*t+.0038*math.sin(twist),1.78-.27*t))
     tube('Intertwined braid',points,.0044,hair,'head')
  sat=orb('Medical satchel',(-.21,-.035,1.03),(.105,.068,.125),leather,'root')
  panel('Satchel flap',[(-.31,-.105,1.13),(-.11,-.105,1.13),(-.12,-.111,1.035),(-.29,-.111,1.035)],coat,'root')
  panel('Medical cross upright',[(-.226,-.117,1.10),(-.204,-.117,1.10),(-.204,-.117,1.04),(-.226,-.117,1.04)],accent,'root')
  panel('Medical cross bar',[(-.245,-.118,1.08),(-.185,-.118,1.08),(-.185,-.118,1.06),(-.245,-.118,1.06)],accent,'root')
 elif identity=='torque':
  # Continuous jaw-following beard shell; keeps lips readable without bead-like locks.
  beardfaces=[f for f in groups['body'] if 1.585*s<center(f).z<1.69*s and center(f).y<-.025*s and abs(center(f).x)<.095*s and not(abs(center(f).x)<.035*s and center(f).z>1.632*s)]
  beard=mh.mesh_from_faces('Beard shell',beardfaces,data,offset=.0025*s);beard.data.materials.append(facehair)
  counts={}
  for poly in beard.data.polygons:
   for a,b in poly.edge_keys:
    key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
  neighbors={}
  for (a,b),count in counts.items():
   if count==1:neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
  for repeat in range(3):
   moved={i:(beard.data.vertices[i].co+sum((beard.data.vertices[j].co for j in ids),Vector())/len(ids))*.5 for i,ids in neighbors.items()}
   for i,p in moved.items():
    hit,normal,_,_=headsurface.find_nearest(p)
    if hit is not None:beard.data.vertices[i].co=hit+normal*.0025*s
  for side in [-1,1]:
   orb('Goggle frame',(side*.045,-.125,1.785),(.043,.017,.035),headwear,'head')
   orb('Goggle glass',(side*.045,-.141,1.785),(.034,.008,.025),lens,'head')
  tube('Goggle bridge',[(-.01,-.125,1.785),(0,-.132,1.791),(.01,-.125,1.785)],.006,headwear,'head')
  tube('Goggle strap',headwrap(1.775),.009,headwear,'head')
  for sign in [-1,1]:
   for j in range(7):orb('Shearling collar',(sign*(.06+j*.016),-.10+j*.012,1.525-j*.007),(.025,.025,.021),scarf,'spine01',12)
   for j in range(3):
    x=sign*(.085+j*.032);tube('Tool shaft',[(x,-.205,1.19),(x,-.212,1.34)],.009,metal);orb('Tool handle',(x,-.21,1.33),(.014,.012,.027),leather,'spine02',12)
  for i in range(28):
   a=i*2.399;rad=.075*math.sqrt(i/28);orb('Textured crop',(math.cos(a)*rad,math.sin(a)*rad,1.79+.023*(1-rad/.1)),(.018,.018,.014),hair,'head',10)
 elif identity=='vesper':
  orb('Topknot',(0,.015,1.835),(.058,.058,.060),hair)
  for i in range(9):
   a=i*math.tau/9;tube('Topknot lock',[(math.cos(a)*.052,.015+math.sin(a)*.05,1.805),(math.cos(a+.7)*.061,.015+math.sin(a+.7)*.059,1.85),(math.cos(a+1.4)*.025,.015+math.sin(a+1.4)*.025,1.887)],.006,hair,'head')
  band=headwrap(1.765,.008)
  tube('Red head band',band,.012,headwear,'head')
  for sign in [-1,1]:
   for i in range(3):tube('Temple lock',[(sign*(.025+i*.014),-.069,1.79),(sign*(.066+i*.009),-.09,1.73),(sign*(.085+i*.006),-.07,1.65-i*.014)],.0045,hair,'head')
  anchor=Vector(band[4]);orb('Headband tied knot',anchor,(.014,.014,.012),headwear,'head',12)
  tube('Headband tail',[anchor,anchor+Vector((.015,.025,-.035)),anchor+Vector((.02,.035,-.13))],.009,headwear,'head')
 # Sewn scarf wrap and a subdivided falling tail with soft fabric folds.
 verts=[];quads=[]
 for row in range(5):
  t=row/4
  for col in range(25):
   a=col/24*math.tau;r=.078+.004*math.sin(t*math.pi)
   verts.append((math.cos(a)*r,math.sin(a)*r-.018,1.53+.065*t+.005*math.sin(a*3+t)))
 for row in range(4):
  for col in range(24):
   i=row*25+col;quads.append((i,i+1,i+26,i+25))
 wrap=mesh('Scarf folded collar',verts,quads,scarf,'neck01');mod=wrap.modifiers.new('Wool thickness','SOLIDIFY');mod.thickness=.006*s
 verts=[];quads=[]
 for row in range(12):
  t=row/11
  for col in range(7):
   u=col/6;verts.append(((u-.5)*(.078-.014*t)+.02*t,-.145-.065*math.sin(t*math.pi*.6)+.004*math.sin(u*math.pi*4),1.55-.29*t+.007*math.sin(u*math.pi)))
 for row in range(11):
  for col in range(6):
   i=row*7+col;quads.append((i,i+1,i+8,i+7))
 tail=mesh('Scarf tailored tail',verts,quads,scarf,'spine01');mod=tail.modifiers.new('Wool thickness','SOLIDIFY');mod.thickness=.006*s
 strap=tube('Shoulder sling',[(.18,-.025,1.49),(.13,-.19,1.38),(0,-.21,1.22),(-.19,-.19,1.01)],.016,leather);follow_coat(strap)
 # Project portable UVs only where original authored UVs are absent.
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  if not o.data.uv_layers:
   uv=o.data.uv_layers.new(name='UVMap')
   for poly in o.data.polygons:
    axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
    for li in poly.loop_indices:
     v=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]*3,v[axes[1]]*3)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):
   if mod.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
 # Batch by material. Retain hair/headwear names and a matching shared-skeleton LOD1.
 batches=[]
 for m in [skin,coat,pants,leather,scarf,metal,hair,facehair,headwear,lens,eye,seams,accent,lapel]:
  obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials) and o.data.materials[0]==m]
  if not obs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name='LOD0 / '+m.name;batches.append(o)
  # Transform joining leaves correct armature weights; normalize names contract.
  o['identity']=identity;o['castLOD']=0
  low=o.copy();low.data=o.data.copy();bpy.context.collection.objects.link(low);low.name='LOD1 / '+m.name;low['castLOD']=1
  bpy.context.view_layer.objects.active=low;dec=low.modifiers.new('Authored distance simplification','DECIMATE');dec.ratio=.43;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name);low.hide_render=True
 # Export both levels, default switching controlled by production adapter.
 out=ROOT/'assets/characters'/(identity+'-v1.glb');bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.scene.objects:
  if o.type in {'MESH','ARMATURE'}:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_yup=True,export_apply=True,export_extras=True,export_image_format='AUTO')
 # Blender exports linked images but not this RGB multiply node; preserve the
 # portable multiplier as a standard glTF baseColorFactor without touching pixels.
 payload=out.read_bytes();size=struct.unpack_from('<I',payload,12)[0];doc=json.loads(payload[20:20+size]);binary=payload[28+size:]
 for material in doc['materials']:
  if 'baseColorTexture' in material.get('pbrMetallicRoughness',{}):material['pbrMetallicRoughness']['baseColorFactor']=list(bpy.data.materials[material['name']].diffuse_color)
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary;out.write_bytes(result)
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.world.color=(.15,.15,.15)
 bpy.ops.mesh.primitive_plane_add(size=200);o=bpy.context.object;o.data.materials.append(mat('Preview / floor',(.035,.04,.045)))
 for pos,energy,size in [((-3,-4,5),650,4),((3,-1,3),400,3),((0,3,4),650,3)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(1.7,-4,2));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,H*.51))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.25;scene.camera=cam;scene.view_settings.view_transform='AgX';scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
 SOURCE.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(identity+'-v1.blend')))
 if not OPT.no_render:
  scene.render.filepath=str(SOURCE/(identity+'-full.png'));bpy.ops.render.render(write_still=True)
  cam.location=(.2,-2.8,H-.1);cam.rotation_euler=(Vector((0,-.02,H-.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.55;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.filepath=str(SOURCE/(identity+'-face.png'));bpy.ops.render.render(write_still=True)
 print('CAST_COMPLETE',identity,str(out),out.stat().st_size)

for name in IDENTITIES if OPT.hero=='all' else [OPT.hero]:build(name)
