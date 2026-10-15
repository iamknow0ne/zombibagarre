import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionStudy,ROOK_AIM_LIMITS} from '../../dev/RookMotionStudy.js';
import {createRookMotionController} from '../../dev/RookMotionController.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url));
async function fixture(controller=false){
 const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'NODE_IMAGE_PLACEHOLDER'};});
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bones=new Map(),skins=[];scene.traverse(o=>{if(o.isBone)bones.set(o.name,o);if(o.isSkinnedMesh)skins.push(o);});
 const motion=controller?createRookMotionController(scene):createRookMotionStudy(scene);
 return{scene,bones,skins,motion};
}
const point=b=>b.getWorldPosition(new T.Vector3());
const transform=(w,p)=>new T.Vector3(...p).multiply(w.scaleVector).applyQuaternion(w.quaternion).add(w.position);
const feet=f=>['upperleg01L','lowerleg01L','footL','upperleg01R','lowerleg01R','footR'].flatMap(n=>[...point(f.bones.get(n)),...f.bones.get(n).quaternion]);
function close(a,b,epsilon=1e-8){assert.equal(a.length,b.length);assert.ok(a.every((v,i)=>Math.abs(v-b[i])<epsilon));}

test('actual v7 upper body aims across its envelope with attached grip/stock, finite skins and stationary legs',async()=>{
 const f=await fixture(),m=f.motion,soles=[];for(const skin of f.skins)for(let i=0;i<skin.geometry.attributes.position.count;i++){const p=skin.getVertexPosition(i,new T.Vector3());if(p.y<.105&&Math.abs(p.x)>.1)soles.push({skin,i});}const solePoints=()=>soles.flatMap(({skin,i})=>skin.getVertexPosition(i,new T.Vector3()).toArray());const matrices=f.skins.map(s=>[...s.bindMatrix.elements,...s.bindMatrixInverse.elements]);
 for(const mode of ['rifle','fire'])for(const time of [0,.13,.44,.83]){
  m.pose(mode,time);const lower=feet(f),sole=solePoints(),neutral=m.getWeaponPose();
  const chest=f.bones.get('spine01'),before=chest.matrixWorld.clone(),stock=transform(neutral,[0,.095,-.4175]);
  for(const yaw of [-ROOK_AIM_LIMITS.yaw,0,ROOK_AIM_LIMITS.yaw])for(const pitch of [-ROOK_AIM_LIMITS.pitch,0,ROOK_AIM_LIMITS.pitch]){
   const d=m.pose(mode,time,{aim:{yaw,pitch}}),w=m.getWeaponPose();close(feet(f),lower);close(solePoints(),sole);
   assert.ok(d.palmContactError<.003,`${mode} grip ${d.palmContactError}`);
   assert.ok(m.getSocket('right').palmPosition.distanceTo(transform(w,[.054,-.06,0]))<.003);
   assert.ok(m.getSocket('left').palmPosition.distanceTo(transform(w,[0,-.008,.335]))<.003);
   const delta=chest.matrixWorld.clone().multiply(before.clone().invert());
   assert.ok(transform(w,[0,.095,-.4175]).distanceTo(stock.clone().applyMatrix4(delta))<1e-5,`stock ${mode} ${time} ${yaw} ${pitch}: ${transform(w,[0,.095,-.4175]).distanceTo(stock.clone().applyMatrix4(delta))}`);
   const expected=new T.Quaternion().setFromEuler(new T.Euler(-pitch,yaw,0,'YXZ')).multiply(neutral.quaternion);
   assert.ok(w.quaternion.angleTo(expected)<1e-7);
   for(const skin of f.skins)for(let i=0;i<skin.geometry.attributes.position.count;i+=197){const p=skin.getVertexPosition(i,new T.Vector3());assert.ok([...p].every(Number.isFinite));assert.ok(p.length()<4);}
  }
 }
 f.skins.forEach((s,i)=>close([...s.bindMatrix.elements,...s.bindMatrixInverse.elements],matrices[i]));
});

test('aim shares spinal rotation, remains placement invariant and leaves non-rifle poses alone',async()=>{
 const f=await fixture(),m=f.motion,angles={yaw:.4,pitch:.3};m.pose('rifle',.4);
 const names=['spine05','spine02','spine01'],neutral=names.map(n=>f.bones.get(n).quaternion.clone());
 m.pose('rifle',.4,{aim:angles});names.forEach((n,i)=>assert.ok(neutral[i].angleTo(f.bones.get(n).quaternion)>.05));
 const initial=[...f.bones.values()].map(point),gun=m.getWeaponPose();
 f.scene.position.set(3,1,-2);f.scene.rotation.y=.8;f.scene.updateMatrixWorld(true);m.pose('rifle',.4,{aim:angles});
 [...f.bones.values()].forEach((b,i)=>assert.ok(point(b).distanceTo(f.scene.localToWorld(initial[i].clone()))<1e-5,`${b.name}: ${point(b).distanceTo(f.scene.localToWorld(initial[i].clone()))}`));
 assert.ok(m.getWeaponPose().position.distanceTo(f.scene.localToWorld(gun.position.clone()))<1e-5);
 f.scene.position.set(0,0,0);f.scene.rotation.set(0,0,0);f.scene.updateMatrixWorld(true);
 for(const mode of ['reload','guard','walk','slash']){
  m.pose(mode,.4);const baseline=[...f.bones.values()].flatMap(b=>[...b.position,...b.quaternion]);
  m.pose(mode,.4,{aim:angles});close([...f.bones.values()].flatMap(b=>[...b.position,...b.quaternion]),baseline);assert.equal(m.diagnostics().aim.active,false);
 }
});

test('controller aim smoothing is frame-rate independent; paused seek settles, clamp and reset are explicit',async()=>{
 const a=await fixture(true),b=await fixture(true);
 for(const f of [a,b]){f.motion.select('rifle');f.motion.seek(.3);f.motion.setAim({yaw:.5,pitch:.4});}
 for(let i=0;i<15;i++)a.motion.update(1/30);for(let i=0;i<60;i++)b.motion.update(1/120);
 close([...a.motion.getWeaponPose().quaternion],[...b.motion.getWeaponPose().quaternion],1e-6);
 assert.ok(a.motion.diagnostics().aimCurrent.yaw<.5);
 const old=a.motion.getWeaponPose().quaternion.clone();a.motion.setAim({yaw:-.4,pitch:-.3});a.motion.update(0);assert.ok(old.angleTo(a.motion.getWeaponPose().quaternion)<1e-7);
 a.motion.seek(.8);close(Object.values(a.motion.diagnostics().aimCurrent),[-.4,-.3]);
 assert.deepEqual(a.motion.setAim({yaw:999,pitch:-999}),{yaw:ROOK_AIM_LIMITS.yaw,pitch:-ROOK_AIM_LIMITS.pitch});
 assert.throws(()=>a.motion.setAim({yaw:NaN}),/finite/);assert.throws(()=>a.motion.setAim({pitch:Infinity}),/finite/);
 a.motion.reset();assert.deepEqual(a.motion.diagnostics().aimTarget,{yaw:0,pitch:0});a.motion.dispose();assert.throws(()=>a.motion.setAim({}),/disposed/);b.motion.dispose();
});
