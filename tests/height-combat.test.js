import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {detonateThrowable} from '../src/rebuild/Throwables.js';
import {nearbyPlace} from '../src/rebuild/RPG.js';
import {updateStreetEvents} from '../src/rebuild/StreetEvents.js';
import {bossContains} from '../src/rebuild/Bosses.js';
import {vehiclePlan} from '../src/rebuild/Vehicles.js';
const game=()=>{const s=new Simulation({layout:{bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},cover:[],spawnPoints:[],water:[],bridges:[]}});s.start();Object.assign(s.player,{x:0,y:0,z:0,invulnerable:0});s.enemies=[];s.toSpawn=999;s.spawnTimer=9999;s.random=()=>.5;s.weather=null;return s;};
const enemy=(s,y,z=8)=>{const e=s.spawnEnemy('walker',0,z);Object.assign(e,{y,health:10000,maxHealth:10000,speed:0});return e;};
const shoot=(s,aim)=>{s.fireWeapon('carbine',aim);for(let i=0;i<120;i++)s.updateBullets(1/120);};
const crate=(y=0)=>({id:'crate',kind:'crate',x:0,y,z:0,w:1,d:1,h:1.5,health:1000,maxHealth:1000});

test('ordinary rounds pass above ground actors and below raised actors without planar hits',()=>{
 const a=game();a.player.y=5;const ground=enemy(a,0);shoot(a,{x:0,z:8});assert.equal(ground.health,10000);
 const b=game(),raised=enemy(b,5);shoot(b,{x:0,z:8});assert.equal(raised.health,10000);
 const c=game();c.player.y=5;const target=enemy(c,5);shoot(c,target);assert.ok(target.health<10000);
});
test('automatic fire aims down at crawlers and at elevated actors using actual body height',()=>{
 for(const [y,crawling] of [[0,true],[5,false]]){const s=game(),e=enemy(s,y);e.crawling=crawling;s.update(.02,{auto:true});assert.ok(s.bullets.length);for(let i=0;i<120;i++)s.updateBullets(1/120);assert.ok(e.health<10000,`target y=${y}, crawling=${crawling}`);}
});
test('elevated enemy projectiles hit an elevated player but cannot hit a player below',()=>{
 for(const y of [0,5]){const s=game();s.player.y=y;s.bullets.push({id:1,x:0,y:6,z:8,vx:0,vy:0,vz:-20,life:1,damage:10,enemy:true});s.updateBullets(.5);assert.equal(s.player.health<100,y===5);}
});
test('melee attacks hit matching-height bodies and scenery without reaching the floor below',()=>{
 const s=game();s.player.y=5;const low=enemy(s,0,1),high=enemy(s,5,1.5);s.resolveSlice({weapon:'katana',angle:0,combo:0,variant:0});assert.equal(low.health,10000);assert.ok(high.health<10000);
 s.enemies=[];const lowProp={...crate(0),z:1},highProp={...crate(5),id:'high',z:1};s.props=s.obstacles=[lowProp,highProp];s.resolveSlice({weapon:'katana',angle:0,combo:0,variant:0});assert.equal(lowProp.health,1000);assert.ok(highProp.health<1000);
});
test('blast radius measures distance to both raised bodies and raised prop bounds',()=>{
 for(const y of [0,8]){const s=game(),low=enemy(s,0,0),high=enemy(s,8,0),lowProp=crate(0),highProp={...crate(8),id:'high'};s.props=s.obstacles=[lowProp,highProp];s.blast(0,0,2,10,'explosion','grenade',null,0,y);assert.equal(low.health<10000,y===0);assert.equal(high.health<10000,y===8);assert.equal(lowProp.health<1000,y===0);assert.equal(highProp.health<1000,y===8);}
});
test('ground contact attacks and low boss shockwaves cannot reach airborne feet',()=>{
 for(const y of [0,3]){const s=game();s.player.y=y;const e=enemy(s,0,.7);e.windup=.001;s.updateEnemies(.01);assert.equal(s.player.health<100,y===0);}
 const wave={x:0,z:0,radius:3,attackHeight:.65};assert.equal(bossContains(wave,{x:0,y:1,z:0,radius:.4}),false);assert.equal(bossContains(wave,{x:0,y:.2,z:0,radius:.4}),true);
});
test('ground fire cannot burn airborne characters or suspended crates',()=>{
 const s=game();s.player.y=8;const e=enemy(s,8,0),prop=crate(8);s.props=s.obstacles=[prop];s.fires=[{x:0,z:0,radius:2,life:4}];s.updateFire(.02);assert.equal(s.player.health,100);assert.ok(!(e.burning>0));assert.ok(!(prop.burning>0));
});
test('burning actors cannot ignite props on a different floor',()=>{
 const s=game(),e=enemy(s,8,0),prop=crate(0);s.props=s.obstacles=[prop];e.burning=5;s.updateEnemies(.02);assert.ok(!(prop.burning>0));
});
test('airborne frost quenches nearby burning enemies without quenching distant street fire',()=>{
 const s=game(),e=enemy(s,8,0);e.burning=5;s.fires=[{x:0,z:0,radius:1,life:4}];detonateThrowable(s,{x:0,y:8,z:0,radius:4.8,damage:1,throwable:'frost'});assert.ok(e.chilled>0);assert.equal(e.burning,0);assert.equal(s.fires.length,1);
});
test('ground pickups, shops, cars and relay objectives require returning to street level',()=>{
 const s=game();s.player.y=5;s.places=[{id:'shop',x:0,z:0,revealed:true,kind:'shop'}];assert.equal(nearbyPlace(s),null);
 const car={...vehiclePlan('sedan',3,0),id:'car',health:100};s.props=s.obstacles=[car];assert.equal(s.interactVehicle(),false);
 s.props=s.obstacles=[];s.player.health=50;s.pickups=[{x:0,z:0,type:'health',life:10}];s.update(.02,{auto:false});assert.equal(s.pickups.length,1);assert.equal(s.player.health,50);
 const relay={kind:'relay',state:'active',x:0,z:0,guards:[],seconds:8,progress:0};s.streetEvents=[relay];updateStreetEvents(s,1);assert.equal(relay.progress,0);
 s.player.y=0;assert.equal(nearbyPlace(s)?.id,'shop');s.update(.02,{auto:false});assert.equal(s.pickups.length,0);assert.ok(s.player.health>50);assert.ok(relay.progress>0);
});

test('automatic aiming retains vertical weapon pose between shots',()=>{
 const s=game();s.player.y=3;enemy(s,0);s.update(.02,{auto:true});const pitch=s.player.aimPitch;assert.ok(pitch>.1);assert.ok(s.player.weaponTimers.carbine>0);s.update(.01,{auto:true});assert.ok(Math.abs(s.player.aimPitch-pitch)<.002);
});
