import {VEHICLES,vehiclePlan} from '../src/rebuild/Vehicles.js';
import {debris} from '../src/rebuild/Effects.js';
import {generateCity} from '../src/rebuild/City.js';
// Local-only renderer harness. Uses the real simulation, weapon events and FX.
// These scenarios are staged, not campaign progress; no player saves are touched.
import { World } from '../src/rebuild/World.js';
import { Simulation } from '../src/rebuild/Simulation.js';
import { generateMap, insideMap } from '../src/rebuild/Map.js';
const settings={quality:'high',gore:true,reducedMotion:false};
const query=new URLSearchParams(location.search);
let world,sim,scene=query.get('scene')==='city'?'city':'fire',district=0,stopAt=2.5,last=performance.now(),counts={},frames=0,frameTime=0,benchStart=0,benchFps=0;
const $=id=>document.getElementById(id);
if(query.has('seed'))$('city-seed').value=Number(query.get('seed'))||0;
$('hide-controls').onclick=()=>{const panel=document.querySelector('aside');panel.hidden=!panel.hidden;panel.style.display=panel.hidden?'none':'flex';$('report').hidden=panel.hidden;};
function setup(){
 world?.destroy();counts={};const layout=['city','water','drive','cityfacade','fallwater','streets','contract','foundrycity','gardencity','bloodwalls','materials'].includes(scene)?generateCity(Number($('city-seed').value)||0):generateMap(20261012,district);
 if(!['map','boss','city','water','drive','cityfacade','fallwater','streets','contract','foundrycity','gardencity','bloodwalls','materials'].includes(scene))layout.cover=[{x:-2,z:-2,w:2,d:2,kind:'planter'},...[3,5.5,8].map(x=>({x,z:-2,w:.9,d:.9,kind:'barrel'})),{x:10,z:-2,w:4.3,d:2,kind:'car',color:0x67867a},{x:6,z:4,w:1.5,d:2.6,kind:'crate'}];
 if(scene==='bloodprops'){layout.cover=[vehiclePlan('van',-3,0,0),{x:2,z:0,w:2,d:2,kind:'crate'},{x:5,z:0,w:2,d:1,kind:'barrier'}];layout.facades=[];}
 if(['motion','axe','spear','hammer','molotov','frost','shock'].includes(scene)){layout.cover=[];layout.facades=[];}
 if(scene==='fleet'){layout.cover=Object.keys(VEHICLES).map((key,i)=>vehiclePlan(key,(i%4-1.5)*5.8,(Math.floor(i/4)-.5)*7,Math.PI/2));layout.facades=[];}
 sim=new Simulation({seed:20261012,layout,mode:layout.city?'city':'campaign'});sim.start('flame');sim.district=district;sim.toSpawn=999;sim.spawnTimer=1e6;sim.events=[];sim.player.invulnerable=999;
 world=new World($('game'),settings,district,layout);world.applySettings(settings);sim.setBuildings(world.buildingTargets);
 if(['axe','spear','hammer','molotov','frost','shock'].includes(scene)){sim.player.x=0;sim.player.z=3;world.portrait=11;world.inspectionTarget={x:0,z:1};const melee=['axe','spear','hammer'].includes(scene);sim.setLoadout([melee?scene:'carbine']);for(let i=0;i<3;i++){const e=sim.spawnEnemy('walker',(i-1)*1.4,1);e.health=e.maxHealth=9999;e.speed=0;if(scene==='frost'){e.burning=6;sim.addFire(e.x,e.z,1);}if(scene==='shock')e.wet=6;}if(!melee){sim.player.throwable=scene;sim.update(1/60,{auto:false,grenade:true,aim:{x:0,z:0}});}stopAt=melee?.42:1.05;}else if(scene==='motion'){sim.player.x=0;sim.player.z=3;sim.setLoadout(['carbine']);world.portrait=13;for(let i=0;i<3;i++){const e=sim.spawnEnemy(i===2?'runner':'brute',-2+i*2,-2);e.health=e.maxHealth=9999;e.speed=i===2?1.4:.1;}stopAt=5;}else if(scene==='materials'){const b=layout.buildings.find(b=>b.factory)||layout.buildings[0];sim.player.x=b.x;sim.player.z=b.z+b.d/2+8;world.inspectionTarget={x:b.x,z:b.z+b.d/2};world.portrait=22;stopAt=.1;}else if(scene==='bloodprops'){sim.player.x=0;sim.player.z=6;world.inspectionTarget={x:0,z:1};world.portrait=14;for(const [x,z] of [[-3,3.3],[2,1.8],[5,1.4]]){const e=sim.spawnEnemy('walker',x,z);e.speed=0;sim.damageEnemy(e,999,0,-9,{kind:'ballistic',weapon:'shotgun'});}stopAt=.8;}else if(scene==='bloodwalls'){const b=sim.props.find(p=>p.kind==='building');sim.player.x=b.x+1;sim.player.z=b.z+b.d/2+5;world.inspectionTarget={x:b.x,z:b.z+b.d/2};world.portrait=11;for(let i=0;i<3;i++){const e=sim.spawnEnemy('walker',b.x+(i-1)*2,b.z+b.d/2+.8);e.speed=0;sim.damageEnemy(e,9999,0,-8,{kind:i===1?'slice':'ballistic',headshot:i===0,part:i===1?'arm':undefined,weapon:i===1?'katana':'marksman'});}stopAt=.75;}else if(scene==='fleet'){world.portrait=30;sim.player.x=0;sim.player.z=3;stopAt=.1;}else if(scene==='foundrycity'||scene==='gardencity'){const spot=scene==='foundrycity'?(layout.buildings.find(b=>b.factory)||layout.buildings[0]):layout.parcels.find(p=>p.park);sim.player.x=spot.x;sim.player.z=spot.z+15;stopAt=.1;}else if(scene==='streets'){stopAt=.1;sim.player.x=0;sim.player.z=3;world.focus.set(0,0,3);}else if(scene==='contract'){const job=sim.streetEvents[0];sim.player.x=job.x;sim.player.z=job.z+2;stopAt=.3;}else if(scene==='portraits'){sim.player.z=1;world.portrait=true;for(let i=0;i<6;i++){const e=sim.spawnEnemy('walker',(i-2.5)*1.7,-1);e.speed=0;}stopAt=.1;}else if(scene==='city'){stopAt=.05;world.overview=true;}else if(scene==='fallwater'){const w=layout.waterObstacles[0];sim.player.x=w.x-w.w/2-5;sim.player.z=w.z;debris(world,{x:w.x,z:w.z,y:4,material:'metal',count:35,power:2});stopAt=1.2;}else if(scene==='water'){const w=layout.waterObstacles[0];sim.player.x=w.x-w.w/2-5;sim.player.z=w.z;sim.switchWeapon('carbine');sim.blast(w.x,w.z,4.3,180);stopAt=.45;}else if(scene==='drive'){sim.player.x=3;sim.player.z=3;sim.interactVehicle();stopAt=3;}else if(scene==='throw'){sim.player.z=5;sim.update(1/60,{auto:false,grenade:true,aim:{x:6,z:0}});stopAt=.32;}else if(scene==='twin'){sim.setLoadout(['carbine','carbine']);sim.player.z=5;const e=sim.spawnEnemy('brute',0,0);e.speed=0;e.health=9999;stopAt=.42;}else if(scene==='slice'){sim.switchWeapon('katana');sim.equipWeapon('dual');sim.player.x=0;sim.player.z=3;for(let i=0;i<5;i++){const e=sim.spawnEnemy('brute',(i-2)*.8,1);e.speed=0;}stopAt=.68;}else if(scene==='fire'){
  sim.player.x=-1;sim.player.z=5;sim.player.equipped=['flame','arc'];
  for(const [x,z]of [[-1,0],[-.3,-1],[1,-.5],[2,0]]){const e=sim.spawnEnemy('brute',x,z);e.speed=.05;e.health=e.maxHealth=1800;}
  stopAt=2.43;
 }else if(scene==='blast'){
  sim.player.x=0;sim.player.z=8;for(let i=0;i<8;i++){const e=sim.spawnEnemy('walker',2+i*.8,-1+(i%3));e.speed=0;}
  sim.damageProp(sim.props.find(p=>p.kind==='barrel'),99);stopAt=.95;
 }else if(['facade','cityfacade'].includes(scene)&&sim.props.some(p=>p.kind==='building')){
  const b=sim.props.find(p=>p.kind==='building'),points=layout.spawnPoints.filter(p=>(!layout.city||(p.x>b.x&&p.z>b.z))&&!sim.props.some(o=>Math.abs(p.x-o.x)<o.w/2+.5&&Math.abs(p.z-o.z)<o.d/2+.5)).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));sim.player.x=points[0]?.x||0;sim.player.z=points[0]?.z||3;sim.switchWeapon('marksman');sim.player.fireMultiplier=.3;sim.player.reloadMultiplier=.3;stopAt=1.5;if(layout.city)world.inspectionTarget={x:b.x,z:b.z};
 }else if(scene==='deaths'){sim.player.x=0;sim.player.z=6;for(let i=0;i<6;i++){const e=sim.spawnEnemy('walker',(i-2.5)*2,0);sim.damageEnemy(e,999,(i-2.5)*2,1,{kind:'ballistic'});}stopAt=1.5;}else if(scene==='injury'){
  sim.player.x=0;sim.player.z=6;
  for(const [i,death] of ['headshot','explosion','electric','fire','legs','arm'].entries()){
    const e=sim.spawnEnemy('brute',(i-2.5)*2.6,0);e.speed=.6;
    if(['legs','arm'].includes(death))sim.damageEnemy(e,100,0,0,{kind:'ballistic',part:death});
    else sim.damageEnemy(e,9999,0,0,{kind:death,headshot:death==='headshot'});
  }stopAt=.45;
 }else if(scene==='boss'){
  sim.player.x=0;sim.player.z=3;const e=sim.spawnEnemy('boss',0,-3);e.attack=.2;e.speed=0;stopAt=2.5;
 }else{stopAt=.05;}
 world.focus.set(['map','city'].includes(scene)?0:sim.player.x,0,['map','city'].includes(scene)?0:sim.player.z-1);if(scene==='map')world.overview=true;
 world.player.position.set(sim.player.x,0,sim.player.z);
 document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===scene)));
}
function layoutWaterTarget(){const w=sim.layout.waterObstacles[0];return{x:w.x,z:w.z};}
function step(dt){
 const building=sim.props.find(p=>p.kind==='building');
 sim.update(dt,scene==='motion'?{auto:true,x:Math.sin(sim.time*2),z:Math.cos(sim.time*2)*.45,dash:sim.time>2&&sim.time<2.035}:scene==='drive'?{auto:false,x:0,z:1}:scene==='water'?{auto:false,firing:true,aim:layoutWaterTarget()}:['fire','slice','twin','axe','spear','hammer'].includes(scene)?{auto:true}:scene==='facade'?{auto:false}:{auto:false});
 for(const e of sim.events){counts[e.type]=(counts[e.type]||0)+1;world.onEvent(e);}sim.events=[];world.update(sim,dt,['map','city'].includes(scene));
}
function report(){
 const kinds={};for(const fx of world.effects)kinds[fx.kind||'ring']=(kinds[fx.kind||'ring']||0)+1;
 $('report').textContent=`STAGED QA / ${scene.toUpperCase()} / ${sim.time.toFixed(2)}s ${sim.time>=stopAt?'FROZEN FOR INSPECTION':''}\n${JSON.stringify({citySeed:sim.layout.mapSeed,cityForm:sim.layout.shape,roads:sim.layout.roads?.length,parcels:sim.layout.parcels?.length,buildings:sim.layout.buildings?.length,shapes:[...new Set(sim.layout.buildings?.map(b=>b.shape)||[])],heights:[...new Set(sim.layout.buildings?.map(b=>b.h)||[])],loadout:sim.player.equipped,throwable:sim.player.throwable,chilled:sim.enemies.filter(e=>e.chilled>0).length,grenades:[...world.grenades.values()].map(g=>[g.position.x,g.position.y,g.position.z]),vehicle:sim.player.vehicleId,fleet:sim.props.filter(p=>p.driveable).map(p=>p.vehicleType),position:[+sim.player.x.toFixed(1),+sim.player.z.toFixed(1)],burning:sim.enemies.filter(e=>e.burning>0).length,burningProps:sim.props.filter(p=>p.burning>0).length,electrified:sim.enemies.filter(e=>e.electrified>0).length,corpses:world.corpses.length,poses:world.corpses.map(c=>c.variant),blood:world.decals.length,surfaceBlood:world.decals.filter(d=>d.userData.surface).length,wallBlood:world.decals.filter(d=>d.userData.wall).length,gore:settings.gore,impacts:world.impacts.length,crawlers:sim.enemies.filter(e=>e.crawling).length,stages:sim.props.filter(p=>p.kind==='building').map(p=>p.damageStage),missingSections:[...world.buildingMeshes.values()].flatMap(g=>g.userData.sections||[]).filter(m=>!m.visible).length,brokenWindows:[...world.buildingMeshes.values()].flatMap(g=>g.userData.glass).filter(m=>!m.visible).length,destroyed:sim.props.filter(p=>p.health<=0).length,measuredFPS:benchFps,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,streetJobs:sim.streetEvents,particles:kinds,events:counts})}`;
}
function loop(now){if(benchStart){frames++;if(now-benchStart>5000){benchFps=Math.round(frames*1000/(now-benchStart));benchStart=0;report();}}const dt=Math.min(.033,(now-last)/1000);last=now;if(sim.time<stopAt){step(Math.min(dt,stopAt-sim.time));report();}requestAnimationFrame(loop);}
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>{scene=b.dataset.scene;setup();};
$('grenade').onclick=()=>{const b=sim.props.find(p=>p.kind==='building');if(b){sim.blast(Math.max(b.x-b.w/2,Math.min(b.x+b.w/2,sim.player.x)),Math.max(b.z-b.d/2,Math.min(b.z+b.d/2,sim.player.z)),4.3,180);stopAt=sim.time+.25;}};
$('benchmark').onclick=()=>{benchStart=performance.now();frames=0;stopAt=sim.time+5;};
$('gore-toggle').onclick=()=>{settings.gore=!settings.gore;world.applySettings(settings);step(0);report();};
$('city-seed').onchange=setup;
$('biome').onchange=()=>{district=+$('biome').value;setup();};$('advance').onclick=()=>{for(let i=0;i<6;i++)step(1/60);report();};$('replay').onclick=setup;
window.addEventListener('resize',()=>{world.resize();world.update(sim,0,['map','city'].includes(scene));});setup();requestAnimationFrame(loop);
