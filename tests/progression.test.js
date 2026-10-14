import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {normalizeProfile,spendPoint,applyProfile,gainXP,SKILLS,ARMOUR,pointsLeft} from '../src/rebuild/RPG.js';
import {TRAINING,availableWeapons,weaponLock,throwableLock,canDualWield,enforceProgression} from '../src/rebuild/Progression.js';
import {throwOrdnance} from '../src/rebuild/Throwables.js';
import {ProgressionFeed} from '../src/rebuild/ProgressionFeed.js';
import {armourIcon} from '../src/rebuild/Dossier.js';
import {upgradeIcon} from '../src/rebuild/UpgradeUI.js';
import {toggleLoadout} from '../src/rebuild/Loadout.js';
const game=(progression='hero',profile={})=>{const s=new Simulation({profile,progression,layout:{bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},cover:[],spawnPoints:[]}});s.start();s.toSpawn=999;s.spawnTimer=99999;return s;};
test('hero starts with basic equipment and every selection path obeys training',()=>{
 const s=game();assert.deepEqual(availableWeapons(s),['carbine','katana']);s.start('launcher');assert.equal(s.player.weapon,'carbine');s.switchWeapon('arc');assert.equal(s.player.weapon,'carbine');s.setLoadout(['carbine','carbine']);assert.equal(s.player.equipped.length,1);s.equipWeapon('hammer');assert.deepEqual(s.player.equipped,['carbine']);s.player.throwable='frost';assert.equal(throwOrdnance(s,{x:0,z:3}),false);assert.equal(s.player.grenades,3);assert.match(weaponLock(s,'hammer'),/Weapons of the old world/);
});
test('training requires level, parent and points; branches unlock weapons and paired guns',()=>{
 const s=game('hero',{xp:100000});assert.equal(spendPoint(s,'duelist'),false);assert.equal(spendPoint(s,'automatic'),true);assert.equal(spendPoint(s,'duelist'),true);s.setLoadout(['smg','carbine']);assert.deepEqual(s.player.equipped,['smg','carbine']);assert.ok(canDualWield(s));for(const key of Object.keys(TRAINING))if(!s.profile.skills.includes(key))assert.ok(spendPoint(s,key),key);assert.equal(availableWeapons(s).length,13);for(const key of ['frag','molotov','frost','shock'])assert.equal(throwableLock(s,key),'');const before=pointsLeft(s.profile);assert.equal(spendPoint(s,'automatic'),false);assert.equal(pointsLeft(s.profile),before);const low=game();assert.equal(spendPoint(low,'automatic'),false);
});
test('an unlocked firearm card replaces the main hand before dual-wield training',()=>{
 const s=game('hero',{xp:1000,skills:['closequarters','automatic']});
 const choose=key=>s.setLoadout(toggleLoadout(s.player.equipped,key,canDualWield(s)?2:1));
 s.player.magazines.shotgun=2;s.player.reloads.shotgun=.7;
 assert.equal(choose('shotgun'),true);assert.deepEqual(s.player.equipped,['shotgun']);
 assert.equal(s.player.weapon,'shotgun');assert.equal(s.player.magazines.shotgun,2);assert.equal(s.player.reload,.7);
 assert.equal(choose('shotgun'),false);assert.deepEqual(s.player.equipped,['shotgun']);
 assert.equal(s.equipWeapon('smg'),true);assert.deepEqual(s.player.equipped,['smg']);
 assert.equal(choose('katana'),true);assert.deepEqual(s.player.equipped,['katana']);
 assert.equal(choose('shotgun'),true);assert.deepEqual(s.player.equipped,['shotgun']);
 for(const progression of ['hero','sandbox']){
  const dual=game(progression,{xp:100000,skills:['automatic','duelist','closequarters']});
  dual.setLoadout(toggleLoadout(dual.player.equipped,'shotgun',canDualWield(dual)?2:1));
  assert.deepEqual(dual.player.equipped,['carbine','shotgun']);
  dual.equipWeapon('shotgun');assert.deepEqual(dual.player.equipped,['carbine']);
 }
});
test('requesting a locked weapon preserves a trained gun or melee stance and its attack state',()=>{
 const s=game('hero',{xp:1000,skills:['closequarters']});
 for(const key of ['shotgun','katana']){
  s.switchWeapon(key);s.events=[];const attack={weapon:key};s.player.meleeAttack=attack;
  assert.equal(s.equipWeapon('arc'),false);assert.deepEqual(s.player.equipped,[key]);
  assert.equal(s.player.meleeAttack,attack);assert.deepEqual(s.events,[]);
 }
});
test('testing access is reversible without granting skills and reallocation removes restricted equipment',()=>{
 const s=game('sandbox');s.setLoadout(['launcher','arc']);s.player.throwable='shock';assert.equal(s.player.equipped.length,2);assert.deepEqual(s.profile.skills,[]);s.progression='hero';enforceProgression(s);assert.deepEqual(s.player.equipped,['carbine']);assert.equal(s.player.throwable,'frag');s.profile=normalizeProfile({xp:100000,skills:['automatic','duelist']});applyProfile(s);s.setLoadout(['smg','smg']);assert.equal(s.player.equipped.length,2);s.profile.skills=[];applyProfile(s);assert.deepEqual(s.player.equipped,['carbine']);s.progression='sandbox';assert.equal(availableWeapons(s).length,13);
});
test('learned training persists through normalized saves and fresh expeditions; earned relics retain weapon access',()=>{
 const p=normalizeProfile({xp:100000,skills:['automatic','duelist','precision','ignition','conduction'],relics:['void']});const s=game('hero',JSON.parse(JSON.stringify(p)));s.setLoadout(['arc','launcher']);assert.deepEqual(s.player.equipped,['arc','launcher']);s.player.throwable='shock';assert.ok(throwOrdnance(s,{x:0,z:4}));s.profile.skills=[];applyProfile(s);assert.equal(s.player.throwable,'frag');assert.equal(weaponLock(s,'launcher'),'');assert.equal(s.hazards[0].throwable,'shock');assert.equal(normalizeProfile({xp:100000,skills:['duelist']}).skills.length,0);
});
test('promotion notices report actual level changes, skill purchases and weapon tiers, then merge and expire',()=>{
 const s=game();gainXP(s,1);assert.equal(s.events.filter(e=>e.type==='progression').length,0);gainXP(s,600);const event=s.events.find(e=>e.type==='progression');assert.equal(event.title,'LEVEL 3');assert.equal(event.detail,'+4 SKILL POINTS');assert.ok(spendPoint(s,'automatic'));assert.ok(s.events.some(e=>e.type==='progression'&&e.category==='skill'));const feed=new ProgressionFeed();feed.add(event);feed.add({type:'evolution',weapon:'carbine',tier:1});feed.add({type:'evolution',weapon:'carbine',tier:2});assert.equal(feed.items.length,2);assert.match(feed.items[1].detail,/ELITE/);for(let i=0;i<10;i++)feed.add({type:'progression',category:'skill',title:'SKILL '+i});assert.equal(feed.items.length,3);feed.update(0);assert.equal(feed.items.length,3);feed.update(4);assert.equal(feed.items.length,0);feed.clear();assert.equal(feed.clock,0);
});
test('all skills and armour families have complete, distinct interface illustrations',()=>{
 for(const skill of Object.values(SKILLS))assert.ok(!upgradeIcon(skill.icon).includes('undefined'),skill.name);assert.equal(new Set(Object.values(ARMOUR).map(armourIcon)).size,36);for(const slot of ['head','chest','legs'])assert.match(armourIcon({slot,family:'empty',tier:-1}),/armour-empty/);
});
