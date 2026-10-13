import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {THROWABLES,throwOrdnance,detonateThrowable} from '../src/rebuild/Throwables.js';
import {throwableMesh} from '../src/rebuild/ThrowableVisuals.js';
import {MELEE_KEYS} from '../src/rebuild/MeleeWeapons.js';
import {UPGRADES} from '../src/rebuild/Upgrades.js';
const game=()=>{const s=new Simulation({layout:{bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},cover:[],spawnPoints:[]}});s.start();s.toSpawn=999;s.spawnTimer=9999;s.player.x=0;s.player.z=0;return s;};
const enemy=(s,x=0,z=3)=>{const e=s.spawnEnemy('brute',x,z);e.health=e.maxHealth=10000;e.speed=0;return e;};
const charge=(key,extra={})=>({throwable:key,x:0,z:3,radius:THROWABLES[key].radius,damage:THROWABLES[key].damage,...extra});
test('all melee families are exclusive and receive melee rather than firearm upgrades',()=>{for(const key of MELEE_KEYS){const s=game();s.setLoadout([key,'carbine']);assert.deepEqual(s.player.equipped,[key]);assert.ok(UPGRADES.find(u=>u.id==='cuts').requires(s.player));assert.equal(UPGRADES.find(u=>u.id==='magazine').requires(s.player),false);assert.equal(UPGRADES.find(u=>u.id==='incendiary').requires(s.player),false);}});
test('spear thrusts have reach and a narrow cone; axes sweep; hammers demolish and stagger',()=>{
 const strike=(key)=>{const s=game();s.setLoadout([key]);const front=enemy(s,0,4.5),side=enemy(s,2,1);const crate={x:0,z:2,w:1,d:1,health:1000,kind:'barrier'};s.props=[crate];s.resolveSlice({weapon:key,combo:0,angle:0,variant:0});return {s,front,side,crate};};
 const spear=strike('spear');assert.ok(spear.front.health<10000);assert.equal(spear.side.health,10000);const axe=strike('axe');assert.equal(axe.front.health,10000);assert.ok(axe.side.health<10000);const hammer=strike('hammer');assert.ok(hammer.crate.health<axe.crate.health);const e=enemy(hammer.s,0,2);hammer.s.resolveSlice({weapon:'hammer',combo:2,angle:0,variant:0});assert.ok(e.slow>0);assert.ok(hammer.s.events.some(e=>e.type==='damage'&&e.kind==='melee'));
});
test('throwables share ammunition, reject overlapping throws and retain their type in flight',()=>{
 const s=game();s.player.throwable='molotov';assert.ok(throwOrdnance(s,{x:0,z:30}));assert.equal(s.player.grenades,2);assert.equal(s.hazards[0].z,10);s.player.throwable='shock';assert.equal(throwOrdnance(s,{x:0,z:3}),false);assert.equal(s.player.grenades,2);assert.equal(s.hazards[0].throwable,'molotov');s.player.throwAnimation=0;s.player.vehicleId='test';assert.equal(throwOrdnance(s),false);s.player.vehicleId=null;s.player.grenades=0;assert.equal(throwOrdnance(s),false);
});
test('fire bottles ignite foes and scenery, while frost quenches them and shock rewards wet targets',()=>{
 const s=game(),e=enemy(s),wood={x:1.5,z:3,w:1,d:1,health:100,kind:'crate'};s.props=[wood];detonateThrowable(s,charge('molotov'));assert.ok(e.burning>0);assert.ok(wood.burning>0);assert.ok(s.fires.length);detonateThrowable(s,charge('frost'));assert.equal(e.burning,0);assert.ok(e.chilled>0);assert.ok(e.wet>0);assert.equal(wood.burning,0);assert.equal(s.fires.length,0);const before=e.health;detonateThrowable(s,charge('shock'));assert.equal(before-e.health,135);assert.ok(e.electrified>0);assert.ok(s.events.some(e=>e.type==='arc'));
});
test('fire does not ignite water and elemental damage respects solid walls',()=>{
 const s=game(),e=enemy(s);s.layout.water=[{x:0,z:3,w:10,d:10}];detonateThrowable(s,charge('molotov'));assert.equal(s.fires.length,0);assert.ok(!e.burning);assert.ok(s.events.some(e=>e.type==='steam'));
 const dry=game(),behind=enemy(dry,0,5);dry.props=dry.obstacles=[{x:0,z:4,w:8,d:1,health:100,kind:'barrier'}];detonateThrowable(dry,charge('shock'));assert.equal(behind.health,10000);assert.ok(!behind.electrified);
});
test('all thrown models are distinct and simulation detonates each type exactly once',()=>{
 const fingerprints=[];for(const key of Object.keys(THROWABLES)){const model=throwableMesh(key);fingerprints.push(model.children.map(m=>[m.geometry.type,m.material.color.getHex(),m.position.y].join(':')).join('/'));assert.equal(model.userData.throwable,key);const s=game();s.player.throwable=key;throwOrdnance(s,{x:0,z:3});for(let i=0;i<75;i++)s.update(1/60,{auto:false});assert.equal(s.hazards.length,0);assert.equal(s.events.filter(e=>e.type===(key==='frag'?'explosion':'ordnance-burst')).length,1);}
 assert.equal(new Set(fingerprints).size,4);
});
