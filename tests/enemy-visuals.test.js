import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildEnemy} from '../src/rebuild/EnemyVisuals.js';
import {CharacterInstances} from '../src/rebuild/RenderBatch.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
import {World} from '../src/rebuild/World.js';

const types=['walker','runner','brute','spitter','armored','volatile'];
const meshes=root=>{const a=[];root.traverse(n=>{if(n.isMesh)a.push(n);});return a;};
const descendant=(node,ancestor)=>{for(let p=node;p;p=p.parent)if(p===ancestor)return true;return false;};
const watch=r=>{let count=0;r.addEventListener('dispose',()=>count++);return()=>count;};

test('every shipped ordinary enemy variant fits the horde budget with finite geometry and articulated anchors',()=>{
 for(const type of types)for(let id=0;id<6;id++){
  const root=buildEnemy(type,id),d=root.userData,list=meshes(root),bounds=new T.Box3().setFromObject(root);
  const triangles=list.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
  assert.ok(triangles<=4600,`${type}/${id}: ${triangles} triangles`);
  assert.ok(list.length<=23,`${type}/${id}: ${list.length} rigid draws`);
  assert.equal(d.head.parent,d.body);assert.equal(d.face,d.head);assert.ok(d.head.position.y>1.48,'headshot cutoff must include the complete face and headwear');
  const origin=d.head.localToWorld(new T.Vector3(0,-.027,1)),hits=new T.Raycaster(origin,new T.Vector3(0,0,-1)).intersectObject(d.head,true);
  assert.ok(hits.length&&d.head.worldToLocal(hits[0].point.clone()).z>.16,'front-facing facial planes must render outside the skull');
  assert.equal(d.arms.length,2);assert.equal(d.legs.length,2);
  for(const arm of d.arms){assert.equal(arm.parent,d.body);assert.equal(arm.userData.elbow.parent,arm);assert.equal(arm.userData.wrist.parent,arm.userData.elbow);}
  for(const leg of d.legs){assert.equal(leg.parent,d.body);assert.equal(leg.userData.knee.parent,leg);}
  for(const m of list){assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));assert.ok(m.geometry.attributes.color);assert.equal(m.material.transparent,false);if(m.material.name==='infected-face'){assert.ok(m.material.map?.userData.shared);assert.ok(m.geometry.attributes.uv);}else assert.equal(m.material.map,null);}
  assert.ok(bounds.min.y>=-.01&&bounds.max.y<3.1,'feet remain on the ground and height stays within the original archetype envelope');
  disposeObjectResources(root);
 }
});

test('archetypes read through broad silhouette differences without relying only on recolouring',()=>{
 const models=Object.fromEntries(types.map(type=>[type,buildEnemy(type,0)]));
 const size=type=>new T.Box3().setFromObject(models[type]).getSize(new T.Vector3());
 assert.ok(size('brute').x>size('walker').x*1.4);
 assert.ok(size('runner').x<size('walker').x*.9);
 assert.ok(size('spitter').z>size('walker').z*1.2);
 assert.ok(size('volatile').z>size('walker').z*1.2);
 for(const root of Object.values(models))disposeObjectResources(root);
});

test('real enemy instance batches respect hidden heads, limbs and whole actors, then recover without new batches',()=>{
 const scene=new T.Scene(),a=buildEnemy('armored',3),b=buildEnemy('armored',3);scene.add(a,b);
 const actors=new Map([[1,a],[2,b]]),instances=new CharacterInstances(scene);instances.update(actors);
 const initial=instances.batches.size;assert.ok(initial<=23);assert.ok([...instances.batches.values()].every(batch=>batch.count===2));
 const hidden=[a.userData.head,a.userData.arms[0],...a.userData.legs];for(const node of hidden)node.visible=false;
 instances.update(actors);
 for(const {mesh,batch}of instances.actors.get(1).parts)assert.equal(batch.count,hidden.some(group=>descendant(mesh,group))?1:2);
 a.visible=false;instances.update(actors);assert.ok([...instances.batches.values()].every(batch=>batch.count===1));
 a.visible=true;for(const node of hidden)node.visible=true;instances.update(actors);
 assert.equal(instances.batches.size,initial);assert.ok([...instances.batches.values()].every(batch=>batch.count===2));
 instances.dispose();disposeObjectResources(a);disposeObjectResources(b);
});

test('the production corpse path hides all headwear and each damaged limb while preserving the torso',()=>{
 for(const enemyType of types){
  const world={ring:World.prototype.ring,character:World.prototype.character,settings:{goreLevel:4},scene:new T.Scene(),corpses:[],effects:[],propMeshes:new Map(),buildingMeshes:new Map(),wrecks:[],random:()=>.5,decal(){},detachParts(){}};
  World.prototype.leaveRemains.call(world,{enemyType,enemyId:2,x:0,z:0,death:'headshot',crawling:true,missingArm:true});
  const root=world.corpses[0].mesh,d=root.userData;
  assert.equal(d.head.visible,false);assert.equal(d.face.visible,false);assert.ok(d.legs.every(l=>!l.visible));assert.equal(d.arms[0].visible,false);assert.equal(d.arms[1].visible,true);assert.equal(d.body.visible,true);assert.equal(d.frost.visible,false);
  const visible=[];root.traverseVisible(n=>{if(n.isMesh)visible.push(n);});assert.ok(visible.length>0);assert.ok(visible.every(n=>!descendant(n,d.head)));
  disposeObjectResources(world.scene);
 }
});

test('rebuilding and disposing real enemies releases all owned geometry once and leaves live actor/instance resources intact',()=>{
 const survivor=buildEnemy('spitter',1),survivorCounts=meshes(survivor).map(m=>watch(m.geometry)),shared=new Map();
 for(let i=0;i<12;i++){
  const root=buildEnemy(types[i%types.length],i),source=meshes(root),counts=source.map(m=>watch(m.geometry));
  for(const m of source)if(!shared.has(m.material))shared.set(m.material,watch(m.material));
  const scene=new T.Scene();scene.add(root);const instances=new CharacterInstances(scene);instances.update(new Map([[i,root]]));
  const batchCounts=[...instances.batches.values()].map(b=>watch(b.geometry));
  disposeObjectResources(root);assert.ok(counts.every(count=>count()===1));assert.ok(batchCounts.every(count=>count()===0));
  instances.dispose();assert.ok(batchCounts.every(count=>count()===1));
 }
 assert.ok(survivorCounts.every(count=>count()===0));assert.ok([...shared.values()].every(count=>count()===0));
 disposeObjectResources(survivor);assert.ok(survivorCounts.every(count=>count()===1));
});

test('painted cheek lesions remain in front of the curved skull for every archetype and appearance',()=>{
 const ray=new T.Raycaster(),center=new T.Vector3(),point=new T.Vector3();
 const isWound=(geometry,index)=>(geometry.userData.woundRanges||[]).some(([start,count])=>index>=start&&index<start+count);
 for(const type of types)for(let appearance=0;appearance<6;appearance++){
  const root=buildEnemy(type,appearance),head=root.userData.head;root.updateMatrixWorld(true);let checked=0;
  head.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color;
   // Exact painted-surface ranges survive non-indexed bone merging, even
   // when rim pigment blends gradually into the surrounding skin.
   for(let i=0;i<p.count;i+=3){if(!isWound(mesh.geometry,i))continue;
    center.fromBufferAttribute(p,i).add(point.fromBufferAttribute(p,i+1)).add(point.fromBufferAttribute(p,i+2)).multiplyScalar(1/3);mesh.localToWorld(center);
    ray.set(center.clone().add(new T.Vector3(0,0,1)),new T.Vector3(0,0,-1));const first=ray.intersectObject(head,true)[0];
    assert.ok(first&&isWound(first.object.geometry,first.face.a),`${type}/${appearance}: wound triangle ${i/3} disappears inside the cheek`);checked++;
   }
  });
  assert.ok(checked>=100,'sample both lesion layers, not only their boundary vertices');disposeObjectResources(root);
 }
});

test('mutated torsos are continuous closed shells with a distinct shared membrane response',()=>{
 for(const type of ['spitter','volatile']){
  const root=buildEnemy(type,0),membranes=meshes(root).filter(m=>m.material.name==='infected-membrane');
  assert.equal(membranes.length,1,'one fused mass replaces overlapping growth spheres');
  const mass=membranes[0],g=mass.geometry,p=g.attributes.position,index=g.index,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e5)).join(',');
  for(let i=0;i<index.count;i+=3){const triangle=[key(index.getX(i)),key(index.getX(i+1)),key(index.getX(i+2))];if(new Set(triangle).size<3)continue;
   for(let j=0;j<3;j++){const edge=[triangle[j],triangle[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  assert.ok(edges.size>100);assert.ok([...edges.values()].every(n=>n===2),'sculpted mass has no open seams or detached lobes');
  assert.equal(mass.material.userData.shared,true);assert.equal(mass.material.transparent,false);assert.ok(mass.material.roughness<.7&&mass.material.roughness>.45,'membrane catches light differently from matte skin and cloth');
  const clone=buildEnemy(type,0),other=meshes(clone).find(m=>m.material.name==='infected-membrane');assert.equal(mass.material,other.material);assert.notEqual(mass.geometry,other.geometry);
  disposeObjectResources(root);disposeObjectResources(clone);
 }
});
