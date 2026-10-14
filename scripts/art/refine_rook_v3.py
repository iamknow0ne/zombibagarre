"""Original v3 art pass. No new downloaded assets; deterministic generated maps.
Run through build_rook_prototype.py --study v3, retaining v1/v2 outputs.
"""
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector


def refine(ctx):
    root, body, rig = ctx['ROOT'], ctx['body'], ctx['rig']
    out = root / 'assets/source/rook/textures/v3'
    out.mkdir(parents=True, exist_ok=True)
    def save_image(name, pixels, color=True):
        h,w,_=pixels.shape
        image=bpy.data.images.new(name,width=w,height=h,alpha=True)
        image.colorspace_settings.name='sRGB' if color else 'Non-Color'
        image.pixels.foreach_set(np.asarray(pixels,dtype=np.float32).ravel())
        image.filepath_raw=str(out/(name+'.png'));image.file_format='PNG';image.save();image.pack()
        return image
    def texture(mat,image,socket):
        nodes,links=mat.node_tree.nodes,mat.node_tree.links
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        shader=nodes.get('Principled BSDF')
        if socket=='Normal':
            normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35
            links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
        else:links.new(tex.outputs['Color'],shader.inputs[socket])
    # Localized sculpt deltas preserve eyelid registration and the source UVs.
    for v in body.data.vertices:
        x,y,z=v.co
        if z<1.58:continue
        front=max(0,min(1,(-y-.015)/.06))
        cheek=math.exp(-((abs(x)-.047)/.022)**2-((z-1.676)/.022)**2)*front
        jaw=math.exp(-((z-1.617)/.025)**2)*front
        brow=math.exp(-((abs(x)-.029)/.023)**2-((z-1.724)/.012)**2)*front
        v.co.x += math.copysign(.003*jaw-.0025*cheek,x)
        v.co.y += .0035*cheek-.004*brow
    body.data.update()
    # Rasterize stubble, moustache and brow pigment into the existing skin UVs.
    # No shadow/AO is baked: this is pigment distribution in anatomical space.
    skin=ctx['skin'];source=next(n.image for n in skin.node_tree.nodes if n.type=='TEX_IMAGE')
    w,h=source.size;pixels=np.array(source.pixels[:],dtype=np.float32).reshape(h,w,4)
    pixels[:,:,:3] *= np.array([.91,.85,.79])
    body.data.calc_loop_triangles();uv=body.data.uv_layers.active.data
    rng=np.random.default_rng(3041);grain=rng.random((h,w))
    for tri in body.data.loop_triangles:
        coords=np.array([body.data.vertices[i].co[:] for i in tri.vertices])
        if coords[:,2].max()<1.58:continue
        tex=np.array([uv[i].uv[:] for i in tri.loops])*[w-1,h-1]
        xmin,ymin=np.maximum(0,np.floor(tex.min(axis=0)).astype(int));xmax,ymax=np.minimum([w-1,h-1],np.ceil(tex.max(axis=0)).astype(int))
        if xmax<xmin or ymax<ymin:continue
        xx,yy=np.meshgrid(np.arange(xmin,xmax+1),np.arange(ymin,ymax+1))
        a,b,c=tex;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8:continue
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
        inside=(u>=-.005)&(v>=-.005)&(u+v<=1.005)
        p=u[...,None]*coords[0]+v[...,None]*coords[1]+(1-u-v)[...,None]*coords[2]
        x,y,z=p[...,0],p[...,1],p[...,2]
        facing=np.clip((-y-.018)/.045,0,1)
        beard=np.clip((1.681-z)/.022,0,1)*np.clip((z-1.585)/.025,0,1)
        # Preserve lips and the central upper lip cleft.
        lip=np.exp(-((x/.025)**4)-((z-1.649)/.007)**4)
        moustache=np.exp(-((x/.029)**4)-((z-1.661)/.006)**2)*np.clip((abs(x)-.003)/.006,0,1)
        brow=np.exp(-((abs(x)-.032)/.021)**4-((z-1.730+.025*abs(x))/.003)**2)
        amount=np.clip((beard*(1-lip)*(.17+.32*(grain[ymin:ymax+1,xmin:xmax+1]>.68))+moustache*.45+brow*.63)*facing,0,.64)*inside
        region=pixels[ymin:ymax+1,xmin:xmax+1,:3]
        region[:]=region*(1-amount[...,None])+np.array([.055,.033,.022])*amount[...,None]
    texnode=next(n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE');texnode.image=save_image('rook-skin-stubble-albedo-v3',pixels)
    # Small, repeatable tangent-space maps: woven canvas, wool and leather.
    n=512;yy,xx=np.mgrid[0:n,0:n];u=xx/n;v=yy/n
    grain=rng.random((n,n))
    for name,mat,kind,base in [('canvas',ctx['cloth'],'woven',(.38,.41,.27)),('wool',ctx['scarf'],'woven',(.60,.30,.20)),('leather',ctx['leather'],'leather',(.33,.232,.164)),('trousers',ctx['pants'],'woven',(.21,.24,.18))]:
        height=(np.sin(u*math.tau*96)*np.cos(v*math.tau*96)*.10+(grain-.5)*.06) if kind=='woven' else ((grain-.5)*.09+.015*np.sin(u*math.tau*13+np.sin(v*math.tau*9)))
        dx=np.roll(height,-1,axis=1)-np.roll(height,1,axis=1);dy=np.roll(height,-1,axis=0)-np.roll(height,1,axis=0)
        norm=np.stack((-dx*.8,-dy*.8,np.ones_like(dx)),axis=-1);norm/=np.linalg.norm(norm,axis=-1)[...,None]
        normal=np.concatenate((norm*.5+.5,np.ones((n,n,1))),axis=-1)
        texture(mat,save_image('rook-'+name+'-normal-v3',normal,False),'Normal')
        rough=np.clip((.84 if kind=='woven' else .59)+(grain-.5)*.12,0,1)
        rgba=np.stack((rough,rough,rough,np.ones_like(rough)),axis=-1)
        texture(mat,save_image('rook-'+name+'-roughness-v3',rgba,False),'Roughness')
        # More restrained material variation than the coarse v2 mottling.
        variation=1+.11*np.sin(u*math.tau*4)*np.sin(v*math.tau*3)+(grain-.5)*.14
        col=np.asarray(base)[None,None,:]*variation[...,None]
        if name!='canvas':
            texture(mat,save_image('rook-'+name+'-albedo-v3',np.concatenate((col,np.ones((n,n,1))),axis=-1)),'Base Color')
    ctx['image_material'](ctx['cloth'], root/'assets/source/rook/textures/olive-canvas-albedo-v1.png')
    # All fabric/accessory pieces receive consistent metric UVs, including seams.
    mapped=[ctx[k] for k in ['cloth','pants','leather','scarf']]
    def uv_project(obj):
        uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
        for face in obj.data.polygons:
            dominant=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=dominant]
            for loop in face.loop_indices:
                point=obj.matrix_world@obj.data.vertices[obj.data.loops[loop].vertex_index].co
                uv.data[loop].uv=(point[axes[0]]*3.33,point[axes[1]]*3.33)
    # Lower, softer patrol cap; same band and brim preserve the hair opening.
    cap=bpy.data.objects.get('Rook / olive patrol cap')
    for vertex in cap.data.vertices:
        t=max(0,(vertex.co.z-1.765)/.08);vertex.co.z-=.028*t
        vertex.co.x*=1+.035*t;vertex.co.y+=.008*t
    # Replace the cropped straight forehead edge with tapered swept locks.
    hairmat=ctx['material']('Hair / sculpted chestnut locks',(.042,.020,.009),.76)
    for i in range(12):
        t=i/11;x=.067-t*.068
        points=[Vector(p) for p in [(x,-.136,1.772),(x-.025,-.151,1.759),(x-.050,-.151,1.741),(x-.068,-.136,1.725+.012*t)]]
        verts=[];faces=[]
        for j,point in enumerate(points):
            width=[.006,.005,.0035,.0003][j]
            for k in range(6):
                a=k/6*math.tau
                verts.append(tuple(point+Vector((math.cos(a)*width,math.sin(a)*width*.35,0))))
        for j in range(3):
            for k in range(6):faces.append((j*6+k,j*6+(k+1)%6,(j+1)*6+(k+1)%6,(j+1)*6+k))
        mesh=bpy.data.meshes.new('Swept tapered lock');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Hair / tapered sweep %02d'%i,mesh);bpy.context.collection.objects.link(obj);ctx['bind'](obj,'head',hairmat)
    # Tailored, readable seam lines and pocket welts, fitted to jacket front.
    jacket=ctx['jacket'];bvh=ctx['BVHTree'].FromPolygons([v.co for v in jacket.data.vertices],[list(p.vertices) for p in jacket.data.polygons])
    stitch=ctx['material']('Canvas / seam thread',(.095,.11,.049),.91)
    for sign in [-1,1]:
        for x0,z0,z1 in [(sign*.155,1.06,1.43),(sign*.059,1.32,1.39),(sign*.15,1.32,1.39)]:
            pts=[]
            for j in range(7):
                z=z0+(z1-z0)*j/6;loc,_,_,_=bvh.ray_cast(Vector((x0,-1,z)),Vector((0,1,0)))
                if loc:pts.append((x0,loc.y-.006,z))
            if len(pts)>1:ctx['tube']('Jacket / tailored seam',pts,.00055,stitch)
        # Visible pouch flap edge and brass harness adjuster.
        x=sign*.105;pts=[]
        for j in range(7):
            px=x-.043+j*.086/6;z=1.365;loc,_,_,_=bvh.ray_cast(Vector((px,-1,z)),Vector((0,1,0)))
            if loc:pts.append((px,loc.y-.015,z))
        if len(pts)>1:ctx['tube']('Jacket / pocket welt',pts,.0012,stitch)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH' and any(m in mapped for m in obj.data.materials):uv_project(obj)
    # Hidden skin under the fixed prototype outfit consumes geometry but cannot
    # be seen. This study intentionally retains no customizable undressed body.
    bm=bmesh.new();bm.from_mesh(body.data)
    hidden=[f for f in bm.faces if all(v.co.z<1.555 for v in f.verts) or all(v.co.z>1.775 for v in f.verts)]
    bmesh.ops.delete(bm,geom=hidden,context='FACES');bm.to_mesh(body.data);bm.free()
    # Apply geometric modifiers, then weld objects sharing one material batch.
    # Keep the deform modifier and normalized source groups on every batch.
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for obj in meshes:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):
            if modifier.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=modifier.name)
        if len(obj.data.polygons)>700 and obj!=body and not obj.name.startswith(('Eyes','Jacket / deforming','Trousers','Gloves','Boots','Hair / swept textured')):
            dec=obj.modifiers.new('Reduce curve tessellation','DECIMATE');dec.ratio=.28
            bpy.ops.object.modifier_apply(modifier=dec.name)
    batches={}
    for obj in meshes:
        key=tuple(m.name for m in obj.data.materials);batches.setdefault(key,[]).append(obj)
    for mats,objects in batches.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        objects[0].name='Rook v3 / '+mats[0]
    print('ROOK_V3_REFINEMENT_COMPLETE')
