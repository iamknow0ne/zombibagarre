import test from 'node:test';
import assert from 'node:assert/strict';
import {feetHeight,actorSpan,propSpan,verticalGap,heightGap,bodyHit3D,boxHit3D,perspectiveTarget} from '../src/rebuild/Ballistics.js';

test('height spans use finite feet/base coordinates and preserve dimension defaults',()=>{
 for(const e of [undefined,null,{}, {y:NaN},{y:Infinity},{y:'4'}])assert.equal(feetHeight(e),0);
 assert.equal(feetHeight({y:-2}),-2);
 assert.deepEqual(actorSpan({y:4}),{min:4,max:5.85});
 assert.deepEqual(actorSpan({y:4,crawling:true}),{min:4,max:4.65});
 assert.deepEqual(actorSpan({y:4,bossHeight:12}),{min:4,max:16});
 assert.deepEqual(propSpan({y:3,h:.5}),{min:3,max:3.5});
 assert.deepEqual(propSpan({kind:'barrier'}),{min:0,max:1.1});
});
test('vertical distances distinguish overlap, touching surfaces and separated volumes',()=>{
 const a={min:2,max:4};
 for(const b of [{min:3,max:5},{min:4,max:6},{min:0,max:2}])assert.equal(verticalGap(a,b),0);
 assert.equal(verticalGap(a,{min:6,max:8}),2);
 assert.equal(verticalGap({min:6,max:8},a),2);
 assert.equal(heightGap(3,a),0);assert.equal(heightGap(0,a),2);assert.equal(heightGap(7,a),3);
});
test('elevated bodies are hit at their actual altitude, including vertical sweeps',()=>{
 const e={id:1,x:0,y:4,z:8,radius:.5,health:10};
 for(const y of [1,6])assert.equal(bodyHit3D({x:0,y,z:0},{x:0,y,z:10},e),null);
 assert.equal(bodyHit3D({x:0,y:4.8,z:0},{x:0,y:4.8,z:10},e),.75);
 assert.equal(bodyHit3D({x:0,y:0,z:8},{x:0,y:10,z:8},e),.4);
 const target=perspectiveTarget({x:0,y:4.8,z:0},0,0,[],[e]);assert.equal(target.targetId,1);
});
test('raised slabs allow fire below, stop fire inside and expose their real underside',()=>{
 const slab={x:0,y:3,z:5,w:2,d:2,h:.5};
 for(const y of [1,4])assert.equal(boxHit3D({x:0,y,z:0},{x:0,y,z:10},slab),null);
 assert.equal(boxHit3D({x:0,y:3.2,z:0},{x:0,y:3.2,z:10},slab),.4);
 assert.equal(boxHit3D({x:0,y:0,z:5},{x:0,y:10,z:5},slab),.3);
 assert.equal(boxHit3D({x:0,y:10,z:5},{x:0,y:0,z:5},slab),.65);
});
test('explicit zero base and legacy ground volumes retain identical intersections',()=>{
 const box={x:0,z:5,w:2,d:2,h:2},body={x:0,z:5,radius:.5};
 for(const y of [0,1,2,4]){const a={x:0,y,z:0},b={x:0,y,z:10};assert.equal(boxHit3D(a,b,box),boxHit3D(a,b,{...box,y:0}));assert.equal(bodyHit3D(a,b,body),bodyHit3D(a,b,{...body,y:0}));}
});
