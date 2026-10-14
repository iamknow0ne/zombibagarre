import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CIVILIAN_COATS,characterVariant} from './CharacterDetails.js';

// Broad value changes survive the street camera without a repeating microtexture.
// Three shared material responses keep horde instancing bounded; every actor owns
// its merged geometry, so removing a corpse cannot invalidate another enemy.
const materials=Object.fromEntries(Object.entries({cloth:[.94,0],skin:[.84,0],leather:[.73,.03],metal:[.53,.38]}).map(([kind,[roughness,metalness]])=>{
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness});m.userData.shared=true;return[kind,m];
}));
const palettes={
 runner:{coat:0x815044,skin:0xa09e84,dark:0x393d3b,accent:0xb39b77},
 brute:{coat:0x52605a,skin:0x979780,dark:0x353d3b,accent:0x9b8260},
 spitter:{coat:0x686b4c,skin:0xa4ad7b,dark:0x394038,accent:0xb1b675},
 armored:{coat:0x4c5e5c,skin:0x939d86,dark:0x303c3c,accent:0x9a9b82},
 volatile:{coat:0x745d44,skin:0xa69c77,dark:0x443d33,accent:0xc49955},
};
function mesh(parent,geometry,color,kind,x=0,y=0,z=0,sx=1,sy=1,sz=1){
 const p=geometry.attributes.position,colors=new Float32Array(p.count*3),base=new T.Color(color);
 geometry.computeBoundingBox();const bounds=geometry.boundingBox,dy=Math.max(.001,bounds.max.y-bounds.min.y);
 for(let i=0;i<p.count;i++){const shade=(kind==='cloth'?.82:.9)+.1*(p.getY(i)-bounds.min.y)/dy+.035*Math.sin(p.getX(i)*19+p.getY(i)*11);colors[i*3]=base.r*shade;colors[i*3+1]=base.g*shade;colors[i*3+2]=base.b*shade;}
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const m=new T.Mesh(geometry,materials[kind]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
const oval=(p,c,x,y,z,w,h,d,kind='cloth')=>mesh(p,new T.SphereGeometry(1,10,7),c,kind,x,y,z,w,h,d);
const block=(p,c,x,y,z,w,h,d,kind='cloth')=>mesh(p,new T.BoxGeometry(1,1,1),c,kind,x,y,z,w,h,d);
const tube=(p,c,x,y,z,top,bottom,h,kind='cloth')=>mesh(p,new T.CylinderGeometry(top,bottom,h,8),c,kind,x,y,z);
function tailored(parent,color,x,y,z,levels,depth=1,kind='cloth'){
 return mesh(parent,new T.LatheGeometry(levels.map(([r,h])=>new T.Vector2(r,h)),10),color,kind,x,y,z,1,1,depth);
}
function joint(parent,name,x,y,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function mergeBones(parent){
 for(const child of [...parent.children])if(child.isGroup)mergeBones(child);
 const groups=new Map();for(const child of parent.children)if(child.isMesh){const list=groups.get(child.material)||[];list.push(child);groups.set(child.material,list);}
 for(const [material,pieces]of groups){if(pieces.length<2)continue;
  const geometries=pieces.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);});
  const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();
  if(!geometry)throw new Error('Enemy bone geometry attributes must match');
  const merged=new T.Mesh(geometry,material);merged.castShadow=merged.receiveShadow=true;parent.add(merged);
  for(const piece of pieces){piece.geometry.dispose();piece.removeFromParent();}
 }
}
function face(head,p,variant,type){
 const width=type==='brute'?.184:type==='runner'?.153:.167;
 const geometry=new T.SphereGeometry(1,12,10),pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i),z=pos.getZ(i),jaw=1-.22*Math.max(0,-y);
  pos.setXYZ(i,pos.getX(i)*width*jaw,y*.222,z*.153+(z>0&&y<-.18?.018:0));
 }
 geometry.computeVertexNormals();mesh(head,geometry,p.skin,'skin');
 for(const side of [-1,1]){
  oval(head,p.skin,side*width,-.016,-.005,.025,.045,.022,'skin');
  oval(head,0x555d4c,side*.066,.025,.139,.038,.019,.01,'skin');
  oval(head,0xc6c19b,side*.067,.027,.149,.018,.006,.004,'skin');
  const brow=block(head,0x737961,side*.07,.05,.14,.072,.015,.015,'skin');brow.rotation.z=side*-.2;
 }
 const nose=new T.BufferGeometry();nose.setAttribute('position',new T.Float32BufferAttribute([-.017,.026,.14,0,-.028,.179,.017,.026,.14, -.017,.026,.14,-.024,-.051,.147,0,-.028,.179, .017,.026,.14,0,-.028,.179,.024,-.051,.147, -.024,-.051,.147,.024,-.051,.147,0,-.028,.179],3));nose.setAttribute('uv',new T.Float32BufferAttribute(new Array(24).fill(0),2));nose.computeVertexNormals();mesh(head,nose,p.skin,'skin');
 // A slack, irregular jaw and a faded cheek wound keep the infected from
 // reading as healthy civilians with green skin. All details follow the head.
 const mouth=mesh(head,new T.CircleGeometry(1,10),0x3c2927,'skin',.006,-.104,.174,.043,.027,1);mouth.rotation.z=.13;
 for(const [x,y]of [[-.019,-.087],[.003,-.084],[.025,-.092]])block(head,0xaaa58b,x,y,.173,.012,.012,.005,'skin');
 const side=variant%2?1:-1;
 const wound=mesh(head,new T.CircleGeometry(1,9),0x6c453b,'skin',side*.111,-.036,.139,.025,.047,1);wound.rotation.z=side*.31;
 mesh(head,new T.CircleGeometry(1,8),0x7c7661,'skin',side*.119,-.052,.14,.013,.026,1);
 if(type==='armored'){
  mesh(head,new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.52),p.coat,'metal',0,.04,-.022,.206,.213,.19);
  block(head,p.dark,0,.049,.012,.423,.035,.38,'leather');
  block(head,p.accent,0,.128,.166,.053,.052,.012,'metal');
 }else if(variant===1&&type==='walker'){
  mesh(head,new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.5),0xa79463,'cloth',0,.11,0,.205,.145,.19);
  oval(head,0x8d7b52,0,.107,.015,.23,.025,.215);
 }else if(variant!==5&&type!=='volatile'){
  const hair=mesh(head,new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.48),[0x44483b,0x686658,0x555044][variant%3],'cloth',0,.055,-.029,width*1.03,.179,.146);
  hair.rotation.z=variant===4?.14:-.08;
 }
 if(type==='spitter')oval(head,p.accent,0,-.18,.064,.12,.08,.113,'skin');
}
function costume(body,p,type,variant){
 const front=type==='brute'?.245:.193;
 // Open lapels, raised seams and broken hems are large enough to read at distance.
 for(const side of [-1,1]){
  const lapel=block(body,p.accent,side*.096,1.32,front-.01,.085,.22,.033);lapel.rotation.z=side*-.27;
  block(body,p.dark,side*.16,1.05,front+.003,.135,.115,.04);
  block(body,p.coat,side*.16,1.105,front+.026,.15,.035,.018);
 }
 block(body,p.dark,0,1.1,front+.017,.026,.47,.018);
 block(body,0x47463a,0,.825,.011,.43,.068,.32,'leather');
 block(body,0x9b947b,.025,.825,.179,.075,.056,.025,'metal');
 if(type==='walker'){
  if(variant===0){const tie=block(body,0x704a3c,.018,1.225,.208,.049,.26,.022);tie.rotation.z=.16;}
  if(variant===1){block(body,0xb9aa7c,0,1.19,.212,.46,.067,.025);block(body,0xb9aa7c,0,1.19,-.174,.46,.067,.025);}
  if(variant===2){block(body,0xb4ad95,-.17,1.27,.205,.084,.072,.023);}
  if(variant===3){for(const s of [-1,1])block(body,p.accent,s*.165,1.18,-.153,.044,.4,.034);}
  if(variant===4){oval(body,0x5d5646,0,1.13,-.2,.224,.267,.12,'leather');}
  for(const side of [-1,1]){const hem=block(body,p.coat,side*.147,.805,side<0?-.09:.02,.205,side<0?.16:.12,.24);hem.rotation.z=side*.09;}
 }
 if(type==='runner'){
  for(const side of [-1,1]){const stripe=block(body,0xb8aa8b,side*.19,1.33,.13,.045,.18,.045);stripe.rotation.z=side*-.3;}
  oval(body,p.dark,0,1.392,-.105,.19,.087,.125);
 }
 if(type==='brute'){
  tailored(body,0x72654e,0,.76,.15,[[0,0],[.26,.02],[.28,.32],[.21,.56],[0,.58]],.26,'leather');
  for(const side of [-1,1]){const strap=block(body,0x9b8966,side*.18,1.28,.218,.065,.33,.033,'leather');strap.rotation.z=side*.2;}
  oval(body,p.coat,0,1.41,-.1,.34,.185,.23);
 }
 if(type==='armored'){
  for(let i=0;i<3;i++)block(body,i===1?0x5e706a:0x52645f,0,1.08+i*.125,.215,.45-i*.035,.105,.083,'metal');
  for(const side of [-1,1])block(body,p.dark,side*.215,1.19,.14,.06,.43,.13,'leather');
 }
 if(type==='spitter'){
  oval(body,0x7c8a55,0,1.24,-.23,.296,.354,.205,'skin');
  for(const side of [-1,1])oval(body,p.accent,side*.19,1.39,-.24,.13,.177,.132,'skin');
  oval(body,p.skin,0,1.4,.18,.143,.19,.128,'skin');
 }
 if(type==='volatile'){
  oval(body,0x7c6643,0,1.14,.205,.268,.31,.15,'skin');
  for(const [x,y,s]of [[-.13,1.27,.13],[.13,1.16,.145],[-.075,.99,.12]])oval(body,p.accent,x,y,.3,s,s*1.15,.09,'skin');
  const strap=block(body,p.dark,-.08,1.16,.37,.045,.51,.022,'leather');strap.rotation.z=.32;
 }
}
export function buildEnemy(type='walker',appearance=0){
 const variant=characterVariant(appearance),p=palettes[type]||{coat:CIVILIAN_COATS[variant],skin:[0xa1a18a,0x919985,0xa39c83][variant%3],dark:0x3c4540,accent:0xb1a58a};
 const root=new T.Group(),body=joint(root,'body',0,0),brute=type==='brute',runner=type==='runner';
 root.name=`enemy-${type}`;root.scale.setScalar(brute?1.5:runner?.85:1);root.userData={body,type,variant,skin:'scout',visualRevision:2};
 const chest=brute?.354:runner?.25:.285;
 tailored(body,p.coat,0,.78,0,[[0,0],[.205,.02],[.22,.21],[chest,.48],[chest*.9,.58],[.135,.65],[0,.65]],brute?.74:.66);
 tube(body,p.skin,0,1.47,.015,.08,.1,.15,'skin');costume(body,p,type,variant);
 const head=joint(body,'head',brute?.025:0,1.665,brute?.12:.035);head.scale.setScalar(.87);face(head,p,variant,type);root.userData.head=head;root.userData.face=head;
 const legs=[];
 for(const side of [-1,1]){
  const leg=joint(body,side<0?'left-hip':'right-hip',side*(brute?.182:.145),.77);
  tailored(leg,p.dark,0,-.34,0,[[0,0],[.078,.01],[.098,.16],[brute?.126:.112,.3],[.085,.35],[0,.35]],.94);
  const knee=joint(leg,'knee',0,-.33);tube(knee,p.dark,0,-.115,0,.085,.068,.25);
  oval(knee,type==='armored'?p.coat:p.dark,0,-.018,.058,.092,.084,.048,type==='armored'?'metal':'cloth');
  oval(knee,0x343b34,0,-.274,.06,.103,.097,.166,'leather');
  block(knee,0x292f2c,0,-.356,.075,.21,.035,.32,'leather');
  block(knee,0x737360,0,-.255,.204,.087,.022,.02,'leather');
  leg.userData.knee=knee;legs.push(leg);
 }
 const arms=[];
 for(const side of [-1,1]){
  const arm=joint(body,side<0?'left-shoulder':'right-shoulder',side*(brute?.406:runner?.309:.348),1.35,brute?.03:0),upper=.29,lower=.28;
  oval(arm,p.coat,0,-.055,0,brute?.143:.109,.105,.108);
  tube(arm,p.coat,0,-.17,0,brute?.133:.102,brute?.115:.082,.28);
  if(type==='armored')oval(arm,0x60716a,side*.02,-.035,.015,.145,.102,.141,'metal');
  if(type==='runner')block(arm,p.accent,0,-.08,.114,.06,.155,.018);
  const elbow=joint(arm,'elbow',0,-upper,.012),bare=runner||type==='spitter'||variant===5;
  tube(elbow,bare?p.skin:p.coat,0,-.13,0,brute?.109:.082,brute?.09:.065,lower,bare?'skin':'cloth');
  if(!bare)tube(elbow,p.dark,0,-.252,0,.073,.073,.042);
  const wrist=joint(elbow,'wrist',0,-lower,.024);
  oval(wrist,p.skin,0,-.018,0,brute?.092:.068,.084,.045,'skin');
  for(const finger of [-1,0,1]){const f=oval(wrist,p.skin,finger*.035,-.103,.017,.019,.057,.024,'skin');f.rotation.x=-.18-finger*.1;}
  const thumb=oval(wrist,p.skin,side*-.071,-.034,.035,.023,.051,.025,'skin');thumb.rotation.z=side*-.4;
  arm.userData.elbow=elbow;arm.userData.wrist=wrist;arms.push(arm);
 }
 root.userData.legs=legs;root.userData.arms=arms;
 mergeBones(body);return root;
}
