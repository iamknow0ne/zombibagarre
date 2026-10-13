import {focusDivePose} from './BulletTime.js';
import {createWeaponMesh} from './WeaponModels.js';
import {weaponTier,WEAPON_FINISHES} from './Evolution.js';
import * as T from 'three';
import {WEAPON_MOTION,recoilAt,meleePose,smooth,shotPose,weaponReloadPose} from './WeaponMotion.js';
import {WEAPONS} from './config.js';
import {slotKey,normalizeLoadout} from './Loadout.js';
const diveRotation=new T.Quaternion(),diveEuler=new T.Euler();
const down=new T.Vector3(0,-1,0),upperLength=.34,lowerLength=.32;

export const buildWeapon=(key,kit,tier=0)=>createWeaponMesh(key,kit,tier);

// Solve both bones in body space. Hands remain on their grips through recoil,
// aim, movement and weapon-specific reloads instead of floating alongside guns.
export function solveArm(arm,target,orientation,side){
 const shoulder=arm.position,dir=target.clone().sub(shoulder),distance=Math.min(upperLength+lowerLength-.002,Math.max(.025,dir.length()));dir.normalize();
 const pole=new T.Vector3(side*.65,-1,-.22);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
 const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
 const joint=shoulder.clone().addScaledVector(dir,along).addScaledVector(pole,height),end=shoulder.clone().addScaledVector(dir,distance);
 arm.quaternion.setFromUnitVectors(down,joint.clone().sub(shoulder).normalize());
 const elbow=arm.userData.elbow,forearm=new T.Quaternion().setFromUnitVectors(down,end.clone().sub(joint).normalize());
 elbow.quaternion.copy(arm.quaternion).invert().multiply(forearm);
 arm.userData.wrist.quaternion.copy(forearm).invert().multiply(orientation);
 return end.distanceTo(target);
}

export function animateWeapons(character,state,t,dt,kit){
 const d=character.userData,body=d.body,keys=WEAPONS[state.weapon]?.melee?(state.weapon==='dual'?['dual','dual']:[state.weapon]):normalizeLoadout([state.weapon,...(state.equipped||[]).slice(1)]);
 d.weaponRigs??=[];
 for(let hand=0;hand<2;hand++){
  const key=keys[hand],old=d.weaponRigs[hand];
  if(old?.userData.key!==key||(key&&(old?.userData.tier!==weaponTier(state,key)||old?.userData.relic!==(state.rpgRelic?.base===key?state.rpgRelic.name:null)))){if(old)kit.remove(old);d.weaponRigs[hand]=key?buildWeapon(key,kit,weaponTier(state,key)):null;if(key){const rig=d.weaponRigs[hand],r=state.rpgRelic?.base===key?state.rpgRelic:null;rig.userData.relic=r?.name||null;if(r){kit.box(rig,r.color,0,.08,.22,.07,.07,.35,{emissive:r.color,emissiveIntensity:.5,metalness:.8});}body.add(rig);}}
 }
 const two=keys.length===2,blade=WEAPONS[state.weapon]?.melee,phase=d.gait||0,walk=d.walk||0;
 let totalRecoil=0;d.gripError=0;
 for(let hand=0;hand<keys.length;hand++){
  const key=keys[hand],g=d.weaponRigs[hand],side=hand?-1:1,arm=d.arms[hand?0:1];
  const slot=slotKey(state.equipped,key,hand),shot=state.shots?.[slot],age=shot?.weapon===key?t-shot.time:99;
  const variation=shot?.variant||0,recoil=recoilAt(key,age),motion=shotPose(key,age,variation),profile=WEAPON_MOTION[key]||WEAPON_MOTION.carbine;
  const reload=state.reloads[slot]||0,total=state.reloadDurations?.[slot]||WEAPONS[key].reload*state.reloadMultiplier;
  const f=reload>0?1-reload/total:0,r=weaponReloadPose(key,f);
  const equip=1-smooth((t-(state.equippedAt??-99))/.22);
  g.position.set(side*(two?.38:.16),1.23, two?.31:.20);
  g.rotation.set(-profile.lift*recoil+r.lower*.55+equip*.48,side*(-r.lower*.28),side*(-r.lower*.3));
  g.position.z-=recoil*profile.kick+(two?0:r.lower*.055+equip*.06);g.position.y-=r.lower*.12+equip*.15;
  g.position.y+=Math.sin(t*2.4+hand*.6)*.009+Math.sin(phase*2)*walk*.012/(.5+profile.weight);
  g.rotation.y+=Math.sin(phase)*walk*.018/(.5+profile.weight)+motion.yaw*side;g.rotation.z+=motion.roll*side;g.rotation.x+=motion.pitch;g.position.y+=motion.rise;g.rotation.z-=(d.motion?.pose?.roll||0)*.28;g.rotation.x-=(d.motion?.pose?.pitch||0)*.16;
  if(state.dash>0&&!state.focusDive){g.rotation.x+=.5;g.position.z-=.08;}
  if(blade){
   const active=state.swing>0&&state.swingWeapon===key,progress=active?1-state.swing/state.swingDuration:0,pose=meleePose(key,state.swingCombo,progress,state.swingVariant||0);
   const striking=key!=='dual'||hand===(state.swingCombo===1?1:0)||pose.finisher;
   const cut=striking?pose.twist:pose.twist*-.4;
   g.position.set(side*(two?.34:.02)+cut*.07,1.24+(striking?pose.height*.75:0),.25+pose.reach*.85);
   g.rotation.set(-.35-(striking?pose.height*1.8:0),side*.15+cut*2.2,side*.14-cut*.5);
   if(pose.finisher&&key==='dual')g.rotation.y=side*(.22+Math.abs(cut)*1.8);
   if(state.dash>0){g.rotation.x=.4;g.rotation.y=side*1.15;}
  }else{
   const mag=g.userData.magazine;mag.position.copy(g.userData.magazineBase);mag.position.y-=r.magazine*.32;mag.position.x+=side*r.side;mag.rotation.set(r.tilt,0,side*r.magazine*.15+r.spin);
   g.userData.action.position.z=key==='shotgun'?-Math.sin(Math.PI*Math.max(0,Math.min(1,(age-.12)/.28)))*.15:key==='marksman'?-Math.sin(Math.PI*Math.max(0,Math.min(1,(age-.2)/.32)))*.12:-recoil*.045-r.rack*.08;
   if(key==='revolver')mag.rotation.z+=recoil*.6;
   if(g.userData.rotor){g.userData.rotor.rotation.z=key==='arc'?Math.sin(t*5)*recoil*.15:0;g.userData.rotor.position.y=key==='arc'?Math.sin(t*18)*recoil*.012:0;}
   totalRecoil+=recoil*profile.kick;
  }
  if(!blade&&state.focusDive){const dive=focusDivePose(state);g.position.z-=dive.lift*.2;diveRotation.setFromEuler(diveEuler.set(dive.pitch,0,dive.roll)).invert();g.quaternion.premultiply(diveRotation);}
  g.updateMatrix();const grip=new T.Vector3(0,0,0).applyMatrix4(g.matrix);
  if(state.throwAnimation>.12&&hand===0){const f=1-state.throwAnimation/.5;g.visible=false;const q=smooth(f/.55);grip.set(.34,1.65+Math.sin(f*Math.PI)*.22,-.26+q*.77);}else g.visible=true;
  d.gripError=Math.max(d.gripError,solveArm(arm,grip,g.quaternion,side));
  if(!two){
   const support=g.userData.support.clone().applyMatrix4(g.matrix);
   if(!blade&&reload>0){support.lerp(new T.Vector3(-.28,.89,.12),r.reach);}
   if(state.throwAnimation>.12)support.set(-.25,1.05,.28);
   d.gripError=Math.max(d.gripError,solveArm(d.arms[0],support,g.quaternion,-1));
  }
  // Short-lived muzzle meshes live on the barrel and follow the hand exactly.
  if(!blade){
   if(!g.userData.flash){
    const flash=new T.Group();flash.position.copy(g.userData.tip);g.add(flash);g.userData.flash=flash;
    const color=WEAPON_FINISHES[key].accent;
    const material=new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color)},seed:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float seed;void main(){float y=vUv.y,x=abs(vUv.x-.5);float wave=sin(y*31.+seed*8.)*.018+sin(y*53.+seed)*.012;float width=(1.-y)*.34;float edge=1.-smoothstep(width*.25,width+.04,x+wave);float fade=smoothstep(0.,.09,y)*(1.-smoothstep(.45,1.,y));float core=exp(-x*22.)*(1.-smoothstep(.1,.85,y));float alpha=edge*fade*.68;gl_FragColor=vec4(mix(tint,vec3(1.,.98,.88),core),alpha);}`,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
    for(let i=0;i<3;i++){const m=new T.Mesh(new T.PlaneGeometry(.25,.52),material);m.rotation.x=Math.PI/2;m.rotation.y=i*Math.PI/3;m.position.z=.23;flash.add(m);}

   }
   const flash=g.userData.flash;flash.visible=age>=0&&age<(key==='arc'?.085:.06)&&key!=='flame'&&reload===0;flash.rotation.z=variation*.71;flash.children.forEach(m=>m.material.uniforms.seed.value=variation);
   const power=(key==='shotgun'?1.5:key==='launcher'?1.8:key==='smg'?.65:1)*(1+g.userData.tier*.12)*(1-variation*.065);flash.scale.set(power,power,power*(variation===2?1.25:1));

  }
 }
 body.rotation.x-=totalRecoil*.22;
 if(blade&&state.swing>0){const pose=meleePose(state.weapon,state.swingCombo,1-state.swing/state.swingDuration,state.swingVariant||0);body.rotation.y+=pose.twist*.45;body.position.z=pose.reach*.35;body.rotation.x+=pose.finisher?.1:0;}else body.position.z=0;
}

export function updateBladeTrails(character,state,dt,reducedMotion=false){
 const d=character.userData;d.bladeTrails??=[];character.updateWorldMatrix(true,true);
 for(let hand=0;hand<2;hand++){
  const rig=d.weaponRigs?.[hand],blade=rig&&WEAPONS[rig.userData.key].melee;
  let trail=d.bladeTrails[hand];
  if(blade&&!trail){
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(12*6*3),3));geo.setAttribute('fade',new T.BufferAttribute(new Float32Array(12*6),1));
   const mesh=new T.Mesh(geo,new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(0xd5e6df)}},vertexShader:'attribute float fade; varying float opacity; void main(){opacity=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 tint; varying float opacity; void main(){gl_FragColor=vec4(tint,opacity*.32);}',side:T.DoubleSide,transparent:true,depthWrite:false}));mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;character.add(mesh);trail=d.bladeTrails[hand]={mesh,points:[]};
  }
  if(!trail)continue;
  // A switch can happen while paused: never rely on elapsed time to hide old steel.
  if(!blade||state.vehicleId){trail.points=[];trail.mesh.geometry.setDrawRange(0,0);trail.mesh.visible=false;continue;}
  trail.points.forEach(p=>p.life-=dt);trail.points=trail.points.filter(p=>p.life>0);
  const progress=state.swing>0?1-state.swing/state.swingDuration:0;
  if(dt>0&&blade&&state.swing>0&&progress>.18&&progress<.62){
   const tip=rig.localToWorld(rig.userData.tip.clone()),base=rig.localToWorld(rig.userData.tip.clone().multiplyScalar(.82));
   trail.points.push({tip,base,life:reducedMotion?.07:.11});if(trail.points.length>13)trail.points.shift();
  }
  const positions=trail.mesh.geometry.attributes.position,fade=trail.mesh.geometry.attributes.fade;let offset=0;
  for(let i=1;i<trail.points.length;i++){const a=trail.points[i-1],b=trail.points[i];for(const [v,alpha] of [[a.base,0],[a.tip,a.life/.11],[b.tip,b.life/.11],[a.base,0],[b.tip,b.life/.11],[b.base,0]]){positions.setXYZ(offset,v.x,v.y,v.z);fade.setX(offset++,alpha);}}
  positions.needsUpdate=true;fade.needsUpdate=true;trail.mesh.geometry.setDrawRange(0,offset);trail.mesh.visible=offset>0&&!state.vehicleId;trail.mesh.material.uniforms.tint.value.setHex(weaponTier(state,rig.userData.key)>=2?WEAPON_FINISHES[rig.userData.key].accent:state.swingCombo===2?0xf2c38b:0xd5e6df);
  trail.mesh.matrix.copy(character.matrixWorld).invert();
 }
}
