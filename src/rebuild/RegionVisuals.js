import * as T from 'three';
import {travelGate} from './Regions.js';
import {disposeObjectResources} from './ResourceDisposal.js';

function labelTexture(){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 return texture;
}
function paintLabel(texture,title,subtitle,arrow=false){
 const canvas=texture.image,c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#283b3c';c.fillRect(0,0,w,h);c.strokeStyle='#a89875';c.lineWidth=6;c.strokeRect(7,7,w-14,h-14);
 c.fillStyle='#e0d4b6';c.textAlign='left';c.textBaseline='middle';c.font='bold 55px sans-serif';c.fillText(title,30,76,arrow?w-135:w-60);
 c.fillStyle='#c3a16d';c.font='25px sans-serif';c.fillText(subtitle,32,140,w-60);
 if(arrow){c.beginPath();c.moveTo(w-87,56);c.lineTo(w-40,81);c.lineTo(w-87,107);c.lineTo(w-87,91);c.lineTo(w-118,91);c.lineTo(w-118,71);c.lineTo(w-87,71);c.closePath();c.fill();}
 texture.needsUpdate=true;
}

// Human-sized roadside objects, not transport portals. Resources are allocated
// once per World; visits only change transforms, labels and the crate lid.
export class RegionVisuals{
 constructor(scene){
  this.root=new T.Group();this.root.name='region-wayfinding';scene.add(this.root);this.geometry=new T.BoxGeometry(1,1,1);this.plane=new T.PlaneGeometry(1,1);
  this.materials={metal:new T.MeshStandardMaterial({color:0x394a46,roughness:.65,metalness:.5}),wood:new T.MeshStandardMaterial({color:0x71654d,roughness:.96}),bone:new T.MeshStandardMaterial({color:0xd5c9aa,roughness:.85}),case:new T.MeshStandardMaterial({color:0x536f60,roughness:.8,metalness:.15}),dark:new T.MeshStandardMaterial({color:0x1f302e,roughness:1}),trim:new T.MeshStandardMaterial({color:0xb99a66,roughness:.5,metalness:.35})};
  this.gate=new T.Group();this.root.add(this.gate);
  this.box(this.gate,'wood',0,1.15,0,.13,2.3,.13);this.box(this.gate,'metal',0,.15,0,.24,.3,.24);
  this.box(this.gate,'metal',0,1.95,0,2.7,.7,.12);this.box(this.gate,'trim',0,2.31,0,2.76,.045,.16);
  this.gateTexture=labelTexture();this.label(this.gate,this.gateTexture,0,1.95,.066,2.62,.64);this.label(this.gate,this.gateTexture,0,1.95,-.066,2.62,.64,Math.PI);
  for(const x of [-1.26,1.26])for(const z of [-.075,.075])this.box(this.gate,'trim',x,1.95,z,.035,.035,.015);
  this.supply=new T.Group();this.root.add(this.supply);
  this.box(this.supply,'wood',0,.055,0,1.35,.11,.98);
  this.box(this.supply,'dark',0,.18,0,1.2,.16,.82);
  for(const x of [-.6,.6])this.box(this.supply,'case',x,.44,0,.09,.56,.9);
  for(const z of [-.42,.42])this.box(this.supply,'case',0,.44,z,1.25,.56,.08);
  for(const x of [-.44,.44])this.box(this.supply,'trim',x,.44,.465,.055,.54,.025);
  this.lid=new T.Group();this.lid.position.set(0,.72,-.44);this.supply.add(this.lid);this.box(this.lid,'case',0,.045,.44,1.28,.09,.92);
  this.box(this.lid,'bone',0,.096,.44,.1,.015,.46);this.box(this.lid,'bone',0,.096,.44,.44,.015,.1);
  for(const x of [-.4,.4])this.box(this.lid,'metal',x,-.04,.92,.12,.16,.04);
  this.contents=new T.Group();this.supply.add(this.contents);
  for(const x of [-.28,.28])for(const z of [-.19,.19]){this.box(this.contents,'bone',x,.4,z,.44,.29,.3);this.box(this.contents,'case',x,.55,z,.07,.015,.29);}
  this.supplyTexture=labelTexture();paintLabel(this.supplyTexture,'MEDICAL','LENOIR / SEALED SUPPLIES');this.label(this.supply,this.supplyTexture,0,.45,.48,.72,.18);
  this.gate.visible=this.supply.visible=false;
 }
 box(parent,material,x,y,z,w,h,d){const mesh=new T.Mesh(this.geometry,this.materials[material]);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 label(parent,texture,x,y,z,w,h,rotation=0){const mesh=new T.Mesh(this.plane,new T.MeshStandardMaterial({map:texture,roughness:.9}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.scale.set(w,h,1);parent.add(mesh);return mesh;}
 update(sim,overview=false){
  const p=sim.player,plan=sim.layout.region,gate=travelGate(sim)||(sim.layout.country?plan?.gate:null);
  this.root.visible=!sim.interior;
  this.gate.visible=!!gate&&(overview||Math.hypot(gate.x-p.x,gate.z-p.z)<72);
  if(gate){const name=gate.name||(sim.layout.country?'SAINT-ROCH':'FOOTPATH');if(this.gateName!==name){paintLabel(this.gateTexture,name,'FOOTPATH · ON FOOT ONLY',true);this.gateName=name;}
   // Keep the interactable centre and arrival position free of sign geometry.
   const angle=gate.angle||0;this.gate.position.set(gate.x+Math.cos(angle)*1.9,0,gate.z-Math.sin(angle)*1.9);this.gate.rotation.y=angle;
  }
  const supply=sim.layout.country&&plan?.supply;this.supply.visible=!!supply&&(overview||Math.hypot(supply.x-p.x,supply.z-p.z)<72);
  if(supply){this.supply.position.set(supply.x,0,supply.z);const collected=!!sim.rpg?.countrySupplies;this.lid.rotation.x=collected?-1.12:0;this.contents.visible=!collected;
   if(this.collected!==collected){paintLabel(this.supplyTexture,collected?'RECOVERED':'MEDICAL',collected?'RETURN TO DR. LENOIR':'LENOIR / SEALED SUPPLIES');this.collected=collected;}
  }
 }
 dispose(){disposeObjectResources(this.root);this.root.removeFromParent();this.root.clear();}
}
