import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {roofEncounter,roofGuardPosition,roofCachePosition,updateRooftopEncounters,collectRoofCache,nearbyRoofCache} from '../src/rebuild/RooftopEncounters.js';
const game=(seed=73)=>{const s=new Simulation({seed,mode:'city',profile:{}});s.start();s.toSpawn=999;s.spawnTimer=1e6;s.player.invulnerable=999;return s;};
function ascend(s){const r=s.layout.traversal.roofs[0];Object.assign(s.player,{...r.approach,y:0,grounded:true,supportId:null});s.update(1/120,{grapple:true,auto:false});for(let i=0;i<900&&!(s.player.grounded&&s.player.supportId===r.anchor.supportId);i++)s.update(1/120,{auto:false});assert.ok(Math.abs(s.player.y-r.top)<1e-8);return r;}
test('guardian placement is clear across ten procedural cities; landing triggers once, not street proximity or cable flight',()=>{
 for(const seed of [0,1,2,3,7,19,31,73,140,2026]){const s=game(seed),r=s.layout.traversal.roofs[0];assert.ok(roofGuardPosition(s,r));Object.assign(s.player,{x:r.anchor.x,z:r.anchor.z,y:0});updateRooftopEncounters(s);assert.equal(roofEncounter(s,r).state,'dormant');Object.assign(s.player,{y:r.top,grounded:false,grapple:{anchorId:r.anchor.id}});updateRooftopEncounters(s);assert.equal(s.enemies.length,0);s.player.grapple=null;ascend(s);const rec=roofEncounter(s,r);assert.equal(rec.state,'active');assert.equal(s.enemies.length,1);const id=rec.guardId;for(let i=0;i<60;i++)s.update(1/120,{auto:false});assert.equal(roofEncounter(s,r).guardId,id);assert.equal(s.enemies.length,1);assert.ok(Math.abs(s.enemies[0].y-r.top)<1e-8);}
});
test('optional guard never blocks waves or inflates wave kills and is not culled into a replacement wave spawn',()=>{
 const s=game(),r=ascend(s),e=s.enemies[0];s.toSpawn=0;s.update(.01,{auto:false});assert.equal(s.state,'upgrade');assert.equal(roofEncounter(s,r).state,'active');s.nextWave();s.wave=32;s.toSpawn=0;s.update(.01,{auto:false});assert.equal(s.state,'extracting');const kills=s.waveKills;s.damageEnemy(e,9999);assert.equal(s.waveKills,kills);updateRooftopEncounters(s);assert.equal(roofEncounter(s,r).state,'cleared');
 const away=game();ascend(away);const guard=away.enemies[0],remaining=away.toSpawn;Object.assign(away.player,{x:guard.x+100,z:guard.z,y:0,supportId:null});away.update(.01,{auto:false});assert.ok(guard.health>0);assert.equal(away.toSpawn,remaining);
});
test('cache requires cleared roof, real grounded approach and one explicit interaction',()=>{
 const s=game(),r=ascend(s),cache=roofCachePosition(r);Object.assign(s.player,cache);const before=s.rpg.coins;assert.equal(collectRoofCache(s),true);assert.equal(s.rpg.coins,before);s.damageEnemy(s.enemies[0],9999);updateRooftopEncounters(s);const coins=s.rpg.coins;
 s.player.y=0;assert.equal(nearbyRoofCache(s),null);s.player.y=r.top;s.player.grounded=false;assert.equal(nearbyRoofCache(s),null);s.player.grounded=true;s.player.grapple={};assert.equal(nearbyRoofCache(s),null);s.player.grapple=null;
 s.update(.01,{auto:false,interact:true});assert.equal(roofEncounter(s,r).state,'claimed');assert.equal(s.rpg.coins,coins+60);s.update(.01,{auto:false,interact:true});assert.equal(s.rpg.coins,coins+60);
});
test('destroying an active roof removes its reward, drops its guardian, and cannot create another guardian',()=>{
 const s=game(),r=ascend(s),guard=s.enemies[0];s.damageProp(s.props.find(p=>p.id===r.buildingId),1e9);for(let i=0;i<300;i++)s.update(1/120,{auto:false});assert.equal(roofEncounter(s,r).state,'lost');assert.equal(guard.y,0);assert.equal(collectRoofCache(s),false);assert.equal(s.enemies.filter(e=>e.roofEncounterId===r.id).length,1);
});
