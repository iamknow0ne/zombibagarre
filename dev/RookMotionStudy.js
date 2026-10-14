import * as T from 'three';

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
 const required=['root','spine05','spine02','head',...['L','R'].flatMap(s=>['upperarm01','lowerarm01','wrist','upperleg01','lowerleg01','foot'].map(n=>n+s))];
 for(const name of required)if(!bones.has(name))throw new Error(`Rook motion cannot find required bone ${name}.`);
 const bone=name=>bones.get(name),point=name=>rest.get(bone(name)).point.clone();
 const chains={};for(const s of ['L','R'])for(const [kind,names]of Object.entries({arm:['upperarm01','lowerarm01','wrist'],leg:['upperleg01','lowerleg01','foot']})){
  const [a,b,c]=names.map(n=>bone(n+s));chains[kind+s]={a,b,c,upper:point(a.name).distanceTo(point(b.name)),lower:point(b.name).distanceTo(point(c.name))};
 }
 const fingerFlex=[];
 for(const side of ['L','R']){
  const first=bone('finger2-1'+side),last=bone('finger5-1'+side),middle=bone('finger3-1'+side);if(!first||!last||!middle)continue;
  const across=point(last.name).sub(point(first.name)),forward=point(middle.name).sub(point('wrist'+side));
  const palmNormal=across.cross(forward).normalize().multiplyScalar(side==='L'?1:-1).applyQuaternion(content.getWorldQuaternion(new T.Quaternion()));
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++){
   const b=bone(`finger${finger}-${joint}${side}`);if(!b)continue;
   const child=b.children.find(o=>o.isBone),segment=child?child.getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize():V(0,1,0).applyQuaternion(b.getWorldQuaternion(new T.Quaternion()));
   const axis=segment.cross(palmNormal).normalize().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert());
   fingerFlex.push({b,axis,amount:[.62,.84,.46][joint-1]});
  }
 }
 let mode='bind',sampleTime=0,maxReachError=0,clampedTargets=0,weaponPitch=0;
 const wp=b=>b.getWorldPosition(V());
 const worldPoint=p=>content.localToWorld(p.clone());
 const modelQ=()=>content.getWorldQuaternion(new T.Quaternion());
 const worldOrientation=(b,q)=>{const parentQ=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(parentQ.invert().multiply(q)).normalize();b.updateWorldMatrix(false,true);};
 const reset=()=>{for(const[b,r]of rest){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}content.updateWorldMatrix(true,true);mode='bind';sampleTime=0;maxReachError=0;clampedTargets=0;weaponPitch=0;};
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
 function pose(id,time=0){
  const spec=ROOK_MOTION_MODES.find(m=>m.id===id);if(!spec)throw new RangeError(`Unknown Rook motion ${id}.`);if(!Number.isFinite(time))throw new TypeError('Rook motion time must be finite.');
  reset();mode=id;sampleTime=time;maxReachError=0;clampedTargets=0;
  const t=loop(time,spec.duration),phase=t*Math.PI*2,walking=id==='walk',armed=['rifle','fire','reload'].includes(id),guard=id==='guard';
  const breath=Math.sin(phase)*.003,drop=walking?-.025:armed?-.035:guard?-.055:-.012;
  const root=bone('root'),targetRoot=worldPoint(point('root').add(V(walking?.012*Math.sin(phase):id==='ready'?.008:0,drop+(walking?.006*Math.cos(phase*2):breath),0)));
  root.position.copy(root.parent.worldToLocal(targetRoot));root.updateWorldMatrix(false,true);
  turn(bone('spine05'),V(0,1,0),walking?.035*Math.sin(phase):armed?-.09:guard?.18:.018*Math.sin(phase));
  turn(bone('spine02'),V(1,0,0),walking?.035:armed?.04:guard?.06:0);
  turn(bone('head'),V(0,1,0),walking?-.035*Math.sin(phase):armed?.09:guard?-.18:-.01*Math.sin(phase));
  for(const s of ['L','R']){
   const sign=s==='L'?1:-1,foot=point('foot'+s),hip=point('upperleg01'+s),u=(t+(s==='L'?0:.5))%1;
   foot.x=sign*(guard?.23:armed?.19:.175);
   if(walking){if(u<.6){foot.z+=.15-.3*(u/.6);}else{const flight=(u-.6)/.4;foot.z+=-.15+.3*ease(flight);foot.y+=.095*Math.sin(Math.PI*flight)**2;}}
   if(armed)foot.z+=s==='L'?.075:-.065;if(guard)foot.z+=s==='L'?.12:-.11;
   if(id==='ready'){foot.x=sign*(s==='L'?.18:.16);foot.z+=s==='L'?.025:-.025;}
   solve(chains['leg'+s],foot,hip.add(V(sign*.025,-.3,.55)));orientRest(bone('foot'+s));
  }
  let recoil=0;if(id==='fire'){const shot=(t*3)%1;recoil=Math.sin(Math.PI*clamp(shot/.38,0,1))*(1-ease((shot-.13)/.25));}
  weaponPitch=-.035*recoil;
  const right=V(-.13,1.30,.25-recoil*.024),left=V(.14,-.025,.23).multiplyScalar(CARBINE_SCALE).applyAxisAngle(V(1,0,0),weaponPitch).add(right);
  if(recoil)turn(bone('spine02'),V(1,0,0),-.022*recoil);
  if(id==='reload'){
   // Off-hand leaves the fore-end, reaches the belt, seats a magazine, then
   // returns. Smooth zero-velocity keys keep the cycle seam deterministic.
   const home=left.toArray(),keys=[[0,...home],[.17,-.04,1.16,.28],[.38,.17,.98,.16],[.58,-.075,1.18,.28],[.77,-.045,1.27,.28],[1,...home]];
   let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],w=ease((t-a[0])/(b[0]-a[0]));left.set(T.MathUtils.lerp(a[1],b[1],w),T.MathUtils.lerp(a[2],b[2],w),T.MathUtils.lerp(a[3],b[3],w));
  }
  for(const s of ['L','R']){
   const sign=s==='L'?1:-1;
   let hand=armed?(s==='L'?left:right):guard?V(sign*.14,s==='L'?1.30:1.23,.32):walking?V(sign*.255,1.00,.09-sign*.09*Math.cos(phase)):V(sign*.245,s==='L'?.99:1.025,s==='L'?.055:.10);
   if(!armed&&!guard)hand.y+=walking?.018*Math.cos(phase):breath;
   solve(chains['arm'+s],hand,V(sign*(armed||guard?.58:.26),armed?1.13:guard?1.05:1.17,armed?-.025:guard?-.02:-.16));
   orientHand(s,armed?V(0,-.15,1):guard?V(0,.5,1):V(0,-1,.16));
  }
  const grip=armed?1:guard?.75:walking?.3:.2;
  for(const {b,axis,amount}of fingerFlex)b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,amount*grip)).normalize();
  content.updateWorldMatrix(true,true);for(const skin of skins)skin.skeleton.update();
  return diagnostics();
 }
 function getSocket(side){const suffix=side==='left'?'L':side==='right'?'R':null;if(!suffix)throw new RangeError('Socket side must be left or right.');const wrist=bone('wrist'+suffix),palm=bone('metacarpal2'+suffix);return{position:wp(wrist),quaternion:wrist.getWorldQuaternion(new T.Quaternion()),forward:wp(palm).sub(wp(wrist)).normalize()};}
 function getWeaponPose(){
  const q=modelQ().multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),weaponPitch));
  return{position:wp(bone('wristR')).add(V(0,0,.035).applyQuaternion(q)),quaternion:q,scaleVector:V(-CARBINE_SCALE,CARBINE_SCALE,CARBINE_SCALE),visible:['rifle','fire','reload'].includes(mode),reload:mode==='reload'?loop(sampleTime,3.2):0};
 }
 function diagnostics(){return{mode,time:sampleTime,bones:rest.size,maxReachError,clampedTargets,modelSpace:'Y-up, +Z facing; anatomical L is +X',imageDecodeValidated:false};}
 return{modes:ROOK_MOTION_MODES,pose,reset,diagnostics,getSocket,getWeaponPose};
}
