"""Bounded portrait/material refinement from preserved v4 Blender source.
No new raster textures or external assets. Retains the existing skeleton/weights.
Run: Blender --background --python scripts/art/refine_rook_v5.py
"""
import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/source/rook/rook-prototype-v4.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene;scene.frame_set(0)
rig=next(o for o in scene.objects if o.type=='ARMATURE')
body=bpy.data.objects['Rook_WorkingBody']
rest_bones={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}

def gauss(v,c,width):return math.exp(-((v-c)/width)**2)
def clamp(x):return max(0,min(1,x))
def world_vertices(obj):
    inverse=obj.matrix_world.inverted()
    for vertex in obj.data.vertices:yield vertex,obj.matrix_world@vertex.co,inverse

# Shape the recognizable facial planes rather than adding pores or random scars.
# Keep eye sockets and UV correspondence; the facial rig remains the same.
for vertex,p,inv in world_vertices(body):
    x,y,z=p;front=clamp((-y-.015)/.075)
    if z<1.58:continue
    jaw=gauss(z,1.622,.025)*front
    cheek=gauss(abs(x),.047,.022)*gauss(z,1.672,.025)*front
    nose=gauss(x,0,.014)*gauss(z,1.693,.035)*front
    brow=gauss(abs(x),.027,.022)*gauss(z,1.725,.010)*front
    chin=gauss(x,0,.027)*gauss(z,1.605,.018)*front
    p.x-=math.copysign(.0045*jaw+.0015*cheek,x)
    p.y+=.0040*cheek-.005*nose-.003*brow-.002*chin
    p.z-=.003*brow+.004*chin
    vertex.co=inv@p
body.data.update()

# Material-only colour adjustment: reuse the packed original maps. These
# multiply nodes export as glTF baseColorFactor; no image pixels are rewritten.
factors={'Skin / warm matte':(.83,.72,.62),'Field jacket / moss canvas':(.40,.37,.27),'Hair / umber':(.35,.23,.14)}
flat_colors={'Scarf / rust wool':(.15,.035,.018),'Leather / dark chestnut':(.075,.034,.015),'Trousers / charcoal olive':(.045,.055,.035),'Hair / sculpted chestnut locks':(.025,.012,.006)}
for name,color in flat_colors.items():
    mat=bpy.data.materials.get(name);shader=mat.node_tree.nodes.get('Principled BSDF');socket=shader.inputs['Base Color']
    for link in list(socket.links):mat.node_tree.links.remove(link)
    socket.default_value=(*color,1)
for name,factor in factors.items():
    mat=bpy.data.materials.get(name)
    if not mat:continue
    shader=mat.node_tree.nodes.get('Principled BSDF');socket=shader.inputs['Base Color']
    if socket.is_linked:
        source=socket.links[0].from_socket
        multiply=mat.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(*factor,1)
        mat.node_tree.links.new(source,multiply.inputs[1]);mat.node_tree.links.new(multiply.outputs[0],socket)
    else:socket.default_value=(*factor,1)
    if name.startswith('Skin'):shader.inputs['Roughness'].default_value=.73
    for node in mat.node_tree.nodes:
        if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.16

# Existing fabric UVs are metric projected. Reduce the visible weave to a
# believable cloth scale; keep the face/hair/eye UV registration untouched.
for obj in scene.objects:
    if obj.type!='MESH' or obj.name=='Preview floor':continue
    mat=obj.data.materials[0] if obj.data.materials else None
    if mat and mat.name in {'Field jacket / moss canvas','Scarf / rust wool','Trousers / charcoal olive'}:
        for loop in obj.data.uv_layers.active.data:loop.uv*=2.25

cloth=next(o for o in scene.objects if o.type=='MESH' and 'Field jacket' in o.name)
for vertex,p,inv in world_vertices(cloth):
    if p.z>1.758:
        # Taper and tilt the crown, leaving the hair opening/band intact.
        t=clamp((p.z-1.763)/.054);angle=math.atan2(p.y+.058,p.x)
        p.x*=1-.10*t;p.y=-.058+(p.y+.058)*(1-.08*t)
        p.z-=.010*t+.005*t*math.cos(angle-.5)
        p.z+=.0024*math.sin(angle*3+.6)*math.sin(math.pi*t)
        vertex.co=inv@p
cloth.data.update()

# The brim is part of the leather batch. Give it a curved, tipped front edge.
leather=next(o for o in scene.objects if o.type=='MESH' and 'Leather / dark' in o.name)
for vertex,p,inv in world_vertices(leather):
    if p.z>1.73:
        front=clamp((-p.y-.14)/.09);p.z-=.011*front+.003*(p.x/.09)**2;p.y-=.006*front
        vertex.co=inv@p
leather.data.update()

# Existing swept locks gain a visible asymmetric fall under the cap. Retain
# their head weights, index topology and material batch.
locks=next(o for o in scene.objects if o.type=='MESH' and 'sculpted chestnut' in o.name)
for vertex,p,inv in world_vertices(locks):
    fall=clamp((1.775-p.z)/.055);p.x-=.008*fall;p.z-=.011*fall;p.y-=.004*math.sin(math.pi*fall)
    vertex.co=inv@p
locks.data.update()

for obj in scene.objects:
    if obj.name.startswith('Rook v4'):obj.name=obj.name.replace('Rook v4','Rook v5',1)

assert rest_bones=={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones},'Skeleton changed unexpectedly'
selected=[o for o in scene.objects if o.type=='ARMATURE' or o.type=='MESH' and o.name!='Preview floor']
bpy.ops.object.select_all(action='DESELECT')
for obj in selected:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
out=ROOT/'assets/characters/rook-prototype-v5.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=True,export_image_format='AUTO')
# Blender 5.1 exports the image link but drops these MixRGB tint factors. Preserve
# their exact multiplicative PBR equivalent explicitly; binary mesh/images stay intact.
raw=out.read_bytes();json_length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+json_length]);tail=raw[20+json_length:]
for material in gltf['materials']:
    if material['name'] in factors:material['pbrMetallicRoughness']['baseColorFactor']=[*factors[material['name']],1]
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
out.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.filepath=str(ROOT/'docs/art-direction/rook-prototype-v5.png')
scene.render.resolution_x=900;scene.render.resolution_y=1100
camera=scene.camera;camera.location=(2,-4,2);camera.rotation_euler=(Vector((0,0,.96))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=2.25
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/rook/rook-prototype-v5.blend'))
bpy.ops.render.render(write_still=True)
camera.location=(.55,-2.8,1.76);camera.rotation_euler=(Vector((0,-.025,1.66))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=.53
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(ROOT/'docs/art-direction/rook-prototype-v5-face.png');bpy.ops.render.render(write_still=True)
print('ROOK_V5_REFINEMENT_COMPLETE',out)
