import {nearbyInteriorRecovery,resolveExteriorExit} from '../src/rebuild/Interiors.js';
import {beginBossAttack,bossContains} from '../src/rebuild/Bosses.js';
export function installInteriorQA(input,getSim,getWorld){
 let frozen=null,exitThreat=null,trackedLane=null;const snapshot=s=>JSON.stringify({time:s.time,wave:s.wave,spawnTimer:s.spawnTimer,weather:s.weather,health:s.player.health,enemies:s.enemies.map(e=>[e.id,e.x,e.z,e.health]),bullets:s.bullets});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='interior-qa')return;
  const action=event.data.action;window.focus();
  if(action==='start'){document.getElementById('start').click();return;}
  if(action==='touch'){input.source='touch';return;}
  const sim=getSim();
  if(action==='resume'){document.querySelectorAll('dialog[open]').forEach(d=>d.close());sim.resume();input.clear();return;}
  if(action==='freeze-check'){frozen=snapshot(sim);return;}
  if(action==='interact'){input.once.interact=true;return;}
  if(action==='journal'){document.getElementById('interior-header').querySelector('button').click();return;}
  if(action==='destroy-host'){const plan=sim.interior?.plan||sim.interiorState?.manifest.find(p=>p.template==='apartment-v1');const host=sim.props.find(p=>p.id===plan?.buildingId);if(host){host.health=0;sim.geometryRevision++;}return;}
  if(action==='recovery'){const plan=sim.interiorState?.manifest.find(p=>p.template==='apartment-v1');if(plan){sim.player.x=plan.door.x;sim.player.z=plan.door.z;const recovery=nearbyInteriorRecovery(sim);if(recovery){sim.player.x=recovery.x;sim.player.z=recovery.z;}}return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());sim.resume();input.clear();
  if(action==='threatened-exit'&&sim.interior){
   const d=sim.interior.plan.door,exit=sim.interior.plan.objects.find(o=>o.type==='exit');
   Object.assign(sim.interior.pose,{x:exit.x,z:exit.z,moving:false});sim.player.invulnerable=0;
   sim.bullets.push({id:sim.nextId++,x:d.x-3,y:1,z:d.z,vx:20,vy:0,vz:0,life:1,damage:5,enemy:true});
   exitThreat={door:{x:d.x,z:d.z},health:sim.player.health,arrival:resolveExteriorExit(sim)};return;
  }
  if(action==='boss-lane-exit'&&sim.interior){
   const d=sim.interior.plan.door,exit=sim.interior.plan.objects.find(o=>o.type==='exit');
   Object.assign(sim.interior.pose,{x:exit.x,z:exit.z,moving:false});sim.player.invulnerable=0;
   sim.enemies=[];sim.hazards=[];sim.bullets=[];
   const boss=sim.spawnEnemy('boss',d.x+d.nx*17,d.z+d.nz*17);
   Object.assign(boss,{x:d.x+d.nx*17,z:d.z+d.nz*17,bossPhase:1,bossStarted:true});beginBossAttack(sim,boss,'harpoon');
   boss.bossTimer=.15;const lane=sim.hazards.find(h=>h.bossOwner===boss.id);lane.timer=.15;
   const arrival=resolveExteriorExit(sim);
   trackedLane=lane;exitThreat={kind:'boss-lane',setupTime:sim.time,door:{x:d.x,z:d.z},health:sim.player.health,arrival,lane:{...lane},doorThreatened:bossContains(lane,{...d,y:0,radius:.65}),arrivalThreatened:arrival?bossContains(lane,{...arrival,radius:.65}):null};return;
  }
  if(['workshop-door','apartment-door'].includes(action)&&!sim.interior){const plan=sim.interiorState?.manifest.find(p=>p.template===(action==='workshop-door'?'workshop-v1':'apartment-v1'));if(!plan)return;sim.player.x=plan.door.x;sim.player.z=plan.door.z;sim.player.y=0;sim.player.grounded=true;sim.player.vehicleId=null;sim.player.invulnerable=999;sim.spawnTimer=999;sim.toSpawn=999;sim.enemies=[];return;}
  const object=sim.interior?.plan.objects.find(o=>o.id===({mara:'mara',case:'tool-case',exit:'exit'}[action]));
  if(object){Object.assign(sim.interior.pose,{x:object.x,z:object.z,moving:false});return;}
 });
 setInterval(()=>{const sim=getSim(),world=getWorld();if(trackedLane&&exitThreat?.kind==='boss-lane'&&!exitThreat.resolution&&trackedLane.done)exitThreat.resolution={time:sim.time,health:sim.player.health,insideLane:bossContains(trackedLane,sim.player)};parent.postMessage({type:'interior-report',value:{state:sim.state,room:sim.interior?.plan.template||null,pose:sim.interior?.pose,rooms:sim.interiorState?.manifest.map(p=>({id:p.id,template:p.template})),collected:sim.interiorState?.collected,accepted:sim.rpg.accepted,claimed:sim.rpg.claimed,crowns:sim.rpg.coins,xp:sim.profile.xp,exitThreat:exitThreat&&{...exitThreat,player:{x:sim.player.x,z:sim.player.z},healthNow:sim.player.health},exteriorFrozen:frozen===null?null:frozen===snapshot(sim),drawCalls:world.renderer.info.render.calls,geometries:world.renderer.info.memory.geometries,textures:world.renderer.info.memory.textures}},location.origin);},500);
}
