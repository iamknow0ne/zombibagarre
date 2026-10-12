import * as T from 'three';
import {WEAPON_MOTION,recoilAt,reloadPose,meleePose,smooth} from './WeaponMotion.js';
import {WEAPONS} from './config.js';
import {slotKey} from './Loadout.js';
const down=new T.Vector3(0,-1,0),upperLength=.34,lowerLength=.32;

export function buildWeapon(key,kit){
 const {box,cylinder,sphere,batch}=kit,g=new T.Group(),metal=0x304449,edge=0x718783,brass=0xb69a62;
 g.userData.key=key;g.userData.keepGroup=true;
 const casing=new T.Group();g.add(casing);
 const tube=(parent,color,x,y,z,r,l)=>{const m=cylinder(parent,color,x,y,z,r,l,r,10);m.rotation.x=Math.PI/2;return m;};
 if(WEAPONS[key].melee){
  box(casing,0x343c3b,0,0,.03,.075,.085,.26);for(let i=0;i<5;i++)box(casing,brass,0,.045,-.07+i*.042,.08,.013,.016);
  box(casing,brass,0,0,.18,.25,.06,.065);
  const len=key==='dual'?1.08:1.48;
  // A tapered blade reads as steel instead of a rectangular stick.
  const shape=new T.Shape();shape.moveTo(-.035,.2);shape.lineTo(.038,.2);shape.lineTo(.055,len);shape.lineTo(.012,len+.18);shape.lineTo(-.025,len);shape.closePath();
  const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),new T.MeshStandardMaterial({color:0xd4e0d9,metalness:.85,roughness:.24}));blade.rotation.x=Math.PI/2;blade.position.y=.0125;blade.castShadow=true;casing.add(blade);
  box(casing,0xf0e8ce,.025,-.003,len*.54,.012,.032,len-.23);
  g.userData.tip=new T.Vector3(0,0,len+.18);g.userData.support=new T.Vector3(0,0,-.10);
 }else{
  const p=WEAPON_MOTION[key];
  box(casing,metal,0,.10,.18,key==='launcher'?.29:.15,key==='launcher'?.25:.19,.42);
  box(casing,0x273635,0,-.05,0,.10,.22,.13);
  const barrelZ=p.length-.12;
  tube(casing,metal,0,.12,(barrelZ+.32)/2,key==='launcher'?.125:key==='flame'?.075:.038,barrelZ-.32+.2);
  tube(casing,edge,0,.12,p.length,key==='launcher'?.14:key==='flame'?.09:.047,.065);
  const bore=tube(casing,0x121e21,0,.12,p.length+.035,key==='launcher'?.105:.029,.01);bore.castShadow=false;
  if(!['revolver','smg','launcher'].includes(key)){box(casing,0x45554d,0,.1,-.19,.13,.2,.32);box(casing,0x253631,0,.1,-.37,.17,.25,.055);}
  const magazine=new T.Group();magazine.position.set(0,-.05,.19);g.add(magazine);
  if(key==='revolver'){tube(magazine,0x77817b,0,.15,.025,.112,.18);g.userData.support=new T.Vector3(-.075,-.025,.015);}
  else if(key==='flame'){for(const x of [-.14,.14])tube(casing,0x8c704a,x,.09,.13,.09,.36);box(magazine,0x695d44,0,-.07,0,.14,.22,.13);tube(casing,0xd48f4f,.055,.09,p.length-.1,.02,.18);}
  else if(key==='arc'){for(let i=0;i<4;i++){tube(casing,0x80b7b5,0,.12,.35+i*.075,.085,.028);}box(magazine,0x78a6a2,0,-.07,0,.11,.23,.15);}
  else if(key==='launcher'){tube(casing,brass,0,.12,.28,.16,.13);box(magazine,metal,0,-.065,0,.16,.19,.18);}
  else if(key==='shotgun'){tube(casing,0x57645c,0,.035,.55,.06,.5);box(magazine,brass,0,.1,0,.08,.09,.13);}
  else box(magazine,metal,0,-.1,0,.095,key==='smg'?.27:.23,.15);
  if(key==='marksman'){tube(casing,0x253b3e,0,.29,.23,.065,.36);tube(casing,0x85a6a1,0,.29,.42,.044,.018);}
  else{box(casing,brass,0,.22,.07,.055,.035,.1);box(casing,edge,0,.2,p.length-.07,.025,.06,.03);}
  const action=new T.Group();action.position.set(0,0,0);g.add(action);
  if(key==='shotgun')box(action,0x6d644e,0,.02,.53,.2,.13,.25);
  else box(action,edge,.082,.145,.18,.025,.04,.13);
  g.userData.action=action;g.userData.magazine=magazine;g.userData.magazineBase=magazine.position.clone();
  g.userData.support??=new T.Vector3(-.14,-.025,p.support);g.userData.tip=new T.Vector3(0,.12,p.length+.04);
 }
 batch(casing,casing);return g;
}

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
 const d=character.userData,body=d.body,keys=WEAPONS[state.weapon]?.melee?(state.weapon==='dual'?['dual','dual']:['katana']):state.equipped;
 d.weaponRigs??=[];
 for(let hand=0;hand<2;hand++){
  const key=keys[hand],old=d.weaponRigs[hand];
  if(old?.userData.key!==key){if(old)kit.remove(old);d.weaponRigs[hand]=key?buildWeapon(key,kit):null;if(key)body.add(d.weaponRigs[hand]);}
 }
 const two=keys.length===2,blade=WEAPONS[state.weapon]?.melee,phase=d.gait||0,walk=d.walk||0;
 let totalRecoil=0;d.gripError=0;
 for(let hand=0;hand<keys.length;hand++){
  const key=keys[hand],g=d.weaponRigs[hand],side=hand?-1:1,arm=d.arms[hand?0:1];
  const slot=slotKey(state.equipped,key,hand),shot=state.shots?.[slot],age=shot?.weapon===key?t-shot.time:99;
  const recoil=recoilAt(key,age),profile=WEAPON_MOTION[key]||WEAPON_MOTION.carbine;
  const reload=state.reloads[slot]||0,total=state.reloadDurations?.[slot]||WEAPONS[key].reload*state.reloadMultiplier;
  const f=reload>0?1-reload/total:0,r=reloadPose(f);
  const equip=1-smooth((t-(state.equippedAt??-99))/.22);
  g.position.set(side*(two?.38:.16),1.23, two?.31:.20);
  g.rotation.set(-profile.lift*recoil+r.lower*.55+equip*.48,side*(-r.lower*.28),side*(-r.lower*.3));
  g.position.z-=recoil*profile.kick+(two?0:r.lower*.055+equip*.06);g.position.y-=r.lower*.12+equip*.15;
  g.position.y+=Math.sin(t*2.4+hand*.6)*.009+Math.sin(phase*2)*walk*.012/(.5+profile.weight);
  g.rotation.y+=Math.sin(phase)*walk*.018/(.5+profile.weight);
  if(state.dash>0){g.rotation.x+=.5;g.position.z-=.08;}
  if(blade){
   const active=state.swing>0&&state.swingWeapon===key,progress=active?1-state.swing/state.swingDuration:0,pose=meleePose(key,state.swingCombo,progress);
   const striking=key==='katana'||hand===(state.swingCombo===1?1:0)||pose.finisher;
   const cut=striking?pose.twist:pose.twist*-.4;
   g.position.set(side*(two?.34:.02)+cut*.07,1.24+(striking?pose.height*.75:0),.25+pose.reach*.85);
   g.rotation.set(-.35-(striking?pose.height*1.8:0),side*.15+cut*2.2,side*.14-cut*.5);
   if(pose.finisher&&key==='dual')g.rotation.y=side*(.22+Math.abs(cut)*1.8);
   if(state.dash>0){g.rotation.x=.4;g.rotation.y=side*1.15;}
  }else{
   const mag=g.userData.magazine;mag.position.copy(g.userData.magazineBase);mag.position.y-=r.magazine*.32;mag.rotation.z=side*r.magazine*.15;
   g.userData.action.position.z=key==='shotgun'?-Math.sin(Math.PI*Math.max(0,Math.min(1,(age-.12)/.28)))*.15:key==='marksman'?-Math.sin(Math.PI*Math.max(0,Math.min(1,(age-.2)/.32)))*.12:-recoil*.045-r.rack*.08;
   if(key==='revolver')mag.rotation.z=recoil*.6;
   totalRecoil+=recoil*profile.kick;
  }
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
   if(!g.userData.flash){const flash=new T.Mesh(new T.ConeGeometry(.075,.25,5),new T.MeshBasicMaterial({color:key==='arc'?0xadecf0:0xffcf76,transparent:true,depthWrite:false}));flash.rotation.x=Math.PI/2;flash.position.copy(g.userData.tip).add(new T.Vector3(0,0,.11));g.add(flash);g.userData.flash=flash;}
   g.userData.flash.visible=age>=0&&age<.055&&!['flame'].includes(key)&&reload===0;
   g.userData.flash.scale.setScalar(key==='shotgun'?1.7:key==='launcher'?1.8:key==='smg'?.7:1);
  }
 }
 body.rotation.x-=totalRecoil*.22;
 if(blade&&state.swing>0){const pose=meleePose(state.weapon,state.swingCombo,1-state.swing/state.swingDuration);body.rotation.y+=pose.twist*.45;body.position.z=pose.reach*.35;body.rotation.x+=pose.finisher?.1:0;}else body.position.z=0;
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
  trail.points.forEach(p=>p.life-=dt);trail.points=trail.points.filter(p=>p.life>0);
  const progress=state.swing>0?1-state.swing/state.swingDuration:0;
  if(dt>0&&blade&&state.swing>0&&progress>.18&&progress<.62){
   const tip=rig.localToWorld(rig.userData.tip.clone()),base=rig.localToWorld(rig.userData.tip.clone().multiplyScalar(.82));
   trail.points.push({tip,base,life:reducedMotion?.07:.11});if(trail.points.length>13)trail.points.shift();
  }
  const positions=trail.mesh.geometry.attributes.position,fade=trail.mesh.geometry.attributes.fade;let offset=0;
  for(let i=1;i<trail.points.length;i++){const a=trail.points[i-1],b=trail.points[i];for(const [v,alpha] of [[a.base,0],[a.tip,a.life/.11],[b.tip,b.life/.11],[a.base,0],[b.tip,b.life/.11],[b.base,0]]){positions.setXYZ(offset,v.x,v.y,v.z);fade.setX(offset++,alpha);}}
  positions.needsUpdate=true;fade.needsUpdate=true;trail.mesh.geometry.setDrawRange(0,offset);trail.mesh.visible=offset>0&&!state.vehicleId;trail.mesh.material.uniforms.tint.value.setHex(state.swingCombo===2?0xf2c38b:0xd5e6df);
  trail.mesh.matrix.copy(character.matrixWorld).invert();
 }
}
