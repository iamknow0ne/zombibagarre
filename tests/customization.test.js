import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {CUSTOMIZATION,IDENTITIES,normalizeAppearance,resolveAppearance} from '../src/rebuild/Customization.js';
import {buildSurvivor,animateSurvivorDetails} from '../src/rebuild/SurvivorVisuals.js';
import {dressArmour} from '../src/rebuild/RPGVisuals.js';
import {normalizeProfile,applyProfile,applyExpeditionUpgrade} from '../src/rebuild/RPG.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {UPGRADES} from '../src/rebuild/config.js';
const game=profile=>{const s=new Simulation({profile:profile||{},seed:2});s.start();s.toSpawn=0;s.enemies=[];return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('appearance migration whitelists every category and survives profile serialization',()=>{
 const raw={skin:'deep',hair:'braids',coat:'split',hideHelmet:'yes',damage:999,eyes:'bogus',face:'__proto__'};
 const a=normalizeAppearance(raw);assert.deepEqual(a,{skin:'deep',hair:'braids',coat:'split',hideHelmet:'yes'});
 const p=normalizeProfile({appearance:raw});assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(p))).appearance,a);
 assert.equal(Object.keys(CUSTOMIZATION).length,12);assert.deepEqual(normalizeAppearance(null),{});
 for(const id of Object.keys(IDENTITIES))for(const [key,value]of Object.entries(resolveAppearance(id)))assert.ok(CUSTOMIZATION[key].options[value]);
});
test('all signature survivors retain weapon IK anchors and bounded render geometry',()=>{
 for(const id of Object.keys(IDENTITIES)){const m=buildSurvivor(id),b=new Box3().setFromObject(m);assert.ok(b.max.y<2.1&&b.min.y>=0);assert.equal(m.userData.arms.length,2);let draws=0,triangles=0;m.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(draws<45,`${id}: ${draws}`);assert.ok(triangles<26000);for(const arm of m.userData.arms){assert.equal(arm.position.y,1.35);assert.equal(arm.userData.elbow.position.y,-.34);assert.equal(arm.userData.wrist.position.y,-.32);}animateSurvivorDetails(m,1,1,true);for(const tail of m.userData.tails)assert.ok(tail.rotation.x<-.3);}
});
test('helmet visibility changes appearance without changing protection or health',()=>{
 const s=game({owned:['warden-head-3'],equipment:{head:'warden-head-3'}}),m=buildSurvivor('scout');dressArmour(m,s.player);assert.equal(m.userData.hat.visible,false);const protection=s.player.resistance,health=s.player.maxHealth,parts=m.userData.armourParts.length;
 s.profile.appearance={hideHelmet:'yes',skin:'ebony',coat:'trench'};applyProfile(s);dressArmour(m,s.player);assert.equal(m.userData.hat.visible,true);assert.ok(m.userData.armourParts.length<parts);assert.equal(s.player.resistance,protection);assert.equal(s.player.maxHealth,health);
 const signature=m.userData.armourParts;dressArmour(m,s.player);assert.equal(m.userData.armourParts,signature);
});
test('permanent attributes and multiplicative upgrades commute, including free respec',()=>{
 const attrs={agility:10,focus:10},a=game({xp:10000,attributes:attrs}),b=game({xp:10000});
 for(const id of ['speed','reload'])for(let rank=1;rank<=4;rank++){const u=UPGRADES.find(u=>u.id===id);applyExpeditionUpgrade(a.player,u,rank);applyExpeditionUpgrade(b.player,u,rank);}
 b.profile.attributes={...b.profile.attributes,...attrs};applyProfile(b);close(a.player.speed,b.player.speed);close(a.player.reloadMultiplier,b.player.reloadMultiplier);
 for(const s of [a,b]){s.profile.attributes.agility=0;s.profile.attributes.focus=0;applyProfile(s);}close(a.player.speed,b.player.speed);close(a.player.reloadMultiplier,b.player.reloadMultiplier);
 const p=a.player,speed=p.speed,reload=p.reloadMultiplier;p.health=20;for(let n=0;n<10;n++)applyProfile(a);close(p.speed,speed);close(p.reloadMultiplier,reload);assert.equal(p.health,20);assert.ok(reload>.25);
});
test('capped defensive perks preserve gear protection and respec reverses only gear',()=>{
 const s=game({owned:['warden-head-3','warden-chest-3','warden-legs-3'],equipment:{head:'warden-head-3',chest:'warden-chest-3',legs:'warden-legs-3'}}),u=UPGRADES.find(u=>u.id==='armour');
 for(let rank=1;rank<=4;rank++)applyExpeditionUpgrade(s.player,u,rank);close(s.player.resistance,.88);
 s.profile.equipment={head:null,chest:null,legs:null};applyProfile(s);close(s.player.resistance,.6);
});
test('Second Wind applies exactly its documented double regeneration bonus',()=>{
 const a=game(),b=game();for(const s of [a,b]){s.toSpawn=1;s.spawnTimer=999;s.player.health=40;s.player.regen=.6;s.player.invulnerable=100;}b.player.lifeSteal=2;
 const input={moveX:0,moveZ:0,aimX:0,aimZ:0,fire:false};for(let n=0;n<60;n++){a.update(1/60,input);b.update(1/60,input);}close(b.player.health,41.2);close(a.player.health,40.6);
});
test('stowing and re-equipping identical guns cannot refill their second magazine or cancel its reload',()=>{
 const s=game();s.setLoadout(['carbine','carbine']);s.player.magazines.offhand=2;s.reload('carbine','offhand');const timer=s.player.reloads.offhand;assert.ok(timer>0);
 for(let n=0;n<4;n++){s.setLoadout(['carbine']);s.setLoadout(['carbine','carbine']);assert.equal(s.player.magazines.offhand,2);assert.equal(s.player.reloads.offhand,timer);}
 s.setLoadout(['smg','smg']);s.player.magazines.offhand=3;s.setLoadout(['carbine','carbine']);assert.equal(s.player.magazines.offhand,2);s.setLoadout(['smg','smg']);assert.equal(s.player.magazines.offhand,3);
});
test('enemy melee windups cannot hit through a solid wall',()=>{
 const s=game();s.player.x=0;s.player.z=0;s.player.invulnerable=0;const e=s.spawnEnemy('walker',0,.9);e.windup=.01;e.attack=1;const health=s.player.health;
 s.obstacles=[{x:0,z:.45,w:2,d:.1,health:100}];s.updateEnemies(.02);assert.equal(s.player.health,health);
 s.obstacles=[];e.windup=.01;s.updateEnemies(.02);assert.ok(s.player.health<health);
});
