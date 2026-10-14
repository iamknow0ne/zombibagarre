import * as T from 'three';
import {createRookMotionStudy,ROOK_MOTION_MODES} from './RookMotionStudy.js';

const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const DEMO=Object.freeze([{mode:'walk',duration:2.24},{mode:'rifle',duration:1.6},{mode:'fire',duration:1.2},{mode:'reload',duration:3.2},{mode:'ready',duration:1.6}]);
const DEMO_DURATION=DEMO.reduce((sum,step)=>sum+step.duration,0);
export const ROOK_CONTROLLER_MODES=Object.freeze([...ROOK_MOTION_MODES,{id:'demo',label:'Combat motion sequence',duration:DEMO_DURATION}]);

// Development-only transition layer. Bind matrices and the GLB are never changed.
export function createRookMotionController(content,{transitionDuration=.32}={}){
 if(!Number.isFinite(transitionDuration)||transitionDuration<0)throw new TypeError('Transition duration must be a nonnegative finite number.');
 let study=createRookMotionStudy(content),bones=[],skins=[],source=null,weaponState=null,disposed=false,targetDiagnostics=null;
 content.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
 let selectedMode='bind',activeMode='bind',time=0,poseTime=0,blendTime=transitionDuration,fromMode='bind',demoIndex=0,demoStepTime=0;
 const requireLive=()=>{if(disposed)throw new Error('Rook motion controller is disposed.');};
 const snapshot=()=>bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const refresh=()=>{content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();};
 const modelQ=()=>content.getWorldQuaternion(new T.Quaternion());
 function localWeapon(){
  const p=study.getWeaponPose(),socket=study.getSocket('right');
  return{q:modelQ().invert().multiply(p.quaternion),offset:p.position.clone().sub(socket.position).applyQuaternion(p.quaternion.clone().invert()),scale:p.scaleVector.clone(),opacity:p.visible?1:0,reload:p.reload};
 }
 const copyWeapon=w=>({q:w.q.clone(),offset:w.offset.clone(),scale:w.scale.clone(),opacity:w.opacity,reload:w.reload});
 const targetQuaternion=new T.Quaternion();
 refresh();weaponState=localWeapon();targetDiagnostics=study.diagnostics();
 function start(mode){
  source={bones:snapshot(),weapon:copyWeapon(weaponState)};fromMode=activeMode;activeMode=mode;poseTime=0;blendTime=0;
 }
 function select(mode){
  requireLive();if(!ROOK_CONTROLLER_MODES.some(m=>m.id===mode))throw new RangeError(`Unknown Rook motion ${mode}.`);
  selectedMode=mode;time=0;demoIndex=0;demoStepTime=0;start(mode==='demo'?DEMO[0].mode:mode);
  // Do not apply the new target until update: selecting/interrupting cannot pop.
  return diagnostics();
 }
 function sample(){
  if(activeMode==='bind'){study.reset();refresh();weaponState=localWeapon();targetDiagnostics=study.diagnostics();return;}
  study.pose(activeMode,poseTime);targetDiagnostics=study.diagnostics();const targetWeapon=localWeapon();
  const progress=transitionDuration===0?1:Math.min(1,blendTime/transitionDuration),weight=ease(progress);
  if(source&&progress<1){
   for(let i=0;i<bones.length;i++){const b=bones[i],from=source.bones[i];targetQuaternion.copy(b.quaternion);b.position.lerpVectors(from.p,b.position,weight);b.quaternion.slerpQuaternions(from.q,targetQuaternion,weight).normalize();b.scale.lerpVectors(from.s,b.scale,weight);}
   refresh();const before=source.weapon,w=copyWeapon(targetWeapon);w.q.slerpQuaternions(before.q,targetWeapon.q,weight);
   if(before.opacity>0&&targetWeapon.opacity>0)w.offset.lerpVectors(before.offset,targetWeapon.offset,weight);
   else if(targetWeapon.opacity===0)w.offset.copy(before.offset);
   w.scale.lerpVectors(before.scale,targetWeapon.scale,weight);w.reload=T.MathUtils.lerp(before.reload,targetWeapon.reload,weight);
   // Unequipping hides the gun before the hands leave; equipping shows it only
   // near the incoming grip. Interrupted fades retain their actual opacity.
   const fade=targetWeapon.opacity===0?ease(progress/.35):before.opacity<1?ease((progress-.65)/.35):weight;
   w.opacity=T.MathUtils.lerp(before.opacity,targetWeapon.opacity,fade);weaponState=w;
  }else{source=null;weaponState=targetWeapon;refresh();}
 }
 function advance(dt){poseTime+=dt;blendTime+=dt;sample();}
 function update(dt=0){
  requireLive();if(!Number.isFinite(dt)||dt<0)throw new TypeError('Motion delta must be a nonnegative finite number.');
  if(selectedMode==='demo')dt=Math.min(dt,Math.max(0,DEMO_DURATION-time));
  if(dt===0){refresh();return diagnostics();}
  time+=dt;
  if(selectedMode!=='demo'){advance(dt);return diagnostics();}
  let remaining=dt;
  // Split at exact showcase boundaries so 30/60/120Hz and a single large step
  // start each transition from the identical outgoing sample.
  while(demoIndex<DEMO.length-1&&remaining>=DEMO[demoIndex].duration-demoStepTime-1e-10){
   const slice=Math.max(0,DEMO[demoIndex].duration-demoStepTime);advance(slice);remaining=Math.max(0,remaining-slice);demoIndex++;demoStepTime=0;start(DEMO[demoIndex].mode);
  }
  demoStepTime+=remaining;advance(remaining);return diagnostics();
 }
 function seek(value){
  requireLive();if(!Number.isFinite(value)||value<0)throw new TypeError('Motion seek time must be a nonnegative finite number.');
  if(selectedMode==='demo')value=Math.min(value,DEMO_DURATION);
  if(selectedMode==='bind'){time=0;sample();return diagnostics();}
  if(selectedMode==='demo'){
   // Inspection seeks intentionally settle the active pose rather than showing
   // a crossfade. Playback through the same point can include a transition.
   time=value;demoIndex=0;let local=value;while(demoIndex<DEMO.length-1&&local>=DEMO[demoIndex].duration){local-=DEMO[demoIndex++].duration;}
   activeMode=DEMO[demoIndex].mode;demoStepTime=local;poseTime=local;
  }else{time=value;poseTime=value;}
  source=null;blendTime=transitionDuration;sample();return diagnostics();
 }
 function getWeaponPose(){
  requireLive();refresh();const q=modelQ().multiply(weaponState.q),wrist=study.getSocket('right').position;
  return{position:wrist.add(weaponState.offset.clone().applyQuaternion(q)),quaternion:q,scaleVector:weaponState.scale.clone(),visible:weaponState.opacity>1e-4,opacity:weaponState.opacity,reload:weaponState.reload};
 }
 function getSocket(side){requireLive();refresh();return study.getSocket(side);}
 function reset(){
  requireLive();study.reset();refresh();selectedMode=activeMode=fromMode='bind';time=poseTime=0;blendTime=transitionDuration;demoIndex=demoStepTime=0;source=null;weaponState=localWeapon();targetDiagnostics=study.diagnostics();return diagnostics();
 }
 function diagnostics(){
  const progress=transitionDuration===0?1:Math.min(1,blendTime/transitionDuration);
  return{...(targetDiagnostics||{}),reachErrorScope:'settled target sample; not a claim about blended hand contacts',mode:activeMode,selectedMode,time,poseTime,demoTime:selectedMode==='demo'?time:undefined,duration:ROOK_CONTROLLER_MODES.find(m=>m.id===selectedMode)?.duration||0,transition:{active:!!source&&progress<1,progress,duration:transitionDuration,from:fromMode,to:activeMode},demoComplete:selectedMode==='demo'&&time>=DEMO_DURATION,disposed,bones:bones.length};
 }
 function dispose(){if(disposed)return;reset();disposed=true;source=weaponState=study=content=targetDiagnostics=null;bones=[];skins=[];}
 return{modes:ROOK_CONTROLLER_MODES,select,update,seek,reset,dispose,getWeaponPose,getSocket,diagnostics};
}
