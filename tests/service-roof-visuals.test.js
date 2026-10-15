import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildServiceRoof} from '../src/rebuild/ServiceRoofVisuals.js';

test('authored roof collision and visible solids agree in world space; details stay inside the solids',()=>{
 const b={x:27,z:-19,h:5.9},root=new T.Group();root.position.set(b.x,0,b.z);
 const parts=[{role:'deck',x:27,y:5.89,z:-19,w:9.3,d:8.3,h:.32},{role:'parapet',x:31.4,y:6.21,z:-19,w:.25,d:8,h:.7},{role:'parapet',x:27,y:6.21,z:-22.9,w:8.8,d:.25,h:.7},{role:'hvac',x:25,y:6.21,z:-21,w:1.8,d:1.3,h:1}];
 const material=new T.MeshStandardMaterial(),kit={surfaces:{apply:m=>m},box(parent,color,x,y,z,w,h,d){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}};
 const result=buildServiceRoof(root,b,{parts,anchor:{x:27,z:-17.5}},kit);root.updateMatrixWorld(true);assert.equal(result.length,parts.length);
 const bounds=p=>new T.Box3(new T.Vector3(p.x-p.w/2,p.y,p.z-p.d/2),new T.Vector3(p.x+p.w/2,p.y+p.h,p.z+p.d/2));
 for(let i=0;i<parts.length;i++){const actual=new T.Box3().setFromObject(result[i]),expected=bounds(parts[i]);assert.ok(actual.min.distanceTo(expected.min)<1e-6);assert.ok(actual.max.distanceTo(expected.max)<1e-6);assert.equal(result[i].userData.roofPart,parts[i]);}
 for(const mesh of root.children){const actual=new T.Box3().setFromObject(mesh);assert.ok(parts.some(p=>bounds(p).expandByScalar(1e-6).containsBox(actual)),`${mesh.name||'detail'} extends beyond collision solids`);mesh.geometry.dispose();}material.dispose();
});

test('roof map destination is the safe street approach and disappears with its host',async()=>{
 const {serviceRoofPlaces}=await import('../src/rebuild/Atlas.js');const roof={id:'roof',buildingId:'host',approach:{x:3,z:7},anchor:{x:3,z:2,y:7}};const sim={layout:{traversal:{roofs:[roof]}},props:[{id:'host',health:100}]};
 assert.deepEqual(serviceRoofPlaces(sim),[{x:3,z:7,id:'roof',name:'LAST SIGNAL / ROOFTOP',kind:'travel'}]);assert.equal(roof.approach.name,undefined);sim.rooftopEncounters={roof:{state:'cleared',guardId:1}};assert.equal(serviceRoofPlaces(sim)[0].name,'LAST SIGNAL / CACHE READY');sim.rooftopEncounters.roof.state='claimed';assert.equal(serviceRoofPlaces(sim)[0].name,'LAST SIGNAL / RECOVERED');sim.props[0].health=0;assert.deepEqual(serviceRoofPlaces(sim),[]);
});
