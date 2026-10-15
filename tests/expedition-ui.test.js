import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCheckpointResume,checkpointSummary,withCheckpointLock,checkpointLocksAvailable,EXPEDITION_LOCK,syncExpeditionWeather} from '../src/rebuild/ExpeditionUI.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {captureExpedition,restoreExpedition} from '../src/rebuild/ExpeditionCheckpoint.js';
import {weatherSettings,updateWeather} from '../src/rebuild/Weather.js';

test('resume consumes its one-use save only after the replacement world is prepared',()=>{
 const calls=[],profile={level:3},sim={state:'paused'},world={destroy(){calls.push('destroy');}};
 const store={read(arg){assert.equal(arg.profile,profile);calls.push('read');return sim;},consume(){calls.push('consume');}};
 assert.deepEqual(prepareCheckpointResume(store,profile,value=>{assert.equal(value,sim);calls.push('prepare');return world;}),{sim,world});
 assert.deepEqual(calls,['read','prepare','consume']);
});
test('failed world preparation preserves the saved expedition',()=>{
 let consumed=false;const store={read:()=>({}),consume(){consumed=true;}};
 assert.throws(()=>prepareCheckpointResume(store,{},()=>{throw new Error('Graphics unavailable');}),/Graphics unavailable/);
 assert.equal(consumed,false);
});
test('failed or concurrent checkpoint consumption releases the prepared world',()=>{
 let disposed=0;const store={read:()=>({}),consume(){throw new Error('Another tab changed this expedition');}};
 assert.throws(()=>prepareCheckpointResume(store,{},()=>({destroy(){disposed++;}})),/Another tab/);
 assert.equal(disposed,1);
});
test('missing or incompatible checkpoint never builds a replacement world',()=>{
 let prepared=false;
 for(const read of [()=>null,()=>{throw new Error('Different hero');}])assert.throws(()=>prepareCheckpointResume({read}, {},()=>{prepared=true;}));
 assert.equal(prepared,false);
});
test('resume summary identifies the local region and wave without exposing the full snapshot',()=>{
 assert.match(checkpointSummary({regionId:'country-road',wave:7,savedAt:0}),/^OLD MILL ROAD · WAVE 07/);
 assert.match(checkpointSummary({regionId:'city',wave:1,savedAt:'invalid'}),/^SAINT-ROCH · WAVE 01 · Saved on this device$/);
});


test('tentative UI activation must succeed before checkpoint consumption and is rolled back on failure',()=>{
 const calls=[],store={read:()=>({}),consume(){calls.push('consume');}};
 assert.throws(()=>prepareCheckpointResume(store,{},()=>({destroy(){calls.push('destroy');}}),{
  activate(){calls.push('activate');throw new Error('Dialog failed');},rollback(){calls.push('rollback');}
 }),/Dialog failed/);
 assert.deepEqual(calls,['activate','rollback','destroy']);
});
test('storage failure rolls back an already prepared UI and releases the candidate world',()=>{
 const calls=[],store={read:()=>({}),consume(){calls.push('consume');throw new Error('Storage denied');}};
 assert.throws(()=>prepareCheckpointResume(store,{},()=>({destroy(){calls.push('destroy');}}),{
  activate(){calls.push('activate');},rollback(){calls.push('rollback');}
 }),/Storage denied/);
 assert.deepEqual(calls,['activate','consume','rollback','destroy']);
});
function lockManager(){
 let tail=Promise.resolve();const requests=[];
 return {requests,request(name,options,operation){requests.push({name,...options});const next=tail.then(operation);tail=next.catch(()=>{});return next;}};
}
test('two tabs sharing the origin lock cannot both resume the same one-use expedition',async()=>{
 const locks=lockManager();let stored=true,prepared=0,consumed=0;
 const store={read:()=>stored?{}:null,consume(){assert.equal(stored,true);stored=false;consumed++;}};
 const attempt=()=>withCheckpointLock(()=>prepareCheckpointResume(store,{},()=>{prepared++;return{destroy(){}};}),locks);
 const outcomes=await Promise.allSettled([attempt(),attempt()]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(consumed,1);assert.equal(prepared,1);
 assert.deepEqual(locks.requests,[{name:EXPEDITION_LOCK,mode:'exclusive'},{name:EXPEDITION_LOCK,mode:'exclusive'}]);
});
test('save, resume and discard share the same lock and failed operations release it',async()=>{
 const locks=lockManager(),calls=[];
 const outcomes=await Promise.allSettled([
  withCheckpointLock(async()=>{calls.push('save');await Promise.resolve();calls.push('saved');},locks),
  withCheckpointLock(()=>{calls.push('resume failed');throw new Error('Corrupt');},locks),
  withCheckpointLock(()=>{calls.push('discard');},locks)
 ]);
 assert.deepEqual(calls,['save','saved','resume failed','discard']);assert.equal(outcomes[1].status,'rejected');
 assert.equal(new Set(locks.requests.map(x=>x.name)).size,1);
});
test('unavailable Web Locks rejects checkpoint changes before touching storage',async()=>{
 let touched=false;
 assert.equal(checkpointLocksAvailable(null),false);assert.equal(checkpointLocksAvailable({}),false);
 await assert.rejects(withCheckpointLock(()=>{touched=true;},null),/Fresh expeditions and your hero still work/);
 assert.equal(touched,false);
});

test('resumed weather controls preserve the saved night and rain when an unrelated setting changes',()=>{
 const original=new Simulation({seed:31,mode:'city',profile:{},environment:{dayCycle:'night',weatherMode:'rain',weatherEffects:'full'}});original.start();original.pause();
 const sim=restoreExpedition(captureExpedition(original)),settings={dayCycle:'day',weatherMode:'clear',weatherEffects:'off',volume:45};
 const controls={'day-cycle':{value:'day'},'weather-mode':{value:'clear'},'weather-effects':{value:'off'}};
 syncExpeditionWeather(settings,sim.weather.options,id=>controls[id]);
 assert.equal(controls['day-cycle'].value,'night');assert.equal(controls['weather-mode'].value,'rain');
 assert.equal(settings.weatherEffects,'off');assert.equal(controls['weather-effects'].value,'off');
 // Mirror the settings screen's shared input handler after moving only volume.
 settings.volume=20;settings.dayCycle=controls['day-cycle'].value;settings.weatherMode=controls['weather-mode'].value;
 sim.weather.options=weatherSettings(settings);updateWeather(sim,0);
 assert.equal(sim.weather.hour,23);assert.equal(sim.weather.night,true);assert.equal(sim.weather.kind,'rain');
});

test('failed checkpoint consumption restores title weather settings and controls',()=>{
 const settings={dayCycle:'day',weatherMode:'clear',weatherEffects:'subtle'},before=weatherSettings(settings);
 const controls={'day-cycle':{value:'day'},'weather-mode':{value:'clear'},'weather-effects':{value:'subtle'}},control=id=>controls[id];
 let disposed=false;
 const sim={weather:{options:{dayCycle:'night',weatherMode:'snow',weatherEffects:'full'}}};
 assert.throws(()=>prepareCheckpointResume({read:()=>sim,consume(){throw new Error('Storage denied');}}, {},()=>({destroy(){disposed=true;}}),{
  activate:({sim})=>syncExpeditionWeather(settings,sim.weather.options,control),
  rollback:()=>syncExpeditionWeather(settings,before,control)
 }),/Storage denied/);
 assert.deepEqual(settings,before);assert.equal(controls['day-cycle'].value,'day');assert.equal(controls['weather-mode'].value,'clear');assert.equal(controls['weather-effects'].value,'subtle');assert.equal(disposed,true);
});
