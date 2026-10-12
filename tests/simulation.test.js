import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/rebuild/Simulation.js';
import { COVER, WEAPONS, lineBlocked, pointBlocked, segmentCircle, distance, TOTAL_WAVES, ARENA, synergies, weaponSynergies, UPGRADES } from '../src/rebuild/config.js';
const step=(s,n,input={auto:false})=>{for(let i=0;i<n;i++){s.update(1/60,input);s.events=[];}};
const isolated=()=>{const s=new Simulation({seed:21,layout:{cover:COVER}});s.start();s.toSpawn=999;s.spawnTimer=1e6;return s;};

test('movement is normalized; collision and boundaries hold even during a dodge',()=>{
 const a=isolated(),b=isolated();step(a,60,{x:1,z:0,auto:false});step(b,60,{x:1,z:1,auto:false});assert.ok(Math.abs(distance(a.player,{x:0,z:3})-distance(b.player,{x:0,z:3}))<.01);
 const s=isolated();s.player.x=-13;s.player.z=-5;step(s,240,{x:1,z:0,auto:false,dash:true});assert.ok(!pointBlocked(s.player.x,s.player.z,.39));assert.ok(s.player.x<-11);
 s.player.x=19;s.player.z=0;step(s,300,{x:1,z:0,auto:false});assert.ok(s.player.x<=ARENA.maxX-s.player.radius);
});
test('segment collisions include short segments entering cover and high-speed hits',()=>{
 assert.equal(lineBlocked({x:-11.3,z:-5},{x:-11.1,z:-5}),true);
 assert.equal(lineBlocked({x:-15,z:-5},{x:0,z:-5}),true);
 assert.equal(lineBlocked({x:0,z:0},{x:10,z:0}),false);
 assert.equal(segmentCircle(-10,0,10,0,0,0,.5),true);
 assert.equal(segmentCircle(-10,1,10,1,0,0,.5),false);
});
test('paused time, reload, cooldowns and enemy positions do not advance',()=>{
 const s=isolated();s.player.magazines.carbine=0;s.reload();s.spawnEnemy('walker',5,0);s.pause();const old=JSON.stringify({p:s.player,e:s.enemies,t:s.time});step(s,300);assert.equal(JSON.stringify({p:s.player,e:s.enemies,t:s.time}),old);s.resume();step(s,120);assert.equal(s.player.magazines.carbine,24);
});
test('weapons keep separate magazines and equipped weapons reload independently while switching',()=>{
 const s=isolated();s.player.magazines.carbine=2;s.reload();s.switchWeapon('shotgun');assert.equal(s.player.reload,0);assert.equal(s.player.magazines.shotgun,7);step(s,120);assert.equal(s.player.magazines.carbine,24);s.switchWeapon('carbine');s.reload();step(s,100);assert.equal(s.player.magazines.carbine,24);
});
test('auto fire kills enemies, reloads and never shoots through cover',()=>{
 const s=isolated();s.spawnEnemy('brute',0,-5);step(s,420,{auto:true});assert.ok(s.kills>=1);assert.ok(s.score>0);
 const blocked=isolated();blocked.player.x=-14;blocked.player.z=-5;const e=blocked.spawnEnemy('walker',-5,-5);e.speed=0;step(blocked,120,{auto:true});assert.equal(blocked.player.magazines.carbine,24);assert.equal(e.health,e.maxHealth);
});
test('dodge and post-hit invulnerability prevent stacked contact damage',()=>{
 const s=isolated();s.update(1/60,{dash:true,auto:false});s.damagePlayer(20);assert.equal(s.player.health,100);step(s,60);s.damagePlayer(20);s.damagePlayer(20);assert.equal(s.player.health,80);step(s,60);s.damagePlayer(20);assert.equal(s.player.health,60);
});
test('blade melee knocks back, firearms cannot melee, and thrown grenades have a fuse',()=>{
 const s=isolated(),e=s.spawnEnemy('brute',1,3);s.update(1/60,{melee:true,auto:false});assert.equal(e.health,e.maxHealth);s.switchWeapon('katana');s.update(1/60,{melee:true,aim:e,auto:false});assert.equal(e.health,e.maxHealth);assert.ok(s.player.melee>0);step(s,13);assert.ok(e.health<e.maxHealth);assert.ok(e.knockX>0);
 const old=e.health;s.update(1/60,{grenade:true,aim:{x:1,z:3},auto:false});assert.equal(s.player.grenades,2);assert.equal(e.health,old);assert.equal(s.hazards[0].thrown,true);step(s,60);assert.ok(e.health<old);
 s.player.grenades=0;s.update(1/60,{grenade:true,auto:false});assert.equal(s.player.grenades,0);
});
test('spitters fire ranged projectiles and bosses telegraph delayed area damage',()=>{
 const s=isolated();s.spawnEnemy('spitter',0,-5);step(s,110);assert.ok(s.bullets.some(b=>b.enemy));
 const b=isolated();b.spawnEnemy('boss',0,-3);step(b,130);assert.ok(b.hazards.length>0);assert.equal(b.player.health,100);step(b,65);assert.ok(b.player.health<100);
});
test('wave completion waits for all spawns and dead enemies; upgrades apply once',()=>{
 const s=isolated();s.toSpawn=0;const e=s.spawnEnemy('walker',0,0);s.update(1/60,{auto:false});assert.equal(s.state,'playing');s.damageEnemy(e,10000);s.update(1/60,{auto:false});assert.equal(s.state,'upgrade');assert.equal(s.choices.length,3);s.player.health=40;const id=s.choices[0].id;assert.equal(s.chooseUpgrade(id),true);assert.equal(s.wave,2);assert.ok(s.player.health>=65);assert.equal(s.chooseUpgrade(id),false);assert.equal(s.wave,2);
});
test('extraction requires entering the beacon and holding; winning is terminal',()=>{
 const s=isolated();s.wave=TOTAL_WAVES;s.toSpawn=0;s.update(1/60,{auto:false});assert.equal(s.state,'extracting');step(s,360);assert.equal(s.state,'extracting');s.player.x=0;s.player.z=-10;step(s,250);assert.equal(s.state,'victory');const score=s.score;step(s,300);assert.equal(s.score,score);
});
test('death is terminal, large delta is clamped and a fresh run resets all state',()=>{
 const s=isolated();s.damagePlayer(200);assert.equal(s.state,'dead');step(s,180);assert.equal(s.time,0);const n=isolated();n.update(100,{x:1,auto:false});assert.ok(n.player.x<.3);assert.equal(n.kills,0);assert.equal(n.player.health,100);
});
test('supplies heal only below maximum; rewards never exceed maximum health',()=>{
 const s=isolated();s.pickups.push({id:1,x:0,z:3,type:'health',life:30});s.update(1/60,{auto:false});assert.equal(s.pickups.length,1);s.player.health=95;s.update(1/60,{auto:false});assert.equal(s.player.health,100);assert.equal(s.pickups.length,0);
});
test('all weapon configurations can finish the opening wave without player movement',()=>{
 for(const weapon of Object.keys(WEAPONS)){const s=new Simulation({seed:99});s.start(weapon);for(let i=0;i<60*100&&s.state==='playing';i++){s.update(1/60,{auto:true,melee:s.enemies.some(e=>distance(e,s.player)<2)});s.events=[];}assert.equal(s.state,'upgrade',`${weapon}: ${s.state} with ${s.enemies.length} enemies left`);assert.equal(s.kills,12);}
});

test('all eight power-ups have their promised effect and timed buffs expire',()=>{
 const s=isolated(),p=s.player;p.health=20;s.collect('health');assert.equal(p.health,50);
 s.collect('shield');s.damagePlayer(25);assert.equal(p.health,50);assert.equal(p.shield,35);
 s.collect('overdrive');s.collect('freeze');s.collect('double');assert.equal(p.overdrive,12);assert.equal(p.freeze,8);assert.equal(p.doubleScore,15);
 const n=p.grenades;s.collect('grenade');assert.equal(p.grenades,n+2);p.magazines.arc=0;s.collect('ammo');assert.equal(p.magazines.arc,16);
 const e=s.spawnEnemy('walker',1,3);s.collect('nova');assert.ok(e.health<=0);step(s,16*60);assert.equal(p.overdrive,0);assert.equal(p.freeze,0);assert.equal(p.doubleScore,0);
});
test('piercing, burning, explosive and chaining weapons are mechanically distinct',()=>{
 const s=isolated();s.switchWeapon('marksman');const a=s.spawnEnemy('brute',0,-1),b=s.spawnEnemy('brute',0,-3);a.speed=b.speed=0;step(s,45,{auto:true});assert.ok(a.health<a.maxHealth);assert.ok(b.health<b.maxHealth);
 const f=isolated();f.switchWeapon('flame');const target=f.spawnEnemy('brute',0,0);target.speed=0;step(f,40,{auto:true});assert.ok(target.burning>0);const hp=target.health;step(f,30,{auto:false});assert.ok(target.health<hp);
 const c=isolated();c.switchWeapon('arc');const one=c.spawnEnemy('brute',0,0),two=c.spawnEnemy('brute',2,0);one.speed=two.speed=0;step(c,20,{auto:true});assert.ok(one.health<one.maxHealth&&two.health<two.maxHealth);
 const l=isolated();l.switchWeapon('launcher');const x=l.spawnEnemy('brute',0,-2),y=l.spawnEnemy('brute',1,-2);x.speed=y.speed=0;step(l,50,{auto:true});assert.ok(x.health<x.maxHealth&&y.health<y.maxHealth);
});
test('destroyed cover stops blocking movement, targeting and navigation',()=>{
 const s=isolated(),car=s.props.find(p=>p.kind==='car');assert.ok(s.blocked({x:-14,z:-5},{x:-4,z:-5}));s.damageProp(car,1000);assert.equal(s.blocked({x:-14,z:-5},{x:-4,z:-5}),false);s.player.x=-13;s.player.z=-5;step(s,90,{x:1,z:0,auto:false});assert.ok(s.player.x>-8);
 const crate=s.props.find(p=>p.kind==='crate');s.damageProp(crate,999);assert.ok(s.pickups.some(i=>i.x===crate.x&&i.z===crate.z));
});
test('environmental explosions telegraph and chained destruction is finite',()=>{
 const s=isolated();const barrel=s.props.find(p=>p.kind==='barrel');s.player.x=barrel.x;s.player.z=barrel.z+1;s.damageProp(barrel,99);assert.equal(s.player.health,100);assert.ok(s.hazards.some(h=>h.environment));step(s,35);assert.ok(s.player.health<100);
 const many=isolated();many.blast(0,0,50,1000);step(many,90);assert.equal(many.props.filter(p=>p.health>0).length,0);assert.equal(many.hazards.length,0);assert.ok(many.events.length<1000);
});
test('enemy pathfinding reaches a stationary survivor around every cover item',()=>{
 const s=isolated();for(const prop of s.props){s.spawnEnemy('walker',prop.x-3,prop.z-2);}
 step(s,60*110,{auto:true,melee:true});assert.equal(s.enemies.length,0);
});

test('two firearms fire concurrently and an added third replaces the offhand',()=>{
 const s=isolated();s.equipWeapon('flame');assert.deepEqual(s.player.equipped,['carbine','flame']);const e=s.spawnEnemy('boss',0,-1);e.speed=0;
 step(s,45,{auto:true});for(const key of ['carbine','flame'])assert.ok(s.player.magazines[key]<WEAPONS[key].magazine,key);
 s.equipWeapon('arc');assert.deepEqual(s.player.equipped,['carbine','arc']);s.equipWeapon('arc');assert.deepEqual(s.player.equipped,['carbine']);
});
test('fire spreads between touching enemies and into trees; electricity marks targets',()=>{
 const s=isolated(),tree=s.props.find(p=>p.kind==='planter');const a=s.spawnEnemy('brute',tree.x+1.4,tree.z),b=s.spawnEnemy('brute',tree.x+2.1,tree.z);a.burning=3;a.speed=b.speed=0;
 step(s,30);assert.ok(b.burning>0);assert.ok(tree.burning>0);const hp=tree.health;step(s,60);assert.ok(tree.health<hp);
 const arc=isolated();arc.switchWeapon('arc');const target=arc.spawnEnemy('brute',0,0);target.speed=0;step(arc,5,{auto:true});assert.ok(target.electrified>0);assert.ok(target.slow>0);
});
test('all named build synergies require their actual contributing upgrades',()=>{
 const s=isolated();for(const id of ['incendiary','frost','critical','piercing','regeneration','magnet','ordnance','blast'])UPGRADES.find(u=>u.id===id).apply(s.player);
 assert.deepEqual(synergies(s.player).map(s=>s.name),['THERMAL SHOCK','DEADSHOT','SECOND WIND','DEMOLITIONIST']);
 assert.equal(weaponSynergies(['flame','arc']).at(0).name,'PLASMA ARC');assert.equal(weaponSynergies(['shotgun','marksman']).at(0).name,'SHATTERSHOT');
});
test('each district has a boss with distinct mechanics and a reset environment',()=>{
 for(let district=0;district<4;district++){
  const s=isolated();s.wave=district*4+3;s.nextWave();assert.equal(s.district,district);const boss=s.enemies.find(e=>e.type==='boss');assert.ok(boss);s.bossAttack(boss);
  if(district===0)assert.ok(s.hazards.length);if(district===1)assert.ok(s.bullets.length>=10);if(district===2)assert.ok(s.enemies.length>=4);if(district===3)assert.ok(s.bullets.length&&s.hazards.length>=5);
 }
});
test('permanent progression affects a fresh run without leaking previous run state',()=>{
 const s=new Simulation({meta:{vitality:3,firepower:2,mobility:1,supply:2}});s.start();assert.equal(s.player.maxHealth,130);assert.equal(s.player.damage,1.1);assert.equal(s.player.grenades,5);assert.ok(s.player.speed>5.2);
 const clean=new Simulation();clean.start();assert.equal(clean.player.maxHealth,100);assert.equal(clean.player.grenades,3);
});
test('building colliders take ballistic damage, record impacts and can collapse',()=>{
 const s=isolated();s.setBuildings([{id:'building-test',x:0,z:-8,w:8,d:2}]);const building=s.props.find(p=>p.kind==='building');
 for(let i=0;i<1400;i++){s.update(1/60,{firing:true,auto:false,aim:{x:0,z:-8}});if(building.health<=0)break;}
 assert.ok(building.health<=0);assert.ok(s.events.some(e=>e.type==='prop-hit'&&e.id==='building-test'));assert.ok(s.events.some(e=>e.type==='destroy'&&e.id==='building-test'));assert.equal(s.blocked({x:0,z:0},{x:0,z:-12}),false);
});

test('hit and death events retain their renderer event names for every enemy type',()=>{
 const s=isolated();for(const type of ['walker','runner','brute','spitter','boss','volatile','armored']){
  const e=s.spawnEnemy(type,0,0);s.events=[];s.damageEnemy(e,99999);
  assert.ok(s.events.some(e=>e.type==='hit'&&e.enemyType===type),type+' impact');
  assert.ok(s.events.some(e=>e.type==='kill'&&e.enemyType===type),type+' gore');
 }
});

test('blast falloff uses the nearest facade and degradation precedes destruction',()=>{
 const s=isolated();s.setBuildings([{id:'wide',x:20,z:0,w:20,d:10}]);const b=s.props.find(p=>p.id==='wide');
 s.blast(9,0,4.3,180);assert.ok(b.health<b.maxHealth);assert.ok(b.health>0);assert.equal(b.damageStage,0);
 const impact=s.events.find(e=>e.type==='prop-hit'&&e.id==='wide');assert.equal(impact.x,10);assert.equal(impact.explosive,true);
 for(let i=0;i<5;i++)s.blast(9,0,4.3,180);assert.ok(b.health>0);assert.ok(b.damageStage>=1);assert.ok(s.events.some(e=>e.type==='building-stage'));
 s.damageProp(b,1e4);assert.ok(!s.obstacles.includes(b));
});
test('surviving limb injuries become live crawlers and kill variants retain their causes',()=>{
 const s=isolated(),e=s.spawnEnemy('brute',0,0),speed=e.speed;s.damageEnemy(e,80,0,0,{kind:'ballistic',part:'legs'});
 assert.equal(e.crawling,true);assert.ok(e.health>0);assert.ok(e.speed<speed);assert.equal(s.kills,0);
 const z=e.z;step(s,60);assert.ok(e.z>z);assert.ok(s.enemies.includes(e));
 for(const kind of ['explosion','electric','fire']){const target=s.spawnEnemy('walker',0,0);s.damageEnemy(target,999,0,0,{kind});assert.equal(s.events.findLast(e=>e.type==='kill').death,{explosion:'exploded',electric:'electrocuted',fire:'burned'}[kind]);}
 const head=s.spawnEnemy('walker',0,0);s.damageEnemy(head,999,0,0,{kind:'ballistic',headshot:true});assert.equal(s.events.findLast(e=>e.type==='kill').death,'headshot');
});
test('grenades respect the cursor even while auto fire tracks an enemy',()=>{
 const s=isolated();s.spawnEnemy('brute',0,0);s.update(1/60,{auto:true,grenade:true,aim:{x:7,z:3}});
 assert.equal(s.hazards[0].x,7);assert.equal(s.hazards[0].z,3);
});
