import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {travelGate,requestRegionTravel,completeRegionTravel,regionView,captureRegion,resolveRegionArrival,safeRegionPoint,travelUnavailable,collectCountrySupply,initializeRegions} from '../src/rebuild/Regions.js';
import {distance} from '../src/rebuild/config.js';
import {beginBossAttack,bossContains} from '../src/rebuild/Bosses.js';
const game=()=>{const sim=new Simulation({seed:31,mode:'city',profile:{}});sim.start();sim.events=[];return sim;};
const gate=s=>Object.assign(s.player,{...travelGate(s),y:0,grounded:true});
const cross=(s,prepare)=>{gate(s);assert.equal(requestRegionTravel(s),true);assert.equal(s.state,'travelling');const result=completeRegionTravel(s,prepare);assert.equal(result.ok,true,result.error?.message);return result;};
const tick=(s,seconds)=>{for(let i=0;i<seconds*20;i++)s.update(.05,{auto:false});};
const heroResources=p=>Object.fromEntries(['health','maxHealth','grenades','magazines','reloads','reloadDurations','weaponTimers','dashCooldown','grappleCooldown','mastery','equipped','upgradeRanks','shield','invulnerable','equippedAt','lastSwing','poolAfter'].map(k=>[k,structuredClone(p[k])]));

test('50 city-country roundtrips preserve exact regional destruction, loot, cars, quests and hero resources',()=>{
 const s=game(),cityLayout=s.layout,p=s.player,profile=s.profile,rpg=s.rpg,weather=s.weather,focus=s.focus;s.player.health=27;s.player.magazines.carbine=3;s.player.reloads.carbine=.82;s.player.weaponTimers.carbine=.13;s.player.grenades=1;s.player.dashCooldown=.7;s.player.mastery.carbine=135;s.player.invulnerable=.21;s.rpg.coins=93;s.rpg.accepted=['mercy'];s.rpg.claimed=['runner'];s.visited.add('TEST DISCOVERY');s.traversalRewardClaimed=true;
 const building=s.props.find(p=>p.kind==='building'),crate=s.props.find(p=>p.kind==='crate'),car=s.props.find(p=>p.driveable);s.damageProp(building,200);if(crate)s.damageProp(crate,10000);car.x+=2;car.health-=80;s.streetEvents[0].state='complete';s.pickups.push({id:s.nextId++,x:8,z:9,life:17,type:'ammo'});s.rubblePiles=new Map([['test-pile',{count:2}]]);s.wetGround=[{x:2,z:2,life:12}];s.interiorState.visited.push('visited-once');
 const city=structuredClone(captureRegion(s)),resources=heroResources(p),coins=rpg.coins,xp=profile.xp;let road,roadProps,nextId;
 for(let i=0;i<50;i++){
  cross(s);if(!road){road=s.layout;roadProps=s.props;s.props[0].health-=20;s.visited.add('ROAD ONCE');s.rpg.countrySupplies=true;nextId=s.nextId;}assert.equal(s.layout,road);assert.equal(s.props,roadProps);assert.equal(s.props[0].health,roadProps[0].maxHealth-20);assert.ok(s.visited.has('ROAD ONCE'));assert.equal(s.nextId,nextId);assert.equal(s.rpg.countrySupplies,true);
  cross(s);assert.equal(s.layout,cityLayout);assert.equal(s.props.find(p=>p.id===building.id).health,building.health);assert.deepEqual(s.pickups,city.pickups);assert.deepEqual(s.wetGround,city.wetGround);assert.deepEqual(s.rubblePiles,city.rubblePiles);assert.deepEqual(s.streetEvents,city.streetEvents);assert.deepEqual(s.visited,city.visited);assert.equal(s.traversalRewardClaimed,true);assert.deepEqual(s.interiorState,city.interiorState);assert.equal(s.props.find(p=>p.id===car.id).x,car.x);assert.deepEqual(heroResources(s.player),resources);
 }
 assert.equal(s.player,p);assert.equal(s.profile,profile);assert.equal(s.rpg,rpg);assert.equal(s.weather,weather);assert.equal(s.focus,focus);assert.equal(rpg.coins,coins);assert.equal(profile.xp,xp);assert.equal(s.regions.size,2);
});

test('failed visual construction and unsupported asynchronous preparation leave source and hero untouched',()=>{
 for(const prepare of [()=>{throw new Error('GPU construction failed');},()=>Promise.resolve({})]){const s=game();gate(s);const before=captureRegion(s),hero=structuredClone(s.player),nextId=s.nextId,energy=s.focus.energy;requestRegionTravel(s);const result=completeRegionTravel(s,prepare);assert.equal(result.ok,false);assert.equal(s.state,'playing');assert.equal(s.pendingTravel,null);assert.equal(s.regions.size,0);assert.equal(s.regionGates['country-road'],null);assert.equal(s.nextId,nextId);assert.equal(s.focus.energy,energy);assert.equal(s.layout,before.layout);assert.equal(s.props,before.props);assert.deepEqual(s.player,hero);assert.ok(s.events.some(e=>e.type==='rpg-notice'&&/cancelled/i.test(e.message)));}
});

test('destination previews and stored region views use destination solids, isolated caches and hero pose',()=>{
 const s=game(),cityProps=s.props;s.navigation.set('old',{stale:true});s.questRoute={stale:true};cross(s,view=>{assert.ok(view.layout.country);assert.notEqual(view.props,cityProps);assert.ok(view.obstacles.every(o=>view.props.includes(o)&&o.health>0));assert.equal(view.navigation.size,0);assert.equal(view.questRoute,null);assert.equal(view.player.x,view.layout.region.gate.x);view.player.health=4;return {ready:true};});assert.notEqual(s.player.health,4);const city=regionView(s,'city');assert.equal(city.props,cityProps);assert.ok(city.obstacles.every(o=>cityProps.includes(o)));assert.equal(city.navigation.size,0);assert.equal(city.questRoute,null);assert.equal(s.navigation.size,0);
});

test('a blocked arrival fails atomically and a localized blocker chooses a genuinely clear nearby point',()=>{
 const s=game();cross(s);cross(s);const road=s.regions.get('country-road'),g=s.regionGates['country-road'];road.props.push({id:'blocked-gate',x:g.x,z:g.z,w:30,d:30,health:100,kind:'building'});gate(s);const props=s.props,layout=s.layout,hero=structuredClone(s.player),before=structuredClone(road.enemies);requestRegionTravel(s);assert.equal(completeRegionTravel(s).ok,false);assert.equal(s.layout,layout);assert.equal(s.props,props);assert.deepEqual(s.player,hero);assert.deepEqual(road.enemies,before);road.props.at(-1).w=road.props.at(-1).d=1;cross(s);assert.ok(distance(s.player,g)>1);assert.ok(safeRegionPoint(s,s.player));assert.equal(s.player.invulnerable,hero.invulnerable);
});

test('arrival candidates reject water, flame, imminent blasts, live enemies and projectile sweeps',()=>{
 const s=game();cross(s);const p=travelGate(s),base={...s,props:[],enemies:[],fires:[],hazards:[],bullets:[]};assert.ok(safeRegionPoint(base,p));
 for(const patch of [{fires:[{...p,radius:20}]},{hazards:[{...p,radius:20,timer:.01}]},{enemies:[{...p,radius:20,health:1}]},{layout:{...s.layout,water:[{...p,w:40,d:40}]}}])assert.equal(resolveRegionArrival({...base,...patch},p),null);
 const bullet={x:p.x-5,y:1,z:p.z,vx:50,vz:0,life:1,enemy:true};assert.equal(safeRegionPoint({...base,bullets:[bullet]},p),false);assert.equal(safeRegionPoint({...base,bullets:[{...bullet,y:12}]},p),true);assert.equal(safeRegionPoint({...base,bullets:[{...bullet,life:0}]},p),true);assert.equal(safeRegionPoint({...base,bullets:[{...bullet,enemy:false,weapon:'carbine'}]},p),true);
});

test('regional arrival avoids the distant end of a real boss lane before its frozen attack resumes',()=>{
 const s=game();cross(s);const g=travelGate(s),e=s.spawnEnemy('boss',g.x,g.z-17);
 Object.assign(e,{x:g.x,z:g.z-17,bossPhase:1});Object.assign(s.player,g);beginBossAttack(s,e,'harpoon');
 const lane=s.hazards.find(h=>h.bossOwner===e.id);assert.equal(lane.shape,'lane');
 assert.ok(distance(g,lane)>lane.radius+.65,'arrival lies beyond the old circular safety check');
 assert.equal(bossContains(lane,{...g,y:0,radius:.65}),true);
 // Park the lane in the destination after leaving its footpath.
 const hazards=s.hazards;s.hazards=[];cross(s);
 s.regions.get('country-road').hazards=hazards;
 const result=cross(s);assert.equal(result.ok,true);
 assert.equal(bossContains(lane,s.player),false,'a safe side arrival replaces the threatened gate');
 e.bossTimer=lane.timer=.05;s.player.invulnerable=0;s.player.health=83;const health=s.player.health;
 s.update(.05,{auto:false});assert.equal(lane.done,true);assert.equal(s.player.health,health,'resuming the real attack cannot damage the selected arrival');
});

test('lane arrival clearance matches ground-body padding at every cardinal heading and both attack widths',()=>{
 const s=game();cross(s);const g=travelGate(s),view={...s,props:[],enemies:[],fires:[],bullets:[]};
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const width of [2,2.8]){
  const lane={x:g.x-Math.sin(angle)*8,z:g.z-Math.cos(angle)*8,shape:'lane',angle,length:19,width,radius:width/2,bossOwner:123,attackHeight:4};view.hazards=[lane];
  const point=side=>({x:g.x+Math.cos(angle)*side,z:g.z-Math.sin(angle)*side});
  for(const side of [0,width/2+.6,-width/2-.6])assert.equal(safeRegionPoint(view,point(side),.65),false,`angle ${angle}, width ${width}, side ${side}`);
  assert.equal(safeRegionPoint(view,point(width/2+.7),.65),true);
  assert.equal(safeRegionPoint(view,point(-width/2-.7),.65),true);
  view.hazards=[{...lane,done:true}];assert.equal(safeRegionPoint(view,g),true);
 }
});

test('travel blocks invalid gameplay states and actions, and repeated requests emit only one transition',()=>{
 const s=game();gate(s);for(const state of ['paused','interior','upgrade','extracting','dead','victory','menu']){s.state=state;assert.ok(travelUnavailable(s),state);}s.state='playing';
 for(const patch of [{health:0},{vehicleId:'car'},{y:1},{grounded:false},{grapple:{}},{dash:.1},{meleeAttack:{}},{throwAnimation:.1}]){const old={...s.player};Object.assign(s.player,patch);assert.ok(travelUnavailable(s),JSON.stringify(patch));Object.assign(s.player,old);}
 assert.equal(travelUnavailable(s),null);requestRegionTravel(s);requestRegionTravel(s);assert.equal(s.events.filter(e=>e.type==='region-travel').length,1);const result=completeRegionTravel(s);assert.ok(result.ok);assert.equal(completeRegionTravel(s).ok,false);
});

test('inactive world timers and city wave director freeze while active country ticks and kills cannot award waves',()=>{
 const s=game();s.time=10;s.spawnTimer=.75;s.toSpawn=6;s.waveTotal=7;const e=s.spawnEnemy('walker',0,0);e.lastHitAt=9.5;e.attack=2;s.pickups.push({id:s.nextId++,x:0,z:0,life:12,type:'ammo'});s.hazards.push({id:s.nextId++,x:1,z:1,timer:4,duration:4,radius:1,damage:5});const count=s.toSpawn,wave=s.wave;cross(s);for(const enemy of s.enemies){enemy.speed=0;enemy.attack=1e6;}const city=s.regions.get('city'),before=structuredClone(city);tick(s,2);assert.ok(s.time>11.9);assert.deepEqual(city,before);assert.equal(s.toSpawn,0);assert.equal(s.wave,wave);for(const enemy of s.enemies)s.damageEnemy(enemy,1e7,0,0,{kind:'ballistic'});tick(s,.2);assert.equal(s.state,'playing');assert.equal(s.wave,wave);assert.equal(s.choices.length,0);const now=s.time;cross(s);assert.equal(s.toSpawn,count);assert.equal(s.spawnTimer,.75);assert.equal(s.pickups.at(-1).life,12);assert.equal(s.hazards.at(-1).timer,4);assert.equal(s.enemies.find(q=>q.id===e.id).attack,2);assert.ok(Math.abs(s.enemies.find(q=>q.id===e.id).lastHitAt-(9.5+now-10))<1e-8);assert.equal(s.wave,wave);
});

test('missing city snapshot and tampered targets cannot generate another country under the wrong identity',()=>{
 const s=game();cross(s);s.regions.delete('city');gate(s);requestRegionTravel(s);const layout=s.layout;let creations=0;s.createCountryRegion=()=>{creations++;throw new Error('should not create');};assert.equal(completeRegionTravel(s).ok,false);assert.equal(s.layout,layout);assert.equal(s.activeRegionId,'country-road');assert.equal(creations,0);gate(s);requestRegionTravel(s);s.pendingTravel.targetId='unknown';assert.equal(completeRegionTravel(s).ok,false);assert.equal(creations,0);
});

test('a fresh expedition clears regional memory while preserving the permanent profile and cannot collect supplies dead',()=>{
 const s=game();cross(s);s.rpg.countrySupplies=true;s.profile.xp=370;const fresh=new Simulation({seed:73,mode:'city',profile:s.profile});fresh.start();assert.equal(fresh.activeRegionId,'city');assert.equal(fresh.regions.size,0);assert.equal(fresh.profile.xp,370);assert.equal(fresh.rpg.countrySupplies,false);Object.assign(s.player,s.layout.region.supply);s.rpg.countrySupplies=false;s.rpg.accepted.push('country-supplies');s.enemies=[];s.player.health=0;assert.equal(collectCountrySupply(s),false);assert.equal(s.rpg.countrySupplies,false);s.player.health=10;s.player.grounded=false;assert.equal(collectCountrySupply(s),false);s.player.grounded=true;s.state='paused';assert.equal(collectCountrySupply(s),false);
});


test('selected city gates are walkable through actual Simulation navigation across representative topology seeds',()=>{
 for(const seed of [0,1,2,3,30,31,32,33,73,2026]){
  const s=new Simulation({seed,mode:'city',profile:{}});s.start();const target=travelGate(s);assert.ok(target,`seed ${seed} has a gate`);const walker={x:0,z:3,radius:.4};let steps=0;
  while(distance(walker,target)>2.6&&steps++<2400){const aim=s.blocked(walker,target,.44)?s.navigate(walker,target):target;assert.ok(aim,`seed ${seed} route step`);const d=distance(walker,aim);if(d>1e-8)s.move(walker,(aim.x-walker.x)/d*Math.min(.3,d),(aim.z-walker.z)/d*Math.min(.3,d));}
  assert.ok(distance(walker,target)<=2.6,`seed ${seed}: stuck ${distance(walker,target).toFixed(2)}m from gate after ${steps} steps`);
 }
});

test('gate selection skips a safe but disconnected farthest island',()=>{
 const s=game();s.layout={city:true,spawn:{x:0,z:3},bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},boundary:[{x:-50,z:-50},{x:50,z:-50},{x:50,z:50},{x:-50,z:50}],water:[{x:20,z:0,w:8,d:100}],waterObstacles:[{x:20,z:0,w:8,d:100}],bridges:[],spawnPoints:[{x:44,z:0},{x:-30,z:0}]};s.props=[];s.obstacles=[];s.places=[];s.enemies=[];s.hazards=[];s.fires=[];s.bullets=[];initializeRegions(s);assert.equal(travelGate(s).x,-30);assert.equal(safeRegionPoint(s,{x:44,z:0},1.6),true,'rejected point is safe in isolation');
});

test('city district advancement retains the same damaged road and independent manual destinations',()=>{
 const s=game();s.player.waypoint={x:8,z:9,source:'manual',name:'City route',regionId:'city'};cross(s);const road=s.layout,props=s.props;props[0].health-=31;s.player.waypoint={x:0,z:-20,source:'manual',name:'Road route',regionId:'country-road'};cross(s);assert.equal(s.player.waypoint.name,'City route');const cityLayout=s.layout;s.wave=4;s.nextWave();assert.equal(s.wave,5);assert.equal(s.district,1);assert.equal(s.layout,cityLayout);cross(s);assert.equal(s.layout,road);assert.equal(s.props,props);assert.equal(props[0].health,props[0].maxHealth-31);assert.equal(s.player.waypoint.name,'Road route');cross(s);assert.equal(s.wave,5);assert.equal(s.district,1);assert.equal(s.player.waypoint.name,'City route');
});

test('actual update requests travel before combat, reload or movement can consume the transition frame',()=>{
 const s=game();gate(s);s.player.reloads.carbine=.7;s.player.weaponTimers.carbine=.3;s.player.health=27;s.player.magazines.carbine=3;const hero=heroResources(s.player),time=s.time;s.update(.05,{interact:true,fire:true,x:1,z:1,auto:true});assert.equal(s.state,'travelling');for(let i=0;i<9;i++)s.update(.05,{interact:true,fire:true,x:1,z:1,auto:true});assert.equal(s.time,time);assert.deepEqual(heroResources(s.player),hero);assert.equal(s.events.filter(e=>e.type==='region-travel').length,1);assert.equal(completeRegionTravel(s).ok,true);assert.deepEqual(heroResources(s.player),hero);
});
