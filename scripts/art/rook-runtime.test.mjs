import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {attachDetailedRook,detailedRookCompatible,DetailedSurvivorLibrary,prepareRookHelmetGeometry} from '../../src/rebuild/DetailedSurvivor.js';
import {buildSurvivor} from '../../src/rebuild/SurvivorVisuals.js';
import {Simulation} from '../../src/rebuild/Simulation.js';
import {animateWeapons} from '../../src/rebuild/WeaponRig.js';
import {dressArmour} from '../../src/rebuild/RPGVisuals.js';
import {ARMOUR} from '../../src/rebuild/RPG.js';
import {WEAPONS} from '../../src/rebuild/config.js';
import {disposeObjectResources} from '../../src/rebuild/ResourceDisposal.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture();return{name:'TEST_IMAGE_PLACEHOLDER'};});
const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url));
const load=()=>loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=(await load()).scene;
const mesh=parent=>{const m=new T.Mesh(new T.BoxGeometry(.01,.01,.01),new T.MeshBasicMaterial());parent.add(m);return m;};
const kit={box:mesh,sphere:mesh,cylinder:mesh,batch:()=>{},remove:g=>{g.removeFromParent();disposeObjectResources(g);}};
test('detailed Rook preserves selected identities and incompatible customizations',()=>{
 assert.equal(detailedRookCompatible('scout',{}),true);assert.equal(detailedRookCompatible('scout',{hideHelmet:'yes'}),true);
 for(const skin of ['medic','biker','ronin'])assert.equal(detailedRookCompatible(skin,{}),false);
 for(const appearance of [{hair:'braids'},{palette:'indigo'},{headwear:'none'},{coat:'bomber'}])assert.equal(detailedRookCompatible('scout',appearance),false);
});
test('actual v7 rig follows live weapon wrists for every melee, gun and dual slot',()=>{
 const hero=buildSurvivor(),content=clone(template),adapter=attachDetailedRook(hero,content),sim=new Simulation({seed:12});sim.start('carbine');
 const bones=new Map();content.traverse(o=>{if(o.isBone)bones.set(o.name,o);});let worst=0,worstCase;
 for(const key of Object.keys(WEAPONS))for(const paired of [false,true]){
  sim.setLoadout(paired&&!WEAPONS[key].melee?[key,key]:[key]);
  for(let i=0;i<24;i++){
   const t=i/24;sim.player.shots[key]={time:0,weapon:key,variant:i%4};sim.player.reloads[key]=i>12?(24-i)/24:0;sim.player.aimPitch=(i/23-.5)*.8;
   animateWeapons(hero,sim.player,t,1/60,kit);adapter.update();if(hero.userData.gripError>worst){worst=hero.userData.gripError;worstCase=[key,paired,i];}
   for(const [index,side]of [[0,'R'],[1,'L']])assert.ok(bones.get('wrist'+side).getWorldPosition(new T.Vector3()).distanceTo(hero.userData.arms[index].userData.wrist.getWorldPosition(new T.Vector3()))<1e-6);
   content.traverse(o=>{if(o.isBone)assert.ok([...o.position,...o.quaternion,...o.scale].every(Number.isFinite));});
  }
 }
 assert.ok(worst<.04,`Live grip reach error ${worst} ${worstCase}`);adapter.dispose();disposeObjectResources(hero);
});
test('late model loading cannot attach to a released character or closed world',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;}),lib=new DetailedSurvivorLibrary({load:()=>pending}),hero=buildSurvivor();lib.request(hero);lib.release(hero);finish(await load());await lib.promise;await Promise.resolve();assert.equal(lib.instances.size,0);assert.equal(hero.userData.detailedModel,undefined);lib.dispose();disposeObjectResources(hero);
});
test('model load failure retains fully functioning procedural survivor',async()=>{
 const lib=new DetailedSurvivorLibrary({load:()=>Promise.reject(new Error('offline'))}),hero=buildSurvivor();lib.request(hero);await lib.promise.catch(()=>{});await Promise.resolve();assert.equal(hero.userData.detailedStatus,'fallback');assert.equal(lib.instances.size,0);assert.ok(hero.userData.body.children.length);lib.dispose();disposeObjectResources(hero);
});
test('retargeted skins remain bounded through rotated walking, airborne, and melee poses',()=>{
 const hero=buildSurvivor(),content=clone(template),adapter=attachDetailedRook(hero,content),skins=[];content.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});hero.position.set(41,2,-17);hero.rotation.y=1.9;
 const inverse=new T.Matrix4(),vertices=[];
 for(let frame=0;frame<32;frame++){
  const phase=frame/32*Math.PI*2;hero.userData.body.rotation.set(Math.sin(phase)*.3,Math.cos(phase)*.15,Math.sin(phase)*.2);
  for(const [index,leg]of hero.userData.legs.entries()){leg.rotation.x=Math.sin(phase+index*Math.PI)*.55;leg.userData.knee.rotation.x=Math.max(0,Math.cos(phase+index*Math.PI))*.75;}
  for(const [index,arm]of hero.userData.arms.entries()){arm.rotation.set(-.9-Math.sin(phase)*.7,0,(index?1:-1)*.2);arm.userData.elbow.rotation.x=-.8;}
  adapter.update();inverse.copy(hero.matrixWorld).invert();vertices.length=0;
  for(const skin of skins){skin.skeleton.update();for(let index=0;index<skin.geometry.attributes.position.count;index+=97)vertices.push(skin.getVertexPosition(index,new T.Vector3()).applyMatrix4(skin.matrixWorld).applyMatrix4(inverse));}
  const size=new T.Box3().setFromPoints(vertices).getSize(new T.Vector3());assert.ok([...size].every(Number.isFinite));assert.ok(size.x<2&&size.y<2.5&&size.z<2.5,`Invalid skin extent ${size.toArray()}`);
 }
 adapter.dispose();disposeObjectResources(hero);
});
test('instances have independent skeletons and fading materials; shared assets survive an instance release',async()=>{
 let loads=0;const library=new DetailedSurvivorLibrary({load:()=>{loads++;return load();}}),a=buildSurvivor(),b=buildSurvivor();library.request(a);library.request(b);await library.promise;await Promise.resolve();assert.equal(loads,1);assert.equal(library.instances.size,2);
 const meshes=hero=>{const result=[];library.instances.get(hero).content.traverse(o=>{if(o.isSkinnedMesh)result.push(o);});return result;},ma=meshes(a),mb=meshes(b);assert.equal(ma.length,10);
 assert.notEqual(ma[0].skeleton,mb[0].skeleton);assert.notEqual(ma[0].material,mb[0].material);assert.equal(ma[0].geometry,mb[0].geometry);
 let geometryDisposals=0,capDisposals=0;assert.equal(library.helmetGeometry.size,2);for(const geometry of library.helmetGeometry.values())geometry.addEventListener('dispose',()=>capDisposals++);ma[0].geometry.addEventListener('dispose',()=>geometryDisposals++);library.release(a);assert.equal(geometryDisposals,0);assert.equal(capDisposals,0);assert.equal(library.instances.size,1);library.update(b);library.dispose();assert.equal(geometryDisposals,1);assert.equal(capDisposals,2);assert.equal(library.instances.size,0);disposeObjectResources(a);disposeObjectResources(b);
});

test('late model completion leaves equipped weapons and armour visible',async()=>{
 let finish;const promise=new Promise(resolve=>{finish=resolve;}),library=new DetailedSurvivorLibrary({load:()=>promise}),hero=buildSurvivor(),sim=new Simulation({seed:9});sim.start('carbine');library.request(hero);
 sim.player.armour={};for(const slot of ['head','chest','legs'])sim.player.armour[slot]=Object.entries(ARMOUR).find(([,entry])=>entry.slot===slot)[0];
 dressArmour(hero,sim.player);animateWeapons(hero,sim.player,0,0,kit);const attachments=[...hero.userData.armourParts,...hero.userData.weaponRigs.filter(Boolean)];
 finish(await load());await library.promise;await Promise.resolve();assert.equal(hero.userData.detailedStatus,'ready');
 for(const attachment of attachments)attachment.traverse(o=>{if(o.isMesh)assert.ok(o.layers.test(new T.Layers()),'Loaded hero hid existing equipment');});library.dispose();disposeObjectResources(hero);
});
test('actual detailed Rook keeps a visible first-person weapon and independently rendered sleeves',async()=>{
 const {ViewRig}=await import('../../src/rebuild/ViewRig.js');const hero=buildSurvivor(),content=clone(template),adapter=attachDetailedRook(hero,content),sim=new Simulation({seed:4});sim.start('carbine');sim.props=[];sim.obstacles=[];
 const rig=new ViewRig();rig.setMode('first');rig.active=true;rig.update(sim,16/9,0);animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});adapter.update();rig.syncHands(hero,sim,new T.Scene());rig.handsScene.updateMatrixWorld(true);
 assert.equal(rig.hands.visible,true);assert.ok([...rig.hands.position,...rig.hands.scale].every(Number.isFinite));let visibleSleeves=0,visibleWeapon=0;
 const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(rig.camera.projectionMatrix,rig.camera.matrixWorldInverse));
 for(const[source,copy]of rig.pairs){if(!copy.isMesh||!copy.visible)continue;assert.ok(copy.layers.test(rig.camera.layers));if(frustum.intersectsObject(copy)){if(source.layers.mask===4)visibleSleeves++;else visibleWeapon++;}}
 assert.ok(visibleSleeves>0,'No source sleeve is visible in camera');assert.ok(visibleWeapon>0,'No weapon mesh is visible in camera');rig.clearHands();adapter.dispose();disposeObjectResources(hero);
});

test('equipped helmets hide only the authored cap and hair; hideHelmet restores exact original indices',()=>{
 const hero=buildSurvivor(),content=clone(template),originals=new Map();content.traverse(mesh=>{if(mesh.isMesh)originals.set(mesh,mesh.geometry);});
 const variants=prepareRookHelmetGeometry(content);assert.equal(variants.size,2);
 // Prove the mask keeps all jacket, gloves, boots and other non-cap triangles.
 for(const [full,masked]of variants){const mesh=[...originals].find(([,geometry])=>geometry===full)[0],allowed=new Set();
  for(let i=0;i<masked.index.count;i+=3)allowed.add([masked.index.getX(i),masked.index.getX(i+1),masked.index.getX(i+2)].join(','));
  let removed=0;for(let i=0;i<full.index.count;i+=3){const ids=[full.index.getX(i),full.index.getX(i+1),full.index.getX(i+2)],points=ids.map(id=>mesh.getVertexPosition(id,new T.Vector3()).applyMatrix4(mesh.matrixWorld));if(!allowed.has(ids.join(','))){removed++;assert.ok(points.every(p=>p.y>1.73));}}
  assert.ok(removed>0);for(const key of Object.keys(full.attributes))assert.equal(masked.attributes[key],full.attributes[key],'mask must not modify or duplicate original skin attributes');
 }
 const adapter=attachDetailedRook(hero,content,undefined,variants),sim=new Simulation({seed:4});sim.start('carbine');sim.player.armour={head:Object.values(ARMOUR).find(a=>a.slot==='head').id};
 dressArmour(hero,sim.player);adapter.update();
 for(const [mesh,full]of originals){if(variants.has(full))assert.equal(mesh.geometry,variants.get(full));else assert.equal(mesh.geometry,full);if(mesh.material?.name.startsWith('Hair /'))assert.equal(mesh.visible,false);}
 sim.player.appearance={hideHelmet:'yes'};dressArmour(hero,sim.player);adapter.update();for(const[mesh,full]of originals){assert.equal(mesh.geometry,full);if(mesh.material?.name.startsWith('Hair /'))assert.equal(mesh.visible,true);}
 adapter.dispose();for(const geometry of variants.values())geometry.dispose();disposeObjectResources(hero);
});
test('late detail load preserves an already-created FPS overlay through paused camera changes',async()=>{
 const {ViewRig}=await import('../../src/rebuild/ViewRig.js');let finish;const pending=new Promise(resolve=>{finish=resolve;}),library=new DetailedSurvivorLibrary({load:()=>pending}),hero=buildSurvivor(),sim=new Simulation({seed:5});sim.start('carbine');sim.props=[];sim.obstacles=[];
 library.request(hero);animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});const rig=new ViewRig(),scene=new T.Scene();rig.active=true;rig.setMode('first');rig.update(sim,16/9,0);rig.syncHands(hero,sim,scene);const overlay=rig.hands;
 finish(await load());await library.promise;await Promise.resolve();animateWeapons(hero,sim.player,0,0,{...kit,firstPerson:true});library.update(hero);rig.syncHands(hero,sim,scene);assert.equal(rig.hands,overlay);assert.ok(rig.pairs.some(([source,copy])=>source.layers.mask===4&&copy.isMesh&&copy.visible&&copy.layers.test(rig.camera.layers)));
 for(const mode of ['third','first','third','first']){rig.setMode(mode);rig.update(sim,16/9,0);rig.distance=.4;rig.fadeAvatar(hero);rig.syncHands(hero,sim,scene);assert.equal(rig.hands.visible,mode==='first');if(mode==='first')for(const[,copy]of rig.pairs)if(copy.isMesh&&copy.visible)assert.ok(copy.material.opacity>0);}
 rig.clearHands();library.dispose();disposeObjectResources(hero);
});
test('packed production GLB supports the same live rig and helmet index variants',async()=>{
 const packed=await readFile(new URL('../../assets/characters/rook-runtime-v7.glb',import.meta.url)),{scene}=await loader.parseAsync(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength),'');
 const hero=buildSurvivor(),adapter=attachDetailedRook(hero,scene),sim=new Simulation({seed:8});sim.start('carbine');sim.setLoadout(['carbine','flame']);animateWeapons(hero,sim.player,0,0,kit);adapter.update();
 let meshes=0,bones=0;scene.traverse(o=>{if(o.isSkinnedMesh)meshes++;if(o.isBone){bones++;assert.ok([...o.position,...o.quaternion].every(Number.isFinite));}});assert.equal(meshes,10);assert.equal(bones,163);assert.ok(hero.userData.gripError<.04);
 hero.userData.hat.visible=false;adapter.update();assert.equal(hero.userData.detailedModel,'rook-v7');adapter.dispose();disposeObjectResources(hero);
});
