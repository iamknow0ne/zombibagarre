import {worldStick} from './Gamepad.js';
export const TOUCH_DEFAULTS={touchStickMode:'floating',touchSize:1,touchAimAssist:true,touchOpacity:.7};
export function touchSettings(value={}){return {touchStickMode:value.touchStickMode==='fixed'?'fixed':'floating',touchSize:Number.isFinite(+value.touchSize)?Math.max(.85,Math.min(1.2,+value.touchSize)):1,touchAimAssist:value.touchAimAssist!==false,touchOpacity:Number.isFinite(+value.touchOpacity)?Math.max(.35,Math.min(1,+value.touchOpacity)):.7};}
export function stickVector(dx,dy,radius,deadzone=.12){const length=Math.hypot(dx,dy);if(length<=radius*deadzone)return{x:0,y:0};const magnitude=Math.min(1,(length/radius-deadzone)/(1-deadzone));return{x:dx/length*magnitude,y:dy/length*magnitude};}
export function touchAimTarget(direction,sim,assist=true){
 const p=sim.player,d=worldStick(direction),angle=Math.atan2(d.x,d.z);let target={x:p.x+d.x*18,z:p.z+d.z*18};
 if(assist){const best=sim.enemies.filter(e=>e.health>0&&Math.hypot(e.x-p.x,e.z-p.z)<19&&!sim.blocked(p,e)).map(e=>({e,angle:Math.abs(Math.atan2(Math.sin(Math.atan2(e.x-p.x,e.z-p.z)-angle),Math.cos(Math.atan2(e.x-p.x,e.z-p.z)-angle)))})).filter(e=>e.angle<.22).sort((a,b)=>a.angle-b.angle)[0];if(best)target={x:best.e.x,z:best.e.z};}
 return target;
}
export class TouchControls {
 constructor(input){this.input=input;this.sticks=[];
  for(const [zoneId,stickId,aim]of [['move-zone','joystick',false],['aim-zone','aim-joystick',true]]){
   const zone=document.getElementById(zoneId),visual=document.getElementById(stickId);if(!zone||!visual)continue;
   const state={zone,visual,knob:visual.firstElementChild,aim,id:null};this.sticks.push(state);
   zone.addEventListener('pointerdown',e=>{if(state.id!==null||document.querySelector('dialog[open]'))return;e.preventDefault();input.source='touch';input.pointer.active=false;state.id=e.pointerId;
    const r=zone.getBoundingClientRect(),size=visual.getBoundingClientRect().width/2;
    state.cx=input.settings.touchStickMode==='fixed'?r.width/2:e.clientX-r.left;state.cy=input.settings.touchStickMode==='fixed'?r.height/2:e.clientY-r.top;
    visual.style.left=state.cx+'px';visual.style.top=state.cy+'px';state.radius=size*.68;visual.classList.add('engaged');try{zone.setPointerCapture(e.pointerId);}catch{/* A cancelled browser gesture may already have lost its pointer. */}this.move(state,e);
   });
   zone.addEventListener('pointermove',e=>{if(state.id===e.pointerId){e.preventDefault();this.move(state,e);}});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(type,e=>{if(e.pointerId===state.id)this.release(state);});
  }
  window.addEventListener('resize',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
 }
 move(s,e){const r=s.zone.getBoundingClientRect(),v=stickVector(e.clientX-r.left-s.cx,e.clientY-r.top-s.cy,s.radius);s.knob.style.transform=`translate(-50%,-50%) translate(${v.x*s.radius}px,${v.y*s.radius}px)`;
  if(s.aim){const active=Math.hypot(v.x,v.y)>.08;this.input.touchFiring=active;if(active){const length=Math.hypot(v.x,v.y);this.input.touchAim={x:v.x/length,y:v.y/length};}}else this.input.stick=v;
 }
 release(s){s.id=null;s.visual.classList.remove('engaged');s.visual.style.left=s.visual.style.top='';s.knob.style.transform='';if(s.aim)this.input.touchFiring=false;else this.input.stick={x:0,y:0};}
 clear(){this.input.touchBrake=this.input.touchReverse=false;this.input.touchHoldIds={};for(const s of this.sticks)this.release(s);this.input.touchAim=null;this.input.touchFiring=false;this.input.stick={x:0,y:0};}
}
