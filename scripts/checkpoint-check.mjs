import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {captureExpedition,restoreExpedition} from '../src/rebuild/ExpeditionCheckpoint.js';

// Audit serialization at every progression tier, including actual upgrade
// selections. Threats are cleared only to reach a legal checkpoint location;
// normal spawning and simulation resume on both sides of each comparison.
let checked=0;
for(const mode of ['city','campaign']){
 const original=new Simulation({seed:31,mode,profile:{}});original.start();
 for(let wave=1;wave<=32;wave++){
  assert.equal(original.wave,wave);
  original.enemies=[];original.toSpawn=1;original.player.x=0;original.player.z=3;original.pause();
  const restored=restoreExpedition(captureExpedition(original),{profile:original.profile});
  original.events=[];original.resume();restored.resume();
  for(let step=0;step<20;step++){original.update(.05,{auto:false});restored.update(.05,{auto:false});}
  for(const key of ['player','enemies','bullets','pickups','weather','rpg','profile','wave','score','nextId'])assert.deepEqual(restored[key],original[key],`${mode}, wave ${wave}: ${key}`);
  assert.equal(restored.random.getState(),original.random.getState());checked++;
  if(wave<32){original.enemies=[];original.toSpawn=0;original.update(.05,{});assert.equal(original.state,'upgrade');assert.ok(original.chooseUpgrade(original.choices[0].id));}
 }
}
console.log(`${checked} city/campaign checkpoint progression checks passed.`);
