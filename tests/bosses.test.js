import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {BOSS_PROFILES,configureBoss,beginBossAttack,bossContains} from '../src/rebuild/Bosses.js';
import {buildBossModel,animateBossModel,bossWarning} from '../src/rebuild/BossVisuals.js';
import {pointBlocked} from '../src/rebuild/config.js';
import {insideMap} from '../src/rebuild/Map.js';
import {Box3} from 'three';
const game=()=>{const s=new Simulation({layout:{cover:[]}});s.start();s.toSpawn=1;s.spawnTimer=999;s.events=[];return s;};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('arrival protects the introduction, overflow cannot skip phase II, and recovery rewards aggression',()=>{
 const s=game(),e=s.spawnEnemy('boss',0,-5);s.damageEnemy(e,999999);assert.equal(e.health,e.maxHealth);tick(s,168);s.damageEnemy(e,999999);assert.equal(e.health,e.maxHealth/2);assert.ok(e.phasePending);s.damageEnemy(e,999999);assert.equal(e.health,e.maxHealth/2);tick(s,1);assert.equal(e.bossState,'transition');assert.equal(e.bossPhase,2);tick(s,121);e.bossState='recovery';const hp=e.health;s.damageEnemy(e,10);assert.equal(hp-e.health,13);s.damageEnemy(e,999999);assert.ok(e.health<=0);assert.equal(s.events.filter(e=>e.type==='boss-defeated').length,1);
});
test('circle, annulus and rotated lane damage share exact telegraph geometry',()=>{
 assert.ok(bossContains({x:0,z:0,radius:5},{x:4,z:0,radius:.4}));assert.ok(!bossContains({x:0,z:0,radius:10,innerRadius:5},{x:0,z:0,radius:.4}));assert.ok(bossContains({x:0,z:0,radius:10,innerRadius:5},{x:6,z:0,radius:.4}));
 const h={shape:'lane',x:0,z:0,angle:Math.PI/2,length:12,width:2};assert.ok(bossContains(h,{x:5,z:0}));assert.ok(!bossContains(h,{x:0,z:3}));const mesh=bossWarning(h),box=new Box3().setFromObject(mesh);assert.ok(Math.abs(box.max.x-box.min.x-12)<.1);assert.ok(Math.abs(box.max.z-box.min.z-2)<.1);
});
test('target locks at wind-up, standing inside hurts and leaving or dodging prevents damage',()=>{
 for(const action of ['stand','leave','dodge']){const s=game(),e=s.spawnEnemy('boss',0,-5);e.bossState='pursuit';beginBossAttack(s,e,'judgement');const h=s.hazards[0];tick(s,30);assert.equal(s.player.health,100);assert.equal(h.x,0);if(action==='leave')s.player.x=8;tick(s,33);if(action==='dodge')s.update(1/60,{dash:true,x:1,auto:false});tick(s,5);assert.equal(s.player.health<100,action==='stand');}
});
test('phase and death cancel only the owning boss attacks, leaving grenades and its partner intact',()=>{
 const s=game(),a=s.spawnEnemy('boss',0,-5),b=s.spawnEnemy('boss',8,-5);for(const e of [a,b]){e.bossState='pursuit';beginBossAttack(s,e,'judgement');}s.hazards.push({id:999,friendly:true,thrown:true,timer:9,duration:9});s.damageEnemy(a,a.maxHealth);s.updateBoss(a,.01);assert.ok(!s.hazards.some(h=>h.bossOwner===a.id));assert.ok(s.hazards.some(h=>h.bossOwner===b.id));assert.ok(s.hazards.some(h=>h.id===999));
});
test('the campaign spawns the covenant with two health pools, one heavy wind-up, and survivor rage',()=>{
 const s=game();s.mode='city';s.layout.city=true;s.layout.spawnPoints=[];s.layout.landmarks=[];s.wave=27;s.nextWave();const [a,b]=s.enemies;assert.equal(s.enemies.length,2);assert.equal(a.duoId,b.duoId);for(const e of [a,b]){e.x=e===a?-5:5;e.z=-5;}tick(s,180);assert.equal(s.enemies.filter(e=>e.bossState==='telegraph').length,1);assert.equal(s.events.filter(e=>e.type==='boss-intro').length,1);a.bossPhase=2;a.phasePending=false;a.bossState='pursuit';s.damageEnemy(a,999999);assert.ok(b.survivorRage);s.updateBoss(b,.01);assert.equal(b.bossState,'transition');
});
test('every boss move reaches recovery, phase II has additional threats and summons stay bounded',()=>{
 for(let variant=0;variant<8;variant++){const s=game(),e=s.spawnEnemy('boss',0,-5);configureBoss(s,e,{variant});s.player.invulnerable=999;for(const phase of [1,2])for(const move of e.bossProfile.moves){e.bossPhase=phase;beginBossAttack(s,e,move);assert.ok(s.hazards.length>0,move);tick(s,180);assert.ok(['recovery','pursuit'].includes(e.bossState),`${variant} ${phase} ${move}: ${e.bossState}`);assert.ok(s.hazards.length===0);assert.ok(s.enemies.filter(m=>m.summonedBy===e.id).length<=4);}}
});
test('giants spawn outside scenery and map boundaries using their actual collision footprint',()=>{
 for(const variant of [0,3,4,6,7])for(let seed=0;seed<6;seed++){const s=new Simulation({seed});s.start();s.district=variant;const e=s.spawnEnemy('boss',-9,-5);assert.ok(insideMap(s.layout,e.x,e.z,e.radius),`inside ${seed}/${variant}`);assert.ok(!pointBlocked(e.x,e.z,e.radius+.09,s.obstacles),`clear ${seed}/${variant}`);}
});
test('bespoke boss rigs have architectural scale and phase changes alter their articulated silhouette',()=>{
 for(const profile of BOSS_PROFILES){const e={bossProfile:profile,bossKind:profile.kind,bossPhase:1,bossState:'pursuit',bossTimer:0,bossDuration:1},root=buildBossModel(e);animateBossModel(root,e,1);const bounds=new Box3().setFromObject(root);assert.ok(bounds.max.y>profile.height*.82);let count=0;root.traverse(o=>{if(o.isMesh)count++;});assert.ok(count>=10&&count<65);const joint=[...root.userData.petals,...root.userData.doors,...root.userData.arms][0],before=joint.rotation.toArray();e.bossPhase=2;animateBossModel(root,e,1);if(profile.kind!=='dredger')assert.notDeepEqual(joint.rotation.toArray(),before);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
