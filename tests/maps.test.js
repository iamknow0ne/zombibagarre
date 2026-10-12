import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, isConnected, insideMap, segmentInMap } from '../src/rebuild/Map.js';
import { pointBlocked, ARENA } from '../src/rebuild/config.js';
import { Simulation } from '../src/rebuild/Simulation.js';

test('maps reproduce from a seed, differ between runs and regenerate per district',()=>{
 assert.deepEqual(generateMap(882,2),generateMap(882,2));
 assert.notDeepEqual(generateMap(882,2).cover,generateMap(883,2).cover);
 const s=new Simulation({seed:882});s.start();const previous=s.layout;s.wave=4;s.nextWave();
 assert.deepEqual(s.layout,generateMap(882,1));assert.notDeepEqual(s.layout.cover,previous.cover);
 assert.deepEqual(s.props.map(({id,health,maxHealth,...p})=>p),s.layout.cover);
});
test('320 generated districts keep spawn, extraction, boundaries and boss-sized routes open',()=>{
 for(let seed=0;seed<40;seed++)for(let district=0;district<8;district++){
  const m=generateMap(seed,district),label=`seed ${seed} district ${district}`;
  assert.ok(m.cover.length>=15,label+' has cover');
  assert.ok(m.cover.filter(p=>p.kind==='barrel').length>=2,label+' has fuel');
  assert.ok(isConnected(m.cover,1.1,m),label+' connected');
  for(const p of [{x:0,z:3},{x:0,z:-10},{x:0,z:-13}])assert.equal(pointBlocked(p.x,p.z,1.1,m.cover),false,label+' reserved');
  assert.ok(m.spawnPoints.length>5,label);for(const p of m.spawnPoints)assert.ok(insideMap(m,p.x,p.z,1.1),label);
  for(const p of m.cover){assert.ok(insideMap(m,p.x,p.z,1.1),label);assert.ok(p.x-p.w/2>m.bounds.minX+2&&p.x+p.w/2<m.bounds.maxX-2,label);assert.ok(p.z-p.d/2>m.bounds.minZ+2&&p.z+p.d/2<m.bounds.maxZ-2,label);}
 }
});

test('outlines and dimensions vary; movement cannot cross a concave cutout',()=>{
 const shapes=new Set(),sizes=new Set();for(let seed=0;seed<15;seed++){const m=generateMap(seed,4);shapes.add(m.shape);sizes.add(JSON.stringify(m.bounds));}
 assert.equal(shapes.size,4);assert.ok(sizes.size>8);
 const s=new Simulation({seed:31});s.start();s.toSpawn=999;s.spawnTimer=1e9;
 for(let i=0;i<600;i++){s.update(1/60,{auto:false,x:Math.sin(i*.015),z:Math.cos(i*.01),dash:i%180===0});assert.ok(insideMap(s.layout,s.player.x,s.player.z,s.player.radius-.001));}
 const m={boundary:[{x:-10,z:-10},{x:10,z:-10},{x:10,z:0},{x:0,z:0},{x:0,z:10},{x:-10,z:10}]};
 assert.equal(segmentInMap(m,{x:8,z:-1},{x:-1,z:8}),false);
});
