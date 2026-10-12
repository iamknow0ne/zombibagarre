import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Simulation} from '../src/rebuild/Simulation.js';
import {WEAPONS} from '../src/rebuild/config.js';
import {meleeTiming,meleePose,recoilAt,reloadPose} from '../src/rebuild/WeaponMotion.js';
import {animateWeapons,solveArm} from '../src/rebuild/WeaponRig.js';
const game=()=>{const s=new Simulation({seed:12});s.start('katana');s.props=[];s.obstacles=[];s.toSpawn=999;s.spawnTimer=9999;return s;};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('blade damage, sound and feedback occur at contact, once per stroke',()=>{
 const s=game(),e=s.spawnEnemy('boss',0,5);e.speed=0;e.attack=999;const health=e.health;
 s.update(1/60,{firing:true,aim:e,auto:false});assert.equal(e.health,health);assert.ok(s.events.some(e=>e.type==='swing'));assert.ok(!s.events.some(e=>e.type==='slice'));
 tick(s,8);assert.equal(e.health,health);tick(s,6);assert.ok(e.health<health);const after=e.health;tick(s,20);assert.equal(e.health,after);assert.equal(s.events.filter(e=>e.type==='slice').length,1);
});
test('late blade tap buffers exactly one combo follow-up; switching and dodging cancel pending contact',()=>{
 const s=game();s.update(1/60,{firing:true,aim:{x:0,z:8},auto:false});tick(s,27);s.update(1/60,{firing:true,aim:{x:0,z:8},auto:false});tick(s,12);assert.equal(s.player.swingCombo,1);assert.equal(s.events.filter(e=>e.type==='swing').length,2);tick(s,80);assert.equal(s.events.filter(e=>e.type==='swing').length,2);
 for(const cancel of ['dash','switch']){const g=game(),e=g.spawnEnemy('boss',0,5);e.speed=0;e.attack=999;const health=e.health;g.update(1/60,{firing:true,aim:e,auto:false});if(cancel==='dash')g.update(1/60,{dash:true,x:1,auto:false});else g.switchWeapon('carbine');tick(g,30);assert.equal(e.health,health);assert.equal(g.player.meleeAttack,null);}
});
test('held attacks complete three distinct strokes, pause resets the combo and fast upgrades preserve contact',()=>{
 for(const key of ['katana','dual'])for(const multiplier of [1,.5]){const s=game();s.switchWeapon(key);s.player.fireMultiplier=multiplier;tick(s,150,{firing:true,aim:{x:0,z:9}});const hits=s.events.filter(e=>e.type==='slice');assert.ok(hits.length>=3);assert.deepEqual(hits.slice(0,3).map(e=>e.combo),[0,1,2]);assert.ok(hits[2].radius>hits[0].radius);tick(s,100);s.update(1/60,{firing:true,aim:{x:0,z:9},auto:false});assert.equal(s.player.swingCombo,0);}
});
test('recoil settles, reload returns to guard, and melee endpoints are continuous',()=>{
 for(const key of Object.keys(WEAPONS).filter(k=>!WEAPONS[k].melee)){assert.equal(recoilAt(key,2),0);assert.equal(recoilAt(key,0),0);assert.ok(recoilAt(key,.02)>0);}
 assert.equal(reloadPose(0).lower,0);assert.equal(reloadPose(1).lower,0);
 for(const k of ['katana','dual'])for(let c=0;c<3;c++){const timing=meleeTiming(k,c);assert.ok(timing.contact<timing.cutEnd&&timing.cutEnd<timing.duration);for(const f of [0,1]){const pose=meleePose(k,c,f);assert.equal(pose.twist,0);assert.equal(pose.height,0);assert.equal(pose.reach,0);}}
});
function dummyRig(){const m=new T.Group(),body=new T.Group();m.add(body);m.userData={body,arms:[-1,1].map(side=>{const arm=new T.Group(),elbow=new T.Group(),wrist=new T.Group();arm.position.set(side*.37,1.35,0);elbow.position.y=-.34;wrist.position.y=-.32;body.add(arm);arm.add(elbow);elbow.add(wrist);arm.userData={elbow,wrist};return arm;})};return m;}
const mesh=(parent)=>{const m=new T.Mesh(new T.BoxGeometry(.01,.01,.01),new T.MeshBasicMaterial());parent.add(m);return m;};
const kit={box:mesh,sphere:mesh,cylinder:mesh,batch:()=>{},remove:g=>g.removeFromParent()};
test('weapon grips remain within arm reach through all weapon cycles and dual-wield reloads',()=>{
 const results=[];
 for(const key of Object.keys(WEAPONS))for(const paired of [false,true]){
  if(paired&&key==='katana')continue;
  const s=game();s.setLoadout(paired&&!WEAPONS[key].melee?[key,key]:[key]);const p=s.player,m=dummyRig();let error=0;
  for(let i=0;i<300;i++){s.update(1/60,{auto:false,firing:i<100||i>250,aim:{x:0,z:8},reload:i===120});animateWeapons(m,p,s.time,1/60,kit);error=Math.max(error,m.userData.gripError);}
  results.push([key,paired,error]);
 }
 assert.ok(results.every(r=>r[2]<.03),JSON.stringify(results));
});
test('inverse kinematics puts the actual wrist on its target',()=>{
 const m=dummyRig(),arm=m.userData.arms[1],target=new T.Vector3(.3,1.2,.5);solveArm(arm,target,new T.Quaternion(),1);m.updateMatrixWorld(true);const wrist=arm.userData.wrist.getWorldPosition(new T.Vector3());assert.ok(wrist.distanceTo(target)<1e-6);
});
