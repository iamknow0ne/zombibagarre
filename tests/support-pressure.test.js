import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
const game=()=>{const s=new Simulation({layout:{cover:[{kind:'platform',x:0,z:0,w:3.6,d:2.8,h:1.1,maxHealth:600,traversalSupport:true}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[],reward:null}}});s.start();s.toSpawn=999;s.spawnTimer=1e6;Object.assign(s.player,{x:0,z:0,y:1.1,supportId:'prop-0',grounded:true,invulnerable:999});s.events=[];return s;};
const tick=(s,n)=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false});};
test('a walker stranded at the service deck edge winds up, erodes the support and forces a fall',()=>{
 const s=game(),platform=s.props[0],e=s.spawnEnemy('walker',0,2.087);e.speed=0;e.attack=0;s.update(1/60,{auto:false});assert.equal(platform.health,600);assert.ok(e.windup>0);assert.equal(e.supportTargetId,platform.id);
 tick(s,40);assert.ok(platform.health<600);assert.ok(platform.health>0);assert.equal(s.player.y,1.1);assert.equal(s.player.health,100);assert.ok(s.events.some(e=>e.type==='prop-hit'&&e.id===platform.id));
 tick(s,2200);assert.ok(platform.health<=0);assert.equal(s.player.y,0);assert.equal(s.player.supportId,null);assert.ok(s.events.some(e=>e.type==='destroy'&&e.id===platform.id));
});
test('runner and brute bashes respect their windups and use their own damage strength',()=>{
 const losses={};for(const type of ['runner','brute']){const s=game(),e=s.spawnEnemy(type,0,2.3);e.speed=0;e.attack=0;s.update(1/60,{auto:false});assert.ok(e.windup>0);assert.equal(s.props[0].health,600);tick(s,50);losses[type]=600-s.props[0].health;assert.equal(losses[type],e.damage*2.5);}assert.ok(losses.brute>losses.runner);
});
test('distant, unmarked, absent and vertically separated supports are never bashed',()=>{
 for(const variation of ['distant','ordinary','absent','raised']){const s=game(),platform=s.props[0],e=s.spawnEnemy('walker',0,variation==='distant'?8:2.087);e.speed=0;e.attack=0;if(variation==='ordinary')platform.traversalSupport=false;if(variation==='absent')s.player.supportId=null;if(variation==='raised'){platform.y=8;s.player.y=9.1;}
  // Call AI directly so each invalid-support state stays fixed during the test.
  for(let i=0;i<180;i++)s.updateEnemies(1/60);assert.equal(platform.health,600,variation);assert.ok(!e.supportTargetId,variation);
 }
});
test('a wall between a monster and support blocks its bash even within arm reach',()=>{
 const s=game(),e=s.spawnEnemy('walker',0,2.5);e.speed=0;e.attack=0;s.props.push({id:'wall',kind:'barrier',x:0,z:1.9,w:4,d:.15,h:3,health:100});s.obstacles=s.props;
 for(let i=0;i<180;i++)s.updateEnemies(1/60);assert.equal(s.props[0].health,600);assert.ok(!e.supportTargetId);
});
test('leaving the platform during windup cancels that bash instead of hitting an unrelated target',()=>{
 const s=game(),e=s.spawnEnemy('walker',0,2.087);e.speed=0;e.attack=0;s.updateEnemies(.01);assert.equal(e.supportTargetId,'prop-0');Object.assign(s.player,{x:8,y:0,z:8,supportId:null,grounded:true});for(let i=0;i<60;i++)s.updateEnemies(1/60);assert.equal(s.props[0].health,600);assert.equal(e.supportTargetId,null);
});
test('ordinary ground contact still damages the player without damaging nearby platforms',()=>{
 const s=game();Object.assign(s.player,{x:8,y:0,z:8,supportId:null,invulnerable:0});const e=s.spawnEnemy('walker',8,8.7);e.speed=0;e.attack=0;tick(s,70);assert.ok(s.player.health<100);assert.equal(s.props[0].health,600);
});
test('seed73 city walkers approach an occupied gantry and break the farming refuge',()=>{
 const s=new Simulation({seed:73,mode:'city'});s.start();s.toSpawn=999;s.spawnTimer=1e6;const platform=s.props.find(p=>p.traversalSupport);
 Object.assign(s.player,{x:platform.x,y:platform.h,z:platform.z,grounded:true,supportId:platform.id,invulnerable:999});
 const e=s.spawnEnemy('walker',platform.x,platform.z+platform.d/2+3);tick(s,600);assert.ok(platform.health<platform.maxHealth);assert.ok(e.health>0);assert.equal(s.player.supportId,platform.id);
 tick(s,2400);assert.ok(platform.health<=0);assert.equal(s.player.supportId,null);assert.equal(s.player.y,0);
});
