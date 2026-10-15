import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {attachDetailedRook} from '../../src/rebuild/DetailedSurvivor.js';
import {buildSurvivor} from '../../src/rebuild/SurvivorVisuals.js';
import {createFirstPersonArms} from '../../src/rebuild/FirstPersonArms.js';
import {ViewRig} from '../../src/rebuild/ViewRig.js';
import {Simulation} from '../../src/rebuild/Simulation.js';
import {animateWeapons} from '../../src/rebuild/WeaponRig.js';
import {WEAPONS} from '../../src/rebuild/config.js';
import {disposeObjectResources} from '../../src/rebuild/ResourceDisposal.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture();return{name:'TEST_IMAGE_PLACEHOLDER'};});
const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url)),{scene:template}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const mesh=parent=>{const m=new T.Mesh(new T.BoxGeometry(.01,.01,.01),new T.MeshBasicMaterial());parent.add(m);return m;};
const kit={box:mesh,sphere:mesh,cylinder:mesh,batch:()=>{},remove:g=>{g.removeFromParent();disposeObjectResources(g);}};
const setup=()=>{const hero=buildSurvivor(),content=clone(template),adapter=attachDetailedRook(hero,content);hero.userData.detailedContent=content;const sim=new Simulation({seed:9});sim.start('carbine');sim.props=[];sim.obstacles=[];return{hero,content,adapter,sim};};

test('detailed FPS contains only compact forearms and hands, without face, hair or torso',()=>{
 const{hero,adapter}=setup(),arms=createFirstPersonArms(hero);assert.ok(arms);assert.ok(arms.triangles>1500&&arms.triangles<15000,`Arm triangles ${arms.triangles}`);
 assert.equal(new Set(arms.pairs.map(([,view])=>view.skeleton)).size,1,'One independent skeleton per FPS view');
 for(const[source,view]of arms.pairs){assert.notEqual(view.skeleton,source.skeleton);assert.notEqual(view.skeleton.bones[0],source.skeleton.bones[0]);assert.ok(!/Skin|Hair|Scarf|Eyes|Trousers/.test(source.material.name),`Unexpected arm material ${source.material.name}`);assert.notEqual(view.geometry,source.geometry);assert.ok(view.geometry.attributes.position.count<source.geometry.attributes.position.count);assert.notEqual(view.geometry.attributes.position.array,source.geometry.attributes.position.array);
  const indices=view.geometry.attributes.skinIndex,weights=view.geometry.attributes.skinWeight;for(let vertex=0;vertex<indices.count;vertex++){let forearmWeight=0;for(let i=0;i<4;i++)if(/^(lowerarm|wrist|metacarpal|finger)/i.test(view.skeleton.bones[indices.getComponent(vertex,i)].name))forearmWeight+=weights.getComponent(vertex,i);assert.ok(forearmWeight>=1-1e-6,'Sleeve vertices must not retain isolated shoulder influences');}
 }
 arms.dispose();adapter.dispose();disposeObjectResources(hero);
});

test('skinned FPS hand vertices exactly follow live grips through every weapon family',()=>{
 const{hero,adapter,sim}=setup(),arms=createFirstPersonArms(hero),overlay=new T.Group(),point=new T.Vector3(),expected=new T.Vector3(),inverseBody=new T.Matrix4(),inverseOverlay=new T.Matrix4();overlay.position.set(-8,3,12);overlay.rotation.set(.2,1.1,.1);overlay.scale.setScalar(.81);overlay.add(arms.root);hero.position.set(12,5,-3);hero.rotation.y=.7;
 for(const key of Object.keys(WEAPONS))for(const paired of [false,true]){
  sim.setLoadout(paired&&!WEAPONS[key].melee?[key,key]:[key]);for(let i=0;i<4;i++){
   const t=i*.13;hero.userData.body.rotation.set(Math.sin(t)*.3,.11,-.2);sim.player.shots[key]={time:0,weapon:key,variant:i};sim.player.reloads[key]=i===3?.45:0;sim.player.aimPitch=.2;
   animateWeapons(hero,sim.player,t,0,{...kit,firstPerson:true});adapter.update();arms.update();hero.updateMatrixWorld(true);overlay.updateMatrixWorld(true);inverseBody.copy(hero.userData.body.matrixWorld).invert();inverseOverlay.copy(overlay.matrixWorld).invert();
   let checkedHands=0;for(const[source,view]of arms.pairs){source.skeleton.update();view.skeleton.update();for(let index=0;index<view.geometry.attributes.position.count;index+=17){const indices=view.geometry.attributes.skinIndex,weights=view.geometry.attributes.skinWeight;let forearm=false;for(let channel=0;channel<4;channel++)if(weights.getComponent(index,channel)>.0001&&/^lowerarm/.test(view.skeleton.bones[indices.getComponent(index,channel)].name))forearm=true;if(forearm)continue;checkedHands++;source.getVertexPosition(view.geometry.userData.sourceVertices[index],expected).applyMatrix4(source.matrixWorld).applyMatrix4(inverseBody);view.getVertexPosition(index,point).applyMatrix4(view.matrixWorld).applyMatrix4(inverseOverlay);assert.ok(point.distanceTo(expected)<1e-5,`${key}: FPS hand vertex drift ${point.distanceTo(expected)}`);}}assert.ok(checkedHands>8,`No meaningful hand samples for ${key}: ${checkedHands}`);
  }
 }
 arms.dispose();adapter.dispose();disposeObjectResources(hero);
});

test('FPS detailed resources release once without disposing borrowed world materials, geometry or textures',()=>{
 const{hero,adapter}=setup(),arms=createFirstPersonArms(hero);let owned=0,borrowed=0;const resources=new Set();for(const[source,view]of arms.pairs){view.geometry.addEventListener('dispose',()=>owned++);resources.add(source.geometry);resources.add(source.material);}for(const resource of resources)resource.addEventListener('dispose',()=>borrowed++);const count=arms.pairs.length;arms.dispose();arms.dispose();assert.equal(owned,count);assert.equal(borrowed,0);adapter.update();adapter.dispose();disposeObjectResources(hero);
});

test('late detailed activation replaces only sleeves and preserves fallback and weapon overlays',()=>{
 const{hero,adapter,sim}=setup(),source=hero.userData.detailedContent;delete hero.userData.detailedContent;animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});const rig=new ViewRig();rig.active=true;rig.setMode('first');rig.update(sim,16/9,0);rig.syncHands(hero,sim,new T.Scene());const hands=rig.hands;assert.equal(rig.detailedArms,null);
 hero.userData.detailedContent=source;rig.syncHands(hero,sim,new T.Scene());assert.equal(rig.hands,hands);assert.ok(rig.detailedArms);assert.ok(rig.pairs.some(([s,c])=>s.isMesh&&s.layers.mask===4&&!c.visible));assert.ok(rig.pairs.some(([s,c])=>s.isMesh&&s.layers.mask!==4&&c.visible));
 delete hero.userData.detailedContent;rig.syncHands(hero,sim,new T.Scene());assert.equal(rig.detailedArms,null);assert.ok(rig.pairs.some(([s,c])=>s.isMesh&&s.layers.mask===4&&c.visible));rig.clearHands();adapter.dispose();disposeObjectResources(hero);
});
test('FPS ignores distant LOD meshes and selects high-detail arms even when world LOD0 is hidden',()=>{
 const{hero,content,adapter}=setup();let source;content.traverse(o=>{if(!source&&o.isSkinnedMesh&&o.material.name.includes('jacket'))source=o;});assert.ok(source);
 const lower=source.clone();lower.name='LOD1 duplicate';lower.userData.castLOD=1;source.parent.add(lower);source.visible=false;const arms=createFirstPersonArms(hero);assert.ok(arms);assert.ok(arms.pairs.some(([original])=>original===source));assert.ok(arms.pairs.every(([original])=>original!==lower));arms.update();assert.ok(arms.pairs.every(([,view])=>view.visible));arms.dispose();lower.removeFromParent();adapter.dispose();disposeObjectResources(hero);
});

test('FPS sleeve origins remain below the viewport while wrists retain source positions',()=>{
 const{hero,adapter,sim}=setup(),rig=new ViewRig();rig.active=true;rig.setMode('first');
 for(const aspect of [16/9,390/844])for(const key of ['carbine','katana','dual']){
  sim.setLoadout([key]);animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});adapter.update();rig.update(sim,aspect,0);rig.syncHands(hero,sim,new T.Scene());rig.handsScene.updateMatrixWorld(true);
  for(const side of ['L','R']){const elbow=rig.detailedArms.root.getObjectByName('lowerarm01'+side);assert.ok(elbow);const projected=elbow.getWorldPosition(new T.Vector3()).project(rig.camera);assert.ok(projected.y<-1.05,`Sleeve origin visible at ${projected.y} for ${key}/${aspect}`);}
 }
 rig.clearHands();adapter.dispose();disposeObjectResources(hero);
});
