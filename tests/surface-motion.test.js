import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {surfaceUV} from '../src/rebuild/SurfaceMaterials.js';
import {stepCharacterMotion,hitRecoil} from '../src/rebuild/CharacterMotion.js';
import {Simulation} from '../src/rebuild/Simulation.js';
const near=(a,b,e=.001)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('metre-scaled UVs preserve density, align adjoining panels and do not mutate shared geometry',()=>{
 const shared=new T.BoxGeometry(1,1,1),before=Array.from(shared.attributes.uv.array),a=new T.Mesh(shared),b=new T.Mesh(shared);a.scale.set(8,2,4);b.scale.set(8,2,4);b.position.x=8;surfaceUV(a,4);surfaceUV(b,4);assert.deepEqual(Array.from(shared.attributes.uv.array),before);const p=a.geometry.attributes.position,uv=a.geometry.attributes.uv,normal=a.geometry.attributes.normal;const upper=[];for(let i=0;i<p.count;i++)if(normal.getY(i)>.9)upper.push(uv.getX(i));near(Math.max(...upper)-Math.min(...upper),2);for(let i=0;i<p.count;i++)if(normal.getY(i)>.9)near(b.geometry.attributes.uv.getX(i)-uv.getX(i),2);
 const c=new T.Mesh(shared);c.rotation.y=Math.PI/2;c.scale.set(10,2,1);surfaceUV(c,4);assert.ok([...c.geometry.attributes.uv.array].every(Number.isFinite));
});
test('gait follows distance at 30/60/120Hz and stops when an enemy is stationary',()=>{
 const phases=[];for(const rate of [30,60,120]){const c={};for(let i=0;i<rate;i++)stepCharacterMotion(c,{x:0,z:0,moveX:4,moveZ:0,angle:Math.PI/2},1/rate,{player:true});phases.push(c.phase);}near(phases[0],phases[1]);near(phases[1],phases[2]);const c={};for(let i=0;i<120;i++)stepCharacterMotion(c,{x:2,z:3},1/60);near(c.phase,0);near(c.walk,0);
});
test('strafe and reverse poses follow actual direction, braking settles, dodge landing is bounded and pause freezes',()=>{
 const c={};let p;for(let i=0;i<30;i++)p=stepCharacterMotion(c,{moveX:5,moveZ:0,angle:0},1/60,{player:true});near(p.strafe,1);near(p.forward,0);assert.ok(p.roll<0);const snapshot=structuredClone(c);assert.deepEqual(stepCharacterMotion(c,{},0),snapshot.pose);assert.deepEqual(c,snapshot);for(let i=0;i<120;i++)p=stepCharacterMotion(c,{moveX:0,moveZ:0},1/60,{player:true});assert.ok(p.walk<.001&&Math.abs(p.pitch)<.001&&Math.abs(p.roll)<.001);p=stepCharacterMotion(c,{moveZ:-5,angle:0},1/60,{player:true});near(p.forward,-1);stepCharacterMotion(c,{dash:1,moveZ:22},1/60,{player:true});p=stepCharacterMotion(c,{dash:0,moveZ:0},1/60,{player:true});assert.equal(p.land,.12);assert.equal(p.footfall,false);
});
test('hit recoil resolves without persistent offset and footstep events are movement-only',()=>{
 assert.equal(hitRecoil(0),0);assert.ok(hitRecoil(.05,100)>hitRecoil(.05,10));assert.equal(hitRecoil(.3),0);const s=new Simulation({layout:{cover:[]}});s.start();s.toSpawn=1;s.spawnTimer=999;for(let i=0;i<60;i++)s.update(1/60,{auto:false});assert.equal(s.events.filter(e=>e.type==='footstep').length,0);for(let i=0;i<60;i++)s.update(1/60,{auto:false,x:1});const steps=s.events.filter(e=>e.type==='footstep').length;assert.ok(steps>=2&&steps<=4);s.pause();s.update(1/60,{x:1});assert.equal(s.events.filter(e=>e.type==='footstep').length,steps);
});
