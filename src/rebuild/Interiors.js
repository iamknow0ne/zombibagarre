import {clamp,distance,pointBlocked,lineBlocked} from './config.js';
import {insideMap,segmentInMap} from './Map.js';
import {waterAt} from './City.js';
import {endFocus} from './BulletTime.js';
import {levelForXP} from './RPG.js';
import {testing} from './Progression.js';
import {safeRegionPoint} from './Regions.js';

const RADIUS=.4,REACH=2.2;
const liveProps=sim=>(sim.props||[]).filter(o=>o.health>0);
const host=(sim,plan)=>(sim.props||[]).find(p=>p.id===plan.buildingId&&p.health>0);
const onFoot=sim=>sim.player.health>0&&!sim.player.vehicleId&&Math.abs(sim.player.y||0)<.15&&sim.player.grounded!==false&&!sim.player.grapple;
const collected=(sim,plan,object)=>sim.interiorState.collected.includes(`${plan.id}:${object.id}`);
const clearPoint=(sim,p,radius=.65)=>!waterAt(sim.layout,p.x,p.z)&&insideMap(sim.layout,p.x,p.z,radius)&&!pointBlocked(p.x,p.z,radius,liveProps(sim));
const clearPath=(sim,a,b)=>!lineBlocked(a,b,RADIUS,liveProps(sim))&&segmentInMap(sim.layout,a,b,RADIUS);
// Exterior threats pause while indoors. Check their projected return path too,
// so leaving a room cannot resume a frozen bullet or burning wall into the hero.
const safePoint=(sim,p)=>safeRegionPoint(sim,p,.65);
function makePlan(sim,building,door,template){
 if(template==='retro-room-v1')return {
  id:`city:${sim.layout.mapSeed??sim.seed}:1:${building.id}:${template}`,template,name:'The Last Checkpoint',buildingId:building.id,door:{...door},spawn:{x:0,z:3.6},bounds:{minX:-6,maxX:6,minZ:-5.5,maxZ:5},
  obstacles:[{id:'crt-table',role:'media',x:0,z:-4,w:3.4,d:1.3,h:1.25},{id:'dormant-left',role:'archive',x:-4.35,z:-4,w:2,d:1.3,h:1.25},{id:'dormant-right',role:'archive',x:4.35,z:-4,w:2,d:1.3,h:1.25},{id:'couch',role:'sofa',x:0,z:1,w:3.3,d:1.2,h:.9},{id:'shelf',role:'cartridges',x:-5.4,z:.3,w:.6,d:3,h:1.9},{id:'cooler',role:'cooler',x:5,z:2,w:1,d:1,h:1.7}],
  objects:[{id:'console-snes',type:'console',consoleId:'snes',x:0,z:-2.65,radius:1.45,display:{x:0,z:-4}},{id:'console-ps1',type:'console',consoleId:'ps1',x:-4.35,z:-2.65,radius:1.4,display:{x:-4.35,z:-4}},{id:'console-genesis',type:'console',consoleId:'genesis',x:4.35,z:-2.65,radius:1.4,display:{x:4.35,z:-4}},{id:'exit',type:'exit',x:0,z:4.2,radius:1.6}]
 };
 const workshop=template==='workshop-v1';
 return {id:`city:${sim.layout.mapSeed??sim.seed}:1:${building.id}:${template}`,template,name:workshop?"Mara's workshop":'The abandoned apartment',buildingId:building.id,door:{...door},spawn:{x:0,z:3.6},bounds:workshop?{minX:-6,maxX:6,minZ:-5,maxZ:5}:{minX:-5,maxX:5,minZ:-6,maxZ:5},
  obstacles:workshop?[
   {id:'bench',role:'bench',x:-3,z:-1.8,w:3,d:1.3,h:.95},
   {id:'rack',role:'rack',x:3,z:-2.5,w:1.3,d:3,h:2.2},
   {id:'crates',role:'crate',x:-4,z:2,w:1.2,d:1.2,h:.9}
  ]:[
   {id:'partition',role:'partition',x:1,z:0,w:8,d:.35,h:2.5},
   {id:'bed',role:'bed',x:0,z:-3,w:2.2,d:3,h:.6},
   {id:'sofa',role:'sofa',x:2.8,z:2,w:2,d:1.2,h:.9},
   {id:'locker',role:'locker',x:3,z:-4.8,w:1.7,d:.7,h:1.5}
  ],objects:[workshop?{id:'mara',type:'merchant',merchantId:'smith',x:-2,z:-.2,radius:1.6}:{id:'tool-case',type:'case',x:3,z:-4.1,radius:1.4},{id:'exit',type:'exit',x:0,z:4.2,radius:1.6}]};
}
// Manifest belongs to this expedition, never to the permanent hero save.
export function initializeInteriors(sim){
 sim.interior=null;sim.interiorState={manifest:[],visited:[],collected:[]};
 if(!sim.layout.city||sim.layout.country)return sim.interiorState;
 const smith=sim.places?.find(p=>p.id==='smith'),building=smith&&host(sim,smith);
 if(!building||!clearPoint(sim,smith,1))return sim.interiorState;
 const nx=Math.round(Math.sin(smith.angle||0)),nz=Math.round(Math.cos(smith.angle||0));
 const workshop=makePlan(sim,building,{x:smith.x,z:smith.z,nx,nz},'workshop-v1');sim.interiorState.manifest.push(workshop);
 const occupied=new Set((sim.places||[]).map(p=>p.buildingId).filter(Boolean));
 const buildings=liveProps(sim).filter(p=>p.kind==='building'&&p.primary&&!occupied.has(p.id)).sort((a,b)=>distance(a,smith)-distance(b,smith)||a.id.localeCompare(b.id));
 let nextTemplate='apartment-v1';
 for(const b of buildings){
  for(const [dx,dz]of [[0,1],[1,0],[0,-1],[-1,0]]){
   const door={x:b.x+dx*(b.w/2+2),z:b.z+dz*(b.d/2+2),nx:dx,nz:dz};
   if(!clearPoint(sim,door,1)||sim.places.some(p=>distance(p,door)<5))continue;
   // Use a real, dry street connection; a geometrically empty courtyard alone is insufficient.
   if(!(sim.layout.spawnPoints||[]).some(p=>distance(p,door)<24&&clearPath(sim,p,door)))continue;
   sim.interiorState.manifest.push(makePlan(sim,b,door,nextTemplate));
   if(nextTemplate==='retro-room-v1')return sim.interiorState;
   nextTemplate='retro-room-v1';break;
  }
 }
 return sim.interiorState;
}
export function retroConsoleStatus(sim,consoleId){
 const available=consoleId==='snes',unlocked=available&&(testing(sim)||levelForXP(sim.profile?.xp||0).level>=3);
 return {available,unlocked,label:consoleId==='snes'?'SNES':consoleId==='ps1'?'PlayStation':consoleId==='genesis'?'Mega Drive / Genesis':'Unknown console',reason:!available?'Archive display · not playable in this version':unlocked?'Ready · play Zombie Bagarre / SNES':'Reach hero level 3 to restore this console'};
}
export function nearbyInteriorDoor(sim){
 if(sim.interior||!onFoot(sim))return null;
 return (sim.interiorState?.manifest||[]).filter(p=>host(sim,p)&&distance(sim.player,p.door)<=REACH&&clearPath(sim,sim.player,p.door)).sort((a,b)=>distance(a.door,sim.player)-distance(b.door,sim.player))[0]||null;
}
export function resolveExteriorExit(sim,session=sim.interior){
 if(!session?.plan)return null;
 const d=session.plan.door,candidates=[d];
 for(const out of [1.2,2.4,4,6])for(const side of [0,1.5,-1.5,3,-3])candidates.push({x:d.x+d.nx*out-d.nz*side,z:d.z+d.nz*out+d.nx*side});
 // The recorded entry and validated nearby street refuge are last resorts if rubble fills the apron.
 if(session.exteriorPose)candidates.push(session.exteriorPose);
 if(session.refuge)candidates.push(session.refuge);
 const point=candidates.find(p=>safePoint(sim,p));return point?{x:point.x,y:0,z:point.z}:null;
}
export function beginInterior(sim,id){
 if(!['playing','extracting'].includes(sim.state)||sim.interior||!onFoot(sim)||sim.player.dash>0||sim.player.meleeAttack||sim.player.throwAnimation>0)return false;
 const plan=nearbyInteriorDoor(sim);if(!plan||plan.id!==id)return false;
 const refuge=(sim.layout.spawnPoints||[]).filter(p=>distance(p,plan.door)<24&&safePoint(sim,p)&&clearPath(sim,plan.door,p)).sort((a,b)=>distance(a,plan.door)-distance(b,plan.door))[0];
 const session={plan,returnState:sim.state,exteriorPose:{x:sim.player.x,y:sim.player.y||0,z:sim.player.z,angle:sim.player.angle},refuge:refuge?{x:refuge.x,z:refuge.z}:null,pose:{...plan.spawn,angle:Math.PI,moving:false,moveX:0,moveZ:0}};
 if(!resolveExteriorExit(sim,session))return false;
 endFocus(sim,true);sim.interior=session;sim.state='interior';
 if(!sim.interiorState.visited.includes(plan.id))sim.interiorState.visited.push(plan.id);
 sim.emit('interior-enter',{interiorId:plan.id,template:plan.template});return true;
}
export function interiorInteraction(sim){
 const room=sim.interior;if(!room||!['interior','paused'].includes(sim.state)||sim.player.health<=0)return null;
 return room.plan.objects.filter(o=>!collected(sim,room.plan,o)&&distance(o,room.pose)<=o.radius&&!lineBlocked(room.pose,o,.05,room.plan.obstacles)).sort((a,b)=>distance(a,room.pose)-distance(b,room.pose))[0]||null;
}
export function stepInterior(sim,input={},dt=0){
 const room=sim.interior;if(sim.state!=='interior'||!room)return;
 if(sim.player.health<=0){sim.interior=null;sim.state='dead';return;}
 const pose=room.pose,b=room.plan.bounds;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
 let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}if(len<.1)x=z=0;
 const oldX=pose.x,oldZ=pose.z,speed=clamp(sim.player.speed||5.2,1,9),steps=Math.max(1,Math.ceil(speed*dt/.15));
 // Small axis sweeps slide along furniture and cannot tunnel through the thin partition.
 for(let i=0;i<steps;i++){
  const nextX=clamp(pose.x+x*speed*dt/steps,b.minX+RADIUS,b.maxX-RADIUS);
  if(!lineBlocked(pose,{x:nextX,z:pose.z},RADIUS,room.plan.obstacles))pose.x=nextX;
  const nextZ=clamp(pose.z+z*speed*dt/steps,b.minZ+RADIUS,b.maxZ-RADIUS);
  if(!lineBlocked(pose,{x:pose.x,z:nextZ},RADIUS,room.plan.obstacles))pose.z=nextZ;
 }
 pose.moveX=dt?(pose.x-oldX)/dt:0;pose.moveZ=dt?(pose.z-oldZ)/dt:0;pose.moving=Math.hypot(pose.moveX,pose.moveZ)>.05;
 if(pose.moving)pose.angle=Math.atan2(pose.moveX,pose.moveZ);
 if(input.interact){const object=interiorInteraction(sim);if(object){
  if(object.type==='console'){const status=retroConsoleStatus(sim,object.consoleId);if(status.unlocked)sim.emit('interior-console',{interiorId:room.plan.id,objectId:object.id,consoleId:object.consoleId});else sim.emit('rpg-notice',{message:status.reason});}
  else sim.emit('interior-interact',{interiorId:room.plan.id,objectId:object.id,interaction:object.type,merchantId:object.merchantId});
 }}
}
export function endInterior(sim){
 const room=sim.interior;if(!room||sim.state!=='interior'||sim.player.health<=0)return false;
 // Exiting is a local interaction, not a teleport available from anywhere in the room.
 if(interiorInteraction(sim)?.type!=='exit')return false;
 const exit=resolveExteriorExit(sim);if(!exit)return false;
 Object.assign(sim.player,exit,{angle:room.exteriorPose.angle,grounded:true,supportId:null,grapple:null,vy:0,vx:0,vz:0,moving:false,moveX:0,moveZ:0});
 sim.interior=null;sim.state=room.returnState==='extracting'?'extracting':'playing';sim.previousState=sim.state;
 sim.emit('interior-exit',{interiorId:room.plan.id,...exit});return true;
}
export function interiorDestination(sim,plan){
 if(!plan)return null;return host(sim,plan)?(clearPoint(sim,plan.door)?{...plan.door,y:0}:null):resolveExteriorExit(sim,{plan});
}
export function nearbyInteriorRecovery(sim){
 if(sim.interior||!onFoot(sim)||!['playing','extracting','paused'].includes(sim.state))return null;
 for(const plan of sim.interiorState?.manifest||[]){
  if(!['apartment-v1','workshop-v1'].includes(plan.template)||host(sim,plan))continue;
  if(plan.template==='apartment-v1'&&hasInteriorCase(sim))continue;
  const point=interiorDestination(sim,plan);if(!point||distance(point,sim.player)>REACH||!clearPath(sim,sim.player,point))continue;
  return {plan,...point,type:plan.template==='apartment-v1'?'case':'merchant',...(plan.template==='workshop-v1'?{merchantId:'smith'}:{})};
 }return null;
}
export function hasInteriorCase(sim){return (sim.interiorState?.manifest||[]).some(p=>p.objects.some(o=>o.id==='tool-case'&&collected(sim,p,o)));}
export function collectInteriorCase(sim,objectId='tool-case'){
 if(objectId!=='tool-case'||!sim.rpg?.accepted?.includes('workshop-tools'))return false;
 let plan;
 if(sim.interior){if(sim.state!=='interior'||interiorInteraction(sim)?.id!==objectId)return false;plan=sim.interior.plan;}
 else{const recovery=nearbyInteriorRecovery(sim);if(recovery?.type!=='case'||!['playing','extracting'].includes(sim.state))return false;plan=recovery.plan;}
 const object=plan.objects.find(o=>o.id===objectId);if(!object||collected(sim,plan,object))return false;
 const collectionId=`${plan.id}:${objectId}`;sim.interiorState.collected.push(collectionId);sim.emit('interior-case',{interiorId:plan.id,objectId,collectionId});return true;
}
