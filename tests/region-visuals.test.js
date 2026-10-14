import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RegionVisuals} from '../src/rebuild/RegionVisuals.js';
import {World} from '../src/rebuild/World.js';
function canvas(t){const original=globalThis.document;let created=0,labels=[];globalThis.document={createElement:()=>{created++;return{width:0,height:0,getContext:()=>new Proxy({fillText(text){labels.push(text);}},{get:(target,key)=>target[key]||(()=>{})})};}};t.after(()=>{if(original)globalThis.document=original;else delete globalThis.document;});return{created:()=>created,labels};}
function sim(country=false){return{activeRegionId:country?'country-road':'city',regionGates:country?{}:{city:{id:'exit',x:8,z:10,angle:.6,name:'OLD MILL ROAD'}},player:{x:8,z:10},rpg:{countrySupplies:false},layout:{country,region:country?{gate:{x:0,z:3,angle:Math.PI},supply:{x:4,z:12}}:null},props:[],events:[]};}
function resources(view){const result=new Set();view.root.traverse(node=>{if(node.geometry)result.add(node.geometry);if(node.material){result.add(node.material);if(node.material.map)result.add(node.material.map);}});return result;}
test('travel signs use the active destination, remain grounded and leave the arrival centre clear',t=>{
 const draw=canvas(t),scene=new T.Scene(),view=new RegionVisuals(scene),state=sim(),before=JSON.stringify(state);view.update(state);
 assert.equal(view.gate.visible,true);assert.equal(view.supply.visible,false);assert.equal(view.gate.position.y,0);assert.ok(Math.abs(Math.hypot(view.gate.position.x-8,view.gate.position.z-10)-1.9)<1e-9);assert.ok(draw.labels.includes('OLD MILL ROAD'));assert.equal(JSON.stringify(state),before);
 const labels=view.gate.children.filter(mesh=>mesh.material.map);assert.equal(labels.length,2);assert.equal(labels[1].rotation.y,Math.PI,'both sides must display readable text rather than mirrored letters');
 state.player.x=200;view.update(state);assert.equal(view.gate.visible,false);view.update(state,true);assert.equal(view.gate.visible,true);
 state.interior={};view.update(state);assert.equal(view.root.visible,false);view.dispose();assert.equal(scene.children.length,0);
});
test('prepared country worlds display their return sign before gate commit and supply collection opens an empty crate',t=>{
 const draw=canvas(t),view=new RegionVisuals(new T.Scene()),state=sim(true);view.update(state);assert.ok(draw.labels.includes('SAINT-ROCH'));assert.equal(view.gate.visible,true);assert.equal(view.supply.visible,true);assert.equal(view.lid.rotation.x,0);assert.equal(view.contents.visible,true);assert.deepEqual(view.supply.position.toArray(),[4,0,12]);
 state.rpg.countrySupplies=true;view.update(state);assert.ok(view.lid.rotation.x<-1);assert.equal(view.contents.visible,false);assert.ok(draw.labels.includes('RECOVERED'));assert.equal(view.supply.visible,true,'the opened crate stays as a grounded record of the visit');
 state.rpg.countrySupplies=false;view.update(state);assert.equal(view.lid.rotation.x,0);assert.equal(view.contents.visible,true);view.dispose();
});
test('ordinary region updates allocate no new resources or labels and disposal releases each resource once',t=>{
 const draw=canvas(t),scene=new T.Scene(),view=new RegionVisuals(scene),state=sim(true);view.update(state);const initial=resources(view),writes=draw.labels.length;let meshes=0;view.root.traverse(node=>{if(node.isMesh)meshes++;});assert.ok(meshes<50);assert.equal(draw.created(),2);
 for(let n=0;n<500;n++){state.player.x=n%20;view.update(state);}assert.deepEqual(resources(view),initial);assert.equal(draw.created(),2);assert.equal(draw.labels.length,writes);
 const counts=new Map([...initial].map(resource=>[resource,0]));for(const resource of initial)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));view.dispose();view.dispose();assert.ok([...counts.values()].every(count=>count===1));assert.equal(scene.children.length,0);
});
test('World hooks reuse one regional decoration set while handling removed or replaced gates',t=>{
 canvas(t);const scene=new T.Scene(),state=sim(),world={scene,layout:state.layout};World.prototype.updateRegionVisuals.call(world,state);const view=world.regionVisuals;assert.ok(view);
 for(let i=0;i<10;i++)World.prototype.updateRegionVisuals.call(world,state);assert.equal(world.regionVisuals,view);assert.equal(scene.children.length,1);
 state.regionGates=null;World.prototype.updateRegionVisuals.call(world,state);assert.equal(view.gate.visible,false);
 state.regionGates={city:{x:3,z:4,angle:0,name:'SECOND PATH'}};World.prototype.updateRegionVisuals.call(world,state);assert.equal(view.gate.visible,true);assert.equal(view.gateName,'SECOND PATH');view.dispose();
});
