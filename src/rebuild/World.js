import {StructureVisuals} from './StructureVisuals.js';
import {CombatOverlay} from './CombatOverlay.js';
import {bloodDecal,bloodSpray,stepBlood,ageBlood} from './BloodFX.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {weaponShot,weaponImpact,projectileMesh,evolutionFX,cutWave,ejectCasing,plume} from './WeaponFX.js';
import {stepFragment,boxNormal,reflectVelocity} from './Ballistics.js';
import {buildVehicle,animateVehicle} from './VehicleVisuals.js';
import {animateWeapons,updateBladeTrails} from './WeaponRig.js';
import {CIVILIAN_COATS,characterVariant,detailCharacter} from './CharacterDetails.js';
import {dressBuilding,dressStreets,obscuresSurvivor} from './CityDetails.js';
import {waterAt,waterOutline,waterContains} from './City.js';
import {debris,materialFor,deathMotion,fragmentGeometry,grenadePosition} from './Effects.js';
import { generateMap, insideMap } from './Map.js';
import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COVER, seededRandom, clamp, POWERUPS, DISTRICTS, SKINS, WEAPONS, segmentBoxTime } from './config.js';

const matCache = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial({ color, roughness: .86, ...extra }));
  matCache.get(key).userData.shared=true;return matCache.get(key);
}
const boxGeo = new T.BoxGeometry(1, 1, 1), sphereGeo = new T.IcosahedronGeometry(1, 1);
function box(parent, color, x,y,z, w,h,d, extra) {
  const mesh = new T.Mesh(boxGeo, mat(color, extra)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent,color,x,y,z,sx,sy= sx,sz=sx) {
  const m=new T.Mesh(sphereGeo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;
}
function cylinder(parent,color,x,y,z,r,h,r2=r,segments=8) {
  const mesh = new T.Mesh(new T.CylinderGeometry(r2,r,h,segments),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function plane(parent,material,x,y,z,w,h,ground=false) {
  const m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.position.set(x,y,z);if(ground)m.rotation.x=-Math.PI/2;parent.add(m);return m;
}
function texture(w,h,draw) { const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex; }
const signCache=new Map();
function sign(parent,text,x,y,z,w,h,bg='#203c3d',fg='#e3d4aa') {
  const key=text+bg+fg;let material=signCache.get(key);
  if(!material){const tex=texture(768,128,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle=fg;c.lineWidth=3;c.strokeRect(9,9,W-18,H-18);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`bold ${text.length>20?38:52}px Georgia`;c.fillText(text,W/2,H/2,W-35);});material=new T.MeshStandardMaterial({map:tex,roughness:.9});material.userData.shared=true;signCache.set(key,material);}
  return plane(parent,material,x,y,z,w,h);
}
const asphaltTex=(district=0)=>texture(1024,1024,(c,W,H)=>{
  const rng=seededRandom(19);c.fillStyle=['#455257','#4b6168','#667059','#645950','#4c603e','#9ba8af','#b28c61','#526858'][district];c.fillRect(0,0,W,H);
  for(let i=0;i<75000;i++){const v=50+Math.floor(rng()*48);c.fillStyle=`rgba(${v},${v+9},${v+10},.25)`;c.fillRect(rng()*W,rng()*H,1+rng()*2,1+rng()*2);}
  if(district>=4){for(let i=0;i<130;i++){const x=rng()*W,y=rng()*H,r=20+rng()*130,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,district===5?'rgba(235,243,241,.22)':'rgba(36,42,22,.13)');g.addColorStop(1,'rgba(40,48,29,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}return;}
  c.strokeStyle='#303f43';c.lineWidth=1.6;
  for(let i=0;i<55;i++){let x=rng()*W,y=rng()*H;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=(rng()-.5)*80;y+=rng()*36;c.lineTo(x,y);}c.stroke();}
});
function contact(parent,x,z,w,d,opacity=.22){const m=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false});return plane(parent,m,x,.026,z,w,d,true);}
let shadowTexture;

export class World {
  constructor(canvas,settings,district=0,layout=generateMap(73,district)){
    this.feedback=new CombatOverlay(canvas);this.feedback.applySettings(settings);this.layout=layout;this.district=district;this.biome=DISTRICTS[district];
    this.fireClock={value:0};this.settings=settings;this.random=seededRandom(layout.mapSeed);this.canvas=canvas;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.localClippingEnabled=true;this.renderer.info.autoReset=false;this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1.15));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    this.scene=new T.Scene();this.scene.background=new T.Color(this.biome.sky);this.scene.fog=new T.FogExp2(this.biome.sky,.009);
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.reflectionTarget=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();this.scene.environment=this.reflectionTarget.texture;this.scene.environmentIntensity=.42;
    this.camera=new T.OrthographicCamera(-30,30,20,-20,.1,160);this.focus=new T.Vector3(0,0,0);this.shake=0;
    this.scene.add(new T.HemisphereLight(0xa9c6da,0x323d32,1.45));
    const sun=new T.DirectionalLight(this.biome.accent,2.5);sun.position.set(-18,32,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:35,bottom:-35,near:1,far:100});sun.shadow.bias=-.001;sun.shadow.normalBias=.04;this.scene.add(sun);this.sun=sun;this.scene.add(sun.target);
    const rim=new T.DirectionalLight(0x7ea9b8,1.1);rim.position.set(15,12,-24);this.scene.add(rim);
    shadowTexture=texture(64,64,(c,W,H)=>{const g=c.createRadialGradient(32,32,1,32,32,32);g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});
    this.static=new T.Group();this.scene.add(this.static);this.characters=new Map();this.projectiles=new Map();this.items=new Map();this.grenades=new Map();this.streetJobs=new Map();this.rings=new Map();this.effects=[];this.corpses=[];this.decals=[];this.wrecks=[];this.propMeshes=new Map();this.buildingMeshes=new Map();this.impacts=[];
    this.structuralVisuals=new StructureVisuals(this.scene);this.fountainJets=[];this.waterMeshes=[];this.buildStreet();this.trimToMap();this.collectBuildings();this.batchStatic();for(const [id,g] of this.propMeshes)if(!this.layout.cover[Number(id.split('-')[1])]?.driveable)this.batchStatic(g,g);for(const g of this.buildingMeshes.values())this.batchStatic(g,g);this.buildParticles();this.bloodGroundTargets=this.scene.children.filter(o=>o.isMesh&&!o.material.transparent);this.player=this.character('player');this.scene.add(this.player);
    this.playerRing=this.ring(.68,0xe9d5a0,.06);this.scene.add(this.playerRing);
    this.extractionRing=this.ring(2.9,0xa4e2bd,.08);this.extractionRing.position.set(0,.07,-10);this.extractionRing.visible=false;this.scene.add(this.extractionRing);
    this.bossTell=this.ring(1.9,0xef8051,.1);this.scene.add(this.bossTell);this.bossTell.visible=false;
    this.aimRing=this.ring(.25,0xffe0a1,.035);this.scene.add(this.aimRing);this.aimRing.visible=false;
    this.composer=new EffectComposer(this.renderer);this.composer.renderTarget1.samples=4;this.composer.renderTarget2.samples=4;this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.ao=new SSAOPass(this.scene,this.camera,innerWidth,innerHeight,12);this.ao.kernelRadius=.65;this.ao.minDistance=.001;this.ao.maxDistance=.035;this.ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA=0;this.composer.addPass(this.ao);this.composer.addPass(new OutputPass());
    const hideForAO=this.ao.overrideVisibility.bind(this.ao);this.ao.overrideVisibility=()=>{hideForAO();this.scene.traverse(o=>{if(o.isSprite||(o.isMesh&&o.material?.transparent))o.visible=false;});};
    this.blastLights=Array.from({length:3},()=>{const l=new T.PointLight(0xff9d42,0,17,2);this.scene.add(l);l.userData.life=0;return l;});
    this.cityLights=this.layout.city?Array.from({length:4},()=>{const l=new T.PointLight(0xffb65c,0,12,2);this.scene.add(l);return l;}):[];
    this.muzzleLight=new T.PointLight(0xffad55,0,5,2);this.scene.add(this.muzzleLight);
    this.raycaster=new T.Raycaster();this.groundPlane=new T.Plane(new T.Vector3(0,1,0),0);this.resize();
  }
  buildStreet() {
    if(this.layout.city){this.buildCity();this.buildProps();return;}
    const g=this.static,rng=this.random;
    const polygon=this.layout.boundary||[{x:-28,z:-21},{x:28,z:-21},{x:28,z:21},{x:-28,z:21}];
    const shape=new T.Shape(polygon.map(p=>new T.Vector2(p.x,-p.z)));
    const foundation=new T.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:false});foundation.translate(0,0,-1.8);foundation.rotateX(-Math.PI/2);
    const base=new T.Mesh(foundation,mat(this.district===5?0x5e6871:0x3c4537));g.add(base);base.receiveShadow=true;
    const asphalt=asphaltTex(this.district);asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(.065,.065);
    const floor=new T.ShapeGeometry(shape);floor.rotateX(-Math.PI/2);const road=new T.Mesh(floor,new T.MeshStandardMaterial({map:asphalt,roughness:this.district===1?.55:.94}));road.position.y=.005;road.receiveShadow=true;g.add(road);
    const nature=this.district>=4;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],len=Math.hypot(a.x-b.x,a.z-b.z),angle=Math.atan2(b.x-a.x,b.z-a.z);
      for(let d=.6;d<len;d+=1.25){const t=d/len,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        if(nature){const rock=sphere(g,this.district===5?0xa0aab0:this.district===6?0x987451:0x495842,x,-.35,z,.65,.7+rng()*.5,.65);rock.userData.boundary=true;}
        else{const curb=box(g,0x9ca18e,x,.16,z,.3,.32,1.1);curb.rotation.y=angle;curb.userData.boundary=true;}
      }
    }
    if([1,7].includes(this.district)){const water=plane(g,new T.MeshStandardMaterial({color:this.district===7?0x293f36:0x294c58,roughness:.32,metalness:.35}),0,-1.85,0,180,180,true);water.userData.boundary=true;}
    if(this.district===2){for(const vertical of [false,true]){for(let t=-28;t<29;t+=2){const x=vertical?this.layout.road.x:t,z=vertical?t:this.layout.road.z;if(insideMap(this.layout,x,z,4)){const path=box(g,0x989179,x,.012,z,vertical?6:2,.015,vertical?2:6);path.receiveShadow=true;}}}}
    if(!nature){
    for(let x=-26;x<27;x+=4)for(const z of [this.layout.road.z-3,this.layout.road.z+3])box(g,0xa2a591,x,.018,z,1.8,.02,.13);
    for(let z=-19;z<20;z+=4)for(const x of [this.layout.road.x-3,this.layout.road.x+3])box(g,0x9a9d88,x,.019,z,.13,.02,1.8);
    for(let i=0;i<7;i++){box(g,0xb5b6a3,-17+i*.6,.021,-10.5,.34,.025,4);box(g,0xa8ae9d,17-i*.6,.021,10.5,.34,.025,4);}
    for(const x of [-7,7])for(const z of [-13,13]){box(g,0x344449,x,.025,z,1.2,.04,.65);for(let i=0;i<7;i++)box(g,0x18282b,x-.48+i*.16,.05,z,.06,.025,.52);}
    const mark=sign(g,`ZONE / ${String(this.layout.mapSeed%100).padStart(2,'0')}`,0,.03,4.5,5,.9,'#455257','#899286');mark.rotation.x=-Math.PI/2;
    }
    // Boundary-aligned facades with independent structural damage.
    if(this.district===0){
    for(const f of this.layout.facades){const block=new T.Group();block.position.set(f.x,0,f.z);block.rotation.y=f.angle||0;g.add(block);this.building(0,0,f.w,f.h,f.color,f.shop,f.trim,block);}
    }else if(this.district<4)this.buildBiome();else this.buildWilderness();
    this.buildProps();

    if(nature){this.scatterNature();return;}
    // Cafe terrace, baggage and evacuation fences.
    for(const x of [-12,-8]){cylinder(g,0x3c514c,x,.7,-17, .65,.12);cylinder(g,0x252f31,x,.34,-17,.08,.7);for(const d of [-1,1]){box(g,0x5d7165,x+d*.95,.43,-17,.48,.1,.5);box(g,0x5d7165,x+d*.95,.76,-17.22,.5,.55,.08);for(const a of [-.18,.18])box(g,0x303c36,x+d*.95+a,.2,-17,.04,.4,.4);}}
    for(const [x,z] of [[-27,-18],[27,-18],[-27,18],[27,18],[-19,-13],[19,12]])this.lamp(x,z);

    for(let x=-27;x<29;x+=5){if(Math.abs(x)<5)continue;box(g,0x53645c,x,1,23,.12,2,.12);box(g,0x5c6e63,x,1.8,23,5,.06,.06);box(g,0x46584f,x,.65,23,5,.06,.06);for(let k=0;k<10;k++)box(g,0x637469,x-2.4+k*.5,1.1,23,.035,1.6,.035);}
    for(const [x,z] of [[-13,-14],[7,-14],[18,13],[-18,5]]){cylinder(g,0x495e52,x,.5,z,.36,1);cylinder(g,0x263c33,x,1.02,z,.4,.1);}
    for(let i=0;i<85;i++){const x=rng()*39-19.5,z=rng()*29-14.5;const debris=box(g,i%4===0?0xaaa08a:0x626b61,x,.04,z,.08+rng()*.3,.06,.08+rng()*.26);debris.rotation.y=rng()*Math.PI;}
    for(let i=0;i<20;i++){const x=rng()*37-18.5,z=rng()*28-14;const paper=box(g,0xa1a391,x,.029,z,.18,.018,.3);paper.rotation.y=rng()*6;}
    // Damp patches: subtle specular areas, not giant neon reflections.
    for(let i=0;i<(this.district===2?4:16);i++){const x=rng()*36-18,z=rng()*26-13;const puddle=new T.Mesh(new T.CircleGeometry(.6+rng(),14),new T.MeshStandardMaterial({color:0x607b7c,roughness:.22,metalness:.5,transparent:true,opacity:.3,depthWrite:false}));puddle.rotation.x=-Math.PI/2;puddle.position.set(x,.022,z);puddle.scale.x=2;g.add(puddle);}
    for(const [x,z] of [[-4,-14.3],[14,11.8],[-14,6]]){
      for(let row=0;row<2;row++)for(let i=0;i<4;i++){const sack=sphere(g,0x8b8966,x+i*.5+(row%2)*.2,.16+row*.24,z,.32,.18,.22);sack.rotation.y=.1;}
    }
    for(const [x,z] of [[-21,-12],[20,8]]){box(g,0x344848,x,.65,z,.75,1.3,.6);sign(g,'ÉVACUATION',x,1.48,z+.34,1.4,.5,'#9caa94','#2b4541');}
    // A stalled bicycle against the pharmacy wall.
    for(const x of [-18,-16.8]){const wheel=new T.Mesh(new T.TorusGeometry(.43,.045,6,16),mat(0x2d3d3d));wheel.position.set(x,.48,-17);g.add(wheel);}
    const frame=box(g,0x816c49,-17.4,.73,-17,1.2,.07,.08);frame.rotation.z=.3;
    box(g,0x334340,-17.5,1.02,-17,.35,.07,.22);box(g,0x536960,-16.9,.95,-17,.06,.75,.06);
    // Exit vehicle and evacuation marker beyond the playable curb.
    this.car({x:5,z:24.8,w:4.3,d:2,rotation:0,color:0xc5baa0},true);
    sign(g,'QUARANTAINE  /  ACCÈS INTERDIT',-3,1.2,-15.7,5.5,.7,'#bbb18a','#333d39');
    for(const x of [-6,0])box(g,0x53665c,x,.65,-15.72,.12,1.3,.12);
    contact(g,0,0,45,34,.035);
  }
  buildProps(){const g=this.static,rng=this.random;
    for(const [index,o]of this.layout.cover.entries()){
      const old=this.static,group=new T.Group();this.scene.add(group);this.static=group;this.propMeshes.set(`prop-${index}`,group);
      if(o.kind==='car')this.car(o);else if(o.kind==='barrier')this.barrier(o);else if(o.kind==='planter'){if(this.district>=4||o.wild)this.wildTree(o.x,o.z);else this.tree(o.x,o.z);}else if(o.kind==='rock'){const rock=sphere(group,this.district===6?0x967553:0x718080,o.x,.85,o.z,1.3,1.3,1.3);rock.rotation.y=rng()*6;contact(group,o.x,o.z,3.5,3.5,.4);}else if(o.kind==='barrel'){
        cylinder(group,0x89462f,o.x,.55,o.z,.43,1.1,.43,16);for(const y of [.15,.85])cylinder(group,0x4b4940,o.x,y,o.z,.455,.075,.455,16);
        cylinder(group,0x694333,o.x,1.12,o.z,.42,.04,.42,16);box(group,0xd5b783,o.x,.6,o.z+.431,.35,.35,.018);box(group,0x703b2c,o.x,.6,o.z+.45,.1,.26,.018);contact(group,o.x,o.z,1.7,1.7,.4);
      }else{box(group,0x736b4f,o.x,.6,o.z,o.w,1.2,o.d);for(const z of [-.9,.9])box(group,0x444838,o.x,.65,o.z+z,o.w+.04,1.3,.13);sign(group,'SUPPLIES',o.x,.75,o.z+o.d/2+.01,o.w*.8,.32,'#948461','#293e3b');}
      if(o.kind==='planter'){this.foliageMaterials??=new Map();group.traverse(m=>{if(!m.isMesh||m.position.y<2.6||m.geometry.type!=='IcosahedronGeometry')return;const original=m.material;let leaf=this.foliageMaterials.get(original.uuid);if(!leaf){leaf=original.clone();leaf.userData.shared=false;leaf.onBeforeCompile=shader=>{shader.uniforms.windTime=this.fireClock;shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(position.x*.7+position.z*.4+windTime*1.3)*.06*max(0.,position.y-2.); transformed.z+=cos(position.z*.8+windTime)*.025*max(0.,position.y-2.);');};this.foliageMaterials.set(original.uuid,leaf);}m.material=leaf;});}
      this.static=old;
    }
  }
  buildCity(){
    const g=this.static,b=this.layout.bounds,r=this.random;
    const asphalt=asphaltTex(0);asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(.065,.065);
    const ground=new T.Shape(this.layout.boundary.map(p=>new T.Vector2(p.x,-p.z)));for(const w of this.layout.water){const hole=new T.Path(waterOutline(w).map(p=>new T.Vector2(p.x,-p.z)));hole.closePath();ground.holes.push(hole);}const geo=new T.ShapeGeometry(ground);geo.rotateX(-Math.PI/2);const floor=new T.Mesh(geo,new T.MeshStandardMaterial({map:asphalt,color:0x939c7f,roughness:.98}));floor.position.y=-.04;floor.receiveShadow=true;g.add(floor);
    for(const road of this.layout.roads){
      const dx=road.b.x-road.a.x,dz=road.b.z-road.a.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),cx=(road.a.x+road.b.x)/2,cz=(road.a.z+road.b.z)/2;
      const strip=box(g,0x39484b,cx,-.008,cz,road.width,.045,len);strip.rotation.y=angle;strip.receiveShadow=true;
      for(const p of[road.a,road.b])cylinder(g,0x39484b,p.x,-.008,p.z,road.width/2,.045,road.width/2,20);
      for(let d=3;d<len-2;d+=6){const x=road.a.x+dx*d/len,z=road.a.z+dz*d/len;if(waterAt(this.layout,x,z))continue;const dash=box(g,0xb5b59d,x,.025,z,.11,.012,2);dash.rotation.y=angle;}
    }
    for(const {x,z,park,w,d} of this.layout.parcels){
      let paving;
      if(park){const shape=new T.Shape([new T.Vector2(x-w/2,-z-d/2),new T.Vector2(x+w/2,-z-d/2),new T.Vector2(x+w/2,-z+d/2),new T.Vector2(x-w/2,-z+d/2)]);for(const lake of this.layout.water.filter(l=>l.x===x&&l.z===z))shape.holes.push(new T.Path(waterOutline(lake).map(p=>new T.Vector2(p.x,-p.z))));const geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);paving=new T.Mesh(geo,mat(0x63714c));paving.position.y=.14;g.add(paving);
       for(let i=0;i<65;i++){const gx=x+(r()-.5)*(w-1),gz=z+(r()-.5)*(d-1);if(this.layout.water.some(l=>waterContains({...l,w:l.w+1,d:l.d+1},gx,gz)))continue;const grass= new T.Mesh(new T.ConeGeometry(.12+r()*.18,.25+r()*.45,4),mat([0x708357,0x8d9461,0x4d6950][i%3]));grass.position.set(gx,.3,gz);grass.rotation.z=(r()-.5)*.4;g.add(grass);}
      }else paving=box(g,0x7c8278,x,.04,z,w,.18,d);paving.receiveShadow=true;
      for(const side of [-1,1]){box(g,0xa0a58e,x+side*w/2,.16,z,.25,.26,d);box(g,0xa0a58e,x,.16,z+side*d/2,w,.26,.25);}
      if(this.random()<.5)this.lamp(x-w/2,z-d/2);
    }
    dressStreets(this,{box,cylinder,sphere,sign,mat,plane,texture});
    for(const b of this.layout.buildings)this.cityBuilding(b);
    for(const rect of this.layout.water)this.waterSurface(rect);
    for(const bridge of this.layout.bridges){box(g,0x777f78,bridge.x,-.08,bridge.z,bridge.w,.16,bridge.d);for(const side of [-1,1]){box(g,0xa8ac98,bridge.x,.55,bridge.z+side*bridge.d/2,bridge.w,.15,.2);for(let x=-bridge.w/2;x<=bridge.w/2;x+=2)box(g,0x4d605f,bridge.x+x,.3,bridge.z+side*bridge.d/2,.12,.7,.12);}}
    for(const place of this.layout.landmarks){const marker=sign(g,place.name,place.x+7,.025,place.z+5,10,1.2,'#3b4c4d','#d5c5a2');marker.rotation.x=-Math.PI/2;}
  }
  cityBuilding(b){
    const g=new T.Group();g.position.set(b.x,0,b.z);g.userData.breakable=true;g.userData.glass=[];g.userData.sections=[];g.userData.material=b.material;g.userData.plan=b;this.static.add(g);this.buildingMeshes.set(b.id,g);
    const wallMaterial=this.wallMaterial(b.color);
    const wall=box(g,0x343d3b,0,b.h/2,0,b.w-.8,b.h,b.d-.8);wall.visible=false;g.userData.wall=wall;g.userData.depth=b.d;
    // Slabs and columns remain visible through damaged exterior panels.
    for(let y=.3;y<b.h;y+=2.8)box(g,0x535b54,0,y,0,b.w-.9,.2,b.d-.9);
    for(const x of [-b.w/2+.6,b.w/2-.6])for(const z of [-b.d/2+.6,b.d/2-.6])box(g,0x59615a,x,b.h/2,z,.45,b.h,.45);
    for(let side=0;side<4;side++){
      const front=side%2===0,width=front?b.w:b.d,depth=front?b.d:b.w,signSide=side<2?1:-1;
      const face=new T.Group();face.rotation.y=front?0:Math.PI/2;face.position.set(front?0:signSide*depth/2,0,front?signSide*depth/2:0);g.add(face);
      const bays=Math.max(2,Math.floor(width/2.7)),bay=width/bays;
      for(let y=1.3;y<b.h;y+=2.8)for(let i=0;i<bays;i++){const x=-width/2+bay*(i+.5);
        const section=box(face,b.color,x,y,0,bay-.04,2.65,.26);section.material=wallMaterial;section.userData.breakablePart=true;g.userData.sections.push(section);
        if(y>2){const pane=box(face,b.factory?0xc1955b:0x48626b,x,y,.18*signSide,1.05,1.35,.035);pane.userData.glass=true;g.userData.glass.push(pane);}
      }
    }
    const roof=box(g,0x3b4b52,0,b.h+.15,0,b.w+.3,.32,b.d+.3);roof.userData.breakablePart=true;g.userData.roof=roof;g.userData.sections.push(roof);
    box(g,0x65736c,-b.w*.2,b.h+.5,0,3,.7,2);if(b.factory)cylinder(g,0x7e7060,b.w*.25,b.h+2.5,0,.9,5);
    for(const side of [-1,1]){box(g,0xb4ac96,0,b.h-.18,side*(b.d/2+.16),b.w,.18,.35);box(g,0x5c6b60,side*(b.w/2-.3),b.h/2,b.d/2+.24,.09,b.h,.09);}
    for(let y=3;y<b.h;y+=2.8)box(g,0xb0aa94,0,y,b.d/2+.18,b.w,.12,.25);
    const canopy=box(g,0x4a685b,0,2.05,b.d/2+.65,b.w*.72,.14,1.1);canopy.rotation.x=.12;
    sign(g,b.shop,0,2.5,b.d/2+.22,b.w*.68,.75,b.factory?'#805e3c':'#395950');
    for(const z of [-1,1]){const pane=box(g,0x20373e,z*b.w*.23,1.15,b.d/2+.24,Math.min(2.6,b.w*.3),2,.04);pane.userData.glass=true;g.userData.glass.push(pane);}
    dressBuilding(this,g,b,{box,cylinder,sphere,sign,mat,texture});
    this.batchStatic(g.userData.roofAccessories,g.userData.roofAccessories);
    this.rebuildBuildingShell(g);
  }
  waterSurface(rect){
    const material=new T.MeshStandardMaterial({color:0x315e67,roughness:.24,metalness:.55,transparent:true,opacity:.97});
    material.onBeforeCompile=shader=>{shader.uniforms.waterTime=this.fireClock;shader.vertexShader='uniform float waterTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal.x-=cos(position.x*1.9+waterTime*1.8)*.12; objectNormal.z-=cos(position.z*.9-waterTime)*.09;');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += sin(position.x*1.9+waterTime*1.8)*.035+sin(position.z*.9-waterTime)*.04;');};
    const geo=rect.shape==='ellipse'?new T.CircleGeometry(1,48,0,Math.PI*2):new T.PlaneGeometry(rect.w,rect.d,12,90);if(rect.shape==='ellipse')geo.scale(rect.w/2,rect.d/2,1);geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,material);m.position.set(rect.x,-.2,rect.z);m.userData.boundary=true;this.static.add(m);this.waterMeshes.push(m);
    if(rect.shape!=='ellipse')for(const side of [-1,1]){const bank=box(this.static,0x5a6d67,rect.x+side*(rect.w/2+.2),-.35,rect.z,.5,1,rect.d);bank.userData.boundary=true;}
    if(rect.shape==='ellipse'){
      const points=waterOutline(rect);for(const [i,p]of points.entries()){const next=points[(i+1)%points.length],dx=next.x-p.x,dz=next.z-p.z;const edge=box(this.static,rect.feature==='fountain'?0xada995:0x777d64,(p.x+next.x)/2,.03,(p.z+next.z)/2,.36,rect.feature==='fountain'?.5:.24,Math.hypot(dx,dz)+.08);edge.rotation.y=Math.atan2(dx,dz);edge.userData.boundary=true;}
      if(rect.feature==='lake'){for(let i=0;i<34;i++){const a=i/34*Math.PI*2,rx=rect.x+Math.cos(a)*(rect.w/2+.3),rz=rect.z+Math.sin(a)*(rect.d/2+.3);if(i%3===0){const rock=sphere(this.static,0x7d8270,rx,.18,rz,.3+this.random()*.25,.22,.28);rock.rotation.y=a;}else for(let j=0;j<3;j++){const reed=cylinder(this.static,j%2?0x617346:0x7c8050,rx+(this.random()-.5)*.3,.35+this.random()*.15,rz+(this.random()-.5)*.3,.018,.7+this.random()*.4,.012,4);reed.rotation.z=(this.random()-.5)*.3;}}
       for(let i=0;i<13;i++){const a=this.random()*Math.PI*2,rr=.55+this.random()*.3;const pad=new T.Mesh(new T.CircleGeometry(.17+this.random()*.17,8,.25,Math.PI*1.85),mat(0x718451,{side:T.DoubleSide}));pad.rotation.x=-Math.PI/2;pad.position.set(rect.x+Math.cos(a)*rect.w/2*rr,-.09,rect.z+Math.sin(a)*rect.d/2*rr);this.static.add(pad);}}
      if(rect.feature==='fountain'){cylinder(this.static,0x929d8b,rect.x,.4,rect.z,.48,1.1,.7,12);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,points=[];for(let j=0;j<=20;j++){const t=j/20;points.push(new T.Vector3(rect.x+Math.cos(a)*t*1.7,.9+Math.sin(t*Math.PI)*1.4-t,rect.z+Math.sin(a)*t*1.7));}const jet=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.028,5,false),new T.MeshStandardMaterial({color:0xd2ebe4,transparent:true,opacity:.65,roughness:.1,metalness:.25}));this.scene.add(jet);this.fountainJets.push({mesh:jet,x:rect.x+Math.cos(a)*1.7,z:rect.z+Math.sin(a)*1.7,phase:a});}}
    }
    for(let i=0;i<(rect.shape==='ellipse'?15:60);i++){const px=rect.x+(this.random()-.5)*(rect.w-1),pz=rect.z+(this.random()-.5)*rect.d;if(!waterContains(rect,px,pz))continue;const line=plane(this.static,new T.MeshBasicMaterial({color:0xb4d0c5,transparent:true,opacity:.1,depthWrite:false}),px,-.12,pz,.2+this.random(),.035,true);line.userData.boundary=true;this.waterMeshes.push(line);}
  }
  waterLevel(){return this.layout.city?-.2:-1.85;}
  splash(x,z,power=1){
    const level=this.waterLevel();
    this.splashTimes??=new Map();const key=`${Math.floor(x)}:${Math.floor(z)}`,now=this.fireClock.value;if(power<2&&now-(this.splashTimes.get(key)??-1)<.1)return;this.splashTimes.set(key,now);if(this.splashTimes.size>300)this.splashTimes.delete(this.splashTimes.keys().next().value);
    for(let i=0;i<(power<2?1:2);i++){const ring=this.ring(.2+power*.13,0x83aaac,.025+i*.02);ring.position.set(x,level+.06,z);this.scene.add(ring);this.effects.push({mesh:ring,kind:'ripple',ripple:true,life:1.3+i*.5,max:1.3+i*.5,ring:true});}
    const count=Math.min(45,Math.ceil(3+power*5));for(let i=0;i<count;i++){const m=new T.Mesh(sphereGeo,mat(0xb9d3d1,{roughness:.14,metalness:.25})),a=this.random()*Math.PI*2,v=(.4+this.random())*power;m.scale.set(.025+this.random()*.06,.09+this.random()*.12,.03);m.position.set(x,level+.08,z);this.scene.add(m);this.effects.push({mesh:m,kind:'water',vx:Math.sin(a)*v,vy:2+this.random()*power*1.2,vz:Math.cos(a)*v,life:.65+this.random()*.5,max:1.2,bounce:0,gravity:12});}
  }
  trimToMap(){
    this.static.updateWorldMatrix(true,true);const remove=[];
    this.static.traverse(o=>{if(!o.isMesh||o.userData.boundary)return;let p=o;while(p){if(p.userData.breakable||p.userData.keep)return;p=p.parent;}
      const v=new T.Vector3();o.getWorldPosition(v);if(o.geometry.type==='ShapeGeometry'||o.geometry.type==='ExtrudeGeometry')return;
      if((!insideMap(this.layout,v.x,v.z,0)&&!(this.district>=4&&v.y>.7))||(this.district>=4&&v.y<.07&&o.material===mat(0xa2a591)))remove.push(o);
    });for(const o of remove)o.removeFromParent();
  }
  wildTree(x,z){
    const g=this.static,r=this.random,mountain=this.district===5;
    if(this.district!==6)cylinder(g,0x554c36,x,2.5,z,.22,5,.12);
    if(mountain){for(let i=0;i<3;i++){const m=new T.Mesh(new T.ConeGeometry(1.7-i*.35,2.5,7),mat(i===2?0xbac7c8:0x52675a));m.position.set(x,2.6+i*1.2,z);m.castShadow=true;g.add(m);}}
    else if(this.district===6){for(const side of [-1,1]){cylinder(g,0x68744a,x+side*.5,1.6,z,.19,1.8);box(g,0x68744a,x+side*.25,1,z,.6,.3,.3);}cylinder(g,0x70804f,x,1.7,z,.3,3.4);}
    else{for(let i=0;i<7;i++){const a=i*2.4;sphere(g,[0x355842,0x4b6e44,0x668049][i%3],x+Math.sin(a),3.8+r()*1.4,z+Math.cos(a),1.5,.8,1.25);}for(let i=0;i<4;i++){const vine=cylinder(g,0x536245,x+Math.sin(i*2)*.8,2.1,z+Math.cos(i*2)*.8,.035,3.8);}}
    contact(g,x,z,4.5,4.5,.4);
  }
  buildWilderness(){
    const g=this.static,r=this.random,polygon=this.layout.boundary;
    for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/5);
      for(let j=0;j<n;j++){const t=j/n,x=(a.x+(b.x-a.x)*t)*1.12,z=(a.z+(b.z-a.z)*t)*1.12;
        if([4,7].includes(this.district)){const mound=sphere(g,0x495842,x,-1,z,2.3,1.05,2.3);mound.userData.boundary=true;this.wildTree(x,z);}
        else{const height=(this.district===5?7+r()*11:3+r()*6)*(z>0?.45:1);const m=new T.Mesh(new T.ConeGeometry(3+r()*3,height,5),mat(this.district===5?0x71818b:0x967152));m.position.set(x,height/2-2,z);m.rotation.y=r()*6;m.castShadow=true;m.userData.boundary=true;g.add(m);if(this.district===5){const cap=new T.Mesh(new T.ConeGeometry(1.7,height*.4,5),mat(0xd0d7d5));cap.position.set(x,height*.8-2,z);cap.userData.boundary=true;g.add(cap);}}
      }
    }
    if([4,7].includes(this.district)){const ruins=new T.Group();g.add(ruins);const edge=this.layout.facades[0];ruins.position.set(edge?.x||0,0,edge?.z||-30);ruins.rotation.y=edge?.angle||0;this.building(0,0,9,5,0x70745c,this.district===4?'STATION CANOPÉE':'POSTE DU MARAIS',0x4a594a,ruins);}
  }
  scatterNature(){const g=this.static,r=this.random,b=this.layout.bounds;
    for(let t=b.minZ+3;t<b.maxZ-3;t+=.8){const x=Math.sin(t*.12)*3;if(insideMap(this.layout,x,t,2.5)){const patch=new T.Mesh(new T.CircleGeometry(2.4,10),new T.MeshStandardMaterial({color:this.district===5?0xd0d7d6:this.district===6?0xc8a577:0x756f4e,transparent:true,opacity:.16,depthWrite:false}));patch.rotation.x=-Math.PI/2;patch.position.set(x,.014,t);patch.scale.y=.45;g.add(patch);}}
    for(let i=0;i<180;i++){const x=b.minX+r()*(b.maxX-b.minX),z=b.minZ+r()*(b.maxZ-b.minZ);if(!insideMap(this.layout,x,z,1))continue;
      if(this.district===5){const stone=sphere(g,0xb4bcb9,x,.12,z,.2+r()*.3,.15,.22);}
      else if(this.district===6){sphere(g,0x8e734e,x,.07,z,.15,.1,.2);}
      else{for(let j=0;j<3;j++){const leaf=box(g,[0x576b3e,0x70824d,0x3c573d][j],x+j*.1,.15,z,.035,.25+r()*.3,.2);leaf.rotation.z=(r()-.5)*1.4;}}
    }
  }
  buildBiome(){
    // Each prefab follows its generated boundary segment and damages independently.
    for(const [index,f] of this.layout.facades.entries()){
      const g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.angle||0;this.static.add(g);
      g.userData.breakable=true;g.userData.glass=[];g.userData.sections=[];
      this.buildingMeshes.set(`building-${this.buildingMeshes.size}`,g);
      const dock=this.district===1,garden=this.district===2,w=f.w,h=dock?3:garden?5:8,color=dock?(index%2?0x516b6b:0x8a5540):garden?0x557068:0x64584b;
      box(g,0x717c72,0,-.1,.8,w+.5,.3,9);
      const wall=box(g,0x303c37,0,h/2,0,w,h,6.2);g.userData.wall=wall;
      for(let y=1;y<h;y+=2)for(let x=-w/2+1;x<w/2;x+=2){const m=box(g,color,x,Math.min(y,h-.8),3.4,1.94,1.94,.5);m.userData.breakablePart=true;g.userData.sections.push(m);}
      for(const side of [-1,1])for(let y=1;y<h;y+=2)for(let z=-2;z<3;z+=2){const m=box(g,color,side*(w/2-.1),Math.min(y,h-.8),z,.42,1.94,1.94);m.userData.breakablePart=true;g.userData.sections.push(m);}
      box(g,garden?0x7f9b86:0x393f3e,0,h+.12,0,w+.4,.25,7.4);
      if(dock){
        for(let x=-w/2+.2;x<w/2;x+=.42)box(g,0x30484b,x,1.4,3.7,.07,2.5,.06);
        sign(g,'CENDRES / FREIGHT',0,1.7,3.76,w*.7,.8,'#384f53');
        if(index%3===0){box(g,0xa28646,0,6,-1,.5,12,.5);box(g,0xa28646,2,11.7,-1,6,.45,.45);box(g,0x384b50,4.6,8,-1,.06,7,.06);}
      }else{
        for(let x=-w/2+1;x<w/2-.3;x+=1.5){
          const pane=box(g,garden?0x294c46:0xc07438,x,h/2,3.72,1.2,h-1,.05,garden?{}:{emissive:0xd66222,emissiveIntensity:.5});pane.userData.glass=true;g.userData.glass.push(pane);
          box(g,0xaab698,x-.68,h/2,3.8,.08,h,.08);
        }
        for(let y=1;y<h;y+=1.2)box(g,0xaab698,0,y,3.8,w,.06,.08);
        if(!garden){cylinder(g,0x665c4e,1,h+3,-1,1.05,6,.85,12);cylinder(g,0x2d3837,1,h+6,-1,1.12,.16,1.12,12);}
        sign(g,garden?'LES SERRES / BOTANIQUE':'FONDERIE / FOURNEAU',0,h-.35,3.9,w*.85,.65,garden?'#3e5443':'#59442f');
      }
    }
  }
  collectBuildings(){
    this.scene.updateMatrixWorld(true);
    this.buildingTargets=[];
    for(const[id,g]of this.buildingMeshes){if(g.userData.plan){const b=g.userData.plan;g.userData.center=new T.Vector3(b.x,b.h/2,b.z);g.userData.size=new T.Vector3(b.w,b.h+5.3,b.d);this.buildingTargets.push({...b});continue;}const bounds=g.userData.wall?new T.Box3().setFromObject(g.userData.wall).expandByScalar(.7):new T.Box3().setFromObject(g);const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());g.userData.center=center;g.userData.size=size;this.buildingTargets.push({id,x:center.x,z:center.z,w:size.x,d:size.z});}
  }
  damageBuildingStage(e){
    const g=this.buildingMeshes.get(e.id);if(!g)return;g.userData.damageStage=e.stage;
    const pieces=(g.userData.sections||[]).filter(m=>m.visible);pieces.sort((a,b)=>{const av=new T.Vector3(),bv=new T.Vector3();a.getWorldPosition(av);b.getWorldPosition(bv);return Math.hypot(av.x-e.x,av.z-e.z,av.y-2)-Math.hypot(bv.x-e.x,bv.z-e.z,bv.y-2);});
    for(const m of pieces.slice(0,Math.max(0,Math.ceil((g.userData.sections||[]).length*.24*e.stage)-((g.userData.sections||[]).length-pieces.length)))){m.visible=false;const p=new T.Vector3();m.getWorldPosition(p);debris(this,{x:p.x,z:p.z,y:p.y,material:g.userData.material||'brick',count:4,power:4,scale:.8});if(this.random()<.35)this.smoke(p.x,p.z,1,p.y);}
    const panes=g.userData.glass.filter(m=>m.visible);for(const pane of panes.slice(0,e.stage*2)){pane.visible=false;const p=new T.Vector3();pane.getWorldPosition(p);this.effect(p.x,p.z,0x98bab9,12,6,'glass',p.y);}
    if(g.userData.roofAccessories&&(!g.userData.roof.visible||g.userData.decoratedRoof?.visible===false))g.userData.roofAccessories.visible=false;
    if(g.userData.plan)this.rebuildBuildingShell(g);
    this.shake=Math.max(this.shake,.13*e.stage);
  }
  buildingImpact(e){
    const building=this.buildingMeshes.get(e.id);if(!building)return;
    const local=building.worldToLocal(new T.Vector3(e.x,1.8,e.z)),halfW=building.userData.plan?.w/2||building.userData.wall.scale.x/2,halfD=(building.userData.depth||7)/2;
    const faceX=Math.abs(local.x)/halfW,faceZ=Math.abs(local.z)/halfD;
    const blast=e.explosive;
    if(!this.scarTex)this.scarTex=texture(256,256,c=>{const r=seededRandom(83),g=c.createRadialGradient(128,128,15,128,128,118);g.addColorStop(0,'rgba(15,16,13,.9)');g.addColorStop(.45,'rgba(24,23,18,.76)');g.addColorStop(.8,'rgba(25,24,20,.25)');g.addColorStop(1,'rgba(25,24,20,0)');c.fillStyle=g;c.fillRect(0,0,256,256);for(let i=0;i<24;i++){let x=128,y=128;c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=(r()-.5)*65;y+=(r()-.5)*65;c.lineTo(x,y);}c.strokeStyle='rgba(19,22,18,.8)';c.lineWidth=1+r()*3;c.stroke();}});
    const hole=new T.Mesh(new T.PlaneGeometry(blast?3.4:e.slicing?1.5:.16,blast?3.4:e.slicing?.055:.16),new T.MeshBasicMaterial({map:this.scarTex,color:0xffffff,transparent:true,depthWrite:false,side:T.DoubleSide}));
    hole.position.set(clamp(local.x,-halfW,halfW),blast?1.8:1.05+(this.random()-.5)*.5,clamp(local.z,-halfD,halfD));if(faceX>faceZ){hole.rotation.y=Math.PI/2;hole.position.x=Math.sign(local.x)*(halfW+.13);}else hole.position.z=Math.sign(local.z)*(halfD+(local.z>0?.28:.18));
    hole.userData.disposable=true;hole.userData.building=e.id;building.add(hole);building.updateWorldMatrix(true,true);const hitPoint=hole.getWorldPosition(new T.Vector3());this.impacts.push(hole);if(this.impacts.length>160)this.removeDynamic(this.impacts.shift());
    const panes=building.userData.glass.filter(m=>m.visible);panes.sort((a,b)=>{const av=new T.Vector3(),bv=new T.Vector3();a.getWorldPosition(av);b.getWorldPosition(bv);return av.distanceTo(hitPoint)-bv.distanceTo(hitPoint);});
    if(panes.length){const pane=panes[0],v=new T.Vector3();pane.getWorldPosition(v);if(v.distanceTo(hitPoint)<3||this.random()<.25){pane.visible=false;this.effect(v.x,v.z,0xa7c7bf,14,4,'glass',v.y);this.smoke(v.x,v.z,1);}}
    debris(this,{x:hitPoint.x,z:hitPoint.z,y:blast?2:1,material:building.userData.material||'brick',count:blast?28:5,power:blast?7:2,scale:blast?1:.4});if(blast){this.smoke(e.x,e.z,12,2);for(const pane of panes.slice(0,4)){pane.visible=false;const p=new T.Vector3();pane.getWorldPosition(p);this.effect(p.x,p.z,0x98bab9,10,7,'glass',p.y);}}
    if(building.userData.plan&&panes.some(p=>!p.visible))this.rebuildBuildingShell(building);
  }
  rebuildBuildingShell(g){
    if(g.userData.shell)this.removeDynamic(g.userData.shell);
    const shell=new T.Group(),batches=new Map();g.updateWorldMatrix(true,true);const inverse=g.matrixWorld.clone().invert();
    const pieces=[];for(const part of [...g.userData.sections,...g.userData.glass])part.traverse(m=>{if(m.isMesh)pieces.push(m);});
    for(const m of pieces){m.layers.set(1);let ancestor=m.parent,hidden=false;while(ancestor&&ancestor!==g){if(!ancestor.visible)hidden=true;ancestor=ancestor.parent;}if(!m.visible||hidden)continue;const material=m.userData.solidMaterial||m.material,key=`${material.uuid}:${!!m.geometry.index}:${Object.keys(m.geometry.attributes).sort().join(',')}`;let batch=batches.get(key);if(!batch){batch={material,geos:[]};batches.set(key,batch);}const geo=m.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(m.matrixWorld));batch.geos.push(geo);}
    for(const {material,geos}of batches.values()){const mesh=new T.Mesh(mergeGeometries(geos),material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.shellPart=true;shell.add(mesh);geos.forEach(g=>g.dispose());}g.add(shell);g.userData.shell=shell;const faded=g.userData.faded;g.userData.faded=undefined;this.fadeBuilding(g,!!faded);
  }
  destroy(){
    this.structuralVisuals.dispose();
    this.feedback.destroy();
    this.reflectionTarget?.dispose();for(const tex of this.bloodTextures?.values()||[])tex.dispose();
    this.scene.traverse(o=>{if(o.geometry&&o.geometry!==boxGeo&&o.geometry!==sphereGeo&&!o.geometry.userData.shared)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m.userData.shared){m.map?.dispose();m.dispose();}}}if(o.isLight)o.shadow?.map?.dispose();});
    for(const pass of this.composer.passes)pass.dispose?.();this.composer.dispose();this.renderer.dispose();
  }
  wallMaterial(color){
    if(!this.wallTex)this.wallTex=texture(256,256,(c,W,H)=>{const r=seededRandom(621);c.fillStyle='#c4c0ae';c.fillRect(0,0,W,H);for(let i=0;i<9500;i++){c.fillStyle=`rgba(61,68,59,${r()*.15})`;c.fillRect(r()*W,r()*H,1+r()*5,1+r()*3);}for(let i=0;i<40;i++){const x=r()*W,y=r()*H;c.fillStyle='rgba(75,81,70,.08)';c.fillRect(x,y,r()*30,r()*55);}});
    const m=mat(color).clone();m.map=this.wallTex;m.bumpMap=this.wallTex;m.bumpScale=.035;return m;
  }
  decal(x,z,radius=.4){return bloodDecal(this,new T.Vector3(x,.06,z),radius);}
  detachParts(e){
    if(!this.settings.gore)return;
    const count=e.part==='legs'?2:e.part==='head'?8:e.part==='all'?7:1;
    for(let i=0;i<count;i++){
      const head=e.part==='head',mesh=new T.Mesh(head?fragmentGeometry('flesh',i):new T.CapsuleGeometry(.65,1.6,3,6),mat(head?0x7d2921:i%2?0x3e5148:0x7e3428));
      const size=head?.05+this.random()*.12:.11+this.random()*.1;mesh.scale.set(size,size,head?size:.28+this.random()*.25);mesh.position.set(e.x,e.part==='legs'?.45:1.4,e.z);mesh.castShadow=true;this.scene.add(mesh);
      const angle=this.random()*Math.PI*2,power=head?3+this.random()*5:4+this.random()*8,life=6+this.random()*4;
      this.effects.push({mesh,kind:'gib',vx:Math.sin(angle)*power,vy:2+this.random()*6,vz:Math.cos(angle)*power,life,max:life,bounce:.25,spin:(this.random()-.5)*15});
    }
    bloodSpray(this,e,e.part==='head'?24:14,8,e.part==='head'?1.7:.6);this.decal(e.x,e.z,.5);
  }
  leaveRemains(e){
    const mesh=this.character(e.enemyType||'walker',e.bossKind,'scout',e.enemyId);mesh.position.set(e.x,0,e.z);mesh.rotation.y=e.angle||0;mesh.userData.frost.visible=false;
    const gory=this.settings.gore,death=e.death||'shot',slicePart=e.slicePart||'arm';
    if(gory&&(death==='headshot'||death==='exploded'||(death==='sliced'&&slicePart==='head'))){mesh.userData.body.children.filter(o=>o.position.y>1.48).forEach(o=>o.visible=false);this.detachParts({...e,part:death==='headshot'?'head':death==='sliced'?slicePart:'all'});}
    if(gory&&(e.crawling||death==='exploded'||(death==='sliced'&&slicePart==='legs')))mesh.userData.legs.forEach(m=>m.visible=false);
    if(gory&&(e.missingArm||death==='exploded'||(death==='sliced'&&slicePart==='arm')))mesh.userData.arms[0].visible=false;
    if(gory&&death==='sliced'&&slicePart!=='head')this.detachParts({...e,part:slicePart});
    if(death==='burned')mesh.traverse(m=>{if(m.isMesh&&m.material?.isMeshStandardMaterial){m.material=mat(0x30372e);}});
    this.scene.add(mesh);this.corpses.push({mesh,age:0,death,variant:e.variant??Math.floor(this.random()*6),fallSpeed:e.fallSpeed||1,pose:deathMotion(e.variant??Math.floor(this.random()*6),e.twist||0),dx:(e.dx||0)*.12,dz:(e.dz||0)*.12,crawling:e.crawling,settled:false});
    if(this.corpses.length>28)this.removeDynamic(this.corpses.shift().mesh);
    if(gory){this.decal(e.x,e.z,death==='exploded'?1.25:.8);if(death!=='burned')bloodSpray(this,{...e,kind:death==='sliced'?'slice':'ballistic'},death==='headshot'?22:14,death==='exploded'?12:6,e.crawling?.35:death==='headshot'?1.65:1.1);}
  }
  destroyProp(e){
    if(e.kind==='building'){const building=this.buildingMeshes.get(e.id);if(building){building.visible=false;building.userData.collapsed=true;this.shake=.35;}return;}if(e.kind==='rubble'){debris(this,{x:e.x,z:e.z,material:e.material||'concrete',count:12,power:3});return;}const group=this.propMeshes.get(e.id);if(group)group.visible=false;if(e.sunk){this.splash(e.x,e.z,6);return;}
    const colors={car:0x5b6561,barrier:0xa19a80,planter:0x7c8267,crate:0x9a8051,barrel:0x87472f};
    debris(this,{x:e.x,z:e.z,material:materialFor(e.kind),count:e.kind==='car'?34:22,power:e.kind==='car'?8:4,scale:e.kind==='car'?1.2:.8});
    this.smoke(e.x,e.z,e.kind==='car'?8:4);
    const wreck=new T.Group();wreck.position.set(e.x,0,e.z);
    if(e.kind==='car'){wreck.rotation.y=e.rotation||0;box(wreck,0x343e3b,0,.28,0,3.8,.4,1.8);box(wreck,0x283734,-.25,.68,0,1.9,.4,1.3);for(const x of [-1.3,1.2])for(const z of [-.85,.85])sphere(wreck,0x202c2c,x,.27,z,.35,.23,.25);}
    else for(let i=0;i<6;i++){const piece=box(wreck,colors[e.kind],(this.random()-.5)*e.w,.1,(this.random()-.5)*e.d,.3+this.random()*.4,.12,.2);piece.rotation.y=this.random()*6;}
    this.scene.add(wreck);this.wrecks.push(wreck);
  }
  smoke(x,z,count=6,height=.4,color=0x69665c){
    if(!this.smokeTex)this.smokeTex=texture(64,64,(c)=>{const r=seededRandom(42);for(let i=0;i<24;i++){const x=20+r()*24,y=20+r()*24,g=c.createRadialGradient(x,y,0,x,y,18);g.addColorStop(0,'rgba(220,213,198,.25)');g.addColorStop(1,'rgba(220,213,198,0)');c.fillStyle=g;c.fillRect(0,0,64,64);}});
    for(let i=0;i<count;i++){const material=new T.SpriteMaterial({map:this.smokeTex,color,transparent:true,opacity:.72,depthWrite:false});const mesh=new T.Sprite(material);mesh.position.set(x+(this.random()-.5),height+this.random(),z+(this.random()-.5));mesh.scale.setScalar(1.3+this.random()*1.6);mesh.userData.disposableMaterial=true;this.scene.add(mesh);const life=3+this.random()*3;this.effects.push({mesh,vx:.35+this.random()*.3,vy:.5+this.random()*.7,vz:.15,life,max:life,kind:'smoke'});}
  }
  fireMaterial(blue=false){
    const m=new T.SpriteMaterial({map:this.fireTex,transparent:true,depthWrite:false,blending:T.NormalBlending,toneMapped:false,rotation:0});
    const seed=this.random()*100;m.onBeforeCompile=shader=>{
      shader.uniforms.uFireBlue={value:blue?1:0};shader.uniforms.uFireTime=this.fireClock;shader.uniforms.uFireSeed={value:seed};
      shader.fragmentShader=`uniform float uFireBlue;uniform float uFireTime;uniform float uFireSeed;
        float fireHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float fireNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fireHash(i),fireHash(i+vec2(1,0)),f.x),mix(fireHash(i+vec2(0,1)),fireHash(i+vec2(1,1)),f.x),f.y);}
        float fireFbm(vec2 p){return fireNoise(p)*.57+fireNoise(p*2.03)*.28+fireNoise(p*4.07)*.15;}
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        vec2 q=vMapUv;float t=uFireTime;float n=fireFbm(vec2(q.x*6.,q.y*4.-t*2.8)+uFireSeed);
        float sway=(fireNoise(vec2(q.y*3.-t*2.,uFireSeed))-.5)*q.y*.42;
        float width=pow(1.-q.y,1.35)*.35;float fuel=width-abs(q.x-.5+sway)+(n-.5)*.37;
        float flame=smoothstep(-.015,.09,fuel)*smoothstep(0.,.24,q.y)*smoothstep(1.,.65,q.y)*(.55+n*.45);
        float heat=clamp(fuel*3.+(1.-q.y)*.42+n*.22,0.,1.);
        vec3 red=vec3(.65,.018,.001),orange=vec3(1.,.12,.004),hot=vec3(1.,.38,.065);
        diffuseColor.rgb=mix(mix(red,orange,smoothstep(.08,.42,heat)),hot,smoothstep(.48,.9,heat));
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.03,.18,.8),vec3(.6,.85,1.),heat),uFireBlue);
        diffuseColor.a*=flame;
      `);
    };m.customProgramCacheKey=()=> 'turbulent-fire-v1';return m;
  }
  flame(x,z,count=3,height=.6,angle=null,large=false,blue=false){
    if(!this.fireTex)this.fireTex=texture(128,128,(c)=>{
      const glow=c.createRadialGradient(64,85,4,64,78,61);glow.addColorStop(0,'rgba(255,126,18,.65)');glow.addColorStop(.5,'rgba(228,59,5,.3)');glow.addColorStop(1,'rgba(126,21,2,0)');c.fillStyle=glow;c.fillRect(0,0,128,128);
      const r=seededRandom(17);for(let i=0;i<12;i++){const x=34+r()*58,tip=8+r()*38,w=9+r()*16;const gradient=c.createLinearGradient(0,tip,0,119);gradient.addColorStop(0,'rgba(220,42,4,0)');gradient.addColorStop(.3,'rgba(255,94,9,.5)');gradient.addColorStop(.75,'rgba(255,187,40,.82)');gradient.addColorStop(1,'rgba(255,225,128,0)');c.fillStyle=gradient;c.beginPath();c.moveTo(x-w,112);c.bezierCurveTo(x-w*1.4,76,x+w,60,x-7,tip);c.bezierCurveTo(x+w*2,62,x+w,96,x+w,112);c.closePath();c.fill();}
    });
    for(let i=0;i<count;i++){const material=this.fireMaterial(blue);const mesh=new T.Sprite(material);mesh.position.set(x+(this.random()-.5)*.4,height+this.random()*.3,z+(this.random()-.5)*.4);const scale=large?1.2+this.random()*2.5:.42+this.random()*.5;mesh.scale.set(angle===null?scale:scale*.55,angle===null?scale*1.5:scale*2.1,1);let rotation=0;if(angle!==null){const a=new T.Vector3(x,height,z).project(this.camera),b=new T.Vector3(x+Math.sin(angle),height,z+Math.cos(angle)).project(this.camera);rotation=Math.atan2(b.y-a.y,(b.x-a.x)*this.aspect)-Math.PI/2;material.rotation=rotation;}mesh.userData.disposableMaterial=true;this.scene.add(mesh);const life=large?.65+this.random()*.45:angle!==null?.23+this.random()*.13:.4+this.random()*.35;this.effects.push({mesh,directed:angle!==null,rotation,vx:angle===null?(this.random()-.5)*2:Math.sin(angle)*9,vy:large?2:angle!==null?.2+this.random()*.5:1.8+this.random()*2,vz:angle===null?(this.random()-.5)*2:Math.cos(angle)*9,life,max:life,kind:'fire',large});}
  }
  lightning(e){
    const g=new T.Group(),start=new T.Vector3(e.x,e.y||1.15,e.z),end=new T.Vector3(e.toX,e.toY||1.15,e.toZ),pieces=[],tier=e.tier||0;let from=start;
    const segment=(a,b,radius)=>{const d=b.clone().sub(a),geo=new T.CylinderGeometry(radius,radius,d.length(),5),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());geo.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new T.Vector3(1,1,1)));pieces.push(geo);};
    for(let i=1;i<=9;i++){const to=start.clone().lerp(end,i/9);if(i<9){to.x+=(this.random()-.5)*.24;to.y+=(this.random()-.5)*.25;to.z+=(this.random()-.5)*.24;}segment(from,to,.017+tier*.003);if(tier>=1&&i%3===0&&i<9){const branch=to.clone().add(new T.Vector3((this.random()-.5)*.6,.12+this.random()*.25,(this.random()-.5)*.6));segment(to,branch,.01);}from=to;}
    const geo=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());
    for(let i=0;i<2;i++){const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:i?0x53b7d8:0xd8fffa,transparent:true,opacity:i?.2:1,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));m.userData.baseOpacity=i?.2:1;if(i){m.position.copy(start);m.scale.setScalar(1.005);m.position.addScaledVector(start,-1.005);}g.add(m);}
    this.scene.add(g);this.effects.push({mesh:g,life:.13,max:.13,kind:'lightning'});
  }
  building(x,z,w,h,color,name,trim,parent=this.static) {
    const g=new T.Group();g.position.set(x,0,z);parent.add(g);g.userData.breakable=true;g.userData.glass=[];g.userData.sections=[];this.buildingMeshes.set(`building-${this.buildingMeshes.size}`,g);const depth=7,front=depth/2;box(g,0x717c72,0,-.1,.8,w+.5,.3,9);
    const wall=box(g,color,0,h/2,0,w,h,depth);wall.material=this.wallMaterial(color);g.userData.wall=wall;
    g.userData.sections=[];wall.scale.z=depth-.8;wall.material=mat(0x343b36);
    for(let y=1;y<h;y+=2)for(let xx=-w/2+1;xx<w/2;xx+=2){const section=box(g,color,xx,Math.min(y,h-.8),front-.12,1.93,1.93,.42);section.material=this.wallMaterial(color);section.userData.breakablePart=true;g.userData.sections.push(section);}
    for(const side of [-1,1])for(let y=1;y<h;y+=2)for(let zz=-2;zz<3;zz+=2){const section=box(g,color,side*(w/2-.1),Math.min(y,h-.8),zz,.42,1.93,1.93);section.userData.breakablePart=true;g.userData.sections.push(section);}

    for(let row=.9;row<h;row+=.42)for(const side of [-1,1])box(g,0xb2aa94,side*(w/2-.19),row,front+.15,.4,.028,.015);
    box(g,0x575f57,0,.45,front+.06,w, .9,.2);
    for(const y of [3.25,h-.4,h])box(g,0xc0b9a1,0,y,front+.14,w+.3,.18,.32);
    for(const xx of [-w/2+.18,w/2-.18])box(g,0xbeb59c,xx,h/2,front+.1,.35,h,.25);
    // Mansard roof with raised ridgeline.
    const roof=new T.Mesh(new T.CylinderGeometry(w*.35,w*.6,2,4,1),mat(0x364751));roof.rotation.y=Math.PI/4;roof.scale.z=depth/w;roof.position.y=h+1;roof.castShadow=true;g.add(roof);
    box(g,0x51636a,0,h+2,0,w*.53,.12,depth*.6);
    for(const xx of [-w*.3,w*.25]){box(g,0x867965,xx,h+2.2,-.6,.55,1.2,.7);box(g,0xb3a58a,xx,h+2.85,-.6,.7,.14,.85);}
    for(let y=4.6;y<h-.7;y+=2.45)for(let xx=-w/2+1.2;xx<w/2-.7;xx+=2.2){
      box(g,0x364e53,xx,y,front+.03,1.14,1.68,.14);
      box(g,0xc4bba2,xx,y+.92,front+.13,1.42,.12,.2);box(g,0xc4bba2,xx,y-.88,front+.22,1.42,.13,.35);
      const lit=this.random()>.6;const glass=box(g,lit?0xc9a463:0x496169,xx,y,front+.15,.94,1.5,.05,lit?{emissive:0xb07a35,emissiveIntensity:.25}:{});glass.userData.glass=true;g.userData.glass.push(glass);
      box(g,0xb5ad91,xx,y,front+.21,.055,1.5,.055);box(g,0xb5ad91,xx,y,front+.21,.94,.055,.055);
      for(const side of [-1,1]){box(g,trim,xx+side*.77,y,front+.1,.3,1.67,.12);for(let s=-.6;s<.7;s+=.18)box(g,0x3a5149,xx+side*.77,y+s,front+.18,.28,.04,.05);}
      if(y>6){box(g,0x293b3d,xx,y-.68,front+.6,1.6,.04,.05);for(let k=-.7;k<.8;k+=.2)box(g,0x293b3d,xx+k,y-.98,front+.6,.025,.6,.025);}
    }
    box(g,trim,0,1.7,front+.17,w-.5,2.3,.3);
    for(let xx=-w/2+1;xx<w/2-.4;xx+=1.6){const glass=box(g,0x243c3f,xx,1.5,front+.35,1.25,1.9,.06);glass.userData.glass=true;g.userData.glass.push(glass);box(g,0x718175,xx,1.5,front+.4,.05,1.9,.04);}
    const awning=box(g,trim,0,2.95,front+.8,w-.25,.16,1.55);awning.rotation.x=.12;
    for(let xx=-w/2+.3;xx<w/2;xx+=.8)box(g,0xc5b991,xx,2.79,front+1.55,.35,.3,.08);
    sign(g,name,0,3.52,front+.29,w-.6,.65,`#${trim.toString(16)}`);
    const door=box(g,0x233838,0,1.35,front+.43,1,2.1,.08);box(g,0xb7a573,.36,1.2,front+.49,.04,.25,.04);
    if(name==='PHARMACIE'){const m={emissive:0x4d9e80,emissiveIntensity:.65};box(g,0x78b79b,w/2-.8,4.6,front+.55,.8,.23,.16,m);box(g,0x78b79b,w/2-.8,4.6,front+.55,.23,.8,.16,m);}
    contact(g,0,front+1.2,w+2,3,.4);
    for(const xx of [-w/2+.5,w/2-.5]){cylinder(g,0x55665d,xx,h/2,front+.2,.045,h);}
    const poster=sign(g,'RESTEZ CHEZ VOUS',w*.32,1.55,front+.44,1,.65,'#c3b491','#603f35');
  }
  car(o,van=false){return buildVehicle(this.static,{...o,vehicleType:o.vehicleType||(van?'van':'sedan')},{box,cylinder,contact,batch:(a,b)=>this.batchStatic(a,b)});}
  barrier(o){const g=new T.Group();g.position.set(o.x,0,o.z);g.rotation.y=o.rotation||0;this.static.add(g);box(g,0x979780,0,.45,0,4,.9,1.1);box(g,0xbeb399,0,.95,0,4,.16,.66);for(let i=-1.5;i<1.7;i+=.65){const m=box(g,0x3b4542,i,.56,.56,.24,.7,.015);m.rotation.z=-.35;}contact(g,0,0,5,2,.35);}
  tree(x,z,tall=false){const g=this.static;box(g,0x7b8270,x,.3,z,2,.6,2);box(g,0x455448,x,.63,z,1.8,.06,1.8);cylinder(g,0x605945,x,1.65,z,.17,2.2,.11);for(let i=0;i<6;i++){const a=i*2.4;sphere(g,[0x526c53,0x687b56,0x748561][i%3],x+Math.sin(a)*.58,2.7+this.random()*.9+(tall?.8:0),z+Math.cos(a)*.6,.9,1.1,.85);}contact(g,x,z,4,4,.3);}
  lamp(x,z){const g=this.static;cylinder(g,0x384b4c,x,2.8,z,.07,5.6,.055);cylinder(g,0x344244,x,.23,z,.2,.45);box(g,0x3a4c4c,x+.5,5.55,z,1.1,.12,.12);box(g,0xdec494,x+.96,5.48,z,.48,.14,.4,{emissive:0xffc57b,emissiveIntensity:1.6});const glowTex=texture(128,128,(c)=>{const gradient=c.createRadialGradient(64,64,2,64,64,64);gradient.addColorStop(0,'rgba(255,190,87,.32)');gradient.addColorStop(.45,'rgba(255,161,60,.13)');gradient.addColorStop(1,'rgba(255,156,50,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);});plane(g,new T.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),x+.7,.035,z,9,8,true);if(this.layout.city){this.cityLampPositions??=[];this.cityLampPositions.push({x:x+.96,z});}else{const l=new T.PointLight(0xffb65c,70,12,2);l.position.set(x+.96,4.8,z);this.scene.add(l);}contact(g,x,z,1,1,.4);}
  batchStatic(root=this.static,destination=this.scene){
    root.updateWorldMatrix(true,true);destination.updateWorldMatrix(true,false);const inverse=destination.matrixWorld.clone().invert();const batches=new Map(),remove=[];
    root.traverse(o=>{if(!o.visible||!o.isMesh||o.material.transparent||o.userData.glass||o.userData.breakablePart||o.userData.shellPart)return;if(root===this.static){let ancestor=o.parent;while(ancestor&&ancestor!==root){if(ancestor.userData.breakable)return;ancestor=ancestor.parent;}}let ancestor=o.parent;while(ancestor&&ancestor!==root){if(!ancestor.visible||ancestor.userData.keepGroup)return;ancestor=ancestor.parent;}const key=`${o.material.uuid}:${!!o.geometry.index}:${Object.keys(o.geometry.attributes).sort().join(',')}:${o.castShadow}`;const a=batches.get(key)||{mat:o.material,shadow:o.castShadow,geos:[]};const geo=o.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));a.geos.push(geo);batches.set(key,a);remove.push(o);});
    for(const o of remove)o.removeFromParent();
    for(const {mat,geos,shadow}of batches.values()){const merged=mergeGeometries(geos);if(merged){const m=new T.Mesh(merged,mat);m.castShadow=shadow;m.receiveShadow=true;destination.add(m);}for(const g of geos)g.dispose();}
  }
  character(type,bossKind=null,skinId='scout',appearance=0){
    const costume=SKINS.find(s=>s.id===skinId)||SKINS[0];const group=new T.Group(),body=new T.Group();group.add(body);group.userData.body=body;group.userData.skin=skinId;
    const player=type==='player',boss=type==='boss',brute=type==='brute',variant=characterVariant(appearance);
    const scale=boss?2.15:brute?1.5:type==='runner'?.85:1;group.scale.setScalar(scale);
    const skin=player?costume.skin:type==='spitter'?0x9fba74:0x93a28c;
    const coat=player?costume.coat:boss?(bossKind==='bloom'?0x698052:bossKind==='dredger'?0x697e77:bossKind==='cinder'?0x6b4233:0x844d39):brute?0x546a68:type==='runner'?0x94574a:type==='spitter'?0x82864d:CIVILIAN_COATS[variant];
    sphere(body,coat,0,1.1,0,.3,.36,.22);box(body,0x293c3e,0,.79,0,.55,.16,.36);
    const head=sphere(body,skin,0,1.65,.025,.205,.25,.2);group.userData.head=head;
    if(player){if(skinId==='scout'){box(body,costume.hat,0,1.84,0,.47,.13,.45);box(body,costume.hat,0,1.8,.2,.45,.06,.25);}else if(skinId==='medic'){sphere(body,costume.hat,-.03,1.86,0,.27,.09,.25);box(body,0xa74437,0,1.25,.265,.19,.06,.025);box(body,0xa74437,0,1.25,.268,.06,.19,.025);}else if(skinId==='biker'){sphere(body,costume.hat,0,1.7,0,.28,.3,.25);box(body,0x26383b,0,1.72,.25,.4,.16,.045,{metalness:.6,roughness:.15});}else{box(body,costume.hat,0,1.78,.05,.48,.075,.43);box(body,costume.hat,.18,1.62,-.25,.065,.35,.06);box(body,costume.hat,-.14,1.66,-.25,.065,.28,.06);box(body,0x987349,0,.9,.03,.6,.12,.48);}box(body,0x3e5152,0,1.21,-.25,.36,.46,.22);for(const x of [-.18,.18])box(body,0x6f6248,x,1.15,.2,.075,.58,.065);box(body,0xe1d6a9,.09,1.13,.255,.17,.21,.04);box(body,0x98704d,-.25,1.55,.08,.12,.14,.28);}
    else{box(body,0x3c4238,0,1.55,.22,.19,.06,.035);for(const x of [-.085,.085])box(body,0xe0aa70,x,1.7,.22,.05,.04,.03,{emissive:0xce754a,emissiveIntensity:.5});if(brute||boss){box(body,0x3d5251,0,1.22,.2,.55,.48,.12);box(body,0x87704d,-.32,1.44,0,.22,.2,.47);}if(type==='armored'){box(body,0x465b5a,0,1.2,.23,.56,.52,.12);box(body,0x536762,0,1.83,0,.48,.16,.46);}if(type==='volatile'){sphere(body,0x987143,0,1.12,.21,.28,.33,.22);box(body,0xd4a35c,0,1.12,.43,.12,.14,.04,{emissive:0xc77231,emissiveIntensity:.6});}if(type==='spitter')sphere(body,0x9caf5a,0,1.13,-.27,.33,.43,.2);}
    if(boss){
      if(bossKind==='warden'){box(body,0x434f4d,-.47,1.05,.36,.55,.9,.16);box(body,0xbfb598,-.47,1.12,.45,.3,.13,.02);box(body,0x6a7367,.5,1,.45,.17,.2,.65);}
      if(bossKind==='dredger'){for(const x of [-.18,.18])cylinder(body,0x7d6650,x,1.2,-.36,.14,.7);const hook=box(body,0xa5a997,.5,.95,.6,.14,.14,1.1);box(body,0xb5b69b,.5,1.13,1.12,.12,.38,.12);}
      if(bossKind==='bloom'){for(let i=0;i<7;i++){const a=i/7*6.28;sphere(body,0x8c9454,Math.sin(a)*.4,1.55+Math.cos(a)*.2,-.2,.25,.3,.24);}for(const x of [-.65,.65]){box(body,0x5f7951,x,1.1,.1,.5,.12,.14);sphere(body,0x95ab65,x*1.2,.94,.35,.12,.12,.22);}}
      if(bossKind==='cinder'){box(body,0x332e29,0,1.2,.27,.49,.5,.15);box(body,0xffa453,0,1.2,.355,.27,.32,.025,{emissive:0xff8a32,emissiveIntensity:2});for(const x of [-.45,.45]){cylinder(body,0x554a3e,x,1.75,-.14,.12,.6);sphere(body,0x997a4b,x,1.38,0,.24,.2,.3);}box(body,0x6e5740,0,1.96,0,.45,.15,.43);}
    }
    const legs=[];for(const x of [-.16,.16]){const leg=new T.Group();leg.position.set(x,.77,0);body.add(leg);box(leg,player?0x34494c:0x3e504b,0,-.16,0,.21,.34,.23);const knee=new T.Group();knee.position.y=-.33;leg.add(knee);box(knee,0x394943,0,-.12,0,.2,.25,.22);box(knee,0x283b3c,0,-.28,.075,.24,.18,.37);leg.userData.knee=knee;legs.push(leg);}
    const arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.37,1.35,0);body.add(arm);const upper=player?.34:.27,lower=player?.32:.26;cylinder(arm,coat,0,-upper/2,0,.105,upper,.12,8);const elbow=new T.Group();elbow.position.set(0,-upper,player?0:.04);arm.add(elbow);cylinder(elbow,coat,0,-lower/2,0,.085,lower,.105,8);const wrist=new T.Group();wrist.position.set(0,-lower,player?0:.08);elbow.add(wrist);sphere(wrist,skin,0,0,0,.08,.095,.095);if(player){box(wrist,0x344641,0,-.018,-.018,.15,.09,.11);}arm.userData.elbow=elbow;arm.userData.wrist=wrist;arms.push(arm);}
    if(!player){const frost=this.ring(.7,0x91d9ef,.065);frost.visible=false;group.add(frost);group.userData.frost=frost;}contact(group,0,0,1.4,1,.55);group.userData.legs=legs;group.userData.arms=arms;group.userData.type=type;group.userData.bossKind=bossKind;detailCharacter(group,{player,skin,variant,coat},{box,sphere,cylinder,batch:(a,b)=>this.batchStatic(a,b)});return group;
  }
  ring(radius,color,width=.06){const m=new T.Mesh(new T.RingGeometry(radius-width,radius,48),new T.MeshBasicMaterial({color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.04;return m;}
  buildParticles(){const count=110,positions=new Float32Array(count*3);for(let i=0;i<count;i++){positions[i*3]=this.random()*60-30;positions[i*3+1]=this.random()*12+1;positions[i*3+2]=this.random()*40-20;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));this.ash=new T.Points(geo,new T.PointsMaterial({color:0xd5c6a0,size:.055,transparent:true,opacity:.4,depthWrite:false}));this.scene.add(this.ash);}
  screenPoint(x,y,z){const p=new T.Vector3(x,y,z).project(this.camera);return{x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.9};}
  aim(x,y){this.raycaster.setFromCamera(new T.Vector2(x*2-1,1-y*2),this.camera);const p=new T.Vector3();this.raycaster.ray.intersectPlane(this.groundPlane,p);return{x:p.x,z:p.z};}
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.composer?.setSize(w,h);this.ao?.setSize(Math.max(1,Math.floor(w*.65)),Math.max(1,Math.floor(h*.65)));this.aspect=w/h;}
  applySettings(settings){this.feedback.applySettings(settings);this.settings=settings;if(!settings.gore){for(const m of this.decals)this.removeDynamic(m);this.decals=[];this.effects=this.effects.filter(e=>{if(['blood','gib'].includes(e.kind)){this.removeDynamic(e.mesh);return false;}return true;});for(const c of this.corpses)this.removeDynamic(c.mesh);this.corpses=[];}this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1.15));this.renderer.shadowMap.enabled=settings.quality!=='low';this.ash.visible=!settings.reducedMotion;if(this.ao)this.ao.enabled=settings.quality==='high';this.composer?.setPixelRatio(this.renderer.getPixelRatio());this.ao?.setSize(Math.max(1,Math.floor(innerWidth*.65)),Math.max(1,Math.floor(innerHeight*.65)));}
  clearDynamic(){this.structuralVisuals.update([],{x:0,z:0});this.feedback.clear();for(const collection of [this.characters,this.projectiles,this.items,this.rings,this.grenades,this.streetJobs]){for(const m of collection.values())this.removeDynamic(m);collection.clear();}for(const e of this.effects)this.removeDynamic(e.mesh);this.effects=[];for(const c of this.corpses)this.removeDynamic(c.mesh);this.corpses=[];for(const m of this.decals)this.removeDynamic(m);this.decals=[];for(const m of this.wrecks)this.removeDynamic(m);this.wrecks=[];for(const g of this.propMeshes.values())g.visible=true;for(const g of this.buildingMeshes.values()){g.visible=true;g.userData.collapsed=false;for(const pane of g.userData.glass)pane.visible=true;for(const section of g.userData.sections||[])section.visible=true;g.userData.damageStage=0;if(g.userData.roofAccessories)g.userData.roofAccessories.visible=true;}for(const m of this.impacts)this.removeDynamic(m);this.impacts=[];}
  removeDynamic(mesh){mesh.removeFromParent();mesh.traverse(o=>{
    if(o.geometry&&o.geometry!==boxGeo&&o.geometry!==sphereGeo&&!o.geometry.userData.shared&&!o.isSprite)o.geometry.dispose();
    if(o.material&&!o.material.userData.shared){if(o.material.map&&!o.material.map.userData.shared&&o.material.map!==shadowTexture&&o.material.map!==this.smokeTex&&o.material.map!==this.fireTex)o.material.map.dispose();o.material.dispose();}
  });}

  effect(x,z,color,count=8,power=3,kind='spark',height=.8){
    if(['debris','glass'].includes(kind)){debris(this,{x,z,y:height,material:kind==='glass'?'glass':'concrete',count,power:power*.55});return;}
    for(let i=0;i<count;i++){
      const mesh=new T.Mesh(sphereGeo,mat(color,['spark','ember'].includes(kind)?{emissive:color,emissiveIntensity:1}:{}));
      const size=(kind==='debris'||kind==='glass')?.045+Math.pow(this.random(),2)*.8:kind==='blood'?.025+this.random()*.04:.018+this.random()*.025;
      mesh.scale.set(size,kind==='spark'?size*4:size,kind==='debris'?size*(.5+this.random()*2.8):size);mesh.position.set(x,height+this.random()*.3,z);mesh.castShadow=kind==='debris';this.scene.add(mesh);
      const life=kind==='blood'?1.4:(kind==='debris'||kind==='glass')?3+this.random()*2:.18+this.random()*.35;
      this.effects.push({mesh,vx:(this.random()-.5)*power,vy:1+this.random()*power*.8,vz:(this.random()-.5)*power,life,max:life,kind,bounce:kind==='debris'?.3:.12,spin:(this.random()-.5)*12});
    }
    if(this.effects.length>320){for(const e of this.effects.splice(0,this.effects.length-320))this.removeDynamic(e.mesh);}
  }
  onEvent(e){
    this.feedback.event(e);
    if(e.type==='splash')this.splash(e.x,e.z,e.power);
    if(e.type==='surface-char'){
      const g=this.buildingMeshes.get(e.id);if(g&&!g.userData.collapsed){if(!this.charTex)this.charTex=texture(64,64,c=>{const grad=c.createRadialGradient(32,32,5,32,32,31);grad.addColorStop(0,'rgba(12,14,12,.88)');grad.addColorStop(.5,'rgba(16,18,14,.65)');grad.addColorStop(1,'rgba(18,20,16,0)');c.fillStyle=grad;c.fillRect(0,0,64,64);});
      this.charTex.userData.shared=true;const stain=new T.Mesh(new T.PlaneGeometry(2.3,2.9),new T.MeshBasicMaterial({map:this.charTex,transparent:true,depthWrite:false,side:T.DoubleSide}));stain.position.set(e.x-g.position.x,e.y+.45,e.z-g.position.z);if(e.face<2)stain.position.z+=(e.face===0?-1:1)*.32;else{stain.position.x+=(e.face===2?-1:1)*.32;stain.rotation.y=Math.PI/2;}g.add(stain);this.impacts.push(stain);if(this.impacts.length>160)this.removeDynamic(this.impacts.shift());}
    }
    if(e.type==='steam')this.smoke(e.x,e.z,Math.min(5,e.power+1),.3,0xc4d3cf);
    if(e.type==='structural-impact'){const before=this.effects.length;this.smoke(e.x,e.z,1,Math.max(.15,e.y-.2),0xa59d87);for(const dust of this.effects.slice(before)){dust.mesh.scale.multiplyScalar(1+e.power*.25);dust.vy*=.5;dust.vx*=1.5;}debris(this,{x:e.x,z:e.z,y:e.y,material:e.material,count:Math.ceil(e.power*2),power:e.power+1,scale:.65+e.size*.15});this.shake=Math.max(this.shake,Math.min(.35,e.power*.055));}
    if(e.type==='vehicle-hit'){debris(this,{x:e.x,z:e.z,material:'metal',count:12,power:4});this.shake=Math.max(this.shake,Math.min(.3,e.power*.012));}
    if(e.type==='vehicle-skid')this.smoke(e.x,e.z,1,.1,0x7c8075);
    if(e.type==='slice'){if(e.hits)this.shake=Math.max(this.shake,e.combo===2?.12:.045);}
    if(e.type==='shoot')weaponShot(this,e);
    if(e.type==='impact')weaponImpact(this,e);
    if(e.type==='evolution')evolutionFX(this,e);
    if(e.type==='cut-wave')cutWave(this,e);
    if(e.type==='ricochet')weaponImpact(this,{...e,kind:'car',normal:{x:e.dx/20,z:e.dz/20}});
    if(e.type==='reload'&&['revolver','launcher'].includes(e.weapon)){const p=this.player.position;for(let i=0;i<(e.weapon==='revolver'?6:4);i++)ejectCasing(this,{...e,x:p.x,z:p.z,angle:this.player.rotation.y},.3+i*.04);}
    if(e.type==='hit'){if(this.settings.gore){bloodSpray(this,e,Math.min(12,4+Math.ceil(Math.sqrt(e.amount))),4+Math.min(6,Math.sqrt(e.amount)*.5),e.crawling?.35:e.headshot?1.65:1.05);}else this.effect(e.x,e.z,0xb4ad87,3,2);}
    if(e.type==='kill')this.leaveRemains(e);if(e.type==='dismember')this.detachParts(e);
    if(e.type==='destroy')this.destroyProp(e);if(e.type==='building-stage')this.damageBuildingStage(e);
    if(e.type==='prop-hit'&&e.kind==='building'&&e.health>0&&!e.thermal)this.buildingImpact(e);
    if(e.type==='prop-hit'&&e.kind!=='building'&&!e.weapon)debris(this,{x:e.x,z:e.z,material:materialFor(e.kind),count:5,power:2,scale:.4});
    if(e.type==='arc')this.lightning(e);if(e.type==='ignite')this.flame(e.x,e.z,6);if(e.type==='electrify')this.effect(e.x,e.z,0xa6e9ed,6,3);
    if(e.type==='explosion'||e.type==='slam'){
      const force=Math.max(.35,Math.min(1.7,(e.radius||3)/3)),tier=e.tier||0;
      if(!e.water)this.flame(e.x,e.z,e.source==='car'?14:Math.ceil(5*force+tier),.4,null,true);const lamp=this.blastLights.reduce((a,b)=>a.userData.life<b.userData.life?a:b);lamp.position.set(e.x,2,e.z);lamp.userData.life=.55;lamp.userData.power=e.water?40:160;lamp.color.set(e.water?0xb1d9e0:0xff9d42);lamp.intensity=lamp.userData.power;if(!e.water)this.effect(e.x,e.z,0xf2ae5e,Math.ceil(20*force+tier*3),8+force*3);if(!e.water)debris(this,{x:e.x,z:e.z,material:e.source==='car'||e.source==='barrel'?'metal':'earth',count:Math.ceil(24*force+tier*3),power:6+force*3,scale:.7+force*.3});this.smoke(e.x,e.z,e.water?6:Math.ceil(9*force),e.water?0:.4,e.water?0xb8cbca:0x69665c);this.shake=Math.min(.5,.22*force);
      const mesh=this.ring(e.radius,e.water?0x83aaac:0xf4ba77,.025);mesh.position.set(e.x,e.water?this.waterLevel()+.08:.1,e.z);mesh.userData.disposable=true;this.scene.add(mesh);this.effects.push({mesh,life:.22,max:.22,ring:true,opacity:.24});
    }
    if(e.type==='melee'){const mesh=this.ring(e.radius,0xf0dfb7,.08);mesh.position.set(e.x,.1,e.z);mesh.userData.disposable=true;this.scene.add(mesh);this.effects.push({mesh,life:.25,max:.25,ring:true});}
    if(e.type==='hurt')this.shake=.2;
    if(e.type==='spark')this.effect(e.x,e.z,0xddbe84,5,3);
  }
  update(sim,dt,menu=false){
    this.fireClock.value+=dt;const t=sim.time,p=sim.player,motionDt=['paused','upgrade','dead','victory'].includes(sim.state)?0:dt;
    const driving=sim.props.find(v=>v.id===p.vehicleId),lead=driving?{x:(driving.vx||0)*.25,z:(driving.vz||0)*.25}:{x:0,z:0};
    const desired=this.inspectionTarget?new T.Vector3(this.inspectionTarget.x,0,this.inspectionTarget.z):menu?new T.Vector3(2,0,-7):new T.Vector3(p.x+lead.x,0,p.z-1+lead.z);
    if(this.layout.city){const lamps=[...(this.cityLampPositions||[])].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));this.cityLights.forEach((l,i)=>{const a=lamps[i];if(a){l.position.set(a.x,4.8,a.z);l.intensity=70;}});this.sun.position.set(p.x-18,32,p.z+5);this.sun.target.position.set(p.x,0,p.z);this.sun.target.updateMatrixWorld();this.ash.position.x=p.x;this.ash.position.z=p.z;for(const g of this.buildingMeshes.values())if(!g.userData.collapsed){const dx=g.userData.center.x-p.x,dz=g.userData.center.z-p.z;g.visible=Math.hypot(dx,dz)<(this.overview?800:70);this.fadeBuilding(g,!menu&&!this.overview&&obscuresSurvivor(g.userData.plan,p));}}
    this.focus.lerp(desired,1-Math.exp(-dt*4));
    const height=this.portrait?(typeof this.portrait==='number'?this.portrait:10):this.inspectionTarget?46:this.overview?(this.layout.city?Math.max(this.layout.bounds.maxX-this.layout.bounds.minX,this.layout.bounds.maxZ-this.layout.bounds.minZ)*1.12:85):menu?39:p.vehicleId?42:this.touchView?(this.aspect<1?32:26):this.aspect<1?37:30;
    this.camera.far=this.overview&&this.layout.city?900:160;this.camera.near=.1;this.camera.left=-height*this.aspect/2;this.camera.right=height*this.aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
    this.shake=Math.max(0,this.shake-dt*1.8);const s=this.settings.reducedMotion?0:this.shake;
    const cameraDistance=this.overview&&this.layout.city?8:1;this.scene.fog.density=cameraDistance===8?.0009:.009;this.camera.position.set(this.focus.x+26*cameraDistance+(this.random()-.5)*s,this.focus.y+35*cameraDistance,this.focus.z+32*cameraDistance);this.camera.lookAt(this.focus);
    if(this.player.userData.skin!==p.skin){this.removeDynamic(this.player);this.player=this.character('player',null,p.skin);this.player.position.set(p.x,0,p.z);this.player.rotation.y=p.angle;this.scene.add(this.player);}
    this.player.position.lerp(new T.Vector3(p.x,0,p.z),1-Math.exp(-dt*22));this.player.rotation.y+=Math.atan2(Math.sin(p.angle-this.player.rotation.y),Math.cos(p.angle-this.player.rotation.y))*(1-Math.exp(-dt*20));this.animateCharacter(this.player,t,p.moving,p.dash>0,motionDt,p);
    animateWeapons(this.player,p,t,motionDt,{box,sphere,cylinder,batch:(a,b)=>this.batchStatic(a,b),remove:m=>this.removeDynamic(m)});
    updateBladeTrails(this.player,p,motionDt,!!this.settings.reducedMotion);
    this.player.visible=!p.vehicleId&&(sim.state!=='dead'||Math.sin(t*20)>-.5);
    this.playerRing.position.set(p.x,.045,p.z);this.playerRing.material.opacity=p.invulnerable>0?.4+.3*Math.sin(t*30):.8;
    const chargingBoss=sim.enemies.find(e=>e.type==='boss'&&e.windup>0);this.bossTell.visible=!!chargingBoss;if(chargingBoss){this.bossTell.position.set(chargingBoss.x,.06,chargingBoss.z);this.bossTell.scale.setScalar(1+(1-chargingBoss.windup)*.7);}
    this.extractionRing.visible=sim.state==='extracting'||sim.state==='victory';this.extractionRing.rotation.z=t*.4;
    this.syncMap(this.characters,sim.enemies,e=>{const m=this.character(e.type,e.bossKind,'scout',e.id);m.position.set(e.x,0,e.z);m.rotation.y=e.angle;this.scene.add(m);return m;},(m,e)=>{m.position.lerp(new T.Vector3(e.x,0,e.z),1-Math.exp(-dt*24));m.rotation.y+=Math.atan2(Math.sin(e.angle-m.rotation.y),Math.cos(e.angle-m.rotation.y))*(1-Math.exp(-dt*12));this.animateCharacter(m,t+e.phase,e.windup<=0,false,dt,e);m.userData.body.rotation.x=e.crawling?-Math.PI/2:e.windup>0?-.17:0;if(e.crawling)m.position.y=.35;m.userData.legs.forEach(leg=>leg.visible=!e.crawling||!this.settings.gore);m.userData.arms[0].visible=!e.missingArm||!this.settings.gore;if(e.crawling){m.userData.arms.forEach((arm,i)=>arm.rotation.x=-.9+Math.sin(t*6+i*Math.PI)*.45);}if(e.burning>0){if(this.random()<dt*15)this.flame(e.x,e.z,2,.6);if(this.random()<dt*2)this.smoke(e.x,e.z,1);}if(e.electrified>0&&this.random()<dt*14)this.lightning({x:e.x-.35,z:e.z,y:.4,toX:e.x+.35,toZ:e.z+.1,toY:1.7});m.userData.frost.visible=sim.player.freeze>0||(sim.player.frost>0&&e.slow>0);if(m.userData.frost.visible&&this.random()<dt*4)this.effect(e.x,e.z,0xa2d8e3,1,1,'glass');m.scale.setScalar((e.type==='boss'?2.15:e.type==='brute'?1.5:e.type==='runner'?.85:1)*(e.flash>0?1.035:1)*(e.elite?1.15:1));});
    this.syncMap(this.projectiles,sim.bullets,b=>{const m=projectileMesh(b);this.scene.add(m);return m;},(m,b)=>{m.position.set(b.x,b.y??(b.enemy?.9:1.1),b.z);m.rotation.y=Math.atan2(b.vx,b.vz);m.rotation.x=-Math.atan2(b.vy||0,Math.hypot(b.vx,b.vz));if(b.weapon==='launcher'&&motionDt>0){m.userData.trail=(m.userData.trail||0)+motionDt;if(m.userData.trail>.055){m.userData.trail=0;plume(this,b.x,b.y,b.z,.12,.35,0xada58c);}}});
    this.syncMap(this.items,sim.pickups,item=>{
      const g=new T.Group(),color=POWERUPS[item.type].color;box(g,0x334b47,0,0,0,.48,.28,.4);box(g,color,0,.16,0,.37,.025,.29,{emissive:color,emissiveIntensity:.4});
      const symbols={health:'+',overdrive:'»',shield:'II',freeze:'*',ammo:'|||',grenade:'G',double:'×2',nova:'N'};
      const tex=texture(256,64,(c)=>{c.fillStyle='#162b2b';c.fillRect(0,0,256,64);c.fillStyle=`#${color.toString(16)}`;c.font='bold 25px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(POWERUPS[item.type].name,128,32);});
      const label=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));label.position.y=.75;label.scale.set(1.9,.48,1);label.userData.disposableMaterial=true;g.add(label);g.userData.label=label;
      const r=this.ring(.5,color,.07);r.position.y=-.18;r.userData.disposable=true;g.add(r);this.scene.add(g);return g;
    },(m,i)=>{m.position.set(i.x,.3+Math.sin(t*3+i.id)*.045,i.z);m.userData.label.visible=Math.hypot(p.x-i.x,p.z-i.z)<8;});
    this.syncMap(this.grenades,sim.hazards.filter(h=>h.thrown),()=>{const g=new T.Group();sphere(g,0x7f8e52,0,0,0,.22,.27,.22);cylinder(g,0xd1c7a0,0,.25,0,.09,.12);box(g,0x3f4840,0,.32,0,.07,.055,.24);this.scene.add(g);return g;},(g,h)=>{const age=h.duration-h.timer,pos=grenadePosition(h);g.position.set(pos.x,pos.y,pos.z);g.rotation.set(age*13,age*5,age*9);});
    this.syncMap(this.streetJobs,sim.streetEvents||[],job=>{
      const g=new T.Group(),radio=job.kind==='relay';box(g,radio?0x587b71:0x76634b,0,.4,0,radio?1.15:1.5,.8,.8);box(g,0xb4a27b,0,.84,0,1.25,.1,.9);
      if(radio){cylinder(g,0x4b6765,.35,2,0,.035,3.2);box(g,0xbabda3,.35,3.5,0,1.6,.035,.035);box(g,0x2e4444,0,.52,.42,.72,.4,.04);for(let i=0;i<4;i++)box(g,0x9caa86,-.25+i*.15,.5,.45,.025,.2,.015);}
      else if(job.kind==='cache'){for(const x of [-.5,.5])box(g,0x314948,x,.4,.43,.1,.78,.035);box(g,0xc8b897,0,.4,.45,.35,.3,.025);}
      else{cylinder(g,0x566869,0,1.6,0,.04,3.2);sign(g,'DANGER / ENFORCER',0,2.6,.04,2.4,.65,'#793f35','#e3c4a0');}
      const ring=this.ring(job.kind==='relay'?4:1.3,0xe0b674,.035);g.add(ring);g.userData.jobRing=ring;g.position.set(job.x,0,job.z);this.scene.add(g);return g;
    },(g,job)=>{g.visible=Math.hypot(p.x-job.x,p.z-job.z)<65;const ring=g.userData.jobRing;ring.material.color.setHex(job.state==='complete'?0x8eaf94:0xe0b674);ring.material.opacity=job.state==='complete'?.2:.6;});
    this.syncMap(this.rings,sim.hazards,h=>{const m=this.ring(h.radius,h.friendly?0xf2c179:0xee684c,.1);m.userData.disposable=true;this.scene.add(m);return m;},(m,h)=>{m.position.set(h.x,.06,h.z);m.material.opacity=.4+.5*(1-h.timer/h.duration);m.scale.setScalar(.85+.15*(1-h.timer/h.duration));});
    this.structuralVisuals.update(sim.structures||[],p,this.overview);
    for(const jet of this.fountainJets){jet.mesh.visible=Math.hypot(jet.x-p.x,jet.z-p.z)<65;jet.mesh.material.opacity=.55+Math.sin(t*5+jet.phase)*.12;if(jet.mesh.visible&&this.random()<motionDt*2)this.splash(jet.x,jet.z,.2);}
    for(const v of sim.props)if(v.driveable&&v.health>0){const root=this.propMeshes.get(v.id),plan=this.layout.cover[Number(v.id.split('-')[1])];if(root&&plan){root.visible=Math.hypot(v.x-p.x,v.z-p.z)<70;root.position.set(v.x-plan.x,0,v.z-plan.z);const car=root.children[0];if(car)animateVehicle(car,{...v,occupied:p.vehicleId===v.id},motionDt,t);if(v.speed>5&&this.random()<dt*2)this.smoke(v.x-Math.sin(v.angle)*2,v.z-Math.cos(v.angle)*2,1,.1);}}
    ageBlood(this,motionDt);
    for(const corpse of this.corpses){
      corpse.age+=dt;if(corpse.settled)continue;const m=corpse.mesh,t=corpse.age,duration=(corpse.death==='electrocuted'?1.1:.7)*corpse.fallSpeed,progress=clamp(t/duration,0,1),ease=progress*progress*(3-2*progress);
      m.position.x+=corpse.dx*dt*(1-progress);m.position.z+=corpse.dz*dt*(1-progress);m.position.y=.22*ease+(corpse.death==='exploded'?Math.sin(progress*Math.PI)*.9:0);
      m.userData.body.rotation.x=corpse.crawling?-Math.PI/2:corpse.pose.x*ease;m.userData.body.rotation.z=corpse.pose.z*ease;m.rotation.y+=corpse.pose.twist*dt*(1-progress);
      m.userData.legs.forEach((leg,i)=>{leg.rotation.x=corpse.pose.knee*(i?-.5:1)*ease;leg.userData.knee.rotation.x=corpse.pose.knee*ease;});m.userData.arms.forEach((arm,i)=>{arm.rotation.z=(i?1:-1)*(.35+corpse.variant*.16)*ease;arm.rotation.x=-.5*ease;});
      if(corpse.death==='electrocuted'){m.userData.body.rotation.z=Math.sin(t*55)*.12*(1-progress);if(this.random()<dt*15)this.lightning({x:m.position.x-.3,z:m.position.z,toX:m.position.x+.3,toZ:m.position.z,y:.6,toY:1.5});}
      if(corpse.death==='burned'&&this.random()<dt*9)this.smoke(m.position.x,m.position.z,1,.4);
      if(waterAt(this.layout,m.position.x,m.position.z)&&!corpse.splashed){this.splash(m.position.x,m.position.z,2);corpse.splashed=true;}if(corpse.splashed)m.position.y=this.waterLevel()-.5*progress;
      if(progress>=1){corpse.settled=true;this.batchStatic(m,m);}
    }
    for(const e of this.effects){
      if(e.delay>0){e.delay-=motionDt;if(e.delay>0)continue;e.mesh.visible=true;}
      e.life-=motionDt;
      if(e.ring){e.mesh.scale.addScalar(motionDt*2);e.mesh.material.opacity=Math.max(0,e.life/e.max)*(e.ripple?.4:e.opacity??1);}
      else if(e.kind==='cutwave'){e.mesh.position.x+=e.vx*motionDt;e.mesh.position.z+=e.vz*motionDt;e.mesh.scale.addScalar(motionDt*2);e.mesh.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,e.life/e.max)*.7;});}
      else if(e.kind==='lightning'){e.mesh.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,e.life/e.max)*(o.userData.baseOpacity??1);});}
      else if(e.kind==='fire'){e.mesh.position.x+=e.vx*motionDt;e.mesh.position.y+=e.vy*motionDt;e.mesh.position.z+=e.vz*motionDt;e.vx*=Math.exp(-motionDt*2);e.vz*=Math.exp(-motionDt*2);e.mesh.scale.x+=motionDt*(e.large?4:.6);e.mesh.scale.y+=motionDt*(e.large?3:1);e.mesh.material.opacity=Math.min(.88,e.life/e.max);e.mesh.material.rotation=(e.rotation||0)+Math.sin(this.fireClock.value*3+e.vy)*.07;if(this.random()<motionDt*.8)this.effect(e.mesh.position.x,e.mesh.position.z,0xe69a35,1,2,'ember',e.mesh.position.y);}
      else if(e.kind==='smoke'){e.mesh.position.x+=e.vx*motionDt;e.mesh.position.y+=e.vy*motionDt;e.mesh.position.z+=e.vz*motionDt;e.mesh.scale.addScalar(motionDt*1.15);e.mesh.material.opacity=.72*Math.min(1,(e.max-e.life)*3)*Math.max(0,e.life/e.max);}
      else if(e.kind==='blood')stepBlood(this,e,motionDt);
      else{
        const old={x:e.mesh.position.x,z:e.mesh.position.z};
        if(e.kind==='ember')e.gravity=-1.2;const inWater=waterAt(this.layout,e.mesh.position.x,e.mesh.position.z),ground=inWater?-5:.065,landed=stepFragment(e,motionDt,ground);
        if(e.mesh.position.y<this.waterLevel()+.03&&e.vy<0&&waterAt(this.layout,e.mesh.position.x,e.mesh.position.z)){if(e.kind!=='water')this.splash(e.mesh.position.x,e.mesh.position.z,e.kind==='material'?Math.min(1.5,e.mesh.scale.x*4):.35);e.life=0;}
        else if(landed&&e.kind==='gib'&&!e.bled){this.decal(e.mesh.position.x,e.mesh.position.z,.12+this.random()*.14);e.bled=true;}
        else if(landed&&e.kind==='blood'){if(this.random()<.25)this.decal(e.mesh.position.x,e.mesh.position.z,.06+this.random()*.08);e.life=0;}
        if(['material','casing'].includes(e.kind)&&Math.hypot(e.vx,e.vz)>1){
          const hit=sim.obstacles.find(o=>e.mesh.position.y<(o.kind==='building'?o.h||5:1.5)&&segmentBoxTime(old,e.mesh.position,o)!==null);
          if(hit){const normal=boxNormal(old,hit);Object.assign(e,reflectVelocity(e,normal,.3));e.mesh.position.x=old.x+normal.x*.025;e.mesh.position.z=old.z+normal.z*.025;}
        }
        if(e.kind==='streak'){e.mesh.material.opacity=Math.max(0,e.life/e.max);e.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(e.vx,e.vy,e.vz).normalize());}
        else{e.mesh.rotation.x+=motionDt*(e.spin||e.vz);e.mesh.rotation.z+=motionDt*(e.spin||e.vx)*.7;}
        if(e.life<.5)e.mesh.scale.multiplyScalar(Math.max(.01,1-motionDt*4));
      }
      if(e.life<=0)this.removeDynamic(e.mesh);
    }
    this.effects=this.effects.filter(e=>e.life>0);if(this.effects.length>420){for(const e of this.effects.splice(0,this.effects.length-420))this.removeDynamic(e.mesh);}
    if(!this.settings.reducedMotion){this.ash.rotation.y+=dt*.005;this.ash.position.y=Math.sin(performance.now()*.0002)*.3;}
    for(const prop of sim.props)if(prop.health>0&&prop.kind!=='building'&&prop.burning>0&&this.random()<dt*12){this.flame(prop.x,prop.z,2,prop.kind==='planter'?1.4:.5);if(this.random()<.25)this.smoke(prop.x,prop.z,1);}
    for(const prop of sim.props)if(prop.health>0&&prop.surfaces&&Math.hypot(prop.x-p.x,prop.z-p.z)<55)for(const c of prop.surfaces)if(c.burning>0&&this.random()<motionDt*5){const fx=c.x+(c.face===2?-.45:c.face===3?.45:0),fz=c.z+(c.face===0?-.45:c.face===1?.45:0);this.flame(fx,fz,1,c.y);if(this.random()<.2)this.smoke(fx,fz,1,c.y+1,0x55534d);}
    for(const fire of sim.fires)if(this.random()<dt*18){this.flame(fire.x+(this.random()-.5)*fire.radius,fire.z+(this.random()-.5)*fire.radius,2,.25);if(this.random()<.25)this.smoke(fire.x,fire.z,1);}
    for(const lamp of this.blastLights){lamp.userData.life=Math.max(0,lamp.userData.life-dt);lamp.intensity=(lamp.userData.power||160)*lamp.userData.life/.55;}
    this.muzzleLight.intensity=Math.max(0,this.muzzleLight.intensity-dt*220);
    this.camera.updateMatrixWorld();this.feedback.draw(sim,motionDt,this.camera);
    this.renderer.info.reset();
    if(this.ao.enabled){this.ao.ssaoMaterial.uniforms.cameraNear.value=this.camera.near;this.ao.ssaoMaterial.uniforms.cameraFar.value=this.camera.far;this.ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);this.ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);this.composer.render();}else this.renderer.render(this.scene,this.camera);
  }
  syncMap(map,entities,create,update){const ids=new Set(entities.map(e=>e.id));for(const[id,m]of map)if(!ids.has(id)){this.removeDynamic(m);map.delete(id);}for(const e of entities){if(!map.has(e.id))map.set(e.id,create(e));update(map.get(e.id),e);}}
  fadeBuilding(g,fade){
    if(g.userData.faded===fade)return;g.userData.faded=fade;
    g.traverse(m=>{if(!m.isMesh||!m.visible||m.userData.bloodDecal)return;if(!m.userData.solidMaterial)m.userData.solidMaterial=m.material;if(m.userData.solidShadow===undefined)m.userData.solidShadow=m.castShadow;
      if(fade){if(!m.userData.fadeMaterial){m.userData.fadeMaterial=m.userData.solidMaterial.clone();m.userData.fadeMaterial.transparent=true;m.userData.fadeMaterial.opacity=.45;m.userData.fadeMaterial.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),.7)];m.userData.fadeMaterial.depthWrite=false;}m.material=m.userData.fadeMaterial;m.castShadow=false;}
      else{m.material=m.userData.solidMaterial;m.castShadow=m.userData.solidShadow;}
    });
  }
  animateCharacter(m,t,moving,dash,dt=1/60,state={}){
    const d=m.userData,player=d.type==='player',speed=d.type==='runner'?13:player?10:6.5,velocity=Math.hypot(state.moveX||0,state.moveZ||0);if(player)d.gait=(d.gait||0)+dt*velocity*2.05;const phase=player?d.gait:t*speed,blend=1-Math.exp(-dt*14);d.walk=(d.walk||0)+((moving?1:0)-(d.walk||0))*blend;
    const stride=Math.sin(phase)*d.walk*.62,forward=player&&velocity>.1?((state.moveX||0)*Math.sin(state.angle)+(state.moveZ||0)*Math.cos(state.angle))/velocity:1,strafe=player&&velocity>.1?((state.moveX||0)*Math.cos(state.angle)-(state.moveZ||0)*Math.sin(state.angle))/velocity:0;
    d.legs.forEach((leg,i)=>{leg.rotation.x=(i?-1:1)*stride*forward;leg.rotation.z=(i?1:-1)*stride*strafe*.65;leg.userData.knee.rotation.x=Math.max(0,Math.sin(phase+(i?Math.PI:0)))*d.walk*.9;});
    d.body.position.y=Math.abs(Math.sin(phase))*d.walk*.055+Math.sin(t*2)*.018;d.body.rotation.y=Math.sin(phase)*d.walk*.065;d.body.rotation.z=Math.sin(phase*.5)*d.walk*.035;d.body.rotation.x=dash?.55:0;
    d.arms.forEach((arm,i)=>{arm.rotation.x=player?-.6: -.35+(i?1:-1)*stride*.4;arm.rotation.z=i?.1:-.1;arm.userData.elbow.rotation.x=player?-.85:-.35+Math.sin(phase+i)*.15;});
    if(state.windup>0){const strike=Math.sin((1-state.windup)*Math.PI);d.arms.forEach(a=>{a.rotation.x=-1.2*strike;a.userData.elbow.rotation.x=-.8;});d.body.rotation.y=strike*.25;}
    if(player&&WEAPONS[state.weapon]?.melee){d.body.rotation.x=dash?.75:.12;d.arms.forEach((a,i)=>{a.rotation.x=-.45;a.rotation.z=i?.35:-.35;});}
    if(player){d.body.rotation.x+=d.walk*.06;d.body.rotation.z-=strafe*d.walk*.055;}
  }
}
