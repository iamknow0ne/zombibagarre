import * as T from 'three';
import {batchRigid} from './RenderBatch.js';
import {ARMOUR,DYES,RARITY_COLORS} from './RPG.js';
const mesh=(parent,color,x,y,z,w,h,d,metal=.25)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.65,metalness:metal}));m.geometry.userData.surfaceOwned=true;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
export function dressArmour(character,p){
 const key=JSON.stringify([p.armour,p.dye]);if(character.userData.armourKey===key)return;character.userData.armourKey=key;
 for(const g of character.userData.armourParts||[]){g.removeFromParent();g.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 const groups=[];const group=parent=>{const g=new T.Group();parent.add(g);groups.push(g);return g;},body=character.userData.body,color=DYES[p.dye]?.color||0x697758;
 for(const [slot,id]of Object.entries(p.armour||{})){const a=ARMOUR[id];if(!a)continue;const trim=new T.Color(RARITY_COLORS[a.tier]),dark=a.family==='warden'?0x354851:a.family==='reaper'?0x37323f:color,rank=a.tier+1;
  if(slot==='chest'){const g=group(body);mesh(g,dark,0,1.16,.015,.68,.66,.55);mesh(g,color,0,1.17,.306,.45,.43,.07);for(const x of [-.27,.27])mesh(g,trim,x,1.2,.32,.035,.53,.025);for(let n=0;n<rank;n++)mesh(g,trim,-.13+n*.09,1.39,.35,.05,.05,.035);if(a.family==='reaper')mesh(g,dark,0,.92,-.35,.58,.85,.09);for(const arm of character.userData.arms){const pad=group(arm);mesh(pad,dark,0,-.04,0,a.family==='warden'?.35:.27,.23,.35);mesh(pad,trim,0,.07,0,.28,.035,.32);}}
  if(slot==='head'){const g=group(body);mesh(g,dark,0,1.85,0,.53,.16,.49);mesh(g,dark,-.245,1.69,0,.07,.29,.46);mesh(g,dark,.245,1.69,0,.07,.29,.46);mesh(g,trim,0,1.78,.25,.4,.04,.04);if(a.tier>=2)mesh(g,trim,0,1.96,-.02,.09,.17,.3);if(a.family==='warden')mesh(g,dark,0,1.57,.21,.4,.12,.08);}
  if(slot==='legs')for(const leg of character.userData.legs){const g=group(leg);mesh(g,color,0,-.16,.02,.255,.31,.27);const knee=group(leg.userData.knee);mesh(knee,dark,0,-.05,.15,.25,.22,.09);mesh(knee,trim,0,-.01,.203,.2,.035,.025);if(a.tier>=2)mesh(knee,dark,0,-.18,.14,.23,.2,.07);}
 }character.userData.armourParts=groups;
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
export function survivorPortrait(world,p,canvas){
 let renderer,figure;const scene=new T.Scene();
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(240,280,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;scene.add(new T.HemisphereLight(0xecf4ec,0x49575a,3));const light=new T.DirectionalLight(0xffd6a0,4);light.position.set(3,5,4);scene.add(light);figure=world.character('player',null,p.skin);dressArmour(figure,p);figure.rotation.y=.35;scene.add(figure);const camera=new T.PerspectiveCamera(32,240/280,.1,20);camera.position.set(3,2.2,4);camera.lookAt(0,1,0);renderer.render(scene,camera);return canvas.toDataURL();
 }finally{if(figure)world.removeDynamic(figure);renderer?.dispose();renderer?.forceContextLoss();}
}
