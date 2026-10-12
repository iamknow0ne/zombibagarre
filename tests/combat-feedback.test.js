import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {criticalChance,resolveCritical,DamageFeed,damageSize,DAMAGE_STYLES} from '../src/rebuild/Combat.js';
import {CombatOverlay} from '../src/rebuild/CombatOverlay.js';
import {WEAPONS,weaponStats} from '../src/rebuild/config.js';
const game=()=>{const s=new Simulation({seed:71,layout:{cover:[]}});s.start();s.events=[];return s;};
test('every weapon has a bounded critical chance which grows with evolution and Deadeye',()=>{
 for(const key of Object.keys(WEAPONS)){assert.ok(criticalChance({},key)>0);assert.ok(Math.abs(criticalChance({},key,3)-criticalChance({},key)-.06)<1e-9);assert.equal(criticalChance({crit:.8},key,3),.8);}
 assert.equal(criticalChance({},'vehicle'),0);assert.equal(resolveCritical({crit:.8},{weapon:'flame',periodic:true},0).multiplier,1);
 assert.equal(resolveCritical({crit:.8},{weapon:'carbine',execution:true},0).multiplier,1);
});
test('critical damage resolves once, stacks with headshots, and reports exact damage and capped mastery',()=>{
 const s=game(),e=s.spawnEnemy('boss',0,0);s.random=()=>0;const before=e.health;s.damageEnemy(e,10*1.65,0,0,{weapon:'marksman',headshot:true,kind:'ballistic'});
 const hit=s.events.find(e=>e.type==='damage');assert.equal(before-e.health,33);assert.equal(hit.amount,33);assert.equal(hit.dealt,33);assert.ok(hit.critical&&hit.headshot);assert.equal(hit.enemyId,e.id);assert.equal(hit.health,e.health);
 s.damageEnemy(e,99999,0,0,{weapon:'marksman'});const count=s.events.filter(e=>e.type==='damage').length;s.damageEnemy(e,10);assert.equal(s.events.filter(e=>e.type==='damage').length,count);assert.equal(s.player.mastery.marksman,e.maxHealth);
});
test('burn ticks accumulate exact fractional damage without critical rolls or per-tick gore',()=>{
 const s=game(),e=s.spawnEnemy('boss',0,0);s.random=()=>0;s.player.crit=.8;for(let i=0;i<20;i++)s.damageEnemy(e,.3,0,0,{kind:'fire',weapon:'flame',periodic:true});
 const hits=s.events.filter(e=>e.type==='damage');assert.equal(hits.length,20);assert.ok(hits.every(h=>h.amount===.3&&!h.critical));assert.equal(s.events.filter(e=>e.type==='hit').length,0);assert.ok(Math.abs(s.player.mastery.flame-6)<1e-9);
});
test('evolved damage is visibly larger without changing the displayed calculation',()=>{
 const s=game();s.random=()=>.99;const e=s.spawnEnemy('boss',0,0);s.damageEnemy(e,weaponStats(s.player,'carbine').damage,0,0,{weapon:'carbine'});s.player.mastery.carbine=8000;s.player.damage=1.5;s.damageEnemy(e,weaponStats(s.player,'carbine').damage*s.player.damage,0,0,{weapon:'carbine'});
 const [a,b]=s.events.filter(e=>e.type==='damage');assert.ok(b.amount>a.amount*2);assert.ok(damageSize(b.amount)>damageSize(a.amount));assert.equal(b.tier,3);
});
test('burst aggregation separates criticals, wounds and weapons, expires while paused clock stays still, and has a hard cap',()=>{
 const f=new DamageFeed(),hit={enemyId:1,weapon:'shotgun',kind:'ballistic',amount:10};for(let i=0;i<6;i++)f.add(hit);assert.equal(f.hits.length,1);assert.equal(f.hits[0].amount,60);f.add({...hit,critical:true});f.add({...hit,headshot:true});f.add({...hit,weapon:'smg'});assert.equal(f.hits.length,4);
 f.update(0);assert.equal(f.clock,0);f.update(.15);f.add(hit);assert.equal(f.hits.length,5);f.update(2);assert.equal(f.hits.length,0);
 for(let i=0;i<1000;i++)f.add({...hit,enemyId:i});assert.equal(f.hits.length,48);f.clear();assert.equal(f.hits.length,0);assert.equal(f.clock,0);
});
test('display toggles clear existing indicators and never mutate damage or gameplay',()=>{
 const o=Object.create(CombatOverlay.prototype);o.feed=new DamageFeed();o.bars=new Map();o.settings={};const hit={type:'damage',enemyId:1,amount:20,dealt:20,health:80,maxHealth:100};o.event(hit);assert.equal(o.feed.hits.length,1);assert.equal(o.bars.size,1);
 o.applySettings({damageNumbers:false,enemyHealthBars:false});o.event(hit);assert.equal(o.feed.hits.length,0);assert.equal(o.bars.size,0);o.applySettings({});o.event(hit);assert.equal(o.feed.hits.length,1);assert.equal(o.bars.size,1);assert.equal(hit.amount,20);
 assert.equal(new Set(Object.values(DAMAGE_STYLES).map(s=>s.label)).size,6);
});
test('invalid damage cannot corrupt health, feedback or mastery',()=>{const s=game(),e=s.spawnEnemy('walker',0,0),hp=e.health;for(const n of [NaN,Infinity,-5,0])s.damageEnemy(e,n,0,0,{weapon:'carbine'});assert.equal(e.health,hp);assert.equal(s.events.length,0);});
