import * as T from 'three';
import {WEAPON_FINISHES} from './Evolution.js';
import {WEAPON_MOTION} from './WeaponMotion.js';
const geometry=new Map(),materials=new Map();
function geo(key,make){if(!geometry.has(key)){const g=make();g.userData.shared=true;geometry.set(key,g);}return geometry.get(key);}
function mat(color,metalness=.75,roughness=.3,emission=0){const key=[color,metalness,roughness,emission].join('/');if(!materials.has(key)){const m=new T.MeshStandardMaterial({color,metalness,roughness,emissive:emission?color:0,emissiveIntensity:emission});m.userData.shared=true;materials.set(key,m);}return materials.get(key);}
export function createWeaponMesh(key,kit,tier=0){
 const f=WEAPON_FINISHES[key],g=new T.Group(),c=new T.Group();g.add(c);g.userData={key,tier,keepGroup:true};
 const steel=mat(f.steel),dark=mat(0x172124,.65,.3),body=mat(f.body,.5,.4),trim=mat(f.trim),rubber=mat(0x1d2525,.05,.9),hot=mat(f.accent,.5,.22,.8);
 const put=(parent,geometry,material,x,y,z,sx=1,sy=sx,sz=sx)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(p,m,x,y,z,w,h,d)=>put(p,geo('box',()=>new T.BoxGeometry(1,1,1)),m,x,y,z,w,h,d);
 const tube=(p,m,x,y,z,r,l)=>{const o=put(p,geo('tube',()=>new T.CylinderGeometry(1,1,1,12)),m,x,y,z,r,l,r);o.rotation.x=Math.PI/2;return o;};
 const ring=(p,m,x,y,z,r,thickness=.012)=>put(p,geo('ring',()=>new T.TorusGeometry(1,.12,5,16)),m,x,y,z,r,r,thickness/.12);
 const bolt=(p,x,y,z)=>tube(p,steel,x,y,z,.016,.014);
 const hose=(p,points,r=.025)=>{const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),o=new T.Mesh(new T.TubeGeometry(curve,16,r,6,false),rubber);p.add(o);};
 const chamfer=(p,m,w,h,l,z,y=.1)=>{const shape=new T.Shape(),q=.025;shape.moveTo(-w/2+q,-h/2);shape.lineTo(w/2-q,-h/2);shape.lineTo(w/2,-h/2+q);shape.lineTo(w/2,h/2-q);shape.lineTo(w/2-q,h/2);shape.lineTo(-w/2+q,h/2);shape.lineTo(-w/2,h/2-q);shape.lineTo(-w/2,-h/2+q);shape.closePath();const o=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:l,bevelEnabled:false}),m);o.position.set(0,y,z-l/2);o.castShadow=true;p.add(o);return o;};
 if(['axe','spear','hammer'].includes(key)){
  const length=key==='spear'?2.1:key==='axe'?1.23:1.12;
  tube(c,body,0,0,length*.38,.045,length*.95);tube(c,trim,0,0,-.12,.065,.13);
  for(let i=0;i<9;i++)ring(c,i%2?rubber:trim,0,0,-.08+i*.044,.05,.007);
  for(const z of [.34,length*.8])tube(c,steel,0,0,z,.06,.08);
  if(key==='spear'){
   const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(-.13,.2);shape.lineTo(0,.7);shape.lineTo(.13,.2);shape.closePath();const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.01,bevelThickness:.006,bevelSegments:1}),steel);blade.rotation.x=Math.PI/2;blade.position.z=length-.5;c.add(blade);box(c,trim,0,.018,length-.18,.022,.018,.55);
  }else if(key==='axe'){
   const shape=new T.Shape();shape.moveTo(-.04,-.2);shape.lineTo(.23,-.3);shape.quadraticCurveTo(.58,-.34,.63,.02);shape.lineTo(.52,.28);shape.lineTo(.16,.2);shape.lineTo(-.04,.13);shape.closePath();const edge=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.02,bevelThickness:.014,bevelSegments:1}),steel);edge.rotation.x=Math.PI/2;edge.position.z=length;edge.position.y=.035;c.add(edge);box(c,body,.14,.075,length,.22,.08,.27);bolt(c,.2,.13,length);
  }else{
   chamfer(c,steel,.65,.28,.32,length,0);for(const x of [-.34,.34])box(c,body,x,0,length,.08,.34,.38);box(c,trim,0,.15,length,.2,.04,.3);for(const x of [-.2,.2])bolt(c,x,.17,length);
  }
  if(tier>=1)for(const z of [.36,.45,.54])tube(c,trim,0,0,z,.062,.035);
  if(tier>=2)for(const x of [-.09,.09])box(c,steel,x,0,length-.22,.04,.1,.32);
  if(tier===3){for(let i=0;i<7;i++)ring(c,hot,0,0,.55+i*.08,.058,.008);box(c,hot,key==='axe'?.4:0,.16,length,.09,.018,.25);}
  g.userData.tip=new T.Vector3(key==='axe'?.54:0,0,length+(key==='spear'?.2:.18));g.userData.support=new T.Vector3(0,0,-.10);
 }else if(key==='katana'||key==='dual'){
  const len=key==='dual'?1.08:1.48,width=key==='dual'?.075:.055;
  tube(c,rubber,0,0,.02,.055,.3);for(let i=0;i<7;i++){const wrap=box(c,i%2?trim:body,0,.044,-.1+i*.035,.082,.013,.022);wrap.rotation.y=i%2?.4:-.4;}
  const guard=ring(c,trim,0,0,.2,key==='dual'?.11:.13,.02);guard.scale.y*=key==='dual'?.6:1;
  const shape=new T.Shape();shape.moveTo(-width,.23);shape.lineTo(width*.4,.23);shape.quadraticCurveTo(width*.55,len*.65,.14,len);shape.lineTo(.11,len+.18);shape.quadraticCurveTo(-.025,len*.64,-width,.23);
  const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.006,bevelThickness:.003,bevelSegments:1,steps:1}),steel);blade.rotation.x=Math.PI/2;blade.position.y=.009;c.add(blade);
  // A narrow ground edge and segmented temper line remain visible under moving light.
  for(let i=0;i<9;i++){const z=.3+i*(len-.3)/9,x=-.01+.11*(z/len)**2;box(c,i%2?trim:steel,x,.022,z,.012,.006,.065);}
  if(tier>=1){tube(c,trim,0,0,-.14,.07,.05);for(const side of [-1,1])box(c,body,side*.13,0,.2,.1,.045,.08);}
  if(tier>=2){for(let i=0;i<6;i++)box(c,trim,-.038,.026,.4+i*.12,.026,.008,.035);hose(c,[[0,0,-.16],[.14,-.1,-.24],[.04,-.22,-.19]],.015);}
  if(tier===3){for(let i=0;i<8;i++)box(c,hot,.007+.09*(i/8)**2,.026,.35+i*(len-.35)/8,.013,.008,.1);ring(c,hot,0,0,.205,.085,.007);}
  g.userData.tip=new T.Vector3(.11,0,len+.18);g.userData.support=new T.Vector3(0,0,-.10);
 }else{
  const p=WEAPON_MOTION[key],heavy=['flame','launcher','arc'].includes(key),length=p.length;
  chamfer(c,body,key==='launcher'?.27:key==='flame'?.23:.17,key==='launcher'?.27:.2,key==='smg'?.33:.42,.18);
  const grip=box(c,rubber,0,-.05,0,.105,.25,.14);grip.rotation.x=-.18;
  for(let i=0;i<5;i++)box(c,dark,0,-.13+i*.033,-.076,.108,.011,.011);
  const trigger=new T.Group();c.add(trigger);for(const x of [-.06,.06])box(trigger,steel,x,-.09,.115,.014,.12,.13);box(trigger,steel,0,-.15,.11,.12,.018,.14);box(trigger,dark,0,-.06,.1,.022,.09,.02);
  tube(c,dark,0,.12,(length+.32)/2,key==='launcher'?.115:.041,length-.32);
  tube(c,steel,0,.12,length,key==='launcher'?.14:key==='flame'?.09:.056,.085);tube(c,dark,0,.12,length+.044,key==='launcher'?.11:.035,.006);
  const magazine=new T.Group(),action=new T.Group(),rotor=new T.Group();magazine.position.set(0,-.05,.19);g.add(magazine,action,rotor);g.userData.magazine=magazine;g.userData.magazineBase=magazine.position.clone();g.userData.action=action;g.userData.rotor=rotor;
  const stock=()=>{const butt=new T.Group();butt.userData={keepGroup:true,hideFirstPerson:true};c.add(butt);box(butt,body,0,.105,-.22,.13,.17,.31);box(butt,rubber,0,.095,-.39,.17,.24,.055);box(butt,steel,0,.14,-.095,.07,.055,.15);kit.batch(butt,butt);};
  if(!['revolver','smg','launcher'].includes(key))stock();
  if(key==='carbine'){
   chamfer(c,body,.18,.17,.27,.46);for(let i=0;i<5;i++){box(c,dark,.094,.12,.36+i*.04,.008,.075,.024);box(c,steel,0,.22,.02+i*.09,.15,.025,.033);}
   const mag=box(magazine,dark,0,-.11,0,.11,.27,.17);mag.rotation.x=-.16;for(let i=0;i<3;i++)box(magazine,steel,.057,-.18+i*.065,0,.01,.013,.12);
   box(action,steel,.099,.14,.18,.027,.06,.13);
  }else if(key==='shotgun'){
   tube(c,steel,0,.02,.55,.048,.63);box(c,body,0,.1,-.16,.15,.19,.23);
   chamfer(action,body,.205,.15,.29,.54,.015);for(let i=0;i<6;i++)box(action,dark,0,.099,.43+i*.04,.21,.015,.013);
   tube(magazine,trim,0,.1,0,.044,.16);for(let i=0;i<4;i++){const shell=tube(c,body,-.105,.08,.02+i*.065,.026,.055);shell.rotation.y=Math.PI/2;}
  }else if(key==='smg'){
   box(c,steel,0,.21,.13,.16,.035,.31);tube(c,dark,0,.12,.47,.065,.2);box(magazine,body,0,-.12,0,.095,.3,.13);for(let i=0;i<4;i++)box(magazine,dark,.05,-.21+i*.05,0,.008,.018,.1);
   for(const side of [-1,1])box(c,steel,side*.085,.15,-.18,.024,.032,.3);box(c,rubber,0,.08,-.32,.18,.18,.034);box(action,steel,0,.24,.13,.038,.036,.09);
  }else if(key==='revolver'){
   // Cylinder rolls around the barrel axis; chambers and flutes remain individual.
   magazine.position.set(0,.12,.19);tube(magazine,steel,0,0,0,.115,.21);for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(magazine,dark,Math.cos(a)*.083,Math.sin(a)*.083,.112,.025,.009);tube(magazine,trim,Math.cos(a)*.083,Math.sin(a)*.083,-.113,.021,.01);}
   box(c,body,0,-.09,-.055,.125,.23,.14);box(c,trim,0,.245,.21,.08,.03,.32);box(action,steel,0,.225,-.015,.04,.08,.04);g.userData.support=new T.Vector3(-.075,-.025,.015);
  }else if(key==='marksman'){
   tube(c,dark,0,.31,.23,.065,.4);ring(c,steel,0,.31,.027,.065,.012);tube(c,mat(0x547a87,.75,.09),0,.31,.024,.052,.004);tube(c,steel,0,.31,.46,.085,.08);tube(c,mat(0x567c77,.8,.08),0,.31,.504,.064,.006);for(const z of [.1,.31])box(c,steel,0,.235,z,.055,.07,.06);
   box(magazine,dark,0,-.08,0,.12,.18,.16);tube(action,steel,.13,.15,.16,.019,.16);box(action,trim,.14,.13,.1,.035,.1,.035);
   for(const side of [-1,1]){const leg=box(c,steel,side*.068,.03,.65,.025,.025,.39);leg.rotation.y=side*.17;}
  }else if(key==='flame'){
   for(const x of [-.16,.16]){tube(c,body,x,.11,.13,.105,.4);tube(c,trim,x,.11,-.09,.07,.04);ring(c,steel,x,.11,.21,.108,.015);}hose(c,[[-.17,.02,-.08],[-.24,-.15,.16],[-.11,.02,.56]]);
   for(let i=0;i<5;i++)ring(c,steel,0,.12,.48+i*.065,.085,.017);tube(magazine,trim,0,-.06,0,.07,.2);tube(action,trim,.1,.19,.29,.035,.06);tube(c,hot,0,.12,length+.05,.04,.035);
  }else if(key==='launcher'){
   tube(c,body,0,.12,.56,.145,.5);for(let i=0;i<4;i++)ring(c,dark,0,.12,.36+i*.11,.148,.019);
   tube(magazine,body,0,-.025,0,.2,.24);for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(magazine,trim,Math.cos(a)*.15,-.025+Math.sin(a)*.15,.127,.036,.015);}
   box(action,trim,0,.29,.31,.16,.06,.2);box(c,rubber,0,.12,-.15,.12,.18,.22);
  }else if(key==='arc'){
   for(let i=0;i<5;i++)tube(rotor,trim,0,.12,.31+i*.08,.105,.027);
   for(const x of [-.105,.105]){tube(c,steel,x,.12,.66,.035,.3);tube(c,hot,x,.12,.815,.024,.035);}
   box(magazine,body,0,-.09,0,.16,.2,.16);for(let i=0;i<3;i++)box(magazine,hot,0,-.15+i*.055,.085,.105,.015,.01);hose(c,[[.1,.16,.08],[.2,.25,.2],[.12,.16,.4]],.017);box(action,steel,0,.25,.23,.14,.035,.12);
  }
  if(!['marksman','flame','arc'].includes(key)){box(c,steel,0,.24,.035,.065,.055,.075);box(c,trim,0,.22,length-.075,.025,.075,.025);}
  // Exposed screws, receiver inlays and asymmetric selector marks give each finish scale.
  for(const side of [-1,1]){for(const z of [.04,.29]){const b=bolt(c,side*.091,.16,z);b.rotation.y=Math.PI/2;}box(c,trim,side*.091,.06,.24,.008,.035,.09);}
  if(tier>=1){
   if(!heavy){tube(c,body,0,.12,length+.04,.075,.12);for(const x of [-.073,.073])box(c,dark,x,.12,length+.04,.012,.055,.056);}
   else for(const x of [-.13,.13])box(c,trim,x,.2,.43,.045,.06,.22);
   for(let i=0;i<3;i++)box(c,trim,.1,.13,.1+i*.035,.009,.055,.014);
  }
  if(tier>=2){
   if(key==='carbine'||key==='smg'){box(c,body,0,.26,.13,.12,.09,.18);box(c,mat(0x687e74,.7,.08),0,.26,.225,.08,.055,.009);}
   else if(key==='shotgun'){for(let i=0;i<5;i++)ring(c,steel,0,.12,.56+i*.07,.078,.01);}
   else if(key==='revolver'){box(c,trim,0,.19,.42,.075,.08,.24);}
   else if(key==='marksman'){for(const x of [-.065,.065])box(c,body,x,.13,.68,.045,.1,.45);}
   else{for(const x of [-.19,.19]){tube(c,steel,x,.12,.19,.055,.28);tube(c,key==='arc'?hot:trim,x,.12,.345,.042,.025);}}
  }
  if(tier===3){
   const energy=['arc','flame','marksman'].includes(key);for(const side of [-1,1]){box(c,body,side*(heavy?.17:.12),.12,.3,.06,.16,.26);for(let i=0;i<4;i++)box(c,energy?hot:trim,side*(heavy?.203:.153),.14,.2+i*.05,.009,.025,.026);}
   if(key==='launcher'){for(let i=0;i<3;i++)tube(c,trim,Math.sin(i*2.094)*.17,.12+Math.cos(i*2.094)*.17,.68,.034,.25);}
   else if(key==='flame'||key==='arc'){for(let i=0;i<3;i++)ring(c,hot,0,.12,.5+i*.08,.115,.008);}
   else tube(c,trim,0,.12,length+.055,key==='shotgun'?.09:.073,.09);
  }
  g.userData.magazineBase=magazine.position.clone();g.userData.support??=new T.Vector3(-.14,-.025,p.support);g.userData.tip=new T.Vector3(0,.12,length+(tier?.11:.05));
 }
 kit.batch(c,c);return g;
}
