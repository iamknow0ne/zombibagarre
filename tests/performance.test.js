import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {batchRigid,CharacterInstances,reuseSceneForAO} from '../src/rebuild/RenderBatch.js';
import {segmentBoxTime,seededRandom} from '../src/rebuild/config.js';
import {boundarySegmentClear,segmentDistance} from '../src/rebuild/CityTopology.js';

test('allocation-free segment intersections match the original slab solver including grazing and stationary rays',()=>{
 const reference=(a,b,o,padding=0)=>{let lo=0,hi=1;for(const [axis,half]of [['x',o.w/2+padding],['z',o.d/2+padding]]){const delta=b[axis]-a[axis],min=o[axis]-half,max=o[axis]+half;if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return null;}else{let t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;};
 const r=seededRandom(88);for(let i=0;i<12000;i++){const a={x:r()*50-25,z:r()*50-25},b=i%4?{x:r()*50-25,z:r()*50-25}:{...a},o={x:r()*30-15,z:r()*30-15,w:r()*10+.1,d:r()*10+.1},pad=r()*2;assert.equal(segmentBoxTime(a,b,o,pad),reference(a,b,o,pad));}for(const x of [-1,0,1])assert.equal(segmentBoxTime({x,z:-2},{x,z:2},{x:0,z:0,w:2,d:2}),.25);
});
test('boundary broad phase preserves concave and radius-sensitive route checks',()=>{
 const poly=[{x:-20,z:-20},{x:20,z:-20},{x:20,z:0},{x:0,z:0},{x:0,z:20},{x:-20,z:20}],cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),ref=(a,b,r)=>{for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;if(r&&Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b))<r)return false;}return true;},r=seededRandom(92);for(let i=0;i<3000;i++){const a={x:r()*60-30,z:r()*60-30},b={x:r()*60-30,z:r()*60-30},radius=r()*3;assert.equal(boundarySegmentClear(poly,a,b,radius),ref(a,b,radius));}
});
test('rigid batches preserve geometry bounds and colour, leaving moving joints and textured parts intact',()=>{
 const root=new T.Group(),joint=new T.Group();root.add(joint);for(let i=0;i<5;i++){const m=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:i%2?0xff0000:0x00ff00}));m.position.x=i;root.add(m);}const tex=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:new T.Texture()}));root.add(tex);const before=new T.Box3().setFromObject(root);batchRigid(root);const after=new T.Box3().setFromObject(root);assert.ok(before.min.distanceTo(after.min)<1e-6&&before.max.distanceTo(after.max)<1e-6);assert.equal(root.children.length,3);assert.equal(tex.parent,root);assert.equal(joint.parent,root);const merged=root.children.find(m=>m.geometry?.attributes.color);assert.ok(merged);assert.equal(merged.geometry.attributes.position.count,180);assert.equal(merged.material.color.getHex(),0xffffff);
});
test('enemy instances keep independent transforms, limb visibility and removal without disposing shared material',()=>{
 const scene=new T.Scene(),geo=new T.BoxGeometry(),mat=new T.MeshStandardMaterial();let disposed=false;mat.addEventListener('dispose',()=>disposed=true);const chars=new Map();for(let i=0;i<3;i++){const root=new T.Group();root.userData={type:'walker',variant:0};root.position.x=i*3;const arm=new T.Group();root.add(arm);arm.add(new T.Mesh(geo,mat));scene.add(root);chars.set(i,root);}const renderer=new CharacterInstances(scene);renderer.update(chars);assert.equal(renderer.batches.size,1);const batch=[...renderer.batches.values()][0],matrix=new T.Matrix4();assert.equal(batch.count,3);batch.getMatrixAt(1,matrix);assert.equal(matrix.elements[12],3);chars.get(1).children[0].visible=false;chars.get(2).position.x=12;renderer.update(chars);assert.equal(batch.count,2);batch.getMatrixAt(1,matrix);assert.equal(matrix.elements[12],12);chars.delete(0);renderer.update(chars);assert.equal(batch.count,1);chars.clear();renderer.update(chars);assert.equal(batch.visible,false);renderer.dispose();assert.equal(disposed,false);assert.equal(renderer.batches.size,0);
});
test('AO reuses the colour-pass shadow and matrices and restores flags even on error',()=>{
 const scene={matrixWorldAutoUpdate:true},renderer={shadowMap:{autoUpdate:true}},ao={render(){assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(scene.matrixWorldAutoUpdate,false);throw Error('test');}};reuseSceneForAO(ao,scene);assert.throws(()=>ao.render(renderer));assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(scene.matrixWorldAutoUpdate,true);
});

test('fixed scenery retains world transforms, while new decals remain movable',async()=>{
 const {freezeLocalTransforms}=await import('../src/rebuild/RenderBatch.js');const scene=new T.Scene(),root=new T.Group(),part=new T.Mesh(new T.BoxGeometry());scene.add(root);root.position.set(10,0,20);part.position.set(3,2,1);root.add(part);scene.updateMatrixWorld(true);const before=part.matrixWorld.clone();freezeLocalTransforms(root);scene.updateMatrixWorld(true);assert.deepEqual(part.matrixWorld.elements,before.elements);const decal=new T.Group();part.add(decal);decal.position.y=2;scene.updateMatrixWorld(true);assert.equal(decal.matrixWorld.elements[13],4);
});
test('AO only hides visible excluded objects and restores original hidden branches',async()=>{
 const {visibleAOOnly}=await import('../src/rebuild/RenderBatch.js');const scene=new T.Scene(),hidden=new T.Group(),sprite=new T.Sprite(),inside=new T.Sprite(),solid=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());hidden.visible=false;hidden.add(inside);scene.add(hidden,sprite,solid);const ao={};visibleAOOnly(ao,scene);ao.overrideVisibility();assert.equal(sprite.visible,false);assert.equal(hidden.visible,false);assert.equal(inside.visible,true);assert.equal(solid.visible,true);ao.restoreVisibility();assert.equal(sprite.visible,true);assert.equal(hidden.visible,false);
});


test('idle rendering is throttled without dropping gameplay frames or resume/resize updates',async()=>{
 const {RenderSchedule}=await import('../src/rebuild/RenderSchedule.js');const r=new RenderSchedule();assert.equal(r.next(0,'playing'),0);assert.equal(r.next(8,'playing'),.008);assert.equal(r.next(16,'paused'),.008);assert.equal(r.next(32,'paused'),null);assert.equal(r.next(40,'paused',false,true),.024);assert.equal(r.next(100,'paused',true),null);assert.equal(r.next(108,'playing'),.008);assert.equal(r.next(116,'playing'),.008);assert.equal(r.next(124,'menu'),.008);assert.equal(r.next(140,'menu'),null);assert.ok(r.next(160,'menu')>0);
});

test('balanced enemy shadows use contact shading and high restores articulated shadows',()=>{
 const scene=new T.Scene(),root=new T.Group();root.userData={type:'walker',variant:0};const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());mesh.castShadow=true;root.add(mesh);scene.add(root);const chars=new Map([[1,root]]),instances=new CharacterInstances(scene);
 instances.update(chars,'balanced');const batch=[...instances.batches.values()][0];assert.equal(batch.castShadow,false);assert.equal(batch.visible,true);assert.equal(batch.count,1);
 instances.update(chars,'high');assert.equal(batch.castShadow,true);assert.equal(batch.count,1);instances.update(chars,'low');assert.equal(batch.castShadow,false);instances.dispose();
});
