import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DetailedSurvivorLibrary} from '../../src/rebuild/DetailedSurvivor.js';
import {buildSurvivor} from '../../src/rebuild/SurvivorVisuals.js';
import {detailedIdentityCompatible} from '../../src/rebuild/CharacterDetail.js';
import {detailedAppearanceChanges} from '../../src/rebuild/DetailedAppearance.js';
import {dressArmour} from '../../src/rebuild/RPGVisuals.js';
import {ARMOUR} from '../../src/rebuild/RPG.js';
import {disposeObjectResources} from '../../src/rebuild/ResourceDisposal.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const files={scout:'rook-cast-runtime-v7.glb',medic:'saint-v1.glb',biker:'torque-v1.glb',ronin:'vesper-v1.glb'},loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture();return{name:'TEST_IMAGE_PLACEHOLDER'};});
async function load(skin){const bytes=await readFile(new URL(`../../assets/characters/${files[skin]}`,import.meta.url));return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
const eachMesh=(root,fn)=>root.traverse(o=>{if(o.isMesh)fn(o);});

test('supported hair/headwear choices keep detailed identities while unimplemented geometric choices retain honest fallback',()=>{
 for(const skin of Object.keys(files)){
  assert.equal(detailedIdentityCompatible(skin,{hair:'mohawk',headwear:'hood'}),true);
  assert.equal(detailedIdentityCompatible(skin,{eyes:'blue'}),false);
  const coat=skin==='biker'?'trench':'bomber';assert.equal(detailedIdentityCompatible(skin,{hair:'mohawk',coat}),false);
 }
});
for(const skin of Object.keys(files))test(`${skin}: changed hair/headwear preserves authored body, fits retained cosmetics and obeys helmets at both LODs`,async()=>{
 const library=new DetailedSurvivorLibrary({load}),camera=new T.OrthographicCamera(-20,20,20,-20,.1,100);
 try{for(const custom of [{hair:'mohawk'},{headwear:'hood'},{hair:'shaved',headwear:'none'}]){
  const hero=buildSurvivor(skin,custom);library.request(hero);assert.ok(library.assets.get(skin),`${skin}: custom character rejected`);await library.assets.get(skin).promise;await Promise.resolve();assert.equal(hero.userData.detailedStatus,'ready');
  const content=hero.userData.detailedContent,changed=detailedAppearanceChanges(skin,custom),bodyGeometry=new Map();eachMesh(content,mesh=>{if(mesh.material.name.startsWith('Skin /'))bodyGeometry.set(mesh,mesh.geometry);});assert.ok(bodyGeometry.size>0);
  const p={skin,appearance:custom,armour:{},dye:'field'};
  for(const level of [0,1,0]){
   camera.top=level?20:3;camera.bottom=-camera.top;library.selectDetail(hero,camera,720);dressArmour(hero,p);library.update(hero);
   for(const key of ['hair','headwear']){if(!changed[key])continue;const group=hero.userData[key==='headwear'?'hat':'hair'];assert.ok(group.visible);assert.ok([...group.scale,...group.position].every(Number.isFinite));assert.ok(group.scale.x>.2&&group.scale.x<2.5);assert.ok(group.scale.distanceTo(new T.Vector3(1,1,1))>.05,'Cosmetics must fit the authored skull rather than retain the larger procedural head size');eachMesh(group,mesh=>assert.ok(mesh.layers.isEnabled(0),`${skin}: selected ${key} remains hidden`));}
   eachMesh(content,mesh=>{const name=mesh.material.name;if(changed.hair&&name.startsWith('Hair /'))assert.equal(mesh.visible,false);if(changed.headwear&&skin!=='biker'&&name.startsWith('Headwear /'))assert.equal(mesh.visible,false);if(skin==='biker'&&name.startsWith('Headwear /'))assert.equal(mesh.visible,(mesh.userData.castLOD||0)===level,'Headwear selection must preserve selected goggles');});
   for(const [mesh,geometry]of bodyGeometry)assert.equal(mesh.geometry,geometry,'Changing hair must not replace face/body geometry');
   p.armour={head:Object.entries(ARMOUR).find(([,entry])=>entry.slot==='head')[0]};dressArmour(hero,p);library.update(hero);assert.equal(hero.userData.hair.visible,false);assert.equal(hero.userData.hat.visible,false);eachMesh(content,mesh=>{if(/^(Hair|Headwear) \//.test(mesh.material.name))assert.equal(mesh.visible,false);});
   p.appearance={...custom,hideHelmet:'yes'};dressArmour(hero,p);library.update(hero);assert.equal(hero.userData.hair.visible,true);assert.equal(hero.userData.hat.visible,true);
   p.armour={};p.appearance=custom;
  }
  library.release(hero);for(const key of ['hair','hat']){assert.deepEqual(hero.userData[key].scale.toArray(),[1,1,1]);assert.deepEqual(hero.userData[key].position.toArray(),[0,0,0]);eachMesh(hero.userData[key],mesh=>assert.equal(mesh.layers.mask,1));}disposeObjectResources(hero);
 }}finally{library.dispose();}
});
test('async attachment during a turned airborne pose fits cosmetics identically to a neutral load',async()=>{
 for(const skin of Object.keys(files)){
  const library=new DetailedSurvivorLibrary({load}),custom={hair:'mohawk',headwear:'hood'},neutral=buildSurvivor(skin,custom),posed=buildSurvivor(skin,custom);
  posed.position.set(14,3,-6);posed.rotation.y=1.4;posed.userData.body.rotation.set(.27,-.16,.2);posed.userData.head.rotation.set(-.12,.23,.07);
  try{library.request(neutral);library.request(posed);await library.assets.get(skin).promise;await Promise.resolve();assert.equal(neutral.userData.detailedStatus,'ready');assert.equal(posed.userData.detailedStatus,'ready');
   for(const key of ['hair','hat']){assert.ok(neutral.userData[key].position.distanceTo(posed.userData[key].position)<1e-5,`${skin}/${key}: attachment-pose-dependent position`);assert.ok(neutral.userData[key].scale.distanceTo(posed.userData[key].scale)<1e-5,`${skin}/${key}: attachment-pose-dependent scale`);}
  }finally{library.dispose();disposeObjectResources(neutral);disposeObjectResources(posed);}
 }
});
