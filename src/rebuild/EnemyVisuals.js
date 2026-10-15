import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import headAsset from '../../assets/characters/infected-head.json' with {type:'json'};
import {CIVILIAN_COATS,characterVariant} from './CharacterDetails.js';

// Broad value changes survive the street camera without a repeating microtexture.
// Six shared material responses keep horde instancing bounded; every actor owns
// its merged geometry, so removing a corpse cannot invalidate another enemy.
const materials=Object.fromEntries(Object.entries({cloth:[.94,0],skin:[.84,0],face:[.86,0],leather:[.73,.03],metal:[.53,.38],membrane:[.56,0]}).map(([kind,[roughness,metalness]])=>{
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness});m.userData.shared=true;m.name=`infected-${kind}`;return[kind,m];
}));
// Reuse the pinned CC0 atlas unchanged. Its original UVs survive the head
// extraction; only the anatomical face samples it. Shared cache lifetime keeps
// corpses and streamed variants from disposing a live enemy's texture.
const faceTexture=typeof document==='undefined'?new T.Texture():new T.TextureLoader().load(new URL('../../assets/characters/infected-skin.png',import.meta.url).href);
faceTexture.colorSpace=T.SRGBColorSpace;faceTexture.userData.shared=true;faceTexture.name='infected-anatomical-skin';materials.face.map=faceTexture;
const palettes={
 runner:{coat:0x815044,skin:0xa09e84,dark:0x393d3b,accent:0xb39b77},
 brute:{coat:0x52605a,skin:0x979780,dark:0x353d3b,accent:0x9b8260},
 spitter:{coat:0x686b4c,skin:0xa4ad7b,dark:0x394038,accent:0xb1b675},
 armored:{coat:0x4c5e5c,skin:0x939d86,dark:0x303c3c,accent:0x9a9b82},
 volatile:{coat:0x745d44,skin:0xa69c77,dark:0x443d33,accent:0xc49955},
};
function mesh(parent,geometry,color,kind,x=0,y=0,z=0,sx=1,sy=1,sz=1){
 // Corpse settling replaces these meshes with static batches. Unlike cached
 // primitive geometry, every enemy piece is owned and must be released there.
 geometry.userData.surfaceOwned=true;
 const p=geometry.attributes.position,colors=new Float32Array(p.count*3),base=new T.Color(color);
 geometry.computeBoundingBox();const bounds=geometry.boundingBox,dy=Math.max(.001,bounds.max.y-bounds.min.y);
 for(let i=0;i<p.count;i++){const height=(p.getY(i)-bounds.min.y)/dy,normal=geometry.attributes.normal;
  // Low-frequency staining follows the surface, never screen-space dithering.
  // Lift exposed planes while keeping hems, underarms and seams subdued.
  const stain=Math.sin((p.getX(i)*sx+x)*8.7+(p.getY(i)*sy+y)*5.3)*Math.sin((p.getZ(i)*sz+z)*11.1-(p.getY(i)*sy+y)*3.1);
  const shade=(kind==='cloth'?.74:.86)+(kind==='cloth'?.17:.08)*height+(kind==='cloth'?.075:.035)*stain+.035*Math.max(0,normal?.getY(i)||0);colors[i*3]=base.r*shade;colors[i*3+1]=base.g*shade;colors[i*3+2]=base.b*shade;}
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const m=new T.Mesh(geometry,materials[kind]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
const oval=(p,c,x,y,z,w,h,d,kind='cloth')=>mesh(p,new T.SphereGeometry(1,10,7),c,kind,x,y,z,w,h,d);
const detailOval=(p,c,x,y,z,w,h,d,kind='skin')=>mesh(p,new T.SphereGeometry(1,8,5),c,kind,x,y,z,w,h,d);
const digit=(p,c,x,y,z,w,h,d)=>mesh(p,new T.SphereGeometry(1,8,5),c,'skin',x,y,z,w,h,d);
function patch(parent,color,points,kind='cloth'){
 const geometry=new T.BufferGeometry(),positions=[],uv=[];
 const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
 if(area<0)points=[...points].reverse();
 for(let i=1;i<points.length-1;i++)for(const point of [points[0],points[i],points[i+1]]){positions.push(...point);uv.push(point[0],point[1]);}
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return mesh(parent,geometry,color,kind);
}
const block=(p,c,x,y,z,w,h,d,kind='cloth')=>mesh(p,new T.BoxGeometry(1,1,1),c,kind,x,y,z,w,h,d);
const tube=(p,c,x,y,z,top,bottom,h,kind='cloth')=>mesh(p,new T.CylinderGeometry(top,bottom,h,8),c,kind,x,y,z);
function tailored(parent,color,x,y,z,levels,depth=1,kind='cloth'){
 return mesh(parent,new T.LatheGeometry(levels.map(([r,h])=>new T.Vector2(r,h)),10),color,kind,x,y,z,1,1,depth);
}
// A single closed organic shell replaces intersecting stacked spheres. The
// lobes deform the anatomy continuously, with pigmentation following tension.
function organicMass(parent,base,accent,x,y,z,w,h,d,lobes){
 const geometry=new T.SphereGeometry(1,14,10),p=geometry.attributes.position,weights=[];
 for(let i=0;i<p.count;i++){
  const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);let swelling=0;
  for(const [lx,ly,lz,strength]of lobes){const distance=(px-lx)**2+(py-ly)**2+(pz-lz)**2;swelling+=strength*Math.exp(-distance*6);}
  const rib=.018*Math.sin(py*14+px*3)*Math.max(0,pz);
  p.setXYZ(i,px*(1+swelling*.45),py*(1+swelling*.3),pz*(1+swelling+rib));weights.push(swelling);
 }
 geometry.computeVertexNormals();const out=mesh(parent,geometry,base,'membrane',x,y,z,w,h,d),colors=geometry.attributes.color,highlight=new T.Color(accent),bodyColor=new T.Color(base);
 for(let i=0;i<p.count;i++){
  const t=Math.min(.65,weights[i]*1.5),shade=colors.getX(i)/bodyColor.r;
  colors.setXYZ(i,(bodyColor.r+(highlight.r-bodyColor.r)*t)*shade,(bodyColor.g+(highlight.g-bodyColor.g)*t)*shade,(bodyColor.b+(highlight.b-bodyColor.b)*t)*shade);
 }
 return out;
}
function joint(parent,name,x,y,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function mergeBones(parent){
 for(const child of [...parent.children])if(child.isGroup)mergeBones(child);
 const groups=new Map();for(const child of parent.children)if(child.isMesh){const list=groups.get(child.material)||[];list.push(child);groups.set(child.material,list);}
 for(const [material,pieces]of groups){if(pieces.length<2)continue;
  const geometries=pieces.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);});
  const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();
  if(!geometry)throw new Error('Enemy bone geometry attributes must match');
  geometry.userData.surfaceOwned=true;
  // Preserve painted-surface ranges through batching without adding another
  // shader attribute or draw. QA can test exact wound ownership after merging.
  let vertexOffset=0;geometry.userData.woundRanges=[];
  for(const piece of pieces){const count=piece.geometry.index?.count||piece.geometry.attributes.position.count;if(piece.geometry.userData.wound)geometry.userData.woundRanges.push([vertexOffset,count]);vertexOffset+=count;}
  const merged=new T.Mesh(geometry,material);merged.castShadow=merged.receiveShadow=true;parent.add(merged);
  for(const piece of pieces){piece.geometry.dispose();piece.removeFromParent();}
 }
}
// Shared immutable anatomical source; actor-owned clones are merged/disposed by
// the same rigid-bone path as clothing. UV seams survive for later skin atlases.
const headSource=new T.BufferGeometry();
headSource.setAttribute('position',new T.Float32BufferAttribute(headAsset.position,3));
headSource.setAttribute('normal',new T.Float32BufferAttribute(headAsset.normal,3));
headSource.setAttribute('uv',new T.Float32BufferAttribute(headAsset.uv,2));
headSource.setIndex(headAsset.index);headSource.userData.shared=true;
function face(head,p,variant,type){
 const width=type==='brute'?.184:type==='runner'?.153:.167;
 const geometry=headSource.clone(),pos=geometry.attributes.position;delete geometry.userData.shared;
 // Broad, continuous facial identity changes, rather than glued-on features.
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const jaw=Math.exp(-(((y+.13)/.07)**2)),cheek=Math.exp(-(((y+.03)/.06)**2));
  const identity=(variant-2.5)*.012;
  const neck=Math.max(0,Math.min(1,(-y-.16)/.07));
  pos.setXYZ(i,x*width/.156*(1+identity*jaw+(type==='brute'?.08*jaw:0))*(1-neck*.48),y,((z+(variant%2?-.003:.003)*cheek)+.023)*(1-neck*.48)-.023);
 }
 geometry.computeVertexNormals();const skull=mesh(head,geometry,p.faceSkin,'face');
 const skinColors=skull.geometry.attributes.color;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),underEye=Math.exp(-((Math.abs(x)-.057)**2/.001+(y-.003)**2/.0006))*Math.max(0,z/.16);
  const bruise=Math.exp(-((x-(variant%2?-.105:.105))**2/.0018+(y+.08)**2/.003))*Math.max(0,z/.16);
  skinColors.setXYZ(i,skinColors.getX(i)*(1-underEye*.2-bruise*.09),skinColors.getY(i)*(1-underEye*.16-bruise*.14),skinColors.getZ(i)*(1-underEye*.09-bruise*.08));
 }
 // Eye inserts live in actual orbital openings. Ears, nose, lips, jaw and neck
 // now belong to the continuous source mesh, not overlapping primitives.
 for(const side of [-1,1]){
  detailOval(head,side===1?0x777b6f:0x94978a,side*.056*width/.167,.029,.126,.025,.012,.027,'skin');
  detailOval(head,0x4a5048,side*.056*width/.167,.029,.151,.006,.004,.003,'skin');
 }
 const side=variant%2?1:-1;
 // Paint the irregular cheek lesion onto the skull surface instead of a
 // floating flat decal. Ray intersections are resolved only at model creation.
 head.updateWorldMatrix(true,true);const ray=new T.Raycaster(),origin=new T.Vector3(),direction=head.localToWorld(new T.Vector3(0,0,-1)).sub(head.localToWorld(new T.Vector3())).normalize();
 const lesion=(color,rx,ry,phase)=>{
  // Project interior vertices too: a fan spanning only the outline cuts into
  // a convex cheek, hiding most of the wound despite correct edge placement.
  const vertices=[],indices=[],segments=16,rings=4,center=side*width*.51;rx*=width/.167;
  const project=(x,y)=>{origin.copy(head.localToWorld(new T.Vector3(x,y,.5)));ray.set(origin,direction);const hit=ray.intersectObject(skull)[0];vertices.push(x,y,hit?head.worldToLocal(hit.point).z+.007+phase:.12);};
  project(center,-.043);
  for(let ring=1;ring<=rings;ring++)for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,r=ring/rings*(.78+.16*Math.sin(a*3+variant)+.11*Math.cos(a*5+variant*.6)+.05*Math.sin(a*7));
   project(center+Math.cos(a)*rx*r,-.043+Math.sin(a)*ry*r);
  }
  for(let i=0;i<segments;i++)indices.push(0,1+i,1+(i+1)%segments);
  for(let ring=1;ring<rings;ring++)for(let i=0;i<segments;i++){
   const a=1+(ring-1)*segments+i,b=1+(ring-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;
   indices.push(a,c,d,a,d,b);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Array(vertices.length/3*2).fill(0),2));g.setIndex(indices);g.computeVertexNormals();mesh(head,g,color,'skin');g.userData.wound=true;
  // Ragged pigmented rim settles into surrounding skin; the torn center stays
  // dark and uneven rather than forming a contrasting target-like inset.
  const colors=g.attributes.color,skin=new T.Color(p.faceSkin).multiply(new T.Color(.674,.244,.164));
  for(let i=0;i<colors.count;i++){
   const ring=i===0?0:Math.ceil(i/segments),edge=phase?0:Math.max(0,(ring/rings-.45)/.55)*.72;
   colors.setXYZ(i,colors.getX(i)*(1-edge)+skin.r*.84*edge,colors.getY(i)*(1-edge)+skin.g*.84*edge,colors.getZ(i)*(1-edge)+skin.b*.84*edge);
  }
 };
 lesion(0x62413a,.029,.047,0);lesion(0x3d2b29,.011,.024,.001);
 if(type==='armored'){
  mesh(head,new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.52),p.coat,'metal',0,.04,-.022,.206,.213,.19);
  block(head,p.dark,0,.049,.012,.423,.035,.38,'metal');
  block(head,p.accent,0,.128,.166,.053,.052,.012,'metal');
 }else if(variant===1&&type==='walker'){
  mesh(head,new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.5),0xa79463,'cloth',0,.11,0,.205,.145,.19);
  detailOval(head,0x8d7b52,0,.107,.015,.23,.025,.215);
 }else if(variant!==5&&type!=='volatile'){
  const hair=mesh(head,new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.48),[0x44483b,0x686658,0x555044][variant%3],'cloth',0,.055,-.029,width*1.03,.179,.146);
  hair.rotation.z=variant===4?.14:-.08;
 }
 if(type==='spitter')detailOval(head,p.accent,0,-.18,.064,.12,.08,.113,'skin');
}
function costume(body,p,type,variant){
 const front=type==='brute'?.245:.193;
 // Frayed cloth has a shaped outline and a dark inner lining, rather than
 // rectangular stickers. These stay in the existing rigid material batches.
 for(const side of [-1,1]){
  const x=side*.17;
  patch(body,p.dark,[[x-.065,.845,front],[x+.068,.845,front],[x+.052,.756,front+.01],[x+.018,.783,front+.015],[x-.018,.723,front+.008],[x-.064,.773,front]]);
  const seam=block(body,p.accent,side*.22,1.06,front*.68,.012,.31,.014);seam.rotation.z=side*.06;
 }
 patch(body,0x544c3e,[[-.215,1.22,front+.021],[-.155,1.252,front+.024],[-.105,1.12,front+.024],[-.135,1.14,front+.025],[-.19,1.079,front+.021]]);
 // A contrasting turned collar connects the shoulders to the neck.
 for(const side of [-1,1]){const collar=block(body,p.dark,side*.072,1.428,.06,.075,.095,.185);collar.rotation.z=side*-.24;}
 // Open lapels, raised seams and broken hems are large enough to read at distance.
 for(const side of [-1,1]){
  // Folded lapels share a raised crease, not thick rectangular bars.
  patch(body,p.coat,[[side*.025,1.39,front-.012],[side*.095,1.435,front-.02],[side*.172,1.34,front+.018],[side*.074,1.155,front+.018]]);
  patch(body,p.accent,[[side*.025,1.39,front-.012],[side*.074,1.155,front+.018],[side*.06,1.34,front+.035]]);
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
  organicMass(body,0x718052,p.accent,0,1.24,-.23,.315,.365,.21,[[-.55,.55,-.5,.27],[.5,.45,-.6,.34],[0,-.35,-.85,.15]]);
  oval(body,p.skin,0,1.4,.18,.143,.19,.128,'skin');
 }
 if(type==='volatile'){
  organicMass(body,0x8a7250,p.accent,0,1.14,.205,.275,.32,.18,[[-.5,.4,.7,.28],[.5,.08,.8,.38],[-.25,-.6,.65,.22]]);
  const strap=block(body,p.dark,-.08,1.16,.37,.045,.51,.022,'leather');strap.rotation.z=.32;
 }
}
export function buildEnemy(type='walker',appearance=0){
 const variant=characterVariant(appearance),p={...(palettes[type]||{coat:CIVILIAN_COATS[variant],skin:[0xa1a18a,0x919985,0xa39c83][variant%3],dark:0x3c4540,accent:0xb1a58a})};
 // Linear RGB averages sampled from the unchanged source atlas at neck UVs.
 // Match bare limbs/neck to that complexion, while the textured head retains
 // its original palette multiplier. Never mutate a shared archetype palette.
 p.faceSkin=p.skin;p.skin=new T.Color(p.skin).multiply(new T.Color(.707,.352,.208));
 const root=new T.Group(),body=joint(root,'body',0,0),brute=type==='brute',runner=type==='runner';
 root.name=`enemy-${type}`;root.scale.setScalar(brute?1.5:runner?.85:1);root.userData={body,type,variant,skin:'scout',visualRevision:4};
 const chest=brute?.354:runner?.25:.285,waist=runner?.173:type==='volatile'?.26:.205;
 tailored(body,p.coat,0,.78,0,[[0,0],[waist,.02],[waist*.98,.16],[chest*.92,.39],[chest,.48],[chest*.84,.59],[.135,.65],[0,.65]],brute?.74:runner?.61:.66);
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
  tailored(arm,p.coat,0,-.31,0,[[0,0],[brute?.115:.079,.015],[brute?.129:.089,.09],[brute?.15:.112,.22],[brute?.135:.1,.31],[brute?.07:.045,.355],[0,.365]],.88);
  if(type==='armored')oval(arm,0x60716a,side*.02,-.035,.015,.145,.102,.141,'metal');
  if(type==='runner')block(arm,p.accent,0,-.08,.114,.06,.155,.018);
  const elbow=joint(arm,'elbow',0,-upper,.012),bare=runner||type==='spitter'||variant===5;
  tailored(elbow,bare?p.skin:p.coat,0,-.27,0,[[0,0],[brute?.075:.055,.012],[brute?.09:.065,.08],[brute?.115:.084,.19],[brute?.098:.076,.27],[0,.28]],.86,bare?'skin':'cloth');
  if(!bare)tube(elbow,p.dark,0,-.252,0,.073,.073,.042);
  const wrist=joint(elbow,'wrist',0,-lower,.024);
  oval(wrist,p.skin,0,-.018,0,brute?.092:.068,.084,.045,'skin');
  for(const finger of [-1,0,1]){const f=digit(wrist,p.skin,finger*.035,-.103,.017,.019,.057,.024);f.rotation.x=-.18-finger*.1;}
  const thumb=digit(wrist,p.skin,side*-.071,-.034,.035,.023,.051,.025);thumb.rotation.z=side*-.4;
  arm.userData.elbow=elbow;arm.userData.wrist=wrist;arms.push(arm);
 }
 root.userData.legs=legs;root.userData.arms=arms;
 mergeBones(body);return root;
}
