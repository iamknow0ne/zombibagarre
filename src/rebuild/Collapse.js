import {actorSpan,verticalGap} from './Ballistics.js';
import {seededRandom,clamp,segmentBoxTime} from './config.js';
import {waterAt} from './City.js';

// Metres, seconds, gravity. Coarse structural bodies own gameplay; chips are cosmetic.
export function fractureBuilding(b,seed=1){
 const r=seededRandom(seed),h=b.h||8,floors=Math.max(1,Math.round(h/2.8)),parts=[];
 const push=(x,y,z,w,t,d,material,floor)=>parts.push({id:`${b.id}-fracture-${parts.length}`,buildingId:b.id,x,y,z,w:w*(.68+r()*.3),h:t+(t<.4?r()*.16:0),d:d*(.68+r()*.3),material,age:0,delay:floor*.11+r()*.16,vx:(x-b.x)*.12+(r()-.5)*1.7,vz:(z-b.z)*.12+(r()-.5)*1.7,vy:0,rx:0,ry:r()*.1,rz:0,spinX:(r()-.5)*1.1,spinZ:(r()-.5)*1.1,restX:(r()-.5)*.32,restZ:(r()-.5)*.32,canBreak:parts.length%3===0,sleep:false,bounces:0});
 const nx=Math.min(4,Math.max(2,Math.ceil(b.w/3))),nz=Math.min(4,Math.max(2,Math.ceil(b.d/3)));
 for(let f=0;f<floors;f++){
  const y=Math.min(h,(f+1)*2.8);
  for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++)push(b.x-b.w/2+(ix+.5)*b.w/nx,y,b.z-b.d/2+(iz+.5)*b.d/nz,b.w/nx*.94,.22,b.d/nz*.94,'concrete',f);
  for(const side of [-1,1]){
   for(let i=0;i<nx;i++)push(b.x-b.w/2+(i+.5)*b.w/nx,y-1.3,b.z+side*b.d/2,b.w/nx*.92,2.35,.3,b.material||'brick',f);
   for(let i=0;i<nz;i++)push(b.x+side*b.w/2,y-1.3,b.z-b.d/2+(i+.5)*b.d/nz,.3,2.35,b.d/nz*.92,b.material||'brick',f);
  }
 }
 return parts;
}
export function startCollapse(sim,b){
 sim.structures??=[];sim.rubblePiles??=new Map();
 // Old sleeping visual fragments may be retired; their gameplay rubble stays.
 const fresh=fractureBuilding(b,sim.seed+sim.nextId++);
 const excess=sim.structures.length+fresh.length-720;
 if(excess>0){let removed=0;sim.structures=sim.structures.filter(p=>!(p.sleep&&removed++<excess));}
 sim.structures.push(...fresh);if(sim.structures.length>1200)sim.structures.splice(0,sim.structures.length-1200);
 if(excess>0){const visiblePiles=new Set(sim.structures.map(c=>`${c.buildingId}:${Math.floor(c.x/2.4)}:${Math.floor(c.z/2.4)}`));sim.props=sim.props.filter(p=>p.kind!=='rubble'||visiblePiles.has(p.pileKey));for(const key of sim.rubblePiles.keys())if(!visiblePiles.has(key))sim.rubblePiles.delete(key);}
 sim.emit('collapse-start',{id:b.id,count:fresh.length});
}
export function updateCollapse(sim,dt){
 if(!sim.structures?.length)return;
 let changed=false,impactBudget=8;
 const walls=sim.obstacles.filter(o=>o.kind!=='rubble');
 for(const c of sim.structures){
  if(c.sleep){if(c.supportId&&!walls.some(o=>o.id===c.supportId)){c.sleep=false;c.supportId=null;c.bounces=0;c.struck=false;}else continue;}c.age+=dt;if(c.age<c.delay)continue;
  // Small substeps prevent thin walls from being skipped by fast fragments.
  const n=Math.ceil(dt/.016),step=dt/n;
  const nearby=walls.filter(o=>Math.abs(o.x-c.x)<o.w/2+Math.max(c.w,c.d)*.5+Math.abs(c.vx)*dt+.5&&Math.abs(o.z-c.z)<o.d/2+Math.max(c.w,c.d)*.5+Math.abs(c.vz)*dt+.5);
  for(let i=0;i<n&&!c.sleep;i++){
   const old={x:c.x,z:c.z,y:c.y};c.vy-=9.81*step;c.y+=c.vy*step;c.x+=c.vx*step;c.z+=c.vz*step;c.rx+=c.spinX*step;c.rz+=c.spinZ*step;
   const hit=nearby.find(o=>o.id!==c.buildingId&&old.y-c.h/2<(o.h||1.5)-.03&&c.y-c.h/2<(o.h||1.5)&&segmentBoxTime(old,c,o,Math.min(c.w,c.d)*.3)!==null);
   if(hit){if(Math.abs(old.x-hit.x)>hit.w/2){c.x=old.x;c.vx*=-.22;}else{c.z=old.z;c.vz*=-.22;}c.spinX*=.6;c.spinZ*=.6;}
   const wet=waterAt(sim.layout,c.x,c.z),key=`${c.buildingId}:${Math.floor(c.x/2.4)}:${Math.floor(c.z/2.4)}`;
   if(wet&&c.y<0&&!c.splashed){c.splashed=true;sim.splashWater(c.x,c.z,Math.min(5,Math.sqrt(c.w*c.d)+1));c.vx*=.3;c.vz*=.3;c.vy*=.3;}
   const roof=nearby.filter(o=>o.kind==='building'&&o.id!==c.buildingId&&Math.abs(c.x-o.x)<o.w/2&&Math.abs(c.z-o.z)<o.d/2&&(old.y-c.h/2>=(o.h||8)-.03||c.supportId===o.id)).sort((a,b)=>(b.h||8)-(a.h||8))[0];
   const bed=roof?(roof.h||8):wet?-2:(sim.rubblePiles.get(key)||.05),thickness=Math.min(.48,c.h*.5+.08),ground=bed+thickness;
   if(c.y<=ground&&c.vy<0){
    const speed=-c.vy;c.y=ground;c.bounces++;c.supportId=roof?.id||null;
    if(!wet&&speed>5&&c.canBreak&&sim.structures.length<1198){
     c.canBreak=false;const width=c.w,depth=c.d;
     for(const side of [-1,1])sim.structures.push({...c,id:`${c.id}-chip-${side}`,x:c.x+side*width*.28,z:c.z-side*depth*.23,y:ground+.25,w:width*.42,d:depth*.42,h:Math.min(.5,c.h),vx:c.vx+side*speed*.18,vz:c.vz-side*speed*.13,vy:speed*.18,delay:0,age:0,struck:true,canBreak:false,bounces:1});
     c.w*=.62;c.d*=.62;
    }c.vy=speed*.14;c.vx*=.48;c.vz*=.48;c.spinX*=.25;c.spinZ*=.25;
    if(speed>2&&impactBudget-->0&&!wet)sim.emit('structural-impact',{x:c.x,z:c.z,y:c.y,material:c.material,power:clamp(speed/3,1,5),size:Math.sqrt(c.w*c.d)});
    if(speed>3&&!c.struck&&!roof){c.struck=true;const radius=Math.max(.8,Math.min(2.5,Math.hypot(c.w,c.d)*.45));for(const e of sim.enemies)if(e.health>0&&verticalGap(actorSpan(e),{min:bed,max:bed+.9})===0&&Math.hypot(e.x-c.x,e.z-c.z)<radius)sim.damageEnemy(e,speed*8,0,0,{kind:'impact'});if(verticalGap(actorSpan(sim.player),{min:bed,max:bed+.9})===0&&Math.hypot(sim.player.x-c.x,sim.player.z-c.z)<radius)sim.damagePlayer(Math.min(45,speed*2));}
    if(speed<2||c.bounces>=3||c.age>10){
     c.sleep=true;c.vx=c.vy=c.vz=0;c.rx=c.restX;c.rz=c.restZ;
     // Wall sections lie down after impact; floor sections retain their broad shape.
     if(c.h>1){if(c.w<c.d){[c.w,c.h]=[c.h,c.w];}else{[c.d,c.h]=[c.h,c.d];}}
     c.y=bed+c.h/2+Math.abs(c.rx)*c.d*.25+Math.abs(c.rz)*c.w*.25;if(!roof)sim.rubblePiles.set(key,Math.min(1.7,bed+Math.min(.32,c.h)));
     if(!wet&&!roof&&bed>.32&&!sim.props.some(o=>o.pileKey===key)){
      const obstacle={id:`rubble-${c.id}`,pileKey:key,kind:'rubble',material:c.material,x:c.x,z:c.z,w:1.35,d:1.35,h:bed+.35,health:180,maxHealth:180};
      // Do not trap a survivor/vehicle underneath a newly created blocker.
      if(Math.hypot(sim.player.x-c.x,sim.player.z-c.z)>2){sim.props.push(obstacle);changed=true;}
     }
    }
   }
  }
 }
 if(changed){sim.obstacles=sim.props.filter(p=>p.health>0);sim.geometryRevision++;sim.navigation.clear();}
}
