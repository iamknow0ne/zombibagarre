import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildEnemy} from '../src/rebuild/EnemyVisuals.js';
import {CharacterInstances} from '../src/rebuild/RenderBatch.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
import {World} from '../src/rebuild/World.js';

const types=['walker','runner','brute','spitter','armored','volatile'];
function resources(root){const found=new Set();root.traverse(node=>{if(node.geometry)found.add(node.geometry);});return [...found];}
function disposals(objects){return new Map(objects.map(object=>{const state={count:0};object.addEventListener('dispose',()=>state.count++);return[object,state];}));}
function bounds(root){root.updateWorldMatrix(true,true);const box=new T.Box3(),vertex=new T.Vector3();root.traverseVisible(node=>{const position=node.geometry?.attributes.position;if(!position)return;for(let i=0;i<position.count;i++)box.expandByPoint(vertex.fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld));});return box;}

test('settling production corpses releases replaced geometry and preserves hidden limbs until final removal',()=>{
 for(const type of types)for(const missingParts of [false,true]){
  const root=buildEnemy(type,3),d=root.userData;
  root.position.set(8,2,-5);root.rotation.y=.7;d.body.rotation.set(1.34,0,-.2);
  d.arms[0].rotation.x=-.45;d.legs[1].userData.knee.rotation.x=.4;
  if(missingParts){d.head.visible=false;d.arms[0].visible=false;d.legs.forEach(leg=>leg.visible=false);}
  const originals=resources(root),counts=disposals(originals),visible=new Set();root.traverseVisible(node=>{if(node.geometry)visible.add(node.geometry);});
  const materials=new Set();root.traverse(node=>{if(node.material)materials.add(node.material);});const materialCounts=disposals([...materials]);
  const before=bounds(root);
  World.prototype.batchStatic.call({},root,root);
  const after=bounds(root);
  assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5,`${type}: settled pose bounds`);
  for(const [geometry,state]of counts)assert.equal(state.count,visible.has(geometry)?1:0,`${type}: replaced source disposal`);
  const replacements=resources(root).filter(geometry=>!counts.has(geometry)),replacementCounts=disposals(replacements);
  assert.ok(replacements.length>0&&replacements.length<=8,'settled pieces merge by material response and index layout');
  disposeObjectResources(root);
  assert.ok([...counts.values()].every(state=>state.count===1),`${type}: all source geometry released exactly once`);
  assert.ok([...replacementCounts.values()].every(state=>state.count===1),`${type}: replacement geometry released exactly once`);
  assert.ok([...materialCounts.values()].every(state=>state.count===0),'shared horde materials survive corpse removal');
 }
});

test('all enemy variants keep bounded instance caches across waves and retain exact posed world transforms',()=>{
 const scene=new T.Scene(),instances=new CharacterInstances(scene),actors=new Map();
 for(let wave=0;wave<3;wave++){
  for(const [i,type]of types.entries())for(let variant=0;variant<6;variant++){
   const root=buildEnemy(type,variant),id=i*6+variant;root.position.set(id*3,5+wave,-wave*7);root.rotation.y=.8;root.userData.body.rotation.x=variant%2?-.9:0;root.userData.arms[0].rotation.z=.3;scene.add(root);actors.set(id,root);
  }
  instances.update(actors);
  const expected=Array.from(actors.values()).reduce((sum,root)=>sum+resources(root).length,0);
  assert.equal(instances.batches.size,expected,'cache stays bounded by archetype/variant, not wave count');
  const matrix=new T.Matrix4();
  for(const {parts}of instances.actors.values())for(const {mesh,batch}of parts){
   assert.equal(batch.count,1);batch.getMatrixAt(0,matrix);
   assert.ok(matrix.elements.every((value,i)=>Math.abs(value-mesh.matrixWorld.elements[i])<1e-5),'instance follows elevation, crawl lean and articulated transform');
   assert.deepEqual(batch.geometry.attributes.color.array,mesh.geometry.attributes.color.array,'instance retains painted vertex colours');
   assert.equal(batch.material,mesh.material);
  }
  for(const root of actors.values()){root.removeFromParent();disposeObjectResources(root);}actors.clear();instances.update(actors);
  assert.equal(instances.actors.size,0);assert.ok([...instances.batches.values()].every(batch=>!batch.visible&&batch.count===0));
 }
 const counts=disposals([...instances.batches.values()].map(batch=>batch.geometry));instances.dispose();
 assert.ok([...counts.values()].every(state=>state.count===1));assert.equal(scene.children.length,0);
});
