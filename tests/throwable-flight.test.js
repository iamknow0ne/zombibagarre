import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {throwOrdnance} from '../src/rebuild/Throwables.js';
import {advanceThrowable} from '../src/rebuild/ThrowableFlight.js';
import {grenadePosition} from '../src/rebuild/Effects.js';

const game=(props=[])=>{const s=new Simulation({layout:{bounds:{minX:-40,maxX:40,minZ:-40,maxZ:40},cover:[],spawnPoints:[]}});s.start();s.player.x=s.player.z=0;s.props=s.obstacles=props;s.toSpawn=999;s.spawnTimer=9999;s.events=[];return s;};
const wall=(extra={})=>({id:'wall',kind:'building',health:10000,maxHealth:10000,x:0,z:4,w:10,d:.2,h:8,...extra});
const throwAt=(s,key='frag',z=10)=>{s.player.throwable=key;assert.ok(throwOrdnance(s,{x:0,z}));return s.hazards.at(-1);};
const tick=(s,seconds)=>{for(let i=0;i<seconds*120;i++)s.update(1/120,{auto:false});};

test('all canisters strike tall scenery, rebound, and detonate on the near side instead of beyond it',()=>{
 for(const key of ['frag','frost','shock']){const s=game([wall()]),h=throwAt(s,key);tick(s,.35);assert.equal(h.contact?.id,'wall');assert.ok(h.projectile.z<3.8);assert.ok(h.projectile.vz<0);assert.deepEqual(grenadePosition(h),{x:h.projectile.x,y:h.projectile.y,z:h.projectile.z});assert.ok(h.timer>0);tick(s,1);const e=s.events.find(e=>e.type===(key==='frag'?'explosion':'ordnance-burst'));assert.ok(e&&e.z<3.8,key);assert.ok(Number.isFinite(e.y));assert.equal(s.hazards.length,0);}
});

test('fire bottle breaks at its first wall contact and burns the impacted surface, not the ground behind it',()=>{
 const building=wall({material:'wood'}),s=game([building]),h=throwAt(s,'molotov');tick(s,.35);const burst=s.events.find(e=>e.type==='ordnance-burst');assert.ok(burst);assert.ok(Math.abs(burst.z-3.777)<.01);assert.ok(burst.y>2);assert.ok(building.surfaces.some(c=>c.burning>0));assert.equal(s.fires.length,0);assert.equal(s.hazards.length,0);assert.equal(h.timer<0,true);
});

test('the normal throw arc clears low cover and a facade collision cannot tunnel at high velocity',()=>{
 const s=game([wall({h:.7})]),h=throwAt(s);tick(s,.7);assert.ok(h.projectile.z>9.8);assert.notEqual(h.contact?.id,'wall');assert.ok(h.projectile.y<.5);
 const fast=game([wall({d:.02})]),f=throwAt(fast);f.projectile.vz=500;advanceThrowable(fast,f,.05);assert.equal(f.contact.id,'wall');assert.ok(f.projectile.z<4);assert.ok(f.projectile.vz<0);
});

test('launching close to a source wall still catches the first swept contact',()=>{
 const s=game([wall({z:.6,d:.2})]),h=throwAt(s);advanceThrowable(s,h,.05);assert.equal(h.contact.id,'wall');assert.ok(h.projectile.z<.38);assert.ok(h.projectile.vz<0);
});

test('water catches falling ordnance but a high roof above water does not splash',()=>{
 const water=game();water.layout.water=[{x:0,z:10,w:12,d:6}];water.layout.bridges=[];const h=throwAt(water,'molotov');tick(water,.75);assert.ok(h.projectile.splashed);assert.ok(water.events.some(e=>e.type==='steam'));assert.equal(water.fires.length,0);
 const roof=game([wall({z:7,w:10,d:6,h:1.6})]);roof.layout.water=[{x:0,z:7,w:12,d:8}];roof.layout.bridges=[];throwAt(roof,'molotov');tick(roof,.75);const e=roof.events.find(e=>e.type==='ordnance-burst');assert.ok(e?.y>1.6);assert.ok(!roof.events.some(e=>e.type==='splash'||e.type==='steam'));assert.equal(roof.fires.length,0);
});

test('destroyed scenery stops blocking throws and no-hit flight remains stable across frame sizes',()=>{
 const run=dt=>{const s=game([wall({health:0})]),h=throwAt(s);for(let t=0;t<.5-1e-8;t+=dt)advanceThrowable(s,h,dt);return h.projectile;};
 const a=run(1/30),b=run(1/120);assert.ok(Math.abs(a.x-b.x)<1e-8&&Math.abs(a.y-b.y)<1e-8&&Math.abs(a.z-b.z)<1e-8);assert.ok(a.z>7.5);
});
