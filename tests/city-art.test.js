import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {connectStreets,crossingApproaches,junctionClearance} from '../src/rebuild/StreetGraph.js';
import {cityArtPlan,CityArt} from '../src/rebuild/CityArt.js';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {roadDistance} from '../src/rebuild/CityTopology.js';
import {pointBlocked} from '../src/rebuild/config.js';
import {visibleAOOnly} from '../src/rebuild/RenderBatch.js';
const road=(ax,az,bx,bz)=>({a:{x:ax,z:az},b:{x:bx,z:bz},width:10});
test('geometric crossings become connected junctions, while bends do not acquire zebra crossings',()=>{
 const graph=connectStreets([road(-40,-40,40,40),road(-40,40,40,-40)]);
 assert.equal(graph.roads.length,4);const centre=graph.nodes.find(n=>Math.hypot(n.x,n.z)<.001);assert.equal(centre.arms.length,4);assert.equal(centre.junction,true);
 const crossings=crossingApproaches(graph.nodes);assert.equal(crossings.length,4);for(const c of crossings){assert.ok(Math.abs(Math.abs(c.x)-Math.abs(c.z))<.001);assert.ok(Math.abs(Math.sin(c.angle))>.7);assert.ok(Math.hypot(c.x,c.z)>8);}
 assert.equal(junctionClearance({x:0,z:0},graph.nodes),true);assert.equal(junctionClearance({x:20,z:20},graph.nodes),false);
 const bend=connectStreets([road(-40,0,0,0),road(0,0,30,20)]);assert.equal(crossingApproaches(bend.nodes).length,0);
});
test('short junction approaches do not paint overlapping crossings',()=>{
 const g=connectStreets([road(-40,0,40,0),road(0,-40,0,40),road(5,-40,5,40)]);
 const c=crossingApproaches(g.nodes);assert.ok(c.every(p=>g.nodes.filter(n=>n.junction&&n!==p.node).every(n=>Math.hypot(p.x-n.x,p.z-n.z)>=9.5)));
});
test('seeded sprite dressing respects streets, buildings, water and owner identities',()=>{
 for(let seed=0;seed<8;seed++){const l=generateCity(seed),plan=cityArtPlan(l);assert.deepEqual(plan,cityArtPlan(l));assert.ok(plan.length>40&&plan.length<500);for(const p of plan){assert.ok(p.tile>=0&&p.tile<8);if(p.owner){assert.ok(l.buildings.some(b=>b.id===p.owner));}else{assert.ok(roadDistance(p,l.roads)>=.7);assert.equal(waterAt(l,p.x,p.z),false);assert.equal(pointBlocked(p.x,p.z,1.2,[...l.buildings,...l.cover]),false);}}
  const car=l.cover.find(c=>c.driveable);assert.ok(roadDistance(car,l.roads)<0,`starter car is on a road in seed ${seed}`);
 }
});
test('pixel material mode restores original maps and colours and leaves unrelated materials unchanged',()=>{
 const original=new T.Texture(),atlas=new T.Texture(),m=new T.MeshStandardMaterial({map:original,color:0x123456,bumpScale:.055});m.userData={surfaceKind:'brick',surfaceColor:0x123456,surfaceBump:.055};const scene=new T.Scene(),plain=new T.MeshStandardMaterial({color:0xabcdef});scene.add(new T.Mesh(new T.BoxGeometry(),m),new T.Mesh(new T.BoxGeometry(),plain));const art=Object.create(CityArt.prototype);art.world={scene,surfaces:{materials:new Map([['brick',m]]),textures:()=>({albedo:original})}};art.style='pixel';art.atlas=atlas;art.applyMaterials();assert.equal(m.map,atlas);const shader={fragmentShader:'#include <map_fragment>'};m.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('fract(vMapUv'));assert.equal(plain.map,null);art.style='classic';art.applyMaterials();assert.equal(m.map,original);assert.equal(m.color.getHex(),0x123456);assert.equal(m.bumpScale,.055);
});
test('cutout sprite planes do not create rectangular ambient-occlusion silhouettes',()=>{
 const scene=new T.Scene(),cutout=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial({alphaTest:.35})),solid=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());scene.add(cutout,solid);const ao={};visibleAOOnly(ao,scene);ao.overrideVisibility();assert.equal(cutout.visible,false);assert.equal(solid.visible,true);ao.restoreVisibility();assert.equal(cutout.visible,true);
});
