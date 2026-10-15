import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CUSTOMIZATION,PALETTES,resolveAppearance,appearanceSignature} from './Customization.js';
// One articulated hero. Rigid pieces share materials and are merged per bone.
// No gameplay collision or hand-anchor dimensions depend on cosmetic choices.
const fabricMaps=new Map();
function fabric(kind){
 if(fabricMaps.has(kind))return fabricMaps.get(kind);
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  // Low-contrast dye variation and diagonal twill, not high-contrast checker noise.
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
  const dye=Math.sin(u*2+Math.sin(v*3))*.45+Math.cos(v*2-u)*.25+Math.sin(u*7+v*5)*.13;
  const weave=kind==='cloth'?((x+y*2)%6<2?3:-1):Math.sin(u*17+Math.sin(v*13))*3;
  const wear=Math.max(0,Math.sin(u*5+Math.cos(v*4))*.7+Math.sin(v*11-u*3)*.3-.55)*18;
  const value=Math.round(230+dye*13+weave+wear),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(2,2);map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.needsUpdate=true;map.userData.shared=true;fabricMaps.set(kind,map);return map;
}
const mat=(color,kind='cloth')=>{const m=new T.MeshStandardMaterial({color,roughness:kind==='metal'?.53:kind==='skin'?.84:kind==='leather'?.79:.96,metalness:kind==='metal'?.48:0,...(['cloth','leather'].includes(kind)?{map:fabric(kind),bumpMap:fabric(kind),bumpScale:kind==='cloth'?.006:.003}:{})});m.userData.surfaceKind=kind;return m;};
function attach(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1){geometry.userData.surfaceOwned=true;const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export const rounded=(p,m,x,y,z,w,h,d,r=.04)=>attach(p,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.23,h*.23,d*.23)),m,x,y,z);
const oval=(p,m,x,y,z,w,h,d)=>attach(p,new T.SphereGeometry(1,14,10),m,x,y,z,w,h,d);
const tube=(p,m,x,y,z,top,bottom,h)=>attach(p,new T.CylinderGeometry(top,bottom,h,12),m,x,y,z);
function tailored(p,m,x,y,z,levels,depth=1){
 const g=new T.LatheGeometry(levels.map(([r,h])=>new T.Vector2(r,h)),16),a=g.attributes.position;
 const height=Math.max(...levels.map(l=>l[1]));
 if(m.userData.surfaceKind==='cloth')for(let i=0;i<a.count;i++){
  const angle=Math.atan2(a.getX(i),a.getZ(i)),h=a.getY(i)/height;
  const fold=1+Math.sin(angle*6+h*5)*.024*Math.sin(Math.PI*h)+Math.sin(angle*11-h*17)*.009;
  a.setX(i,a.getX(i)*fold);a.setZ(i,a.getZ(i)*fold);
 }
 g.computeVertexNormals();return attach(p,g,m,x,y,z,1,1,depth);
}
function scarfPanel(p,m){
 const g=new T.PlaneGeometry(.135,.36,6,14),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),v=(y+.18)/.36;
  a.setXYZ(i,x*(.78+v*.22)+Math.sin(v*4)*.012,y,Math.sin(v*6+x*20)*.017+Math.sin(x*65)*.005);
 }
 g.computeVertexNormals();const panel=attach(p,g,m,-.145,1.215,.29);panel.rotation.z=-.16;
 // The back face shares the same material and geometry through the merged mesh.
 const back=g.clone();const index=back.index;for(let i=0;i<index.count;i+=3){const v=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,v);}back.computeVertexNormals();const rear=attach(p,back,m,-.145,1.215,.289);rear.rotation.z=-.16;
}
function seam(p,m,points,r=.007){const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));return attach(p,new T.TubeGeometry(curve,Math.max(4,points.length*3),r,5,false),m,0,0,0);}
// Closed, curved cloth panels retain a tailored silhouette instead of a slab hem.
function coatTail(parent,material,width,length,side,split){
 const g=new T.PlaneGeometry(width,length,6,10),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const u=a.getX(i)/(width/2),v=(a.getY(i)+length/2)/length;
  a.setXYZ(i,u*width/2*(1.12-v*.2)+side*(1-v)*.025,a.getY(i)-length/2,
   -.035-Math.cos(u*Math.PI/2)*.027+Math.sin(v*5+u*2)*.012-(split?.045:0)*(1-v));
 }
 g.computeVertexNormals();attach(parent,g,material,0,0,0);
 const back=g.clone(),index=back.index;for(let i=0;i<index.count;i+=3){const x=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,x);}back.computeVertexNormals();attach(parent,back,material,0,0,-.003);
}
export const SURVIVOR_DESIGN=Object.freeze({
 scout:{shoulder:1,waist:1,head:1,signature:'Patrol canvas / courier sling'},
 medic:{shoulder:.94,waist:.91,head:.97,signature:'Rescue coat / field supplies'},
 biker:{shoulder:1.12,waist:1.08,head:1.04,signature:'Reinforced leather / engine hardware'},
 ronin:{shoulder:.94,waist:.9,head:.95,signature:'Layered wrap / split travelling coat'}
});
function identityDetails(body,M,id){
 if(id==='medic'){
  // Ivory rescue tabard with a rust identification stripe and compact supplies.
  for(const side of [-1,1]){const tab=rounded(body,M.accent,side*.205,1.2,.165,.045,.28,.018,.004);tab.rotation.z=side*.1;}
  rounded(body,M.accent,-.16,1.2,.224,.075,.065,.012,.004);
  for(let i=0;i<3;i++){tube(body,M.white,.18+i*.035,.91,.2,.012,.012,.09);tube(body,M.accent,.18+i*.035,.964,.2,.014,.014,.018);}
  seam(body,M.leather,[[-.26,1.4,.14],[-.04,1.16,.235],[.26,.91,.16]],.014);
 }else if(id==='biker'){
  for(const side of [-1,1]){const lapel=rounded(body,M.leather,side*.15,1.29,.2,.13,.24,.035,.014);lapel.rotation.z=side*-.4;
   for(let i=0;i<3;i++)rounded(body,M.trim,side*.25,1.28-i*.045,.154,.018,.019,.012,.004);}
  seam(body,M.trim,[[.18,.9,.17],[.1,1.1,.205],[-.02,1.34,.2]],.004);
  rounded(body,M.leather,0,1.15,-.181,.34,.28,.025,.02);
  seam(body,M.trim,[[-.11,1.16,-.203],[0,1.26,-.22],[.11,1.16,-.203],[0,1.08,-.22],[-.11,1.16,-.203]],.007);
 }else if(id==='ronin'){
  for(let i=0;i<3;i++){const wrap=rounded(body,M.cloth,0,1.08+i*.08,.19,.39,.066,.024,.01);wrap.rotation.z=-.2;}
  rounded(body,M.accent,0,.89,.173,.43,.105,.045,.02);
  for(const side of [-1,1])seam(body,M.accent,[[side*.22,1.32,.115],[side*.2,1.19,.18],[side*.18,1.04,.19]],.008);
  // A folded sash at the hip; weapon silhouettes remain exclusively loadout-owned.
  const sash=rounded(body,M.accent,-.21,.78,.13,.095,.26,.04,.012);sash.rotation.z=-.25;
 }else{
  rounded(body,M.leather,-.255,.96,-.03,.14,.22,.17,.025);
  for(let i=0;i<3;i++)rounded(body,M.trim,-.16+i*.026,1.18,.225,.014,.019,.008,.003);
 }
}
function mergeBone(parent){for(const child of [...parent.children])if(child.isGroup)mergeBone(child);const groups=new Map();for(const m of parent.children)if(m.isMesh&&!m.children.length){const list=groups.get(m.material)||[];list.push(m);groups.set(m.material,list);}for(const [material,list]of groups){if(list.length<2)continue;const geos=list.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);return g;});const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(geometry){geometry.userData.surfaceOwned=true;const out=new T.Mesh(geometry,material);out.castShadow=out.receiveShadow=true;parent.add(out);for(const m of list){m.geometry.dispose();m.removeFromParent();}}}}
export function buildSurvivor(skinId='scout',custom={}){
 const design=SURVIVOR_DESIGN[skinId]||SURVIVOR_DESIGN.scout;
 const a=resolveAppearance(skinId,custom),c=PALETTES[a.palette],color=key=>CUSTOMIZATION[key].options[a[key]].color;
 const M={cloth:mat(c.cloth),dark:mat(0x263538),leather:mat(c.leather,'leather'),trim:mat(new T.Color(c.trim).multiplyScalar(.83),'metal'),accent:mat(c.accent),skin:mat(color('skin'),'skin'),shadow:mat(new T.Color(color('skin')).multiplyScalar(.72),'skin'),hair:mat(color('hairColor')),eye:mat(color('eyes')),white:mat(0xc5c9b7,'skin'),black:mat(0x172321),scar:mat(0xa97564)};
 const root=new T.Group(),body=new T.Group();root.add(body);root.userData={body,skin:skinId,type:'player',appearanceKey:appearanceSignature(skinId,custom),custom:a};
 tailored(body,a.coat==='bomber'?M.leather:M.cloth,0,.77,0,[[0,0],[.21*design.waist,.02],[.245*design.waist,.2],[.29*design.shoulder,.48],[.26*design.shoulder,.6],[.15,.66],[0,.66]],.68);
 identityDetails(body,M,skinId);root.userData.designSignature=design.signature;
 rounded(body,M.leather,0,.81,0,.48,.085,.33,.025);rounded(body,M.trim,.025,.815,.18,.085,.064,.025,.009);
 for(const side of [-1,1]){const lapel=rounded(body,M.cloth,side*.115,1.31,.161,.116,.26,.023,.012);lapel.rotation.z=side*-.27;rounded(body,M.cloth,side*.16,1.12,.18,.16,.16,.07);rounded(body,M.trim,side*.16,1.175,.222,.018,.018,.014);seam(body,M.dark,[[side*.22,.94,.165],[side*.235,1.15,.155],[side*.24,1.3,.13]],.004);}
 seam(body,M.dark,[[0,.86,.17],[0,1.1,.2],[0,1.32,.18]],.008);
 // Split hems are separate joints, with restrained secondary motion.
 const tails=[];if(['trench','split'].includes(a.coat))for(const side of [-1,1]){const tail=new T.Group();tail.position.set(side*.15,.87,-.11);body.add(tail);coatTail(tail,M.cloth,a.coat==='trench'?.3:.22,a.coat==='trench'?.56:.49,side,a.coat==='split');seam(tail,M.leather,[[side*.12,-.03,.015],[side*.12,-.43,.015]],.01);tails.push(tail);}if(a.coat==='bomber'){oval(body,M.leather,0,.91,0,.26,.07,.18);oval(body,M.leather,0,1.39,0,.2,.08,.15);}
 const neck=tube(body,M.skin,0,1.47,0,.095,.11,.15),head=new T.Group();head.position.set(0,1.68,.015);head.scale.setScalar(.87*design.head);body.add(head);root.userData.head=head;
 const width=a.face==='broad'?.185:a.face==='soft'?.159:.17,jaw=a.face==='angular'?.82:a.face==='soft'?.78:.97;
 // Shaped jaw, cheek planes and brow ridge, rather than a spherical toy head.
 const headGeo=new T.SphereGeometry(1,24,18),pos=headGeo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i);pos.setXYZ(i,x*width*(1-(1-jaw)*Math.max(0,Math.min(1,(-y-.15)/.7))),y*.218,z*.162+(z>0&&y<-.3?.015:0)+(z>0?Math.exp(-((Math.abs(x)-.55)**2*18+(y+.05)**2*30))*.012:0));}headGeo.computeVertexNormals();
 // Stubble is a soft pigmentation transition on skin, not a jagged shell.
 const faceMat=M.skin.clone(),skinColor=new T.Color(color('skin')),beardColor=new T.Color(color('hairColor')),faceColors=[];
 faceMat.vertexColors=true;faceMat.color.set(0xffffff);
 for(let i=0;i<pos.count;i++){const y=pos.getY(i),z=pos.getZ(i),x=pos.getX(i),stubble=['stubble','beard'].includes(a.facialHair)?Math.min(1,Math.max(0,(-y-.045)/.085))*(z>-.075?1:.2):0;
  const mouth=z>.105&&Math.abs(x)<.043&&y>-.119&&y<-.07;
  const c=skinColor.clone().lerp(beardColor,mouth?0:stubble*(a.facialHair==='beard'?.8:.38));faceColors.push(c.r,c.g,c.b);
 }
 headGeo.setAttribute('color',new T.Float32BufferAttribute(faceColors,3));attach(head,headGeo,faceMat,0,0,0);
 for(const side of [-1,1]){
  seam(head,M.shadow,[[side*.038,.009,.153],[side*.069,.004,.158],[side*.1,.012,.147]],.002);
  oval(head,M.skin,side*(width-.003),-.014,-.012,.028,.05,.028);oval(head,M.shadow,side*(width+.009),-.016,.005,.01,.023,.011);
  oval(head,M.shadow,side*.068,.026,.146,.038,.015,.011);oval(head,M.white,side*.068,.027,.153,.03,.009,.007);oval(head,M.eye,side*.067,.027,.159,.011,.01,.004);oval(head,M.black,side*.067,.027,.162,.0045,.007,.002);oval(head,M.white,side*.063,.031,.164,.002,.002,.001);
  const brow=oval(head,M.hair,side*.07,.058,.15,.037,.006,.008);brow.rotation.z=side*(a.face==='angular'?-.13:.04);
 }
 oval(head,M.skin,0,-.005,.156,.022,.047,.026);oval(head,M.skin,0,-.037,.175,.02,.014,.017);for(const side of [-1,1])oval(head,M.shadow,side*.016,-.046,.181,.008,.003,.005);
 seam(head,M.shadow,[[-.033,-.096,.164],[0,-.099,.172],[.033,-.096,.164]],.003);oval(head,M.skin,0,-.107,.163,.03,.005,.007);
 if(['beard','moustache'].includes(a.facialHair))for(const side of [-1,1]){const st=oval(head,M.hair,side*.022,-.073,.153,.023,.006,.004);st.rotation.z=side*.1;}
 const hair=new T.Group();head.add(hair);if(a.hair!=='shaved'){const cap=new T.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.43);const hp=cap.attributes.position;for(let i=0;i<hp.count;i++){const y=hp.getY(i),z=hp.getZ(i);hp.setY(i,y+.3*Math.max(0,z)**2*(1-y));}cap.computeVertexNormals();attach(hair,cap,M.hair,0,.035,-.015,width*1.04,.203,.169);if(a.hair==='crop')oval(hair,M.hair,0,.188,0,width*.9,.032,.13);if(a.hair==='swept')for(let i=0;i<5;i++){const lock=oval(hair,M.hair,-.12+i*.05,.16+i*.005,.079,.053,.057,.125);lock.rotation.z=-.36;}if(a.hair==='braids')for(let i=0;i<5;i++)seam(hair,M.hair,[[-.12+i*.06,.19,.075],[-.12+i*.06,.22,-.05],[-.12+i*.06,.08,-.17],[-.12+i*.06,-.2,-.19]],.022);if(a.hair==='knot'){oval(hair,M.hair,0,.245,-.07,.087,.074,.075);tube(hair,M.accent,0,.205,-.065,.07,.07,.025);}if(a.hair==='mohawk')for(let i=0;i<5;i++)oval(hair,M.hair,0,.225,-.11+i*.047,.043,.066,.038);}
 const hat=new T.Group();head.add(hat);if(a.headwear==='cap'){oval(hat,M.cloth,0,.186,-.025,.19,.065,.175);rounded(hat,M.leather,0,.166,.166,.32,.024,.17,.02);rounded(hat,M.trim,0,.21,.137,.057,.034,.018,.005);}if(a.headwear==='beret'){const b=oval(hat,M.accent,-.026,.206,-.015,.209,.066,.18);b.rotation.z=.16;rounded(hat,M.trim,.08,.212,.147,.04,.038,.012);}if(a.headwear==='band'){oval(hat,M.accent,0,.13,-.015,.177,.032,.165);for(const side of [-1,1]){const ribbon=rounded(hat,M.accent,side*.07,-.04,-.19,.05,.28,.027);ribbon.rotation.z=side*.3;}}if(a.headwear==='hood'){const hood=new T.SphereGeometry(1,16,12,Math.PI*.8,Math.PI*1.4);attach(hat,hood,M.cloth,0,.02,-.04,.225,.28,.205);}
 const marks=new T.Group();head.add(marks);if(a.scar==='brow'||a.scar==='eye')seam(marks,M.scar,[[.099,.106,.113],[.079,.054,.15],[.09,-.026,.145]],.0025);if(a.scar==='cheek')seam(marks,M.scar,[[-.132,-.02,.128],[-.095,-.067,.169],[-.065,-.12,.148]],.004);if(a.scar==='paint')for(const side of [-1,1]){const m=rounded(marks,M.accent,side*.088,-.012,.164,.082,.027,.012,.004);m.rotation.z=side*.15;}
 const accessory=new T.Group();body.add(accessory);if(a.accessory==='scarf'){tube(accessory,M.accent,0,1.44,0,.118,.145,.087);scarfPanel(accessory,M.accent);}if(a.accessory==='satchel'){rounded(accessory,M.leather,.3,.9,-.02,.22,.26,.22);seam(accessory,M.leather,[[-.22,1.4,.19],[0,1.15,.23],[.3,.94,.15]],.024);rounded(accessory,M.accent,.31,.95,.1,.11,.037,.018);}if(a.accessory==='goggles'){for(const side of [-1,1]){oval(head,M.leather,side*.079,.104,.166,.067,.043,.025);oval(head,M.trim,side*.079,.104,.19,.052,.031,.01);oval(head,M.dark,side*.079,.104,.201,.043,.025,.008);}}if(a.accessory==='radio'){rounded(accessory,M.dark,-.235,1.34,.12,.12,.16,.09);tube(accessory,M.dark,-.27,1.5,.12,.008,.008,.22);for(let i=0;i<3;i++)rounded(accessory,M.trim,-.235,1.36-i*.025,.17,.075,.005,.005);}
 const legs=[];for(const side of [-1,1]){
  const leg=new T.Group();leg.position.set(side*.145,.77,0);body.add(leg);
  tailored(leg,M.dark,0,-.34,0,[[0,0],[.084,.02],[.097,.12],[.108,.25],[.102,.32],[.087,.35],[0,.35]],.9);
  const knee=new T.Group();knee.position.y=-.33;leg.add(knee);
  tailored(knee,M.dark,0,-.27,0,[[0,0],[.07,.025],[.078,.09],[.089,.23],[.083,.29],[0,.29]],.95);
  const ankle=new T.Group();ankle.position.y=-.29;knee.add(ankle);
  rounded(ankle,M.leather,0,.04,0,.167,.16,.173,.025);oval(ankle,M.leather,0,-.018,.053,.092,.058,.145);
  rounded(ankle,M.dark,0,-.07,.055,.193,.035,.305,.014);
  for(let i=0;i<4;i++)seam(ankle,M.dark,[[-.042,.073-i*.024,.089],[.042,.062-i*.024,.096]],.003);
  leg.userData.knee=knee;leg.userData.ankle=ankle;legs.push(leg);
 }
 const arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.37,1.35,0);body.add(arm);tailored(arm,M.cloth,0,-.33,0,[[0,0],[.083,.015],[.098,.13],[.108,.25],[.095,.33],[0,.35]],.96);const elbow=new T.Group();elbow.position.y=-.34;arm.add(elbow);oval(elbow,M.cloth,0,0,0,.087,.08,.085);tube(elbow,M.cloth,0,-.15,0,.084,.069,.3);tube(elbow,M.leather,0,-.285,0,.075,.076,.043);const wrist=new T.Group();wrist.position.y=-.32;elbow.add(wrist);rounded(wrist,M.leather,0,-.006,.009,.115,.09,.083,.018);for(let finger=0;finger<4;finger++)oval(wrist,M.leather,-.041+finger*.027,-.067,.024,.014,.047,.026);oval(wrist,M.leather,side*-.066,-.025,.028,.022,.041,.026);for(let i=0;i<3;i++)rounded(wrist,M.dark,-.034+i*.03,.015,.053,.012,.012,.005,.002);arm.userData.elbow=elbow;arm.userData.wrist=wrist;arms.push(arm);}
 root.userData.legs=legs;root.userData.arms=arms;root.userData.tails=tails;root.userData.hat=hat;root.userData.hair=hair;root.userData.accessory=accessory;root.userData.materials=M;mergeBone(body);return root;
}
export function animateSurvivorDetails(root,time,walk,dash){for(const [i,tail]of (root.userData.tails||[]).entries()){tail.rotation.x=(dash?-.55:0)+Math.sin(time*6+i)*walk*.12;tail.rotation.z=Math.sin(time*2.4+i)*(.015+walk*.035);}}
