import * as T from 'three';
import {seededRandom,segmentBoxTime,pointBlocked} from './config.js';

import {buildingStyle} from './City.js';

// Orthographic sightlines are parallel. Test the feet as well as the torso,
// with a shoulder-width margin, so roof edges cannot erase the player.
export function obscuresSurvivor(plan,player,direction={x:26,y:35,z:32}){
 const hit=segmentBoxTime(player,{x:player.x+direction.x,z:player.z+direction.z},{x:plan.x,z:plan.z,w:plan.w+2.2,d:plan.d+2.2});
 return hit!==null&&.08+direction.y*hit<plan.h+3.4;
}

export function dressBuilding(world,g,b,kit){
 const {box,cylinder,sphere,sign,mat,texture}=kit,r=seededRandom((world.layout.mapSeed^((b.x+128)*739+(b.z+128)*193))>>>0);
 const style=b.style||buildingStyle(b.x,b.z,b.factory),trim=style==='warehouse'?0x879596:0xc8baa0,iron=0x344649;
 const original=new Set();g.traverse(o=>original.add(o));
 g.userData.style=style;
 if(style==='foundry'){
  if(!world.industrialMaterial){const sheet=texture(128,128,c=>{c.fillStyle='#74817d';c.fillRect(0,0,128,128);for(let x=0;x<128;x+=12){c.fillStyle='#475b5c';c.fillRect(x,0,2,128);c.fillStyle='#97a297';c.fillRect(x+2,0,2,128);}c.fillStyle='#85644e';c.fillRect(0,106,128,22);});world.industrialMaterial=new T.MeshStandardMaterial({map:sheet,bumpMap:sheet,bumpScale:.07,roughness:.7,metalness:.25});}
  for(const m of g.userData.sections)if(m.position.y<b.h)m.material=world.industrialMaterial;
 }

 const roofAccessories=new T.Group();roofAccessories.userData.keepGroup=true;g.add(roofAccessories);g.userData.roofAccessories=roofAccessories;
 // Roof fixtures remain attached to the structure through collapse.
 if((style==='hotel'||style==='tenement')&&(!b.roof||['hip','gable'].includes(b.roof))){
  world.roofMaterials??={};
  if(!world.roofMaterials[style]){const tiles=texture(256,256,c=>{const rr=seededRandom(719);c.fillStyle=style==='hotel'?'#607884':'#94765d';c.fillRect(0,0,256,256);for(let y=0;y<256;y+=16)for(let x=-16;x<256;x+=32){const off=(y/16%2)*16;c.fillStyle=`rgba(18,30,34,${.08+rr()*.13})`;c.fillRect(x+off,y,31,15);c.strokeStyle='rgba(23,37,40,.35)';c.lineWidth=1;c.strokeRect(x+off,y,32,16);c.fillStyle='rgba(220,222,199,.13)';c.fillRect(x+off,y,30,1);}});tiles.wrapS=tiles.wrapT=T.RepeatWrapping;tiles.repeat.set(4,3);world.roofMaterials[style]=new T.MeshStandardMaterial({map:tiles,bumpMap:tiles,bumpScale:.08,roughness:.76});}
  let roof;
  if(b.roof==='gable'){
   roof=new T.Group();roof.userData.keepGroup=true;const rise=Math.min(2.8,b.w*.24),slope=Math.atan2(rise,b.w/2),length=Math.hypot(b.w/2,rise);
   for(const side of [-1,1]){const panel=box(roof,0x607884,side*b.w/4,b.h+rise/2,0,length+.15,.16,b.d+.35);panel.material=world.roofMaterials[style];panel.rotation.z=-side*slope;}
   const capGeo=new T.BufferGeometry();capGeo.setAttribute('position',new T.Float32BufferAttribute([-b.w/2,0,0,b.w/2,0,0,0,rise,0],3));capGeo.computeVertexNormals();
   for(const side of [-1,1]){const cap=new T.Mesh(capGeo,mat(b.color,{side:T.DoubleSide}));cap.position.set(0,b.h,side*b.d/2);roof.add(cap);}
  }else{roof=new T.Mesh(new T.CylinderGeometry(.72,1,1,4,1,false,Math.PI/4),world.roofMaterials[style]);roof.scale.set(b.w*.69,2.7,b.d*.69);roof.position.y=b.h+1.3;}
  g.add(roof);g.userData.decoratedRoof=roof;roof.userData.breakablePart=true;g.userData.sections.push(roof);
  for(const x of [-b.w*.3,b.w*.25]){box(roofAccessories,0x9b8065,x,b.h+2.5,-b.d*.19,.8,2.1,1);box(roofAccessories,0xb6a58c,x,b.h+3.55,-b.d*.19,1,.15,1.2);}
  if(b.roof!=='gable')for(let x=-b.w*.32;x<b.w*.4;x+=3.5){box(roofAccessories,trim,x,b.h+1,b.d*.34,1.6,1.6,1.1);box(roofAccessories,0x2b414d,x,b.h+1,b.d*.34+.57,.85,1,.03);box(roofAccessories,0x465b67,x,b.h+1.9,b.d*.34,1.9,.2,1.4);}
 }else if(style==='civic'){
  const tower=box(roofAccessories,0xb7ad95,0,b.h+1.5,0,4,3,4);tower.userData.breakablePart=true;g.userData.sections.push(tower);
  cylinder(roofAccessories,0x466564,0,b.h+3.7,0,3,1.5,0,4);
  const clock=new T.Mesh(new T.CircleGeometry(.9,24),mat(0xded7b7));clock.position.set(0,b.h+1.6,2.02);roofAccessories.add(clock);box(roofAccessories,iron,0,b.h+1.9,2.04,.07,.65,.025);const hand=box(roofAccessories,iron,.22,b.h+1.57,2.05,.5,.055,.025);hand.rotation.z=.3;
  for(const x of [-b.w*.32,b.w*.32])cylinder(roofAccessories,trim,x,1.8,b.d/2+.25,.3,3.6,.3,12);
 }else{
  for(let i=0;i<3;i++){const x=-b.w*.3+i*b.w*.3;box(roofAccessories,0x6e7e7b,x,b.h+.65,0,2.8,1,2);for(let k=0;k<6;k++)box(roofAccessories,iron,x-.95+k*.38,b.h+1.16,0,.12,.03,1.6);cylinder(roofAccessories,0x596967,x,b.h+.7,-b.d*.3,.25,1.5);}
  if(style==='warehouse'&&b.primary!==false&&Math.min(b.w,b.d)>10){for(const x of [-4,4]){box(roofAccessories,iron,x,b.h+2,4,.2,4,.2);box(roofAccessories,iron,x,b.h+2,-4,.2,4,.2);}cylinder(roofAccessories,0x8b6250,0,b.h+3.4,0,3.6,3.2,3.6,16);cylinder(roofAccessories,0x364b4d,0,b.h+5.1,0,3.85,.3,3.85,16);}
 }
 if((style==='foundry'||style==='warehouse')&&b.roof==='gable'){
  const roof=new T.Group();roof.userData.keepGroup=true;const rise=Math.min(2.4,b.w*.2),slope=Math.atan2(rise,b.w/2),length=Math.hypot(b.w/2,rise);
  for(const side of [-1,1]){const panel=box(roof,0x566b6a,side*b.w/4,b.h+rise/2,0,length+.15,.16,b.d+.3);panel.rotation.z=-side*slope;}
  g.add(roof);g.userData.decoratedRoof=roof;roof.userData.breakablePart=true;g.userData.sections.push(roof);
 }
 if(['flat','terrace'].includes(b.roof)){
  for(const side of [-1,1]){box(roofAccessories,trim,side*b.w/2,b.h+.4,0,.18,.65,b.d);box(roofAccessories,trim,0,b.h+.4,side*b.d/2,b.w,.65,.18);}
  if(b.roof==='terrace'){box(roofAccessories,b.color,-b.w*.12,b.h+1,0,b.w*.46,1.8,b.d*.42);box(roofAccessories,0x465c62,-b.w*.12,b.h+1.94,0,b.w*.48,.15,b.d*.44);box(roofAccessories,0x3b555c,-b.w*.12,b.h+1,b.d*.215,b.w*.29,.95,.03);}
 }
 // Window trims, shutters, balconies and occasional boarded openings.
 for(let side=0;side<4;side++){
  const width=side<2?b.w:b.d,face=new T.Group();face.position.set(side<2?0:(side===2?1:-1)*(b.w/2+.23),0,side<2?(side===0?1:-1)*(b.d/2+.23):0);face.rotation.y=[0,Math.PI,Math.PI/2,-Math.PI/2][side];g.add(face);
  const bays=Math.max(2,Math.floor(width/2.7)),bay=width/bays;
  for(let y=4.1;y<b.h;y+=2.8)for(let i=0;i<bays;i++){const x=-width/2+bay*(i+.5);
   box(face,trim,x,y-.73,.035,1.35,.14,.22);box(face,trim,x,y+.73,.035,1.35,.1,.12);
   box(face,iron,x,y,.045,.055,1.4,.04);
   if(style==='tenement'){for(const s of [-1,1])box(face,[0x4d675d,0x786451,0x5e7380][Math.floor(r()*3)],x+s*.76,y,.03,.32,1.4,.1);}
   if(style==='hotel'&&Math.floor(y)%2===0){box(face,iron,x,y-.6,.5,1.6,.08,.8);box(face,iron,x,y-.22,.85,1.6,.065,.065);for(const k of [-.7,0,.7])box(face,iron,x+k,y-.4,.85,.045,.42,.045);}
   if(r()<.12){const plank=box(face,0x928066,x,y,.14,1.5,.18,.06);plank.rotation.z=.38;}
  }

  if(style==='foundry'||style==='warehouse'){
   for(let x=-width/2+.3;x<width/2;x+=3)box(face,iron,x,b.h/2,.3,.16,b.h,.18);
   box(face,0x43595b,0,1.5,.16,5,3,.08);for(let y=.2;y<3;y+=.28)box(face,0x697870,0,y,.23,5,.06,.035);
   for(const x of [-2.65,2.65]){box(face,0xc19c56,x,1.5,.3,.24,3,.2);for(let y=.2;y<3;y+=.55){const stripe=box(face,0x313f3f,x,y,.415,.26,.2,.015);stripe.rotation.z=.4;}}
   const pipe=cylinder(face,0x986f48,0,b.h-.8,.5,.16,width);pipe.rotation.z=Math.PI/2;
  }
  // Tall shop windows and striped canvas awnings give a readable street level.
  for(const x of [-width*.27,width*.27]){
   box(face,trim,x,1.3,.03,Math.min(3.2,width*.38),.15,.18);box(face,iron,x,1.25,.09,.06,2.4,.1);
   if(style!=='foundry'&&style!=='warehouse')for(let i=0;i<6;i++){const awning=box(face,i%2?0xd0bfa0:style==='hotel'?0x8d473c:0x46685b,x-width*.18+i*width*.06,2.75,.62,width*.06,.08,1.2);awning.rotation.x=.15;box(face,i%2?0xc8b799:0x48665a,x-width*.18+i*width*.06,2.56,1.2,width*.06,.26,.05);}
  }
  box(face,0x314849,0,1.2,.12,1.3,2.4,.09);box(face,0xa79468,.42,1.2,.19,.05,.25,.04);
  sign(face,style==='civic'?'MAIRIE / SAINT-ROCH':style==='warehouse'?'COMPAGNIE DES DOCKS':style==='foundry'?'FONDERIE / SECTEUR 07':b.shop,0,Math.min(3.15,b.h-.45),.14,width*.65,.55,style==='hotel'?'#713f36':'#293f43','#dbceb0');
  sign(face,'17 / RUE DES CENDRES',width*.32,2.6,.13,Math.min(2.4,width*.3),.42,'#28434e','#d4d1b8');
 }
 // A few lit windows, with a shared warm material, break the identical grid.
 for(const pane of g.userData.glass)if(pane.position.y>2&&r()<.19)pane.material=mat(0xc8a46b,{emissive:0xe6a45c,emissiveIntensity:.36,roughness:.6});
 // Poster clusters, drain pipes and weather stains stay subtle against masonry.
 for(let i=0;i<3;i++){
  sign(g,['RESTEZ CHEZ VOUS','AVIS / DISPARU','NE PAS APPROCHER'][i],-b.w*.4+i*.75,1.25,b.d/2+.27,.65,.85,['#aa9f78','#c1b89b','#985742'][i],'#263c3d');
 }
 for(const x of [-b.w*.47,b.w*.47])cylinder(g,iron,x,b.h/2,b.d/2+.35,.055,b.h);
 g.traverse(o=>{if(o.isMesh&&!original.has(o)&&!o.userData.breakablePart)o.castShadow=false;});
}

export function dressStreets(world,kit){
 const {box,cylinder,sphere,sign,mat,plane,texture}=kit,g=world.static,r=seededRandom(world.layout.mapSeed^0x589abd);
 // Shared tiled sidewalk surface; the street grid remains mechanically open.
 const tiles=texture(256,256,c=>{c.fillStyle='#929487';c.fillRect(0,0,256,256);for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=64){const off=(y/32%2)*32;c.strokeStyle='#6e776f';c.lineWidth=2;c.strokeRect(x-off,y,64,32);c.fillStyle=`rgba(44,52,47,${r()*.08})`;c.fillRect(x-off+2,y+2,60,28);}});tiles.wrapS=tiles.wrapT=T.RepeatWrapping;tiles.repeat.set(5,5);const paving=new T.MeshStandardMaterial({map:tiles,roughness:.88});
 const grass=texture(256,256,c=>{c.fillStyle='#798161';c.fillRect(0,0,256,256);for(let i=0;i<7000;i++){c.fillStyle=i%3?'rgba(31,54,30,.11)':'rgba(206,201,133,.2)';c.fillRect(r()*256,r()*256,.6+r()*2,1+r()*5);}});grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.repeat.set(7,7);const lawn=new T.MeshStandardMaterial({map:grass,roughness:1});
 for(let x=-80;x<=80;x+=32)for(let z=-80;z<=80;z+=32){if(x===48)continue;const park=x<-32&&(z<-32||z>32);if(!park)plane(g,paving,x,.141,z,23.6,23.6,true);else{
  plane(g,lawn,x,.142,z,23.6,23.6,true);box(g,0xa89b79,x,.15,z,2,.025,23.6);box(g,0xa89b79,x,.15,z,23.6,.025,2);
  // Distinct park furniture: rose beds, a circular fountain or a glass pavilion.
  const kind=Math.abs(x+z)%3;
  if(kind===0){cylinder(g,0xa9a18a,x,.32,z,3.6,.5,3.6,32);cylinder(g,0x467879,x,.59,z,3.25,.03,3.25,32);cylinder(g,0xa99e80,x,1.1,z,.45,1.2,.35,12);cylinder(g,0xa99e80,x,1.65,z,1.3,.15,1.3,24);}
  else if(kind===1){for(const a of [-4,4])for(const b of [-3,3]){box(g,0x45615b,x+a,1.8,z+b,.1,3.6,.1);}box(g,0x729d94,x,3.6,z,8.3,.15,6.3,{metalness:.35,roughness:.3});for(let a=-4;a<=4;a+=1)box(g,0x47675e,x+a,2,z+3,.07,3.5,.07);}
  else for(let i=0;i<5;i++){box(g,0x625947,x-5+i*2.2,.27,z,1.4,.45,7);for(let k=0;k<6;k++)sphere(g,[0x976454,0xb99c69,0x768b5b][i%3],x-5+i*2.2,.65,z-3+k*1.1,.5,.45,.4);}
  for(const side of [-1,1]){box(g,0x8b7b5c,x+side*7,.6,z,2.2,.12,.6);box(g,0x8b7b5c,x+side*7,.96,z-.32,2.2,.6,.1);}
 }
 }
 for(const x of world.layout.roads)for(const z of world.layout.roads){
  if(Math.abs(x-48)<12)continue;
  if((x+z)%64===0)for(const side of [-1,1])for(let i=-2;i<=2;i++)box(g,0xbebda7,x+i*.85,.026,z+side*6,.5,.02,2.4);
  const direction=new T.Group();direction.position.set(x+5.6,0,z+5.7);g.add(direction);cylinder(direction,0x3e5557,0,1.9,0,.055,3.8);sign(direction,x<0?'LES SERRES ←':'PORT / CANAL →',0,3.4,0,2.8,.45,'#355758','#ddd3ab');
  // Manholes and kerbside drainage.
  cylinder(g,0x384848,x-2,.022,z+3,.45,.025,.45,16);for(let i=0;i<5;i++)box(g,0x263d40,x-2.3+i*.15,.039,z+3,.06,.015,.6);
 }
 for(const b of world.layout.buildings){
  if(b.primary===false)continue;
  const x=b.x-b.w/2-1,z=b.z+b.d/2;
  if(pointBlocked(x,z,.45,world.layout.buildings))continue;
  // Street furniture is confined to sidewalk margins rather than drive lanes.
  cylinder(g,0x435e55,x,.48,z,.31,.95);cylinder(g,0x2e4140,x,.97,z,.34,.08);
  for(let i=0;i<3;i++){const paper=box(g,0xafa889,x+1+r(),.16,z-r()*2,.22,.015,.32);paper.rotation.y=r()*6;}
  if((b.style==='hotel'||b.style==='civic')&&!pointBlocked(b.x+b.w*.22,b.z+b.d/2+1.45,1.2,world.layout.buildings)){cylinder(g,0x8b7b63,b.x+b.w*.22,.88,b.z+b.d/2+1.45,.65,.12);cylinder(g,0x3b4e4c,b.x+b.w*.22,.46,b.z+b.d/2+1.45,.08,.8);for(const s of [-1,1])box(g,0x546a59,b.x+b.w*.22+s*.9,.5,b.z+b.d/2+1.45,.5,.1,.5);}
 }
 // Irregular rainwater patches and faded tyre marks, shared materials.
 const wet=new T.MeshStandardMaterial({color:0x658889,roughness:.13,metalness:.65,transparent:true,opacity:.35,depthWrite:false});
 for(let i=0;i<95;i++){const x=world.layout.roads[i%7]+(r()-.5)*5,z=-108+r()*216;if(x>39&&x<57)continue;const vertices=[];for(let k=0;k<12;k++){const a=k/12*Math.PI*2,rad=.7+r()*.8;vertices.push(new T.Vector2(Math.cos(a)*rad*2,Math.sin(a)*rad));}const shape=new T.Shape(vertices),mesh=new T.Mesh(new T.ShapeGeometry(shape),wet);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.02,z);g.add(mesh);}
}
