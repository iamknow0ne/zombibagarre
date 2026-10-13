// Opt-in traversal physics. The campaign stays planar until combat and AI support
// height. All positions are feet coordinates; collision boxes share the render plan.
import {boxHit3D} from './Ballistics.js';
export const TRAVERSAL={gravity:24,jumpSpeed:9.4,speed:6.2,airControl:7,range:23,grappleSpeed:14,bodyHeight:1.75};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const alive=b=>b.health===undefined||b.health>0;
const top=b=>(b.y||0)+b.h;
const onBox=(p,b,margin=0)=>Math.abs(p.x-b.x)<b.w/2-margin&&Math.abs(p.z-b.z)<b.d/2-margin;
export function initTraversal(p,spawn={x:0,y:0,z:7}){
 Object.assign(p,spawn,{traversal:true,vy:0,vx:0,vz:0,grounded:true,supportId:null,grapple:null,grappleCooldown:0,jumpBuffer:0,coyote:.1,landing:0,moveX:0,moveZ:0,moving:false,dash:0});return p;
}
export function supportBelow(p,boxes,ceiling=p.y+.06){
 let result={id:null,y:0};for(const b of boxes)if(alive(b)&&b.standable!==false&&top(b)<=ceiling&&top(b)>result.y&&onBox(p,b,p.radius*.2))result={id:b.id,y:top(b)};return result;
}
export function grappleAvailability(p,anchor,boxes){
 if(!anchor)return 'No anchor selected';
 const owner=boxes.find(b=>b.id===anchor.supportId);if(!owner||!alive(owner))return 'Anchor lost';
 const from={x:p.x,y:p.y+1.2,z:p.z};
 if(Math.hypot(anchor.x-from.x,anchor.y-from.y,anchor.z-from.z)>TRAVERSAL.range)return 'Move closer';
 for(const b of boxes){if(!alive(b))continue;const base=b.y||0;const hit=boxHit3D({...from,y:from.y-base},{...anchor,y:anchor.y-base},{...b,h:b.h});if(hit!==null&&hit<.995)return 'Anchor obstructed';}
 return null;
}
function moveAxis(p,delta,axis,boxes,bounds){
 if(!delta)return false;const other=axis==='x'?'z':'x',size=axis==='x'?'w':'d',cross=axis==='x'?'d':'w',r=p.radius,old=p[axis];
 let next=clamp(old+delta,bounds[axis==='x'?'minX':'minZ']+r,bounds[axis==='x'?'maxX':'maxZ']-r);
 for(const b of boxes){if(!alive(b)||p.y>=top(b)-.015||p.y+TRAVERSAL.bodyHeight<=(b.y||0)+.01||Math.abs(p[other]-b[other])>=b[cross]/2+r-.001)continue;
  const lo=b[axis]-b[size]/2-r,hi=b[axis]+b[size]/2+r;
  if(delta>0&&old<=lo+.001&&next>lo)next=Math.min(next,lo);
  else if(delta<0&&old>=hi-.001&&next<hi)next=Math.max(next,hi);
 }
 p[axis]=next;return Math.abs(next-old-delta)>.001;
}
export function stepTraversal(p,input,dt,boxes,anchors,bounds){
 const events=[];dt=clamp(dt,0,.05);if(!dt)return events;
 if(input.jump)p.jumpBuffer=.14;
 if(input.grapple){
  if(p.grapple){p.grapple=null;p.grappleCooldown=.25;events.push({type:'release'});}
  else if(p.grappleCooldown<=0){const anchor=anchors.find(a=>a.id===input.anchorId),reason=grappleAvailability(p,anchor,boxes);if(reason)events.push({type:'blocked',message:reason});else{p.grapple={anchorId:anchor.id};p.grounded=false;p.supportId=null;p.vy=Math.max(3,p.vy);p.jumpBuffer=0;events.push({type:'attach',anchor});}}
 }
 const steps=Math.ceil(dt/(1/120)),h=dt/steps,oldX=p.x,oldZ=p.z;
 for(let i=0;i<steps;i++){
  p.grappleCooldown=Math.max(0,p.grappleCooldown-h);p.landing=Math.max(0,p.landing-h*3);
  const floor=supportBelow(p,boxes);
  if(p.grounded&&Math.abs(p.y-floor.y)>.065){p.grounded=false;p.supportId=null;}
  p.coyote=p.grounded?.1:Math.max(0,p.coyote-h);
  if(p.jumpBuffer>0&&p.coyote>0&&!p.grapple){p.vy=TRAVERSAL.jumpSpeed;p.grounded=false;p.supportId=null;p.coyote=0;p.jumpBuffer=0;events.push({type:'jump'});}
  p.jumpBuffer=Math.max(0,p.jumpBuffer-h);
  const len=Math.max(1,Math.hypot(input.x||0,input.z||0)),mx=(input.x||0)/len,mz=(input.z||0)/len;
  if(p.grapple){
   const a=anchors.find(a=>a.id===p.grapple.anchorId),owner=boxes.find(b=>b.id===a?.supportId);
   if(!a||!owner||!alive(owner)){p.grapple=null;events.push({type:'release'});}
   else{const dx=a.x-p.x,dy=a.y-1-p.y,dz=a.z-p.z,d=Math.hypot(dx,dy,dz);
    if(d<.55){p.grapple=null;p.vx=p.vz=0;p.vy=0;p.grappleCooldown=.35;events.push({type:'reel-complete'});}
    else{const speed=Math.min(TRAVERSAL.grappleSpeed,Math.max(3,d*4)),blend=1-Math.exp(-9*h);p.vx+=(dx/d*speed-p.vx)*blend;p.vz+=(dz/d*speed-p.vz)*blend;p.vy+=(dy/d*speed-p.vy)*blend;}
   }
  }else{const blend=1-Math.exp(-(p.grounded?24:TRAVERSAL.airControl)*h);p.vx+=(mx*TRAVERSAL.speed-p.vx)*blend;p.vz+=(mz*TRAVERSAL.speed-p.vz)*blend;p.vy-=TRAVERSAL.gravity*h;}
  const beforeY=p.y;let nextY=p.y+p.vy*h;
  // Ascend before lateral collision so feet can clear a ledge. Descend after
  // lateral movement so swept landing selects the surface actually underneath.
  if(p.vy>0){let ceiling=Infinity;for(const b of boxes)if(alive(b)&&(b.y||0)>0&&onBox(p,b,-p.radius)&&beforeY+TRAVERSAL.bodyHeight<=b.y+.001&&nextY+TRAVERSAL.bodyHeight>=b.y)ceiling=Math.min(ceiling,b.y-TRAVERSAL.bodyHeight);p.y=Math.min(nextY,ceiling);if(ceiling<Infinity){p.vy=0;nextY=p.y;}}
  if(moveAxis(p,p.vx*h,'x',boxes,bounds))p.vx=0;
  if(moveAxis(p,p.vz*h,'z',boxes,bounds))p.vz=0;
  if(p.vy<=0){const support=supportBelow(p,boxes,beforeY+.025);p.y=nextY;if(p.y<=support.y){const falling=p.vy;p.y=support.y;p.vy=0;if(!p.grounded&&falling<-.8){p.landing=clamp(-falling/23,.12,.75);events.push({type:'land',speed:-falling,supportId:support.id});}p.grounded=true;p.supportId=support.id;}}
  else p.grounded=false;
 }
 p.moveX=(p.x-oldX)/dt;p.moveZ=(p.z-oldZ)/dt;p.moving=p.grounded&&Math.hypot(p.moveX,p.moveZ)>.08;
 if(Math.hypot(p.moveX,p.moveZ)>.15)p.angle=Math.atan2(p.moveX,p.moveZ);
 return events;
}
export function coursePlan(){
 const boxes=[
  {id:'step',x:0,z:3,w:3.6,d:2.8,h:1.15,label:'01 / JUMP',color:0x637e79},
  {id:'roof',x:-4,z:-3,w:6,d:6,h:3.6,label:'02 / ROOFTOP',color:0xaaa38c},
  {id:'relay',x:5,z:-8,w:5.8,d:5,h:6.5,label:'03 / RELAY',color:0x688689},
  {id:'summit',x:-5,z:-16,w:6.4,d:5.4,h:10.5,label:'04 / SUMMIT',color:0xb8a387},
 ];
 return {bounds:{minX:-22,maxX:22,minZ:-23,maxZ:20},spawn:{x:0,y:0,z:7},boxes,anchors:boxes.slice(1).map(b=>({id:`anchor-${b.id}`,supportId:b.id,x:b.x,y:b.h+3.3,z:b.z+b.d/2-1.25,label:b.label.split(' / ')[1]}))};
}
// The optional demonstration uses exactly the same input and collision path as play.
export function traversalDemo(p,visited,plan){
 if(!visited.has('step'))return {x:0,z:p.z>3?-1:0,jump:p.grounded&&p.z<5.05};
 const next=plan.anchors.find(a=>!visited.has(a.supportId));
 return next?{grapple:p.grounded&&!p.grapple&&p.grappleCooldown<=0,anchorId:next.id}:{};
}
