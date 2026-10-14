import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
import {World} from '../src/rebuild/World.js';
import {applyTraversalPose} from '../src/rebuild/TraversalVisuals.js';
import {alignSurvivorFeet} from '../src/rebuild/CharacterMotion.js';
import {animateWeapons} from '../src/rebuild/WeaponRig.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';

const soleTilt=(model,leg)=>{
 model.updateMatrixWorld(true);
 const up=new T.Vector3(0,1,0).applyQuaternion(leg.userData.ankle.getWorldQuaternion(new T.Quaternion()));
 return Math.acos(T.MathUtils.clamp(up.y,-1,1));
};
const hostFor=model=>({settings:{reducedMotion:true},player:model});
const animate=(model,state,phase)=>{
 model.userData.motion={phase,walk:1};
 World.prototype.animateCharacter.call(hostFor(model),model,0,true,false,1/60,state);
};

test('live survivor soles stay flat after combined strafe, melee brace and hit poses',()=>{
 const model=buildSurvivor();
 try{
  model.rotation.y=.73;
  for(const [moveX,moveZ] of [[0,3.5],[3.5,0],[0,-3.5],[2.5,2.5]])for(const phase of [0,1.8,4]){
   model.userData.impact={age:.03,amount:80,angle:1.1};
   animate(model,{moveX,moveZ,angle:0,weapon:'katana',aiming:true,traversal:true,grounded:false},phase);
   for(const leg of model.userData.legs)assert.ok(soleTilt(model,leg)<1e-6,'later torso layers must not tip the soles');
  }
 }finally{disposeObjectResources(model);}
});

test('jump and grapple boot poses do not inherit the walking phase; landing restores flat soles',()=>{
 for(const skin of ['scout','medic','biker','ronin']){
  const model=buildSurvivor(skin);
  try{
   for(const grapple of [null,{anchorId:'roof'}])for(const phase of [0,1.8,4]){
    const state={moveX:0,moveZ:3.5,angle:0,weapon:'katana',traversal:'campaign',grounded:false,y:1,grapple};
    animate(model,state,phase);applyTraversalPose(model,state);
    for(const leg of model.userData.legs)assert.ok(Math.abs(soleTilt(model,leg)-.25)<1e-6,'airborne soles must use the same modest toe-down pose');
    const landed={...state,moveZ:0,grounded:true,grapple:null,landing:.65,y:0};
    animate(model,landed,phase);applyTraversalPose(model,landed);
    for(const leg of model.userData.legs)assert.ok(soleTilt(model,leg)<1e-6,'landing knee compression must not bury the toes');
   }
  }finally{disposeObjectResources(model);}
 }
});

test('sole alignment changes only ankle orientation and tolerates older enemy rigs',()=>{
 const model=buildSurvivor();
 try{
  const {body,legs}=model.userData;body.rotation.set(.3,.2,-.2);
  for(const leg of legs){leg.rotation.set(-.4,0,.25);leg.userData.knee.rotation.x=.7;}
  const before=legs.map(leg=>({hip:leg.quaternion.clone(),knee:leg.userData.knee.quaternion.clone(),anklePosition:leg.userData.ankle.position.clone()}));
  alignSurvivorFeet(model);
  legs.forEach((leg,i)=>{
   assert.ok(leg.quaternion.equals(before[i].hip));assert.ok(leg.userData.knee.quaternion.equals(before[i].knee));
   assert.ok(leg.userData.ankle.position.equals(before[i].anklePosition));assert.ok(soleTilt(model,leg)<1e-6);
  });
  assert.doesNotThrow(()=>alignSurvivorFeet({userData:{body,legs:[{userData:{knee:new T.Group()}}]}}));
 }finally{disposeObjectResources(model);}
});

test('actual firearm recoil and blade finishers can align soles without moving weapon grips',()=>{
 const kit={batch:()=>{},remove:object=>{disposeObjectResources(object);object.removeFromParent();}};
 for(const weapon of ['carbine','shotgun','katana','dual']){
  const model=buildSurvivor();
  try{
   const melee=weapon==='katana'||weapon==='dual';
   const state={weapon,equipped:[weapon],moveX:2.5,moveZ:2.5,angle:0,traversal:true,grounded:false,
    reloads:{},reloadMultiplier:1,shots:{[weapon]:{weapon,time:0,variant:2}},
    swing:melee?.3:0,swingDuration:.6,swingWeapon:weapon,swingCombo:2,swingVariant:1};
   animate(model,state,1.8);
   animateWeapons(model,state,.02,1/60,kit);
   assert.ok(model.userData.legs.some(leg=>soleTilt(model,leg)>.005),'exercise a real torso-changing recoil or finisher');
   const wrists=model.userData.arms.map(arm=>arm.userData.wrist.getWorldPosition(new T.Vector3()));
   alignSurvivorFeet(model);
   for(const leg of model.userData.legs)assert.ok(soleTilt(model,leg)<1e-6);
   model.userData.arms.forEach((arm,i)=>assert.ok(arm.userData.wrist.getWorldPosition(new T.Vector3()).distanceTo(wrists[i])<1e-9));
   assert.ok(model.userData.gripError<.03);
  }finally{disposeObjectResources(model);}
 }
});
