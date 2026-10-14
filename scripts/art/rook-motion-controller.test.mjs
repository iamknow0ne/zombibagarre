import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionController} from '../../dev/RookMotionController.js';

const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v4.glb',import.meta.url));
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
async function fixture(){
 const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'NODE_TEST_IMAGE_PLACEHOLDER'};});
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bones=[],skins=[];scene.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
 const controller=createRookMotionController(scene),snapshot=()=>bones.flatMap(b=>[...b.position,...b.quaternion,...b.scale]);
 const dispose=()=>{controller.dispose();const g=new Set(),m=new Set(),t=new Set(),s=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.skeleton)s.add(o.skeleton);for(const mat of [].concat(o.material||[])){m.add(mat);for(const v of Object.values(mat))if(v?.isTexture)t.add(v);}});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());t.forEach(x=>x.dispose());s.forEach(x=>x.dispose());};
 return{scene,bones,skins,controller,snapshot,dispose};
}
function close(a,b,tolerance=1e-8){assert.equal(a.length,b.length);let maximum=0;for(let i=0;i<a.length;i++)maximum=Math.max(maximum,Math.abs(a[i]-b[i]));assert.ok(maximum<tolerance,`Maximum difference ${maximum} exceeds ${tolerance}.`);}
function weaponNumbers(c){const w=c.getWeaponPose();return[...w.position,...w.quaternion,...w.scaleVector,w.opacity,w.reload];}
test('interrupting a transition preserves the actual displayed bones and gun at time zero',async()=>{
 const f=await fixture();try{const c=f.controller;c.select('rifle');c.update(.24);const before=f.snapshot(),gun=weaponNumbers(c);assert.ok(c.getWeaponPose().opacity>0&&c.getWeaponPose().opacity<1);c.select('guard');close(f.snapshot(),before);close(weaponNumbers(c),gun);c.update(0);close(f.snapshot(),before);close(weaponNumbers(c),gun);assert.equal(c.diagnostics().selectedMode,'guard');assert.equal(c.diagnostics().transition.progress,0);c.update(.32);assert.equal(c.getWeaponPose().visible,false);}finally{f.dispose();}
});
test('30Hz and 120Hz stepping match including exact demo boundaries and interruptions',async()=>{
 const a=await fixture(),b=await fixture();try{
  for(const mode of ['walk','rifle','reload','demo']){
   a.controller.reset();b.controller.reset();a.controller.select(mode);b.controller.select(mode);
   for(let i=0;i<75;i++)a.controller.update(1/30);for(let i=0;i<300;i++)b.controller.update(1/120);
   close(a.snapshot(),b.snapshot(),1e-6);close(weaponNumbers(a.controller),weaponNumbers(b.controller),1e-6);
   a.controller.select('guard');b.controller.select('guard');a.controller.update(.13);b.controller.update(.06);b.controller.update(.07);close(a.snapshot(),b.snapshot(),1e-6);
  }
 }finally{a.dispose();b.dispose();}
});
test('actual skinned v4 vertices remain finite throughout equip, recoil, reload and unequip',async()=>{
 const f=await fixture();try{const c=f.controller;c.select('demo');let visibleSamples=0,hiddenSamples=0;
  for(let i=0;i<=110;i++){c.update(.1);const weapon=c.getWeaponPose();if(weapon.visible)visibleSamples++;else hiddenSamples++;assert.ok(weapon.opacity>=0&&weapon.opacity<=1);const wrist=c.getSocket('right').position;if(weapon.visible)assert.ok(weapon.position.distanceTo(wrist)<.20,'Visible gun stays within the firing hand grip envelope.');
   for(const mesh of f.skins)for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex+=61){const p=new T.Vector3();mesh.getVertexPosition(vertex,p);assert.ok([...p].every(Number.isFinite));assert.ok(p.length()<4,'Skinned geometry must remain near the authored character.');}
  }
  assert.ok(visibleSamples>10&&hiddenSamples>10);assert.equal(c.diagnostics().demoComplete,true);assert.equal(c.diagnostics().mode,'ready');assert.equal(c.getWeaponPose().visible,false);
 }finally{f.dispose();}
});
test('paused model placement keeps weapon and wrist coherent; seek is deterministic and settled',async()=>{
 const f=await fixture();try{const c=f.controller;c.select('reload');c.seek(1.1);const before=f.snapshot();const old=c.getWeaponPose().position;f.scene.position.set(4,2,-3);f.scene.rotation.y=.7;c.update(0);close(f.snapshot(),before,1e-6);const expected=old.clone().applyAxisAngle(new T.Vector3(0,1,0),.7).add(f.scene.position);assert.ok(c.getWeaponPose().position.distanceTo(expected)<1e-5);assert.equal(c.diagnostics().transition.active,false);
  c.select('demo');c.seek(5.4);const pose=f.snapshot();c.update(.1);c.seek(5.4);close(f.snapshot(),pose);assert.equal(c.diagnostics().time,5.4);assert.equal(c.diagnostics().mode,'reload');
 }finally{f.dispose();}
});
test('reset restores exact bind transforms and disposal releases controller references without changing bind matrices',async()=>{
 const f=await fixture();try{const bind=f.snapshot(),matrices=f.skins.map(m=>[...m.bindMatrix.elements,...m.bindMatrixInverse.elements]);f.controller.select('demo');f.controller.update(6);f.controller.reset();close(f.snapshot(),bind);f.skins.forEach((m,i)=>close([...m.bindMatrix.elements,...m.bindMatrixInverse.elements],matrices[i]));f.controller.dispose();assert.equal(f.controller.diagnostics().bones,0);assert.equal(f.controller.diagnostics().disposed,true);assert.throws(()=>f.controller.update(.1),/disposed/);assert.throws(()=>f.controller.getWeaponPose(),/disposed/);f.controller.dispose();}finally{f.dispose();}
});
test('demo clamps oversized updates and seeks to one stable final pose and clock',async()=>{
 const a=await fixture(),b=await fixture();try{
  a.controller.select('demo');b.controller.select('demo');const duration=a.controller.diagnostics().duration;
  a.controller.update(duration+10);for(let i=0;i<Math.ceil((duration+1)*60);i++)b.controller.update(1/60);
  assert.equal(a.controller.diagnostics().time,duration);assert.equal(b.controller.diagnostics().time,duration);close(a.snapshot(),b.snapshot(),1e-6);
  const end=a.snapshot(),gun=weaponNumbers(a.controller);a.controller.update(10);close(a.snapshot(),end);close(weaponNumbers(a.controller),gun);a.controller.seek(duration+10);assert.equal(a.controller.diagnostics().time,duration);close(a.snapshot(),end,1e-6);assert.equal(a.controller.diagnostics().demoComplete,true);
 }finally{a.dispose();b.dispose();}
});
test('invalid modes and nonfinite or negative timeline values are rejected',async()=>{
 const f=await fixture();try{assert.throws(()=>f.controller.select('missing'),/Unknown/);for(const value of [NaN,Infinity,-1]){assert.throws(()=>f.controller.update(value),/nonnegative finite/);assert.throws(()=>f.controller.seek(value),/nonnegative finite/);}}finally{f.dispose();}
});
