// Actual asset geometry and lifecycle regressions; these do not assess rendered art quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DetailedSurvivorLibrary} from '../../src/rebuild/DetailedSurvivor.js';
import {DETAILED_IDENTITIES} from '../../src/rebuild/CharacterDetail.js';
import {buildSurvivor} from '../../src/rebuild/SurvivorVisuals.js';
import {createFirstPersonArms} from '../../src/rebuild/FirstPersonArms.js';
import {ViewRig} from '../../src/rebuild/ViewRig.js';
import {Simulation} from '../../src/rebuild/Simulation.js';
import {animateWeapons} from '../../src/rebuild/WeaponRig.js';
import {dressArmour} from '../../src/rebuild/RPGVisuals.js';
import {ARMOUR} from '../../src/rebuild/RPG.js';
import {WEAPONS} from '../../src/rebuild/config.js';
import {disposeObjectResources} from '../../src/rebuild/ResourceDisposal.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const files={scout:'rook-cast-runtime-v7.glb',medic:'saint-v1.glb',biker:'torque-v1.glb',ronin:'vesper-v1.glb'};
const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture();return{name:'TEST_IMAGE_PLACEHOLDER'};});
async function load(skin){const bytes=await readFile(new URL(`../../assets/characters/${files[skin]}`,import.meta.url));return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
const mesh=parent=>{const m=new T.Mesh(new T.BoxGeometry(.01,.01,.01),new T.MeshBasicMaterial());parent.add(m);return m;};
const kit={box:mesh,sphere:mesh,cylinder:mesh,batch:()=>{},remove:g=>{g.removeFromParent();disposeObjectResources(g);}};
const camera=new T.OrthographicCamera(-20,20,20,-20,.1,100);
async function install(library,skin,custom={}){const hero=buildSurvivor(skin,custom);library.request(hero);await library.assets.get(skin).promise;await Promise.resolve();assert.equal(hero.userData.detailedStatus,'ready',`${skin} runtime load`);return hero;}
function meshes(root){const found=[];root.traverse(o=>{if(o.isSkinnedMesh)found.push(o);});return found;}

for(const skin of Object.keys(files)){
 test(`${skin}: actual cast wrists and FPS hands retain every weapon and paired grip`,async()=>{
  const library=new DetailedSurvivorLibrary({load}),hero=await install(library,skin),content=hero.userData.detailedContent,arms=createFirstPersonArms(hero),sim=new Simulation({seed:19});sim.start('carbine');
  assert.ok(arms?.triangles>500);const overlay=new T.Group();overlay.rotation.set(.2,.9,-.1);overlay.position.set(-3,8,12);overlay.scale.setScalar(.77);overlay.add(arms.root);
  hero.position.set(15,4,-7);hero.rotation.y=.8;const inverseBody=new T.Matrix4(),inverseOverlay=new T.Matrix4(),actual=new T.Vector3(),expected=new T.Vector3();
  try{for(const weapon of Object.keys(WEAPONS))for(const paired of [false,true,'mixed']){
   sim.setLoadout(paired&&!WEAPONS[weapon].melee?[weapon,paired==='mixed'?(weapon==='flame'?'arc':'flame'):weapon]:[weapon]);
   for(let frame=0;frame<4;frame++){
    const time=frame*.13;hero.userData.body.rotation.set(Math.sin(time)*.25,.12,-.13);sim.player.shots[weapon]={time:0,weapon,variant:frame};sim.player.reloads[weapon]=frame===3?.4:0;sim.player.aimPitch=(frame-1.5)*.2;
    animateWeapons(hero,sim.player,time,1/60,{...kit,firstPerson:true});library.update(hero);arms.update();hero.updateMatrixWorld(true);overlay.updateMatrixWorld(true);
    inverseBody.copy(hero.userData.body.matrixWorld).invert();inverseOverlay.copy(overlay.matrixWorld).invert();
    for(const[index,side]of [[0,'R'],[1,'L']]){content.getObjectByName('wrist'+side).getWorldPosition(actual);hero.userData.arms[index].userData.wrist.getWorldPosition(expected);assert.ok(actual.distanceTo(expected)<1e-6,`${skin}/${weapon}: wrist mismatch`);}
    let samples=0;for(const[source,view]of arms.pairs){assert.equal(source.userData.castLOD||0,0);source.skeleton.update();view.skeleton.update();const indices=view.geometry.attributes.skinIndex,weights=view.geometry.attributes.skinWeight;
     for(let index=0;index<indices.count;index+=17){let forearm=false;for(let channel=0;channel<4;channel++)if(weights.getComponent(index,channel)>.0001&&/^lowerarm/.test(view.skeleton.bones[indices.getComponent(index,channel)].name))forearm=true;if(forearm)continue;samples++;
      source.getVertexPosition(view.geometry.userData.sourceVertices[index],expected).applyMatrix4(source.matrixWorld).applyMatrix4(inverseBody);view.getVertexPosition(index,actual).applyMatrix4(view.matrixWorld).applyMatrix4(inverseOverlay);assert.ok(actual.distanceTo(expected)<1e-5,`${skin}/${weapon}: FPS hand drift ${actual.distanceTo(expected)}`);
     }
    }assert.ok(samples>8,`${skin}/${weapon}: missing hand geometry`);
    content.traverse(o=>{if(o.isBone)assert.ok(o.matrixWorld.elements.every(Number.isFinite),`${skin}/${weapon}: invalid ${o.name}`);});
   }
  }}finally{arms.dispose();library.dispose();disposeObjectResources(hero);}
 });
 test(`${skin}: actual high and low skins remain bounded through walking and airborne poses`,async()=>{
  const library=new DetailedSurvivorLibrary({load}),hero=await install(library,skin),content=hero.userData.detailedContent,skins=meshes(content),inverse=new T.Matrix4(),point=new T.Vector3(),box=new T.Box3();hero.position.set(41,2,-17);hero.rotation.y=1.9;
  try{for(let frame=0;frame<20;frame++){
   const phase=frame/20*Math.PI*2;hero.userData.body.rotation.set(Math.sin(phase)*.3,Math.cos(phase)*.15,Math.sin(phase)*.2);
   for(const[index,leg]of hero.userData.legs.entries()){leg.rotation.x=Math.sin(phase+index*Math.PI)*.55;leg.userData.knee.rotation.x=Math.max(0,Math.cos(phase+index*Math.PI))*.75;}
   for(const[index,arm]of hero.userData.arms.entries()){arm.rotation.set(-.9-Math.sin(phase)*.7,0,(index?1:-1)*.2);arm.userData.elbow.rotation.x=-.8;}
   library.update(hero);hero.updateMatrixWorld(true);inverse.copy(hero.matrixWorld).invert();box.makeEmpty();
   for(const mesh of skins){mesh.skeleton.update();for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex+=71){mesh.getVertexPosition(vertex,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);assert.ok(point.toArray().every(Number.isFinite));box.expandByPoint(point);}}
   const size=box.getSize(new T.Vector3());assert.ok(size.x<2.4&&size.y<2.7&&size.z<2.7,`${skin}: unstable skinned bounds ${size.toArray()}`);
  }}finally{library.dispose();disposeObjectResources(hero);}
 });
 test(`${skin}: palette variants, helmet visibility, high-only FPS and repeated releases preserve cached resources`,async()=>{
  let calls=0;const library=new DetailedSurvivorLibrary({load:identity=>{calls++;return load(identity);}}),counts=new Map(),watch=resource=>{if(resource&&!counts.has(resource)){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}};
  try{for(let pass=0;pass<3;pass++){
   const custom=pass?{palette:'arctic',skin:'ebony',hairColor:'silver'}:{},hero=await install(library,skin,custom),content=hero.userData.detailedContent,sim=new Simulation({seed:31});sim.start('carbine');sim.player.skin=skin;sim.player.appearance=custom;sim.props=[];sim.obstacles=[];
   assert.equal(hero.userData.detailedModel,DETAILED_IDENTITIES[skin]);const asset=library.assets.get(skin);asset.template.traverse(o=>{if(o.geometry)watch(o.geometry);for(const material of [].concat(o.material||[])){watch(material);for(const value of Object.values(material))if(value?.isTexture)watch(value);}});
   const materials=new Set(),skeletons=new Set();content.traverse(o=>{if(o.isSkinnedMesh){materials.add(o.material);skeletons.add(o.skeleton);}});let materialDisposals=0,skeletonDisposals=0;for(const material of materials)material.addEventListener('dispose',()=>materialDisposals++);for(const skeleton of skeletons){const dispose=skeleton.dispose.bind(skeleton);skeleton.dispose=()=>{skeletonDisposals++;dispose();};}
   library.selectDetail(hero,camera,720);assert.equal(hero.userData.detailedLOD,1);const hair=meshes(content).filter(o=>/^(Hair|Headwear) \//.test(o.material.name));assert.ok(hair.length>0,`${skin}: no separable hair/headwear`);
   sim.player.armour={head:Object.entries(ARMOUR).find(([,entry])=>entry.slot==='head')[0]};dressArmour(hero,sim.player);library.update(hero);for(const part of hair)assert.equal(part.visible,false,`${skin}: helmet left authored hair/headwear visible`);
   sim.player.appearance={...custom,hideHelmet:'yes'};dressArmour(hero,sim.player);library.update(hero);for(const part of hair)assert.equal(part.visible,(part.userData.castLOD||0)===1);
   animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});library.update(hero);const rig=new ViewRig();rig.active=true;rig.setMode('first');rig.update(sim,16/9,0);rig.syncHands(hero,sim,new T.Scene());assert.ok(rig.detailedArms);assert.ok(rig.detailedArms.pairs.every(([source,view])=>(source.userData.castLOD||0)===0&&view.visible));
   rig.clearHands();library.release(hero);library.release(hero);assert.equal(materialDisposals,materials.size);assert.equal(skeletonDisposals,skeletons.size);assert.equal(hero.userData.detailedContent,undefined);assert.ok([...counts.values()].every(count=>count===0),'Instance disposed cache resource');disposeObjectResources(hero);
  }assert.equal(calls,1,'Repeated appearance switches should reuse one asset');
  }finally{library.dispose();library.dispose();}
  assert.ok(counts.size>5);assert.ok([...counts.values()].every(count=>count===1),'Cached resources must be disposed exactly once');
 });
}
