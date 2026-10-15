import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {seededRandom} from '../src/rebuild/config.js';
import {captureExpedition,restoreExpedition,parseExpedition,checkpointUnavailable,ExpeditionStore,EXPEDITION_KEY,MAX_EXPEDITION_BYTES} from '../src/rebuild/ExpeditionCheckpoint.js';
import {travelGate,requestRegionTravel,completeRegionTravel,captureRegion} from '../src/rebuild/Regions.js';
const game=(mode='city')=>{const s=new Simulation({seed:31,mode,profile:{}});s.start();s.events=[];return s;};
const cross=s=>{Object.assign(s.player,travelGate(s));assert.ok(requestRegionTravel(s));assert.ok(completeRegionTravel(s).ok);};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};
function amend(text,change){const e=JSON.parse(text);change(e);let n=2166136261;const body=JSON.stringify(e.payload);for(let i=0;i<body.length;i++)n=Math.imul(n^body.charCodeAt(i),16777619);e.checksum=(n>>>0).toString(16).padStart(8,'0');return JSON.stringify(e);}

test('RNG checkpoint continues exact mulberry32 sequence after signed wraparound',()=>{
 let seed=2147483640;const legacy=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};const a=seededRandom(seed);
 for(let i=0;i<100;i++)assert.equal(a(),legacy());const b=seededRandom(0);b.setState(a.getState());for(let i=0;i<100;i++)assert.equal(a(),b());assert.throws(()=>a.setState(NaN));assert.throws(()=>a.setState(2147483648));
});
test('fresh Simulation restored from JSON preserves resources and resumes deterministic gameplay without healing or rewards',()=>{
 const a=game();a.player.health=41;a.player.magazines.carbine=7;a.player.reloads.carbine=.3;a.player.dashCooldown=.8;a.player.mastery.carbine=312;a.rpg.coins=19;a.profile.xp=287;a.combo=3;a.comboTimer=1.2;a.random();a.random();a.pause();
 const text=captureExpedition(a),b=restoreExpedition(text,{profile:a.profile});assert.ok(b instanceof Simulation);assert.equal(b.state,'paused');assert.deepEqual(b.player,{...a.player,aiming:false});assert.deepEqual(b.profile,a.profile);assert.equal(b.events.length,0);assert.notEqual(b.props,a.props);assert.equal(b.obstacles[0],b.props.find(p=>p.health>0));
 a.events=[];a.resume();b.resume();for(let i=0;i<120;i++){a.update(.05,{auto:false});b.update(.05,{auto:false});}
 for(const k of ['player','enemies','bullets','pickups','weather','rpg','profile','wave','score','nextId'])assert.deepEqual(b[k],a[k],k);assert.equal(b.random.getState(),a.random.getState());assert.deepEqual(b.events,a.events);
});
test('current and parked city/country regions survive actual text serialization including destruction loot quests and unique ids',()=>{
 const a=game();const building=a.props.find(p=>p.kind==='building');a.damageProp(building,700);a.pickups.push({id:a.nextId++,x:8,z:9,life:17,type:'ammo'});a.visited.add('DISTRICT ONE');a.rubblePiles=new Map([['city-pile',.7]]);a.interiorState.collected.push('tools-once');a.traversalRewardClaimed=true;a.rpg.accepted=['country-supplies'];a.rpg.claimed=['runner'];a.rpg.coins=23;a.profile.xp=369;
 cross(a);a.rpg.countrySupplies=true;a.visited.add('ROAD ONCE');const roadProp=a.props[0];roadProp.health-=20;const next=a.nextId,city=structuredClone(a.regions.get('city')),road=structuredClone(captureRegion(a));
 const b=restoreExpedition(captureExpedition(a),{profile:a.profile});assert.equal(b.activeRegionId,'country-road');assert.deepEqual(b.regions.get('city'),city);assert.equal(b.props[0].health,road.props[0].health);assert.ok(b.visited.has('ROAD ONCE'));assert.equal(b.nextId,next);b.resume();cross(b);
 assert.equal(b.props.find(p=>p.id===building.id).health,building.health);assert.deepEqual(b.pickups,city.pickups);assert.deepEqual(b.rubblePiles,city.rubblePiles);assert.equal(b.traversalRewardClaimed,true);assert.deepEqual(b.interiorState.collected,['tools-once']);assert.equal(b.profile.xp,369);assert.equal(b.rpg.coins,23);assert.equal(b.rpg.countrySupplies,true);assert.deepEqual(b.rpg.claimed,['runner']);cross(b);assert.equal(b.props[0].health,road.props[0].health);assert.equal(b.nextId,next);
});
test('campaign snapshots and paused extraction restore without regenerating a district or advancing victory',()=>{
 const s=game('campaign');s.wave=32;s.district=7;s.state='extracting';s.extraction=2.2;s.pause();const r=restoreExpedition(captureExpedition(s));assert.deepEqual(r.layout,s.layout);assert.equal(r.previousState,'extracting');assert.equal(r.extraction,2.2);assert.equal(r.regions,null);assert.equal(r.wave,32);assert.equal(r.score,s.score);
});
test('safe checkpoint rejects vehicle interior traversal combat upgrade death and nearby threats without touching save',()=>{
 const s=game(),device=storage(),store=new ExpeditionStore(device);store.save(s);const previous=device.getItem(EXPEDITION_KEY);
 for(const mutate of [s=>s.player.vehicleId='car',s=>s.player.y=4,s=>s.player.dash=.2,s=>s.player.grapple={},s=>s.player.meleeAttack={},s=>s.player.throwAnimation=.2,s=>s.interior={},s=>s.state='upgrade',s=>s.player.health=0,s=>s.pendingTravel={},s=>s.focus.active=true,s=>s.spawnEnemy('walker',s.player.x+3,s.player.z)]){const x=restoreExpedition(previous);mutate(x);assert.ok(checkpointUnavailable(x));assert.throws(()=>store.save(x));assert.equal(device.getItem(EXPEDITION_KEY),previous);}
});
test('checkpoint detects incompatible versions truncation corruption excessive size and invalid restored fields',()=>{
 const s=game(),text=captureExpedition(s);for(const raw of [text.slice(0,-8),text.replace('"version":1','"version":99'),text.replace('"score":0','"score":999'), ' '.repeat(MAX_EXPEDITION_BYTES+1)])assert.throws(()=>restoreExpedition(raw));
 for(const change of [e=>e.payload.global.player.x=null,e=>e.payload.global.player.weapon='fake',e=>e.payload.global.nextId=-2,e=>e.payload.randomState=1.5,e=>e.payload.current.props[0].health=null,e=>e.payload.current.visited={bad:true},e=>e.payload.current.layout.bounds.maxX=null,e=>e.payload.global.invented=true])assert.throws(()=>restoreExpedition(amend(text,change)));
 assert.equal(s.score,0);assert.ok(s.player.health>0);
});
test('profile mismatch prevents stale snapshot overwriting permanent reward or equipment progression',()=>{
 const s=game(),text=captureExpedition(s);assert.throws(()=>restoreExpedition(text,{profile:{...s.profile,xp:500}}),/character changed/);assert.doesNotThrow(()=>restoreExpedition(text,{profile:structuredClone(s.profile)}));
});
test('separate checkpoint storage is consumed once and protects changed tabs and quota failures',()=>{
 const device=storage();device.setItem('zb-save-v1','permanent-profile');const a=new ExpeditionStore(device),s=game();assert.equal(a.hasCheckpoint(),false);a.save(s);assert.equal(a.summary().wave,1);const b=new ExpeditionStore(device);assert.ok(b.read({profile:s.profile}) instanceof Simulation);assert.equal(device.getItem('zb-save-v1'),'permanent-profile');b.consume();assert.equal(b.read(),null);assert.equal(device.getItem('zb-save-v1'),'permanent-profile');assert.throws(()=>a.consume(),/changed/);
 a.save(s);const text=device.getItem(EXPEDITION_KEY);device.setItem=()=>{throw new Error('quota');};s.score=123;assert.throws(()=>a.save(s),/quota/);assert.equal(device.getItem(EXPEDITION_KEY),text);a.read();device.removeItem=()=>{};assert.throws(()=>a.consume(),/cleared/);assert.ok(a.hasCheckpoint());
});
test('ephemeral workshops never access real browser checkpoint data and corruption is retained for explicit discard',()=>{
 const s=game(),ephemeral=new ExpeditionStore(()=>{throw new Error('should not touch storage');},{ephemeral:true});ephemeral.save(s);assert.ok(ephemeral.read());ephemeral.consume();assert.equal(ephemeral.hasCheckpoint(),false);
 const device=storage();device.setItem(EXPEDITION_KEY,'broken');const store=new ExpeditionStore(device);assert.equal(store.summary(),null);assert.match(store.issue,/JSON/);assert.equal(store.hasCheckpoint(),true);assert.throws(()=>store.read());assert.equal(device.getItem(EXPEDITION_KEY),'broken');store.discard();assert.equal(store.hasCheckpoint(),false);
});

test('new-run confirmation cannot discard a checkpoint changed by another tab',()=>{
 const device=storage(),writer=new ExpeditionStore(device),reader=new ExpeditionStore(device),s=game();writer.save(s);assert.ok(reader.hasCheckpoint());s.score=50;writer.save(s);assert.throws(()=>reader.discard(),/changed/);assert.equal(reader.summary().wave,1);reader.discard();assert.equal(reader.hasCheckpoint(),false);
});

test('successful checkpoint deletion keeps the activated expedition when the verification read fails',async()=>{
 const {prepareCheckpointResume}=await import('../src/rebuild/ExpeditionUI.js');
 const device=storage(),store=new ExpeditionStore(device),s=game();s.player.health=37;s.rpg.coins=123;store.save(s);
 const remove=device.removeItem;device.removeItem=key=>{remove(key);device.getItem=()=>{throw new Error('storage became unavailable');};};
 let activated=null,rolledBack=false,destroyed=false;const world={destroy(){destroyed=true;}};
 const result=prepareCheckpointResume(store,s.profile,()=>world,{activate:next=>{activated=next;},rollback:()=>{rolledBack=true;activated=null;}});
 assert.equal(result.sim,activated.sim);assert.equal(result.world,world);assert.equal(result.sim.player.health,37);assert.equal(result.sim.rpg.coins,123);assert.equal(rolledBack,false);assert.equal(destroyed,false);assert.equal(device.m.has(EXPEDITION_KEY),false);assert.equal(store.expected,undefined);assert.match(store.issue,/could not be rechecked/);
});
