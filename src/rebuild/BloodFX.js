import * as T from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {seededRandom} from './config.js';
import {waterAt} from './City.js';
import {stepFragment} from './Ballistics.js';

const dropGeometry=new T.IcosahedronGeometry(1,1);dropGeometry.userData.shared=true;
const dropMaterial=new T.MeshStandardMaterial({color:0x650b0b,roughness:.3});dropMaterial.userData.shared=true;
const up=new T.Vector3(0,1,0),dryColor=new T.Color(0x351715),freshColor=new T.Color(0x520609);
export const BLOOD_LIMIT=150;
const surfaceBounds=new WeakMap();

// Resolve actual visible triangles, not a building's rectangular collision envelope.
// Missing facade panels and broken windows therefore cannot catch airborne blood.
export function bloodContact(from,to,roots){
 const direction=new T.Vector3().subVectors(to,from),length=direction.length();if(length<1e-7)return null;
 const ray=new T.Raycaster(from,direction.divideScalar(length),0,length);
 for(const hit of ray.intersectObjects(roots,true)){
  if(!hit.face||hit.object.userData.bloodDecal||hit.object.userData.disposable||hit.object.isSprite)continue;
  let visible=true;for(let p=hit.object;p;p=p.parent)if(!p.visible){visible=false;break;}if(!visible)continue;
  const normal=hit.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
  if(normal.dot(direction)>0)normal.negate();return{...hit,normal};
 }
 return null;
}
function bloodTexture(world,wall,index){
 world.bloodTextures??=new Map();const key=`${wall}:${index}`;if(world.bloodTextures.has(key))return world.bloodTextures.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),r=seededRandom(831+index*391+(wall?700:0));
 // Lobed core, elliptical satellites, fine droplets and gravity-aligned runs.
 c.fillStyle='rgba(255,255,255,.94)';c.beginPath();
 const edge=Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2,rad=31+r()*17;return{x:128+Math.cos(a)*rad,y:(wall?89:128)+Math.sin(a)*rad*(wall?.75:1)};});c.moveTo((edge[0].x+edge.at(-1).x)/2,(edge[0].y+edge.at(-1).y)/2);for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}c.closePath();c.shadowColor='#fff';c.shadowBlur=.8;c.fill();c.shadowBlur=0;
 for(let i=0;i<95;i++){const a=r()*Math.PI*2,d=22+Math.pow(r(),.65)*83,x=128+Math.cos(a)*d,y=(wall?90:128)+Math.sin(a)*d*(wall?.66:1),size=.5+Math.pow(r(),3)*7;c.globalAlpha=.35+r()*.6;c.beginPath();c.ellipse(x,y,size,size*(.6+r()),a,0,Math.PI*2);c.fill();}
 if(wall)for(let i=0;i<5;i++){const x=101+r()*53,y=99+r()*12,end=y+22+r()*85;c.globalAlpha=.5+r()*.3;c.lineWidth=.8+r()*2;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+2,y+18,x-2,end-12,x,end);c.strokeStyle='#fff';c.stroke();c.beginPath();c.ellipse(x,end,1.1+c.lineWidth*.3,2.6,0,0,Math.PI*2);c.fill();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.userData.shared=true;world.bloodTextures.set(key,tex);return tex;
}
export function bloodDecal(world,point,radius=.4,hit=null){
 if(!world.settings.gore||(!hit&&waterAt(world.layout,point.x,point.z)))return null;
 if(!hit&&world.bloodGroundTargets?.length){hit=bloodContact(new T.Vector3(point.x,.65,point.z),new T.Vector3(point.x,-.3,point.z),world.bloodGroundTargets);if(hit)point=hit.point;}
 const localPoint=hit?hit.object.worldToLocal(point.clone()):point;
 if(world.decals.some(m=>m.userData.surface===(hit?.object||null)&&m.userData.hitLocal?.distanceTo(localPoint)<.18))return null;
 const normal=hit?.normal||up,wall=Math.abs(normal.y)<.65,rotation=new T.Euler();
 if(hit){const matrix=new T.Matrix4().lookAt(new T.Vector3(),normal,Math.abs(normal.y)>.98?new T.Vector3(0,0,1):up);rotation.setFromRotationMatrix(matrix);}
 let geometry;
 if(hit){geometry=new DecalGeometry(hit.object,point,rotation,new T.Vector3(radius*2,radius*(wall?2.7:2),.18));if(!geometry.attributes.position.count){geometry.dispose();return null;}}
 else geometry=new T.PlaneGeometry(radius*2,radius*2);
 const material=new T.MeshStandardMaterial({map:bloodTexture(world,wall,Math.floor(world.random()*8)),color:freshColor,roughness:.29,transparent:true,opacity:.88,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:T.DoubleSide});
 const mesh=new T.Mesh(geometry,material);mesh.userData.bloodDecal=true;mesh.userData.disposable=true;mesh.userData.age=0;mesh.userData.hitLocal=localPoint.clone();mesh.userData.surface=hit?.object||null;mesh.userData.wall=wall;mesh.userData.baseRadius=radius;mesh.receiveShadow=true;
 if(hit){world.scene.add(mesh);hit.object.attach(mesh);material.clippingPlanes=hit.object.material.clippingPlanes||null;}
 else{mesh.rotation.x=-Math.PI/2;mesh.rotation.z=world.random()*Math.PI*2;mesh.position.set(point.x,.058+world.random()*.004,point.z);world.scene.add(mesh);}
 world.decals.push(mesh);if(world.decals.length>BLOOD_LIMIT)world.removeDynamic(world.decals.shift());return mesh;
}
export function bloodSpray(world,e,count=10,power=6,height=1.15){
 if(!world.settings.gore)return;
 if(e.kind==='fire'||e.kind==='electric'||e.kind==='frost')return; // Elemental damage does not punch ballistic wounds.
 const r=world.random,origin=new T.Vector3(e.x,height,e.z),direction=Math.atan2(e.dx||0,e.dz||0),directed=Math.hypot(e.dx||0,e.dz||0)>.001;
 const available=Math.max(0,90-world.effects.filter(f=>f.kind==='blood').length);if(!available)return;
 const roots=[...world.propMeshes.values(),...world.buildingMeshes.values(),...world.wrecks].filter(g=>{if(!g.visible||g.userData.collapsed)return false;g.updateWorldMatrix(true,false);let bounds=surfaceBounds.get(g);if(!bounds){bounds=new T.Box3().setFromObject(g).getBoundingSphere(new T.Sphere());bounds.applyMatrix4(g.matrixWorld.clone().invert());surfaceBounds.set(g,bounds);}return bounds.clone().applyMatrix4(g.matrixWorld).distanceToPoint(origin)<9;});
 for(const root of roots)root.updateWorldMatrix(true,true);
 for(let i=0;i<Math.min(count,available);i++){
  const speed=power*(.45+r()*.8),angle=directed&&i%5?direction+(r()-.5)*(e.kind==='slice'?2.5:1.1):r()*Math.PI*2,size=.015+Math.pow(r(),2)*.055;
  const mesh=new T.Mesh(dropGeometry,dropMaterial);mesh.position.copy(origin);mesh.position.y+=(r()-.5)*.18;mesh.scale.set(size,size*(1.2+r()),size);world.scene.add(mesh);
  world.effects.push({mesh,kind:'blood',vx:Math.sin(angle)*speed,vy:(r()-.35)*power*.5,vz:Math.cos(angle)*speed,gravity:16,drag:.75,bounce:0,life:1.5,max:1.5,targets:roots,stain:i===0?.65:.12+size*4,spin:0});
 }
}
export function stepBlood(world,e,dt){
 if(!world.settings.gore){e.life=0;return;}
 const from=e.mesh.position.clone();stepFragment(e,dt,-10);const to=e.mesh.position;let hit=bloodContact(from,to,e.targets||[]);if(!hit&&to.y<.45)hit=bloodContact(from,to,world.bloodGroundTargets||[]);
 if(hit){bloodDecal(world,hit.point,e.stain*(1+Math.min(1,Math.hypot(e.vx,e.vz)/10)),hit);e.life=0;return;}
 if(to.y<world.waterLevel()+.03&&waterAt(world.layout,to.x,to.z)){e.life=0;return;}
 if(to.y<.06){bloodDecal(world,to,e.stain);e.life=0;return;}
 const velocity=new T.Vector3(e.vx,e.vy,e.vz);if(velocity.lengthSq())e.mesh.quaternion.setFromUnitVectors(up,velocity.normalize());
}
export function ageBlood(world,dt){
 world.decals=world.decals.filter(mesh=>{
  const d=mesh.userData;d.age=(d.age||0)+dt;let attached=false;for(let p=mesh;p;p=p.parent)if(p===world.scene){attached=true;break;}
  if(!world.settings.gore||!attached||d.age>180){world.removeDynamic(mesh);return false;}
  mesh.material.color.copy(freshColor).lerp(dryColor,Math.min(1,d.age/45));mesh.material.roughness=.29+Math.min(.66,d.age/60);mesh.material.opacity=.88*Math.min(1,(180-d.age)/20);
  if(d.surface)mesh.material.clippingPlanes=d.surface.material.clippingPlanes||null;else mesh.scale.setScalar(.85+.15*Math.min(1,d.age/2));return true;
 });
}
