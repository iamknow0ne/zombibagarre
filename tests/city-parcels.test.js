import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCity} from '../src/rebuild/City.js';
import {generateParcel,PARCEL_SHAPES} from '../src/rebuild/CityParcels.js';
import {generateMap,isConnected} from '../src/rebuild/Map.js';
import {pointBlocked} from '../src/rebuild/config.js';
const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-1e-6&&Math.abs(a.z-b.z)<(a.d+b.d)/2-1e-6;
test('seeded parcels vary footprint, height, roof and setback without overlapping wings or roads',()=>{
 for(let seed=0;seed<60;seed++){
  const city=generateCity(seed),buildings=city.buildings;
  assert.equal(new Set(buildings.map(b=>b.shape)).size,PARCEL_SHAPES.length);
  assert.ok(new Set(buildings.map(b=>b.h)).size>=4);
  assert.ok(new Set(buildings.map(b=>b.roof)).size>=3);
  assert.ok(new Set(buildings.map(b=>b.w.toFixed(1))).size>12);
  assert.equal(new Set(buildings.map(b=>b.id)).size,buildings.length);
  for(const b of buildings){
   assert.ok(Math.abs(b.x-b.parcelX)+b.w/2<=11.000001);assert.ok(Math.abs(b.z-b.parcelZ)+b.d/2<=11.000001);
   assert.ok(b.h>=3.1&&b.h<=20);assert.ok(b.w>=6&&b.d>=6);
   for(const other of buildings)if(other!==b)assert.equal(overlaps(b,other),false,`${seed}: ${b.id} overlaps ${other.id}`);
  }
  for(const prop of city.cover)for(const b of buildings)assert.equal(overlaps(prop,b),false);
  for(const road of city.roads)for(let v=-106;v<=106;v+=2){assert.equal(pointBlocked(road,v,1.3,buildings),false);assert.equal(pointBlocked(v,road,1.3,buildings),false);}
 }
 assert.deepEqual(generateCity(-1),generateCity(-1));assert.notDeepEqual(generateCity(1).buildings,generateCity(2).buildings);
});
test('courtyards and alleys remain connected for the largest enemies across generated cities',()=>{
 for(let seed=0;seed<60;seed++){const city=generateCity(seed);assert.ok(isConnected([...city.buildings,...city.cover],1.1,city),`seed ${seed}`);}
 const parts=Array.from({length:5},(_,i)=>generateParcel(0,0,0,i)).find(p=>p[0].shape==='courtyard'),voids=[];
 for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++)if(!pointBlocked(x,z,1.1,parts))voids.push([x,z]);
 assert.equal(parts[0].shape,'courtyard');assert.ok(voids.length>20);
});
test('biome street facades vary widths, setbacks and heights while remaining repeatable',()=>{
 const m=generateMap(842,0);assert.deepEqual(m,generateMap(842,0));assert.ok(new Set(m.facades.map(b=>b.w.toFixed(1))).size>3);assert.ok(new Set(m.facades.map(b=>b.h)).size>=3);
});

test('compound roofs batch and disappear correctly as destructible sections',async()=>{
 const T=await import('three'),{World}=await import('../src/rebuild/World.js');
 const w=Object.create(World.prototype),g=new T.Group(),roof=new T.Group(),material=new T.MeshStandardMaterial();
 const wall=new T.Mesh(new T.BoxGeometry(6,8,9),material);roof.add(new T.Mesh(new T.BoxGeometry(6,.2,9),material));
 const triangle=new T.BufferGeometry();triangle.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));triangle.computeVertexNormals();roof.add(new T.Mesh(triangle,material));g.add(wall,roof);g.userData={sections:[wall,roof],glass:[]};
 w.rebuildBuildingShell(g);assert.equal(g.userData.shell.children.length,2);assert.ok(g.userData.shell.children.every(m=>m.geometry));
 roof.visible=false;w.rebuildBuildingShell(g);assert.equal(g.userData.shell.children.length,1);assert.equal(g.userData.shell.children[0].geometry.attributes.position.count,wall.geometry.attributes.position.count);
});
