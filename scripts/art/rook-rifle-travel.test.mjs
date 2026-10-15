import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionController} from '../../dev/RookMotionController.js';
import {ROOK_AIM_LIMITS} from '../../dev/RookMotionStudy.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url));
async function fixture(){
 const loader=new GLTFLoader();loader.register(p=>{p.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'NODE_IMAGE_PLACEHOLDER'};});
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const travel=new T.Group();travel.add(scene);const motion=createRookMotionController(scene),skins=[];scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
 return{scene,travel,motion,skins};
}
const transform=(w,p)=>new T.Vector3(...p).multiply(w.scaleVector).applyQuaternion(w.quaternion).add(w.position);
function near(a,b,tol=1e-7){assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}, tolerance ${tol}`);}
function place(f){f.travel.position.copy(f.motion.getTravelPose());f.travel.updateMatrixWorld(true);}
function grip(f){const w=f.motion.getWeaponPose();assert.ok(w.visible);for(const [side,p]of [['right',[.054,-.06,0]],['left',[0,-.008,.335]]])assert.ok(f.motion.getSocket(side).palmPosition.distanceTo(transform(w,p))<.003,`${side} rifle grip`);const shoulder=f.scene.getObjectByName('shoulder01R').getWorldPosition(new T.Vector3());near(transform(w,[0,.095,-.4175]).distanceTo(shoulder),Math.hypot(.02,.035,.015),1e-5);}
function feet(f,d){for(const [side,p]of Object.entries(d.footContacts)){
 assert.ok(p.anchorError<.002,`${side} ankle drift ${p.anchorError}`);
 assert.ok(Math.abs(p.soleHeight-p.floor-p.clearance)<.001,`${side} deformed sole clearance`);
 if(p.planted){const actual=f.scene.getObjectByName('foot'+side).getWorldPosition(new T.Vector3());near(actual.x,p.anchorX,.002);near(actual.z,p.anchorZ,.002);}
}}

test('actual v7 rifle travel holds grips and deformed soles while aiming forward, backward, strafing and stopping',async()=>{
 const f=await fixture(),c=f.motion,bind=f.skins.map(s=>[...s.bindMatrix.elements]);let checks=0;
 try{
  for(const input of [{x:0,z:1,speed:1.2},{x:0,z:-1,speed:1.2},{x:1,z:0,speed:1.2},{x:-1,z:0,speed:3}]){
   c.reset();f.travel.position.set(0,0,0);f.travel.updateMatrixWorld(true);c.setLocomotion(input);c.select('rifle-locomotion');c.seek(0);
   for(let i=0;i<120;i++){
    if(i===60)c.setLocomotion({x:0,z:0,speed:0});
    c.setAim({yaw:Math.sin(i*.08)*ROOK_AIM_LIMITS.yaw,pitch:Math.cos(i*.09)*ROOK_AIM_LIMITS.pitch});
    const d=c.update(1/30);place(f);feet(f,d);grip(f);assert.equal(d.aim.active,true);checks++;
   }
   const stop=c.diagnostics().locomotion;assert.ok(stop.speed<.001);assert.ok(Object.values(stop.feet).every(p=>p.planted));
  }
  f.skins.forEach((s,i)=>assert.deepEqual([...s.bindMatrix.elements],bind[i]));assert.equal(checks,480);
 }finally{c.dispose();}
});

test('actual v7 unarmed-to-rifle travel preserves position and planted feet through interrupted crossfades',async()=>{
 const f=await fixture(),c=f.motion;try{
  c.setLocomotion({x:1,z:0,speed:.8});c.select('locomotion');for(let i=0;i<60;i++){c.update(1/60);place(f);}
  for(const mode of ['rifle-locomotion','locomotion','rifle-locomotion']){
   const position=c.getTravelPose(),bones=[];f.scene.traverse(o=>{if(o.isBone)bones.push([o,[...o.position,...o.quaternion]]);});
   c.select(mode);near(c.getTravelPose().distanceTo(position),0);c.update(0);
   for(const [bone,pose]of bones)assert.deepEqual([...bone.position,...bone.quaternion],pose);
   for(let i=0;i<8;i++){const d=c.update(1/60);place(f);feet(f,d);}
  }
  for(let i=0;i<30;i++){const d=c.update(1/60);place(f);feet(f,d);}
  assert.equal(c.diagnostics().transition.active,false);grip(f);
 }finally{c.dispose();}
});

test('rifle travel seek, pause and frame-rate-independent aim/stride behavior remain explicit',async()=>{
 const a=await fixture(),b=await fixture();try{
  for(const f of [a,b]){f.motion.setLocomotion({x:1,z:-1,speed:1.2});f.motion.setAim({yaw:.4,pitch:.3});f.motion.select('rifle-locomotion');}
  for(let i=0;i<30;i++)a.motion.update(1/30);for(let i=0;i<120;i++)b.motion.update(1/120);
  near(a.motion.getTravelPose().distanceTo(b.motion.getTravelPose()),0);assert.ok(a.motion.getWeaponPose().quaternion.angleTo(b.motion.getWeaponPose().quaternion)<1e-7);
  const saved=a.motion.getTravelPose(),weapon=a.motion.getWeaponPose();a.motion.update(0);near(a.motion.getTravelPose().distanceTo(saved),0);near(a.motion.getWeaponPose().position.distanceTo(weapon.position),0);
  a.motion.seek(1);near(a.motion.getTravelPose().distanceTo(saved),0);assert.deepEqual(a.motion.diagnostics().aimCurrent,{yaw:.4,pitch:.3});place(a);grip(a);feet(a,a.motion.diagnostics());
  a.motion.select('rifle');near(a.motion.getTravelPose().length(),0);assert.equal(a.motion.diagnostics().locomotion,undefined);
 }finally{a.motion.dispose();b.motion.dispose();}
});


test('paused aim edits preserve forward-strafe-stop travel history instead of replaying its final command',async()=>{
 const f=await fixture(),c=f.motion;try{
  c.select('rifle-locomotion');
  for(const input of [{x:0,z:1,speed:1},{x:1,z:0,speed:.8},{x:0,z:0,speed:0}]){c.setLocomotion(input);for(let i=0;i<60;i++){c.update(1/30);place(f);}}
  const before=c.diagnostics(),position=c.getTravelPose(),weapon=c.getWeaponPose(),feetBefore=before.footContacts;assert.ok(position.x>1&&position.z>1);
  c.setAim({yaw:-.5,pitch:.4});c.update(0);near(c.getWeaponPose().quaternion.angleTo(weapon.quaternion),0);
  const after=c.settleAim();place(f);near(c.getTravelPose().distanceTo(position),0);assert.deepEqual(after.locomotion,before.locomotion);near(after.time,before.time);near(after.poseTime,before.poseTime);for(const side of ['L','R'])for(const key of ['actualX','actualZ','soleHeight','anchorX','anchorZ'])near(after.footContacts[side][key],feetBefore[side][key],1e-7);
  assert.deepEqual(after.aimCurrent,{yaw:-.5,pitch:.4});assert.ok(c.getWeaponPose().quaternion.angleTo(weapon.quaternion)>.4);grip(f);feet(f,after);
  c.setAim({});c.settleAim();near(c.getTravelPose().distanceTo(position),0);assert.deepEqual(c.diagnostics().locomotion,before.locomotion);
 }finally{c.dispose();}assert.throws(()=>c.settleAim(),/disposed/);
});
