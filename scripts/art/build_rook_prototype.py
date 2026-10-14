"""Reproducible, dressed Rook deformation study, not a production character.

Run with Blender --background --python scripts/art/build_rook_prototype.py.
The adjacent importer consumes pinned CC0 graphical data, not MakeHuman code.
Clothing construction and animation below are original project work. Runtime
integration, likeness sculpting and final PBR texture painting remain separate.
"""
import sys
from pathlib import Path
import math
import json
import bpy
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from makehuman_rook import build_base, mesh_from_faces

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
data = build_base()
rig, body = data['rig'], data['body']
rig.name = 'Rook_Deform_Rig'


def material(name, color, roughness=.75, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return mat


skin = material('Skin / warm matte', (.48, .255, .16), .7)
cloth = material('Field jacket / moss canvas', (.038, .055, .025), .88)
pants = material('Trousers / charcoal olive', (.025, .031, .019), .92)
leather = material('Leather / dark chestnut', (.09, .044, .023), .58)
edge = material('Leather / worn edges', (.20, .105, .047), .74)
scarf = material('Scarf / rust wool', (.35, .075, .032), .95)
brass = material('Hardware / aged brass', (.31, .20, .075), .43, .72)
hair = material('Hair / umber', (.036, .018, .009), .85)
sole = material('Boot soles', (.018, .021, .018), .95)
eye_white = material('Eyes / ivory', (.68, .64, .54), .35)
iris = material('Eyes / hazel', (.13, .095, .035), .36)
pupil = material('Eyes / pupil', (.006, .008, .006), .2)


def bind(obj, bone='spine02', mat=None):
    if obj.type == 'CURVE':
        # Conversion applies modifiers to *all* selected objects. Isolate the
        # curve so a previous mesh does not lose its skin modifier accidentally.
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        obj = bpy.context.object
        obj.select_set(False)
    if mat:
        obj.data.materials.append(mat)
    if bone not in rig.data.bones:
        raise ValueError('Unknown attachment bone: ' + bone)
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    mod = obj.modifiers.new('Shared deform rig', 'ARMATURE')
    mod.object = rig
    obj.parent = rig
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def orb(name, pos, scale, mat, bone='head'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return bind(obj, bone, mat)


def tube(name, points, radius, mat, bone='spine02'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return bind(obj, bone, mat)


def patch(name, coords, mat, bone='spine02', thickness=.005):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(coords, [], [list(reversed(range(len(coords))))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    mod = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    mod.thickness = thickness
    bevel = obj.modifiers.new('Soft sewn edges', 'BEVEL')
    bevel.width, bevel.segments = .004, 2
    return bind(obj, bone)


def face_center(face):
    return sum((data['coords'][i] for i in face['vertices']), Vector()) / len(face['vertices'])


def garment(name, selector, mat, inflation):
    faces = [f for f in data['groups']['helper-tights'] if selector(face_center(f))]
    obj = mesh_from_faces(name, faces, data, offset=inflation)
    obj.data.materials.append(mat)
    # Low frequency folds follow garment construction, and are actual geometry.
    # Retain shared anatomical skin weights at elbow/hip/knee transitions.
    for v in obj.data.vertices:
        x, y, z = v.co
        if name.startswith('Jacket'):
            fold = .004 * math.sin(z*95 + abs(x)*24) * (.3 + min(1, abs(x)*3))
            v.co.y += fold
        elif name.startswith('Trousers'):
            knee = math.exp(-((z-.52)/.09)**2)
            v.co.y += .006 * math.sin(z*110+abs(x)*19) * (knee+.2)
    for p in obj.data.polygons:
        p.use_smooth = True
    if name.startswith('Jacket'):
        # Finish the cut loops on consistent planes instead of preserving a
        # stair-step boundary from face-centre selection of the source helper.
        counts = {}
        for p in obj.data.polygons:
            for a,b in p.edge_keys:
                key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
        boundary={i for pair,count in counts.items() if count==1 for i in pair}
        for i in boundary:
            v=obj.data.vertices[i]
            if v.co.z < 1.0:v.co.z=.91
            elif abs(v.co.x)>.40:v.co.x=math.copysign(.48,v.co.x)
        obj.data.update()
    return obj


# Real anatomical topology, wrapped garments and a common weighted skeleton.
# Helper volume is only a clothing starting point: later production sculpting
# must replace these initial folds and build proper garment UV/PBR assets.
body.data.materials.append(skin)
jacket=garment('Jacket / deforming canvas', lambda p: .89 < p.z < 1.59 and abs(p.x) < .49, cloth, .024)
garment('Trousers / knee folds', lambda p: .17 < p.z < 1.00, pants, .013)
garment('Boots / wrapped leather', lambda p: p.z < .25, leather, .016)

# Brown gloves keep finger topology visible while the cuff covers the seam.
hands = [f for f in data['groups']['body'] if abs(face_center(f).x) > .48 and face_center(f).z < 1.35]
gloves = mesh_from_faces('Gloves / articulated fingers', hands, data, offset=.002)
gloves.data.materials.append(leather)

# Woven scarf wraps around the collar, with overlapping folds and a shaped end.
for ring in range(4):
    points = []
    for i in range(17):
        a = i / 16 * math.tau
        points.append((math.cos(a)*(.079+ring*.003), math.sin(a)*(.079+ring*.002)-.034, 1.55+ring*.012+.008*math.sin(a*3+ring)))
    tube('Scarf / collar fold %d' % ring, points, .015, scarf, 'neck01')
patch('Scarf / hanging end', [(-.045,-.093,1.55),(.035,-.101,1.54),(.059,-.139,1.32),(.013,-.151,1.27),(-.027,-.134,1.31)], scarf, 'spine01', .012)
for x in [-.02, 0, .02]:
    tube('Scarf / vertical seam', [(x,-.108,1.48),(x+.017,-.142,1.37),(x+.020,-.148,1.30)], .0017, scarf, 'spine01')

# Jacket collar, storm placket and shaped pocket flaps.
for sign in [-1, 1]:
    patch('Jacket / collar', [(sign*.065,-.087,1.56),(sign*.125,-.11,1.51),(sign*.10,-.149,1.44),(sign*.028,-.109,1.52)], cloth, 'spine01')
    x = sign*.105
    patch('Jacket / chest pocket', [(x-.046,-.142,1.40),(x+.046,-.142,1.40),(x+.045,-.146,1.31),(x-.045,-.146,1.31)], cloth)
    patch('Jacket / pocket flap', [(x-.049,-.148,1.40),(x+.049,-.148,1.40),(x+.042,-.155,1.368),(x,-.16,1.36),(x-.042,-.155,1.368)], cloth)
    orb('Pocket press stud', (x,-.16,1.374), (.006,.003,.006), brass, 'spine02')
patch('Jacket / button placket', [(-.016,-.147,1.46),(.018,-.147,1.46),(.016,-.139,1.01),(-.016,-.139,1.01)], cloth)
for z in [1.13,1.24,1.35]:
    orb('Jacket / brass button', (0,-.152,z), (.004,.003,.004), brass, 'spine02')

# Diagonal leather harness: flat straps with edge piping, not round ropes.
points = [(-.13,-.105,1.52),(-.09,-.16,1.41),(.005,-.17,1.26),(.11,-.15,1.08)]
patch('Harness / diagonal leather', [(x-.018,y,z) for x,y,z in points] + [(x+.018,y,z) for x,y,z in reversed(points)], leather)
for dx in [-.015,.015]:
    tube('Harness / edge stitch', [(x+dx,y-.004,z) for x,y,z in points], .0012, edge)
for sign in [-1,1]:
    tube('Belt / side', [(0,-.132,.985),(sign*.10,-.117,.985),(sign*.167,0,.985),(sign*.1,.106,.985),(0,.113,.985)], .018, leather, 'spine05')
patch('Belt / buckle', [(-.023,-.155,1.007),(.023,-.155,1.007),(.023,-.155,.973),(-.023,-.155,.973)], brass, 'spine05')

# Soft field-cap shell. It follows the head instead of being a box/helmet.
verts, faces = [], []
for j in range(5):
    t = j/4
    radius = 1 - .72*t*t
    for i in range(32):
        a = i/32*math.tau
        verts.append((math.cos(a)*.092*radius, math.sin(a)*.115*radius-.058, 1.765+t*.075+.005*math.cos(a)))
for j in range(4):
    for i in range(32):
        k = j*32+i; n=j*32+(i+1)%32
        faces.append((k,n,n+32,k+32))
faces.append(tuple(range(128,160)))
mesh=bpy.data.meshes.new('Cap canvas');mesh.from_pydata(verts,[],faces);mesh.update()
cap=bpy.data.objects.new('Rook / olive patrol cap',mesh);bpy.context.collection.objects.link(cap);bind(cap,'head',cloth)
orb('Cap / curved visor', (0,-.169,1.762), (.09,.062,.009), leather)
tube('Cap / stitched band',[(math.cos(i/32*math.tau)*.094,math.sin(i/32*math.tau)*.117-.058,1.765) for i in range(33)],.004,cloth,'head')

# Short swept locks along the cap opening. Facial sculpt/paint remains a TODO.
for sign in [-1,1]:
    for i in range(5):
        x=sign*(.059+i*.005)
        tube('Hair / swept temple',[(x,-.12,1.765),(x+sign*.004,-.135,1.744),(x+sign*.002,-.11,1.718)],.005,hair,'head')

# Surface-fit front garment details against the actual morphed canvas. Source
# body proportions are not interchangeable with the old procedural hero.
bvh=BVHTree.FromPolygons([v.co for v in jacket.data.vertices],[list(p.vertices) for p in jacket.data.polygons])
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or not obj.name.startswith(('Harness /','Jacket / collar','Jacket / chest pocket','Jacket / pocket flap','Jacket / button placket','Scarf / hanging','Scarf / vertical')):continue
    for v in obj.data.vertices:
        point=obj.matrix_world@v.co
        loc,normal,_,_=bvh.ray_cast(Vector((point.x,-1,point.z)),Vector((0,1,0)))
        if loc:
            point.y=loc.y-(.012 if obj.name.startswith('Harness') else .008)
            v.co=obj.matrix_world.inverted()@point
for obj in list(bpy.context.scene.objects):
    if obj.name.startswith(('Pocket press','Jacket / brass')):
        loc,_,_,_=bvh.ray_cast(Vector((obj.location.x,-1,obj.location.z)),Vector((0,1,0)))
        if loc:obj.location.y=loc.y-.018

# Sew garment details to the same local skin influences as the canvas. A single
# chest bone on a pocket over a blended torso produces intersections on breathing.
tree=KDTree(len(jacket.data.vertices))
for v in jacket.data.vertices:tree.insert(v.co,v.index)
tree.balance()
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or obj==jacket or not obj.name.startswith(('Harness /','Jacket /','Pocket press','Scarf / hanging','Scarf / vertical')):continue
    obj.vertex_groups.clear()
    for v in obj.data.vertices:
        point=obj.matrix_world@v.co
        _,nearest,_=tree.find(point)
        for group in jacket.data.vertices[nearest].groups:
            name=jacket.vertex_groups[group.group].name
            vg=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            vg.add([v.index],group.weight,'REPLACE')

# Source eye helper geometry matches the morphed head, unlike guessed spheres.
for side in ['l','r']:
    eye=mesh_from_faces('Eye / '+side,data['groups']['helper-'+side+'-eye'],data,offset=0)
    eye.data.materials.append(eye_white)
    center=sum((v.co for v in eye.data.vertices),Vector())/len(eye.data.vertices)
    front=min(v.co.y for v in eye.data.vertices)
    orb('Iris / '+side,(center.x,front-.001,center.z),(.0045,.0015,.0045),iris,'head')
    orb('Pupil / '+side,(center.x,front-.0022,center.z),(.002,.0008,.002),pupil,'head')

# Animation study: real skin deformation, intentionally not a final locomotion
# library. Arms remain in the reference A-pose for a clean garment stress test.
def animate(name, frames, duration, walking=False):
    rig.animation_data_clear()
    for p in rig.pose.bones:
        p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
    def bend(p,angle):
        axis=p.bone.matrix_local.to_quaternion().inverted()@Vector((1,0,0))
        p.rotation_quaternion=Quaternion(axis,angle)
        p.keyframe_insert('rotation_quaternion',frame=f*duration/frames)
    for f in range(frames+1):
        phase=f/frames*math.tau
        for bone,amount in [('spine01',.009),('neck01',-.006)]:
            p=rig.pose.bones.get(bone)
            if p:
                bend(p,math.sin(phase)*amount)
        if walking:
            for side,sgn in [('L',1),('R',-1)]:
                for prefix,amp in [('upperleg01',.30),('lowerleg01',.22),('upperarm01',-.13)]:
                    p=rig.pose.bones.get(prefix+'.'+side)
                    if p:
                        bend(p,amp*(math.sin(phase)*sgn if prefix!='lowerleg01' else max(0,-math.sin(phase)*sgn)))
    action=rig.animation_data.action
    action.name=name
    action.use_fake_user=True
    return action

idle=animate('Breathing study',24,72)
walk=animate('Deformation walk study',24,30,True)
rig.animation_data.action=idle
bpy.context.scene.frame_set(0)

out=ROOT/'assets/characters';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'ARMATURE','MESH'}:
        obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out/'rook-prototype-v1.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=True)

# Neutral-light offline QA, with exactly the exported model's geometry/materials.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world.color=(.16,.16,.16)
bpy.ops.mesh.primitive_plane_add(size=200)
floor=bpy.context.object;floor.name='Preview floor';floor.data.materials.append(material('Preview / charcoal',(.045,.052,.049),.9))
for pos,energy,size in [((-3,-4,5),550,4),((3,-1,3),350,3),((0,3,4),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,1))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2,-4,2.0))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.96))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.25;scene.camera=camera
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(ROOT/'docs/art-direction/rook-prototype-v1.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v1.blend'))
bpy.ops.render.render(write_still=True)
print('ROOK_PROTOTYPE_COMPLETE',out/'rook-prototype-v1.glb')
