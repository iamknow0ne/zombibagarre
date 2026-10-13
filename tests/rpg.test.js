import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {normalizeProfile,levelForXP,pointsLeft,gainXP,spendPoint,equipArmour,applyProfile,ARMOUR,RELICS,makeRPGWorld,nearbyPlace,interactPlace,purchase,claimQuest,questProgress} from '../src/rebuild/RPG.js';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {pointBlocked,weaponStats} from '../src/rebuild/config.js';
const game=(profile={})=>{const s=new Simulation({seed:31,mode:'city',profile});s.start();s.events=[];return s;};
const go=(s,id)=>{const q=s.places.find(q=>q.id===id);assert.ok(q,id);s.player.x=q.x;s.player.z=q.z;return q;};
test('profile migration rejects invalid equipment, duplicate skills, overspent points and unknown relics',()=>{
 const p=normalizeProfile({xp:-10,attributes:{vigor:999,might:99},skills:['pyre','pyre'],owned:['not-real'],equipment:{head:'scout-chest-0'},relics:['fake'],dye:'bad'});assert.equal(pointsLeft(p),0);assert.equal(p.attributes.vigor,3);assert.equal(p.equipment.head,null);assert.deepEqual(p.skills,[]);assert.equal(p.dye,'olive');assert.deepEqual(p.relics,[]);assert.equal(Object.keys(ARMOUR).length,36);
});
test('levels and gear survive a new expedition, while coins and quests reset',()=>{
 const s=game();gainXP(s,1000);assert.ok(levelForXP(s.profile.xp).level>1);assert.equal(spendPoint(s,'vigor'),true);const max=s.player.maxHealth;s.rpg.coins=999;s.rpg.claimed.push('mercy');const fresh=game(JSON.parse(JSON.stringify(s.profile)));assert.equal(fresh.player.maxHealth,max);assert.equal(fresh.rpg.coins,60);assert.deepEqual(fresh.rpg.claimed,[]);assert.equal(fresh.profile.xp,1000);
});
test('repeated equip and respec do not duplicate bonuses, heal the player or erase wave upgrades',()=>{
 const s=game(),p=s.player;p.damage+=.4;p.health=30;s.profile.owned.push('warden-chest-3');const damage=p.damage;assert.equal(equipArmour(s,'warden-chest-3'),true);const max=p.maxHealth;for(let i=0;i<10;i++)applyProfile(s);assert.equal(p.maxHealth,max);assert.equal(p.health,30);assert.equal(p.damage,damage);s.profile.equipment.chest=null;applyProfile(s);assert.equal(p.maxHealth,100);assert.equal(p.damage,damage);assert.equal(equipArmour(s,'fake'),false);
});
test('shop transactions require proximity, level, funds and unique ownership',()=>{
 const s=game();assert.equal(purchase(s,'warden-head-0','smith'),false);go(s,'smith');s.rpg.coins=100;assert.equal(purchase(s,'warden-head-0','smith'),true);const coins=s.rpg.coins;assert.equal(purchase(s,'warden-head-0','smith'),false);assert.equal(s.rpg.coins,coins);assert.equal(purchase(s,'warden-chest-3','smith'),false);assert.equal(purchase(s,'reaper-head-0','smith'),false);
});
test('city services are deterministic, distinct, dry and accessible across seeds',()=>{
 for(let seed=0;seed<16;seed++){const layout=generateCity(seed),places=makeRPGWorld(layout);assert.equal(places.length,7,`seed ${seed}`);assert.deepEqual(places,makeRPGWorld(layout));for(const q of places){assert.equal(pointBlocked(q.x,q.z,2.5,[...layout.cover,...layout.buildings]),false);assert.equal(!!waterAt(layout,q.x,q.z),false);}assert.ok(places.filter(p=>p.kind==='secret').every(p=>!p.revealed));}
});
test('supply cases and claimed quests pay out only once and unlock permanent armour',()=>{
 const s=game();s.rpg.accepted.push('salvage');for(const id of ['case-a','case-b']){go(s,id);assert.equal(interactPlace(s),true);const n=s.rpg.coins;assert.equal(interactPlace(s),false);assert.equal(s.rpg.coins,n);}assert.deepEqual(questProgress(s,'salvage'),[2,2]);go(s,'smith');assert.equal(claimQuest(s,'salvage','smith'),true);assert.ok(s.profile.owned.includes('warden-chest-1'));const coins=s.rpg.coins;assert.equal(claimQuest(s,'salvage','smith'),false);assert.equal(s.rpg.coins,coins);
});
test('quest clues reveal a single secret boss and its death grants a permanent functional relic',()=>{
 const s=game();s.rpg.accepted.push('signal');s.streetEvents.find(j=>j.kind==='relay').state='complete';go(s,'broker');assert.equal(claimQuest(s,'signal','broker'),true);const q=go(s,'confessor');assert.equal(q.revealed,true);assert.equal(interactPlace(s),true);assert.equal(interactPlace(s),true);const bosses=s.enemies.filter(e=>e.secretId==='confessor');assert.equal(bosses.length,1);const e=bosses[0];e.bossState='pursuit';s.damageEnemy(e,999999);s.updateBoss(e,2.1);s.damageEnemy(e,999999);assert.ok(s.profile.relics.includes('ash'));assert.equal(q.defeated,true);s.profile.relic='ash';applyProfile(s);assert.ok(weaponStats(s.player,'katana').damage>95);const target=s.spawnEnemy('brute',1,1);s.damageEnemy(target,1,0,0,{weapon:'katana',kind:'slice'});assert.equal(target.burning,3);
 for(const id of Object.keys(RELICS)){s.profile.relic=id;applyProfile(s);const w=weaponStats(s.player,RELICS[id].base);assert.equal(w.name,RELICS[id].name);}
});
test('shop interaction pauses combat and vehicle interaction is not stolen while driving',()=>{const s=game();go(s,'medic');assert.equal(interactPlace(s),true);assert.equal(s.state,'paused');s.player.vehicleId='fake';assert.equal(nearbyPlace(s),null);});

test('all relic bonuses survive serialization and only modify their matching weapon family',()=>{
 for(const [id,r] of Object.entries(RELICS)){
  const base=game(),s=game({relics:[id],relic:id});
  const a=weaponStats(base.player,r.base),b=weaponStats(s.player,r.base);
  assert.equal(b.name,r.name);assert.ok(Math.abs(b.damage-a.damage*r.damage)<1e-8);
  if(r.chain)assert.equal(b.chain,a.chain+r.chain);
  if(r.explosive)assert.equal(b.explosive,a.explosive*r.explosive);
  assert.deepEqual(weaponStats(s.player,'carbine'),weaponStats(base.player,'carbine'));
  const restored=game(JSON.parse(JSON.stringify(s.profile)));assert.equal(weaponStats(restored.player,r.base).name,r.name);
 }
});
test('district and street contracts unlock the second guardian and launcher, with no repeat rewards',()=>{
 const s=game();s.rpg.accepted.push('atlas','watch');for(const name of ['A','B','C','D'])s.visited.add(name);for(const job of s.streetEvents)job.state='complete';go(s,'broker');
 assert.equal(claimQuest(s,'watch','broker'),true);assert.ok(s.profile.relics.includes('void'));assert.equal(claimQuest(s,'watch','broker'),false);
 assert.equal(claimQuest(s,'atlas','broker'),true);const q=go(s,'marshal');assert.equal(interactPlace(s),true);const boss=s.enemies.find(e=>e.secretId==='marshal');assert.equal(boss.bossKind,'dredger');boss.bossState='pursuit';s.damageEnemy(boss,999999);s.updateBoss(boss,2.1);s.damageEnemy(boss,999999);assert.ok(s.profile.relics.includes('storm'));assert.equal(q.defeated,true);assert.equal(nearbyPlace(s),null);
 const fresh=game(JSON.parse(JSON.stringify(s.profile)));assert.deepEqual(fresh.profile.relics,['void','storm']);assert.deepEqual(fresh.rpg.accepted,[]);assert.ok(fresh.places.filter(p=>p.kind==='secret').every(p=>!p.revealed&&!p.defeated));
});
