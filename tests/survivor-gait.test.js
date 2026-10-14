import test from 'node:test';
import assert from 'node:assert/strict';
import {survivorLegPose,SURVIVOR_MOTION} from '../src/rebuild/CharacterMotion.js';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';

test('planted gait maintains ankle height and a flat sole throughout forward/backward stance',()=>{
 for(const forward of [-1,1])for(let i=0;i<60;i++){
  const p=survivorLegPose(i/100*Math.PI*2,1,forward,0);
  const y=-.33*Math.cos(p.hip)-.29*Math.cos(p.hip+p.knee);
  assert.ok(p.planted);assert.ok(Math.abs(y+.59)<1e-8,`ankle drift ${y}`);
  assert.ok(Math.abs(p.hip+p.knee+p.ankle)<1e-8);
 }
});
test('gait has continuous land/takeoff, foot clearance and bounded directional poses',()=>{
 for(const phase of [0,Math.PI*1.2,Math.PI*2]){
  const a=survivorLegPose(phase-1e-7,1),b=survivorLegPose(phase+1e-7,1);
  for(const key of ['hip','knee','ankle','roll'])assert.ok(Math.abs(a[key]-b[key])<1e-5);
 }
 assert.ok(survivorLegPose(Math.PI*1.6,1).footLift>.07);
 for(const style of Object.values(SURVIVOR_MOTION))for(let i=0;i<120;i++)for(const [f,s]of [[1,0],[-1,0],[0,1],[.707,.707]]){
  const p=survivorLegPose(i/120*Math.PI*2,1,f,s,style);
  for(const key of ['hip','knee','ankle','roll'])assert.ok(Number.isFinite(p[key])&&Math.abs(p[key])<1.7);
 }
});
test('each live survivor owns two ankle joints while preserving weapon attachment dimensions',()=>{
 for(const skin of Object.keys(SURVIVOR_MOTION)){
  const model=buildSurvivor(skin);
  for(const leg of model.userData.legs){assert.equal(leg.userData.ankle.parent,leg.userData.knee);assert.equal(leg.userData.ankle.position.y,-.29);}
  for(const arm of model.userData.arms){assert.equal(arm.position.y,1.35);assert.equal(arm.userData.elbow.position.y,-.34);assert.equal(arm.userData.wrist.position.y,-.32);}
  let released=0;const materials=new Set();model.traverse(o=>{if(o.material&&!o.material.userData.shared)materials.add(o.material);});materials.forEach(m=>m.addEventListener('dispose',()=>released++));disposeObjectResources(model);assert.equal(released,materials.size);
 }
});
