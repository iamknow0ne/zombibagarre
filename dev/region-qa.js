import {travelGate,safeRegionPoint} from '../src/rebuild/Regions.js';
export function installRegionQA(input,getSim,getWorld){
 let cityDamage=null;
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='region-qa')return;
  const action=event.data.action;window.focus();
  if(action==='start'){document.getElementById('start').click();return;}
  if(action==='interact'){input.once.interact=true;return;}
  if(action==='map'){document.getElementById('map-action').click();return;}
  if(action==='touch'){input.source='touch';return;}
  const s=getSim();
  if(action==='damage'&&s.activeRegionId==='city'){
   const b=s.props.find(p=>p.kind==='building');if(b){s.damageProp(b,b.maxHealth*.45,{weapon:'launcher'});cityDamage={id:b.id,health:b.health};}
   const c=s.props.find(p=>p.kind==='crate');if(c)s.damageProp(c,c.maxHealth+1,{weapon:'launcher'});
   return;
  }
  if(action==='clear-guards'){for(const e of s.enemies)if(s.countryEncounter?.guardIds.includes(e.id))s.damageEnemy(e,e.health+1,e.x,e.z,{kind:'ballistic',weapon:'carbine'});return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();input.clear();
  if(action==='resume')return;
  const building=cityDamage&&s.activeRegionId==='city'?s.props.find(p=>p.id===cityDamage.id):null;
  const facade=building?[{x:building.x+building.w/2+4,z:building.z},{x:building.x-building.w/2-4,z:building.z},{x:building.x,z:building.z+building.d/2+4}].find(p=>safeRegionPoint(s,p)):null;
  const point=action==='inspect-damage'?facade:action==='gate'?travelGate(s):action==='supply'?s.layout.region?.supply:action==='medic'?s.places?.find(p=>p.npc==='medic'||p.id==='medic'):null;
  if(point){Object.assign(s.player,{x:point.x,z:point.z,y:0,grounded:true,vehicleId:null,dash:0,meleeAttack:null,throwAnimation:0,invulnerable:999});if(action!=='supply')s.enemies=s.enemies.filter(e=>Math.hypot(e.x-point.x,e.z-point.z)>12);s.spawnTimer=999;}
 });
 setInterval(()=>{const s=getSim(),w=getWorld(),b=cityDamage&&s.props.find(p=>p.id===cityDamage.id);parent.postMessage({type:'region-report',value:{state:s.state,region:s.activeRegionId,gate:travelGate(s),x:s.player.x,z:s.player.z,health:s.player.health,ammo:s.player.magazines.carbine,wave:s.wave,toSpawn:s.toSpawn,enemies:s.enemies.length,accepted:s.rpg?.accepted,claimed:s.rpg?.claimed,supply:s.rpg?.countrySupplies||false,savedRegions:s.regions?.size,cityDamage,returnedDamage:s.activeRegionId==='city'&&b?b.health:null,drawCalls:w.renderer.info.render.calls,geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures}},location.origin);},500);
}
