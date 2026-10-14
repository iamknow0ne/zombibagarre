import {boxHit3D,propHeight,propSpan} from './Ballistics.js';
import {waterAt} from './City.js';
import {collisionCandidates} from './SpatialIndex.js';

const RADIUS=.12,GROUND=.16,GRAVITY=11/(.65*.65);
export function createThrowableFlight(h){
 return {x:h.originX,y:(h.originY||0)+1.36,z:h.originZ,vx:(h.x-h.originX)/h.flight,vz:(h.z-h.originZ)/h.flight,vy:4.3/h.flight+((h.targetY||0)-(h.originY||0))/h.flight,grounded:false,supportId:null};
}
function faceAt(point,box){
 const faces=[['x',box.x-box.w/2,-1],['x',box.x+box.w/2,1],['z',box.z-box.d/2,-1],['z',box.z+box.d/2,1],['y',propSpan(box).max,1],['y',propSpan(box).min,-1]];
 const [axis,edge,sign]=faces.sort((a,b)=>Math.abs(point[a[0]]-a[1])-Math.abs(point[b[0]]-b[1]))[0];
 return {axis,edge,sign};
}
// The visible projectile and damage share this swept, height-aware flight. Small
// arc segments retain curved flight while thin walls are tested continuously.
export function advanceThrowable(sim,h,dt){
 if(!h.projectile||h.done)return;
 const p=h.projectile;let remaining=Math.min(Math.max(0,dt),Math.max(0,h.timer));
 if(p.grounded){const support=p.supportId&&sim.obstacles.find(o=>o.id===p.supportId&&o.health>0);if(!p.supportId||support){h.x=p.x;h.y=p.y;h.z=p.z;return;}p.grounded=false;p.supportId=null;}
 while(remaining>1e-8){
  const step=Math.min(1/120,remaining),a={x:p.x,y:p.y,z:p.z},b={x:p.x+p.vx*step,y:p.y+p.vy*step-GRAVITY*step*step*.5,z:p.z+p.vz*step};let contact=null;
  for(const o of collisionCandidates(sim,a,b,RADIUS)){
   if(o.health<=0)continue;const box={...o,w:o.w+RADIUS*2,d:o.d+RADIUS*2,y:(o.y||0)-RADIUS,h:propHeight(o)+RADIUS*2},t=boxHit3D(a,b,box);
   if(t!==null&&(!contact||t<contact.t))contact={t,o,box};
  }
  if(b.y<=GROUND&&p.vy<0){const t=Math.max(0,Math.min(1,(a.y-GROUND)/(a.y-b.y||1)));if(!contact||t<contact.t)contact={t,ground:true};}
  if(!contact){Object.assign(p,b);p.vy-=GRAVITY*step;remaining-=step;continue;}
  const t=contact.t,elapsed=step*t;Object.assign(p,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});p.vy-=GRAVITY*elapsed;
  const face=contact.ground?{axis:'y',edge:GROUND,sign:1}:faceAt(p,contact.box);p[face.axis]=face.edge+face.sign*.003;
  h.contact={id:contact.o?.id,x:p.x,y:p.y,z:p.z};h.x=p.x;h.y=p.y;h.z=p.z;
  const water=p.y<.3&&!!waterAt(sim.layout,p.x,p.z);
  if(water&&!p.splashed){p.splashed=true;sim.splashWater(p.x,p.z,.6);}
  if(h.throwable==='molotov'){h.timer=0;return;}
  const velocity=`v${face.axis}`,incoming=p[velocity]*face.sign;
  if(incoming<0)p[velocity]*=-.28;
  if(face.axis==='y'){p.vx*=.45;p.vz*=.45;}
  else{p.vx*=.72;p.vz*=.72;}
  if(water||(face.axis==='y'&&Math.abs(p.vy)<1.2)){p.grounded=true;p.supportId=contact.o?.id||null;p.vx=p.vy=p.vz=0;break;}
  // A minimum consumed interval prevents a zero-distance surface hit loop.
  remaining-=Math.max(elapsed,1/1200);
 }
 h.x=p.x;h.y=p.y;h.z=p.z;
}
