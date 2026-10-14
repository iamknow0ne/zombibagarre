import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTraversalLayout,campaignTraversalBoxes} from '../src/rebuild/CampaignTraversal.js';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {insideMap} from '../src/rebuild/Map.js';
import {makeRPGWorld} from '../src/rebuild/RPG.js';
import {initTraversal,stepTraversal} from '../src/rebuild/Traversal.js';
const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+(b.w||0))/2&&Math.abs(a.z-b.z)<(a.d+(b.d||0))/2;
test('seeded service route is deterministic, dry, inside the city and clear of scenery/services',()=>{
 for(const seed of [0,1,2,3,7,19,31,73,140,2026]){
  const original=generateCity(seed),count=original.cover.length,layout=prepareTraversalLayout(original),platforms=layout.cover.slice(count);
  assert.equal(original.cover.length,count);assert.equal(original.traversal,undefined);
  assert.deepEqual(prepareTraversalLayout(original),layout);assert.equal(platforms.length,2,`seed ${seed}`);
  assert.equal(layout.traversal.anchors.length,2);assert.equal(layout.traversal.reward.claimed,false);
  for(const [i,p] of platforms.entries()){
   assert.equal(p.h,1.1);assert.equal(p.kind,'platform');assert.equal(p.maxHealth,600);
   assert.ok(Math.hypot(p.x,p.z-3)>=8&&Math.hypot(p.x,p.z-3)<=35);
   assert.ok(![...original.cover,...original.buildings].some(o=>overlaps(p,o)));
   assert.ok(![...layout.landmarks,...makeRPGWorld(layout)].some(o=>overlaps(p,{...o,w:5,d:5})));
   for(const dx of [-p.w/2,0,p.w/2])for(const dz of [-p.d/2,0,p.d/2]){assert.equal(waterAt(layout,p.x+dx,p.z+dz),false);assert.equal(insideMap(layout,p.x+dx,p.z+dz,.4),true);}
   assert.equal(layout.traversal.anchors[i].supportId,`prop-${count+i}`);assert.equal(layout.traversal.anchors[i].y,p.h+2.1);
  }
  assert.equal(layout.traversal.reward.supportId,layout.traversal.anchors[1].supportId);
 }
});
test('authored fixture plans and non-city layouts are preserved; preparation is idempotent',()=>{
 const arena={city:false,cover:[]};assert.equal(prepareTraversalLayout(arena),arena);
 const fixture={city:true,cover:[],traversal:{anchors:[],reward:null}};assert.equal(prepareTraversalLayout(fixture),fixture);
 const layout=prepareTraversalLayout(generateCity(73));assert.equal(prepareTraversalLayout(layout),layout);
});
test('no available service-yard sites leaves a valid empty plan without displacing scenery',()=>{
 const layout={city:true,bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},cover:[],buildings:[],spawnPoints:[]};const prepared=prepareTraversalLayout(layout);assert.equal(prepared.cover.length,0);assert.deepEqual(prepared.traversal,{anchors:[],reward:null});
});
test('campaign collision boxes preserve base and solidity and catch falls onto unmarked cover',()=>{
 const prop={id:'box',x:0,y:2,z:0,w:4,d:4,kind:'crate',health:100},boxes=campaignTraversalBoxes({props:[prop]});assert.equal(boxes[0].h,1.5);assert.equal(boxes[0].y,2);assert.equal(boxes[0].standable,true);assert.equal(prop.h,undefined);
 const p=initTraversal({radius:.4},{x:0,y:5,z:0});p.grounded=false;
 for(let i=0;i<240;i++)stepTraversal(p,{},1/120,boxes,[],{minX:-20,maxX:20,minZ:-20,maxZ:20});
 assert.equal(p.y,3.5);assert.equal(p.supportId,'box');
});

test('the generated route can be grappled and landed using the actual collision plan',()=>{
 const layout=prepareTraversalLayout(generateCity(73)),props=layout.cover.map((p,i)=>({...p,id:`prop-${i}`,health:p.maxHealth||100}));props.push(...layout.buildings.map(b=>({...b,health:100})));const boxes=campaignTraversalBoxes({props}),p=initTraversal({radius:.4},{x:0,y:0,z:3});
 for(const anchor of layout.traversal.anchors){const events=stepTraversal(p,{grapple:true,anchorId:anchor.id},1/120,boxes,layout.traversal.anchors,layout.bounds);assert.ok(events.some(e=>e.type==='attach'));
  for(let i=0;i<600;i++)stepTraversal(p,{},1/120,boxes,layout.traversal.anchors,layout.bounds);
  assert.equal(p.supportId,anchor.supportId);assert.equal(p.y,1.1);assert.equal(p.grapple,null);
 }
 boxes.find(b=>b.id===p.supportId).health=0;for(let i=0;i<180;i++)stepTraversal(p,{},1/120,boxes,layout.traversal.anchors,layout.bounds);assert.equal(p.y,0);assert.equal(p.supportId,null);
});

test('collision views reuse storage while tracking movement, collapse and list replacement',()=>{
 const car={id:'car',kind:'car',x:1,y:0,z:2,w:2,d:4,health:80},sim={props:[car]};const first=campaignTraversalBoxes(sim),view=first[0];
 car.x=9;car.z=-3;car.y=2;car.h=1.4;car.health=0;const updated=campaignTraversalBoxes(sim);
 assert.equal(updated,first);assert.equal(updated[0],view);assert.deepEqual(view,{id:'car',x:9,y:2,z:-3,w:2,d:4,h:1.4,health:0,standable:true});
 sim.props[0]={id:'crate',kind:'crate',x:4,z:5,w:3,d:3,health:20};assert.equal(campaignTraversalBoxes(sim)[0],view);assert.equal(view.id,'crate');assert.equal(view.y,0);assert.equal(view.h,1.5);assert.equal(view.health,20);
 sim.props.push({...car,id:'another'});assert.equal(campaignTraversalBoxes(sim).length,2);sim.props.pop();assert.equal(campaignTraversalBoxes(sim).length,1);
 sim.props=[{...car,x:77,health:100}];const replacement=campaignTraversalBoxes(sim);assert.notEqual(replacement,first);assert.equal(replacement[0].x,77);assert.equal(replacement[0].health,100);assert.equal(car.standable,undefined);
});
