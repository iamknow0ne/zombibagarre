import * as T from 'three';
import {ROOK_COMBAT_MODES,sampleRookCombat} from './RookCombatMotion.js';

// Development-only poses for the authored Rook rig. These do not replace the
// production actor or alter GLB bind matrices. Targets live in authored model
// coordinates (+Y up, +Z facing); all joint axes come from measured rest bones.
export const ROOK_MOTION_MODES=Object.freeze([
 {id:'ready',label:'Relaxed ready',duration:3.2},
 {id:'walk',label:'Purposeful walk',duration:1.12},
 {id:'rifle',label:'Rifle ready',duration:3.2},
 {id:'fire',label:'Rifle recoil',duration:1.2},
 {id:'reload',label:'Reload study',duration:3.2},
 {id:'guard',label:'Melee guard',duration:2.8},
 ...ROOK_COMBAT_MODES,
]);
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const CARBINE_SCALE=.62;
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const loop=(time,duration)=>((time%duration)+duration)%duration/duration;

export function createRookMotionStudy(content){
 if(!content?.isObject3D)throw new TypeError('Rook motion needs a loaded Object3D.');
 content.updateWorldMatrix(true,true);
 const bones=new Map(),rest=new Map(),skins=[];
 content.traverse(b=>{if(b.isBone){bones.set(b.name.replaceAll('.',''),b);rest.set(b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),worldQ:b.getWorldQuaternion(new T.Quaternion()),point:content.worldToLocal(b.getWorldPosition(V()))});}if(b.isSkinnedMesh)skins.push(b);});
 for(const skin of skins)skin.updateMatrixWorld(true);
 const required=['root','spine05','spine02','head',...['L','R'].flatMap(s=>['upperarm01','lowerarm01','wrist','upperleg01','lowerleg01','foot'].map(n=>n+s))];
 for(const name of required)if(!bones.has(name))throw new Error(`Rook motion cannot find required bone ${name}.`);
 const bone=name=>bones.get(name),point=name=>rest.get(bone(name)).point.clone();
 const chains={};for(const s of ['L','R'])for(const [kind,names]of Object.entries({arm:['upperarm01','lowerarm01','wrist'],leg:['upperleg01','lowerleg01','foot'],thumb:['finger1-1','finger1-2','finger1-3']})){
  const [a,b,c]=names.map(n=>bone(n+s));chains[kind+s]={a,b,c,upper:point(a.name).distanceTo(point(b.name)),lower:point(b.name).distanceTo(point(c.name))};
 }
 // Select actual boot/sole vertices once. Their deformed support plane, not
 // a guessed ankle height, constrains heel strike and toe-off against the floor.
 const soles={L:[],R:[]},soleRest={L:Infinity,R:Infinity};
 for(const skin of skins)for(let index=0;index<skin.geometry.attributes.position.count;index++){
  const p=content.worldToLocal(skin.getVertexPosition(index,V()).applyMatrix4(skin.matrixWorld));
  if(p.y<.105&&Math.abs(p.x)>.10){const side=p.x>0?'L':'R';soles[side].push({skin,index});soleRest[side]=Math.min(soleRest[side],p.y);}
 }
 const fingerFlex=[],handFrames={};
 for(const side of ['L','R']){
  const first=bone('finger2-1'+side),last=bone('finger5-1'+side),middle=bone('finger3-1'+side);if(!first||!last||!middle)continue;
  const across=point(last.name).sub(point(first.name)),forward=point(middle.name).sub(point('wrist'+side));
  const palmNormal=across.cross(forward).normalize().multiplyScalar(side==='L'?1:-1).applyQuaternion(content.getWorldQuaternion(new T.Quaternion()));
  const wrist=bone('wrist'+side),inverseWrist=wrist.getWorldQuaternion(new T.Quaternion()).invert(),wristPoint=wrist.getWorldPosition(V());
  const localForward=forward.clone().normalize().applyQuaternion(content.getWorldQuaternion(new T.Quaternion())).applyQuaternion(inverseWrist),localNormal=palmNormal.clone().applyQuaternion(inverseWrist);
  const localX=localNormal.clone().cross(localForward).normalize(),localY=localForward.clone().cross(localX).normalize();
  handFrames[side]={basis:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(localX,localY,localForward)),palmOffset:first.getWorldPosition(V()).add(last.getWorldPosition(V())).multiplyScalar(.5).lerp(wristPoint,.48).sub(wristPoint).applyQuaternion(inverseWrist)};
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++){
   const b=bone(`finger${finger}-${joint}${side}`);if(!b)continue;
   const child=b.children.find(o=>o.isBone),segment=child?child.getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize():V(0,1,0).applyQuaternion(b.getWorldQuaternion(new T.Quaternion()));
   const axis=segment.cross(palmNormal).normalize().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert());
   fingerFlex.push({b,axis,amount:[.62,.84,.46][joint-1]});
  }
 }
 let mode='bind',sampleTime=0,maxReachError=0,clampedTargets=0,weaponPitch=0,weaponPosition=V(),contactTargets={},footContacts={},combatFrame=null;
 const wp=b=>b.getWorldPosition(V());
 const worldPoint=p=>content.localToWorld(p.clone());
 const modelQ=()=>content.getWorldQuaternion(new T.Quaternion());
 const worldOrientation=(b,q)=>{const parentQ=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(parentQ.invert().multiply(q)).normalize();b.updateWorldMatrix(false,true);};
 const reset=()=>{for(const[b,r]of rest){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}content.updateWorldMatrix(true,true);mode='bind';sampleTime=0;maxReachError=0;clampedTargets=0;weaponPitch=0;contactTargets={};footContacts={};combatFrame=null;};
 function turn(b,axis,angle){const worldAxis=axis.clone().applyQuaternion(modelQ()),q=new T.Quaternion().setFromAxisAngle(worldAxis,angle).multiply(b.getWorldQuaternion(new T.Quaternion()));worldOrientation(b,q);}
 function aim(b,child,target){const origin=wp(b),from=wp(child).sub(origin).normalize(),to=target.clone().sub(origin).normalize();if(to.lengthSq()<.5)return;worldOrientation(b,new T.Quaternion().setFromUnitVectors(from,to).multiply(b.getWorldQuaternion(new T.Quaternion())));}
 function solve(chain,target,pole){
  const start=wp(chain.a),end=worldPoint(target),poleW=worldPoint(pole),scale=content.getWorldScale(V()).x;
  const l1=chain.upper*scale,l2=chain.lower*scale,raw=end.distanceTo(start),distance=clamp(raw,Math.abs(l1-l2)+.0005,l1+l2-.0005);
  if(Math.abs(raw-distance)>.0001)clampedTargets++;
  const direction=end.clone().sub(start).normalize(),bend=poleW.sub(start).addScaledVector(direction,-poleW.dot(direction));
  if(bend.lengthSq()<1e-9)bend.set(0,0,1).addScaledVector(direction,-direction.z);bend.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),away=Math.sqrt(Math.max(0,l1*l1-along*along));
  const elbow=start.clone().addScaledVector(direction,along).addScaledVector(bend,away),reachable=start.clone().addScaledVector(direction,distance);
  aim(chain.a,chain.b,elbow);aim(chain.b,chain.c,reachable);
  maxReachError=Math.max(maxReachError,wp(chain.c).distanceTo(end));
 }
 function orientRest(b){
  // Reconstruct rest orientation relative to the current model frame, allowing
  // the viewer to turn or place the root without changing the sampled pose.
  const initialFrame=restFrame.clone().invert(),relative=initialFrame.multiply(rest.get(b).worldQ);
  worldOrientation(b,modelQ().multiply(relative));
 }
 const restFrame=content.getWorldQuaternion(new T.Quaternion());
 function orientHand(s,direction){
  const wrist=bone('wrist'+s);orientRest(wrist);
  const palm=bone('metacarpal2'+s);if(!palm)return;
  const forward=worldPoint(point('wrist'+s).add(direction)).sub(worldPoint(point('wrist'+s))).normalize();
  aim(wrist,palm,wp(wrist).add(forward));
 }
 function soleHeight(side){
  const inverse=content.matrixWorld.clone().invert();let min=Infinity;
  for(const {skin,index}of soles[side])min=Math.min(min,skin.getVertexPosition(index,V()).applyMatrix4(skin.matrixWorld).applyMatrix4(inverse).y);
  return min;
 }
 function footPose(side,pitch){
  orientRest(bone('foot'+side));turn(bone('foot'+side),V(1,0,0),pitch);
  for(let toe=1;toe<=5;toe++){const b=bone(`toe${toe}-1${side}`);if(b){b.quaternion.copy(rest.get(b).q);b.updateWorldMatrix(false,true);if(pitch>0)turn(b,V(1,0,0),-pitch*.72);}}
 }
 function handFrame(side,forward,normal){
  const z=forward.clone().normalize(),x=normal.clone().cross(z).normalize(),y=z.clone().cross(x).normalize();
  return modelQ().multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z))).multiply(handFrames[side].basis.clone().invert());
 }
 function palmPosition(side){return wp(bone('wrist'+side)).add(handFrames[side].palmOffset.clone().applyQuaternion(bone('wrist'+side).getWorldQuaternion(new T.Quaternion())));}
 function locomotionFoot(side,frame){
  const planned=frame.feet[side],sign=side==='L'?1:-1,foot=point('foot'+side),pole=point('upperleg01'+side).add(V(sign*.025,-.3,.55));
  foot.x=planned.x;foot.z=planned.z;foot.y+=planned.clearance;
  solve(chains['leg'+side],foot,pole);footPose(side,planned.pitch);
  for(let correction=0;correction<3;correction++){foot.y+=soleRest[side]+planned.clearance-soleHeight(side);solve(chains['leg'+side],foot,pole);footPose(side,planned.pitch);}
  const actual=content.worldToLocal(wp(bone('foot'+side)));
  footContacts[side]={...planned,soleHeight:soleHeight(side),floor:soleRest[side],actualX:actual.x,actualZ:actual.z,anchorError:Math.hypot(actual.x-planned.x,actual.z-planned.z)};
 }
 function applyLocomotionFeet(frame){
  if(!frame?.feet?.L||!frame?.feet?.R)throw new TypeError('Locomotion foot plan requires left and right targets.');
  content.updateWorldMatrix(true,true);for(const skin of skins)skin.updateMatrixWorld(true);
  for(const side of ['L','R'])locomotionFoot(side,frame);
  content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();return diagnostics();
 }
 function poseCombat(id,time,options){
  combatFrame=sampleRookCombat(id,time,options);const f=combatFrame,root=bone('root');
  root.position.copy(root.parent.worldToLocal(worldPoint(point('root').add(V(f.rootOffset.x,f.rootOffset.y,f.rootOffset.z)))));root.updateWorldMatrix(false,true);
  for(const [name,rotation]of [['spine05',f.torso],['head',f.head]]){turn(bone(name),V(0,1,0),rotation.yaw);turn(bone(name),V(1,0,0),rotation.pitch);turn(bone(name),V(0,0,1),rotation.roll);}
  for(const side of ['L','R'])locomotionFoot(side,f);
  const bladeQ=new T.Quaternion().setFromEuler(new T.Euler(f.weapon.pitch,f.weapon.yaw,f.weapon.roll,'YXZ'));
  for(const side of ['L','R']){
   const target=f.hands[side],sign=side==='L'?1:-1;
   solve(chains['arm'+side],V(target.x,target.y,target.z),V(sign*.46,1.05,-.02));
   if(side==='R'&&f.weapon.visible){const q=handFrame(side,V(0,-1,.1).applyQuaternion(bladeQ),V(1,0,0).applyQuaternion(bladeQ));worldOrientation(bone('wrist'+side),q);}
   else orientHand(side,V(0,.5,1));
  }
  for(const {b,axis,amount}of fingerFlex)b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,amount*f.grip)).normalize();
  content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();return diagnostics();
 }
 function pose(id,time=0,{locomotion=null,contact:combatContact=false,direction=1}={}){
  const spec=ROOK_MOTION_MODES.find(m=>m.id===id);if(!spec)throw new RangeError(`Unknown Rook motion ${id}.`);if(!Number.isFinite(time))throw new TypeError('Rook motion time must be finite.');
  reset();mode=id;sampleTime=time;maxReachError=0;clampedTargets=0;
  // SkinnedMesh.updateMatrixWorld refreshes its inverse bind transform when
  // the viewer has moved the loaded root; updateWorldMatrix alone does not.
  for(const skin of skins)skin.updateMatrixWorld(true);
  if(ROOK_COMBAT_MODES.some(m=>m.id===id))return poseCombat(id,time,{contact:combatContact,direction});
  const t=locomotion?locomotion.phase:loop(time,spec.duration),phase=t*Math.PI*2,walking=id==='walk',armed=['rifle','fire','reload'].includes(id),guard=id==='guard',gaitWeight=locomotion?clamp(locomotion.speed/.4,0,1):1;
  const breath=Math.sin(locomotion?time/3.2*Math.PI*2:phase)*.003,drop=walking?-.025-(locomotion?.speed||0)*.025:armed?-.035:guard?-.055:-.012;
  const root=bone('root'),targetRoot=worldPoint(point('root').add(V(walking?.012*Math.sin(phase)*gaitWeight:id==='ready'?.008:0,drop+(walking?.006*Math.cos(phase*2)*gaitWeight+breath*(1-gaitWeight):breath),0)));
  root.position.copy(root.parent.worldToLocal(targetRoot));root.updateWorldMatrix(false,true);
  turn(bone('spine05'),V(0,1,0),walking?.035*Math.sin(phase)*gaitWeight:armed?-.09:guard?.18:.018*Math.sin(phase));
  turn(bone('spine02'),V(1,0,0),walking?(locomotion?.velocity.z??1)*.035:armed?.04:guard?.06:0);
  if(locomotion)turn(bone('spine05'),V(0,0,1),-locomotion.velocity.x*.025);
  turn(bone('head'),V(0,1,0),walking?-.035*Math.sin(phase)*gaitWeight:armed?.09:guard?-.18:-.01*Math.sin(phase));
  for(const s of ['L','R']){
   if(locomotion){locomotionFoot(s,locomotion);continue;}
   const sign=s==='L'?1:-1,foot=point('foot'+s),hip=point('upperleg01'+s),u=(t+(s==='L'?0:.5))%1;let clearance=0,pitch=0;
   foot.x=sign*(guard?.23:armed?.19:.175);
   if(walking){if(u<.6){foot.z+=.15-.3*(u/.6);pitch=u<.12?-.16*(1-ease(u/.12)):.25*ease((u-.40)/.20);}else{const flight=(u-.6)/.4;foot.z+=-.15+.3*ease(flight);clearance=.095*Math.sin(Math.PI*flight)**2;foot.y+=clearance;pitch=T.MathUtils.lerp(.25,-.16,ease(flight));}}
   if(armed)foot.z+=s==='L'?.075:-.065;if(guard)foot.z+=s==='L'?.12:-.11;
   if(id==='ready'){foot.x=sign*(s==='L'?.18:.16);foot.z+=s==='L'?.025:-.025;}
   const pole=hip.add(V(sign*.025,-.3,.55));solve(chains['leg'+s],foot,pole);footPose(s,pitch);
   if(walking&&soles[s].length){
    for(let correction=0;correction<2;correction++){const delta=soleRest[s]+clearance-soleHeight(s);foot.y+=delta;solve(chains['leg'+s],foot,pole);footPose(s,pitch);}
    footContacts[s]={phase:u,pitch,clearance,soleHeight:soleHeight(s),floor:soleRest[s]};
   }
  }
  let recoil=0;if(id==='fire'){const shot=(t*3)%1;recoil=Math.sin(Math.PI*clamp(shot/.38,0,1))*(1-ease((shot-.13)/.25));}
  weaponPitch=-.035*recoil;
  // Seat the real butt plate at the inside-front shoulder pocket. These are
  // mesh landmarks in WeaponModels, not its coarse production wrist proxy.
  const weaponRotation=new T.Quaternion().setFromAxisAngle(V(1,0,0),weaponPitch);
  const stockTarget=content.worldToLocal(wp(bone('shoulder01R'))).add(V(-.02,-.035,.015));
  weaponPosition.copy(stockTarget).sub(V(0,.095,-.4175).multiplyScalar(CARBINE_SCALE).applyQuaternion(weaponRotation));
  const contact=(x,y,z)=>V(-x,y,z).multiplyScalar(CARBINE_SCALE).applyQuaternion(weaponRotation).add(weaponPosition);
  const right=contact(.054,-.06,0),left=contact(0,-.008,.335);
  contactTargets={right:right.clone(),left:left.clone(),stock:stockTarget.clone()};
  if(recoil)turn(bone('spine02'),V(1,0,0),-.022*recoil);
  if(id==='reload'){
   // Off-hand leaves the fore-end, reaches the belt, seats a magazine, then
   // returns. Smooth zero-velocity keys keep the cycle seam deterministic.
   const home=left.toArray(),mag=contact(0,-.14,.19),keys=[[0,...home],[.17,...mag.toArray()],[.38,.17,.98,.16],[.58,...mag.clone().add(V(0,-.09,0)).toArray()],[.77,...mag.toArray()],[1,...home]];
   let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],w=ease((t-a[0])/(b[0]-a[0]));left.set(T.MathUtils.lerp(a[1],b[1],w),T.MathUtils.lerp(a[2],b[2],w),T.MathUtils.lerp(a[3],b[3],w));
  }
  for(const s of ['L','R']){
   const sign=s==='L'?1:-1;
   let hand=armed?(s==='L'?left:right):guard?V(sign*.14,s==='L'?1.30:1.23,.32):walking?V(sign*.255+(locomotion?.velocity.x||0)*.018*Math.cos(phase),1.00,.09-sign*.09*Math.cos(phase)*gaitWeight*(locomotion?Math.sign(locomotion.velocity.z)*Math.max(.25,Math.abs(locomotion.velocity.z)/(locomotion.speed||1)):1)):V(sign*.245,s==='L'?.99:1.025,s==='L'?.055:.10);
   if(!armed&&!guard)hand.y+=walking?.018*Math.cos(phase)*gaitWeight+breath*(1-gaitWeight):breath;
   const orientation=armed?handFrame(s,s==='R'?V(0,-1,.10):V(-1,.06,.12),s==='R'?V(1,0,0):V(0,1,0)):null;
   if(armed)hand=worldPoint(hand).sub(handFrames[s].palmOffset.clone().applyQuaternion(orientation)),hand=content.worldToLocal(hand);
   solve(chains['arm'+s],hand,V(sign*(armed||guard?.46:.26),armed?1.12:guard?1.05:1.17,armed?.035:guard?-.02:-.16));
   if(armed)worldOrientation(bone('wrist'+s),orientation);else orientHand(s,guard?V(0,.5,1):V(0,-1,.16));
  }
  const grip=armed?1:guard?.75:walking?.3:.2;
  for(const {b,axis,amount}of fingerFlex)b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,amount*grip)).normalize();
  content.updateWorldMatrix(true,true);
  if(armed){
   solve(chains.thumbR,contact(-.045,.005,.015),contact(.02,.08,.04));
   const handTravel=left.clone().sub(contactTargets.left);
   solve(chains.thumbL,contact(.06,.06,.39).add(handTravel),contact(.03,.15,.36).add(handTravel));
  }
  content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();
  return diagnostics();
 }
 function getSocket(side){const suffix=side==='left'?'L':side==='right'?'R':null;if(!suffix)throw new RangeError('Socket side must be left or right.');const wrist=bone('wrist'+suffix),palm=bone('metacarpal2'+suffix);return{position:wp(wrist),palmPosition:palmPosition(suffix),quaternion:wrist.getWorldQuaternion(new T.Quaternion()),forward:wp(palm).sub(wp(wrist)).normalize()};}
 function getWeaponPose(){
  if(combatFrame){const f=combatFrame.weapon,q=modelQ().multiply(new T.Quaternion().setFromEuler(new T.Euler(f.pitch,f.yaw,f.roll,'YXZ'))),scaleVector=V(f.scale,f.scale,f.scale),position=palmPosition('R').sub(V(-.045,.015,0).multiply(scaleVector).applyQuaternion(q));return{weapon:'katana',position,quaternion:q,scaleVector,visible:f.visible,reload:0};}
  const q=modelQ().multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),weaponPitch));
  return{weapon:'carbine',position:worldPoint(weaponPosition),quaternion:q,scaleVector:V(-CARBINE_SCALE,CARBINE_SCALE,CARBINE_SCALE),visible:['rifle','fire','reload'].includes(mode),reload:mode==='reload'?loop(sampleTime,3.2):0};
 }
 function diagnostics(){const contactError=['rifle','fire'].includes(mode)?Math.max(...['L','R'].map(s=>palmPosition(s).distanceTo(worldPoint(contactTargets[s==='L'?'left':'right'])))):0;return{combat:combatFrame,palmContactError:contactError,soleSampleCounts:{left:soles.L.length,right:soles.R.length},footContacts,mode,time:sampleTime,bones:rest.size,maxReachError,clampedTargets,modelSpace:'Y-up, +Z facing; anatomical L is +X',imageDecodeValidated:false};}
 return{modes:ROOK_MOTION_MODES,pose,reset,diagnostics,getSocket,getWeaponPose,applyLocomotionFeet};
}
