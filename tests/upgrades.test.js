import test from 'node:test';
import assert from 'node:assert/strict';
import {UPGRADES,UPGRADE_TIERS,rankOf,rollUpgrades,upgradeOffer,perkDamage} from '../src/rebuild/Upgrades.js';
import {upgradeIcon} from '../src/rebuild/UpgradeUI.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {seededRandom} from '../src/rebuild/config.js';
import {resolveCritical} from '../src/rebuild/Combat.js';
const fresh=()=>{const s=new Simulation({layout:{cover:[]}});s.start();s.toSpawn=0;s.state='playing';return s;};
const apply=(s,id)=>{s.state='upgrade';s.choices=[upgradeOffer(UPGRADES.find(u=>u.id===id),s.player)];return s.chooseUpgrade(id);};
test('32 upgrade identities have distinct vector icons, four valid incremental tiers and finite effects',()=>{
 assert.equal(UPGRADES.length,32);assert.equal(new Set(UPGRADES.map(u=>u.id)).size,32);assert.equal(new Set(UPGRADES.map(u=>upgradeIcon(u.icon))).size,32);
 for(const u of UPGRADES){const s=fresh();for(let rank=1;rank<=4;rank++){const offer=upgradeOffer(u,s.player);assert.equal(offer.rank,rank);assert.equal(offer.tier,UPGRADE_TIERS[rank-1]);assert.ok(!offer.description.includes('NaN'));assert.ok(apply(s,u.id));assert.equal(rankOf(s.player,u.id),rank);for(const value of Object.values(s.player))if(typeof value==='number')assert.ok(Number.isFinite(value),u.id);}s.state='upgrade';s.choices=[u];assert.equal(s.chooseUpgrade(u.id),false);}
});
test('seeded offers gate tiers, diversify categories, avoid last trio and never offer maxed or irrelevant perks',()=>{
 for(let seed=0;seed<80;seed++){const p=fresh().player,a=rollUpgrades(p,1,seededRandom(seed));assert.equal(a.length,3);assert.equal(new Set(a.map(u=>u.group)).size,3);assert.ok(a.every(u=>u.rank===1));const b=rollUpgrades(p,1,seededRandom(seed+1),a.map(u=>u.id));assert.ok(b.every(u=>!a.some(v=>v.id===u.id)));assert.ok(!a.some(u=>['cuts','engineer','conductor','pyromaniac','shatter'].includes(u.id)));}
 const p=fresh().player;for(const u of UPGRADES)p.upgradeRanks[u.id]=4;p.upgradeRanks.damage=1;p.upgradeRanks.health=2;p.upgradeRanks.speed=3;
 assert.equal(rollUpgrades(p,1,seededRandom(1)).length,0);assert.deepEqual(rollUpgrades(p,3,seededRandom(1)).map(u=>u.rank),[2]);assert.deepEqual(rollUpgrades(p,7,seededRandom(1)).map(u=>u.rank),[2,3]);assert.deepEqual(rollUpgrades(p,12,seededRandom(1)).map(u=>u.rank),[2,3,4]);
});
test('owned upgrades can evolve without immediate repeat, while three-choice offers remain available through a full run',()=>{
 for(let seed=1;seed<=30;seed++){const s=fresh();const random=seededRandom(seed);let previous=[];for(let wave=1;wave<32;wave++){s.wave=wave;s.state='upgrade';s.choices=rollUpgrades(s.player,wave,random,previous);assert.equal(s.choices.length,3);assert.equal(new Set(s.choices.map(u=>u.id)).size,3);previous=s.choices.map(u=>u.id);assert.ok(s.chooseUpgrade(s.choices[seed%3].id));}assert.ok(Object.values(s.player.upgradeRanks).every(rank=>rank<=4));}
});
test('rerolls spend a limited run resource, retain pause state, and new runs reset acquired ranks',()=>{
 const s=fresh();s.state='upgrade';s.offerUpgrades();const previous=s.choices.map(u=>u.id);assert.ok(s.rerollUpgrades());assert.equal(s.rerolls,1);assert.ok(s.choices.every(u=>!previous.includes(u.id)));assert.equal(s.state,'upgrade');assert.ok(s.rerollUpgrades());assert.equal(s.rerollUpgrades(),false);s.chooseUpgrade(s.choices[0].id);assert.equal(s.rerollUpgrades(),false);s.wave=4;s.toSpawn=0;s.enemies=[];s.update(.01,{auto:false});assert.equal(s.rerolls,1);s.start();assert.deepEqual(s.player.upgradeRanks,{});assert.equal(s.rerolls,2);assert.equal(s.upgrades.length,0);
});
test('conditional damage honors weapon, distance, status and critical damage without buffing environmental blasts',()=>{
 const s=fresh(),p=s.player,e=s.spawnEnemy('brute',1,3);Object.assign(p,{eliteDamage:.2,closeDamage:.15,farDamage:.2,woundedDamage:.2,slowDamage:.2,dashDamage:.15,ambushTime:3,fireDamage:.25,electricDamage:.25,sliceDamage:.2});e.health=e.maxHealth*.4;e.slow=2;
 assert.ok(Math.abs(perkDamage(p,e,{kind:'ballistic',weapon:'carbine'})-1.9)<1e-9);assert.equal(perkDamage(p,e,{kind:'explosion'}),1);assert.equal(perkDamage(p,e,{kind:'fire',weapon:'carbine',periodic:true}),1.45);e.x=20;assert.ok(Math.abs(perkDamage(p,e,{kind:'electric',weapon:'arc'})-2.2)<1e-9);
 p.critPower=.5;assert.equal(resolveCritical(p,{weapon:'carbine'},0).multiplier,2.5);assert.equal(resolveCritical(p,{weapon:'carbine',periodic:true},0).multiplier,1);
});
test('wave plates, supply and vehicle repair activate at wave start; dodging grants capped shield and temporary ambush',()=>{
 const s=fresh(),p=s.player;Object.assign(p,{waveShield:20,waveGrenades:2,vehicleRepair:.1,dashShield:8,dashDamage:.2});s.props.push({id:'test',health:40,maxHealth:100});p.vehicleId='test';const grenades=p.grenades;s.nextWave();assert.equal(p.shield,20);assert.equal(p.grenades,grenades+2);assert.equal(s.props[0].health,50);p.vehicleId=null;p.shield=0;s.toSpawn=99;s.spawnTimer=99;s.update(.01,{dash:true,auto:false});assert.equal(p.shield,8);assert.equal(p.ambushTime,3);p.dashCooldown=0;s.update(.01,{dash:true,auto:false});assert.equal(p.shield,8);p.dashCooldown=99;for(let i=0;i<70;i++)s.update(.05,{auto:false});assert.equal(p.ambushTime,0);
});
test('reload and pickup healing and mastery bonuses affect actual combat results',()=>{
 const s=fresh(),p=s.player;p.health=50;p.reloadHeal=4;p.supplyHeal=3;p.masteryBonus=.5;s.toSpawn=99;s.spawnTimer=99;p.magazines.carbine=0;s.reload();p.reloads.carbine=.01;s.update(.02,{auto:false});assert.equal(p.health,54);s.collect('grenade');assert.equal(p.health,57);const e=s.spawnEnemy('brute',0,5);s.damageEnemy(e,10,0,0,{weapon:'carbine',periodic:true});assert.equal(p.mastery.carbine,15);
});
test('blade finisher heals once on enemy contact, never on empty swings or scenery',()=>{
 const s=fresh(),p=s.player;s.setLoadout(['katana']);p.health=40;p.finisherHeal=5;p.angle=0;const attack={weapon:'katana',combo:2,angle:0};s.resolveSlice(attack);assert.equal(p.health,40);s.spawnEnemy('brute',0,4);s.spawnEnemy('brute',.2,4);s.resolveSlice(attack);assert.equal(p.health,45);
});

test('blade builds avoid firearm-only perks and speed ranks actually shorten blade dodge recovery',()=>{
 const s=fresh();s.setLoadout(['katana']);for(let seed=0;seed<50;seed++){const offers=rollUpgrades(s.player,12,seededRandom(seed));assert.ok(offers.every(u=>!['piercing','frost','magazine','incendiary','longshot','medicreload'].includes(u.id)));}
 for(const [weapon,excluded]of [['launcher',['piercing','frost','incendiary']],['arc',['piercing','frost']],['flame',['longshot']]]){const p={...s.player,equipped:[weapon]};for(let seed=0;seed<20;seed++)assert.ok(rollUpgrades(p,12,seededRandom(seed)).every(u=>!excluded.includes(u.id)));}
 const u=UPGRADES.find(u=>u.id==='speed');u.apply(s.player,1);s.toSpawn=99;s.spawnTimer=99;s.update(.01,{dash:true,auto:false});assert.ok(Math.abs(s.player.dashCooldown-.99)<1e-9);
});
