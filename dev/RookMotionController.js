import * as T from 'three';
import {createRookMotionStudy,ROOK_MOTION_MODES,normalizeRookAim} from './RookMotionStudy.js';
import {createRookLocomotion} from './RookLocomotion.js';

const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const DEMO=Object.freeze([{mode:'walk',duration:2.24},{mode:'rifle',duration:1.6},{mode:'fire',duration:1.2},{mode:'reload',duration:3.2},{mode:'ready',duration:1.6}]);
const isTravel=mode=>mode==='locomotion'||mode==='rifle-locomotion';
const DEMO_DURATION=DEMO.reduce((sum,step)=>sum+step.duration,0);
export const ROOK_CONTROLLER_MODES=Object.freeze([...ROOK_MOTION_MODES,{id:'locomotion',label:'Travel locomotion',duration:12},{id:'rifle-locomotion',label:'Travel with rifle',duration:12},{id:'demo',label:'Combat motion sequence',duration:DEMO_DURATION}]);

// Development-only transition layer. Bind matrices and the GLB are never changed.
export function createRookMotionController(content,{transitionDuration=.32}={}){
 if(!Number.isFinite(transitionDuration)||transitionDuration<0)throw new TypeError('Transition duration must be a nonnegative finite number.');
 let study=createRookMotionStudy(content),locomotion=createRookLocomotion(),bones=[],skins=[],source=null,weaponState=null,disposed=false,targetDiagnostics=null;
 content.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
 let combatOptions={contact:false,direction:1},aimTarget={yaw:0,pitch:0},aimCurrent={yaw:0,pitch:0};
 let selectedMode='bind',activeMode='bind',time=0,poseTime=0,blendTime=transitionDuration,fromMode='bind',demoIndex=0,demoStepTime=0;
 const requireLive=()=>{if(disposed)throw new Error('Rook motion controller is disposed.');};
 const snapshot=()=>bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const refresh=()=>{content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();};
 const modelQ=()=>content.getWorldQuaternion(new T.Quaternion());
 function localWeapon(){
  const p=study.getWeaponPose(),socket=study.getSocket('right');
  return{weapon:p.weapon||'carbine',q:modelQ().invert().multiply(p.quaternion),offset:p.position.clone().sub(socket.position).applyQuaternion(p.quaternion.clone().invert()),scale:p.scaleVector.clone(),opacity:p.visible?1:0,reload:p.reload};
 }
 const copyWeapon=w=>({weapon:w.weapon,q:w.q.clone(),offset:w.offset.clone(),scale:w.scale.clone(),opacity:w.opacity,reload:w.reload});
 const targetQuaternion=new T.Quaternion();
 refresh();weaponState=localWeapon();targetDiagnostics=study.diagnostics();
 function start(mode){
  source={bones:snapshot(),weapon:copyWeapon(weaponState)};fromMode=activeMode;activeMode=mode;poseTime=0;blendTime=0;
 }
 function select(mode){
  requireLive();if(!ROOK_CONTROLLER_MODES.some(m=>m.id===mode))throw new RangeError(`Unknown Rook motion ${mode}.`);
  const keepTravel=isTravel(selectedMode)&&isTravel(mode);
  selectedMode=mode;time=0;demoIndex=0;demoStepTime=0;if(!keepTravel)locomotion.reset();start(mode==='demo'?DEMO[0].mode:mode==='locomotion'?'walk':mode==='rifle-locomotion'?'rifle':mode);
  // Do not apply the new target until update: selecting/interrupting cannot pop.
  return diagnostics();
 }
 function sample(){
  if(activeMode==='bind'){study.reset();refresh();weaponState=localWeapon();targetDiagnostics=study.diagnostics();return;}
  const travel=isTravel(selectedMode)?locomotion.frame():null;
  study.pose(activeMode,poseTime,{locomotion:travel,...combatOptions,aim:aimCurrent});targetDiagnostics=study.diagnostics();const targetWeapon=localWeapon();
  const progress=transitionDuration===0?1:Math.min(1,blendTime/transitionDuration),weight=ease(progress);
  if(source&&progress<1){
   for(let i=0;i<bones.length;i++){const b=bones[i],from=source.bones[i];targetQuaternion.copy(b.quaternion);b.position.lerpVectors(from.p,b.position,weight);b.quaternion.slerpQuaternions(from.q,targetQuaternion,weight).normalize();b.scale.lerpVectors(from.s,b.scale,weight);}
   refresh();const before=source.weapon,w=copyWeapon(targetWeapon);w.q.slerpQuaternions(before.q,targetWeapon.q,weight);
   const switching=before.weapon!==targetWeapon.weapon;
   if(switching){w.weapon=progress<.5?before.weapon:targetWeapon.weapon;w.offset.copy(progress<.5?before.offset:targetWeapon.offset);}
   else if(before.opacity>0&&targetWeapon.opacity>0)w.offset.lerpVectors(before.offset,targetWeapon.offset,weight);
   else if(targetWeapon.opacity===0)w.offset.copy(before.offset);
   if(switching)w.scale.copy(progress<.5?before.scale:targetWeapon.scale);else w.scale.lerpVectors(before.scale,targetWeapon.scale,weight);w.reload=T.MathUtils.lerp(before.reload,targetWeapon.reload,weight);
   // Unequipping hides the gun before the hands leave; equipping shows it only
   // near the incoming grip. Interrupted fades retain their actual opacity.
   const fade=targetWeapon.opacity===0?ease(progress/.35):before.opacity<1?ease((progress-.65)/.35):weight;
   w.opacity=switching?(progress<.5?before.opacity*(1-ease(progress/.35)):targetWeapon.opacity*ease((progress-.65)/.35)):T.MathUtils.lerp(before.opacity,targetWeapon.opacity,fade);weaponState=w;
  }else{source=null;weaponState=targetWeapon;refresh();}
  // Correct feet after the visual crossfade as well as in the settled sampler;
  // interpolation alone would pull planted feet away from their ground anchors.
  const footPlan=travel||targetDiagnostics.combat;if(footPlan){study.applyLocomotionFeet(footPlan);targetDiagnostics.footContacts=study.diagnostics().footContacts;}
 }
 function advance(dt){const weight=-Math.expm1(-dt*14);for(const axis of ['yaw','pitch'])aimCurrent[axis]=T.MathUtils.lerp(aimCurrent[axis],aimTarget[axis],weight);poseTime+=dt;const spec=ROOK_MOTION_MODES.find(m=>m.id===activeMode);if(spec?.once)poseTime=Math.min(poseTime,spec.duration);blendTime+=dt;sample();}
 function update(dt=0){
  requireLive();if(!Number.isFinite(dt)||dt<0)throw new TypeError('Motion delta must be a nonnegative finite number.');
  if(selectedMode==='demo')dt=Math.min(dt,Math.max(0,DEMO_DURATION-time));
  if(dt===0){refresh();return diagnostics();}
  time+=dt;const spec=ROOK_MOTION_MODES.find(m=>m.id===selectedMode);if(spec?.once)time=Math.min(time,spec.duration);
  if(isTravel(selectedMode)){locomotion.update(dt);advance(dt);return diagnostics();}
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
  if(selectedMode==='demo')value=Math.min(value,DEMO_DURATION);const spec=ROOK_MOTION_MODES.find(m=>m.id===selectedMode);if(spec?.once)value=Math.min(value,spec.duration);
  if(selectedMode==='bind'){time=0;sample();return diagnostics();}
  if(selectedMode==='demo'){
   // Inspection seeks intentionally settle the active pose rather than showing
   // a crossfade. Playback through the same point can include a transition.
   time=value;demoIndex=0;let local=value;while(demoIndex<DEMO.length-1&&local>=DEMO[demoIndex].duration){local-=DEMO[demoIndex++].duration;}
   activeMode=DEMO[demoIndex].mode;demoStepTime=local;poseTime=local;
  }else{time=value;poseTime=value;if(isTravel(selectedMode))locomotion.seek(value);}
  aimCurrent={...aimTarget};source=null;blendTime=transitionDuration;sample();return diagnostics();
 }
 function getWeaponPose(){
  requireLive();refresh();const q=modelQ().multiply(weaponState.q),wrist=study.getSocket('right').position;
  return{weapon:weaponState.weapon,position:wrist.add(weaponState.offset.clone().applyQuaternion(q)),quaternion:q,scaleVector:weaponState.scale.clone(),visible:weaponState.opacity>1e-4,opacity:weaponState.opacity,reload:weaponState.reload};
 }
 function getSocket(side){requireLive();refresh();return study.getSocket(side);}
 function setAim(input={}){requireLive();aimTarget=normalizeRookAim(input);return{...aimTarget};}
 // Paused aim edits settle the current pose without replaying travel history.
 function settleAim(){requireLive();aimCurrent={...aimTarget};source=null;blendTime=transitionDuration;sample();return diagnostics();}
 function setLocomotion(input){requireLive();return locomotion.set(input);}
 function setCombat(options={}){requireLive();const next={...combatOptions,...options};if(typeof next.contact!=='boolean'||![1,-1].includes(next.direction))throw new TypeError('Combat contact must be boolean and direction must be +1 or -1.');combatOptions=next;return{...combatOptions};}
 function getTravelPose(){requireLive();const p=isTravel(selectedMode)?locomotion.frame().position:targetDiagnostics?.combat?.travel||{x:0,z:0};return new T.Vector3(p.x,0,p.z);}
 function reset(){
  requireLive();study.reset();refresh();selectedMode=activeMode=fromMode='bind';time=poseTime=0;blendTime=transitionDuration;demoIndex=demoStepTime=0;source=null;weaponState=localWeapon();targetDiagnostics=study.diagnostics();locomotion.reset();aimTarget={yaw:0,pitch:0};aimCurrent={yaw:0,pitch:0};return diagnostics();
 }
 function diagnostics(){
  const progress=transitionDuration===0?1:Math.min(1,blendTime/transitionDuration);
  return{...(targetDiagnostics||{}),aimTarget:{...aimTarget},aimCurrent:{...aimCurrent},reachErrorScope:'settled target sample; not a claim about blended hand contacts',mode:activeMode,selectedMode,time,poseTime,demoTime:selectedMode==='demo'?time:undefined,locomotion:isTravel(selectedMode)?locomotion?.frame():undefined,duration:ROOK_CONTROLLER_MODES.find(m=>m.id===selectedMode)?.duration||0,transition:{active:!!source&&progress<1,progress,duration:transitionDuration,from:fromMode,to:activeMode},demoComplete:selectedMode==='demo'&&time>=DEMO_DURATION,disposed,bones:bones.length};
 }
 function dispose(){if(disposed)return;reset();disposed=true;source=weaponState=study=content=targetDiagnostics=locomotion=null;bones=[];skins=[];}
 return{modes:ROOK_CONTROLLER_MODES,select,update,seek,reset,dispose,getWeaponPose,getSocket,setAim,settleAim,setLocomotion,setCombat,getTravelPose,diagnostics};
}
