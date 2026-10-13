import test from 'node:test';
import assert from 'node:assert/strict';
import {boxHit3D,bodyHit3D,perspectiveTarget} from '../src/rebuild/Ballistics.js';
import {Simulation} from '../src/rebuild/Simulation.js';
const prop={kind:'crate',x:0,z:5,w:2,d:2,h:1.5,health:100};
const body={id:1,x:0,z:8,radius:.5,health:100};
test('height-aware rays stop on cover and body volumes, including vertical entries',()=>{
 assert.equal(boxHit3D({x:0,y:2,z:0},{x:0,y:2,z:10},prop),null);
 assert.equal(boxHit3D({x:0,y:1,z:0},{x:0,y:1,z:10},prop),.4);
 assert.equal(boxHit3D({x:0,y:5,z:5},{x:0,y:0,z:5},prop),.7);
 assert.equal(bodyHit3D({x:0,y:3,z:0},{x:0,y:3,z:10},body),null);
 assert.ok(bodyHit3D({x:0,y:1.6,z:0},{x:0,y:1.6,z:10},body)>.7);
 assert.ok(bodyHit3D({x:0,y:3,z:8},{x:0,y:0,z:8},body)>0);
});
test('crosshair resolves nearest geometry, ground and sky without acquiring hidden enemies',()=>{
 const origin={x:0,y:1.55,z:0};
 assert.equal(perspectiveTarget(origin,0,0,[{...prop,h:4}],[body]).targetId,null);
 assert.equal(perspectiveTarget(origin,0,0,[prop],[body]).targetId,1);
 const up=perspectiveTarget(origin,0,-.5,[],[body]);assert.ok(up.y>30);assert.equal(up.targetId,null);
 const down=perspectiveTarget(origin,0,.5,[],[body]);assert.ok(Math.abs(down.y-.08)<1e-8);
});
const game=()=>{const s=new Simulation({seed:21});s.start('marksman');s.props=[];s.obstacles=[];s.player.x=0;s.player.z=0;s.random=()=>.5;return s;};
function shoot(s,y){s.fireWeapon('marksman',{x:0,y,z:8,perspective:true});for(let n=0;n<30;n++)s.updateBullets(1/120);}
test('manual headshots use actual height, while aiming above a monster misses',()=>{
 const damage=[];for(const y of [1,1.65,4]){const s=game(),e=s.spawnEnemy('walker',0,8);e.health=e.maxHealth=10000;shoot(s,y);damage.push(10000-e.health);if(y===1.65)assert.ok(s.events.some(e=>e.type==='damage'&&e.headshot));}
 assert.ok(damage[0]>0);assert.ok(Math.abs(damage[1]/damage[0]-1.65)<.001);assert.equal(damage[2],0);
});
test('a low wall can be shot over but taller cover receives the round',()=>{
 for(const h of [.6,3]){const s=game(),e=s.spawnEnemy('walker',0,8);e.health=e.maxHealth=10000;const wall={...prop,h,health:10000};s.props=s.obstacles=[wall];shoot(s,1.65);assert.equal(e.health<10000,h<1);assert.equal(wall.health<10000,h>1);if(h>1)assert.ok(s.events.find(e=>e.type==='prop-hit').y>1.1);}
});
test('perspective rounds cross water in the air, descending rounds splash on contact',()=>{
 const s=game();s.layout.water=[{x:0,z:5,w:10,d:10}];s.layout.bridges=[];
 s.fireWeapon('marksman',{x:0,y:2,z:8,perspective:true});s.updateBullets(.1);assert.ok(s.bullets.length);assert.ok(!s.events.some(e=>e.type==='splash'));
 s.bullets=[];s.events=[];s.fireWeapon('marksman',{x:0,y:.08,z:5,perspective:true});for(let i=0;i<40;i++)s.updateBullets(1/120);assert.ok(s.events.some(e=>e.type==='splash'));assert.equal(s.bullets.length,0);
});
test('arc cannot select a ground enemy while the player aims at the sky',()=>{const s=game(),e=s.spawnEnemy('walker',0,8);s.switchWeapon('arc');s.fireWeapon('arc',{x:0,y:30,z:8,perspective:true,targetId:null});assert.equal(e.health,e.maxHealth);});

test('high airbursts do not damage ground targets or splash water below them',()=>{
 const s=game(),e=s.spawnEnemy('walker',0,8);e.health=e.maxHealth=10000;const wall={...prop,z:8,h:18,health:10000};s.props=s.obstacles=[wall];s.layout.water=[{x:0,z:8,w:10,d:10}];s.layout.bridges=[];
 s.blast(0,8,3,100,'explosion','launcher','launcher',0,15);assert.equal(e.health,10000);assert.ok(wall.health<10000);assert.equal(s.events.find(e=>e.type==='explosion').y,15);assert.ok(!s.events.some(e=>e.type==='splash'));
});
