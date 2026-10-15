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
