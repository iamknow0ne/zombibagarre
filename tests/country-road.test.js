import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCountryRoad} from '../src/rebuild/CountryRoad.js';
import {insideMap,segmentInMap} from '../src/rebuild/Map.js';
import {waterAt} from '../src/rebuild/City.js';
import {pointBlocked,lineBlocked,distance} from '../src/rebuild/config.js';
import {roadOverlaps} from '../src/rebuild/CityTopology.js';
import {crossingApproaches} from '../src/rebuild/StreetGraph.js';
import {cityArtPlan} from '../src/rebuild/CityArt.js';
const solids=m=>[...m.buildings,...m.cover];
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;

test('country region is reproducible, varied and compatible with outdoor road metadata',()=>{
 const a=generateCountryRoad(73);assert.deepEqual(a,generateCountryRoad(73));assert.notDeepEqual(a,generateCountryRoad(74));assert.equal(a.region.id,'country-road');assert.equal(a.region.name,'Old Mill Road');assert.equal(a.city,true);assert.equal(a.country,true);assert.deepEqual(a.spawn,a.region.gate);assert.ok(a.bounds.maxZ-a.bounds.minZ>125);assert.ok(a.boundary.length>8);assert.ok(a.roads.some(r=>Math.abs(r.a.x-r.b.x)>3));assert.ok(a.streetPoints.every(p=>Number.isFinite(p.angle)&&p.width>0));assert.ok(a.nodes.every(n=>Array.isArray(n.arms)));assert.equal(crossingApproaches(a.nodes).length,0,'bends must not create fake crossroads');assert.ok(cityArtPlan(a).length>0);assert.ok(cityArtPlan(a).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));assert.deepEqual(a.traversal,{anchors:[],reward:null});assert.deepEqual(a.landmarks,[],'no repeated city discovery gifts');
});

test('100 seeded rural routes keep gate, supply, encounters and all road segments dry and clear',()=>{
 for(let seed=0;seed<100;seed++){
  const m=generateCountryRoad(seed),all=solids(m),tag=`seed ${seed}`;assert.ok(m.buildings.length>=2&&m.buildings.length<=3,tag);assert.ok(m.cover.filter(o=>o.kind==='planter'&&o.wild).length>=70,tag);assert.ok(m.cover.some(o=>o.kind==='barrel')&&m.cover.some(o=>o.kind==='crate'),tag);
  for(const p of [m.region.gate,m.region.supply,...m.region.encounterSpawns,...m.spawnPoints]){assert.ok(insideMap(m,p.x,p.z,1.2),tag);assert.equal(waterAt(m,p.x,p.z),false,tag);assert.equal(pointBlocked(p.x,p.z,1.2,all),false,tag);}
  for(const r of m.roads){assert.ok(segmentInMap(m,r.a,r.b,.6)||r===m.roads[0]||r===m.roads.at(-1),tag);assert.equal(lineBlocked(r.a,r.b,1.2,all),false,tag);assert.ok(!all.some(o=>roadOverlaps(o,[r],1)),tag);}
  const route=[m.region.gate,...m.roads.slice(0,4).map(r=>r.b)];for(let i=1;i<route.length;i++){assert.ok(segmentInMap(m,route[i-1],route[i],1.2),tag);assert.equal(lineBlocked(route[i-1],route[i],1.2,all),false,tag);}assert.ok(distance(route.at(-1),m.region.supply)<1e-8);
  for(const p of m.region.encounterSpawns){assert.ok(distance(p,m.region.gate)>60,tag);assert.ok(segmentInMap(m,p,m.region.supply,.65),tag);assert.equal(lineBlocked(p,m.region.supply,.65,all),false,tag);}
  for(let i=0;i<all.length;i++){const o=all[i];assert.ok(insideMap(m,o.x,o.z,1),tag);assert.ok(!all.slice(i+1).some(other=>overlap(o,other)),tag);assert.ok(o.w>0&&o.d>0,tag);}
  assert.equal(new Set(m.buildings.map(b=>b.id)).size,m.buildings.length);assert.ok(m.buildings.every(b=>b.shop&&b.h>=3&&b.h<8&&b.roof&&b.primary));
 }
});

test('country data never shares mutable cover, encounter or reward state between calls',()=>{
 const a=generateCountryRoad(73),b=generateCountryRoad(73);a.cover[0].health=0;a.region.encounterSpawns[0].x+=100;a.region.supply.claimed=true;assert.notEqual(a.cover[0].health,b.cover[0].health);assert.notEqual(a.region.encounterSpawns[0].x,b.region.encounterSpawns[0].x);assert.equal(b.region.supply.claimed,undefined);
});
