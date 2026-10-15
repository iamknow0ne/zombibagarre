import {distance,pointBlocked} from './config.js';
import {feetHeight,propSpan} from './Ballistics.js';
import {gainXP} from './RPG.js';

export const ROOF_REWARD={coins:60,xp:60,grenades:2};
export function roofEncounter(sim,roof){return sim.rooftopEncounters?.[roof.id]||{state:'dormant',guardId:null};}
const liveRoof=(sim,roof)=>sim.props.some(p=>p.id===roof.buildingId&&p.health>0)&&sim.props.some(p=>p.id===roof.anchor.supportId&&p.health>0);
const onRoof=(p,roof)=>p.grounded&&p.supportId===roof.anchor.supportId&&Math.abs(feetHeight(p)-roof.top)<.08&&!p.vehicleId&&!p.grapple;
export function roofCachePosition(roof){const deck=roof.parts[0];return {x:deck.x,y:roof.top,z:deck.z};}
// Deterministic placement, deliberately separated from the grapple arrival.
// The existing roof owns collision, appearance and the encounter's identity.
export function roofGuardPosition(sim,roof){
 const deck=roof.parts[0],blockers=sim.props.filter(p=>p.health>0&&propSpan(p).max>roof.top+.05&&feetHeight(p)<roof.top+1.75),points=[];
 for(const x of [-.3,0,.3])for(const z of [-.3,0,.3]){const p={x:deck.x+x*deck.w,z:deck.z+z*deck.d};if(distance(p,roof.anchor)>2.8&&!pointBlocked(p.x,p.z,.62,blockers))points.push(p);}
 return points.sort((a,b)=>distance(b,roof.anchor)-distance(a,roof.anchor))[0]||null;
}
export function updateRooftopEncounters(sim){
 if(!['playing','extracting'].includes(sim.state)||sim.interior)return;
 sim.rooftopEncounters??={};
 for(const roof of sim.layout.traversal?.roofs||[]){
  const record=sim.rooftopEncounters[roof.id]??={state:'dormant',guardId:null};
  if(['claimed','lost'].includes(record.state))continue;
  if(!liveRoof(sim,roof)){record.state='lost';continue;}
  if(record.state==='dormant'&&onRoof(sim.player,roof)){
   const point=roofGuardPosition(sim,roof);if(!point){record.state='lost';continue;}
   const e=sim.spawnEnemy('spitter',point.x,point.z);
   Object.assign(e,{y:roof.top,elevated:true,grounded:true,supportId:roof.anchor.supportId,optionalEncounter:true,incidentId:roof.id,roofEncounterId:roof.id,attack:1.6});
   e.health=e.maxHealth=Math.round(e.maxHealth*1.6);record.guardId=e.id;record.state='active';
   sim.emit('rpg-notice',{message:'THE LAST SIGNAL · Clear the rooftop guardian. Supplies are sealed in the green case.'});
  }
  if(record.state==='active'&&!sim.enemies.some(e=>e.id===record.guardId&&e.health>0)){
   record.state='cleared';sim.emit('rpg-notice',{message:'ROOFTOP SECURED · Open the green supply case before leaving.'});
  }
 }
}
export function nearbyRoofCache(sim){
 if(!['playing','extracting'].includes(sim.state)||sim.interior||sim.player.health<=0)return null;
 for(const roof of sim.layout.traversal?.roofs||[]){
  const record=roofEncounter(sim,roof);if(!['active','cleared'].includes(record.state)||!liveRoof(sim,roof)||!onRoof(sim.player,roof))continue;
  const cache=roofCachePosition(roof);if(distance(sim.player,cache)<2)return {...cache,roof,record};
 }
 return null;
}
export function collectRoofCache(sim){
 const target=nearbyRoofCache(sim);if(!target)return false;
 if(target.record.state!=='cleared'){sim.emit('rpg-notice',{message:'SUPPLIES SEALED · Defeat the rooftop guardian first.'});return true;}
 // Commit first: held interaction, a second input or a later region return
 // cannot repeat the grant. The ledger is saved with its region.
 target.record.state='claimed';sim.player.grenades+=ROOF_REWARD.grenades;sim.collect('ammo');sim.score+=600;
 if(sim.rpg&&sim.profile){sim.rpg.coins+=ROOF_REWARD.coins;gainXP(sim,ROOF_REWARD.xp);}
 sim.emit('progression',{category:'discovery',title:'THE LAST SIGNAL',detail:sim.rpg?'+60 CROWNS · +60 XP · AMMO · 2 GRENADES':'AMMO · 2 GRENADES'});
 sim.emit('rpg-notice',{message:'LAST SIGNAL RECOVERED · A damaged flight manifest mentions a hangar beyond Old Mill Road.'});return true;
}
