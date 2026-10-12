import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCity} from '../src/rebuild/City.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {makeStreetEvents} from '../src/rebuild/StreetEvents.js';
import {obscuresSurvivor} from '../src/rebuild/CityDetails.js';
import {characterVariant} from '../src/rebuild/CharacterDetails.js';
import {pointBlocked} from '../src/rebuild/config.js';
const setup=()=>{const s=new Simulation({seed:120,mode:'city'});s.start();s.toSpawn=999;s.spawnTimer=1e8;s.player.invulnerable=999;return s;};
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.update(.05,{auto:false});};
test('street encounters are seeded, separated and reachable on 40 city layouts',()=>{
 for(let seed=0;seed<40;seed++){const l=generateCity(seed),jobs=makeStreetEvents(l);assert.equal(jobs.length,3);assert.deepEqual(jobs,makeStreetEvents(l));assert.equal(new Set(jobs.map(j=>j.kind)).size,3);for(const job of jobs){assert.ok(!pointBlocked(job.x,job.z,2.5,[...l.cover,...l.buildings]));assert.ok(Math.hypot(job.x,job.z)>24);for(const other of jobs)if(job!==other)assert.ok(Math.hypot(job.x-other.x,job.z-other.z)>34);}}
 assert.deepEqual(makeStreetEvents({city:false}),[]);
});
test('relay requires cleared guards, uncontested time on foot, and rewards only once',()=>{
 const s=setup(),j=s.streetEvents.find(j=>j.kind==='relay');s.player.x=j.x;s.player.z=j.z;ticks(s,1);assert.equal(j.state,'active');assert.equal(j.guards.length,3);ticks(s,200);assert.equal(j.progress,0);
 for(const e of s.enemies)s.damageEnemy(e,9999);s.pause();ticks(s,200);assert.equal(j.progress,0);s.resume();const enemy=s.spawnEnemy('walker',j.x+2,j.z);enemy.speed=0;ticks(s,10);assert.equal(j.progress,0);s.damageEnemy(enemy,9999);const car=s.props.find(p=>p.driveable);car.x=j.x;car.z=j.z;s.player.vehicleId=car.id;ticks(s,1);assert.equal(j.progress,0);s.player.vehicleId=null;ticks(s,165);assert.equal(j.state,'complete');assert.equal(s.player.shield,40);const score=s.score;ticks(s,200);assert.equal(s.player.shield,40);assert.equal(s.score,score);
});
test('cache and enforcer have distinct guards and rewards; guards persist if player leaves',()=>{
 for(const kind of ['cache','hunt']){const s=setup(),j=s.streetEvents.find(j=>j.kind===kind);s.player.x=j.x;s.player.z=j.z;ticks(s,1);assert.equal(j.guards.length,kind==='hunt'?1:4);const guards=s.enemies.filter(e=>e.incidentId===j.id);if(kind==='hunt')assert.equal(guards[0].elite,true);const before=guards[0].health;s.player.x=100;s.player.z=-100;ticks(s,1);assert.equal(guards[0].health,before);s.player.x=j.x;s.player.z=j.z;for(const e of guards)s.damageEnemy(e,9999);s.player.grenades=0;s.player.magazines.carbine=0;ticks(s,1);assert.equal(j.state,'complete');if(kind==='cache'){assert.equal(s.player.grenades,3);assert.equal(s.player.magazines.carbine,24);}else assert.equal(s.player.maxHealth,115);}
});
test('city silhouettes vary and orthographic occlusion protects feet at roof edges',()=>{
 const l=generateCity(12);assert.equal(new Set(l.buildings.map(b=>b.style)).size,5);
 const p={x:0,z:0};assert.equal(obscuresSurvivor({x:10,z:12,w:12,d:12,h:12},p),true);assert.equal(obscuresSurvivor({x:-20,z:-20,w:10,d:10,h:12},p),false);assert.equal(obscuresSurvivor({x:26,z:32,w:2,d:2,h:5},p),false);
 assert.equal(new Set(Array.from({length:30},(_,i)=>characterVariant(i))).size,6);
});
