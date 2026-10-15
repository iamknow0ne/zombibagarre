import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';

function game(){
 const s=new Simulation({layout:{bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},cover:[],spawnPoints:[],water:[],bridges:[]}});
 s.start();Object.assign(s.player,{x:0,y:0,z:0,invulnerable:0});s.enemies=[];s.toSpawn=999;s.spawnTimer=9999;s.random=()=>.5;s.weather=null;s.events=[];return s;
}
function target(s,y,z=1,type='walker'){
 const e=s.spawnEnemy(type,0,z);Object.assign(e,{y,health:10000,maxHealth:10000,speed:0});return e;
}
function serviceRoof(){
 const s=new Simulation({seed:73,mode:'city',profile:{}});s.start();s.toSpawn=999;s.spawnTimer=1e6;s.enemies=[];
 const roof=s.layout.traversal.roofs[0];Object.assign(s.player,{...roof.approach,y:0,grounded:true,supportId:null,grapple:null,grappleCooldown:0,vx:0,vz:0});
 s.update(1/120,{grapple:true,auto:false});
 for(let i=0;i<900&&!(s.player.grounded&&s.player.supportId===roof.anchor.supportId);i++)s.update(1/120,{auto:false});
 assert.equal(s.player.y,roof.top);assert.equal(s.player.supportId,roof.anchor.supportId);s.events=[];return {s,roof};
}

test('a real service-roof landing keeps swing, hammer impact and signature wave at the hero feet height',()=>{
 const {s,roof}=serviceRoof();s.player.mastery.hammer=8000;
 const hvac=roof.parts.find(p=>p.role==='hvac');Object.assign(s.player,{x:hvac.x+1.4,z:hvac.z,angle:-Math.PI/2});
 assert.equal(s.slice('hammer',{x:hvac.x,z:hvac.z}),true);
 s.resolveSlice({weapon:'hammer',angle:-Math.PI/2,combo:2,variant:0});
 for(const type of ['swing','slice','cut-wave']){
  const event=s.events.find(e=>e.type===type);assert.ok(event,type);assert.equal(event.baseY,roof.top,type);assert.equal(event.x,s.player.x);assert.equal(event.z,s.player.z);
 }
 assert.ok(s.events.find(e=>e.type==='slice').hits>0,'hammer actually hits the roof HVAC');
 assert.ok(s.events.find(e=>e.type==='prop-hit').y>=roof.top,'contact height remains an absolute world height');
});

test('ordinary ground melee FX retain explicit zero base height',()=>{
 const s=game();s.player.mastery.katana=8000;s.slice('katana',{x:0,z:2});s.resolveSlice({weapon:'katana',angle:0,combo:2,variant:0});
 for(const type of ['swing','slice','cut-wave'])assert.equal(s.events.find(e=>e.type===type).baseY,0);
});

test('damage, maiming and death preserve each victim height including enemy-sourced drops',()=>{
 for(const y of [undefined,6.25]){
  const s=game(),e=target(s,y);s.damageEnemy(e,20,0,1,{kind:'slice',weapon:'katana',part:'legs'});
  assert.equal(e.crawling,true);assert.equal(s.events.find(e=>e.type==='dismember').baseY,y||0);assert.equal(s.events.find(e=>e.type==='hit').baseY,y||0);
  assert.equal(s.events.find(e=>e.type==='damage').y,y||0);
  s.kills=3;s.damageEnemy(e,1e6,0,1,{kind:'ballistic',weapon:'carbine',headshot:true});
  assert.equal(s.events.find(e=>e.type==='kill').baseY,y||0);assert.equal(s.pickups.length,1);assert.equal(s.pickups[0].y,y||0);
 }
});

test('arm loss has the same base-height convention as leg loss',()=>{
 const s=game(),e=target(s,4.5);s.damageEnemy(e,20,0,1,{kind:'ballistic',weapon:'carbine',part:'arm'});
 assert.equal(e.missingArm,true);assert.equal(s.events.find(e=>e.type==='dismember').part,'arm');assert.equal(s.events.find(e=>e.type==='dismember').baseY,4.5);
});

test('relic ignition and electrical hit events follow victim height, while arc endpoints stay absolute',()=>{
 const s=game();s.player.y=5;s.player.rpgRelic={base:'carbine',burn:2};const e=target(s,5,3);
 s.damageEnemy(e,10,0,1,{kind:'ballistic',weapon:'carbine'});assert.equal(s.events.find(e=>e.type==='ignite').baseY,5);
 s.arcAttack(e,{range:12,chain:0,damage:10,tier:0});
 assert.equal(s.events.find(e=>e.type==='electrify').baseY,5);
 const arc=s.events.find(e=>e.type==='arc');assert.equal(arc.y,6.1);assert.ok(arc.toY>5&&arc.toY<7);
});

test('contact fire spreads at the recipient height without reaching a different floor',()=>{
 const s=game(),burning=target(s,5,3),adjacent=target(s,5,3.5),ground=target(s,0,3.5);burning.burning=2;burning.burnWeapon='flame';
 s.updateEnemies(.01);assert.ok(adjacent.burning>0);assert.ok(!(ground.burning>0));
 const fire=s.events.find(e=>e.type==='ignite');assert.equal(fire.baseY,5);assert.equal(fire.z,3.5);
 s.addFire(20,20);assert.equal(s.events.filter(e=>e.type==='ignite').at(-1).baseY,0,'ground fire stays ground based');
});

test('an elevated nova pickup detonates at the hero height and cannot damage a distant street floor',()=>{
 const s=game();s.player.y=14;const above=target(s,14,0),street=target(s,0,0);
 s.pickups=[{id:400,x:0,y:14,z:0,type:'nova',life:10},{id:401,x:0,y:0,z:0,type:'ammo',life:10}];
 s.update(.01,{auto:false});
 assert.ok(above.health<10000);assert.equal(street.health,10000);assert.equal(s.events.find(e=>e.type==='explosion').y,14);
 assert.deepEqual(s.pickups.map(p=>p.id),[401],'street pickup is not collected through the roof');
});

test('a ground nova keeps its original contact behaviour',()=>{
 const s=game(),street=target(s,0,0),above=target(s,14,0);s.collect('nova');
 assert.ok(street.health<10000);assert.equal(above.health,10000);assert.equal(s.events.find(e=>e.type==='explosion').y,0);
});

test('mastery evolution retains its UI position and gives actor effects an explicit base height',()=>{
 const {s,roof}=serviceRoof();s.earnMastery('carbine',1000);const event=s.events.find(e=>e.type==='evolution');
 assert.equal(event.tier,1);assert.equal(event.y,roof.top);assert.equal(event.baseY,roof.top);
});

const round=extra=>({id:9001,x:0,y:1,z:0,vx:0,vy:0,vz:30,life:1,damage:10,hitIds:[],weapon:'carbine',tier:0,...extra});
test('glancing ricochet reports the real elevated bullet contact, not a ground spark',()=>{
 const s=game();s.props=s.obstacles=[{id:'wall',kind:'barrier',x:1,y:5,z:2,w:.2,d:8,h:2,health:999,maxHealth:999}];
 s.bullets=[round({y:6,weapon:'smg',vx:20,vz:60,ricochets:1})];s.updateBullets(.05);
 assert.equal(s.bullets.length,1);assert.ok(s.bullets[0].vx<0);assert.equal(s.events.find(e=>e.type==='ricochet').y,6);
});

test('thermal shock triggered by a real bullet stays on the struck enemy floor',()=>{
 const s=game();s.player.frost=1;const e=target(s,8,2),street=target(s,0,2);e.burning=3;e.slow=1;
 s.bullets=[round({y:9})];s.updateBullets(.1);
 assert.ok(e.health<9990,'bullet and thermal blast both deal damage');assert.equal(street.health,10000);
 const blast=s.events.find(e=>e.type==='explosion');assert.equal(blast.source,'thermal');assert.equal(blast.y,8);
});

test('signature flame never creates a street fire pool below an elevated victim',()=>{
 for(const y of [0,8]){
  const s=game();s.time=1;target(s,y,2);s.bullets=[round({y:y+1,weapon:'flame',tier:3,burn:2})];s.updateBullets(.1);
  assert.equal(s.fires.length,y===0?1:0);
  if(y===0)assert.equal(s.events.find(e=>e.type==='ignite').baseY,0);
 }
});
test('molotov ignition carries the victim elevation',async()=>{
 const {detonateThrowable}=await import('../src/rebuild/Throwables.js');const s=game(),e=target(s,6);
 detonateThrowable(s,{throwable:'molotov',x:0,y:7,z:0,radius:3.5,damage:45});
 assert.ok(e.burning>0);assert.equal(s.events.find(event=>event.type==='ignite').baseY,6);
});
