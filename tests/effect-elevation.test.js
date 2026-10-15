import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {effectFloor,fragmentFloor,stepRemainsElevation} from '../src/rebuild/EffectElevation.js';
import {stepFragment} from '../src/rebuild/Ballistics.js';
import {cutWave,evolutionFX,weaponImpact} from '../src/rebuild/WeaponFX.js';
const roof=()=>({id:'roof',x:0,z:0,y:3,h:.3,w:6,d:6,health:100});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('effect support respects height, live destruction and non-standable geometry',()=>{
 const b=roof(),sim={obstacles:[b]},p={x:0,y:4,z:0};near(effectFloor(sim,p),3.3);near(effectFloor(sim,{...p,y:2}),0);
 b.standable=false;near(effectFloor(sim,p),0);b.standable=true;b.health=0;near(effectFloor(sim,p),0);
 b.health=100;near(effectFloor(sim,{...p,x:4}),0);
});
test('fragments land on a roof, then fall off its edge without an invisible floor',()=>{
 const sim={obstacles:[roof()]},e={mesh:new T.Mesh(),vx:0,vy:-2,vz:0,drag:0,gravity:9.81,bounce:.3};e.mesh.position.set(0,3.4,0);
 const floor=fragmentFloor(sim,e,.1);near(floor,3.3);assert.equal(stepFragment(e,.1,floor+.065),true);near(e.mesh.position.y,3.365);
 e.mesh.position.x=2.99;e.vx=10;e.vy=-1;near(fragmentFloor(sim,e,.1),0);stepFragment(e,.1,.065);assert.ok(e.mesh.position.y<3.365);
});
test('settled remains fall when their roof disappears and stop on the next live surface',()=>{
 const lower={...roof(),id:'lower',y:0,h:1},b=roof(),sim={obstacles:[b,lower]},c={baseY:3.3,mesh:new T.Mesh()};c.mesh.position.set(0,3.52,0);
 stepRemainsElevation(c,sim,.05);near(c.baseY,3.3);b.health=0;
 stepRemainsElevation(c,sim,0);near(c.baseY,3.3);
 for(let i=0;i<40;i++)stepRemainsElevation(c,sim,.05);near(c.baseY,1);near(c.mesh.position.y,1.22);near(c.fallVelocity,0);
});
function fx(){return{scene:new T.Scene(),effects:[],random:()=>.5,ring:()=>new T.Mesh(),smokeCalls:[],smoke(...a){this.smokeCalls.push(a);},lightningCalls:[],lightning(e){this.lightningCalls.push(e);}};}
test('hammer and sword waves and evolution streaks originate on the actor floor',()=>{
 const w=fx();cutWave(w,{weapon:'hammer',x:1,z:2,baseY:6,radius:3});near(w.effects[0].mesh.position.y,6.12);near(w.smokeCalls[0][3],6.1);
 cutWave(w,{weapon:'katana',x:1,z:2,baseY:6,radius:3,angle:0});near(w.effects[1].mesh.position.y,6.9);
 evolutionFX(w,{weapon:'carbine',x:1,z:2,baseY:6});for(const e of w.effects.slice(2))near(e.mesh.position.y,7);
});
test('electric impact uses its absolute impact height including ground zero',()=>{
 for(const y of [0,7]){const w=fx();weaponImpact(w,{weapon:'arc',x:0,y,z:0,tier:0,material:'metal'});near(w.lightningCalls[0].y,y-.35);near(w.lightningCalls[0].toY,y+.35);}
});
