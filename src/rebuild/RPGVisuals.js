import * as T from 'three';
import {rounded} from './SurvivorVisuals.js';
import {resolveAppearance} from './Customization.js';
import {batchRigid} from './RenderBatch.js';
import {ARMOUR,DYES,RARITY_COLORS} from './RPG.js';
const mesh=(parent,color,x,y,z,w,h,d,metal=.25)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.65,metalness:metal}));m.geometry.userData.surfaceOwned=true;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
export function dressArmour(character,p){
 const hidden=resolveAppearance(p.skin,p.appearance).hideHelmet==='yes',key=JSON.stringify([p.armour,p.dye,hidden]);if(character.userData.armourKey===key)return;character.userData.armourKey=key;
 for(const g of character.userData.armourParts||[]){g.removeFromParent();g.traverse(m=>{m.geometry?.dispose();if(!m.material?.userData?.shared)m.material?.dispose();});}
 const helmet=ARMOUR[p.armour?.head]&&!hidden;if(character.userData.hat)character.userData.hat.visible=!helmet;if(character.userData.hair)character.userData.hair.visible=!helmet;
 const groups=[],group=parent=>{const g=new T.Group();parent.add(g);groups.push(g);return g;},body=character.userData.body,color=DYES[p.dye]?.color||0x697758;
 const plate=(g,c,x,y,z,w,h,d,metal=.35)=>rounded(g,new T.MeshStandardMaterial({color:c,roughness:metal>.4?.42:.78,metalness:metal}),x,y,z,w,h,d,.045);
 for(const [slot,id]of Object.entries(p.armour||{})){const a=ARMOUR[id];if(!a||slot==='head'&&hidden)continue;const trim=new T.Color(RARITY_COLORS[a.tier]),dark=a.family==='warden'?0x354851:a.family==='reaper'?0x37323f:color,rank=a.tier+1;
  if(slot==='chest'){
   const g=group(body),heavy=a.family==='warden';
   for(const side of [-1,1]){const panel=plate(g,dark,side*.12,1.21,.157,.23,heavy?.34:.29,.075);panel.rotation.y=side*.15;plate(g,color,side*.12,1.07,.164,.215,.09,.07);plate(g,0x3a3930,side*.19,.97,.19,.14,.13,.09,.05);for(let n=0;n<rank;n++)plate(g,trim,side*.12,1.31-n*.038,.202,.09,.012,.016,.65);}
   plate(g,dark,0,1.16,-.16,.44,.45,.13);plate(g,trim,0,1.37,-.24,.16,.025,.02,.6);
   for(const arm of character.userData.arms){const pad=group(arm);const dome=new T.Mesh(new T.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI*.61),new T.MeshStandardMaterial({color:dark,roughness:.65,metalness:.3}));dome.geometry.userData.surfaceOwned=true;dome.position.y=-.035;dome.scale.set(heavy?.145:.127,.115,.145);dome.castShadow=true;pad.add(dome);plate(pad,trim,0,.042,.005,.16,.016,.2,.6);if(a.tier>=2)plate(pad,color,0,-.11,.12,.2,.1,.06);}
  }
  if(slot==='head'){
   const head=character.userData.head,g=group(head?.isGroup?head:body);if(!head?.isGroup)g.position.y=1.68;
   const dome=new T.Mesh(new T.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.48),new T.MeshStandardMaterial({color:dark,roughness:.5,metalness:.4}));dome.geometry.userData.surfaceOwned=true;dome.position.y=.045;dome.scale.set(.205,.218,.197);dome.castShadow=true;g.add(dome);
   for(const side of [-1,1]){plate(g,dark,side*.18,.006,-.015,.057,.2,.22);plate(g,trim,side*.21,.04,.015,.012,.055,.08,.65);}
   plate(g,dark,0,.128,.17,.37,.038,.12);if(a.family==='warden')plate(g,dark,0,-.12,.164,.26,.09,.085);if(a.family==='reaper'){for(const side of [-1,1]){const cheek=plate(g,dark,side*.11,-.068,.157,.075,.11,.05);cheek.rotation.z=side*-.3;}}
   for(let n=0;n<rank;n++)plate(g,trim,-.06+n*.04,.204,.109,.019,.025,.022,.65);
  }
  if(slot==='legs')for(const leg of character.userData.legs){const g=group(leg);plate(g,color,0,-.15,.074,.2,.24,.1);const knee=group(leg.userData.knee);plate(knee,dark,0,-.025,.078,.2,.15,.12);plate(knee,trim,0,-.01,.143,.13,.022,.013,.65);if(a.tier>=2)plate(knee,dark,0,-.18,.081,.16,.18,.08);}
 }for(const g of groups)batchRigid(g);character.userData.armourParts=groups;
}
export function rpgPlaceMesh(place){const g=new T.Group(),c=place.color;
 if(place.kind==='shop'){
  const facade=new T.Group();g.add(facade);g.userData.facade=facade;const width=Math.min(place.frontWidth||6,8),medic=place.id==='medic',smith=place.id==='smith';
  // Fit a storefront onto a real, collidable city building. No freestanding miniature kiosk.
  if(place.buildingId){
   mesh(facade,0x283b3d,0,1.7,-3.12,width,3.4,.14);
   for(const x of [-width/2+.13,width/2-.13])mesh(facade,0xafa38b,x,1.8,-2.96,.26,3.6,.32);
   mesh(facade,0x182b2f,0,1.35,-2.97,1.45,2.7,.15);mesh(facade,0x869995,0,1.65,-2.87,1.13,1.45,.045);mesh(facade,0xd3bd82,.48,1.05,-2.81,.07,.28,.08);
   for(const x of [-width*.32,width*.32]){mesh(facade,0x617b7a,x,1.7,-2.99,Math.max(.7,width*.24),1.7,.1);for(const dx of [-.3,0,.3])mesh(facade,0x263a3b,x+dx,1.7,-2.88,.04,1.7,.05);mesh(facade,0xb3a58b,x,.78,-2.75,Math.max(.8,width*.27),.12,.5);}
   mesh(facade,c,0,3.2,-2.48,width+.3,.16,1.4);mesh(facade,c,0,3,-1.82,width+.3,.38,.08);
   if(medic){mesh(facade,0xd7d4b8,-width*.32,2,-2.8,.85,.22,.08);mesh(facade,0xd7d4b8,-width*.32,2,-2.8,.22,.85,.09);}
   if(smith){for(let n=0;n<4;n++)mesh(facade,0x7a8276,width*.32,.9+n*.36,-2.78,1.1,.08,.12);mesh(facade,0x656b66,1.9,.6,-1.8,1.2,.3,.7);mesh(facade,0x3b4748,1.9,.3,-1.8,.55,.6,.5);}
   if(!medic&&!smith){for(let i=0;i<5;i++)mesh(facade,[0xc1a88a,0x948c71,0x6b8887][i%3],-width*.32-.4+i*.18,1.4,-2.73,.12,.5,.2);}
   mesh(facade,0x9f9581,0,.07,-2.15,2.2,.14,1.4);
  }else{mesh(facade,0x34484a,0,.45,-2,2.5,.9,.8);}
  // A human-sized trader and a separate service lamp survive loss of the premises.
  const head=new T.Mesh(new T.IcosahedronGeometry(.22,2),new T.MeshStandardMaterial({color:medic?0x8f674b:0xb88d70}));head.position.set(-.7,1.76,-1.4);g.add(head);mesh(g,medic?0xc9c7ad:c,-.7,1.23,-1.4,.5,.7,.38);
  for(const x of [-.84,-.56])mesh(g,0x344348,x,.49,-1.4,.18,.85,.22);
  for(const x of [-1.04,-.36])mesh(g,medic?0xc9c7ad:c,x,1.23,-1.4,.16,.6,.2);
  mesh(g,0x405357,1.5,1.5,-.5,.07,3,.07);const lamp=mesh(g,c,1.5,2.9,-.5,.32,.25,.32);lamp.material.emissive.setHex(c);lamp.material.emissiveIntensity=.5;
  g.rotation.y=place.angle||0;
 }else if(place.kind==='cache'){mesh(g,0x74684b,0,.4,0,1.1,.8,.8);for(const x of [-.35,.35])mesh(g,c,x,.43,.41,.1,.65,.03);}
 else{for(const x of [-1.1,1.1]){mesh(g,0x3d4847,x,1.6,0,.5,3.2,.6);mesh(g,c,x,2.15,.33,.12,.55,.04);}mesh(g,0x3d4847,0,3.3,0,2.7,.4,.7);}
 const ring=new T.Mesh(new T.RingGeometry(1.4,1.48,32),new T.MeshBasicMaterial({color:c,side:T.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);g.position.set(place.x,0,place.z);if(g.userData.facade)batchRigid(g.userData.facade);batchRigid(g);return g;
}
export function survivorPortrait(world,p,canvas,view='full'){
 let renderer,figure;const scene=new T.Scene();
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,640,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene.add(new T.HemisphereLight(0xd9e5e4,0x313a34,2.1));
  for(const [c,intensity,x,y,z]of [[0xffdfb2,3.8,-3,5,4],[0xa3c6dc,3,3,3,-2],[0xe4eedb,.8,2,2,4]]){const light=new T.DirectionalLight(c,intensity);light.position.set(x,y,z);scene.add(light);}
  figure=world.character('player',null,p.skin,p.appearance);dressArmour(figure,p);figure.rotation.y=view==='back'?Math.PI+.35:view==='front'||view==='face'?0:-.3;
  figure.userData.arms.forEach((arm,i)=>{arm.rotation.z=i?-.06:.06;arm.rotation.x=-.05;arm.userData.elbow.rotation.x=-.12;});scene.add(figure);
  const camera=new T.PerspectiveCamera(30,480/640,.05,20);if(view==='face'){camera.position.set(.06,1.73,1.1);camera.lookAt(0,1.65,0);}else{camera.position.set(0,1.4,4.3);camera.lookAt(0,1.01,0);}renderer.render(scene,camera);return canvas.toDataURL();
 }finally{if(figure)world.removeDynamic(figure);renderer?.dispose();renderer?.forceContextLoss();}
}
