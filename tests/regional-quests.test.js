import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {QUESTS,questVisible,questAvailable,acceptQuest,claimQuest,questProgress,questObjective,trackQuest,makeRPGWorld} from '../src/rebuild/RPG.js';
import {travelGate,requestRegionTravel,completeRegionTravel,collectCountrySupply,regionView} from '../src/rebuild/Regions.js';
import {questGuide,syncQuestNavigation,navigationRoute} from '../src/rebuild/QuestNavigation.js';
const game=()=>{const s=new Simulation({seed:31,mode:'city',profile:{}});s.start();return s;};
const cross=s=>{Object.assign(s.player,travelGate(s));assert.equal(requestRegionTravel(s),true);const result=completeRegionTravel(s);assert.equal(result.ok,true,result.error?.message);return s;};
const visit=(s,npc)=>Object.assign(s.player,s.places.find(p=>p.id===npc));
const supplyQuest=QUESTS.find(q=>q.id==='country-supplies');

test('country contract is restricted to an available regional expedition and accepts only at its medic',()=>{
 const s=game();assert.ok(s.regions);assert.equal(questVisible(s,supplyQuest),true);assert.equal(acceptQuest(s,'country-supplies','medic'),false);visit(s,'medic');assert.equal(acceptQuest(s,'country-supplies','smith'),false);assert.equal(acceptQuest(s,'country-supplies','medic'),true);assert.equal(acceptQuest(s,'country-supplies','medic'),false);
 const legacy=new Simulation({seed:31,profile:{}});legacy.start();assert.equal(questVisible(legacy,supplyQuest),false);assert.equal(questAvailable(legacy,supplyQuest),false);assert.match(questObjective(legacy,'country-supplies').text,/unavailable/);
});

test('accepted supply guidance leads to local gate, actual country supply, return gate, then clinic',()=>{
 const s=game();visit(s,'medic');assert.equal(acceptQuest(s,'country-supplies','medic'),true);let guide=syncQuestNavigation(s);assert.equal(guide.target.id,travelGate(s).id);assert.equal(guide.target.regionId,'city');assert.equal(guide.destinationTarget.regionId,'country-road');assert.equal(s.player.waypoint.regionId,'city');
 cross(s);assert.deepEqual(makeRPGWorld(s.layout),[]);guide=syncQuestNavigation(s);assert.equal(guide.target.id,'country-medicine');assert.equal(guide.target.regionId,'country-road');assert.equal(guide.target.x,s.layout.region.supply.x);assert.equal(guide.target.z,s.layout.region.supply.z);
 s.rpg.countrySupplies=true;guide=syncQuestNavigation(s);assert.equal(guide.state,'ready');assert.equal(guide.target.id,travelGate(s).id);assert.equal(guide.target.regionId,'country-road');assert.equal(guide.destinationTarget.id,'medic');assert.equal(guide.distance,0);
 cross(s);guide=syncQuestNavigation(s);assert.equal(guide.target.id,'medic');assert.equal(guide.target.regionId,'city');assert.equal(guide.target.x,s.places.find(p=>p.id==='medic').x);
});

test('all city-owned progress remains unchanged while the active road has empty local services and events',()=>{
 const s=game();s.visited=new Set(['a','b','c','d']);s.streetEvents[0].state='complete';s.streetEvents[1].state='complete';s.places.find(p=>p.id==='confessor').defeated=true;const room=s.interiorState.manifest.find(p=>p.template==='apartment-v1');assert.ok(room);s.interiorState.collected.push(`${room.id}:tool-case`);
 const ids=['workshop-tools','signal','atlas','watch','convoy','enforcer','survey','cinder','drowned','covenant','nightshift'],before=Object.fromEntries(ids.map(id=>[id,questProgress(s,id)]));cross(s);assert.equal(s.streetEvents.length,0);assert.equal(s.places.length,0);assert.equal(s.interiorState.manifest.length,0);for(const id of ids)assert.deepEqual(questProgress(s,id),before[id],id);
 const q=QUESTS.find(q=>q.id==='workshop-tools');assert.equal(questVisible(s,q),true);assert.equal(questAvailable(s,q),true);assert.equal(questObjective(s,'workshop-tools').target.id,travelGate(s).id);
});

test('medicine cannot be collected before acceptance or while its guards live; delivery pays exactly once across visits',()=>{
 const s=game();cross(s);Object.assign(s.player,s.layout.region.supply);assert.equal(collectCountrySupply(s),true);assert.equal(s.rpg.countrySupplies,false);cross(s);visit(s,'medic');assert.ok(acceptQuest(s,'country-supplies','medic'));cross(s);Object.assign(s.player,s.layout.region.supply);assert.ok(collectCountrySupply(s));assert.equal(s.rpg.countrySupplies,false);
 for(const e of s.enemies.filter(e=>s.countryEncounter.guardIds.includes(e.id)))s.damageEnemy(e,1e7,0,0,{kind:'ballistic'});assert.ok(collectCountrySupply(s));assert.deepEqual(questProgress(s,'country-supplies'),[1,1]);assert.equal(claimQuest(s,'country-supplies','medic'),false,'cannot remotely claim city reward');
 cross(s);visit(s,'medic');const xp=s.profile.xp,coins=s.rpg.coins;assert.ok(claimQuest(s,'country-supplies','medic'));assert.equal(s.rpg.coins,coins+180);assert.equal(s.profile.xp,xp+220);assert.equal(claimQuest(s,'country-supplies','medic'),false);
 cross(s);Object.assign(s.player,s.layout.region.supply);assert.ok(collectCountrySupply(s));assert.ok(s.enemies.every(e=>e.health<=0));cross(s);visit(s,'medic');assert.equal(claimQuest(s,'country-supplies','medic'),false);assert.equal(s.rpg.coins,coins+180);assert.equal(s.profile.xp,xp+220);
});

test('stale foreign waypoints never produce a route and tracking retains manual pins',()=>{
 const s=game();s.rpg.accepted.push('salvage');cross(s);assert.ok(trackQuest(s,'salvage'));const guide=questGuide(s);assert.equal(guide.target.regionId,'country-road');assert.equal(guide.destinationTarget.regionId,'city');const stale={x:0,z:0,source:'manual',regionId:'city'};assert.equal(navigationRoute(s,stale),null);
 const local={x:0,z:-12,source:'manual',regionId:'country-road'};s.player.waypoint=local;syncQuestNavigation(s);assert.equal(s.player.waypoint,local);assert.equal(regionView(s,'city').places.filter(p=>p.kind==='cache'&&!p.used).length,2);
});

test('fresh expedition preserves permanent delivery XP but resets medicine and claim ledger',()=>{
 const s=game();s.profile.xp=220;s.rpg.countrySupplies=true;s.rpg.claimed.push('country-supplies');const fresh=new Simulation({seed:73,mode:'city',profile:s.profile});fresh.start();assert.equal(fresh.profile.xp,220);assert.equal(fresh.rpg.countrySupplies,false);assert.deepEqual(fresh.rpg.claimed,[]);assert.equal(fresh.regions.size,0);
});
