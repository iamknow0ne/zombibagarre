import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {normalizeProfile,pointsLeft} from '../src/rebuild/RPG.js';
import {readStoredObject} from '../src/rebuild/Persistence.js';
import {Input} from '../src/rebuild/Input.js';
import {FieldMessages,compactFieldMessage} from '../src/rebuild/FieldMessages.js';
import {WEAPONS,magazineSize} from '../src/rebuild/config.js';
import {updateStreetEvents} from '../src/rebuild/StreetEvents.js';

const game=()=>{const s=new Simulation({seed:12});s.start();s.props=[];s.obstacles=[];s.toSpawn=999;s.spawnTimer=9999;s.enemies=[];s.events=[];return s;};
const tick=(s,seconds)=>{for(let i=0;i<seconds*60;i++)s.update(1/60,{auto:false});};

test('holstering a matching pair cannot complete its off-hand reload on another weapon or heal for it',()=>{
 const s=game(),p=s.player;s.setLoadout(['carbine','carbine']);p.magazines.offhand=0;p.reloadHeal=7;p.health=30;s.reload('carbine','offhand');const remaining=p.reloads.offhand;
 s.setLoadout(['shotgun']);s.events=[];tick(s,3);
 assert.equal(p.health,30);assert.equal(p.magazines.offhand,undefined);assert.ok(!s.events.some(e=>e.type==='loaded'));
 s.setLoadout(['carbine','carbine']);assert.equal(p.magazines.offhand,0);assert.equal(p.reloads.offhand,remaining);
 tick(s,2);assert.equal(p.magazines.offhand,magazineSize(p,'carbine'));assert.equal(p.health,37);
 assert.deepEqual(s.events.filter(e=>e.type==='loaded').map(e=>[e.weapon,e.slot]),[['carbine','offhand']]);
});

test('ammo supplies refill holstered matching magazines and cancel their old reload exactly once',()=>{
 const s=game(),p=s.player;s.setLoadout(['smg','smg']);p.magazines.offhand=0;s.reload('smg','offhand');s.setLoadout(['arc','arc']);p.magazines.offhand=1;s.collect('ammo');
 assert.equal(p.magazines.offhand,magazineSize(p,'arc'));s.setLoadout(['smg','smg']);assert.equal(p.magazines.offhand,magazineSize(p,'smg'));assert.equal(p.reloads.offhand,0);
 s.events=[];tick(s,4);assert.ok(!s.events.some(e=>e.type==='loaded'));
});

test('profile recovery accepts only real skill arrays and known own-property equipment identifiers',()=>{
 for(const skills of [null,0,'mender winter',{includes:4},{}]){
  const p=normalizeProfile({xp:50000,skills,owned:['constructor','toString','__proto__','warden-head-1'],relics:['constructor','storm'],relic:'constructor',dye:'toString'});
  assert.deepEqual(p.skills,[]);assert.deepEqual(p.owned,['scout-chest-0','warden-head-1']);assert.deepEqual(p.relics,['storm']);assert.equal(p.relic,null);assert.equal(p.dye,'olive');assert.ok(pointsLeft(p)>=0);
 }
 const learned=normalizeProfile({xp:50000,skills:['mender','mender','bulwark']});assert.deepEqual(learned.skills,['mender','bulwark']);assert.deepEqual(normalizeProfile(learned),learned);
});

test('both entry points can recover from null, primitive, malformed and unavailable saved records without overwriting them',()=>{
 for(const raw of ['null','[]','42','"old-format"','{broken',null]){
  let writes=0;const storage={getItem:()=>raw,setItem:()=>writes++},fallback={quality:'balanced'};
  assert.equal(readStoredObject(storage,'settings',fallback),fallback);assert.equal(writes,0);
 }
 assert.deepEqual(readStoredObject({getItem:()=>'{"quality":"low"}'},'settings'),{quality:'low'});
 assert.deepEqual(readStoredObject({getItem:()=>{throw new Error('denied');}},'settings'),{});
});

test('controller select navigation skips locked and hidden options without firing a false change at the end',()=>{
 const events=[],select={selectedIndex:0,options:[{}, {disabled:true}, {hidden:true}, {}, {parentElement:{tagName:'OPTGROUP',disabled:true}}],dispatchEvent:e=>events.push(e.type)};
 Input.prototype.changeSelection(select,1);assert.equal(select.selectedIndex,3);assert.deepEqual(events,['change','input']);
 Input.prototype.changeSelection(select,1);assert.equal(events.length,2);
 Input.prototype.changeSelection(select,1,true);assert.equal(select.selectedIndex,0);
 Input.prototype.changeSelection(select,-1,true);assert.equal(select.selectedIndex,3);
 select.options.forEach(o=>o.disabled=true);const count=events.length;Input.prototype.changeSelection(select,1,true);assert.equal(events.length,count);
});

test('compact combat notices retain the full message in a bounded, deduplicated field log',()=>{
 const log=new FieldMessages(),message='OVERDRIVE · Both weapons empowered. Armour protects you.';log.add(message);log.add(message);
 assert.equal(compactFieldMessage(message),'OVERDRIVE');assert.deepEqual(log.items,[message]);
 assert.ok(compactFieldMessage('A long objective '.repeat(20)).length<=82);
 for(let i=0;i<10;i++)log.add(`Message ${i}`);assert.equal(log.items.length,6);assert.equal(log.items[0],'Message 9');log.clear();assert.deepEqual(log.items,[]);
});

test('every weapon family survives dual-hand switching, reload, supply and pause/resume with finite combat state',()=>{
 const s=game(),p=s.player;
 for(const key of Object.keys(WEAPONS)){
  s.setLoadout([key,key]);s.update(1/60,{auto:false,firing:true,aim:{x:0,z:-5}});s.reload();s.pause();const time=s.time;s.update(.05,{grenade:true,dash:true});assert.equal(s.time,time);s.resume();tick(s,.2);s.collect('ammo');
  assert.ok(Number.isFinite(p.health)&&Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(p.equipped.length===(WEAPONS[key].melee?1:2));
  for(const ammo of Object.values(p.magazines))assert.ok(Number.isFinite(ammo)&&ammo>=0);
 }
});

test('unfinished city encounters can activate and finish after wave 32 while extraction remains optional',()=>{
 const s=new Simulation({seed:140,mode:'city'});s.start();s.state='extracting';s.wave=32;s.toSpawn=0;s.enemies=[];
 const job=s.streetEvents.find(j=>j.kind==='relay');s.player.x=job.x;s.player.z=job.z;
 updateStreetEvents(s,1/60);assert.equal(job.state,'active');assert.equal(job.guards.length,3);
 for(const enemy of s.enemies)enemy.health=0;
 s.pause();updateStreetEvents(s,10);assert.equal(job.progress,0);assert.equal(job.state,'active');s.resume();
 updateStreetEvents(s,9);assert.equal(job.state,'complete');assert.equal(s.state,'extracting');assert.equal(s.player.shield,40);
 const score=s.score;updateStreetEvents(s,10);assert.equal(s.score,score);assert.equal(s.player.shield,40);
});
