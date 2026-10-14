import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Object3D,Vector3} from 'three';
import {activeHealthBarCandidates,nearestVisiblePieces} from '../src/rebuild/RenderCandidates.js';

const legacyPieces=(pieces,point)=>pieces.filter(m=>m.visible).sort((a,b)=>a.getWorldPosition(new Vector3()).distanceTo(point)-b.getWorldPosition(new Vector3()).distanceTo(point));
test('impact ordering matches transformed facades and refreshes after parents move',()=>{
 const root=new Group(),building=new Group(),face=new Group();root.add(building);building.add(face);building.rotation.y=.7;face.rotation.y=-.3;root.scale.set(1.2,1,1.3);
 const pieces=Array.from({length:80},(_,i)=>{const mesh=new Object3D();mesh.position.set(i%8-4,Math.floor(i/8),Math.sin(i));mesh.visible=i%9!==0;face.add(mesh);return mesh;});const before=[...pieces],point=new Vector3(3,8,5);
 for(const x of [0,18,-11]){building.position.x=x;building.rotation.y+=.2;const expected=legacyPieces(pieces,point);let transforms=0;for(const mesh of pieces){mesh.getWorldPosition=function(target){transforms++;return Object3D.prototype.getWorldPosition.call(this,target);};}assert.deepEqual(nearestVisiblePieces(pieces,point),expected);assert.equal(transforms,pieces.filter(p=>p.visible).length,'one transform query per visible piece');}
 assert.deepEqual(pieces,before,'does not reorder the destruction manifest');
});
test('impact ordering retains manifest order for equal distances and skips hidden pieces',()=>{
 const pieces=[1,-1,0].map(x=>{const mesh=new Object3D();mesh.position.x=x;return mesh;});pieces[2].visible=false;
 assert.deepEqual(nearestVisiblePieces(pieces,new Vector3()),pieces.slice(0,2));
});

test('bar eligibility preserves nearest wounded ordering, lifetime boundary and dead cleanup',()=>{
 const enemies=Array.from({length:300},(_,i)=>({id:i,x:Math.sin(i*2.399)*i,z:Math.cos(i*2.399)*i,health:i%7===0?0:i%3===0?100:35,maxHealth:100}));
 const bars=new Map(enemies.filter(e=>e.id%2===0).map(e=>[e.id,{hitAt:e.id%5===0?5.99:6,trail:80}]));bars.set('removed',{hitAt:9});
 const player={x:18,z:2},before=[...enemies],expected=[...enemies].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)).filter(e=>e.health>0&&e.health<e.maxHealth&&bars.has(e.id)&&10-bars.get(e.id).hitAt<=4);
 assert.deepEqual(activeHealthBarCandidates(enemies,bars,player,10),expected);assert.deepEqual(enemies,before);
 assert.equal(bars.has('removed'),false);assert.equal(bars.has(0),false);assert.equal(bars.get(2).trail,80);assert.ok(bars.has(10),'expired living state remains available for a future wound');
});
test('empty health-bar feed avoids walking the horde and ties keep enemy order',()=>{
 assert.deepEqual(activeHealthBarCandidates({[Symbol.iterator](){throw Error('unnecessary horde traversal');}},new Map(),{x:0,z:0},0),[]);
 const enemies=[{id:1,x:1,z:0,health:1,maxHealth:2},{id:2,x:-1,z:0,health:1,maxHealth:2}];
 assert.deepEqual(activeHealthBarCandidates(enemies,new Map(enemies.map(e=>[e.id,{hitAt:0}])),{x:0,z:0},0),enemies);
});
