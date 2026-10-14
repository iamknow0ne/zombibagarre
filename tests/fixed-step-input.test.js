import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFixedStep,SIMULATION_STEP} from '../src/rebuild/FixedStepInput.js';
import {Input} from '../src/rebuild/Input.js';
import {Simulation} from '../src/rebuild/Simulation.js';
const game=()=>{const s=new Simulation({layout:{cover:[{kind:'platform',x:0,z:0,w:3.6,d:2.8,h:1.1,maxHealth:600,traversalSupport:true}],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},traversal:{anchors:[{id:'anchor',supportId:'prop-0',x:0,y:3.2,z:0}],reward:null}}});s.start();s.toSpawn=999;s.spawnTimer=1e6;s.events=[];return s;};
const inputFor=()=>{const input=Object.create(Input.prototype);Object.assign(input,{keys:new Set(),once:{},stick:{x:0,y:0},pointer:{active:false},source:'keyboard'});return input;};
test('a slow frame attaches a grapple exactly once instead of immediately releasing it',()=>{
 for(const steps of [2,3,6]){const s=game(),pending={};advanceFixedStep(s,SIMULATION_STEP*steps+.000001,{auto:false,grapple:true},pending);assert.ok(s.player.grapple,`${steps} catch-up ticks`);assert.equal(s.events.filter(e=>e.type==='traversal-attach').length,1);assert.equal(s.events.filter(e=>e.type==='traversal-release').length,0);assert.deepEqual(pending,{});}
});
test('catch-up does not rebuffer a jump after takeoff and retains continuous movement',()=>{
 const s=game();s.player.x=7;advanceFixedStep(s,SIMULATION_STEP*3+.000001,{auto:false,jump:true,x:1},{});assert.equal(s.events.filter(e=>e.type==='traversal-jump').length,1);assert.equal(s.player.jumpBuffer,0);assert.ok(s.player.x>7);assert.ok(s.player.y>0);
});
test('240Hz frames retain jump and grapple through Input.consume until one physics tick uses them',()=>{
 for(const action of ['jump','grapple']){const s=game(),input=inputFor();if(action==='jump')s.player.x=7;input.once[action]=true;let accumulator=0;
  for(let frame=0;frame<4;frame++){const consumed=input.consume({},false,s,1/240);accumulator=advanceFixedStep(s,accumulator+1/240,consumed,input.once);if(frame<3){assert.equal(s.time,0);assert.equal(input.once[action],true);}}
  assert.equal(s.events.filter(e=>e.type===`traversal-${action==='jump'?'jump':'attach'}`).length,1);assert.deepEqual(input.once,{});
  const held=input.consume({},false,s,1/30);advanceFixedStep(s,accumulator+1/30,held,input.once);assert.equal(s.events.filter(e=>e.type===`traversal-${action==='jump'?'jump':'attach'}`).length,1);assert.ok(!s.events.some(e=>e.type==='traversal-release'));
 }
});
test('all existing edge actions fire once during catch-up while held controls remain active',()=>{
 const calls=[],sim={update(dt,input){calls.push({...input});}},edges={bulletTime:true,dash:true,melee:true,grenade:true,reload:true,interact:true,weapon:'smg',jump:true,grapple:true},held={x:.8,z:-.4,auto:false,firing:true,fireHands:[true,false],aim:{x:4,z:7},drive:{throttle:.7}};
 advanceFixedStep(sim,SIMULATION_STEP*4+.000001,{...held,...edges},{});assert.equal(calls.length,4);
 for(const key of Object.keys(edges))assert.equal(calls.filter(c=>!!c[key]).length,1,key);
 for(const call of calls)for(const [key,value]of Object.entries(held))assert.deepEqual(call[key],value,key);
});
test('a no-tick frame retains every simulation edge but does not replay an already-consumed aim toggle',()=>{
 const pending={interact:true},frame={jump:true,grapple:true,weapon:'katana',bulletTime:true,dash:true,melee:true,grenade:true,reload:true,toggleAim:true};let updates=0;
 advanceFixedStep({update(){updates++;}},.001,frame,pending);assert.equal(updates,0);assert.equal(pending.interact,true);for(const key of Object.keys(frame).filter(k=>k!=='toggleAim'))assert.equal(pending[key],frame[key]);assert.equal(pending.toggleAim,undefined);
});
