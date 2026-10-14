import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
const layout=()=>({cover:[{kind:'platform',x:0,z:0,w:3.6,d:2.8,h:1.1,maxHealth:600,traversalSupport:true}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[{id:'anchor',supportId:'prop-0',x:0,y:3.2,z:0,label:'SERVICE DECK'}],reward:{x:0,y:1.1,z:0,supportId:'prop-0'}}});
const game=()=>{const s=new Simulation({layout:layout()});s.start();s.toSpawn=999;s.spawnTimer=1e6;return s;};
const step=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('campaign jump preserves RPG running speed, aim and independent dodge',()=>{
 const s=game();s.player.x=8;s.player.speed=7;const before=s.player.x;step(s,60,{x:1});assert.ok(Math.abs(s.player.x-before-7)<.01);
 s.player.x=8;s.player.angle=1.2;s.update(1/60,{jump:true,auto:false});let highest=0;for(let i=0;i<90;i++){s.update(1/60,{auto:false});highest=Math.max(highest,s.player.y);}assert.ok(highest>1.7&&highest<1.9);assert.equal(s.player.y,0);assert.equal(s.player.angle,1.2);
 s.update(1/60,{dash:true,x:1,auto:false});assert.ok(s.player.dash>0);assert.equal(s.player.y,0);assert.ok(s.player.moveX>20);
});
test('jump clears exact service platform and can fire from its actual height',()=>{
 const s=game();s.update(1/60,{jump:true,z:-1,auto:false});step(s,43,{z:-1});step(s,25);assert.equal(s.player.supportId,'prop-0');assert.equal(s.player.y,1.1);
 s.fireWeapon('carbine',{x:4,y:1.8,z:0});assert.ok(Math.abs(s.bullets.at(-1).y-2.2)<1e-8);assert.ok(s.bullets.at(-1).vy<0);
});
test('grapple reels onto live support, rewards once, and support destruction releases a swept fall',()=>{
 const s=game();s.player.z=6;s.update(1/60,{auto:false});assert.equal(s.traversalTarget.available,true);
 s.update(1/60,{grapple:true,auto:false});assert.ok(s.player.grapple);step(s,210);assert.equal(s.player.supportId,'prop-0');assert.equal(s.player.y,1.1);assert.equal(s.traversalRewardClaimed,true);const grenades=s.player.grenades;step(s,120);assert.equal(s.player.grenades,grenades);
 s.damageProp(s.props[0],1000);step(s,60);assert.equal(s.player.y,0);assert.equal(s.player.supportId,null);assert.equal(s.player.grapple,null);
});
test('manual grapple release preserves position and destroyed anchor is never reacquired',()=>{
 const s=game();s.player.z=6;s.update(1/60,{grapple:true,auto:false});step(s,18);const y=s.player.y,z=s.player.z;s.update(1/60,{grapple:true,auto:false});assert.equal(s.player.grapple,null);assert.ok(Math.abs(s.player.y-y)<.4&&Math.abs(s.player.z-z)<.4);
 s.damageProp(s.props[0],1000);step(s,60);s.update(1/60,{grapple:true,auto:false});assert.equal(s.player.grapple,null);assert.equal(s.traversalTarget.available,false);
});
test('pausing freezes airborne movement and city boundary checks do not teleport across canals',()=>{
 const s=game();s.player.x=7;s.update(1/60,{jump:true,auto:false});s.pause();const before={x:s.player.x,y:s.player.y,z:s.player.z};step(s,90,{x:1});assert.deepEqual({x:s.player.x,y:s.player.y,z:s.player.z},before);s.resume();step(s,90);assert.equal(s.player.y,0);
 const l=layout();l.city=true;l.boundary=[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}];l.water=[{x:8,z:3,w:3,d:12,shape:'rectangle'}];l.buildings=[];l.spawnPoints=[];l.landmarks=[];l.mapSeed=1;const water=new Simulation({layout:l});water.start();water.toSpawn=999;water.spawnTimer=1e6;water.player.x=5;water.update(1/60,{jump:true,x:1,auto:false});step(water,90,{x:1});assert.ok(water.player.x<6.5);
});

test('campaign descending edge lands above solid support and retains elevated bullet origin',()=>{
 const s=game(),box=s.props[0],p=s.player;Object.assign(p,{x:box.x+box.w/2+.1,y:box.h+.1,z:box.z,vy:-5,grounded:false,coyote:0});
 for(let i=0;i<32;i++){s.update(1/120,{x:-1,auto:false});assert.ok(!(p.y<box.h-.001&&Math.abs(p.x-box.x)<box.w/2+p.radius-.001&&Math.abs(p.z-box.z)<box.d/2+p.radius-.001));}
 assert.equal(p.grounded,true);assert.equal(p.supportId,box.id);assert.equal(p.y,box.h);assert.equal(p.supportY,box.h);
 s.fireWeapon('carbine',{x:7,y:1.1,z:0});assert.ok(Math.abs(s.bullets.at(-1).y-(box.h+1.1))<1e-8);
 s.pause();const position={x:p.x,y:p.y,z:p.z};step(s,20,{x:1,jump:true});assert.deepEqual({x:p.x,y:p.y,z:p.z},position);s.resume();step(s,90,{x:1});assert.equal(p.y,0);assert.equal(p.supportId,null);assert.equal(p.supportY,0);
});


test('blocked full-body grapple returns campaign movement and firing without another release input',()=>{
 const l={cover:[{kind:'platform',x:0,z:8,w:2,d:2,h:.3},{kind:'platform',x:0,y:2.15,z:4,w:4,d:12,h:.5}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[{id:'low-anchor',supportId:'prop-0',x:0,y:2,z:8}]}};
 const s=new Simulation({layout:l});s.start();s.toSpawn=999;s.spawnTimer=1e6;Object.assign(s.player,{x:0,z:0});
 s.update(1/60,{grapple:true,auto:false});assert.ok(s.player.grapple);
 step(s,180);assert.equal(s.player.grapple,null);assert.equal(s.player.grounded,true);assert.equal(s.player.y,.3);
 const shots=s.player.shotCounts.carbine||0;
 s.update(1/60,{firing:true,aim:{x:0,y:1.4,z:15},auto:false});
 assert.ok(s.player.shotCounts.carbine>shots,'the stuck grapple no longer blocks the equipped weapon');
});

test('campaign jump approaching a raised canopy keeps the hero outside its underside',()=>{
 const l={cover:[{kind:'platform',x:0,z:0,w:4,d:3,y:2.7,h:.4}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[]}};
 const s=new Simulation({layout:l});s.start();s.toSpawn=999;s.spawnTimer=1e6;
 const p=s.player;Object.assign(p,{x:0,y:.805,z:2.12,grounded:false,coyote:0,vy:4.2,vz:-6.2,speed:6.2});
 for(let i=0;i<120;i++){
  s.update(1/120,{z:-1,auto:false});
  if(Math.abs(p.x)<2+p.radius-.001&&Math.abs(p.z)<1.5+p.radius-.001)assert.ok(p.y+1.75<=2.701||p.y>=3.099,'head entered the canopy collision volume');
 }
 assert.equal(p.grounded,true);assert.equal(p.y,0);assert.equal(p.supportY,0);assert.ok(p.z<1.5,'hero can continue under cover after descending');
});
