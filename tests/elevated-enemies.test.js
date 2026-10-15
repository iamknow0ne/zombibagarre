import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {stepElevatedEnemy,moveElevatedEnemy,elevatedWaypoint,enemiesShareFloor,stepElevatedPickup} from '../src/rebuild/ElevatedEnemies.js';
import {actorSpan,propSpan,verticalGap,bodyHit3D} from '../src/rebuild/Ballistics.js';
const dt=1/120;
const scene=()=>{
 const deck={id:'roof',x:0,z:0,w:12,d:12,h:5,health:100};
 const hvac={id:'hvac',x:0,z:0,y:5,w:2,d:2,h:1,health:100};
 return {layout:{bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30}},obstacles:[deck,hvac]};
};
const enemy=(x=-4,z=0)=>({id:1,elevated:true,x,z,y:5,radius:.4,type:'walker',health:100,angle:1.2});
const liveScene=()=>{const sim=new Simulation({seed:73,profile:{}});sim.start();sim.enemies=[];const fixture=scene();sim.layout=fixture.layout;sim.props=sim.obstacles=fixture.obstacles;return sim;};
test('unflagged street enemies are unchanged by vertical helpers',()=>{
 const sim=scene(),e={...enemy(),elevated:false,y:0},before=structuredClone(e);
 stepElevatedEnemy(sim,e,.05);assert.equal(moveElevatedEnemy(sim,e,3,2),false);assert.equal(elevatedWaypoint(sim,e,{x:4,z:0}),null);assert.deepEqual(e,before);
});
test('roof motion ignores the host volume, sweeps cover and preserves combat facing',()=>{
 const sim=scene(),e=enemy();stepElevatedEnemy(sim,e,dt);
 assert.equal(e.supportId,'roof');assert.equal(e.y,5);assert.equal(e.angle,1.2);
 moveElevatedEnemy(sim,e,20,0);assert.ok(Math.abs(e.x+1.4)<1e-8,'long sweep cannot tunnel through HVAC');assert.equal(e.y,5);
 moveElevatedEnemy(sim,e,0,3);moveElevatedEnemy(sim,e,5,0);assert.ok(e.x>3,'host building cannot eject actor to its street perimeter');
});
test('voluntary pursuit goes around roof cover and never chases a street target off a roof',()=>{
 const sim=scene(),e=enemy(),target={x:4,z:0,y:5};stepElevatedEnemy(sim,e,dt);
 for(let i=0;i<550&&Math.hypot(e.x-target.x,e.z-target.z)>.12;i++){
  const p=elevatedWaypoint(sim,e,target);assert.ok(p,'supported route around HVAC');const d=Math.hypot(p.x-e.x,p.z-e.z);if(d>.001)moveElevatedEnemy(sim,e,(p.x-e.x)/d*.04,(p.z-e.z)/d*.04,{avoidEdges:true});stepElevatedEnemy(sim,e,dt);
 }
 assert.ok(Math.hypot(e.x-target.x,e.z-target.z)<.13);assert.equal(e.y,5);
 for(let i=0;i<220;i++){const p=elevatedWaypoint(sim,e,{x:30,y:0,z:0});if(p){const d=Math.hypot(p.x-e.x,p.z-e.z);if(d>.001)moveElevatedEnemy(sim,e,(p.x-e.x)/d*.04,(p.z-e.z)/d*.04,{avoidEdges:true});}stepElevatedEnemy(sim,e,dt);}
 assert.equal(e.y,5);assert.ok(e.x<6);assert.equal(e.grounded,true);
});
test('knockback across a roof edge releases support and falls onto lower cover',()=>{
 const sim=scene(),e=enemy(4,3);sim.obstacles.push({id:'lower',x:8,z:3,w:4,d:4,h:2,health:100});stepElevatedEnemy(sim,e,dt);
 moveElevatedEnemy(sim,e,4,0);assert.equal(e.grounded,false);assert.equal(e.supportId,null);
 for(let i=0;i<180;i++)stepElevatedEnemy(sim,e,dt);
 assert.equal(e.y,2);assert.equal(e.supportId,'lower');assert.equal(e.elevated,true);assert.equal(e.vy,0);
});
test('voluntary movement cannot skip an unsupported gap and land on another roof',()=>{
 const sim=scene(),e=enemy(4,3);sim.obstacles.push({id:'other-roof',x:12,z:3,w:6,d:6,h:5,health:100});stepElevatedEnemy(sim,e,dt);
 moveElevatedEnemy(sim,e,8,0,{avoidEdges:true});assert.equal(e.x,4);assert.equal(e.y,5);
});
test('loss of a real generated roof releases an enemy through the destroyed building to street',()=>{
 const sim=new Simulation({mode:'city',seed:73,profile:{}});sim.start();const roof=sim.layout.traversal.roofs[0];
 const e=sim.spawnEnemy('spitter',roof.anchor.x,roof.anchor.z);Object.assign(e,{elevated:true,y:roof.top});stepElevatedEnemy(sim,e,dt);assert.equal(e.supportId,roof.anchor.supportId);
 const host=sim.props.find(p=>p.id===roof.buildingId);sim.damageProp(host,1e9);
 stepElevatedEnemy(sim,e,dt);assert.equal(e.grounded,false);assert.ok(e.y<roof.top);
 for(let i=0;i<300;i++)stepElevatedEnemy(sim,e,dt);
 assert.equal(e.y,0);assert.equal(e.supportId,null);assert.equal(e.grounded,true);
});
test('cross-floor pairs and dead enemies never crowd one another',()=>{
 const a=enemy(),b={...enemy(),id:2,y:0};assert.equal(enemiesShareFloor(a,b),false);
 b.y=5;assert.equal(enemiesShareFloor(a,b),true);b.health=0;assert.equal(enemiesShareFloor(a,b),false);
 b.health=100;b.y=3.5;assert.equal(enemiesShareFloor(a,b),true,'actually overlapping falling bodies can separate');
});
test('raised loot lands on the next support and falls again if that support collapses',()=>{
 const sim=scene(),item={x:3,y:8,z:3,life:40,type:'health'};
 for(let i=0;i<180;i++)stepElevatedPickup(sim,item,dt);assert.equal(item.y,5);assert.equal(item.fallVelocity,0);
 sim.obstacles[0].health=0;stepElevatedPickup(sim,item,dt);assert.ok(item.y<5);assert.ok(item.fallVelocity<0);
 for(let i=0;i<180;i++)stepElevatedPickup(sim,item,dt);assert.equal(item.y,0);assert.equal(item.fallVelocity,0);assert.equal(item.life,40);
});
test('paused loot stays still and ground loot never snaps to the roof above',()=>{
 const sim=scene(),item={x:3,y:5,z:3},street={x:0,z:0,type:'health'},before=structuredClone(street);
 sim.obstacles[0].health=0;stepElevatedPickup(sim,item,0);assert.equal(item.y,5);assert.equal(item.fallVelocity,undefined);
 sim.obstacles[0].health=100;stepElevatedPickup(sim,street,.05);assert.deepEqual(street,before);
});
test('falling enemies do not pass horizontally through raised cover or low ceilings',()=>{
 const sim=scene(),e=enemy(4,3);sim.obstacles.push({id:'awning',x:8,z:3,y:2,w:4,d:4,h:.4,health:100});stepElevatedEnemy(sim,e,dt);moveElevatedEnemy(sim,e,4,0);
 for(let i=0;i<180;i++)stepElevatedEnemy(sim,e,dt);assert.equal(e.y,2.4);
 e.y=0;e.grounded=true;e.supportId=null;e.x=4;moveElevatedEnemy(sim,e,4,0);assert.equal(e.x,8,'normal height fits under awning');
 e.type='brute';e.x=4;moveElevatedEnemy(sim,e,4,0);assert.ok(e.x<6,'tall body hits underside sidewall');assert.equal(verticalGap(actorSpan(e),propSpan(sim.obstacles.at(-1))),0);
});
test('spitter windup snapshots height and launches a true 3D trajectory toward a lower target',()=>{
 const sim=new Simulation({seed:73,profile:{}});sim.start();sim.enemies=[];sim.props=[];sim.obstacles=[];
 const e=sim.spawnEnemy('spitter',0,0);Object.assign(e,{y:5,elevated:true,speed:0,attack:0});Object.assign(sim.player,{x:6,y:0,z:0});
 // Existing ranged aiming is already height-aware. This regression protects it
 // while elevated movement is integrated; no floor is necessary for the aim.
 sim.updateEnemies(.01);assert.ok(e.windup>0);assert.ok(e.targetY>0&&e.targetY<2);sim.updateEnemies(.6);
 const bullet=sim.bullets.find(b=>b.enemy);assert.ok(bullet);assert.ok(bullet.vy<0);
 const t=6/bullet.vx,end={x:bullet.x+bullet.vx*t,y:bullet.y+bullet.vy*t,z:bullet.z+bullet.vz*t};assert.ok(bodyHit3D(bullet,end,sim.player,.01)!==null);
});
test('live enemy loop routes around rooftop HVAC without the street flow field',()=>{
 const sim=liveScene(),e=sim.spawnEnemy('walker',-4,0);Object.assign(e,{elevated:true,y:5,attack:1e6});Object.assign(sim.player,{x:4,z:0,y:5});
 sim.navigate=()=>assert.fail('roof pursuit must not use street navigation');
 for(let i=0;i<400;i++)sim.updateEnemies(.025);
 assert.equal(e.y,5);assert.ok(e.x>2);assert.ok(Math.hypot(e.x-sim.player.x,e.z-sim.player.z)<=e.radius+sim.player.radius+.1);
});
test('live crowd step cannot move a street enemy because of a rooftop enemy above it',()=>{
 const sim=liveScene(),high=sim.spawnEnemy('spitter',-4,0),low=sim.spawnEnemy('spitter',-3.9,0);
 // Hold attacks in windup so only the crowd step can move these actors.
 // The synthetic ground actor overlaps the host; ordinary street movement
 // correctly ejects that invalid placement even with zero speed.
 Object.assign(high,{y:5,elevated:true,speed:0,attack:100,windup:10});Object.assign(low,{speed:0,attack:100,windup:10});Object.assign(sim.player,{x:4,z:0,y:5});
 sim.updateEnemies(.01);assert.equal(high.x,-4);assert.equal(low.x,-3.9);assert.equal(low.z,0);assert.equal(high.y,5);
});
test('a spitter cannot start a proximity attack through the floor below its feet',()=>{
 const sim=liveScene();sim.obstacles=sim.props=[{id:'slab',x:0,z:0,y:4.7,h:.3,w:12,d:12,health:100}];
 const e=sim.spawnEnemy('spitter',0,0);Object.assign(e,{elevated:true,y:5,attack:0,speed:0});Object.assign(sim.player,{x:0,z:0,y:0});
 sim.updateEnemies(.01);assert.equal(e.windup,0);assert.equal(sim.bullets.length,0);
});
