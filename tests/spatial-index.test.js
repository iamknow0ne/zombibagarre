import test from 'node:test';
import assert from 'node:assert/strict';
import {SpatialIndex,collisionCandidates} from '../src/rebuild/SpatialIndex.js';
import {segmentBoxTime,seededRandom,lineBlocked} from '../src/rebuild/config.js';
import {Simulation} from '../src/rebuild/Simulation.js';
test('indexed collision candidates preserve exact hits and ties for long, padded and negative-coordinate rays',()=>{
 const r=seededRandom(362),items=Array.from({length:700},(_,id)=>({id,x:r()*400-200,z:r()*400-200,w:1+r()*35,d:1+r()*20,driveable:id%29===0})),index=new SpatialIndex(items);
 for(let i=0;i<1500;i++){const a={x:r()*500-250,z:r()*500-250},b={x:a.x+r()*40-20,z:a.z+r()*40-20},pad=r()*4;const exact=xs=>xs.filter(o=>segmentBoxTime(a,b,o,pad)!==null).map(o=>o.id);assert.deepEqual(exact(index.segment(a,b,pad)),exact(items));}
 assert.equal(index.segment({x:-1000,z:-1000},{x:1000,z:1000}),items);
});
test('moving vehicles, destroyed geometry and replaced worlds never leave stale collision cells',()=>{
 const obstacles=Array.from({length:30},(_,i)=>({x:i*15,z:0,w:2,d:2,health:100}));const car=obstacles[29];car.driveable=true;const s={obstacles};collisionCandidates(s,{x:0,z:0},{x:1,z:0});car.x=0;car.z=10;assert.ok(collisionCandidates(s,{x:0,z:9},{x:0,z:11}).includes(car));s.obstacles=obstacles.filter(o=>o!==car);assert.ok(!collisionCandidates(s,{x:0,z:9},{x:0,z:11}).includes(car));s.geometryRevision=1;const before=s.collisionIndex;collisionCandidates(s,{x:0,z:0},{x:1,z:0});assert.notEqual(s.collisionIndex,before);
});
test('broad phase materially reduces city-sized local queries without changing combat obstruction',()=>{
 const s=new Simulation({mode:'city',seed:20261012}),a={x:0,z:3},b={x:10,z:8};const local=collisionCandidates(s,a,b);assert.ok(local.length<s.obstacles.length*.3);assert.equal(lineBlocked(a,b,.5,collisionCandidates(s,a,b,.5)),lineBlocked(a,b,.5,s.obstacles));
});
