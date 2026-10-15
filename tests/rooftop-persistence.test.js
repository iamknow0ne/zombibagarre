import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {captureExpedition,restoreExpedition,parseExpedition} from '../src/rebuild/ExpeditionCheckpoint.js';
import {travelGate,requestRegionTravel,completeRegionTravel} from '../src/rebuild/Regions.js';
import {updateRooftopEncounters,nearbyRoofCache,collectRoofCache,roofEncounter} from '../src/rebuild/RooftopEncounters.js';

const game=()=>{const sim=new Simulation({seed:31,mode:'city',profile:{}});sim.start();sim.events=[];return sim;};
const roof=s=>s.layout.traversal.roofs[0];
const resources=s=>({coins:s.rpg.coins,xp:s.profile.xp,grenades:s.player.grenades});
function land(s){const r=roof(s);Object.assign(s.player,{x:r.anchor.x,z:r.anchor.z,y:r.top,grounded:true,supportId:r.anchor.supportId,grapple:null,vehicleId:null});return r;}
function activate(s){const r=land(s);updateRooftopEncounters(s);assert.equal(roofEncounter(s,r).state,'active');return s.enemies.find(e=>e.id===roofEncounter(s,r).guardId);}
function ground(s){Object.assign(s.player,{...travelGate(s),y:0,grounded:true,supportId:null,grapple:null,vehicleId:null});}
function cross(s){ground(s);assert.equal(requestRegionTravel(s),true);const result=completeRegionTravel(s);assert.equal(result.ok,true,result.error?.message);}
function claim(s){
 const r=land(s),deck=r.parts.find(p=>p.role==='deck');
 // Locate the authored interaction, never inject rewards or modify its ledger.
 for(let x=deck.x-deck.w/2+1;x<deck.x+deck.w/2-1;x+=.5)for(let z=deck.z-deck.d/2+1;z<deck.z+deck.d/2-1;z+=.5){s.player.x=x;s.player.z=z;if(nearbyRoofCache(s)){assert.equal(collectRoofCache(s),true);return;}}
 assert.fail('Cleared roof has no reachable cache interaction');
}
function clear(s){const e=activate(s);s.damageEnemy(e,1e6,0,0,{kind:'bullet',weapon:'carbine'});s.enemies=s.enemies.filter(e=>e.health>0);updateRooftopEncounters(s);assert.equal(roofEncounter(s,roof(s)).state,'cleared');}
function amend(text,change){const e=JSON.parse(text);change(e.payload);let hash=2166136261;const body=JSON.stringify(e.payload);for(let i=0;i<body.length;i++)hash=Math.imul(hash^body.charCodeAt(i),16777619);e.checksum=(hash>>>0).toString(16).padStart(8,'0');return JSON.stringify(e);}

test('active rooftop guard and ledger survive country roundtrips and checkpoint without respawn or reward',()=>{
 const s=game(),e=activate(s),id=roof(s).id;e.health-=13;e.attack=.37;const expected=structuredClone(e),ledger=structuredClone(s.rooftopEncounters),before=resources(s);
 cross(s);assert.deepEqual(s.regions.get('city').rooftopEncounters,ledger);
 const restored=restoreExpedition(captureExpedition(s),{profile:s.profile}),nextId=restored.nextId;assert.equal(restored.activeRegionId,'country-road');assert.deepEqual(restored.regions.get('city').rooftopEncounters,ledger);restored.resume();
 for(let i=0;i<3;i++){cross(restored);assert.equal(restored.activeRegionId,'city');assert.deepEqual(restored.enemies.find(enemy=>enemy.id===e.id),expected);assert.deepEqual(restored.rooftopEncounters,ledger);land(restored);updateRooftopEncounters(restored);assert.equal(restored.enemies.filter(enemy=>enemy.id===e.id).length,1);assert.equal(restored.rooftopEncounters[id].state,'active');assert.deepEqual(resources(restored),before);cross(restored);}
 assert.equal(restored.nextId,nextId,'returning never allocates a replacement guard');
});

test('cleared checkpoint retains its cache and claimed checkpoint cannot award it again',()=>{
 const s=game();clear(s);ground(s);let r=restoreExpedition(captureExpedition(s),{profile:s.profile});r.resume();assert.equal(roofEncounter(r,roof(r)).state,'cleared');const before=resources(r);claim(r);assert.equal(roofEncounter(r,roof(r)).state,'claimed');assert.deepEqual(resources(r),{coins:before.coins+60,xp:before.xp+60,grenades:before.grenades+2});
 const claimed=resources(r);ground(r);r=restoreExpedition(captureExpedition(r),{profile:r.profile});r.resume();land(r);updateRooftopEncounters(r);assert.equal(collectRoofCache(r),false);assert.deepEqual(resources(r),claimed);
 cross(r);const parked=restoreExpedition(captureExpedition(r),{profile:r.profile});parked.resume();cross(parked);land(parked);updateRooftopEncounters(parked);assert.equal(roofEncounter(parked,roof(parked)).state,'claimed');assert.equal(collectRoofCache(parked),false);assert.deepEqual(resources(parked),claimed);
});

test('destroyed-before-arrival encounter stays lost through checkpoint and region return',()=>{
 const s=game(),r=roof(s),before=resources(s);s.damageProp(s.props.find(p=>p.id===r.buildingId),1e9);updateRooftopEncounters(s);assert.deepEqual(roofEncounter(s,r),{state:'lost',guardId:null});ground(s);cross(s);
 const restored=restoreExpedition(captureExpedition(s),{profile:s.profile});restored.resume();cross(restored);updateRooftopEncounters(restored);assert.deepEqual(roofEncounter(restored,roof(restored)),{state:'lost',guardId:null});assert.equal(restored.enemies.some(e=>e.optionalEncounter),false);assert.equal(collectRoofCache(restored),false);assert.deepEqual(resources(restored),before);
});

test('legacy checkpoints without rooftop ledger load without spawning and activate on a later landing',()=>{
 const s=game(),text=amend(captureExpedition(s),p=>{delete p.current.rooftopEncounters;}),r=restoreExpedition(text,{profile:s.profile});assert.equal(r.rooftopEncounters,undefined);assert.equal(r.enemies.length,0);r.resume();activate(r);assert.equal(r.enemies.filter(e=>e.optionalEncounter).length,1);
});

test('checkpoint rejects invalid rooftop ledger schemas, roof ids and guard sequences',()=>{
 const s=game(),r=roof(s),text=captureExpedition(s),valid={state:'dormant',guardId:null};
 const values=[null,[],{unknown:valid},{[r.id]:{state:'reopened',guardId:null}},{[r.id]:{state:'active',guardId:null}},{[r.id]:{state:'active',guardId:1.5}},{[r.id]:{state:'lost',guardId:-1}},{[r.id]:{state:'lost',guardId:0}},{[r.id]:{state:'lost',guardId:s.nextId}},{[r.id]:{state:'dormant',guardId:1}},{[r.id]:{state:'lost'}},{[r.id]:{...valid,reward:999}}];
 for(const value of values)assert.throws(()=>parseExpedition(amend(text,p=>{p.current.rooftopEncounters=value;})),/rooftop/);
 assert.doesNotThrow(()=>parseExpedition(amend(text,p=>{p.current.rooftopEncounters={[r.id]:valid};})));
 cross(s);const parked=captureExpedition(s);assert.throws(()=>parseExpedition(amend(parked,p=>{p.regions.values.find(([id])=>id==='city')[1].rooftopEncounters={[r.id]:{state:'active',guardId:null}};})),/rooftop/,'parked regions receive the same validation');
});
