import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {World} from '../src/rebuild/World.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
import {DetailedSurvivorLibrary} from '../src/rebuild/DetailedSurvivor.js';
import {BOSS_PROFILES} from '../src/rebuild/Bosses.js';
import {buildBossModel,animateBossModel} from '../src/rebuild/BossVisuals.js';
import {SurfaceMaterials} from '../src/rebuild/SurfaceMaterials.js';
const $=id=>document.getElementById(id),heroes=['scout','medic','biker','ronin'],enemies=['walker','runner','brute','armored','spitter','volatile'];
const bossIds=['boss-warden','boss-dredger','boss-bloom','boss-cinder','boss-cathedral','boss-avalanche','boss-reaper','boss-fen'];
const renderer=new T.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const scene=new T.Scene();scene.background=new T.Color(0x263032);const camera=new T.PerspectiveCamera(35,1,.05,80),controls=new OrbitControls(camera,$('view'));controls.target.set(0,1,0);controls.enableDamping=true;
scene.add(new T.HemisphereLight(0xdce5ed,0x696656,2));const key=new T.DirectionalLight(0xffead5,3);key.position.set(3,6,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:6,bottom:-6,near:.1,far:20});key.shadow.normalBias=.025;scene.add(key);
const fill=new T.DirectionalLight(0xc2d4de,.9);fill.position.set(-3,3,-3);scene.add(fill);const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0x626a65,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.01;scene.add(floor);
const host=Object.create(World.prototype);host.settings={reducedMotion:true};host.detailedSurvivors=new DetailedSurvivorLibrary();host.layout={water:[]};host.surfaces=new SurfaceMaterials();let actors=[],playing=false,time=0,last=performance.now();
const query=new URLSearchParams(location.search);for(const id of ['subject','camera','motion','appearance']){const value=query.get(id);if(value&&[...$(id).options].some(o=>o.value===value))$(id).value=value;}
window.addEventListener('error',e=>{$('error').textContent=e.message;});
function frame(){
 const many=actors.length>1,face=$('camera').value==='face',game=$('camera').value==='game',boss=actors[0]?.userData.qaBoss,height=boss?.bossProfile.height||1.82;
 const scale=height/6,phase2=$('motion').value.startsWith('phase2-'),faceY=boss?({warden:4.9,dredger:phase2?3.55:4.3,bloom:4.4,cinder:4.7}[boss.bossKind]*scale):1.7;
 const target=face?faceY:boss?height*.5:1.02,targetZ=face&&boss?({warden:.35,dredger:.6,bloom:0,cinder:.6}[boss.bossKind]*scale):0;
 const field=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 const distance=many?actors.length*2.8:boss?(face?height*.62*Math.max(1,1/camera.aspect):height*.78/Math.tan(field))*(game?1.75:1):game?16:face?1.25:4.2;
 controls.target.set(0,target,targetZ);const a=$('camera').value==='front'||face?0:$('camera').value==='back'?Math.PI:.62;
 camera.position.set(Math.sin(a)*distance,target+(game?distance*.55:face?height*.02:distance*.12),targetZ+Math.cos(a)*distance);camera.far=Math.max(80,distance*4);camera.updateProjectionMatrix();
 const lightSize=Math.max(6,height);key.position.set(lightSize*.7,lightSize*1.25,lightSize*.8);key.target.position.set(0,height*.4,0);key.target.updateMatrixWorld();Object.assign(key.shadow.camera,{left:-lightSize,right:lightSize,top:lightSize,bottom:-lightSize,near:.1,far:lightSize*4});key.shadow.camera.updateProjectionMatrix();controls.update();
}
function setup(){
 for(const a of actors){host.detailedSurvivors.release(a);scene.remove(a);disposeObjectResources(a);}
 const selection=$('subject').value,list=selection==='survivors'?heroes:selection==='enemies'?enemies:[selection];
 actors=list.map((id,i)=>{
  const hero=heroes.includes(id),bossIndex=bossIds.indexOf(id);let a;
  if(bossIndex>=0){const profile=BOSS_PROFILES[bossIndex],state={type:'boss',bossProfile:profile,bossKind:profile.kind,bossPhase:1,bossState:'arrival',bossTimer:1,bossDuration:2,flash:0};a=buildBossModel(state,host.surfaces);a.userData.qaBoss=state;}
  else{a=host.character(hero?'player':id,null,hero?id:'scout',hero?($('appearance').value==='hair'?{palette:'arctic',hair:'mohawk',headwear:'none'}:$('appearance').value==='modular'?{coat:id==='biker'?'trench':'bomber',face:id==='medic'?'broad':'soft',scar:'cheek',headwear:'none'}:{}):i);for(const child of [...a.children])if(child.isMesh&&child.geometry.type==='PlaneGeometry'&&!child.material.map){disposeObjectResources(child);a.remove(child);}}
  a.position.x=(i-(list.length-1)/2)*1.85;scene.add(a);return a;
 });host.player=actors[0];time=0;frame();animate(0);
}
function animate(dt){
 time+=dt;const move=$('motion').value;
 for(const [i,a]of actors.entries()){
  if(a.userData.qaBoss){
   const state=a.userData.qaBoss,phase2=move.startsWith('phase2-'),motion=phase2?move.slice(7):move;
   state.bossPhase=phase2?2:1;state.bossState=['walk','strafe','backward'].includes(motion)?'pursuit':['telegraph','strike','recovery','transition'].includes(motion)?motion:'arrival';
   state.bossDuration=state.bossState==='strike'?.6:state.bossState==='telegraph'?1.2:2;state.bossTimer=state.bossDuration*(1-((time*.45+.55)%1));animateBossModel(a,state,time);
  }else{
   const dx=move==='strafe'?2.5:0,dz=move==='walk'?2.5:move==='backward'?-2.5:0;
   host.animateCharacter(a,time,!!(dx||dz),false,dt,{x:dx*time,z:dz*time,moveX:dx,moveZ:dz,angle:0,phase:i*.7,traversal:true,grounded:false,weapon:'carbine'});if(a.userData.type==='player'){const d=a.userData;d.arms.forEach((arm,index)=>{arm.rotation.x=-.08+Math.sin(d.gait+index*Math.PI)*d.walk*.24;arm.rotation.z=index?.04:-.04;arm.userData.elbow.rotation.x=-.15;});}host.detailedSurvivors.update(a);host.detailedSurvivors.selectDetail(a,camera,innerHeight);
  }
 }
 renderer.render(scene,camera);let triangles=0,meshes=0;for(const a of actors)a.traverse(o=>{if(o.isMesh&&o.visible&&o.layers.test(camera.layers)){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
 const labels=actors.map(a=>a.userData.qaBoss?`${a.userData.qaBoss.bossProfile.name} / phase ${a.userData.qaBoss.bossPhase} / ${a.userData.qaBoss.bossState}`:a.userData.detailedStatus||a.userData.type);
 $('stats').textContent=`${labels.join(' · ')} · ${actors.length} MODEL${actors.length>1?'S':''} · ${meshes} meshes · ${Math.round(triangles).toLocaleString()} triangles · ${renderer.info.render.calls} scene draws · ${playing?'PLAYING':'FROZEN'} · ${time.toFixed(2)}s · Drag to orbit`;
}
$('subject').onchange=setup;$('appearance').onchange=setup;$('camera').onchange=frame;$('motion').onchange=()=>{time=0;for(const a of actors)a.userData.motion={};animate(0);if($('camera').value==='face')frame();};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Freeze pose':'Play motion';$('play').setAttribute('aria-pressed',String(playing));};$('step').onclick=()=>animate(1/60);
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(actors.length)frame();}window.addEventListener('resize',resize);resize();setup();
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;controls.update();animate(playing?dt:0);requestAnimationFrame(loop);}requestAnimationFrame(loop);

window.addEventListener('pagehide',()=>{for(const a of actors){host.detailedSurvivors.release(a);disposeObjectResources(a);}host.detailedSurvivors.dispose();host.surfaces.dispose();controls.dispose();renderer.dispose();});
