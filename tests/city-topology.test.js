import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {CITY_FORMS,generateTopology,segmentDistance,withinBoundary,rectangleInside,roadOverlaps,boundarySegmentClear} from '../src/rebuild/CityTopology.js';
import {insideMap,segmentInMap} from '../src/rebuild/Map.js';
import {pointBlocked} from '../src/rebuild/config.js';

test('seeded cities use four different road graphs and footprints, with variation within each family',()=>{
 const forms=new Set(),shapes=new Set(),graphs=new Set();for(let seed=0;seed<64;seed++){const t=generateTopology(seed);forms.add(t.form);shapes.add(JSON.stringify(t.boundary));graphs.add(JSON.stringify(t.roads));assert.deepEqual(t,generateTopology(seed));assert.ok(t.roads.filter(s=>Math.abs(s.a.x-s.b.x)>2&&Math.abs(s.a.z-s.b.z)>2).length>t.roads.length*.5);assert.ok(withinBoundary(t.boundary,0,3,10));const connected=new Set([0]);let changed=true;while(changed){changed=false;for(let i=0;i<t.roads.length;i++)if(!connected.has(i)){const a=t.roads[i];if([...connected].some(j=>{const b=t.roads[j];return Math.min(segmentDistance(a.a,b.a,b.b),segmentDistance(a.b,b.a,b.b),segmentDistance(b.a,a.a,a.b),segmentDistance(b.b,a.a,a.b))<(a.width+b.width)/2;})){connected.add(i);changed=true;}}}assert.equal(connected.size,t.roads.length,`disconnected roads seed ${seed}`);}
 assert.equal(forms.size,CITY_FORMS.length);assert.equal(shapes.size,64);assert.equal(graphs.size,64);
});
test('roads, buildings, parking and destinations share traversable generated geometry',()=>{
 for(let seed=0;seed<32;seed++){
  const l=generateCity(seed),obstacles=[...l.buildings,...l.cover];assert.ok(l.buildings.length>=20,`buildings seed ${seed}`);assert.equal(l.landmarks.length,8);assert.ok(l.spawnPoints.length>100);assert.ok(!pointBlocked(0,3,1.1,obstacles));
  for(const b of l.buildings){assert.ok(rectangleInside(l.boundary,b,2));assert.equal(roadOverlaps(b,l.roads,1.1),false);}
  for(const s of l.roads){assert.ok(segmentInMap(l,s.a,s.b,1.4),`road ${s.id} outside traversable land seed ${seed}`);}
  for(const p of l.spawnPoints){assert.ok(insideMap(l,p.x,p.z,1.1),`spawn seed ${seed}`);assert.equal(pointBlocked(p.x,p.z,1.1,obstacles),false);}
  for(const p of l.landmarks){assert.ok(insideMap(l,p.x,p.z,1));assert.equal(pointBlocked(p.x,p.z,1,obstacles),false);}
  assert.equal(new Set(l.cover.filter(v=>v.driveable).map(v=>v.vehicleType)).size,8);
 }
});
test('concave coastlines reject routes that leave land even when both endpoints are on land',()=>{
 const boundary=[{x:-10,z:-10},{x:10,z:-10},{x:10,z:10},{x:4,z:10},{x:4,z:0},{x:-4,z:0},{x:-4,z:10},{x:-10,z:10}],l={city:true,boundary,waterObstacles:[]};
 const a={x:-7,z:7},b={x:7,z:7};assert.ok(insideMap(l,a.x,a.z));assert.ok(insideMap(l,b.x,b.z));assert.equal(segmentInMap(l,a,b,.5),false);assert.equal(boundarySegmentClear(boundary,a,b,.5),false);assert.equal(segmentInMap(l,{x:-7,z:-4},{x:7,z:-4},.5),true);
});
