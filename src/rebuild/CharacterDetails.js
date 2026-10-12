import * as T from 'three';
export const CIVILIAN_COATS=[0x647265,0x936b52,0x697685,0x86795f,0x7c5550,0xaaa28b];
export function characterVariant(id=0){return ((id*17+3)>>>0)%6;}
export function detailCharacter(group,{player,skin,variant,coat},kit){
 const {box,sphere,cylinder,batch}=kit,body=group.userData.body;
 const clothes=new T.Group();body.add(clothes);
 if(player){
  box(clothes,0x263b3c,0,1.05,.216,.035,.48,.03);
  for(const x of [-.18,.18]){box(clothes,0x8d805e,x,1.06,.25,.14,.17,.075);box(clothes,0x4b5b51,x,1.39,.19,.13,.09,.05);}
  box(clothes,0x384744,.29,.85,0,.16,.22,.22);cylinder(clothes,0x789084,-.3,.87,-.05,.085,.26);
  box(clothes,0xbeb68f,.05,.83,.22,.12,.09,.025);
 }else{
  if(variant===0){box(clothes,0xb4b0a0,0,1.35,.19,.14,.2,.03);const tie=box(clothes,0x694638,0,1.08,.215,.07,.4,.035);tie.rotation.z=.12;}
  if(variant===1){box(clothes,0xb3995f,0,1.22,.205,.5,.1,.035);box(clothes,0xb3995f,0,1.02,-.2,.5,.06,.035);}
  if(variant===2){box(clothes,0x9a9382,-.19,1.27,.2,.14,.15,.04);box(clothes,0x3b4547,0,1.05,.2,.04,.55,.04);}
  if(variant===3)for(const x of [-.19,.19])box(clothes,0x445765,x,1.14,.2,.06,.52,.03);
  if(variant===4){box(clothes,0x665c49,0,1.26,-.22,.43,.43,.2);box(clothes,0xb9a784,.22,1.34,.17,.08,.1,.03);}
  if(variant===5){for(const x of [-.1,.1])box(clothes,0x555951,x,1.1,.215,.025,.42,.035);box(clothes,0x777968,.1,1.25,.24,.1,.09,.025);}
 }
 batch(clothes,clothes);
 // Facial details move with the head and disappear with headshot remains.
 const face=new T.Group();face.position.set(0,1.65,.025);body.add(face);
 sphere(face,skin,0,-.025,.185,.052,.058,.062);
 for(const side of [-1,1]){sphere(face,skin,side*.205,0,0,.05,.075,.055);box(face,0x273936,side*.075,.045,.197,.07,.028,.025);}
 if(!player){
  if(variant===1){sphere(face,0xa38b4f,0,.2,-.02,.245,.09,.235);box(face,0x8e7844,0,.15,.08,.5,.035,.4);}
  else if(variant===2){sphere(face,coat,0,.13,-.09,.235,.18,.18);}
  else if(variant!==5){sphere(face,[0x393f35,0x686357,0x504a3b][variant%3],0,.17,-.045,.2,.1,.18);}
  if(variant===4)box(face,0x444e42,0,-.1,.185,.2,.12,.045);
 }
 batch(face,face);group.userData.face=face;group.userData.variant=variant;
}
