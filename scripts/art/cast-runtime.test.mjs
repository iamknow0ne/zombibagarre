import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {PALETTES} from '../../src/rebuild/Customization.js';
import {detailedIdentityCompatible,characterDetailLevel,tintDetailedIdentity} from '../../src/rebuild/CharacterDetail.js';
import {DetailedSurvivorLibrary,attachDetailedRook} from '../../src/rebuild/DetailedSurvivor.js';
import {buildSurvivor} from '../../src/rebuild/SurvivorVisuals.js';
import {disposeObjectResources} from '../../src/rebuild/ResourceDisposal.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture();return{name:'TEST_IMAGE_PLACEHOLDER'};});
const bytes=await readFile(new URL('../../assets/characters/rook-cast-runtime-v7.glb',import.meta.url));
const load=()=>loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');

test('all four authored identities preserve geometry selections and accept explicit color changes',()=>{
 for(const skin of ['scout','medic','biker','ronin']){
  assert.ok(detailedIdentityCompatible(skin,{}));
  assert.ok(detailedIdentityCompatible(skin,{palette:'arctic',skin:'ebony',hairColor:'silver',hideHelmet:'yes'}));
  assert.equal(detailedIdentityCompatible(skin,{hair:'mohawk'}),true);
  assert.equal(detailedIdentityCompatible(skin,{coat:skin==='biker'?'trench':'bomber'}),false);
 }
 assert.equal(detailedIdentityCompatible('unknown',{}),false);
 assert.equal(detailedIdentityCompatible('scout',{eyes:'blue'}),false,'Shared eye atlas cannot tint only iris');
});
test('detail uses screen size with hysteresis in orthographic and perspective cameras',()=>{
 const camera=new T.OrthographicCamera(-10,10,10,-10,.1,100),p=new T.Vector3();
 assert.equal(characterDetailLevel(camera,p,720),1);camera.top=5;camera.bottom=-5;assert.equal(characterDetailLevel(camera,p,720,1),0);
 camera.top=6.5;camera.bottom=-6.5;assert.equal(characterDetailLevel(camera,p,720,0),0);assert.equal(characterDetailLevel(camera,p,720,1),1);
 const persp=new T.PerspectiveCamera(60,16/9,.1,100);persp.position.z=25;persp.updateMatrixWorld();assert.equal(characterDetailLevel(persp,p,720),1);persp.position.z=3;persp.updateMatrixWorld();assert.equal(characterDetailLevel(persp,p,720,1),0);
 assert.equal(characterDetailLevel(camera,p,0),0);
});
test('distance Rook retains high geometry, reduces low triangles and restores cap across LOD changes',async()=>{
 const {scene}=await load(),hero=buildSurvivor(),adapter=attachDetailedRook(hero,scene),levels=[[],[]];scene.traverse(o=>{if(o.isSkinnedMesh)levels[o.userData.castLOD||0].push(o);});
 assert.equal(levels[0].length,10);assert.equal(levels[1].length,10);
 const triangles=meshes=>meshes.reduce((sum,m)=>sum+m.geometry.index.count/3,0),high=triangles(levels[0]),low=triangles(levels[1]);assert.ok(low<high*.5,`${low} vs ${high}`);
 const camera=new T.OrthographicCamera(-15,15,15,-15,.1,100);adapter.setDetail(camera,720);assert.equal(hero.userData.detailedLOD,1);for(const mesh of levels[0])assert.equal(mesh.visible,false);for(const mesh of levels[1])assert.equal(mesh.visible,true);
 hero.userData.hat.visible=false;hero.userData.hair.visible=false;adapter.update();for(const level of levels)for(const mesh of level)if(mesh.material.name.startsWith('Hair /'))assert.equal(mesh.visible,false);
 camera.top=3;camera.bottom=-3;adapter.setDetail(camera,720);assert.equal(hero.userData.detailedLOD,0);for(const mesh of levels[1])assert.equal(mesh.visible,false);
 hero.userData.hat.visible=true;hero.userData.hair.visible=true;adapter.update();assert.equal(triangles(levels[0]),high);assert.equal(triangles(levels[1]),low);
 adapter.dispose();disposeObjectResources(hero);
});
test('identity caches load independently and released requests cannot install',async()=>{
 const waits=new Map(),calls=[],lib=new DetailedSurvivorLibrary({load:id=>{calls.push(id);return new Promise(resolve=>waits.set(id,resolve));}}),scout=buildSurvivor(),medic=buildSurvivor('medic'),medic2=buildSurvivor('medic');
 lib.request(scout);lib.request(medic);lib.request(medic2);lib.request(medic2);await Promise.resolve();assert.deepEqual(calls,['scout','medic']);lib.release(medic);
 waits.get('medic')(await load());await lib.assets.get('medic').promise;await Promise.resolve();assert.equal(lib.instances.has(medic),false);assert.equal(medic2.userData.detailedModel,'saint-v1');assert.equal(scout.userData.detailedStatus,'loading');
 waits.get('scout')(await load());await lib.promise;await Promise.resolve();assert.equal(scout.userData.detailedModel,'rook-v7');assert.equal(lib.instances.size,2);lib.dispose();for(const hero of [scout,medic,medic2])disposeObjectResources(hero);
});
test('shared material receives color override once and neutral default remains unchanged',()=>{
 const content=new T.Group(),material=new T.MeshStandardMaterial({name:'Skin / cast',color:0x775544}),a=new T.Mesh(new T.BoxGeometry(),material),b=new T.Mesh(a.geometry,material);content.add(a,b);const before=material.color.clone();tintDetailedIdentity(content,'scout',{});assert.deepEqual(material.color,before);
 tintDetailedIdentity(content,'scout',{skin:'deep'});const once=material.color.clone(),single=new T.Group(),m=material.clone();m.color.copy(before);single.add(new T.Mesh(a.geometry,m));tintDetailedIdentity(single,'scout',{skin:'deep'});assert.deepEqual(once,m.color);disposeObjectResources(content);m.dispose();
});

test('material and LOD meshes share one exact skin per instance but different actors remain independent',async()=>{
 const lib=new DetailedSurvivorLibrary({load}),a=buildSurvivor(),b=buildSurvivor();lib.request(a);lib.request(b);await lib.promise;await Promise.resolve();
 const skeletons=hero=>{const result=new Set();hero.userData.detailedContent.traverse(o=>{if(o.skeleton)result.add(o.skeleton);});return result;};
 const sa=skeletons(a),sb=skeletons(b);assert.equal(sa.size,1);assert.equal(sb.size,1);assert.notEqual([...sa][0],[...sb][0]);
 const bone=[...sa][0].bones.find(b=>b.name==='wristR'),other=[...sb][0].bones.find(b=>b.name==='wristR');const pose=other.position.clone();bone.position.x+=.1;assert.deepEqual(other.position,pose);
 let disposed=0;[...sa][0].addEventListener?.('dispose',()=>disposed++);lib.release(a);assert.equal(lib.instances.has(b),true);lib.update(b);lib.dispose();disposeObjectResources(a);disposeObjectResources(b);
});

test('clothing dye targets the selected palette instead of amplifying authored brown into clipped peach',()=>{
 const content=new T.Group(),coat=new T.MeshStandardMaterial({name:'Field jacket / torque'});coat.color.setRGB(.18,.10,.055);const lapel=coat.clone();lapel.name='Cloth / lapels';lapel.color.multiplyScalar(.72);const geometry=new T.BoxGeometry();content.add(new T.Mesh(geometry,coat),new T.Mesh(geometry,lapel));
 tintDetailedIdentity(content,'biker',{palette:'arctic'});const expected=new T.Color(PALETTES.arctic.cloth);for(const c of ['r','g','b']){assert.ok(Math.abs(coat.color[c]-expected[c])<1e-8);assert.ok(Math.abs(lapel.color[c]-expected[c]*.72)<1e-8);}
 disposeObjectResources(content);
});
