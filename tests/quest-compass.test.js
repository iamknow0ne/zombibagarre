import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {trackQuest} from '../src/rebuild/RPG.js';
import {questDirection,compassPlacement} from '../src/rebuild/QuestCompass.js';
import {routeSegmentClear} from '../src/rebuild/QuestNavigation.js';
const game=()=>{const s=new Simulation({seed:31,mode:'city',profile:{}});s.start();return s;};
test('compass follows quest steps, return trips and completion',()=>{
 const s=game();assert.equal(questDirection(s),null);trackQuest(s,'salvage');let hint=questDirection(s);assert.equal(hint.target.id,'smith');assert.equal(hint.mode,'route');assert.ok(hint.metres>0);assert.ok(routeSegmentClear(s,s.player,hint.next));
 s.rpg.accepted.push('salvage');hint=questDirection(s);const first=hint.target;assert.equal(first.kind,'cache');first.used=true;s.rpg.cases.push(first.id);hint=questDirection(s);assert.notEqual(hint.target.id,first.id);hint.target.used=true;s.rpg.cases.push(hint.target.id);hint=questDirection(s);assert.equal(hint.target.id,'smith');s.rpg.claimed.push('salvage');assert.equal(questDirection(s),null);
});
test('manual map pins cannot redirect or erase the tracked quest compass',()=>{
 const s=game();trackQuest(s,'salvage');const pin={x:0,z:0,source:'manual'};s.player.waypoint=pin;const hint=questDirection(s);assert.equal(hint.target.id,'smith');assert.equal(s.player.waypoint,pin);assert.ok(s.guidanceRoute);assert.equal(s.questRoute,undefined);
});
test('arrival gives a contextual action and city-wide objectives show no misleading arrow',()=>{
 const s=game();trackQuest(s,'salvage');const smith=s.places.find(p=>p.id==='smith');Object.assign(s.player,{x:smith.x,z:smith.z});assert.equal(questDirection(s).label,'TALK');s.player.vehicleId='car';assert.equal(questDirection(s).label,'ON FOOT');s.rpg.accepted.push('mercy');trackQuest(s,'mercy');assert.equal(questDirection(s),null);s.rpg.kills=20;assert.equal(questDirection(s).target.id,'medic');
});
test('unreachable objective is labelled bearing rather than a walkable route',()=>{
 const s=game();trackQuest(s,'salvage');const smith=s.places.find(p=>p.id==='smith');s.obstacles.push({x:smith.x,z:smith.z,w:20,d:20,health:999});s.geometryRevision++;const hint=questDirection(s);assert.equal(hint.mode,'bearing');assert.equal(hint.label,'BEARING');assert.deepEqual(hint.next,smith);
});
test('compass points along a reachable corner rather than through a blocking building',()=>{
 const s=game(),smith=s.places.find(p=>p.id==='smith');s.player.x=-24;s.player.z=0;smith.x=24;smith.z=0;s.obstacles=[{x:0,z:0,w:12,d:24,health:100}];s.layout={bounds:{minX:-40,maxX:40,minZ:-40,maxZ:40},boundary:[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],water:[],bridges:[]};trackQuest(s,'salvage');const hint=questDirection(s);assert.equal(hint.mode,'route');assert.ok(Math.abs(hint.next.z)>12);assert.ok(hint.metres>48);assert.ok(routeSegmentClear(s,s.player,hint.next));
});
test('small compass avoids touch controls, respects direction and stays within mobile bounds',()=>{
 const reserved=[{x:80,y:690,w:160,h:280},{x:300,y:690,w:180,h:280}];
 for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]]){const p=compassPlacement({x:195,y:470},{x,y},390,844,reserved,true);assert.ok(p);assert.equal(p.angle,Math.atan2(y,x));assert.ok(p.x>=60&&p.x<=330);assert.ok(p.bounds.y+p.bounds.h/2<=550);}
 assert.equal(compassPlacement({x:195,y:470},{x:0,y:1},390,844,[{x:195,y:422,w:390,h:844}],true),null);
});
