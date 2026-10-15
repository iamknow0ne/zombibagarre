import {surfaceUV,SURFACES} from './SurfaceMaterials.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import anatomicalHead from '../../assets/characters/infected-head.json' with {type:'json'};
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Sculpted in a six-metre reference space. All joints remain separate for combat poses.
export function buildBossModel(e,surfaces){
 const root=new T.Group(),body=new T.Group();root.add(body);const profile=e.bossProfile,kind=profile.kind,pale=profile.color===0xd8e9ee;
 const mats={iron:new T.MeshStandardMaterial({color:pale?0x778e97:0x303d3e,roughness:.58,metalness:.65}),rust:new T.MeshStandardMaterial({color:0x77533e,roughness:.91}),bone:new T.MeshStandardMaterial({color:pale?0xe0e8de:0xb4ab8c,roughness:.78}),dark:new T.MeshStandardMaterial({color:0x182525,roughness:.9}),bark:new T.MeshStandardMaterial({color:0x4c5740,roughness:1}),glow:new T.MeshStandardMaterial({color:profile.color,emissive:profile.color,emissiveIntensity:1.3,roughness:.3}),red:new T.MeshStandardMaterial({color:0x795144,roughness:.85})};
 for(const material of Object.values(mats))material.vertexColors=true;
 const mesh=(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1)=>{
  const p=geometry.attributes.position,n=geometry.attributes.normal,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const px=p.getX(i)*sx+x,py=p.getY(i)*sy+y,pz=p.getZ(i)*sz+z;
   const grain=Math.sin(px*7.3+py*3.9)*Math.sin(pz*8.1-py*6.2);
   const grime=material==='glow'?1:.81+.1*Math.max(0,n.getY(i))+.075*grain;
   const corrosion=['iron','rust'].includes(material)?Math.max(0,grain-.28)*.11:0;
   colors[i*3]=grime+corrosion;colors[i*3+1]=grime-corrosion*.35;colors[i*3+2]=grime-corrosion*.7;
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const m=new T.Mesh(geometry,mats[material]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(p,m,x,y,z,w,h,d)=>mesh(p,new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.13),m,x,y,z);
 const orb=(p,m,x,y,z,a,b=a,c=a)=>mesh(p,new T.IcosahedronGeometry(1,1),m,x,y,z,a,b,c);
 const rod=(p,m,a,b,r=.09,r2=r)=>{const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const o=mesh(p,new T.CylinderGeometry(r2,r,d.length(),8),m,...va.clone().add(vb).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;};
 const hoop=(p,m,x,y,z,r,t=.07)=>mesh(p,new T.TorusGeometry(r,t,6,24),m,x,y,z);
 const joint=(x,y,z)=>{const g=new T.Group();g.position.set(x,y,z);body.add(g);return g;};
 const legs=[],arms=[],petals=[],doors=[],chains=[];
 if(kind==='warden'){
  for(const side of [-1,1]){const leg=joint(side*.58,2.2,0);legs.push(leg);rod(leg,'dark',[0,0,0],[side*.13,-1.95,.2],.26);for(let i=0;i<4;i++)box(leg,'iron',side*.07,-.35-i*.4,.24,.62,.36,.28);box(leg,'iron',side*.1,-2,.4,.75,.35,1.1);orb(leg,'bone',0,-.8,.35,.29);}
  orb(body,'dark',0,3.1,0,.95,1.25,.5);for(let i=0;i<6;i++){const rib=hoop(body,'rust',0,2.55+i*.23,.04,.72+i*.025,.07);rib.rotation.x=Math.PI/2;}
  box(body,'iron',0,3.8,.33,1.45,.8,.3);for(const side of [-1,1])for(let i=0;i<4;i++)rod(body,'bone',[side*.23,3.7-i*.24,.5],[side*.72,3.5-i*.24,.43],.07);
  orb(body,'dark',0,4.7,0,.47,.6,.4);box(body,'iron',0,4.75,.35,.7,.63,.15);box(body,'glow',0,4.79,.44,.51,.045,.025);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;rod(body,'bone',[Math.sin(a)*.42,5,.04+Math.cos(a)*.33],[Math.sin(a)*.63,5.65+(i%2)*.24,Math.cos(a)*.4],.1,.015);}
  for(const side of [-1,1]){const arm=joint(side*1.02,3.9,0);arms.push(arm);orb(arm,'iron',0,0,0,.53,.4,.5);rod(arm,'dark',[0,0,0],[side*.25,-1.3,.1],.2);orb(arm,'bone',side*.25,-1.35,.1,.24);for(let i=0;i<4;i++)box(arm,'rust',side*.2,-.3-i*.24,.2,.38,.2,.3);}
  const shield=arms[0];box(shield,'iron',-.15,-.8,.47,1.25,2.5,.3);box(shield,'bone',-.15,-.8,.65,.1,2.2,.07);box(shield,'bone',-.15,-.5,.65,1.06,.12,.07);for(const x of [-.65,.35])for(let i=0;i<6;i++)orb(shield,'rust',x,-1.8+i*.4,.65,.06);
  const bell=arms[1];rod(bell,'rust',[.2,-1.15,.1],[.2,.7,.1],.09);mesh(bell,new T.CylinderGeometry(.24,.74,1.1,16,1,true),'rust',.2,-1.75,.1);hoop(bell,'bone',.2,-2.3,.1,.74,.06).rotation.x=Math.PI/2;orb(bell,'glow',.2,-2.15,.1,.18);
 }else if(kind==='dredger'){
  for(const side of [-1,1])for(const front of [-1,1]){const leg=joint(side*.7,2.6,front*.45);legs.push(leg);rod(leg,'iron',[0,0,0],[side*.85,-1.1,front*.5],.15);orb(leg,'rust',side*.85,-1.1,front*.5,.23);rod(leg,'bone',[side*.85,-1.1,front*.5],[side*1.1,-2.5,front*.8],.1,.025);box(leg,'iron',side*1.05,-2.45,front*.75,.5,.18,.65);}
  box(body,'iron',0,2.75,0,1.6,.65,1.35);for(const side of [-1,1]){rod(body,'iron',[side*.7,2.6,0],[side*.8,5.8,-.25],.16);rod(body,'rust',[side*.8,5.8,-.25],[side*.75,5.4,1.15],.12);for(let i=0;i<6;i++)rod(body,'rust',[side*.8,3+i*.42,0],[side*.8,3.4+i*.42,-.25],.045);}
  rod(body,'iron',[-.8,5.75,-.25],[.8,5.75,-.25],.16);const cage=joint(0,4.6,.6);arms.push(cage);// The shroud sits behind the captive. The old full-depth oval buried the
  // entire anatomical face despite the face geometry being present.
  orb(cage,'dark',0,-.6,-.18,.48,.66,.22);// A drowned captive is bound inside the machine, not a scaled zombie.
  const captive=new T.BufferGeometry();captive.setAttribute('position',new T.Float32BufferAttribute(anatomicalHead.position,3));captive.setAttribute('uv',new T.Float32BufferAttribute(anatomicalHead.uv,2));captive.setIndex(anatomicalHead.index);
  const facePoints=captive.attributes.position,reaper=profile.name==='THE DUST REAPER';
  for(let i=0;i<facePoints.count;i++){const x=facePoints.getX(i),y=facePoints.getY(i),z=facePoints.getZ(i);facePoints.setXYZ(i,x*(reaper?.88:1),y*(y<0?1.18:1),z+(y<-.08?-.014:0));}
  captive.computeVertexNormals();mesh(cage,captive,'bone',0,-.34,.015,1.95,1.95,1.95);
  for(const side of [-1,1]){orb(cage,'dark',side*.109,-.283,.271,.05,.024,.03);orb(cage,'glow',side*.109,-.283,.299,.018,.01,.008);}
  rod(cage,'rust',[-.3,-.65,.3],[.3,-.65,.3],.045);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(cage,'bone',[Math.sin(a)*.58,.25,Math.cos(a)*.5],[Math.sin(a)*.58,-1.25,Math.cos(a)*.5],.055);}for(const y of [.25,-1.25])hoop(cage,'rust',0,y,0,.6,.08).rotation.x=Math.PI/2;
  for(const side of [-1,1]){const chain=joint(side*.75,5.45,.9);chains.push(chain);for(let i=0;i<10;i++){const h=hoop(chain,'rust',0,-i*.23,0,.13,.036);h.rotation.y=i%2*Math.PI/2;}mesh(chain,new T.TorusGeometry(.37,.1,6,18,Math.PI*1.65),'bone',0,-2.55,0);rod(chain,'bone',[.33,-2.58,0],[.19,-2.25,0],.07,.01);}
 }else if(kind==='bloom'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,leg=joint(0,1.55,0);legs.push(leg);leg.userData.a=a;const x=Math.sin(a),z=Math.cos(a);rod(leg,'bark',[0,0,0],[x*1.15,-.45,z*1.15],.3,.18);rod(leg,'bone',[x*1.15,-.45,z*1.15],[x*1.8,-1.5,z*1.8],.15,.025);}
  orb(body,'bark',0,2.8,0,.92,1.65,.8);for(let i=0;i<9;i++){const a=i*2.4;rod(body,'bone',[Math.sin(a)*.5,1.4,Math.cos(a)*.5],[Math.sin(a)*1,3.7,Math.cos(a)*.9],.09,.035);}
  const cathedral=profile.name==='THE ROOT CATHEDRAL',heart=new T.SphereGeometry(1,14,10),heartPoints=heart.attributes.position;
  for(let i=0;i<heartPoints.count;i++){const x=heartPoints.getX(i),y=heartPoints.getY(i),z=heartPoints.getZ(i),a=Math.atan2(z,x),rib=1+.11*Math.cos(a*7)*(1-y*y);heartPoints.setXYZ(i,x*rib*(1-.14*y),y,z*rib);}
  heart.computeVertexNormals();mesh(body,heart,'red',0,4.35,0,.57,.75,.57);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;rod(body,'glow',[Math.sin(a)*.39,3.96,Math.cos(a)*.39],[Math.sin(a)*.53,4.58,Math.cos(a)*.53],.027,.012);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4,g=joint(Math.sin(a)*.3,3.7,Math.cos(a)*.3);g.rotation.order='YXZ';g.rotation.y=a;petals.push(g);const petalGeometry=new T.SphereGeometry(1,10,8),petalPoints=petalGeometry.attributes.position;
   // Cupped, tapered petals have a continuous folded surface. The earlier
   // scaled icosahedra read as rounded pods even when the flower opened.
   for(let vertex=0;vertex<petalPoints.count;vertex++){const x=petalPoints.getX(vertex),y=petalPoints.getY(vertex),z=petalPoints.getZ(vertex);petalPoints.setXYZ(vertex,x*(1+.3*y)*(cathedral?1-.32*Math.max(0,y):1),y,z*.62+.28*(1-Math.abs(x))*(1-y*y)+.2*Math.max(0,y)**2);}
   petalGeometry.computeVertexNormals();const petal=mesh(g,petalGeometry,'bark',0,.65,.35,cathedral?.4:.48,cathedral?(i%2?1.18:1.62):1.25,.22);petal.rotation.x=.18;rod(g,'bone',[0,-.1,.4],[0,1.75,.55],.07,.015);
   for(let k=0;k<3;k++)for(const side of [-1,1])rod(g,'red',[0,.18+k*.4,.57],[side*(.29-k*.035),.39+k*.4,.57],.025,.009);}
  for(const side of [-1,1]){rod(body,'bark',[side*.6,3.1,-.2],[side*1.2,4.9,-.4],.14,.08);rod(body,'bone',[side*1.2,4.9,-.4],[side*1.65,5.9,-.4],.08,.005);for(let i=0;i<3;i++)rod(body,'bone',[side*(1.12+i*.1),4.65+i*.3,-.4],[side*(1.8+i*.08),4.9+i*.36,-.5],.055,.005);}
 }else{
  for(const side of [-1,1]){const leg=joint(side*.8,1.9,0);legs.push(leg);box(leg,'dark',0,-.6,0,.68,1.25,.8);box(leg,'iron',side*.13,-1.3,.16,1,.75,1.3);for(let i=0;i<3;i++)box(leg,'rust',0,-.2-i*.4,.45,.73,.13,.13);}
  box(body,'iron',0,3.1,0,2.1,2.55,1.55);box(body,'dark',0,3.05,.84,1.65,1.6,.13);box(body,'glow',0,3.05,.92,1.28,1.38,.08);for(const side of [-1,1]){const door=joint(side*.88,3.05,.99);doors.push(door);box(door,'iron',-side*.43,0,0,.86,1.65,.16);for(let i=0;i<6;i++)box(door,'rust',-side*.43,-.64+i*.25,.1,.77,.075,.065);for(const y of [-.55,.55])orb(door,'bone',-.05*side,y,.13,.065);const arm=joint(side*1.3,3.6,0);arms.push(arm);orb(arm,'iron',0,0,0,.52,.58,.5);rod(arm,'rust',[0,0,0],[side*.28,-1.3,.35],.24);box(arm,'iron',side*.28,-1.5,.35,.7,.65,.7);for(let i=0;i<3;i++)rod(body,'rust',[side*1.02,2+i*.4,0],[side*1.1,4.2,-.3],.055);}
  box(body,'iron',0,4.5,0,1.25,.5,1.1);for(const side of [-1,1]){mesh(body,new T.CylinderGeometry(.24,.29,1.45,12,1,true),'rust',side*.69,5,-.36);hoop(body,'bone',side*.69,5.72,-.36,.25,.05).rotation.x=Math.PI/2;orb(body,'glow',side*.69,5.6,-.36,.16,.07,.16);}box(body,'dark',0,4.55,.6,.7,.2,.1);for(const x of [-.19,.19])box(body,'glow',x,4.55,.67,.12,.055,.03);for(let i=0;i<5;i++)box(body,'rust',0,2.03+i*.45,-.82,1.85,.12,.12);
 }

 // Small structural details catch the raking street light without turning into floating particles.
 if(kind==='cinder'){
  for(const side of [-1,1]){mesh(body,new T.CylinderGeometry(.35,.35,1.8,12),'iron',side*1.02,3.15,-.38);for(let i=0;i<5;i++)hoop(body,'rust',side*1.02,2.4+i*.36,-.38,.36,.045).rotation.x=Math.PI/2;for(let i=0;i<7;i++)orb(body,'bone',side*.99,2+i*.34,.82,.035);rod(body,'rust',[side*.72,4.1,.32],[side*.72,4.7,-.3],.1);for(let i=0;i<4;i++)box(body,'rust',side*.84,4.05+i*.19,-.8,.18,.07,.1);}
  for(let i=0;i<6;i++)box(body,'rust',-.76+i*.3,1.97,.89,.22,.14,.09);
 }
 if(profile.height>9&&kind==='warden'){for(const side of [-1,1])for(let i=0;i<5;i++){const shard=mesh(body,new T.ConeGeometry(.15,.85+i*.12,5),'bone',side*(.8+i*.13),4.15+i*.05,-.12);shard.rotation.z=-side*(.45+i*.13);}}
 if(profile.name==='THE FEN KING'){for(const side of [-1,1]){rod(body,'bark',[side*.9,4.1,0],[side*1.4,5.9,-.2],.15,.01);for(let i=0;i<3;i++)rod(body,'bone',[side*(1+i*.1),4.6+i*.3,-.1],[side*(1.7+i*.13),4.9+i*.3,-.2],.065,.01);}mats.iron.color.setHex(0x384e46);mats.rust.color.setHex(0x697d62);}
 root.scale.setScalar(profile.height/6);
 if(surfaces){for(const [key,material]of Object.entries(mats)){if(key==='glow')continue;const kind=key==='bark'?'bark':['iron','rust'].includes(key)?'metal':'plaster',maps=surfaces.textures(kind);material.map=maps.albedo;material.bumpMap=maps.relief;material.bumpScale=SURFACES[kind].bump;material.roughnessMap=maps.relief;}root.traverse(m=>{if(m.isMesh&&m.material!==mats.glow){const old=m.geometry;surfaceUV(m,1.8);old.dispose();}});}
 root.userData={boss:true,visualRevision:3,body,legs,arms,petals,doors,chains,mats,height:profile.height};batchBoss(body);return root;
}
export function animateBossModel(root,e,time){
 const u=root.userData,phase=e.bossPhase===2,opening=phase?(e.bossState==='transition'?1-e.bossTimer/e.bossDuration:1):0,walk=e.bossState==='pursuit',wind=e.bossState==='telegraph'?1-e.bossTimer/e.bossDuration:0,strike=e.bossState==='strike',recover=e.bossState==='recovery';
 const breathing=Math.sin(time*1.7)*.025,attack=strike?Math.sin(Math.min(1,1-e.bossTimer/e.bossDuration)*Math.PI):0;
 u.body.position.y=breathing+(walk?Math.abs(Math.sin(time*3))*.07:0)-(recover?.14:0);u.body.rotation.x=-wind*.12+attack*.18+(recover?.08:0);u.body.rotation.z=walk?Math.sin(time*3)*.035:0;
 u.legs.forEach((l,i)=>{l.rotation.x=walk?Math.sin(time*3+i*Math.PI)*.2:0;});u.arms.forEach((a,i)=>{a.rotation.x=-wind*(e.bossKind==='dredger'?.25:.85)+attack*.7+(walk?Math.sin(time*3+i*Math.PI)*.12:0);a.rotation.z=(e.bossKind==='warden'?(i?-.18:.4)*opening:0);});
 u.petals.forEach((g,i)=>{g.rotation.x=(.1+.85*opening)+Math.sin(time*1.4+i)*.04+wind*.2-attack*.2;});u.doors.forEach((g,i)=>{g.rotation.y=(i?1:-1)*(.14+opening*1.01+wind*.25*(1-opening));});u.chains.forEach((g,i)=>{g.rotation.z=Math.sin(time*1.5+i)*.1+wind*(i?.25:-.25);g.rotation.x=attack*.7;});if(e.bossKind==='dredger'){u.arms[0].position.y=4.6-opening*.75;u.arms[0].rotation.z=Math.sin(time*1.4)*(phase?.2:.06);}if(e.bossKind==='warden')u.arms[0].rotation.y=-.65*opening;u.mats.glow.emissiveIntensity=(phase?.65:.35)+wind*.45+(recover?.2:0);u.mats.glow.color.setHex(recover?0xa8e4ce:e.bossProfile.color);if(e.flash>0)u.mats.bone.emissive.setHex(0x483e2b);else u.mats.bone.emissive.setHex(0);
}
export function bossWarning(h){
 const g=new T.Group(),material=new T.MeshBasicMaterial({color:0xec795a,transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide});
 const add=(geo,opacity=1)=>{const m=new T.Mesh(geo,material.clone());m.material.opacity*=opacity;m.rotation.x=-Math.PI/2;g.add(m);return m;};
 if(h.shape==='lane'){add(new T.PlaneGeometry(h.width,h.length),.2);for(const x of [-h.width/2,h.width/2]){const m=add(new T.PlaneGeometry(.06,h.length));m.position.x=x;}for(let z=-h.length/2;z<h.length/2;z+=1.2){const m=add(new T.PlaneGeometry(h.width,.065),.65);m.position.z=z;}g.rotation.y=h.angle;}
 else{add(new T.RingGeometry(h.innerRadius||0,h.radius,64),.18);add(new T.RingGeometry(h.radius-.075,h.radius,64));if(h.innerRadius)add(new T.RingGeometry(h.innerRadius,h.innerRadius+.075,64));for(let i=0;i<8;i++){const a=i*Math.PI/4,m=add(new T.PlaneGeometry(.065,.55));m.position.set(Math.sin(a)*(h.radius-.3),.005,Math.cos(a)*(h.radius-.3));m.rotation.z=-a;}}
 material.dispose();g.position.set(h.x,.055,h.z);return g;
}
export function animateBossWarning(g,h){const progress=1-Math.max(0,h.timer)/h.duration;g.children.forEach((m,i)=>{m.material.opacity=(i===0?.1:.45)+progress*(i===0?.12:.5);});}

function batchBoss(group){
 for(const child of [...group.children])if(child.isGroup)batchBoss(child);
 const materials=new Map();for(const child of group.children)if(child.isMesh){const list=materials.get(child.material)||[];list.push(child);materials.set(child.material,list);}
 for(const [material,parts]of materials){if(parts.length<2)continue;const geometries=parts.map(p=>{p.updateMatrix();const g=p.geometry.clone().applyMatrix4(p.matrix);if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat;}),geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();if(!geometry)continue;const joined=new T.Mesh(geometry,material);joined.castShadow=joined.receiveShadow=true;group.add(joined);for(const p of parts){group.remove(p);p.geometry.dispose();}}
}
