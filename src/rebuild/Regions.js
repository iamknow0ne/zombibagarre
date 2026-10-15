import {distance,pointBlocked,lineBlocked,segmentCircle} from './config.js';
import {insideMap,segmentInMap} from './Map.js';
import {waterAt} from './City.js';
import {bossContains} from './Bosses.js';

// In-memory expedition state only. Nothing here is written into SaveStore.
export const REGION_FIELDS=['layout','props','enemies','bullets','hazards','pickups','fires','structures','rubblePiles','wetGround','streetEvents','places','visited','interiorState','traversalRewardClaimed','geometryRevision','toSpawn','spawnTimer','waveKills','waveTotal','waveBaseCount','nightReinforced','extraction','countryEncounter'];
const solids=view=>(view.props||[]).filter(o=>o.health>0);
function projectileThreat(view,p,radius){
 return (view.bullets||[]).some(b=>{
  if(b.life<=0||!b.enemy&&b.weapon!=='launcher')return false;
  const t=Math.min(.3,b.life??.3),end={x:b.x+(b.vx||0)*t,z:b.z+(b.vz||0)*t},y=b.y??.9,endY=y+(b.vy||0)*t;
  return Math.min(y,endY)<2&&Math.max(y,endY)>-.3&&segmentCircle(b.x,b.z,end.x,end.z,p.x,p.z,radius+(b.radius||.15));
 });
}
function regionalView(sim,saved,id){
 const view=Object.assign(Object.create(Object.getPrototypeOf(sim)),sim,saved,{activeRegionId:id,interior:null,player:sim.player,navigation:new Map(),collisionIndex:null,questRoute:null,guideRoute:null,traversalTarget:null});
 view.obstacles=solids(view);return view;
}
export function safeRegionPoint(view,p,radius=.65){
 return Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&insideMap(view.layout,p.x,p.z,radius)&&!waterAt(view.layout,p.x,p.z)&&!pointBlocked(p.x,p.z,radius,solids(view))&&
 !(view.enemies||[]).some(e=>e.health>0&&distance(e,p)<(e.radius||.5)+radius+1)&&
 !(view.fires||[]).some(f=>distance(f,p)<(f.radius||1)+radius)&&
 !(view.props||[]).some(o=>o.health>0&&o.burning>0&&distance(o,p)<Math.hypot(o.w||1,o.d||1)/2+radius)&&
 // Boss lane radius describes half its width, not its full 19m footprint.
 // Use the combat predicate with the arrival body's ground height and margin.
 !(view.hazards||[]).some(h=>!h.done&&(h.bossOwner&&h.shape==='lane'?bossContains(h,{x:p.x,y:0,z:p.z,radius}):distance(h,p)<(h.radius||1)+radius))&&!projectileThreat(view,p,radius);
}
// Reuse Simulation's real pedestrian flow field, rooted at the expedition spawn.
// A safe point can still belong to a detached road/island: require a reachable
// neighbouring grid cell with an unobstructed attachment to the candidate.
function reachableGateSelector(sim){
 const origin=sim.layout.spawn||{x:0,z:3},radius=.4,view=regionalView(sim,{},'city');
 if(typeof view.navigate!=='function')return ()=>false;
 view.navigate({...origin,radius},origin);
 const nav=view.navigation.get(String(radius)),b=sim.layout.bounds,step=sim.layout.city?2:1,cols=Math.ceil((b.maxX-b.minX)/step),rows=Math.ceil((b.maxZ-b.minZ)/step);
 return candidate=>{
  if(!nav)return false;
  const cx=Math.floor((candidate.x-b.minX)/step),cz=Math.floor((candidate.z-b.minZ)/step);
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
   const x=cx+dx,z=cz+dz,i=z*cols+x;if(x<0||x>=cols||z<0||z>=rows||nav.blocked[i]||nav.costs[i]>=32767)continue;
   const point={x:(x+.5)*step+b.minX,z:(z+.5)*step+b.minZ};
   if(segmentInMap(sim.layout,candidate,point,radius)&&!lineBlocked(candidate,point,radius,view.obstacles))return true;
  }
  return false;
 };
}
export function initializeRegions(sim){
 sim.regions=null;sim.activeRegionId=null;sim.pendingTravel=null;sim.regionGates=null;
 if(sim.mode!=='city'||sim.layout.country)return;
 const candidates=(sim.layout.spawnPoints||[]).filter(p=>Math.hypot(p.x,p.z)>25&&safeRegionPoint(sim,p,1.6)&&!(sim.places||[]).some(q=>distance(q,p)<7));
 // Spawn points belong to the generated connected street network. Prefer a
 // distant street, but do not put a gate on the coastline or in a courtyard.
 candidates.sort((a,b)=>Math.hypot(b.x,b.z)-Math.hypot(a.x,a.z));
 const reachable=reachableGateSelector(sim),gate=candidates.find(reachable);if(!gate)return;
 sim.activeRegionId='city';sim.regions=new Map();sim.regionGates={city:{id:'city-road-exit',...gate,angle:Math.atan2(-gate.x,-gate.z),name:'OLD MILL ROAD',destination:'country-road'},'country-road':null};
}
export function travelGate(sim){return sim.regionGates?.[sim.activeRegionId]||null;}
export function nearbyTravelGate(sim){
 const gate=travelGate(sim),p=sim.player;if(sim.interior||!gate||distance(p,gate)>3)return null;
 return !lineBlocked(p,gate,.4,solids(sim))&&segmentInMap(sim.layout,p,gate,.4)?gate:null;
}
export function regionView(sim,id){
 if(sim.activeRegionId===id||!sim.regions&&id==='city')return sim;
 const saved=sim.regions?.get(id);return saved?regionalView(sim,saved,id):null;
}
export function captureRegion(sim,state=sim.state){
 const saved=Object.fromEntries(REGION_FIELDS.map(k=>[k,sim[k]]));
 return {...saved,state,parkedAt:sim.time,waypoint:sim.player.waypoint?.source==='manual'?{...sim.player.waypoint}:null};
}
export function travelUnavailable(sim){
 const p=sim.player;
 if(sim.state!=='playing'||sim.pendingTravel||sim.interior||p.health<=0)return 'Finish the current action before travelling.';
 if(p.vehicleId)return 'Park and leave your vehicle before taking the footpath.';
 if(Math.abs(p.y||0)>.15||p.grounded===false||p.grapple||p.dash>0||p.meleeAttack||p.throwAnimation>0)return 'Stand on the ground before travelling.';
 const gate=nearbyTravelGate(sim);if(!gate)return 'Reach the marked footpath to travel.';
 if(!safeRegionPoint(sim,p,.7)||(sim.enemies||[]).some(e=>e.health>0&&distance(e,gate)<10))return 'Clear the threats near the footpath first.';
 return null;
}
export function requestRegionTravel(sim){
 if(!nearbyTravelGate(sim))return false;
 const reason=travelUnavailable(sim);if(reason){sim.emit('rpg-notice',{message:reason});return true;}
 const gate=travelGate(sim);sim.pendingTravel={sourceId:sim.activeRegionId,targetId:gate.destination,returnState:sim.state};sim.state='travelling';sim.emit('region-travel');return true;
}
export function resolveRegionArrival(view,gate){
 if(!gate)return null;
 const candidates=[gate];
 for(const radius of [1.8,3.6,5.4,7.2])for(let i=0;i<12;i++){const a=(gate.angle||0)+i*Math.PI/6;candidates.push({x:gate.x+Math.sin(a)*radius,z:gate.z+Math.cos(a)*radius});}
 const found=candidates.find(p=>safeRegionPoint(view,p));return found?{x:found.x,y:0,z:found.z,angle:gate.angle||0}:null;
}
export function completeRegionTravel(sim,prepareVisuals=()=>null){
 const pending=sim.pendingTravel;if(sim.state!=='travelling'||!pending||pending.sourceId!==sim.activeRegionId)return {ok:false};
 const source=captureRegion(sim,pending.returnState);let prepared;
 try{
  if(!(sim.regions instanceof Map)||!['city','country-road'].includes(pending.targetId)||pending.targetId===pending.sourceId||travelGate(sim)?.destination!==pending.targetId)throw new Error('The destination is unavailable.');
  const saved=sim.regions.get(pending.targetId);
  if(!saved&&pending.targetId==='city')throw new Error('The city snapshot is unavailable.');
  const destination=saved||sim.createCountryRegion();
  if(!destination||!!destination.layout?.country!==(pending.targetId==='country-road'))throw new Error('The destination layout is invalid.');
  const gate=sim.regionGates[pending.targetId]||destination.layout.region?.gate;
  const view=regionalView(sim,destination,pending.targetId);view.events=[];
  const arrival=resolveRegionArrival(view,gate);if(!arrival)throw new Error('The arrival path is blocked. Clear it before returning.');
  view.player={...sim.player,...arrival,waypoint:destination.waypoint||null,moving:false,moveX:0,moveZ:0,grapple:null,supportId:null,traversal:view.layout.traversal?'campaign':false};
  prepared=prepareVisuals(view);
  if(prepared&&typeof prepared.then==='function')throw new Error('Travel preparation must finish before committing the destination.');
  // All fallible preparation precedes the commit. The exact hero/ledger stays
  // alive; no start, reward, healing or damage function is called here.
  const elapsed=Math.max(0,sim.time-(destination.parkedAt??sim.time));
  for(const e of destination.enemies||[])if(Number.isFinite(e.lastHitAt))e.lastHitAt+=elapsed;
  sim.regions.set(pending.sourceId,source);sim.regions.set(pending.targetId,destination);
  for(const k of REGION_FIELDS)sim[k]=destination[k];
  sim.obstacles=solids(sim);sim.navigation.clear();sim.collisionIndex=null;sim.questRoute=null;sim.guideRoute=null;sim.traversalTarget=null;sim.interior=null;
  sim.activeRegionId=pending.targetId;sim.state=destination.state==='extracting'?'extracting':'playing';sim.previousState=sim.state;sim.pendingTravel=null;
  if(!sim.regionGates['country-road'])sim.regionGates['country-road']={id:'road-city-exit',...destination.layout.region.gate,name:'SAINT-ROCH',destination:'city'};
  sim.nextId=Math.max(sim.nextId,destination.nextEntityId||0);
  Object.assign(sim.player,arrival,{waypoint:destination.waypoint||null,traversal:sim.layout.traversal?'campaign':false,grounded:true,supportId:null,grapple:null,vy:0,vx:0,vz:0,slideX:0,slideZ:0,moving:false,moveX:0,moveZ:0,attackHeld:false,meleeBuffer:null,aiming:false,jumpBuffer:0});
  return {ok:true,prepared,regionId:sim.activeRegionId};
 }catch(error){sim.state=pending.returnState;sim.pendingTravel=null;sim.emit('rpg-notice',{message:'Travel cancelled. '+error.message});return {ok:false,error,prepared};}
}
export function nearbyCountrySupply(sim){
 const supply=sim.layout.country&&sim.layout.region?.supply;
 if(!supply||sim.state!=='playing'||sim.player.health<=0||sim.interior||sim.player.vehicleId||sim.player.grounded===false||sim.player.grapple||Math.abs(sim.player.y||0)>.15||distance(sim.player,supply)>2.8||lineBlocked(sim.player,supply,.4,solids(sim)))return null;
 return supply;
}
export function collectCountrySupply(sim){
 if(!nearbyCountrySupply(sim))return false;
 if(!sim.rpg?.accepted.includes('country-supplies')){sim.emit('rpg-notice',{message:'Sealed medical supplies. Ask Dr. Lenoir about the country route.'});return true;}
 if(sim.rpg.countrySupplies){sim.emit('rpg-notice',{message:'Supplies already recovered. Return to Dr. Lenoir.'});return true;}
 if(sim.enemies.some(e=>e.health>0&&sim.countryEncounter?.guardIds.includes(e.id))){sim.emit('rpg-notice',{message:'Clear the supply yard before recovering the medicine.'});return true;}
 sim.rpg.countrySupplies=true;sim.emit('rpg-notice',{message:'MEDICAL SUPPLIES RECOVERED · RETURN TO LENOIR IN SAINT-ROCH'});return true;
}
