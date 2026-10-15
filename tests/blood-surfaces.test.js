import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bloodContact,bloodDecal,bloodSpray,stepBlood,ageBlood,BLOOD_LIMIT} from '../src/rebuild/BloodFX.js';
import {seededRandom} from '../src/rebuild/config.js';
// Canvas drawing is checked in the browser; tests exercise projection and lifecycle.
const ctx=new Proxy({},{get:()=>()=>{}});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>ctx})};
function world(){return{settings:{gore:true},layout:{},scene:new T.Scene(),random:seededRandom(9),decals:[],effects:[],propMeshes:new Map(),buildingMeshes:new Map(),wrecks:[],waterLevel:()=>-.2,removeDynamic:m=>m.removeFromParent()};}
function wall(w,x=0){const m=new T.Mesh(new T.BoxGeometry(4,4,.2),new T.MeshStandardMaterial());m.position.set(x,2,-1);w.scene.add(m);w.scene.updateMatrixWorld(true);return m;}
test('blood contacts the nearest real surface and ignores hidden or removed geometry',()=>{
 const w=world(),a=wall(w),b=wall(w);b.position.z=-3;w.scene.updateMatrixWorld(true);const from=new T.Vector3(0,1,2),to=new T.Vector3(0,1,-5);assert.equal(bloodContact(from,to,[b,a]).object,a);
 a.visible=false;assert.equal(bloodContact(from,to,[a,b]).object,b);b.parent.visible=false;assert.equal(bloodContact(from,to,[a,b]),null);
 w.scene.visible=true;a.visible=true;a.layers.set(1);b.visible=false;assert.equal(bloodContact(from,to,[a,b]),null);
});
test('projected stains fit the wall and follow its movement, then expire with a removed surface',()=>{
 const w=world(),a=wall(w),hit=bloodContact(new T.Vector3(1.95,1,2),new T.Vector3(1.95,1,-2),[a]);const stain=bloodDecal(w,hit.point,.6,hit);assert.equal(stain.parent,a);assert.ok(stain.userData.wall);
 const position=stain.geometry.attributes.position;for(let i=0;i<position.count;i++)assert.ok(position.getX(i)<=2.00001,'decal must clip at wall edge');
 const before=stain.getWorldPosition(new T.Vector3());a.position.x=5;w.scene.updateMatrixWorld(true);assert.ok(Math.abs(stain.getWorldPosition(new T.Vector3()).x-before.x-5)<1e-6);
 a.removeFromParent();ageBlood(w,0);assert.equal(w.decals.length,0);
});
test('fast droplets hit walls once instead of passing through, and settle onto horizontal prop surfaces',()=>{
 const w=world(),a=wall(w),mesh=new T.Mesh();mesh.position.set(0,1,2);w.scene.add(mesh);const e={mesh,vx:0,vy:0,vz:-100,gravity:0,drag:0,life:1,stain:.2,targets:[a]};stepBlood(w,e,.1);assert.equal(e.life,0);assert.equal(w.decals.length,1);assert.ok(w.decals[0].userData.wall);
 const top=bloodContact(new T.Vector3(0,6,-1),new T.Vector3(0,2,-1),[a]);assert.ok(top.normal.y>.99);bloodDecal(w,top.point,.3,top);assert.equal(w.decals.at(-1).userData.wall,false);
});
test('blood dries, stays bounded, respects water and the gore setting, and heat creates no ballistic spray',()=>{
 const w=world();for(let i=0;i<BLOOD_LIMIT+10;i++)bloodDecal(w,new T.Vector3(i,.05,0),.2);assert.equal(w.decals.length,BLOOD_LIMIT);const wet=w.decals[0].material.roughness;ageBlood(w,50);assert.ok(w.decals[0].material.roughness>wet);ageBlood(w,131);assert.equal(w.decals.length,0);
 w.layout.water=[{x:0,z:0,w:5,d:5}];assert.equal(bloodDecal(w,new T.Vector3(0,0,0)),null);w.settings.gore=false;bloodSpray(w,{x:10,z:10},10);assert.equal(w.effects.length,0);
 w.settings.gore=true;for(const kind of ['fire','electric','frost'])bloodSpray(w,{x:10,z:10,kind},10);assert.equal(w.effects.length,0);bloodSpray(w,{x:10,z:10,dx:1,dz:0},200);assert.equal(w.effects.length,90);bloodSpray(w,{x:10,z:10},20);assert.equal(w.effects.length,90);
 w.layout={};bloodDecal(w,new T.Vector3());w.settings.gore=false;ageBlood(w,0);assert.equal(w.decals.length,0);
});
test('pools project onto raised pavement instead of being hidden below it',()=>{
 const w=world(),pavement=new T.Mesh(new T.BoxGeometry(8,.2,8),new T.MeshStandardMaterial());pavement.position.y=.1;w.scene.add(pavement);w.scene.updateMatrixWorld(true);w.bloodGroundTargets=[pavement];
 const stain=bloodDecal(w,new T.Vector3(0,.06,0),.4);assert.equal(stain.parent,pavement);const positions=stain.geometry.attributes.position;for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-.2)<1e-5);assert.equal(stain.userData.wall,false);
});
test('raised blood pools project onto roofs above water and never float after roof removal',()=>{
 const w=world(),roof=new T.Mesh(new T.BoxGeometry(6,.3,6),new T.MeshStandardMaterial());roof.position.y=3.15;w.scene.add(roof);w.buildingMeshes.set('roof',roof);w.layout.water=[{x:0,z:0,w:8,d:8}];
 const stain=bloodDecal(w,new T.Vector3(0,3.36,0),.4);assert.equal(stain.parent,roof);assert.equal(stain.userData.wall,false);
 roof.visible=false;assert.equal(bloodDecal(w,new T.Vector3(1,3.36,0),.4),null);roof.removeFromParent();ageBlood(w,0);assert.equal(w.decals.length,0);
});
test('ballistic wounds originate above the victim floor',()=>{
 const w=world();bloodSpray(w,{x:0,z:0,baseY:6,kind:'bullet'},10,6,1.15);assert.ok(w.effects.length>0);assert.ok(w.effects.every(e=>e.mesh.position.y>7.05&&e.mesh.position.y<7.25));
});
test('raised stains skip distant mesh descendants after the bounds cache warms',()=>{
 const w=world(),near=wall(w),far=new T.Group(),child=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial());far.add(child);far.position.set(1000,2,1000);w.scene.add(far);w.buildingMeshes.set('near',near);w.buildingMeshes.set('far',far);
 bloodDecal(w,new T.Vector3(0,4.06,-1));let visits=0;const update=child.updateWorldMatrix.bind(child);child.updateWorldMatrix=(...args)=>{visits++;return update(...args);};
 bloodDecal(w,new T.Vector3(1,4.06,-1));assert.equal(visits,0,'remote descendants must not be traversed or raycast per stain');
});
