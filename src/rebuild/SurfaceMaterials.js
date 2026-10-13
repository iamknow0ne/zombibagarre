import * as T from 'three';
import {seededRandom} from './config.js';
export const SURFACES={asphalt:{tile:7,roughness:.88,bump:.055},paving:{tile:3.2,roughness:.83,bump:.035},plaster:{tile:3.5,roughness:.92,bump:.028},brick:{tile:2.8,roughness:.88,bump:.055},roof:{tile:4,roughness:.8,bump:.04},metal:{tile:1.8,roughness:.58,bump:.018},bark:{tile:1.8,roughness:.98,bump:.06},cladding:{tile:2.4,roughness:.65,bump:.045},slate:{tile:3.2,roughness:.86,bump:.04}};
// Bake world-sized UVs before batching: road junctions and broken facade panels
// share a continuous pattern, independent of the dimensions of each mesh.
export function surfaceUV(mesh,tile=4){
 mesh.updateWorldMatrix(true,false);const source=mesh.geometry,g=source.clone(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv||new T.BufferAttribute(new Float32Array(p.count*2),2),v=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);normal.fromBufferAttribute(n,i).applyMatrix3(normalMatrix);const x=Math.abs(normal.x),y=Math.abs(normal.y),z=Math.abs(normal.z);if(y>=x&&y>=z)uv.setXY(i,v.x/tile,v.z/tile);else if(x>=z)uv.setXY(i,v.z/tile,v.y/tile);else uv.setXY(i,v.x/tile,v.y/tile);}
 g.setAttribute('uv',uv);g.userData.surfaceOwned=true;mesh.geometry=g;return mesh;
}
export class SurfaceMaterials{
 constructor(){this.maps=new Map();this.materials=new Map();}
 textures(kind){
  if(this.maps.has(kind))return this.maps.get(kind);const size=512,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),r=seededRandom(713+Object.keys(SURFACES).indexOf(kind)*111),gray=(v,a=1)=>`rgba(${v},${v},${v},${a})`;
  ctx.fillStyle='#c7c5bd';ctx.fillRect(0,0,size,size);
  // Fine aggregate + broad stains keep close views tactile without high-frequency shimmer.
  for(let i=0;i<14500;i++){const v=145+r()*95;ctx.fillStyle=gray(v,.16+r()*.3);ctx.fillRect(r()*size,r()*size,1+r()*2,1+r()*2);}
  for(let i=0;i<70;i++){const x=r()*size,y=r()*size,rad=12+r()*65,g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,gray(80,r()*.12));g.addColorStop(1,gray(80,0));ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}
  if(kind==='cladding'){for(let x=0;x<size;x+=32){const g=ctx.createLinearGradient(x,0,x+32,0);g.addColorStop(0,gray(70,.32));g.addColorStop(.2,gray(240,.3));g.addColorStop(.5,gray(170,.03));g.addColorStop(1,gray(65,.3));ctx.fillStyle=g;ctx.fillRect(x,0,32,size);}for(let x=16;x<size;x+=64)for(let y=16;y<size;y+=128){ctx.fillStyle=gray(55,.55);ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();}}
  if(kind==='slate'){for(let y=0;y<size;y+=32)for(let x=-32;x<size;x+=64){const off=(y/32%2)*32;ctx.fillStyle=gray(110+r()*110,.28);ctx.fillRect(x+off,y,63,31);ctx.strokeStyle=gray(43,.4);ctx.lineWidth=1.5;ctx.strokeRect(x+off,y,64,32);ctx.fillStyle=gray(240,.35);ctx.fillRect(x+off+1,y+1,62,1);}}
  if(kind==='brick'||kind==='paving'){
   const h=kind==='brick'?32:128,w=kind==='brick'?96:128;ctx.lineWidth=kind==='brick'?3:2;ctx.strokeStyle=gray(83,.55);
   for(let row=0;row<size/h;row++){const offset=kind==='brick'?(row%2)*w/2:0;for(let x=-w+offset;x<size;x+=w){ctx.fillStyle=gray(145+r()*80,.14);ctx.fillRect(x+3,row*h+3,w-6,h-6);ctx.strokeRect(x,row*h,w,h);ctx.strokeStyle=gray(239,.35);ctx.beginPath();ctx.moveTo(x+3,row*h+2);ctx.lineTo(x+w-2,row*h+2);ctx.stroke();ctx.strokeStyle=gray(83,.55);}}
  }
  if(kind==='asphalt'||kind==='plaster')for(let i=0;i<(kind==='asphalt'?7:3);i++){let x=r()*size,y=r()*size;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<6;j++){x+=(r()-.5)*35;y+=8+r()*18;ctx.lineTo(x,y);}ctx.strokeStyle=gray(45,kind==='asphalt'?.26:.14);ctx.lineWidth=.6+r()*.9;ctx.stroke();}
  if(kind==='roof'){for(let y=0;y<size;y+=64){ctx.fillStyle=gray(63,.2);ctx.fillRect(0,y,size,2);ctx.fillStyle=gray(238,.3);ctx.fillRect(0,y+2,size,1);}for(let x=0;x<size;x+=128){ctx.fillStyle=gray(68,.16);ctx.fillRect(x,0,2,size);}}
  if(kind==='metal'){for(let i=0;i<100;i++){ctx.fillStyle=gray(55,.08);ctx.fillRect(r()*size,r()*size,.5+r(),4+r()*35);}for(let i=0;i<15;i++){ctx.fillStyle='rgba(108,62,33,.11)';ctx.beginPath();ctx.ellipse(r()*size,r()*size,2+r()*8,5+r()*22,0,0,Math.PI*2);ctx.fill();}}
  if(kind==='bark')for(let i=0;i<70;i++){let x=r()*size,y=0;ctx.beginPath();ctx.moveTo(x,0);for(let j=0;j<12;j++){x+=(r()-.5)*14;y+=size/12;ctx.lineTo(x,y);}ctx.strokeStyle=gray(35,.25);ctx.lineWidth=1+r()*3;ctx.stroke();}
  const albedo=new T.CanvasTexture(c);albedo.colorSpace=T.SRGBColorSpace;albedo.wrapS=albedo.wrapT=T.RepeatWrapping;albedo.anisotropy=4;albedo.userData.shared=true;
  const relief=albedo.clone();relief.colorSpace=T.NoColorSpace;relief.needsUpdate=true;relief.userData.shared=true;const pair={albedo,relief};this.maps.set(kind,pair);return pair;
 }
 material(kind,color){
  const key=kind+color;if(this.materials.has(key))return this.materials.get(key);const p=SURFACES[kind],{albedo,relief}=this.textures(kind),m=new T.MeshStandardMaterial({color,map:albedo,bumpMap:relief,bumpScale:p.bump,roughness:p.roughness,roughnessMap:relief,metalness:kind==='metal'?.55:kind==='cladding'?.25:0});m.userData.shared=true;m.userData.surfaceKind=kind;m.userData.surfaceColor=color;m.userData.surfaceBump=p.bump;this.materials.set(key,m);return m;
 }
 apply(mesh,kind,color){surfaceUV(mesh,SURFACES[kind].tile);mesh.material=this.material(kind,color);return mesh;}
 dispose(){for(const m of this.materials.values())m.dispose();for(const p of this.maps.values()){p.albedo.dispose();p.relief.dispose();}this.materials.clear();this.maps.clear();}
}
