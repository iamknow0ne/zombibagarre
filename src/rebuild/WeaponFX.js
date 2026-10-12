import * as T from 'three';
import {WEAPON_FINISHES} from './Evolution.js';
import {debris,materialFor} from './Effects.js';
const up=new T.Vector3(0,1,0),casingGeo=new T.CylinderGeometry(.024,.027,.11,7),streakGeo=new T.CylinderGeometry(.012,.002,1,5);
casingGeo.userData.shared=streakGeo.userData.shared=true;
const brass=new T.MeshStandardMaterial({color:0xc6a366,metalness:.8,roughness:.27});brass.userData.shared=true;
export function streak(world,x,y,z,vx,vy,vz,color=0xffd797,life=.22,size=1){
 const m=new T.Mesh(streakGeo,new T.MeshBasicMaterial({color,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));m.position.set(x,y,z);m.scale.set(size,.16+Math.hypot(vx,vy,vz)*.014,size);m.quaternion.setFromUnitVectors(up,new T.Vector3(vx,vy,vz).normalize());world.scene.add(m);world.effects.push({mesh:m,kind:'streak',vx,vy,vz,life,max:life,gravity:9,drag:1.8,bounce:.15});
}
export function plume(world,x,y,z,size=.35,life=.5,color=0x888a80){
 if(!world.smokeTex)world.smoke(x,z,0);const m=new T.Sprite(new T.SpriteMaterial({map:world.smokeTex,color,transparent:true,opacity:.3,depthWrite:false}));m.position.set(x,y,z);m.scale.setScalar(size);m.material.rotation=world.random()*6;m.userData.disposableMaterial=true;world.scene.add(m);world.effects.push({mesh:m,kind:'smoke',vx:(world.random()-.5)*.5,vy:.4+world.random()*.5,vz:(world.random()-.5)*.5,life,max:life});
}
export function ejectCasing(world,e,delay=0){
 const r=world.random,m=new T.Mesh(casingGeo,brass);m.scale.setScalar(e.weapon==='shotgun'?1.4:1);m.position.set(e.x,1.25,e.z);m.rotation.set(r()*3,r()*6,1.2);m.visible=!delay;world.scene.add(m);world.effects.push({mesh:m,kind:'casing',delay,life:2.7,max:2.7,vx:Math.cos(e.angle||0)*(1.1+r()),vz:-Math.sin(e.angle||0)*(1.1+r()),vy:1.8+r(),spin:9+r()*8,bounce:.36,drag:.2,gravity:9.81});
}
export function weaponShot(world,e){
 const r=world.random,tier=e.tier||0,profile=WEAPON_FINISHES[e.weapon],color=profile.accent,sx=Math.sin(e.angle),sz=Math.cos(e.angle),x=e.x+sx*.9,z=e.z+sz*.9;
 if(e.weapon==='flame'){
  world.flame(x,z,3+tier,1.15,e.angle);if(tier===3)world.flame(x,z,2,1.15,e.angle,false,true);if(tier>=2)for(let i=0;i<2;i++)streak(world,x,1.15,z,sx*(8+r()*4),r()*.7,sz*(8+r()*4),0xa6dfff,.1,.8);if((e.variant||0)%3===0)plume(world,x,1.2,z,.5,.65,0x6a6255);
 }else if(e.weapon==='arc'){
  world.lightning({x:x-sz*.12,z:z+sx*.12,toX:x+sz*.12,toZ:z-sx*.12,tier});for(let i=0;i<2+tier;i++)streak(world,x,1.2,z,(r()-.5)*3,r()*2,(r()-.5)*3,color,.12,.7);
 }else{
  const heavy=['shotgun','revolver','launcher'].includes(e.weapon),count=heavy?6+tier*2:2+tier;
  for(let i=0;i<count;i++){const spread=(r()-.5)*(heavy?.9:.35),a=e.angle+spread,speed=3+r()*5;streak(world,x,1.2,z,Math.sin(a)*speed,(r()-.3)*2,Math.cos(a)*speed,color,.08+r()*.08,heavy?1.1:.65);}
  if(heavy||e.variant===0)plume(world,x,1.25,z,heavy?.6:.28,heavy?.65:.35);
  if(!['revolver','launcher'].includes(e.weapon))ejectCasing(world,e,e.weapon==='shotgun'?.18:e.weapon==='marksman'?.26:0);
 }
 world.shake=Math.max(world.shake,['shotgun','launcher'].includes(e.weapon)?.16:e.weapon==='revolver'?.1:.025);world.muzzleLight.position.set(x,1.4,z);world.muzzleLight.color.setHex(color);world.muzzleLight.intensity=(e.weapon==='flame'?10:18)*(1+tier*.2);
}
export function weaponImpact(world,e){
 const r=world.random,kind=e.material||materialFor(e.kind),hard=['metal','concrete','brick'].includes(kind),normal=e.normal||{x:0,z:1},tier=e.tier||0,heavy=['shotgun','revolver','marksman'].includes(e.weapon),power=heavy?5:3,color=WEAPON_FINISHES[e.weapon]?.accent||0xffcf85;
 if(hard)for(let i=0;i<(e.weapon==='shotgun'?4:heavy?9:4)+tier;i++)streak(world,e.x,e.y||1.1,e.z,normal.x*power+(r()-.5)*power,1+r()*power*.6,normal.z*power+(r()-.5)*power,color,.15+r()*.22,.6+r());
 if(e.weapon!=='flame'&&e.kind!=='building')debris(world,{x:e.x,z:e.z,y:e.y||1,material:kind,count:e.weapon==='shotgun'?2:heavy?5:2,power,scale:heavy?.45:.25,direction:{x:normal.x*2,z:normal.z*2}});
 if(e.weapon==='flame')world.flame(e.x,e.z,2+tier,e.y||.6);
 else if(e.weapon==='arc')world.lightning({x:e.x-.15,z:e.z,toX:e.x+.15,toZ:e.z+.05,y:.7,toY:1.4,tier});
 else plume(world,e.x,(e.y||1)+.1,e.z,heavy?.8:.4,.55,kind==='wood'?0x9c8b6b:0x9a9c91);
}
export function projectileMesh(b){
 const color=b.enemy?0xa7cb6c:WEAPON_FINISHES[b.weapon]?.accent||0xffe3a3,g=new T.Group();
 if(b.weapon==='flame'){g.visible=false;return g;}
 if(b.weapon==='launcher'){
  const shell=new T.Mesh(new T.CapsuleGeometry(.09,.18,3,8),brass);shell.rotation.x=Math.PI/2;g.add(shell);const band=new T.Mesh(new T.TorusGeometry(.094,.013,4,8),new T.MeshBasicMaterial({color}));band.position.z=.04;g.add(band);
 }else{
  const length=b.enemy?.26:b.weapon==='marksman'?1.05:b.weapon==='shotgun'?.24:.48;
  for(let i=0;i<2;i++){const m=new T.Mesh(new T.CylinderGeometry(i?.018:.007,i?.009:.007,length*(1+(b.tier||0)*.15),5),new T.MeshBasicMaterial({color:i?color:0xfffae4,transparent:true,opacity:i?.28:.95,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=Math.PI/2;m.scale.setScalar(b.enemy?3:1);g.add(m);}
 }return g;
}
export function evolutionFX(world,e){const color=WEAPON_FINISHES[e.weapon].accent;for(let i=0;i<18;i++){const a=i/18*Math.PI*2;streak(world,e.x,1,e.z,Math.sin(a)*2,2+world.random()*2,Math.cos(a)*2,color,.65,1);} }
export function cutWave(world,e){
 const f=WEAPON_FINISHES[e.weapon],g=new T.Group(),count=e.weapon==='dual'?2:1;
 for(let i=0;i<count;i++){const m=new T.Mesh(new T.TorusGeometry(e.radius*.65,.022,4,32,Math.PI*.8),new T.MeshBasicMaterial({color:f.accent,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));m.rotation.set(Math.PI/2,i?-.2:.2,e.angle-.4*Math.PI);g.add(m);}
 g.position.set(e.x,.9,e.z);world.scene.add(g);world.effects.push({mesh:g,kind:'cutwave',life:.24,max:.24,vx:Math.sin(e.angle)*8,vz:Math.cos(e.angle)*8});
}
