import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {initializeInteriors,nearbyInteriorDoor,beginInterior,stepInterior,endInterior,interiorInteraction,collectInteriorCase,hasInteriorCase,resolveExteriorExit,nearbyInteriorRecovery} from '../src/rebuild/Interiors.js';
import {generateCity} from '../src/rebuild/City.js';
import {makeRPGWorld} from '../src/rebuild/RPG.js';
import {insideMap,segmentInMap} from '../src/rebuild/Map.js';
import {pointBlocked,lineBlocked,distance} from '../src/rebuild/config.js';
const game=()=>{const s=new Simulation({mode:'city',seed:73,profile:{}});s.start();s.events=[];return s;};
const plan=(s,type='workshop-v1')=>s.interiorState.manifest.find(p=>p.template===type);
const enter=(s,type)=>{const p=plan(s,type);Object.assign(s.player,{...p.door,y:0,grounded:true});assert.equal(beginInterior(s,p.id),true);return p;};
const ticks=(s,n,input)=>{for(let i=0;i<n;i++)s.update(1/60,input);};

test('100 generated cities use stable distinct dry hosts and reachable street entrances',()=>{
 let pairs=0;
 for(let seed=1;seed<=100;seed++){
  const layout=generateCity(seed),props=[...layout.cover,...layout.buildings.map(b=>({...b,kind:'building'}))].map(p=>({...p,health:100}));
  const s={layout,props,seed,places:makeRPGWorld(layout)};initializeInteriors(s);const first=JSON.stringify(s.interiorState.manifest);initializeInteriors(s);assert.equal(JSON.stringify(s.interiorState.manifest),first);
  const manifest=s.interiorState.manifest;assert.equal(new Set(manifest.map(p=>p.buildingId)).size,manifest.length);if(manifest.length===2)pairs++;
  for(const p of manifest){assert.ok(insideMap(layout,p.door.x,p.door.z,1));assert.ok(!pointBlocked(p.door.x,p.door.z,1,props));assert.ok(props.some(b=>b.id===p.buildingId));assert.ok(layout.spawnPoints.some(q=>distance(q,p.door)<24&&!lineBlocked(q,p.door,.4,props)&&segmentInMap(layout,q,p.door,.4)));assert.ok(!pointBlocked(p.spawn.x,p.spawn.z,.4,p.obstacles));}
 }
 assert.ok(pairs>=95,`${pairs}/100 cities have both rooms`);
});
test('noncity and absent valid workshop hosts keep their normal roadside services',()=>{
 const s=game();s.layout.city=false;initializeInteriors(s);assert.deepEqual(s.interiorState.manifest,[]);s.layout.city=true;s.places.find(p=>p.id==='smith').buildingId=null;initializeInteriors(s);assert.deepEqual(s.interiorState.manifest,[]);
});
test('entry gates reject remote, airborne, driving, grappling, dodging, swinging, throwing and dead heroes',()=>{
 for(const variation of ['remote','air','vehicle','grapple','dash','swing','throw','dead']){const s=game(),p=plan(s);Object.assign(s.player,p.door);if(variation==='remote')s.player.x+=10;if(variation==='air')s.player.y=1;if(variation==='vehicle')s.player.vehicleId='car';if(variation==='grapple')s.player.grapple={};if(variation==='dash')s.player.dash=.1;if(variation==='swing')s.player.meleeAttack={};if(variation==='throw')s.player.throwAnimation=.1;if(variation==='dead')s.player.health=0;assert.equal(beginInterior(s,p.id),false,variation);assert.equal(s.interior,null);}
});
test('room ticks freeze exterior physics, timers, ammo, waves and hero coordinates, including combat inputs',()=>{
 const s=game();s.spawnEnemy('walker',0,3);s.player.reloads.carbine=2;s.player.burn=3;s.bullets.push({x:0,z:0,life:3});s.fires.push({x:0,z:0,life:3,radius:2});s.hazards.push({x:2,z:2,timer:1});enter(s);
 const snapshot=()=>JSON.stringify({time:s.time,weather:s.weather,player:s.player,enemies:s.enemies,bullets:s.bullets,fires:s.fires,hazards:s.hazards,wave:s.wave,spawn:s.spawnTimer,focus:s.focus});const before=snapshot();ticks(s,600,{x:1,z:0,fire:true,auto:true,grenade:true,dash:true,jump:true,grapple:true,reload:true,weapon:'katana'});assert.equal(snapshot(),before);assert.ok(s.interior.pose.x>0);assert.equal(s.state,'interior');
 s.pause();const pose={...s.interior.pose};ticks(s,30,{x:-1});assert.deepEqual(s.interior.pose,pose);s.resume();assert.equal(s.state,'interior');
});
test('room furniture and thin wall block walking; the apartment L route reaches the case normally',()=>{
 const s=game();enter(s,'apartment-v1');ticks(s,120,{z:-1});assert.ok(s.interior.pose.z>=.575);assert.equal(interiorInteraction(s),null);
 ticks(s,48,{x:-1});assert.ok(s.interior.pose.x<-3.4);ticks(s,17,{z:-1});assert.ok(s.interior.pose.z< -.6);
 // Cross the corridor between partition and bed, then follow the right aisle.
 ticks(s,80,{x:1});assert.ok(s.interior.pose.x>2);ticks(s,32,{z:-1});assert.equal(interiorInteraction(s)?.id,'tool-case');
});
test('huge movement values and stalled frames cannot tunnel through furniture',()=>{
 const s=game();enter(s,'apartment-v1');for(let i=0;i<100;i++)stepInterior(s,{z:-1e9},10);assert.ok(s.interior.pose.z>=.575);assert.ok(s.interior.pose.z<1);assert.ok(!pointBlocked(s.interior.pose.x,s.interior.pose.z,.4,s.interior.plan.obstacles));
});
test('interactions emit semantic objects and remain available to paused merchant dialogs',()=>{
 const s=game();enter(s);Object.assign(s.interior.pose,{x:-2,z:-.2});s.update(1/60,{interact:true});assert.equal(s.events.at(-1).type,'interior-interact');assert.equal(s.events.at(-1).merchantId,'smith');s.pause();assert.equal(interiorInteraction(s)?.merchantId,'smith');assert.equal(endInterior(s),false);
});
test('case collection requires accepted quest and physical proximity, rewards once per expedition',()=>{
 const s=game();const p=enter(s,'apartment-v1');assert.equal(collectInteriorCase(s),false);s.rpg.accepted.push('workshop-tools');assert.equal(collectInteriorCase(s),false);Object.assign(s.interior.pose,{x:3,z:-3.8});const before=JSON.stringify(s.profile);assert.equal(collectInteriorCase(s),true);assert.equal(collectInteriorCase(s),false);assert.equal(hasInteriorCase(s),true);assert.equal(s.interiorState.collected[0],`${p.id}:tool-case`);assert.equal(JSON.stringify(s.profile),before);assert.equal(interiorInteraction(s),null);s.start();assert.equal(s.interior,null);assert.deepEqual(s.interiorState.collected,[]);assert.deepEqual(s.interiorState.visited,[]);assert.equal(hasInteriorCase(s),false);
});
test('exit is local, preserves extraction state and cannot restore dead buildings',()=>{
 const s=game();s.state='extracting';const p=enter(s);Object.assign(s.interior.pose,{x:4,z:-1});assert.equal(endInterior(s),false);const b=s.props.find(b=>b.id===p.buildingId);b.health=0;Object.assign(s.interior.pose,{x:0,z:3.6});assert.equal(endInterior(s),true);assert.equal(s.state,'extracting');assert.equal(b.health,0);assert.equal(s.player.y,0);assert.ok(s.events.some(e=>e.type==='interior-exit'));assert.equal(nearbyInteriorDoor(s),null);
});
test('exit avoids new rubble, water, fire, pending blasts and enemies; retains room if no safe point exists',()=>{
 const s=game();const p=enter(s),d=p.door;s.props.push({id:'rubble-new',health:100,x:d.x,z:d.z,w:2,d:2});const out=resolveExteriorExit(s);assert.ok(out);assert.ok(!pointBlocked(out.x,out.z,.65,s.props.filter(p=>p.health>0)));s.props.push({id:'blocked-map',health:100,x:0,z:0,w:10000,d:10000});assert.equal(resolveExteriorExit(s),null);assert.equal(endInterior(s),false);assert.equal(s.state,'interior');
});
test('destroyed apartment recovery uses the same one-time case and destroyed workshop still offers Mara',()=>{
 const s=game(),a=plan(s,'apartment-v1'),w=plan(s);s.props.find(b=>b.id===a.buildingId).health=0;Object.assign(s.player,a.door);assert.equal(nearbyInteriorDoor(s),null);assert.equal(nearbyInteriorRecovery(s)?.type,'case');assert.equal(collectInteriorCase(s),false);s.rpg.accepted.push('workshop-tools');assert.equal(collectInteriorCase(s),true);assert.equal(collectInteriorCase(s),false);s.props.find(b=>b.id===w.buildingId).health=0;Object.assign(s.player,w.door);assert.equal(nearbyInteriorRecovery(s)?.merchantId,'smith');
});
test('repeated room entry and exit never changes health, ammunition or duplicates visits',()=>{
 const s=game();const health=s.player.health,ammo={...s.player.magazines};for(let i=0;i<50;i++){enter(s);assert.equal(endInterior(s),true);}assert.equal(s.interiorState.visited.length,1);assert.equal(s.player.health,health);assert.deepEqual(s.player.magazines,ammo);
});
test('every exit candidate is checked against water, fire, pending explosions and living enemies',()=>{
 for(const danger of ['water','fire','blast','enemy']){const s=game(),p=enter(s),d=p.door;
  if(danger==='water')s.layout.water.push({x:d.x,z:d.z,w:2,d:2});
  if(danger==='fire')s.fires.push({x:d.x,z:d.z,radius:1});
  if(danger==='blast')s.hazards.push({x:d.x,z:d.z,radius:1});
  if(danger==='enemy')s.spawnEnemy('walker',d.x,d.z);
  const point=resolveExteriorExit(s);assert.ok(point,danger);assert.ok(distance(point,d)>1.1,danger);assert.equal(endInterior(s),true);assert.deepEqual({x:s.player.x,y:s.player.y,z:s.player.z},point);
 }
});
test('entry through normal interaction short-circuits outdoor movement and attacks that same tick',()=>{
 const s=game(),p=plan(s);Object.assign(s.player,p.door);const magazines={...s.player.magazines},grenades=s.player.grenades,pos={x:s.player.x,z:s.player.z};s.update(1/60,{interact:true,x:1,fire:true,auto:true,grenade:true,dash:true,jump:true});assert.equal(s.state,'interior');assert.equal(s.player.x,pos.x);assert.equal(s.player.z,pos.z);assert.deepEqual(s.player.magazines,magazines);assert.equal(s.player.grenades,grenades);assert.equal(s.bullets.length,0);
});
test('dead room occupants cannot collect or exit back into a live expedition',()=>{
 const s=game();enter(s,'apartment-v1');s.rpg.accepted.push('workshop-tools');Object.assign(s.interior.pose,{x:3,z:-3.8});s.player.health=0;assert.equal(collectInteriorCase(s),false);assert.equal(endInterior(s),false);s.update(1/60,{interact:true});assert.equal(s.state,'dead');assert.equal(s.interior,null);
});
