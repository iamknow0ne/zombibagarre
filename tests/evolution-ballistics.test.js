import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Simulation} from '../src/rebuild/Simulation.js';
import {WEAPONS,weaponStats,magazineSize,UPGRADES} from '../src/rebuild/config.js';
import {weaponTier,addMastery,MASTERY_THRESHOLDS,WEAPON_FINISHES} from '../src/rebuild/Evolution.js';
import {shotPose,meleePose,weaponReloadPose} from '../src/rebuild/WeaponMotion.js';
import {buildWeapon} from '../src/rebuild/WeaponRig.js';
import {circleContact,stepFragment} from '../src/rebuild/Ballistics.js';
const game=()=>{const s=new Simulation({layout:{bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},cover:[],spawnPoints:[]}});s.start();s.toSpawn=999;s.spawnTimer=9999;s.events=[];return s;};
const bullet=(extra={})=>({id:999,x:0,z:0,vx:0,vz:100,life:1,damage:25,pierce:0,weapon:'carbine',hitIds:[],...extra});
test('all weapon families have four progressive tiers and mastery is bounded, run-local and shared by matching guns',()=>{
 for(const key of Object.keys(WEAPONS)){const s=game(),p=s.player;assert.ok(WEAPON_FINISHES[key]);let previous=0;for(let tier=0;tier<4;tier++){p.mastery[key]=MASTERY_THRESHOLDS[tier];const w=weaponStats(p,key);assert.equal(w.tier,tier);assert.ok(w.damage>previous);assert.ok(magazineSize(p,key)>=WEAPONS[key].magazine);previous=w.damage;}s.setLoadout([key,key]);assert.equal(weaponTier(p,key),3);s.setLoadout(['smg']);s.setLoadout([key]);assert.equal(weaponTier(p,key),3);s.start(key);assert.equal(weaponTier(s.player,key),0);}
 const p={};assert.deepEqual(addMastery(p,'carbine',1e9),[1,2,3]);assert.equal(p.mastery.carbine,8000);assert.deepEqual(addMastery(p,'carbine',NaN),[]);
});
test('mastery awards only actual damage once, emits every crossed tier, and workshop upgrades distinct types once',()=>{
 const s=game(),e=s.spawnEnemy('walker',0,9);e.health=20;s.damageEnemy(e,9999,0,0,{weapon:'carbine'});s.damageEnemy(e,9999,0,0,{weapon:'carbine'});assert.equal(s.player.mastery.carbine,20);
 s.fireWeapon('smg',{x:10,z:10});assert.equal(s.player.mastery.smg,undefined);s.earnMastery('carbine',4000);assert.deepEqual(s.events.filter(e=>e.type==='evolution').map(e=>e.tier),[1,2]);
 s.setLoadout(['shotgun','shotgun']);s.state='upgrade';s.choices=[UPGRADES.find(u=>u.id==='workshop')];assert.ok(s.chooseUpgrade('workshop'));assert.equal(s.player.mastery.shotgun,650);
});
test('signature weapons retain distinct mechanics and actual shot variations cycle through four poses',()=>{
 const s=game();for(const key of Object.keys(WEAPONS))s.player.mastery[key]=8000;
 assert.equal(weaponStats(s.player,'arc').chain,6);assert.equal(weaponStats(s.player,'smg').ricochet,1);assert.equal(weaponStats(s.player,'shotgun').pellets,8);assert.ok(weaponStats(s.player,'shotgun').burn>0);
 s.setLoadout(['revolver']);for(let i=0;i<4;i++)s.fireWeapon('revolver',{x:0,z:20});assert.deepEqual(s.events.filter(e=>e.type==='shoot').map(e=>e.variant),[0,1,2,3]);assert.equal(s.bullets.filter(b=>b.explosive>0).length,1);
 for(const key of Object.keys(WEAPONS)){const poses=new Set();for(let v=0;v<4;v++){const pose=WEAPONS[key].melee?meleePose(key,0,.4,v):shotPose(key,.035,v);poses.add(JSON.stringify(pose));}assert.equal(poses.size,4,key);if(!WEAPONS[key].melee)for(const f of [0,1])assert.ok(Math.abs(weaponReloadPose(key,f).magazine)<1e-9);}
});
test('all weapon models change geometry with tier without creating blades for firearms',()=>{
 const fingerprints=new Set();for(const key of Object.keys(WEAPONS)){let previous=0;for(let tier=0;tier<4;tier++){const g=buildWeapon(key,{batch:()=>{}},tier),bounds=new T.Box3().setFromObject(g);let vertices=0;g.traverse(o=>{if(o.geometry)vertices+=o.geometry.attributes.position.count;});assert.ok(vertices>previous,key+' '+tier);previous=vertices;assert.ok(!bounds.isEmpty());assert.ok(g.userData.tip.z>0);assert.equal(g.userData.key,key);assert.equal(g.userData.tier,tier);fingerprints.add([key,vertices,bounds.getSize(new T.Vector3()).toArray()].join(':'));}}assert.equal(fingerprints.size,Object.keys(WEAPONS).length*4);
});
test('swept bullets hit nearest enemy before cover and cover shields enemies behind it',()=>{
 for(const behind of [false,true]){const s=game(),e=s.spawnEnemy('brute',0,behind?4.8:1.7),hp=e.health;const wall={id:'wall',kind:'barrier',x:0,z:3.5,w:4,d:.2,health:999,maxHealth:999};s.props=[wall];s.obstacles=s.props;s.bullets=[bullet()];s.updateBullets(.05);assert.equal(e.health<hp,!behind);assert.equal(wall.health<999,behind);}
 const s=game(),far=s.spawnEnemy('brute',0,4),near=s.spawnEnemy('brute',0,1);s.bullets=[bullet()];s.updateBullets(.05);assert.equal(far.health,far.maxHealth);assert.ok(near.health<near.maxHealth);assert.equal(circleContact({x:0,z:0},{x:0,z:0},{x:3,z:3},1),null);
});
test('piercing loses energy with depth and knockback respects enemy mass',()=>{
 const s=game(),far=s.spawnEnemy('brute',0,4),near=s.spawnEnemy('brute',0,1);s.bullets=[bullet({pierce:2})];s.updateBullets(.05);assert.ok(near.maxHealth-near.health>far.maxHealth-far.health);
 const walker=s.spawnEnemy('walker',4,4),boss=s.spawnEnemy('boss',6,6);s.damageEnemy(walker,1,10,0);s.damageEnemy(boss,1,10,0);assert.ok(walker.knockX>boss.knockX*3);
});
test('launcher arcs, detonates once and signature subcharges are finite; glancing SMG hits ricochet once',()=>{
 const s=game();s.player.mastery.launcher=8000;s.fireWeapon('launcher',{x:0,z:20});const b=s.bullets[0],y=b.y;s.updateBullets(.05);assert.ok(b.y>y);for(let i=0;i<40;i++)s.updateBullets(.05);assert.equal(s.events.filter(e=>e.type==='explosion').length,1);assert.equal(s.hazards.length,3);assert.equal(s.bullets.length,0);
 const r=game(),wall={id:'wall',kind:'barrier',x:1,z:2,w:.2,d:8,health:999,maxHealth:999};r.props=[wall];r.obstacles=r.props;r.bullets=[bullet({weapon:'smg',vx:20,vz:60,ricochets:1})];r.updateBullets(.05);assert.equal(r.bullets.length,1);assert.ok(r.bullets[0].vx<0);assert.equal(r.bullets[0].ricochets,0);assert.ok(r.bullets[0].damage<25);
});
test('fragments follow ballistic gravity and material restitution across frame rates',()=>{
 const run=dt=>{const e={mesh:{position:{x:0,y:8,z:0}},vx:4,vy:3,vz:2,gravity:9.81,drag:.3,bounce:.2};for(let i=0;i<Math.round(.5/dt);i++)stepFragment(e,dt);return e;};const a=run(1/60),b=run(1/120);assert.ok(Math.abs(a.mesh.position.y-b.mesh.position.y)<1e-8);assert.ok(Math.abs(a.mesh.position.x-b.mesh.position.x)<1e-8);
 const hit=bounce=>{const e={mesh:{position:{x:0,y:.1,z:0}},vx:1,vy:-4,vz:0,gravity:9.81,bounce};assert.ok(stepFragment(e,.05));return e;};assert.ok(hit(.5).vy>hit(.1).vy);
});

test('firing against thin cover cannot spawn a round through the wall',()=>{
 const s=game();s.props=[{id:'thin',kind:'barrier',x:0,z:3.45,w:4,d:.1,health:999,maxHealth:999}];s.obstacles=s.props;const e=s.spawnEnemy('brute',0,4.5);s.fireWeapon('carbine',{x:0,z:10});s.updateBullets(.05);assert.equal(e.health,e.maxHealth);assert.ok(s.props[0].health<999);
});
