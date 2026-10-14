// Repeatable CPU-only collision microbenchmark. This is not a frame-rate test.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Simulation} from '../src/rebuild/Simulation.js';
import {collisionCandidates} from '../src/rebuild/SpatialIndex.js';
import {seededRandom,segmentBoxTime} from '../src/rebuild/config.js';
const sim=new Simulation({mode:'city',seed:20261012}),random=seededRandom(442),fragments=[];
for(let i=0;i<420;i++){const o=sim.obstacles[Math.floor(random()*sim.obstacles.length)],a={x:o.x+(random()-.5)*24,z:o.z+(random()-.5)*24};fragments.push({a,b:{x:a.x+(random()-.5)*.8,y:random()*10,z:a.z+(random()-.5)*.8}});}
const hit=(a,b,items)=>items.find(o=>b.y<(o.kind==='building'?o.h||5:1.5)&&segmentBoxTime(a,b,o)!==null);
const full=()=>fragments.map(({a,b})=>hit(a,b,sim.obstacles)?.id),indexed=()=>fragments.map(({a,b})=>hit(a,b,collisionCandidates(sim,a,b))?.id);
assert.deepEqual(indexed(),full());for(let i=0;i<30;i++){full();indexed();}
const rounds=11,frames=100,raw=[],fast=[];
const time=fn=>{const begin=performance.now();for(let i=0;i<frames;i++)fn();return(performance.now()-begin)/frames;};
for(let i=0;i<rounds;i++){if(i%2){fast.push(time(indexed));raw.push(time(full));}else{raw.push(time(full));fast.push(time(indexed));}}
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)],baseline=median(raw),optimized=median(fast);
console.log(JSON.stringify({kind:'CPU-only local microbenchmark; no FPS claim',seed:20261012,obstacles:sim.obstacles.length,movingFragments:fragments.length,rounds,framesPerRound:frames,baselineMsPerFrame:+baseline.toFixed(3),indexedMsPerFrame:+optimized.toFixed(3),speedup:+(baseline/optimized).toFixed(2),matchingHits:true},null,2));
