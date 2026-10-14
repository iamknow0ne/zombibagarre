import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
const game=(weapon='katana')=>{const layout={cover:[{kind:'platform',x:0,z:0,w:3.6,d:2.8,h:1.1,maxHealth:600,traversalSupport:true}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[{id:'anchor',supportId:'prop-0',x:0,y:3.2,z:0}],reward:{x:0,y:1.1,z:0,supportId:'prop-0'}}};const s=new Simulation({layout});s.start(weapon);s.toSpawn=999;s.spawnTimer=1e6;s.player.invulnerable=999;return s;};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/120,{auto:false,...input});};
test('starting another expedition resets selected anchor and permits its cache exactly once again',()=>{
 const s=game('carbine');s.update(1/120,{auto:false,grapple:true});tick(s,480);assert.equal(s.traversalRewardClaimed,true);s.traversalTarget={id:'old-anchor'};
 s.start('carbine');s.toSpawn=999;s.spawnTimer=1e6;assert.equal(s.traversalRewardClaimed,false);assert.equal(s.traversalTarget,null);const before=s.player.grenades;
 s.update(1/120,{auto:false,grapple:true});tick(s,480);assert.equal(s.traversalRewardClaimed,true);assert.equal(s.player.grenades,before+2);tick(s,240);assert.equal(s.player.grenades,before+2);
});
test('grapple attachment cancels a pending melee contact and its buffered follow-up',()=>{
 const s=game();s.player.z=6;const e=s.spawnEnemy('walker',.5,5);e.health=e.maxHealth=10000;e.speed=0;
 assert.equal(s.slice('katana',e),true);s.player.meleeBuffer={until:s.time+1,aim:e};s.events=[];
 s.update(1/120,{auto:false,grapple:true});assert.ok(s.player.grapple);assert.equal(s.player.meleeAttack,null);assert.equal(s.player.meleeBuffer,null);assert.equal(s.player.swing,0);assert.equal(s.player.swingWeapon,null);
 tick(s,50);assert.ok(!s.events.some(e=>e.type==='slice'));assert.equal(e.health,10000);
});
test('held or newly pressed melee cannot buffer a strike while the cable is pulling',()=>{
 const s=game();s.player.z=8;s.update(1/120,{auto:false,grapple:true});assert.ok(s.player.grapple);s.player.weaponTimers.katana=.1;
 s.update(1/120,{auto:false,melee:true,aim:{x:0,z:0}});assert.equal(s.player.meleeAttack,null);assert.equal(s.player.meleeBuffer,null);assert.equal(s.slice('katana',{x:0,z:0}),false);
 // A fresh attack after release remains a normal action, rather than replaying
 // an attack pressed while both hands were occupied by traversal.
 s.update(1/120,{auto:false,grapple:true});assert.equal(s.player.grapple,null);tick(s,20);assert.equal(s.player.meleeAttack,null);assert.equal(s.slice('katana',{x:0,z:0}),true);
});
test('a blocked grapple attempt does not cancel a legitimate ground swing',()=>{
 const s=game();s.player.x=19;s.player.z=19;assert.equal(s.slice('katana',{x:18,z:19}),true);const attack=s.player.meleeAttack;s.update(1/120,{auto:false,grapple:true});assert.equal(s.player.grapple,null);assert.equal(s.player.meleeAttack,attack);
});
