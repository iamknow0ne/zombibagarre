import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEnemy} from '../src/rebuild/EnemyVisuals.js';
import {animateEnemyDetails} from '../src/rebuild/EnemyMotion.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
const types=['walker','runner','brute','spitter','armored','volatile'];
function pose(root,time,phase,walk=1){
 const d=root.userData;d.body.position.y=0;d.body.rotation.set(0,0,0);
 d.legs.forEach((leg,i)=>{leg.rotation.set(Math.sin(phase+i*Math.PI)*.62*walk,0,0);leg.userData.knee.rotation.x=Math.max(0,Math.sin(phase+i*Math.PI))*.82*walk;});
 animateEnemyDetails(root,time,{phase,walk});
 const values=[];root.traverse(n=>{if(n.isGroup)values.push(...n.position.toArray(),n.rotation.x,n.rotation.y,n.rotation.z,...n.scale.toArray());});return values;
}
test('enemy motion is bounded, deterministic and has a distinct silhouette for every archetype',()=>{
 const signatures=new Set();
 for(const type of types){const root=buildEnemy(type,3),d=root.userData;
  for(let frame=0;frame<240;frame++){const time=frame/60,values=pose(root,time,time*6);assert.ok(values.every(Number.isFinite));assert.ok(Math.abs(d.body.rotation.x)<.35);assert.ok(Math.abs(d.head.rotation.z)<.2);}
  const a=pose(root,1,3),b=pose(root,1,3);assert.deepEqual(a,b,'paused pose cannot drift');
  signatures.add([d.body.rotation.x,d.arms[0].rotation.x,d.arms[0].userData.elbow.rotation.x].map(x=>x.toFixed(3)).join(':'));
  const originalScale=root.scale.toArray();pose(root,4,5,0);assert.deepEqual(root.scale.toArray(),originalScale);assert.equal(d.body.position.y,0,'idle breath must not slide feet');
  d.head.visible=false;d.arms[0].visible=false;pose(root,2,1);assert.equal(d.head.visible,false);assert.equal(d.arms[0].visible,false,'animation does not undo dismemberment');disposeObjectResources(root);
 }
 assert.equal(signatures.size,types.length);
});

test('production enemy animator applies the new archetype layer without modifying collision state',async()=>{
 const {World}=await import('../src/rebuild/World.js');
 const signatures=new Set();
 for(const type of types){const root=buildEnemy(type,0),state={x:0,z:0,moveX:0,moveZ:0,angle:0,grounded:false,traversal:true,phase:.3,health:100};
  const before={...state};World.prototype.animateCharacter.call({settings:{reducedMotion:true}},root,1,false,false,0,state);
  assert.deepEqual(state,before);assert.equal(root.position.y,0);
  signatures.add([root.userData.body.rotation.x,root.userData.arms[0].rotation.x].map(v=>v.toFixed(3)).join(':'));
  disposeObjectResources(root);
 }
 assert.equal(signatures.size,types.length,'all six live enemy types have independent pose language');
});

test('live crawlers lead with their head, look forward and plant their hands at every heading',async()=>{
 const T=await import('three'),{animateEnemyCrawl}=await import('../src/rebuild/EnemyMotion.js'),{World}=await import('../src/rebuild/World.js');
 for(const type of types)for(const heading of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const root=buildEnemy(type,2),d=root.userData;root.scale.multiplyScalar(heading===Math.PI?1.15*1.035:1);const scale=root.scale.y,elevation=3;root.position.set(4,elevation,-7);root.rotation.y=heading;
  d.head.visible=false;d.arms[0].visible=false;d.legs.forEach(l=>l.visible=false);
  const state={x:4,y:elevation,z:-7,angle:heading,crawling:true,grounded:false,traversal:true,health:100},before={...state};
  for(let frame=0;frame<24;frame++){
   World.prototype.animateCharacter.call({settings:{reducedMotion:true}},root,frame/12,true,false,0,state);d.gait=frame*Math.PI/12;
   animateEnemyCrawl(root,frame/12,state);root.updateMatrixWorld(true);
   const forward=new T.Vector3(Math.sin(heading),0,Math.cos(heading)),head=d.head.getWorldPosition(new T.Vector3()),pelvis=d.legs[0].getWorldPosition(new T.Vector3()),facing=new T.Vector3(0,0,1).applyQuaternion(d.head.getWorldQuaternion(new T.Quaternion()));
   assert.ok(head.clone().sub(pelvis).dot(forward)>.8*scale,'head leads the pelvis along the facing direction');assert.ok(facing.dot(forward)>.95&&Math.abs(facing.y)<.2,'face looks forward rather than at the sky or floor');
   for(const arm of d.arms){const hand=arm.userData.wrist.getWorldPosition(new T.Vector3());assert.ok(hand.clone().sub(pelvis).dot(forward)>.65*scale,'hands reach in front');assert.ok(hand.y-elevation>=.025*scale&&hand.y-elevation<.12*scale,'palms stay near ground through the plant and recovery');}
   const first=[];root.traverse(n=>{if(n.isGroup)first.push(...n.position.toArray(),...n.quaternion.toArray());});animateEnemyCrawl(root,frame/12,state);const second=[];root.traverse(n=>{if(n.isGroup)second.push(...n.position.toArray(),...n.quaternion.toArray());});assert.deepEqual(second,first,'paused crawl cannot drift');
  }
  assert.deepEqual(state,before,'visual crawl never edits the collision actor');assert.equal(d.head.visible,false);assert.equal(d.arms[0].visible,false);assert.ok(d.legs.every(l=>!l.visible),'gore visibility remains untouched');
  d.legs.forEach(l=>l.visible=true);animateEnemyCrawl(root,2,state);assert.ok(d.legs.every(l=>l.visible),'gore-off crawlers retain their visible legs');
  // A living actor returning to an upright animation must not keep the prone
  // pelvis offset; dead bodies have a separate pose path and never call this.
  animateEnemyDetails(root,0,{phase:0,walk:0},{});assert.equal(d.body.position.z,0);disposeObjectResources(root);
 }
});
