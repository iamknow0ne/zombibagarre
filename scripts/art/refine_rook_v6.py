"""Field-jacket construction study from preserved v5 source; no raster changes.
Uses actual coat triangle projection and barycentric skin transfer for sewn panels.
"""
import bpy,bmesh,math,json,struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v5.blend'))
scene=bpy.context.scene;scene.frame_set(0);rig=next(o for o in scene.objects if o.type=='ARMATURE')
coat=next(o for o in scene.objects if o.type=='MESH' and 'Field jacket' in o.name)
seam=next(o for o in scene.objects if o.type=='MESH' and 'Canvas / seam' in o.name)
cloth_material=coat.data.materials[0];seam_material=seam.data.materials[0]
rig_before={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
def components(obj):
    parents=list(range(len(obj.data.vertices)))
    def find(x):
        while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
        return x
    for edge in obj.data.edges:
        a,b=edge.vertices;parents[find(a)]=find(b)
    groups={}
    for vertex in obj.data.vertices:groups.setdefault(find(vertex.index),[]).append(vertex.index)
    return sorted(groups.values(),key=len,reverse=True)
groups=components(coat);base=set(groups[0]);old_panels=[g for g in groups[1:] if max((coat.matrix_world@coat.data.vertices[i].co).z for i in g)<1.7]
assert len(old_panels)==7,'Unexpected source panel structure'
# A shallow centre-front facing groove gives the overlap a recessed seam.
for i in base:
    v=coat.data.vertices[i];x,y,z=v.co
    if y<-.09 and 1.0<z<1.46 and abs(x)<.035:v.co.y+=.004*(1-abs(x)/.035)
coat.data.update();coat.data.calc_loop_triangles()
positions=[coat.matrix_world@v.co for v in coat.data.vertices]
triangles=[tuple(t.vertices) for t in coat.data.loop_triangles if all(i in base for i in t.vertices)]
surface=BVHTree.FromPolygons(positions,triangles,all_triangles=True)
weights=[{coat.vertex_groups[g.group].name:g.weight for g in v.groups} for v in coat.data.vertices]
provenance=[]
fit_path=ROOT/'assets/source/rook/rook-v6-fitted-weights.json'
fitted={}
if fit_path.exists():
    fitted={(r['material'],tuple(r['p'])):r['weights'] for r in json.loads(fit_path.read_text())['vertices']}
bone_names={name.replace('.','').replace(':','').replace('/',''):name for name in rig.data.bones.keys()}
def surface_record(point,offset=0,tag='panel',ray=False):
    if ray:hit,normal,index,_=surface.ray_cast(Vector((point.x,-1,point.z)),Vector((0,1,0)))
    else:hit,normal,index,_=surface.find_nearest(point)
    if hit is None:raise ValueError('No coat surface for '+tag)
    ids=triangles[index];a,b,c=[positions[i] for i in ids];v0=b-a;v1=c-a;v2=hit-a
    d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1);den=d00*d11-d01*d01
    wb=(d11*d20-d01*d21)/den;wc=(d00*d21-d01*d20)/den;bary=[1-wb-wc,wb,wc]
    combined={}
    for vertex,w in zip(ids,bary):
        for name,value in weights[vertex].items():combined[name]=combined.get(name,0)+max(0,w)*value
    combined=sorted(combined.items(),key=lambda item:-item[1])[:4];total=sum(w for _,w in combined)
    return {'p':hit+normal*offset,'n':normal,'weights':{name:w/total for name,w in combined},'triangle':[positions[i].copy() for i in ids],'bary':bary,'tag':tag}
def front(x,z,offset,tag):return surface_record(Vector((x,-1,z)),offset,tag,True)
def yup(p):return [round(p.x,7),round(p.z,7),round(-p.y,7)]
def mesh_object(name,records,faces,material):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([r['p'] for r in records],[],faces);mesh.update()
    if material==cloth_material:
        # Shell winding must be outward in the GLB, even when Blender's
        # double-sided preview hides an inverted outer surface.
        bm=bmesh.new();bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        if 'sleeve cuff' in name:
            bm.verts.index_update()
            for face in bm.faces:
                normal=sum((records[v.index]['n'] for v in face.verts),Vector())
                if face.normal.dot(normal)<0:face.normal_flip()
        bm.to_mesh(mesh);bm.free();mesh.update()
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.parent=rig;obj.data.materials.append(material)
    uv=mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        polygon.use_smooth=True
        for loop in polygon.loop_indices:
            p=records[mesh.loops[loop].vertex_index]['p'];uv.data[loop].uv=(p.x*7.4925,p.z*7.4925)
    for index,record in enumerate(records):
        optimized=fitted.get((material.name,tuple(yup(record['p']))))
        if optimized:record['weights']={bone_names[name]:value for name,value in optimized.items()}
        for bone,value in record['weights'].items():
            vg=obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone);vg.add([index],value,'REPLACE')
        provenance.append({'part':name,'material':material.name,'p':yup(record['p']),'triangle':[yup(p) for p in record['triangle']],'bary':record['bary']})
    mod=obj.modifiers.new('Shared deform rig','ARMATURE');mod.object=rig
    return obj
panel_objects=[];seam_records=[];seam_faces=[]
def stitch(path):
    start=len(seam_records)
    for i,record in enumerate(path):
        tangent=(path[min(i+1,len(path)-1)]['p']-path[max(0,i-1)]['p']).normalized();normal=record['n'];side=tangent.cross(normal).normalized()
        for j in range(4):
            angle=j*math.tau/4;r=dict(record);r['p']=record['p']+normal*.0007+(normal*math.cos(angle)+side*math.sin(angle))*.00045;seam_records.append(r)
        if i:
            for j in range(4):seam_faces.append((start+(i-1)*4+j,start+(i-1)*4+(j+1)%4,start+i*4+(j+1)%4,start+i*4+j))
def grid(name,cols,rows,sample,thickness=.0015,sewn=True):
    records=[sample(i/cols,j/rows) for j in range(rows+1) for i in range(cols+1)];faces=[]
    for j in range(rows):
        for i in range(cols):a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
    boundary=list(range(cols+1))+[j*(cols+1)+cols for j in range(1,rows+1)]+[rows*(cols+1)+i for i in range(cols-1,-1,-1)]+[j*(cols+1) for j in range(rows-1,0,-1)]
    # Real cloth shell perimeter. A second surface avoids paper-thin flaps.
    n=len(records)
    for r in list(records):back=dict(r);back['p']=r['p']-r['n']*thickness;records.append(back)
    faces += [tuple(i+n for i in reversed(face)) for face in list(faces)]
    for i,a in enumerate(boundary):b=boundary[(i+1)%len(boundary)];faces.append((a,b,b+n,a+n))
    if sewn:stitch([records[i] for i in boundary+[boundary[0]]])
    panel_objects.append(mesh_object(name,records,faces,cloth_material));return records

for sign,label in [(-1,'right'),(1,'left')]:
    center=sign*.105
    def pocket(u,v):
        x=center+(u-.5)*.108;z=1.405-v*.132
        bulge=(math.sin(math.pi*u)*math.sin(math.pi*v))**.8
        return front(x,z,.0025+.009*bulge,'pocket '+label)
    grid('Rook v6 / '+label+' pocket body',8,10,pocket,.002)
    def flap(u,v):
        x=center+(u-.5)*.116;z=1.412-v*(.054+.008*(1-abs(2*u-1)))
        return front(x,z,.004+.015*math.sin(v*math.pi*.70),'flap '+label)
    grid('Rook v6 / '+label+' pocket flap',8,5,flap,.002)
    def collar(u,v):
        inner=Vector((.041,1.557)).lerp(Vector((.028,1.500)),v);outer=Vector((.130,1.512)).lerp(Vector((.105,1.435)),v);xz=inner.lerp(outer,u)
        return front(sign*xz.x,xz.y,.003+.016*math.sin(math.pi*u)*(.7+.3*math.sin(math.pi*v)),'collar '+label)
    grid('Rook v6 / '+label+' rolled collar',8,7,collar,.002)
def placket(u,v):return front(-.012+.034*u,1.46-v*.48,.003+.003*math.sin(math.pi*u),'centre overlap')
grid('Rook v6 / centre overlap',3,24,placket,.0018)

# Sleeve cuffs follow the source's actual cut-loop topology. No guessed wrist
# rings: each endpoint has the same location and surrounding coat influences.
edge_count={}
for tri in triangles:
    for i in range(3):edge=tuple(sorted((tri[i],tri[(i+1)%3])));edge_count[edge]=edge_count.get(edge,0)+1
edges=[edge for edge,count in edge_count.items() if count==1 and all(abs(positions[i].x)>.42 for i in edge)]
adj={}
for a,b in edges:adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
seen=set()
for first in adj:
    if first in seen:continue
    loop=[];current=first;previous=None
    while current not in seen:
        seen.add(current);loop.append(current);choices=[n for n in adj[current] if n!=previous];previous,current=current,choices[0]
    if len(loop)<6:continue
    center=sum((positions[i] for i in loop),Vector())/len(loop);sign=1 if center.x>0 else -1;direction=(Vector((sign*.37,-.02,1.258))-center).normalized();records=[]
    for row in range(3):
        for i in loop:records.append(surface_record(positions[i]+direction*(row*.010),.002+(.002 if row==1 else 0),'sleeve cuff'))
    count=len(loop);faces=[]
    for row in range(2):
        for i in range(count):a=row*count+i;b=row*count+(i+1)%count;faces.append((a,b,b+count,a+count))
    stitch(records[:count]+[records[0]]);stitch(records[-count:]+[records[-count]])
    panel_objects.append(mesh_object('Rook v6 / sleeve cuff '+str(sign),records,faces,cloth_material))

# Remove superseded flat panels and over-tessellated seam tubes, then join new
# cloth back into the same batch. Cap/base and their weight arrays are retained.
bm=bmesh.new();bm.from_mesh(coat.data);bm.verts.ensure_lookup_table();remove={i for group in old_panels for i in group};bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(coat.data);bm.free()
bpy.data.objects.remove(seam,do_unlink=True)
new_seam=mesh_object('Rook v6 / Canvas / seam thread',seam_records,seam_faces,seam_material)
bpy.ops.object.select_all(action='DESELECT');coat.select_set(True)
for obj in panel_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=coat;bpy.ops.object.join()

# Seat existing pocket studs and centre buttons on the reconstructed surfaces.
brass=next(o for o in scene.objects if o.type=='MESH' and 'Hardware / aged' in o.name)
for group in components(brass):
    center=sum((brass.matrix_world@brass.data.vertices[i].co for i in group),Vector())/len(group)
    if abs(abs(center.x)-.105)<.012 and 1.35<center.z<1.4:
        target=front(center.x,center.z,.021,'stud').get('p');delta=target-center
    elif abs(center.x)<.015 and 1.10<center.z<1.36:
        target=front(center.x,center.z,.009,'button').get('p');delta=target-center
    else:continue
    for i in group:brass.data.vertices[i].co+=delta
brass.data.update()
for obj in scene.objects:
    if obj.name.startswith('Rook v5'):obj.name=obj.name.replace('Rook v5','Rook v6',1)
assert rig_before=={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
out=ROOT/'assets/characters/rook-prototype-v6.glb'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='ARMATURE' or obj.type=='MESH' and obj.name!='Preview floor':obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=True,export_image_format='AUTO')
# Retain the exact v5 portable material factors (Blender drops MixRGB factors).
source=(ROOT/'assets/characters/rook-prototype-v5.glb').read_bytes();source_json=json.loads(source[20:20+struct.unpack_from('<I',source,12)[0]]);factors={m['name']:m.get('pbrMetallicRoughness',{}).get('baseColorFactor') for m in source_json['materials']}
raw=out.read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length]);tail=raw[20+length:]
for m in gltf['materials']:
    if factors.get(m['name']):m['pbrMetallicRoughness']['baseColorFactor']=factors[m['name']]
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);out.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
(ROOT/'assets/source/rook/rook-v6-surface-bindings.json').write_text(json.dumps({'scope':'New garment vertices and their base-coat triangle provenance; model-space Y-up metres.','vertices':provenance},separators=(',',':')))
scene.render.engine='CYCLES';scene.cycles.samples=32;camera=scene.camera;camera.location=(2,-4,2);camera.rotation_euler=(Vector((0,0,.96))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=2.25
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.filepath=str(ROOT/'docs/art-direction/rook-prototype-v6.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v6.blend'));bpy.ops.render.render(write_still=True)
camera.location=(.55,-2.8,1.50);camera.rotation_euler=(Vector((0,-.025,1.35))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=.82
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(ROOT/'docs/art-direction/rook-prototype-v6-jacket.png');bpy.ops.render.render(write_still=True)
print('ROOK_V6_GARMENT_COMPLETE',out)
