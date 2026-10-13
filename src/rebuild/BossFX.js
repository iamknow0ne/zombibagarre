import * as T from 'three';
import {debris} from './Effects.js';
import {plume,streak} from './WeaponFX.js';
import {waterAt} from './City.js';

// Impact centres use the same lane/annulus footprint as combat. Never fill a safe centre.
export function bossImpactPlan(e,quality='high'){
 const theme=e.bossColor===0xd8e9ee?'ice':(e.bossKind||e.kind||'warden');
 const palette={cinder:{color:0xffaa54,dust:0x736453,material:'concrete'},dredger:{color:0xa8e4e8,dust:0x92adae,material:'metal'},bloom:{color:0xc9dc83,dust:0x85836a,material:'wood'},ice:{color:0x5cb9e5,dust:0x7397ad,material:'glass'},warden:{color:0xffd18b,dust:0x918676,material:'concrete'}}[theme];
 const density=quality==='low'?.5:quality==='balanced'?.75:1,large=(e.bossHeight||e.height||6)>9,n=Math.ceil((e.shape==='lane'?9:e.innerRadius?12:7)*density),points=[];
 for(let i=0;i<n;i++){
  const a=i*2.3999632297,r=e.innerRadius?e.innerRadius+((e.radius||3)-e.innerRadius)*.55:(e.radius||3)*Math.sqrt((i+.25)/n)*.83;
  const along=((i+.5)/n-.5)*(e.length||0),side=Math.sin(i*2.4)*(e.width||2)*.22;
  points.push({x:e.x+(e.shape==='lane'?Math.sin(e.angle)*along+Math.cos(e.angle)*side:Math.sin(a)*r),z:e.z+(e.shape==='lane'?Math.cos(e.angle)*along-Math.sin(e.angle)*side:Math.cos(a)*r)});
 }
 return {theme,...palette,points,large,density};
}
function groundBurst(world,e,p){
 const vertices=[];
 // One draw call for all jagged impact cracks; their short lifetime distinguishes aftermath from warnings.
 for(const q of p.points.filter(q=>!waterAt(world.layout,q.x,q.z)))for(let k=0;k<5;k++){
  const a=k*Math.PI*2/5+world.random()*.4,length=.35+world.random()*.8,w=.045+world.random()*.07;
  const x=q.x-e.x,z=q.z-e.z,dx=Math.sin(a)*length,dz=Math.cos(a)*length;
  vertices.push(x-w,.04,z,x+w,.04,z,x+dx*.5,.04,z+dz*.5,x+dx*.5,.04,z+dz*.5,x+w,.04,z,x+dx,.04,z+dz);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:p.color,transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide,toneMapped:false}));m.position.set(e.x,.055,e.z);world.scene.add(m);world.effects.push({mesh:m,kind:'boss-ground',life:.95,max:.95});
 if(e.shape!=='lane'){
  const ring=world.ring(e.radius||3,p.color,.08);ring.position.set(e.x,waterAt(world.layout,e.x,e.z)?world.waterLevel()+.08:.085,e.z);world.scene.add(ring);world.effects.push({mesh:ring,kind:'boss-wave',life:.38,max:.38});
 }
}
export function bossImpactFX(world,event){
 const ceremony=event.type==='boss-phase'||event.type==='boss-defeated';
 const e=ceremony?{...event,radius:Math.min(6,(event.height||6)*.43),bossKind:event.kind||event.bossKind}:event;
 const p=bossImpactPlan(e,world.settings.quality),start=world.effects.length,cap=Math.min(360,start+(world.settings.quality==='low'?64:140));
 if(start>=360)return;
 groundBurst(world,e,p);
 if(ceremony){
  for(const f of [.25,.55,.8]){
   if(world.effects.length>cap-10)break;
   const y=(event.height||6)*f;
   debris(world,{x:e.x,z:e.z,y,material:p.theme==='cinder'||p.theme==='dredger'?'metal':p.material,count:4,power:7,scale:1.7});
   plume(world,e.x,y,e.z,3,1.6,p.dust);
   if(p.theme==='cinder'&&!waterAt(world.layout,e.x,e.z))world.flame(e.x,e.z,2,y,null,true);
  }
 }
 for(const q of p.points){
  if(world.effects.length>cap-18)break;
  const wet=!!waterAt(world.layout,q.x,q.z),water=wet||p.theme==='dredger';
  if(water){
   const first=world.effects.length;world.splash(q.x,q.z,1.8);
   for(const spray of world.effects.slice(first)){if(!wet)spray.mesh.position.y+=.12-world.waterLevel();if(spray.kind==='water'){spray.mesh.scale.multiplyScalar(1.8);spray.vy*=1.4;}}
   plume(world,q.x,.4,q.z,2.2,1,0xc0d8d6);
   if(!wet)debris(world,{...q,y:.1,material:'metal',count:2,power:6,scale:1.3});
  }
  else{
   debris(world,{...q,y:.12,material:p.material,count:p.density<1?4:6,power:p.large?9:6,scale:p.theme==='ice'?3:p.large?1.8:1.2});
   plume(world,q.x,.25,q.z,p.large?2.5:1.7,1.35,p.dust);const dust=world.effects.at(-1),out=Math.atan2(q.x-e.x,q.z-e.z);dust.vx=Math.sin(out)*2;dust.vz=Math.cos(out)*2;dust.vy=.4;
   if(p.theme==='cinder')world.flame(q.x,q.z,2,.12,null,true);
   for(let k=0;k<2;k++){const a=world.random()*Math.PI*2;streak(world,q.x,.2,q.z,Math.sin(a)*4,3+world.random()*5,Math.cos(a)*4,p.color,.4+world.random()*.25,p.large?2:1.3);}
  }
 }
 const lamp=world.blastLights?.reduce((a,b)=>a.userData.life<b.userData.life?a:b);if(lamp){lamp.position.set(e.x,2,e.z);lamp.color.setHex(p.color);lamp.userData.life=.42;lamp.userData.power=world.settings.reducedMotion?55:ceremony?190:125;lamp.intensity=lamp.userData.power;}
 if(!world.settings.reducedMotion)world.shake=Math.max(world.shake||0,ceremony?.42:p.large?.3:.2);
}
export function stepBossEffect(e,dt){
 e.mesh.material.opacity=Math.max(0,e.life/e.max)*(e.kind==='boss-ground'?.7:.52);
 // The expanding rim stays near the hit boundary; no filled disc obscures a safe annulus.
 if(e.kind==='boss-wave')e.mesh.scale.setScalar(.92+.08*(1-e.life/e.max));
}
