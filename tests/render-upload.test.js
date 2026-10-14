import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {WebGLAttributes} from 'three/src/renderers/webgl/WebGLAttributes.js';
import {CharacterInstances} from '../src/rebuild/RenderBatch.js';
import {StructureVisuals} from '../src/rebuild/StructureVisuals.js';
import {WeatherVisuals} from '../src/rebuild/WeatherVisuals.js';
import {createWeather} from '../src/rebuild/Weather.js';

// Exercise Three's real upload path with an in-memory GPU buffer, including
// shrink-to-empty and later growth. No WebGL context or timing assertions.
function gpuBuffer(){
 let memory,transfers=[];
 const gl={FLOAT:5126,createBuffer:()=>({}),bindBuffer(){},bufferData(_,array){memory=array.slice();},bufferSubData(_,offset,array,start=0,count=array.length){memory.set(array.subarray(start,start+count),offset/4);transfers.push(count*4);}};
 const attributes=WebGLAttributes(gl);
 return {upload:a=>attributes.update(a,34962),get memory(){return memory;},transfers};
}

test('enemy batches upload only live transforms and remain correct after shrinking and growing',()=>{
 const scene=new T.Scene(),actors=new Map(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();
 for(let i=0;i<12;i++){const root=new T.Group();root.userData={type:'walker',variant:0};root.add(new T.Mesh(geometry,material));root.position.x=i*3;scene.add(root);actors.set(i,root);}
 const instances=new CharacterInstances(scene);instances.update(actors);const batch=[...instances.batches.values()][0],gpu=gpuBuffer();gpu.upload(batch.instanceMatrix);
 for(const actor of actors.values())actor.position.z=5;
 instances.update(actors);gpu.upload(batch.instanceMatrix);assert.deepEqual(gpu.transfers,[12*64]);for(let i=0;i<12;i++)assert.equal(gpu.memory[i*16+14],5);
 for(let i=1;i<12;i++)actors.get(i).visible=false;
 instances.update(actors);gpu.upload(batch.instanceMatrix);assert.equal(batch.count,1);assert.equal(gpu.transfers.at(-1),64);
 actors.get(0).visible=false;instances.update(actors);gpu.upload(batch.instanceMatrix);assert.equal(batch.visible,false);assert.equal(gpu.transfers.length,2);
 for(const actor of actors.values()){actor.visible=true;actor.position.z=9;}
 instances.update(actors);gpu.upload(batch.instanceMatrix);assert.equal(gpu.transfers.at(-1),12*64);for(let i=0;i<12;i++)assert.equal(gpu.memory[i*16+14],9);
 instances.dispose();geometry.dispose();material.dispose();
});

test('collapsing structure uploads preserve moving chunks and release instance buffers on teardown',()=>{
 const scene=new T.Scene(),visuals=new StructureVisuals(scene),parts=Array.from({length:9},(_,i)=>({material:'brick',x:i,y:2,z:0,rx:0,ry:0,rz:0,w:1,h:2,d:1}));
 visuals.update(parts,{x:0,z:0});const batch=[...visuals.batches.values()][0],gpu=gpuBuffer();gpu.upload(batch.instanceMatrix);parts[0].y=7;
 visuals.update(parts,{x:0,z:0});gpu.upload(batch.instanceMatrix);assert.equal(gpu.memory[13],7);assert.equal(gpu.transfers[0],3*64);
 visuals.update(parts,{x:1000,z:1000});gpu.upload(batch.instanceMatrix);assert.equal(batch.visible,false);assert.equal(gpu.transfers.length,1);
 const released=[];for(const b of visuals.batches.values())b.addEventListener('dispose',()=>released.push(b.uuid));const count=visuals.batches.size;
 visuals.dispose();assert.equal(released.length,count);assert.equal(scene.children.length,0);assert.equal(visuals.batches.size,0);
});

test('weather uploads only active precipitation and refreshes all drops after quality increases',()=>{
 const world={layout:{mapSeed:73},scene:new T.Scene(),hemi:new T.HemisphereLight(),sun:new T.DirectionalLight(),rim:new T.DirectionalLight(),cityLights:[],surfaces:{materials:new Map()},ash:{},renderer:{getPixelRatio:()=>1},settings:{quality:'low',weatherEffects:'full',environmentDetail:'standard'}};
 world.scene.background=new T.Color();world.scene.fog=new T.FogExp2();const v=new WeatherVisuals(world),sim={weather:createWeather(1),player:{x:0,z:0},obstacles:[],geometryRevision:0};sim.weather.rain=1;sim.weather.snow=0;
 const rain=gpuBuffer(),snow=gpuBuffer();rain.upload(v.rain.geometry.attributes.position);snow.upload(v.snow.geometry.attributes.position);
 v.update(sim,1/60);rain.upload(v.rain.geometry.attributes.position);snow.upload(v.snow.geometry.attributes.position);assert.deepEqual(rain.transfers,[180*6*4]);assert.equal(snow.transfers.length,0);
 world.settings.quality='high';v.update(sim,1/60);rain.upload(v.rain.geometry.attributes.position);assert.equal(rain.transfers.at(-1),900*6*4);assert.deepEqual(rain.memory,v.rainPositions);
 sim.weather.rain=0;sim.weather.snow=1;v.update(sim,1/60);rain.upload(v.rain.geometry.attributes.position);snow.upload(v.snow.geometry.attributes.position);assert.equal(rain.transfers.length,2);assert.deepEqual(snow.transfers,[900*3*4]);assert.deepEqual(snow.memory,v.snowPositions);
 v.dispose();
});

test('foliage draws only visible sprites and returns correctly after moving or changing density',async()=>{
 const {CityArt}=await import('../src/rebuild/CityArt.js');
 const world={layout:{city:false},scene:new T.Scene(),settings:{foliageDetail:'lush'},buildingMeshes:new Map([['shop',{userData:{collapsed:false}}]])},art=new CityArt(world),camera=new T.PerspectiveCamera();
 art.plan=Array.from({length:10},(_,i)=>({x:i===9?200:i*4,z:0,y:0,h:2,tile:0,owner:i===2?'shop':null}));art.buildSprites(new T.Texture());
 const mesh=art.groups[0].mesh,matrix=new T.Matrix4();art.update(.1,{x:0,z:0},camera,1);assert.equal(mesh.count,9);assert.equal(mesh.visible,true);mesh.getMatrixAt(8,matrix);assert.equal(matrix.elements[12],32);
 world.buildingMeshes.get('shop').userData.collapsed=true;art.update(.1,{x:0,z:0},camera,2);assert.equal(mesh.count,8);mesh.getMatrixAt(2,matrix);assert.equal(matrix.elements[12],12);
 art.update(.1,{x:200,z:0},camera,3);assert.equal(mesh.count,1);mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],200);
 world.settings.foliageDetail='sparse';art.update(.1,{x:1000,z:0},camera,4);assert.equal(mesh.count,0);assert.equal(mesh.visible,false);
 world.buildingMeshes.get('shop').userData.collapsed=false;art.update(.1,{x:0,z:0},camera,5);assert.equal(mesh.count,7);assert.equal(mesh.visible,true);art.dispose();
});
