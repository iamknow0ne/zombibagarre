import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/rebuild/World.js';
import {StructureVisuals} from '../src/rebuild/StructureVisuals.js';
import {buildVehicle} from '../src/rebuild/VehicleVisuals.js';

function fixture(){
 const world=Object.create(World.prototype),scene=new T.Scene(),material=new T.MeshStandardMaterial();material.userData.shared=true;
 const layout={mapSeed:812,cover:[{x:5,z:7,kind:'car',driveable:true,vehicleType:'patrol'},{x:12,z:7,kind:'crate',w:2,d:2},{x:14,z:10,kind:'car',driveable:true},{x:20,z:10,kind:'barrel'}]};
 Object.assign(world,{scene,layout,propMeshes:new Map(),buildingMeshes:new Map(),wrecks:[],effects:[],shake:0,focus:new T.Vector3(),player:new T.Group(),structuralVisuals:new StructureVisuals(scene),random:()=>{throw Error('Hydration consumed world RNG');},effect:()=>{throw Error('Hydration emitted effects');},smoke:()=>{throw Error('Hydration emitted smoke');},flame:()=>{throw Error('Hydration emitted fire');}});
 const box=(parent,color,x,y,z,w,h,d)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const cylinder=(parent,color,x,y,z,r,h)=>box(parent,color,x,y,z,r*2,h,r*2);
 for(const [i,plan]of layout.cover.entries()){const group=new T.Group();scene.add(group);world.propMeshes.set(`prop-${i}`,group);if(i===0)buildVehicle(group,plan,{box,cylinder,contact(){},batch(){}});}
 for(let i=0;i<2;i++){
  const group=new T.Group();group.position.set(30+i*20,0,20);scene.add(group);const sections=[],glass=[];
  for(let n=0;n<20;n++){const part=box(group,0,n%5-2,1+Math.floor(n/5)*2,2,1,1,.2);sections.push(part);}
  for(let n=0;n<8;n++)glass.push(box(group,0,n%4-2,2+Math.floor(n/4)*2,2.2,.5,.8,.1));
  const roof=box(group,0,0,10,0,6,.2,6);sections.push(roof);const roofAccessories=new T.Group();group.add(roofAccessories);
  Object.assign(group.userData,{sections,glass,roof,roofAccessories,plan:{x:group.position.x,z:20,w:6,d:6,h:10}});world.buildingMeshes.set(`building-${i}`,group);world.rebuildBuildingShell(group);
 }
 return world;
}
function snapshot(){return{time:9,player:{x:24,y:1.1,z:22,angle:.7,vehicleId:null},props:[
 {id:'prop-0',kind:'car',driveable:true,health:23,maxHealth:500,x:27,z:25,angle:1.2,steering:.3,speed:9,braking:true},
 {id:'prop-1',kind:'crate',health:0,x:12,z:7,w:2,d:2},
 {id:'prop-2',kind:'car',driveable:true,health:-10,x:44,z:32,angle:2,rotation:0},
 {id:'prop-3',kind:'barrel',health:0,sunk:true,x:20,z:10},
 {id:'building-0',kind:'building',health:300,damageStage:2,x:30,z:20},
 {id:'building-1',kind:'building',health:0,damageStage:3,x:50,z:20},
 {id:'rubble-1',kind:'rubble',health:100,x:50,z:20},
 ],structures:[{buildingId:'building-1',material:'brick',x:51,y:.5,z:21,w:1,h:1,d:2,rx:.1,ry:.2,rz:.3}],fires:[{x:50,z:20,radius:2,life:3}],events:[]};}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const hidden=group=>group.userData.sections.filter(mesh=>!mesh.visible).length;

test('region hydration restores destruction, rubble and moved vehicle transforms without sim mutation, events or RNG',()=>{
 const world=fixture(),sim=freeze(snapshot()),before=JSON.stringify(sim);world.hydrateRegion(sim);
 assert.equal(JSON.stringify(sim),before);assert.equal(world.effects.length,0);assert.equal(world.shake,0);
 const building=world.buildingMeshes.get('building-0');assert.equal(building.userData.damageStage,2);assert.equal(hidden(building),Math.ceil(21*.48));assert.equal(building.userData.glass.filter(m=>!m.visible).length,4);
 assert.equal(world.buildingMeshes.get('building-1').visible,false);assert.equal(world.buildingMeshes.get('building-1').userData.collapsed,true);
 assert.equal(world.propMeshes.get('prop-1').visible,false);assert.equal(world.propMeshes.get('prop-2').visible,false);assert.equal(world.propMeshes.get('prop-3').visible,false);assert.equal(world.wrecks.length,2,'sunk objects and rubble must not create dry generic wrecks');
 const root=world.propMeshes.get('prop-0'),car=root.children[0];assert.deepEqual(root.position.toArray(),[22,0,18]);assert.equal(car.rotation.y,1.2-Math.PI/2);assert.equal(car.userData.wheels[0].spin.rotation.z,0,'hydration does not advance wheel time');assert.equal(car.userData.wheels.find(w=>w.front).pivot.rotation.y,.3);assert.equal(car.userData.tailLights[0].material.emissiveIntensity,2);
 root.updateWorldMatrix(true,true);assert.deepEqual(car.getWorldPosition(new T.Vector3()).toArray(),[27,0,25]);
 assert.equal(world.wrecks.find(w=>w.userData.propId==='prop-2').rotation.y,2-Math.PI/2);
 assert.equal([...world.structuralVisuals.batches.values()].reduce((sum,b)=>sum+b.count,0),1);
 assert.deepEqual(world.player.position.toArray(),[24,1.1,22]);assert.ok(world.focus.distanceTo(new T.Vector3(24,.88,21))<1e-9);
});
test('repeated hydration reuses shells/wrecks/structural batches; recreation is deterministic',()=>{
 const world=fixture(),sim=freeze(snapshot());world.hydrateRegion(sim);const shell=world.buildingMeshes.get('building-0').userData.shell,wrecks=[...world.wrecks],batches=[...world.structuralVisuals.batches.values()],nodes=world.scene.children.length;
 for(let i=0;i<30;i++)world.hydrateRegion(sim);
 assert.equal(world.buildingMeshes.get('building-0').userData.shell,shell);assert.deepEqual(world.wrecks,wrecks);assert.deepEqual([...world.structuralVisuals.batches.values()],batches);assert.equal(world.scene.children.length,nodes);
 const second=fixture();second.hydrateRegion(sim);const shape=world=>world.wrecks.map(w=>w.children.map(c=>[...c.position.toArray(),...c.rotation.toArray(),...c.scale.toArray()]));assert.deepEqual(shape(world),shape(second));
 assert.deepEqual(world.buildingMeshes.get('building-0').userData.sections.map(m=>m.visible),second.buildingMeshes.get('building-0').userData.sections.map(m=>m.visible));
});
test('a replacement snapshot can revive cover, repair panels, remove rubble and move a saved wreck without duplication',()=>{
 const world=fixture(),sim=snapshot();world.hydrateRegion(sim);const deadCrate=world.wrecks.find(w=>w.userData.propId==='prop-1');sim.props.find(p=>p.id==='prop-1').health=10;sim.props.find(p=>p.id==='building-0').damageStage=0;sim.props.find(p=>p.id==='building-1').health=100;sim.props.find(p=>p.id==='prop-2').x+=3;sim.structures=[];
 world.hydrateRegion(freeze(sim));assert.equal(deadCrate.parent,null);assert.equal(world.propMeshes.get('prop-1').visible,true);assert.equal(hidden(world.buildingMeshes.get('building-0')),0);assert.equal(world.buildingMeshes.get('building-1').userData.collapsed,false);assert.equal(world.wrecks.length,1);assert.equal(world.wrecks[0].position.x,47);assert.ok([...world.structuralVisuals.batches.values()].every(b=>b.count===0&&!b.visible));
});
test('normal damage events retain debris, glass effects and camera shake after factoring silent restoration',()=>{
 const world=fixture();let glass=0;world.random=()=>.9;world.smoke=()=>{};world.effect=()=>glass++;
 world.damageBuildingStage({id:'building-0',stage:1,x:30,z:20});assert.ok(world.effects.length>0);assert.equal(glass,2);assert.equal(world.shake,.13);assert.equal(hidden(world.buildingMeshes.get('building-0')),Math.ceil(21*.24));
});

test('restored fire patches and burning props/surfaces resume through the normal update path without reignition events',()=>{
 const world=fixture(),sim=snapshot();sim.props[0].burning=4;sim.props[4].surfaces=[{x:30,y:4,z:23,face:0,burning:2}];const frozen=freeze(sim),before=JSON.stringify(frozen);
 world.hydrateRegion(frozen);const flames=[],smoke=[];world.flame=(...args)=>flames.push(args);world.smoke=(...args)=>smoke.push(args);world.random=()=>0;
 world.updateRegionFire(frozen,1/60,1/60);
 assert.equal(flames.length,3);assert.equal(smoke.length,3);assert.ok(flames.some(([x,z,,y])=>x===27&&z===25&&y===.5));assert.ok(flames.some(([x,z,,y])=>x===30&&z===22.55&&y===4));assert.ok(flames.some(([x,z,,y])=>x===49&&z===19&&y===.25));assert.equal(JSON.stringify(frozen),before);assert.equal(world.effects.length,0);
});
