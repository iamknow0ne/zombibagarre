import * as T from 'three';
import {fragmentGeometry} from './Effects.js';

export class StructureVisuals{
 constructor(scene){this.scene=scene;this.batches=new Map();this.transform=new T.Object3D();
  const pixels=new Uint8Array(64*64*4);let seed=73;for(let i=0;i<64*64;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed%19===0?110:195+seed%60;pixels.set([value,value,value,255],i*4);}this.aggregate=new T.DataTexture(pixels,64,64);this.aggregate.wrapS=this.aggregate.wrapT=T.RepeatWrapping;this.aggregate.magFilter=T.LinearFilter;this.aggregate.needsUpdate=true;}
 update(parts,player,overview=false){
  for(const b of this.batches.values())b.count=0;
  for(const [index,p] of parts.entries()){
   if(!overview&&Math.hypot(p.x-player.x,p.z-player.z)>75)continue;
   const key=p.material+'-'+index%3;let batch=this.batches.get(key);
   if(!batch){const geo=fragmentGeometry(p.material,index%3).clone();geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3());geo.scale(1/size.x,1/size.y,1/size.z);geo.center();geo.userData.shared=false;
    const positions=geo.attributes.position,normals=geo.attributes.normal,uv=[];for(let i=0;i<positions.count;i++){const nx=Math.abs(normals.getX(i)),ny=Math.abs(normals.getY(i)),nz=Math.abs(normals.getZ(i));uv.push((nx>ny&&nx>nz?positions.getZ(i):positions.getX(i))*2,(ny>nx&&ny>nz?positions.getZ(i):positions.getY(i))*2);}geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    const material=new T.MeshStandardMaterial({map:this.aggregate,bumpMap:this.aggregate,bumpScale:.035,color:p.material==='metal'?0x667775:p.material==='brick'?0x826b54:0x76776b,roughness:p.material==='metal'?.5:.97,metalness:p.material==='metal'?.65:0});
    batch=new T.InstancedMesh(geo,material,1024);batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.castShadow=batch.receiveShadow=true;batch.frustumCulled=false;this.scene.add(batch);this.batches.set(key,batch);batch.count=0;
   }
   if(batch.count>=1024)continue;
   const o=this.transform;o.position.set(p.x,p.y,p.z);o.rotation.set(p.rx,p.ry,p.rz);o.scale.set(p.w,p.h,p.d);o.updateMatrix();batch.setMatrixAt(batch.count++,o.matrix);
  }
  for(const b of this.batches.values()){b.instanceMatrix.needsUpdate=true;b.visible=b.count>0;}
 }
 dispose(){for(const b of this.batches.values()){b.removeFromParent();b.geometry.dispose();b.material.dispose();}this.batches.clear();this.aggregate.dispose();}
}
