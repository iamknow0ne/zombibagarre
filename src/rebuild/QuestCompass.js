import {Vector3} from 'three';
import {questGuide,navigationRoute,routeSegmentClear} from './QuestNavigation.js';
import {distance} from './config.js';

// The compass follows the tracked contract independently of custom atlas pins.
// Reuse the map route when possible; keep a separate cache for a manual pin.
export function questDirection(sim){
 const guide=questGuide(sim),target=guide?.target;
 if(!guide||['complete','locked'].includes(guide.state)||!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return null;
 const direct=distance(sim.player,target),arrival=direct<3&&routeSegmentClear(sim,sim.player,target);
 if(arrival)return {target,next:target,metres:0,mode:'arrived',label:sim.player.vehicleId?'ON FOOT':target.kind==='shop'?'TALK':target.kind==='cache'&&sim.places.includes(target)?'COLLECT':'HERE',questId:guide.quest.id};
 const pin=sim.player.waypoint,same=pin?.source==='quest'&&distance(pin,target)<.1;
 const route=same?navigationRoute(sim):navigationRoute(sim,{...target,source:'quest'},'guidanceRoute');
 const points=route?.points||[];
 // Choose a forward, visible corner; never point back at a cached route origin.
 for(let i=points.length-1;i>0;i--){if(distance(sim.player,points[i])<1||!routeSegmentClear(sim,sim.player,points[i]))continue;
  const metres=distance(sim.player,points[i])+points.slice(i+1).reduce((sum,p,j)=>sum+distance(points[i+j],p),0);
  return {target,next:points[i],metres:Math.ceil(metres),mode:'route',label:'QUEST',questId:guide.quest.id};
 }
 return {target,next:target,metres:Math.ceil(direct),mode:'bearing',label:'BEARING',questId:guide.quest.id};
}

const intersects=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+4&&Math.abs(a.y-b.y)<(a.h+b.h)/2+4;
export function compassPlacement(anchor,direction,width,height,reserved=[],mobile=false){
 const angle=Math.atan2(direction.y,direction.x),radius=mobile?57:69,w=100,h=43;
 for(const offset of [0,-.5,.5,-1,1,Math.PI]){
  const x=Math.max(w/2+10,Math.min(width-w/2-10,anchor.x+Math.cos(angle+offset)*radius));
  const y=Math.max(h/2+12,Math.min(height-h/2-16,anchor.y+Math.sin(angle+offset)*radius));
  const bounds={x,y:y+9,w,h};
  if(!reserved.some(r=>intersects(bounds,r)))return {x,y,angle,bounds};
 }
 return null;
}

export class QuestCompass{
 constructor(){this.hero=new Vector3();this.turn=new Vector3();this.drawn=false;}
 draw(ctx,hint,sim,camera,width,height,reserved,mobile){
  this.drawn=false;if(!hint||!['playing','extracting'].includes(sim.state))return;
  this.hero.set(sim.player.x,.15,sim.player.z).project(camera);
  this.turn.set(hint.next.x,.15,hint.next.z).project(camera);
  if(Math.abs(this.hero.x)>1||Math.abs(this.hero.y)>1||Math.abs(this.hero.z)>1)return;
  const anchor={x:(this.hero.x*.5+.5)*width,y:(-.5*this.hero.y+.5)*height};
  const direction=hint.mode==='arrived'?{x:0,y:1}:{x:(this.turn.x-this.hero.x)*width,y:-(this.turn.y-this.hero.y)*height};
  const p=compassPlacement(anchor,direction,width,height,reserved,mobile);if(!p)return;
  reserved.push(p.bounds);this.drawn=true;this.last={...p,mode:hint.mode,metres:hint.metres};
  ctx.save();ctx.translate(p.x,p.y);ctx.lineJoin='round';ctx.lineCap='round';
  // Coal keyline keeps the small amber mark readable on pale roofs and fire.
  ctx.save();ctx.rotate(hint.mode==='arrived'?0:p.angle);ctx.beginPath();
  if(hint.mode==='arrived'){ctx.moveTo(0,-6);ctx.lineTo(6,0);ctx.lineTo(0,6);ctx.lineTo(-6,0);ctx.closePath();}
  else{ctx.moveTo(-5,-7);ctx.lineTo(4,0);ctx.lineTo(-5,7);}
  ctx.strokeStyle='#142125';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#e3bd79';ctx.lineWidth=2;ctx.stroke();
  if(hint.mode==='bearing'){ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-10,0);ctx.stroke();}ctx.restore();
  const label=hint.mode==='arrived'?hint.label:`${hint.label} · ${hint.metres} m`;
  ctx.font="10px 'SFMono-Regular',Consolas,monospace";ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#142125';ctx.strokeText(label,0,19);ctx.fillStyle='#eddbb7';ctx.fillText(label,0,19);ctx.restore();
 }
}
