import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {dressArmour} from './RPGVisuals.js';
import {stepCharacterMotion} from './CharacterMotion.js';
import {animateSurvivorDetails} from './SurvivorVisuals.js';

const PALETTE={ink:0x283837,steel:0x52645e,bone:0xc9c2a8,amber:0xd7ad69,wood:0x7b6149,leather:0x775346};
// This scene exclusively owns its architecture. The survivor uses the existing
// character factory and its matching disposal path; the exterior stays intact.
export class InteriorView{
 constructor(world){this.world=world;this.scene=new T.Scene();this.scene.background=new T.Color(0x152123);this.camera=new T.OrthographicCamera(-10,10,8,-8,.1,100);this.materials=new Map();this.geometries=new Map();this.batches=new Set();this.objects=new Map();this.clock=0;this.active=false;}
 material(color,extra={}){const key=color+JSON.stringify(extra);if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness:.8,...extra}));return this.materials.get(key);}
 geometry(kind){if(!this.geometries.has(kind))this.geometries.set(kind,kind==='sphere'?new T.SphereGeometry(1,10,7):kind==='cylinder'?new T.CylinderGeometry(1,1,1,12):new T.BoxGeometry(1,1,1));return this.geometries.get(kind);}
 mesh(parent,color,x,y,z,w,h,d,kind='box',extra={}){const mesh=new T.Mesh(this.geometry(kind),this.material(color,extra));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 box(...args){return this.mesh(...args);}
 build(plan){
  this.clear();this.plan=plan;this.room=new T.Group();this.scene.add(this.room);const room=this.room,b=plan.bounds,w=b.maxX-b.minX,d=b.maxZ-b.minZ,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,workshop=plan.template==='workshop-v1';
  this.box(room,0x243332,cx,-.19,cz,w+.36,.38,d+.36);
  // Individual boards / service tiles carry wear without another texture atlas.
  const rows=Math.ceil(d/(workshop?1.15:.42)),cols=workshop?Math.ceil(w/1.15):4;
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const tone=(x*7+z*3)%5,color=workshop?[0x67716a,0x71786e,0x626c65,0x73796c,0x697269][tone]:[0x80664f,0x8b7156,0x785e48,0x92765a,0x82694f][tone];this.box(room,color,b.minX+(x+.5)*w/cols,.012,b.minZ+(z+.5)*d/rows,w/cols-.025,.024,d/rows-.022);}
  this.box(room,workshop?0x718178:0x87958a,cx,1.45,b.minZ-.12,w+.25,2.9,.24);this.box(room,workshop?0x6c7c74:0x98a28c,b.minX-.12,1.45,cz,.24,2.9,d+.24);
  for(const z of [b.minZ,b.maxZ])this.box(room,PALETTE.ink,cx,.13,z,w,.26,.12);
  for(const x of [b.minX,b.maxX])this.box(room,PALETTE.ink,x,.13,cz,.12,.26,d);
  // A continuous low front/right sill makes the architectural cutaway explicit.
  this.box(room,PALETTE.bone,b.maxX,.34,cz,.12,.1,d);this.box(room,PALETTE.bone,cx,.34,b.maxZ,w,.1,.12);
  for(let x=b.minX+.7;x<b.maxX;x+=1.8){this.box(room,0x344846,x,1.4,b.minZ+.05,.06,2.65,.08);this.box(room,0xc1b594,x,2.78,b.minZ+.09,.13,.035,.11);}
  this.window(b.minX+1.9,b.minZ,workshop);this.wallStory(b.maxX-2,b.minZ,workshop);
  for(const obstacle of plan.obstacles||[])this.furniture(obstacle);
  this.batchArchitecture();for(const object of plan.objects||[])this.object(object);
  const ambient=new T.HemisphereLight(0xe3dac1,0x283d3e,2.2),sun=new T.DirectionalLight(workshop?0xffd6a0:0xd4e6e4,3.2);sun.position.set(cx-4,9,cz+2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:30});sun.shadow.normalBias=.025;sun.target.position.set(cx,0,cz);this.scene.add(ambient,sun,sun.target);
  const practical=new T.PointLight(0xffbb76,workshop?40:22,9,2);practical.position.set(workshop?-3:2.8,2.4,workshop?-1.8:2);this.scene.add(practical);
  this.scene.environment=this.world.scene.environment;this.scene.environmentIntensity=.25;this.active=true;
 }
 window(x,z,workshop){const r=this.room;this.box(r,PALETTE.ink,x,1.8,z+.11,2.1,1.55,.12);this.box(r,workshop?0x8ca6a1:0x769a9d,x,1.8,z+.19,1.85,1.3,.035,'box',{emissive:0x5b817e,emissiveIntensity:.25,roughness:.25});for(const dx of [-.94,0,.94])this.box(r,PALETTE.bone,x+dx,1.8,z+.23,.055,1.45,.055);this.box(r,PALETTE.bone,x,1.8,z+.24,2,.055,.06);this.box(r,0xa49c7d,x,1.06,z+.28,2.22,.12,.45);if(!workshop){for(const side of [-1,1])for(let i=0;i<5;i++)this.box(r,i%2?0x5a7773:0x68817b,x+side*(1.08+i*.045),1.76,z+.25,.06,1.7,.12);this.box(r,PALETTE.wood,x+.6,1.18,z+.28,.22,.18,.22,'cylinder');this.box(r,0x627e53,x+.6,1.4,z+.28,.2,.3,.2,'sphere');}}
 wallStory(x,z,workshop){const r=this.room;this.box(r,PALETTE.ink,x,1.9,z+.15,2.4,1.25,.1);this.box(r,workshop?0x675d48:0xb7ad8f,x,1.9,z+.215,2.24,1.1,.025);for(let i=0;i<5;i++){const paper=this.box(r,[0xd4c5a3,0xb7c4b4,0xc2a27c][i%3],x-.7+(i%3)*.65,1.65+Math.floor(i/3)*.42,z+.24,.45,.31,.008);paper.rotation.z=(i%3-1)*.1;for(let line=0;line<3;line++)this.box(r,0x677268,paper.position.x, paper.position.y-.08+line*.065,z+.248,.28,.012,.003);}if(workshop)for(let i=0;i<4;i++){const tool=this.box(r,0x9da69a,x-.7+i*.46,1.1,z+.22,.045,.34,.04);tool.rotation.z=.2;this.box(r,PALETTE.ink,tool.position.x,1.24,z+.25,.14,.06,.06);}}
 furniture(o){const r=this.room,role=o.role||o.id,x=o.x,z=o.z,w=o.w,d=o.d,h=o.h;
  if(role==='partition'){this.box(r,0x829083,x,.38,z,w,.76,d);this.box(r,PALETTE.bone,x,.79,z,w,.06,d+.01);for(let a=x-w/2+.5;a<x+w/2;a+=.8)this.box(r,0x5d7169,a,.72,z+d/2+.005,.22,.035,.012);return;}
  if(role==='bench'){for(const side of [-1,1])for(const end of [-1,1])this.box(r,PALETTE.ink,x+side*(w/2-.13),h/2,z+end*(d/2-.13),.12,h,.12);this.box(r,PALETTE.wood,x,h-.07,z,w,.14,d);this.box(r,0xbba882,x,h+.012,z,w-.12,.024,d-.12);this.box(r,0x344d4d,x-.3,h+.035,z,.95,.025,.7);for(let i=0;i<5;i++){const tool=this.box(r,0xa9afa3,x-.6+i*.18,h+.065,z-.1,.04,.035,.32);tool.rotation.y=(i-2)*.2;}this.box(r,0x485c5a,x+.9,h+.13,z+.15,.36,.26,.32);this.box(r,0x9aa697,x+.9,h+.31,z+.15,.45,.1,.12);for(let i=0;i<3;i++)this.box(r,0x6c6550,x-.95,h*.36+i*.16,z+.25,.7,.12,.55);return;}
  if(role==='rack'){for(const side of [-1,1])this.box(r,PALETTE.ink,x+side*(w/2-.05),h/2,z,.08,h,d);for(let i=0;i<4;i++){const y=.15+i*(h-.25)/3;this.box(r,PALETTE.steel,x,y,z,w,.08,d);for(let j=0;j<3;j++){this.box(r,[0x747e63,0x958260,0x526d70][(i+j)%3],x,y+.19,z-d/2+.4+j*.85,w*.64,.3,.5);this.box(r,PALETTE.amber,x+w*.33,y+.19,z-d/2+.4+j*.85,.025,.055,.25);}}return;}
  if(role==='bed'){this.box(r,0x4f5143,x,.2,z,w,.4,d);this.box(r,0xb4ad91,x,.47,z,w-.13,.23,d-.1);this.box(r,0x667c73,x,.61,z+.5,w-.1,.08,d*.6);this.box(r,0xd5c9aa,x,.63,z-d/2+.45,w*.7,.16,.5);for(const side of [-1,1])this.box(r,0x405451,x+side*(w/2-.04),.32,z,.08,.64,d);return;}
  if(role==='sofa'){this.box(r,0x704f43,x,.38,z,w,.7,d);this.box(r,0x8c6856,x,.76,z-d/2+.13,w,.28,.26);for(const side of [-1,1])this.box(r,0x936d58,x+side*(w/2-.13),.63,z,.26,.55,d);for(const side of [-1,1])this.box(r,0xaa8061,x+side*.36,.73,z+.08,w*.36,.11,d*.7);return;}
  if(role==='locker'){this.box(r,PALETTE.ink,x,h/2,z,w,h,d);for(const side of [-1,1]){this.box(r,0x697c70,x+side*w/4,h/2,z+d/2+.015,w/2-.045,h-.08,.03);this.box(r,PALETTE.bone,x+side*.12,h*.56,z+d/2+.05,.035,.18,.035);for(let i=0;i<4;i++)this.box(r,0x344843,x+side*w/4,h*.8+i*.035,z+d/2+.035,w*.25,.012,.012);}return;}
  this.box(r,0x817458,x,h/2,z,w,h,d);for(const side of [-1,1])this.box(r,PALETTE.ink,x+side*w*.3,h/2,z,.08,h+.01,d+.01);this.box(r,PALETTE.bone,x,h*.55,z+d/2+.01,w*.42,.15,.02);
 }
 object(o){const group=new T.Group();group.position.set(o.x,0,o.z);this.room.add(group);this.objects.set(o.id,group);
  if(o.type==='merchant'){const mara=this.world.character('player',null,'medic',{palette:'desert',headwear:'none',hair:'knot',hairColor:'copper',coat:'field',accessory:'goggles',skin:'warm'});mara.rotation.y=.2;group.add(mara);this.mara=mara;this.box(group,0x866c4b,0,1.08,.24,.38,.56,.035);this.box(group,PALETTE.amber,-.12,1.28,.265,.05,.13,.025);}
  else if(o.type==='exit'){this.box(group,0x89977c,0,.03,0,1.65,.04,.55);for(let i=0;i<3;i++){const chevron=this.box(group,0xe2d1a5,(i-1)*.32,.057,.02,.17,.012,.05);chevron.rotation.y=-.5;}this.box(group,0x33534a,-.91,1.2,0,.12,2.4,.16);this.box(group,0x33534a,.91,1.2,0,.12,2.4,.16);this.box(group,0x8ca28b,0,2.39,0,1.95,.1,.16);}
  else if(o.type==='case'){this.box(group,PALETTE.ink,0,.25,0,.78,.45,.48);this.box(group,0xb19a6c,0,.48,0,.74,.035,.44);for(const side of [-1,1])this.box(group,0xd5c9aa,side*.25,.24,.25,.07,.37,.035);this.box(group,PALETTE.amber,0,.32,.27,.11,.12,.04,'box',{emissive:0xb98f40,emissiveIntensity:.5});}
 }
 batchArchitecture(){
  const groups=new Map();for(const mesh of this.room.children){if(!mesh.isMesh)continue;const list=groups.get(mesh.material)||[];list.push(mesh);groups.set(mesh.material,list);}
  for(const [material,list]of groups){if(list.length<2)continue;const pieces=list.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);return geometry;});const geometry=mergeGeometries(pieces);pieces.forEach(piece=>piece.dispose());if(!geometry)continue;this.batches.add(geometry);const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;list.forEach(piece=>piece.removeFromParent());this.room.add(mesh);}
 }
 screenPoint(x,y,z){const rect=this.world.renderer.domElement?.getBoundingClientRect?.(),width=rect?.width||globalThis.innerWidth||1280,height=rect?.height||globalThis.innerHeight||720,p=new T.Vector3(x,y,z).project(this.camera);return{x:(rect?.left||0)+(p.x*.5+.5)*width,y:(rect?.top||0)+(-p.y*.5+.5)*height,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.95};}
 update(sim,dt,aspect){
  const session=sim.interior;if(!session)return;if(this.plan!==session.plan)this.build(session.plan);this.active=true;
  const p=sim.player,key=JSON.stringify([p.skin,p.appearanceKey,p.appearance]);if(this.heroKey!==key){if(this.hero)this.world.removeDynamic(this.hero);this.hero=this.world.character('player',null,p.skin,p.appearance);this.scene.add(this.hero);this.heroKey=key;}dressArmour(this.hero,p);
  const motionDt=sim.state==='interior'?Math.max(0,dt):0;this.clock+=motionDt;const pose=session.pose;this.hero.position.set(pose.x,0,pose.z);this.hero.rotation.y=pose.angle||0;this.animate(this.hero,pose,motionDt);if(this.mara)this.animate(this.mara,{moving:false,angle:.2},motionDt);
  for(const object of this.plan.objects||[])if(object.type==='case')this.objects.get(object.id).visible=!(sim.interiorState?.collected||[]).includes(`${this.plan.id}:${object.id}`);
  const b=this.plan.bounds,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,w=b.maxX-b.minX,d=b.maxZ-b.minZ,h=Math.max((w+d)*.45+4,(w*.78+d*.63+3.5)/Math.max(.2,aspect));this.camera.left=-h*aspect/2;this.camera.right=h*aspect/2;this.camera.top=h/2;this.camera.bottom=-h/2;this.camera.position.set(cx+16,22,cz+20);this.camera.lookAt(cx,.55,cz);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  this.world.renderer.info.reset();this.world.renderer.render(this.scene,this.camera);
 }
 animate(hero,state,dt){const d=hero.userData;d.motion??={phase:0};const pose=stepCharacterMotion(d.motion,state,dt,{player:true}),{phase,walk}=pose;animateSurvivorDetails(hero,this.clock,walk,false);d.body.position.y=Math.abs(Math.sin(phase))*walk*.035+Math.sin(this.clock*2)*.008;d.body.rotation.x=pose.pitch;d.body.rotation.z=pose.roll;d.legs.forEach((leg,i)=>{const cycle=phase+i*Math.PI;leg.rotation.x=Math.sin(cycle)*walk*.55;leg.userData.knee.rotation.x=Math.max(0,Math.sin(cycle))*walk*.75;});d.arms.forEach((arm,i)=>{arm.rotation.x=-.08+Math.sin(phase+i*Math.PI)*walk*.24;arm.rotation.z=i?.08:-.08;arm.userData.elbow.rotation.x=-.15;});}
 leave(){this.active=false;}
 clear(){if(this.hero)this.world.removeDynamic(this.hero);if(this.mara)this.world.removeDynamic(this.mara);this.hero=this.mara=null;this.heroKey=null;this.scene.traverse(o=>{if(o.isLight)o.shadow?.map?.dispose();});this.scene.clear();for(const geometry of this.batches)geometry.dispose();this.batches.clear();for(const geometry of this.geometries.values())geometry.dispose();for(const material of this.materials.values())material.dispose();this.geometries.clear();this.materials.clear();this.objects.clear();this.plan=null;this.clock=0;}
 dispose(){this.clear();this.active=false;}
}

// Apartment thresholds are attached to their actual host facade. Workshop doors
// already have their own authored storefront and remain visually unchanged.
export class InteriorDoors{
 constructor(scene){this.scene=scene;this.root=new T.Group();scene.add(this.root);this.geometry=new T.BoxGeometry(1,1,1);this.materials=[new T.MeshStandardMaterial({color:0x263d3b,roughness:.85}),new T.MeshStandardMaterial({color:0xb5ac89,roughness:.7}),new T.MeshStandardMaterial({color:0xe0b86d,emissive:0xb28c45,emissiveIntensity:.35,roughness:.5})];this.entries=[];}
 box(parent,material,x,y,z,w,h,d){const mesh=new T.Mesh(this.geometry,this.materials[material]);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 update(sim){const manifest=sim.interiorState?.manifest||null;if(this.manifest!==manifest){this.root.clear();this.entries=[];this.manifest=manifest;for(const plan of manifest||[]){if(plan.template!=='apartment-v1')continue;const d=plan.door,group=new T.Group();group.position.set(d.x-d.nx*1.93,0,d.z-d.nz*1.93);group.rotation.y=Math.atan2(d.nx,d.nz);this.root.add(group);this.box(group,0,0,1.1,0,1.3,2.2,.12);this.box(group,1,-.7,1.16,.02,.12,2.32,.18);this.box(group,1,.7,1.16,.02,.12,2.32,.18);this.box(group,1,0,2.29,.02,1.52,.12,.18);this.box(group,2,.43,1.03,.095,.045,.23,.045);this.box(group,2,0,2.48,.04,.5,.11,.14);for(let i=0;i<3;i++)this.box(group,1,-.2+i*.2,1.69,.071,.09,.12,.025);this.box(group,1,0,.03,1.93,1.12,.05,.55);this.entries.push({plan,group});}}
  for(const {plan,group}of this.entries){const host=(sim.props||[]).find(p=>p.id===plan.buildingId);group.visible=!!host&&host.health>0&&Math.hypot(sim.player.x-plan.door.x,sim.player.z-plan.door.z)<65;}
 }
 dispose(){this.root.removeFromParent();this.root.clear();this.geometry.dispose();this.materials.forEach(material=>material.dispose());this.entries=[];this.manifest=null;}
}
