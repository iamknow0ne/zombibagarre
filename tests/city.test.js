import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {insideMap,isConnected,segmentInMap} from '../src/rebuild/Map.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {DEBRIS,deathMotion} from '../src/rebuild/Effects.js';
import {distance,pointBlocked} from '../src/rebuild/config.js';
const city=()=>{const s=new Simulation({seed:140,mode:'city'});s.start('katana');s.toSpawn=999;s.spawnTimer=1e8;return s;};
const step=(s,n,input)=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('open city generation has connected streets, safe spawn, canal crossings and persistent buildings',()=>{
 assert.deepEqual(generateCity(31),generateCity(31));assert.notDeepEqual(generateCity(31).buildings,generateCity(32).buildings);
 for(let seed=0;seed<4;seed++){const m=generateCity(seed);assert.ok(m.buildings.length>=20);assert.ok(m.cover.filter(p=>p.driveable).length>=10);assert.ok(m.bounds.maxX-m.bounds.minX>200);assert.ok(isConnected(m.buildings,1.1,m));assert.ok(!pointBlocked(0,3,1,m.buildings));}
 const s=city(),layout=s.layout,b=s.props.find(p=>p.kind==='building');s.damageProp(b,300);const hp=b.health;s.wave=4;s.nextWave();assert.equal(s.layout,layout);assert.equal(s.props.find(p=>p.id===b.id).health,hp);assert.equal(s.district,1);
 assert.equal(waterAt(layout,48,0),true);assert.equal(insideMap(layout,48,0),false);assert.equal(insideMap(layout,48,32,1.3),true);assert.equal(segmentInMap(layout,{x:35,z:32},{x:65,z:32},1.3),true);assert.equal(segmentInMap(layout,{x:35,z:0},{x:65,z:0},.4),false);
});
test('vehicles enter, accelerate, brake, ram and exit onto safe ground',()=>{
 const s=city();assert.equal(s.interactVehicle(),true);const v=s.props.find(p=>p.id===s.player.vehicleId),origin={x:v.x,z:v.z};
 const enemy=s.spawnEnemy('walker',3,13);enemy.speed=0;step(s,100,{x:0,z:1});assert.ok(distance(origin,s.player)>8);assert.ok(s.kills>=1);assert.ok(v.speed>10);
 step(s,70,{brake:true});assert.equal(v.speed,0);assert.equal(s.interactVehicle(),true);assert.equal(s.player.vehicleId,null);assert.ok(!pointBlocked(s.player.x,s.player.z,s.player.radius,s.obstacles));
});
test('vehicles cannot drive through a building and water immersion ejects the survivor',()=>{
 const wallRun=city();wallRun.interactVehicle();const car=wallRun.props.find(p=>p.id===wallRun.player.vehicleId),wall=wallRun.props.find(p=>p.kind==='building');wallRun.player.x=car.x=wall.x;wallRun.player.z=car.z=wall.z-wall.d/2-5;car.angle=0;car.speed=18;step(wallRun,90,{x:0,z:1});assert.ok(wallRun.player.z<wall.z-wall.d/2);assert.ok(car.health<car.maxHealth);
 const s=city();s.interactVehicle();const v=s.props.find(p=>p.id===s.player.vehicleId);s.player.x=v.x=36;s.player.z=v.z=0;v.angle=Math.PI/2;v.speed=18;
 step(s,80,{x:1,z:0});assert.equal(s.player.vehicleId,null);assert.ok(v.sunk);assert.equal(v.health<=0,true);assert.ok(insideMap(s.layout,s.player.x,s.player.z,.4));assert.ok(s.events.some(e=>e.type==='splash'));
});
test('water shots and explosions produce splashes without igniting the canal',()=>{
 const s=city();s.player.x=39;s.player.z=7;s.switchWeapon('carbine');step(s,30,{firing:true,aim:{x:48,z:7}});assert.ok(s.events.some(e=>e.type==='splash'));
 s.blast(48,7,4.3,180);assert.ok(s.events.some(e=>e.type==='explosion'&&e.water));s.addFire(48,7);assert.equal(s.fires.length,0);
});
test('swords have directional combos, sever limbs, damage timber and require no ammunition',()=>{
 const s=city();s.props=[];s.obstacles=[];s.player.x=0;s.player.z=0;const front=s.spawnEnemy('brute',0,2),back=s.spawnEnemy('brute',0,-2);front.speed=back.speed=0;
 s.switchWeapon('katana');s.slice('katana',{x:0,z:3});assert.equal(front.health,front.maxHealth);step(s,14);assert.ok(front.health<front.maxHealth);assert.equal(back.health,back.maxHealth);const first=front.health;
 step(s,28);s.slice('katana',{x:0,z:3});step(s,42);s.slice('katana',{x:0,z:3});step(s,17);assert.equal(s.player.swingCombo,2);assert.ok(front.health<first);assert.equal(s.player.magazines.katana,1);assert.ok(s.events.some(e=>e.type==='kill'&&e.death==='sliced'));
 const box={id:'test',x:0,z:2,w:1,d:1,kind:'crate',health:100,maxHealth:100};s.props=[box];s.obstacles=s.props;step(s,60);s.switchWeapon('dual');s.slice('dual',{x:0,z:3});step(s,7);assert.ok(box.health<=0);
});
test('repeated deaths select varied poses and debris profiles distinguish materials',()=>{
 const s=city(),variants=new Set();for(let i=0;i<60;i++){const e=s.spawnEnemy('walker',0,0);s.damageEnemy(e,999,1,0,{kind:'ballistic'});variants.add(s.events.findLast(e=>e.type==='kill').variant);}assert.equal(variants.size,6);assert.notDeepEqual(deathMotion(0),deathMotion(3));assert.ok(DEBRIS.wood.stretch>DEBRIS.brick.stretch);assert.ok(DEBRIS.metal.metalness>.5);assert.ok(DEBRIS.glass.max<DEBRIS.concrete.max);
});


test('city enemies route around whole blocks without stalling at coarse-grid corners',()=>{
 const s=new Simulation({seed:2026,mode:'city'});s.start();s.toSpawn=999;s.spawnTimer=1e8;s.player.x=-13.1479;s.player.z=3.0597;s.player.invulnerable=999;
 for(const x of [-9,9])s.spawnEnemy('walker',x,-31);
 for(let i=0;i<1800&&s.enemies.some(e=>distance(e,s.player)>3);i++)s.update(.05,{auto:false});
 assert.ok(s.enemies.every(e=>distance(e,s.player)<3),JSON.stringify(s.enemies.map(e=>[e.x,e.z])));
});
