"""Original, bounded MakeHuman data importer for the dressed Rook art build.

Asset provenance: makehumancommunity/makehuman, revision
 a8bc2d54ff0ac92e78ff71431b1023eda42bf482. The pinned base OBJ and targets
 explicitly identify their September 2020 CC0 release; the rig and weight
 JSON also declare CC0. See assets/source/rook/makehuman/manifest.json,
 LICENSE.ASSETS.md and each source header for attribution and exact hashes.
This module parses those data files; it does not copy MakeHuman program code.

Run inside Blender 5.1 Python. build_base() returns an anatomical adult male
working mesh with a real deform skeleton, not a finished/publishable character.
The caller must dress it before rendering or exporting. This module performs no
rendering, saving or exporting and makes no network requests.

Coordinates are full source-indexed, morphed Blender Vectors: MakeHuman Y-up
 decimetres -> Blender Z-up metres (x, -z, y), then one uniform stature adjustment
 and a feet-to-zero translation. OBJ UV coordinates and group membership survive.
"""
from pathlib import Path
import hashlib
import json
import math

import bpy
from mathutils import Vector

REVISION = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
SOURCE = Path(__file__).resolve().parents[2] / 'assets/source/rook/makehuman'
BASE = 'makehuman/data/3dobjs/base.obj'
RIG = 'makehuman/data/rigs/default.mhskel'
WEIGHTS = 'makehuman/data/rigs/default_weights.mhw'
MALE = 'makehuman/data/targets/macrodetails/caucasian-male-young.target'
MUSCLE = 'makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target'


def _verify(source):
    manifest = json.loads((source / 'manifest.json').read_text())
    if manifest.get('revision') != REVISION:
        raise ValueError('Rook source revision differs from the reviewed asset pin')
    hashes = {entry['path']: entry['sha256'] for entry in manifest['files']}
    for name in [BASE, RIG, WEIGHTS, MALE, MUSCLE]:
        if hashlib.sha256((source / name).read_bytes()).hexdigest() != hashes.get(name):
            raise ValueError('Pinned source checksum mismatch: ' + name)
    return manifest


def _obj(path):
    coords, uvs, faces, groups = [], [], [], {}
    active = ['default']
    for line in path.read_text().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        if fields[0] == 'v':
            coords.append(Vector(tuple(map(float, fields[1:4]))))
        elif fields[0] == 'vt':
            uvs.append(tuple(map(float, fields[1:3])))
        elif fields[0] == 'g':
            active = fields[1:] or ['default']
        elif fields[0] == 'f':
            vertices, loops = [], []
            for token in fields[1:]:
                parts = token.split('/')
                vi = int(parts[0])
                ui = int(parts[1]) if len(parts) > 1 and parts[1] else None
                vi = vi - 1 if vi > 0 else len(coords) + vi
                ui = ui - 1 if ui is not None and ui > 0 else len(uvs) + ui if ui is not None else None
                if not 0 <= vi < len(coords) or ui is not None and not 0 <= ui < len(uvs):
                    raise ValueError('Invalid OBJ face index')
                vertices.append(vi)
                loops.append(ui)
            face = {'vertices': vertices, 'uvs': loops, 'groups': active.copy(), 'index': len(faces)}
            faces.append(face)
            for name in active:
                groups.setdefault(name, []).append(face)
    return coords, uvs, faces, groups


def _target(coords, path, amount):
    for line in path.read_text().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        index = int(fields[0])
        if not 0 <= index < len(coords):
            raise ValueError('Morph target vertex outside base topology')
        coords[index] += Vector(tuple(map(float, fields[1:4]))) * amount


def _weights(raw, count, bones):
    result = [[] for _ in range(count)]
    for name, values in raw.items():
        if name not in bones:
            raise ValueError('Weight references absent bone: ' + name)
        for index, weight in values:
            if not 0 <= index < count or not math.isfinite(weight) or weight < 0:
                raise ValueError('Invalid skin weight')
            if weight:
                result[index].append((name, weight))
    for index, values in enumerate(result):
        values = sorted(values, key=lambda v: (-v[1], v[0]))[:4]
        total = sum(v[1] for v in values)
        result[index] = [(name, weight / total) for name, weight in values] if total else []
    return result


def _armature(spec, coords, name):
    joints = {key: sum((coords[i] for i in indices), Vector()) / len(indices)
              for key, indices in spec['joints'].items()}
    arm = bpy.data.armatures.new(name + '_Skeleton')
    rig = bpy.data.objects.new(name, arm)
    bpy.context.collection.objects.link(rig)
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    degenerate_planes = []
    try:
        for key, definition in spec['bones'].items():
            bone = arm.edit_bones.new(key)
            bone.head = joints[definition['head']]
            bone.tail = joints[definition['tail']]
            if (bone.tail - bone.head).length < 1e-6:
                raise ValueError('Degenerate source bone: ' + key)
            plane = spec['planes'].get(definition.get('rotation_plane'))
            if plane and len(plane) == 3:
                a, b, c = (joints[p] for p in plane)
                normal = (b - a).cross(c - a)
                direction = (bone.tail - bone.head).normalized()
                normal -= direction * normal.dot(direction)
                if normal.length > 1e-8:
                    # Explicit convention: local +Y follows head->tail, local +Z
                    # aligns with the source plane normal after projection.
                    bone.align_roll(normal.normalized())
                else:
                    degenerate_planes.append(key)
            bone.use_deform = True
        for key, definition in spec['bones'].items():
            if definition.get('parent'):
                bone = arm.edit_bones[key]
                bone.parent = arm.edit_bones[definition['parent']]
                bone.use_connect = (bone.head - bone.parent.tail).length < 1e-6
    finally:
        bpy.ops.object.mode_set(mode='OBJECT')
    rig['source_revision'] = REVISION
    rig['source_license'] = 'CC0-1.0'
    rig['roll_convention'] = 'Local Y head-to-tail; local Z projected source-plane normal'
    rig['degenerate_roll_planes'] = ','.join(degenerate_planes)
    arm.display_type = 'STICK'
    return rig, joints


def mesh_from_faces(name, faceSubset, data, offset=0):
    """Create a compact UV-preserving mesh weighted to data['rig'].

    faceSubset contains source face records, e.g. data['groups']['helper-tights'].
    A normal offset inflates the newly-created mesh in metres, without changing
    data['coords']. Vertex group influences are normalized and capped at four.
    Each mesh gets integer source_vertex and source_face attributes for tooling.
    Caller owns materials, dressing, export visibility and eventual disposal.
    """
    faces = list(faceSubset)
    if not faces:
        raise ValueError('Cannot build an empty source-face subset: ' + name)
    source_ids = sorted({i for face in faces for i in face['vertices']})
    lookup = {old: new for new, old in enumerate(source_ids)}
    if any(not data['weights'][i] for i in source_ids):
        raise ValueError('Requested subset contains unweighted helper/joint vertices')
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata([tuple(data['coords'][i]) for i in source_ids], [],
                     [[lookup[i] for i in face['vertices']] for face in faces])
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon, face in zip(mesh.polygons, faces):
        polygon.use_smooth = True
        for loop, uv_index in zip(polygon.loop_indices, face['uvs']):
            if uv_index is not None:
                uv.data[loop].uv = data['uvs'][uv_index]
    if offset:
        normals = [v.normal.copy() for v in mesh.vertices]
        for vertex, normal in zip(mesh.vertices, normals):
            vertex.co += normal * offset
        mesh.update()
    source_vertex = mesh.attributes.new('source_vertex', 'INT', 'POINT')
    source_vertex.data.foreach_set('value', source_ids)
    source_face = mesh.attributes.new('source_face', 'INT', 'FACE')
    source_face.data.foreach_set('value', [face['index'] for face in faces])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = data['rig']
    needed = sorted({bone for i in source_ids for bone, weight in data['weights'][i]})
    groups = {bone: obj.vertex_groups.new(name=bone) for bone in needed}
    for local, source_id in enumerate(source_ids):
        for bone, weight in data['weights'][source_id]:
            groups[bone].add([local], weight, 'REPLACE')
    modifier = obj.modifiers.new('Rook deform skeleton', 'ARMATURE')
    modifier.object = data['rig']
    modifier.use_deform_preserve_volume = False  # glTF-compatible linear skinning
    obj['source_revision'] = REVISION
    obj['source_license'] = 'CC0-1.0'
    obj['source_groups'] = ','.join(sorted({g for face in faces for g in face['groups']}))
    return obj


def build_base(source_dir=None, height=1.82, muscle=.30):
    """Build adult male working body/rig and return reusable source metadata.

    Return keys: body, rig, coords (full morphed Blender vectors), groups, faces,
    uvs, weights (source vertex -> up to four normalized influences), joints,
    source_coords (morphed MakeHuman vectors), scale, floor, manifest.
    Body includes only OBJ group 'body'; rig/helper faces never enter that mesh.
    No materials, cameras, clothing, render, export or external code are added.
    """
    if not 1.3 <= height <= 2.3 or not 0 <= muscle <= 1:
        raise ValueError('Invalid adult stature or muscle amount')
    source = Path(source_dir) if source_dir else SOURCE
    manifest = _verify(source)
    raw, uvs, faces, groups = _obj(source / BASE)
    _target(raw, source / MALE, 1.0)
    _target(raw, source / MUSCLE, muscle)
    body_ids = {i for face in groups['body'] for i in face['vertices']}
    floor = min(raw[i].y for i in body_ids)
    top = max(raw[i].y for i in body_ids)
    metres = .1
    stature = height / ((top - floor) * metres)
    scale = metres * stature
    coords = [Vector((v.x * scale, -v.z * scale, (v.y - floor) * scale)) for v in raw]
    spec = json.loads((source / RIG).read_text())
    weights = _weights(json.loads((source / WEIGHTS).read_text())['weights'], len(coords), spec['bones'])
    rig, joints = _armature(spec, coords, 'Rook_Rig')
    data = dict(rig=rig, coords=coords, groups=groups, faces=faces, uvs=uvs,
                weights=weights, joints=joints, source_coords=raw, scale=scale,
                floor=floor, manifest=manifest)
    data['body'] = mesh_from_faces('Rook_WorkingBody', groups['body'], data)
    data['body']['working_asset_notice'] = 'Dress before rendering/exporting; source anatomical base only'
    return data


def mesh_from_proxy(name, relative_path, data, source_dir=None, bone='head'):
    """Read a pinned hm08 data attachment, preserving its authored UV topology.

    Implements only the documented 3-axis scale/barycentric offset format used
    by our reviewed eye/hair sources. Unsupported transforms fail explicitly.
    https://static.makehumancommunity.org/oldsite/documentation/file_formats_and_extensions.html
    These head accessories are rigidly weighted to the shared head bone; this
    is not a general clothes retargeter or an implementation of MakeHuman code.
    """
    source = Path(source_dir) if source_dir else SOURCE.parent / 'system-assets'
    manifest = json.loads((source / 'manifest.json').read_text())
    hashes = {entry['path']: entry['sha256'] for entry in manifest['files']}
    def pinned(path):
        relative = path.relative_to(source).as_posix()
        if hashlib.sha256(path.read_bytes()).hexdigest() != hashes.get(relative):
            raise ValueError('Pinned attachment checksum mismatch: ' + relative)
        return path
    path = pinned(source / relative_path)
    raw, scales, rows, obj_file, active = data['source_coords'], [1., 1., 1.], [], None, False
    for line in path.read_text().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        key = fields[0]
        if key == 'obj_file':
            obj_file = fields[1]
        elif key == 'basemesh' and fields[1] != 'hm08':
            raise ValueError('Attachment has an incompatible base mesh')
        elif key in ['x_scale', 'y_scale', 'z_scale']:
            axis = ['x_scale', 'y_scale', 'z_scale'].index(key)
            a, b, denominator = int(fields[1]), int(fields[2]), float(fields[3])
            if not 0 <= a < len(raw) or not 0 <= b < len(raw) or denominator <= 0:
                raise ValueError('Invalid attachment scale landmarks')
            scales[axis] = abs(raw[a][axis] - raw[b][axis]) / denominator
        elif 'shear' in key or key == 'vertexboneweights_file':
            raise ValueError('Unsupported attachment transform or weights: ' + key)
        elif key == 'verts':
            if fields[1] != '0':
                raise ValueError('Only zero-based attachments are supported')
            active = True
        elif active and key.lstrip('-').isdigit():
            if len(fields) == 1:
                indices, weights, offset = [int(key)], [1.], Vector()
            elif len(fields) in [6, 9]:
                indices = list(map(int, fields[:3]))
                weights = list(map(float, fields[3:6]))
                offset = Vector(tuple(map(float, fields[6:9]))) if len(fields) == 9 else Vector()
            else:
                raise ValueError('Unsupported attachment row')
            if any(not 0 <= i < len(raw) for i in indices) or not all(math.isfinite(v) for v in weights + list(offset)):
                raise ValueError('Invalid attachment position mapping')
            if abs(sum(weights) - 1) > .001:
                raise ValueError('Attachment barycentric weights do not sum to one')
            rows.append((indices, weights, offset))
    if not obj_file or Path(obj_file).name != obj_file or bone not in data['rig'].data.bones:
        raise ValueError('Invalid attachment mesh or destination bone')
    original, uvs, faces, _ = _obj(pinned(path.parent / obj_file))
    if len(original) != len(rows):
        raise ValueError('Attachment mappings do not match mesh vertex count')
    coords = []
    for indices, weights, offset in rows:
        point = sum((raw[i] * w for i, w in zip(indices, weights)), Vector())
        point += Vector(tuple(offset[i] * scales[i] for i in range(3)))
        coords.append(Vector((point.x * data['scale'], -point.z * data['scale'], (point.y - data['floor']) * data['scale'])))
    proxy = dict(data, coords=coords, uvs=uvs, weights=[[(bone, 1.)] for _ in coords])
    result = mesh_from_faces(name, faces, proxy)
    result['source_asset'] = relative_path
    result['source_revision'] = manifest['archiveSha256']
    return result
