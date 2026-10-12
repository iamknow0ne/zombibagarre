import * as T from 'three';
import {ARMOUR,DYES,RARITY_COLORS} from './RPG.js';
const mesh=(parent,color,x,y,z,w,h,d,metal=.25)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.65,metalness:metal}));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
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
  mesh(g,0x34484a,0,.45,-.45,2.3,.9,.8);mesh(g,0x9d8664,0,.94,-.45,2.5,.12,1.05);
  for(const x of [-1.3,1.3])mesh(g,0x49585a,x,1.4,-.8,.08,2.8,.08);mesh(g,c,0,2.8,-.35,2.9,.12,1.5);
  const head=new T.Mesh(new T.IcosahedronGeometry(.21,2),new T.MeshStandardMaterial({color:0xb88d70}));head.position.set(0,1.73,-1);g.add(head);mesh(g,c,0,1.26,-1,.49,.6,.4);
  for(const x of [-.45,.45])mesh(g,0xddd0ae,x,1.07,-.4,.3,.18,.3);
 }else if(place.kind==='cache'){mesh(g,0x74684b,0,.4,0,1.1,.8,.8);for(const x of [-.35,.35])mesh(g,c,x,.43,.41,.1,.65,.03);}
 else{for(const x of [-1.1,1.1]){mesh(g,0x3d4847,x,1.6,0,.5,3.2,.6);mesh(g,c,x,2.15,.33,.12,.55,.04);}mesh(g,0x3d4847,0,3.3,0,2.7,.4,.7);}
 const ring=new T.Mesh(new T.RingGeometry(1.4,1.48,32),new T.MeshBasicMaterial({color:c,side:T.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);g.position.set(place.x,0,place.z);return g;
}
export function survivorPortrait(world,p,canvas){
 let renderer,figure;const scene=new T.Scene();
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(240,280,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;scene.add(new T.HemisphereLight(0xecf4ec,0x49575a,3));const light=new T.DirectionalLight(0xffd6a0,4);light.position.set(3,5,4);scene.add(light);figure=world.character('player',null,p.skin);dressArmour(figure,p);figure.rotation.y=.35;scene.add(figure);const camera=new T.PerspectiveCamera(32,240/280,.1,20);camera.position.set(3,2.2,4);camera.lookAt(0,1,0);renderer.render(scene,camera);return canvas.toDataURL();
 }finally{if(figure)world.removeDynamic(figure);renderer?.dispose();renderer?.forceContextLoss();}
}
