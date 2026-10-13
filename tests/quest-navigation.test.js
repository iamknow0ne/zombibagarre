import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {trackQuest,acceptQuest,claimQuest} from '../src/rebuild/RPG.js';
import {questGuide,syncQuestNavigation,buildRoute,routeSegmentClear,navigationRoute} from '../src/rebuild/QuestNavigation.js';
import {atlasTransform,atlasPoint} from '../src/rebuild/Atlas.js';
const fixture=()=>({player:{x:-24,z:0},obstacles:[],geometryRevision:0,layout:{city:true,bounds:{minX:-40,maxX:40,minZ:-40,maxZ:40},boundary:[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],water:[],bridges:[]}});
const game=()=>{const s=new Simulation({seed:31,mode:'city',profile:{}});s.start();return s;};
test('quest guidance advances from contact to cases to reward without replacing a custom pin',()=>{
 const s=game();trackQuest(s,'salvage');assert.equal(questGuide(s).step,0);const smith=s.places.find(p=>p.id==='smith');Object.assign(s.player,{x:smith.x,z:smith.z});acceptQuest(s,'salvage','smith');let g=syncQuestNavigation(s);assert.equal(g.step,1);assert.equal(g.target.kind,'cache');assert.equal(s.player.waypoint.source,'quest');
 s.rpg.cases.push(g.target.id);g.target.used=true;g=syncQuestNavigation(s);assert.ok(!s.rpg.cases.includes(g.target.id));
 const pin={x:12,z:13,source:'manual'};s.player.waypoint=pin;s.rpg.cases=['case-a','case-b'];g=syncQuestNavigation(s);assert.equal(g.step,2);assert.equal(g.target.id,'smith');assert.equal(s.player.waypoint,pin);
 trackQuest(s,'salvage');assert.equal(s.player.waypoint.name,smith.name);claimQuest(s,'salvage','smith');syncQuestNavigation(s);assert.equal(s.rpg.tracked,null);assert.equal(s.player.waypoint,null);
});
test('city-wide objectives clear stale quest destinations and completed quests preserve discovery pins',()=>{
 const s=game();s.rpg.accepted.push('mercy');trackQuest(s,'mercy');s.player.waypoint={x:0,z:0,source:'quest'};const g=syncQuestNavigation(s);assert.equal(g.target,null);assert.equal(s.player.waypoint,null);assert.match(g.text,/Defeat/);
 s.rpg.claimed.push('mercy');const pin={x:1,z:2,source:'manual'};s.player.waypoint=pin;syncQuestNavigation(s);assert.equal(s.player.waypoint,pin);assert.equal(s.rpg.tracked,null);
});
test('walking route skirts buildings and every segment has physical clearance',()=>{
 const s=fixture();s.obstacles=[{x:0,z:0,w:12,d:24,health:100}];const target={x:24,z:0},route=buildRoute(s,target);assert.ok(route.length>2);assert.deepEqual(route.at(-1),target);for(let i=1;i<route.length;i++)assert.ok(routeSegmentClear(s,route[i-1],route[i]));
});
test('walking route crosses water on bridges and reports sealed destinations unavailable',()=>{
 const s=fixture();s.layout.water=[{x:0,z:0,w:10,d:80}];s.layout.bridges=[{x:0,z:18,w:14,d:12}];const route=buildRoute(s,{x:24,z:0});assert.ok(route.length>2);assert.ok(route.some(p=>p.z>10));for(let i=1;i<route.length;i++)assert.ok(routeSegmentClear(s,route[i-1],route[i]));
 const sealed=fixture();sealed.layout.water=[{x:0,z:0,w:10,d:80}];assert.deepEqual(buildRoute(sealed,{x:24,z:0}),[]);
});
test('route cache invalidates after scenery changes and updates arrival',()=>{
 const s=fixture();s.player.waypoint={x:24,z:0,source:'quest'};const a=navigationRoute(s);assert.equal(navigationRoute(s),a);s.obstacles.push({x:0,z:0,w:12,d:24,health:100});s.geometryRevision++;const b=navigationRoute(s);assert.notEqual(a,b);assert.ok(b.points.length>2);s.player.x=24;assert.equal(navigationRoute(s).status,'arrived');s.player.waypoint=null;assert.equal(navigationRoute(s),null);
});
test('atlas centers asymmetric terrain and pointer projection matches the drawing',()=>{
 const s=fixture();s.layout.bounds={minX:20,maxX:100,minZ:-30,maxZ:90};const canvas={width:760,height:760,getBoundingClientRect:()=>({left:10,top:20,width:380,height:380})};const t=atlasTransform(canvas,s.layout);assert.deepEqual([t.X(60),t.Z(30)],[380,380]);const p=atlasPoint(canvas,s.layout,{clientX:200,clientY:210});assert.equal(p.x,60);assert.equal(p.z,30);
});
test('generated city contacts receive collision-checked routes across different street plans',()=>{
 for(const seed of [30,31,32,33]){const s=new Simulation({seed,mode:'city',profile:{}});s.start();for(const p of s.places.filter(p=>p.kind==='shop')){const route=buildRoute(s,p);assert.ok(route.length>=2,`seed ${seed}: ${p.id}`);for(let i=1;i<route.length;i++)assert.ok(routeSegmentClear(s,route[i-1],route[i]));}}
});
