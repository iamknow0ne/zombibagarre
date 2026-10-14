import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/rebuild/World.js';
import {ViewRig} from '../src/rebuild/ViewRig.js';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
import {createWeaponMesh} from '../src/rebuild/WeaponModels.js';
import {dressArmour} from '../src/rebuild/RPGVisuals.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';

const watch=resource=>{let count=0;resource.addEventListener('dispose',()=>count++);return()=>count;};
const fadingRig=()=>{const rig=new ViewRig();Object.assign(rig,{active:true,mode:'third',distance:.4});return rig;};
function track(root){
 const resources=new Map();root.traverse(node=>{
  if(node.geometry&&!node.geometry.userData.shared&&!node.isSprite)resources.set(node.geometry,0);
  for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){
   if(!material.userData.shared)resources.set(material,0);
  }
 });
 for(const resource of resources.keys())resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)+1));
 return resources;
}
test('dynamic removal releases hidden originals, arrays, repeated geometry and all owned texture channels once',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),map=new T.Texture(),normal=new T.Texture(),roughness=new T.Texture(),uniform=new T.Texture();
 const first=new T.MeshStandardMaterial({map,normalMap:normal,roughnessMap:roughness}),second=new T.ShaderMaterial({uniforms:{images:{value:[uniform,map]}}});
 root.add(new T.Mesh(geometry,[first,second]),new T.Mesh(geometry,first));
 const resources=[geometry,map,normal,roughness,uniform,first,second],counts=resources.map(watch),rig=fadingRig();rig.fadeAvatar(root);
 const clones=[];root.traverse(node=>{for(const entry of node.userData.cameraMaterials||[])clones.push(watch(entry.material));});
 const parent=new T.Group();parent.add(root);World.prototype.removeDynamic.call({},root);
 assert.equal(root.parent,null);assert.deepEqual(counts.map(count=>count()),resources.map(()=>1));assert.ok(clones.every(count=>count()===1));
 root.traverse(node=>assert.equal(node.userData.cameraMaterials,undefined));
});
test('fade clones borrow shared textures even when only their original material is marked shared',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture});
 geometry.userData.shared=material.userData.shared=true;root.add(new T.Mesh(geometry,material));const counts=[geometry,material,texture].map(watch);
 fadingRig().fadeAvatar(root);const cloneCount=watch(root.children[0].material);disposeObjectResources(root);
 assert.deepEqual(counts.map(count=>count()),[0,0,0]);assert.equal(cloneCount(),1);
});
test('repeated real survivor replacement mid-fade disposes every owned source and clone without invalidating fabric caches',()=>{
 const rig=fadingRig(),shared=new Map();let checked=0;
 for(let i=0;i<12;i++){
  const survivor=buildSurvivor('scout',{palette:i%2?'arctic':'quarantine'}),source=track(survivor);
  survivor.traverse(node=>{if(node.material?.map?.userData.shared&&!shared.has(node.material.map))shared.set(node.material.map,watch(node.material.map));});
  rig.fadeAvatar(survivor);const clones=[];survivor.traverse(node=>{for(const entry of node.userData.cameraMaterials||[])clones.push(watch(entry.material));});
  World.prototype.removeDynamic.call({},survivor);
  assert.ok([...source.values()].every(count=>count===1),'each original material and geometry must be disposed exactly once');
  assert.ok(clones.length>0&&clones.every(count=>count()===1));checked+=clones.length;
 }
 assert.ok(checked>100);assert.ok(shared.size>0);assert.ok([...shared.values()].every(count=>count()===0));
});
test('changing real armour while faded releases its hidden owned materials and keeps the character intact',()=>{
 const survivor=buildSurvivor(),rig=fadingRig(),player={skin:'scout',dye:'olive',armour:{head:'warden-head-1',chest:'warden-chest-1'}};
 dressArmour(survivor,player);assert.ok(survivor.userData.armourParts.length>0);
 const bodyMaterial=survivor.userData.body.children.find(node=>node.material&&!node.material.userData.shared).material,bodyDisposed=watch(bodyMaterial);
 for(let i=0;i<8;i++){
  const previous=survivor.userData.armourParts,tracked=previous.map(track);rig.fadeAvatar(survivor);
  const clones=[];for(const group of previous)group.traverse(node=>{for(const entry of node.userData.cameraMaterials||[])clones.push(watch(entry.material));});
  player.dye=i%2?'olive':'ash';dressArmour(survivor,player);
  assert.ok(previous.every(group=>group.parent===null));assert.ok(tracked.every(resources=>[...resources.values()].every(count=>count===1)));
  assert.ok(clones.length>0&&clones.every(count=>count()===1));assert.equal(bodyDisposed(),0);
 }
 World.prototype.removeDynamic.call({},survivor);assert.equal(bodyDisposed(),1);
});
test('World shutdown preserves globally shared textures and releases world-owned cached textures once',()=>{
 const scene=new T.Scene(),sharedTexture=new T.Texture(),normal=new T.Texture(),smokeTex=new T.Texture(),charTex=new T.Texture();
 sharedTexture.userData.shared=charTex.userData.shared=true;
 const material=new T.MeshStandardMaterial({map:sharedTexture,normalMap:normal}),mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
 const cachedMaterial=new T.MeshBasicMaterial({map:charTex});scene.add(new T.Mesh(new T.PlaneGeometry(),cachedMaterial));
 const sprite=new T.Sprite(new T.SpriteMaterial({map:smokeTex}));scene.add(sprite);const spriteGeometry=watch(sprite.geometry);
 const counts=[sharedTexture,normal,smokeTex,charTex,material].map(watch);fadingRig().fadeAvatar(mesh);
 const noop={dispose(){}},world={scene,smokeTex,charTex,bloodTextures:new Map([['same',charTex]]),characterInstances:noop,surfaces:noop,structuralVisuals:noop,feedback:{destroy(){}},composer:{...noop,passes:[]},renderer:noop};
 World.prototype.destroy.call(world);
 assert.deepEqual(counts.map(count=>count()),[0,1,1,1,1]);assert.equal(spriteGeometry(),0,'Three sprites share a built-in geometry');
});
test('expiring effects retain world texture caches until shutdown',()=>{
 const world={smokeTex:new T.Texture(),fireTex:new T.Texture(),scarTex:new T.Texture(),wallTex:new T.Texture(),charTex:new T.Texture()},counts=Object.values(world).map(watch);
 for(const texture of Object.values(world)){const mesh=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial({map:texture}));World.prototype.removeDynamic.call(world,mesh);}
 assert.deepEqual(counts.map(count=>count()),[0,0,0,0,0]);
});

test('evolving real weapons mid-fade disposes owned geometry and clones while cached weapon resources remain usable',()=>{
 const rig=fadingRig(),shared=new Map(),kit={batch:(root,destination)=>World.prototype.batchStatic.call({},root,destination)};
 for(let tier=0;tier<4;tier++)for(const key of ['carbine','flame','katana']){
  const weapon=createWeaponMesh(key,kit,tier),owned=track(weapon);
  weapon.traverse(node=>{for(const resource of [node.geometry,node.material])if(resource?.userData.shared&&!shared.has(resource))shared.set(resource,watch(resource));});
  rig.fadeAvatar(weapon);const clones=[];weapon.traverse(node=>{for(const entry of node.userData.cameraMaterials||[])clones.push(watch(entry.material));});
  World.prototype.removeDynamic.call({},weapon);
  assert.ok([...owned.values()].every(count=>count===1));assert.ok(clones.length>0&&clones.every(count=>count()===1));
 }
 assert.ok(shared.size>0);assert.ok([...shared.values()].every(count=>count()===0));
});
test('replaced first-person sources release borrowed overlay references without double disposal',()=>{
 const viewRig=new ViewRig(),world={viewRig},scene=new T.Scene(),sim={state:'playing',player:{equipped:['carbine']}};
 viewRig.active=true;viewRig.mode='first';
 for(let i=0;i<4;i++){
  const hero=buildSurvivor(),owned=track(hero);viewRig.syncHands(hero,sim,scene);const hands=viewRig.hands;assert.ok(viewRig.pairs.length>0);
  World.prototype.removeDynamic.call(world,hero);
  assert.equal(hands.parent,null);assert.equal(viewRig.hands,null);assert.equal(viewRig.sources,null);assert.deepEqual(viewRig.pairs,[]);
  assert.ok([...owned.values()].every(count=>count===1));
 }
});
