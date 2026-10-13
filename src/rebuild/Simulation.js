import {configureBoss,bossDamage,bossDefeated,bossContains,updateBoss as stepBoss,beginBossAttack} from './Bosses.js';
import {initRPG,rpgKill,interactPlace} from './RPG.js';
import {startCollapse,updateCollapse} from './Collapse.js';
import {igniteProp,splashWater,updateEnvironment} from './Environment.js';
import {rollUpgrades,rankOf,perkDamage} from './Upgrades.js';
import {resolveCritical} from './Combat.js';
import {addMastery,weaponTier,WEAPON_FINISHES} from './Evolution.js';
import {circleContact,boxNormal,reflectVelocity} from './Ballistics.js';
import {driveVehicle} from './Driving.js';
import {vehicleSpec} from './Vehicles.js';
import {meleeTiming} from './WeaponMotion.js';
import {makeStreetEvents,updateStreetEvents} from './StreetEvents.js';
import {normalizeLoadout,toggleLoadout,slotKey,isMelee} from './Loadout.js';
import {generateCity,waterAt} from './City.js';
import { generateMap, insideMap, segmentInMap } from './Map.js';
import { WEAPONS, weaponStats, ENEMIES, ARENA, COVER, UPGRADES, seededRandom, clamp, distance, segmentCircle, lineBlocked, pointBlocked, POWERUPS, magazineSize, PROP_HEALTH, segmentBoxTime, TOTAL_WAVES, DISTRICTS } from './config.js';

export class Simulation {
  constructor({ seed=73,difficulty='standard',meta={},layout=null,mode='campaign',skin='scout',profile=null }={}) {
    this.seed=seed;this.mode=mode;this.skin=skin;this.visited=new Set();this.layout=layout||(mode==='city'?generateCity(seed):generateMap(seed,0));this.streetEvents=makeStreetEvents(this.layout);this.meta=meta;this.district=0;this.random = seededRandom(seed); this.difficulty = difficulty; this.events = []; this.nextId = 1;
    this.state = 'menu'; this.enemies = []; this.bullets = []; this.pickups = []; this.hazards = [];this.fires=[];
    this.time = 0; this.wave = 0; this.kills = 0; this.score = 0; this.combo = 0; this.comboTimer = 0;
    this.player = this.makePlayer('carbine'); this.upgrades = []; this.upgradeOffers=[]; this.rerolls=2; this.extraction = 0; this.navigation = new Map(); this.props=this.layout.cover.map((o,i)=>({...o,id:`prop-${i}`,health:o.driveable?vehicleSpec(o).health:PROP_HEALTH[o.kind],maxHealth:o.driveable?vehicleSpec(o).health:PROP_HEALTH[o.kind]}));this.obstacles=this.props;this.geometryRevision=0;if(this.layout.city)this.setBuildings(this.layout.buildings);if(profile)initRPG(this,profile);
  }
  makePlayer(weapon) {
    return { skin:this.skin,vehicleId:null,swing:0,swingCombo:0,swingWeapon:null,x: 0, z: 3, angle: Math.PI, radius: .4, health: 100, maxHealth: 100, speed: 5.2, damage: 1,
      weapon, upgradeRanks:{}, ambushTime:0, mastery:{},shotCounts:{},swingCount:0, magazines: Object.fromEntries(Object.entries(WEAPONS).map(([k, v]) => [k, v.magazine])), reload: 0, reloadTotal: 0,
      fire: 0, invulnerable: 0, dash: 0, dashCooldown: 0, dashMax: 2.7, dashX: 0, dashZ: -1,
      melee: 0, grenades: 3, blast: 1, pickupRange: 1.35, lifeSteal: 0, reloadMultiplier: 1, fireMultiplier: 1, moving: false, resistance:0, regen:0, pierce:0, crit:0, magazineBonus:0, burn:0, frost:0, blastRadius:1, shield:0, overdrive:0, doubleScore:0, freeze:0,equipped:[weapon],weaponTimers:{},reloads:{},reloadDurations:{},shots:{},equippedAt:-99,moveX:0,moveZ:0,meleeAttack:null,meleeBuffer:null,attackHeld:false,throwAnimation:0,offhandRecoil:0,swapBoost:0,lastWeapon:null,lastWeaponTime:-100 };
  }
  emit(type, data = {}) { this.events.push({ ...data, type }); }
  start(weapon = 'carbine') { this.upgrades=[];this.upgradeOffers=[];this.rerolls=2;this.choices=[];this.player=this.makePlayer(weapon);const p=this.player;p.maxHealth+=10*(this.meta.vitality||0);p.health=p.maxHealth;p.damage+=.05*(this.meta.firepower||0);p.speed*=1+.04*(this.meta.mobility||0);p.grenades+=this.meta.supply||0;if(this.profile){initRPG(this,this.profile);p.health=p.maxHealth;}this.state = 'playing'; this.nextWave(); }
  pause() { if (['playing', 'extracting'].includes(this.state)) { this.previousState = this.state; this.state = 'paused'; } }
  resume() { if (this.state === 'paused') this.state = this.previousState; }
  nextWave() {
    this.wave++;this.state='playing';const p=this.player;p.shield=Math.max(p.shield,p.waveShield||0);if(this.wave>1)p.grenades+=p.waveGrenades||0;const vehicle=this.props.find(v=>v.id===p.vehicleId);if(vehicle)vehicle.health=Math.min(vehicle.maxHealth,vehicle.health+vehicle.maxHealth*(p.vehicleRepair||0));const district=Math.floor((this.wave-1)/4);
    if(district!==this.district&&!this.layout.city){this.district=district;this.player.x=0;this.player.z=3;this.layout=generateMap(this.seed,district);this.props=this.layout.cover.map((o,i)=>({...o,id:`prop-${i}`,health:o.driveable?vehicleSpec(o).health:PROP_HEALTH[o.kind],maxHealth:o.driveable?vehicleSpec(o).health:PROP_HEALTH[o.kind]}));this.obstacles=this.props;this.navigation.clear();this.pickups=[];this.fires=[];this.structures=[];this.rubblePiles=new Map();this.wetGround=[];this.emit('district',{district});}
    this.toSpawn=this.wave%4===0?Math.min(12,6+district*2):12+(this.wave-1)*3;
    this.spawnTimer=1;this.waveKills=0;this.waveTotal=this.toSpawn+(this.wave%4===0?1:0);
    if(this.layout.city)this.district=district;
    if(this.wave%4===0){const b=this.layout.city?this.layout.spawnPoints.filter(p=>distance(p,this.player)>15&&distance(p,this.player)<28).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]:null;const boss=this.spawnEnemy('boss',b?.x??0,b?.z??-13);if(district===6){const partner=this.spawnEnemy('boss',boss.x+7,boss.z+3);configureBoss(this,partner,{variant:3,name:'THE ASH CANTOR',height:6.4,radius:1.7,title:'REAPER & CANTOR / THE ASHEN COVENANT'});boss.duoId=partner.duoId=`covenant-${this.wave}`;for(const e of [boss,partner])e.health=e.maxHealth=e.maxHealth*.65;this.waveTotal++;}}
    this.emit('wave',{wave:this.wave,district:this.district});
  }
  spawnEnemy(type, x, z) {
    const base = ENEMIES[type]; const scale = this.difficulty === 'relaxed' ? .7 : this.difficulty === 'nightmare' ? 1.3 : 1;
    const health = base.health * (1 + (this.wave - 1) * .065) * scale;
    const e = { ...base, id: this.nextId++, type, x, z, health, maxHealth:health,angle:0,attack:1,bossKind:type==='boss'?DISTRICTS[this.district].bossKind:null,bossName:type==='boss'?DISTRICTS[this.district].boss:null,attackCount:0,
      windup: 0, flash: 0, knockX: 0, knockZ: 0, phase: this.random() * 8, damage: base.damage * scale, speed: base.speed * (this.difficulty === 'nightmare' ? 1.12 : 1) };
    if(type==='boss'){e.health=e.maxHealth=(1250+this.district*850)*scale;configureBoss(this,e);}this.enemies.push(e);return e;
  }
  spawn() {
    const r = this.random();
    let type = 'walker';
    if (this.wave >= 4 && r < .17) type = 'brute';
    else if (this.wave >= 3 && r < .34) type = 'spitter';
    else if (this.wave >= 2 && r < .61) type = 'runner';
    if(this.district>=2&&r>.87)type='volatile';else if(this.district===3&&r>.63)type='armored';else if(this.district===2&&r>.65)type='spitter';
    if(this.layout.spawnPoints?.length){const points=this.layout.spawnPoints.filter(p=>distance(p,this.player)>(this.layout.city?17:9)&&(!this.layout.city||distance(p,this.player)<34)&&!pointBlocked(p.x,p.z,1.1,this.obstacles));const options=points.length?points:this.layout.spawnPoints;const point=options[Math.floor(this.random()*options.length)];this.spawnEnemy(type,point.x,point.z);this.toSpawn--;return;}
    const edge = Math.floor(this.random() * 4);
    let x = edge < 2 ? (edge?27:-27) : this.random()*50-25;
    let z = edge >= 2 ? (edge===2?-20:20) : this.random()*36-18;
    if (distance({ x, z }, this.player) < 7) { x = -x; z = -z; }
    this.spawnEnemy(type, x, z); this.toSpawn--;
  }
  setBuildings(buildings){const previous=new Map(this.props.filter(p=>p.kind==='building').map(p=>[p.id,p]));this.props=this.props.filter(p=>p.kind!=='building').concat(buildings.map(b=>({...b,kind:'building',health:Math.max(1800,Math.round(b.w*b.d*(b.h||8)*1.5)),maxHealth:Math.max(1800,Math.round(b.w*b.d*(b.h||8)*1.5)),damageStage:0,...previous.get(b.id)})));this.obstacles=this.props.filter(p=>p.health>0);this.navigation.clear();}
  blocked(a,b,padding=0){return lineBlocked(a,b,padding,this.obstacles)||!!(this.layout.boundary&&!segmentInMap(this.layout,a,b,padding));}
  damageProp(prop,amount,impact=null){
    if(prop.health<=0)return;
    prop.health-=amount;this.emit('prop-hit',{id:prop.id,x:impact?.x??prop.x,z:impact?.z??prop.z,kind:prop.kind,material:prop.material,weapon:impact?.weapon,slicing:!!impact?.slicing,thermal:!!impact?.thermal,health:prop.health/(prop.maxHealth||1),amount,explosive:!!impact?.explosive,radius:impact?.radius||0});
    if(prop.kind==='building'&&prop.health>0){const stage=Math.min(3,Math.floor((1-Math.max(0,prop.health)/prop.maxHealth)*4));if(stage>(prop.damageStage||0)){prop.damageStage=stage;this.emit('building-stage',{id:prop.id,stage,material:prop.material,x:impact?.x??prop.x,z:impact?.z??prop.z});}}
    if(prop.health<=0){
      if(prop.kind==='building')startCollapse(this,prop);if(prop.kind==='rubble'&&prop.pileKey){const key=prop.pileKey;this.structures=(this.structures||[]).filter(c=>`${c.buildingId}:${Math.floor(c.x/2.4)}:${Math.floor(c.z/2.4)}`!==key);this.rubblePiles?.delete(key);}
      if(this.player.vehicleId===prop.id){this.player.vehicleId=null;this.player.radius=.4;this.player.invulnerable=.5;this.player.health=Math.max(1,this.player.health-30);this.emit('vehicle',{message:'VEHICLE LOST · GET CLEAR'});}this.emit('destroy',{...prop});if(!prop.sunk&&(prop.burning>0||['barrel','car'].includes(prop.kind)))this.addFire(prop.x,prop.z,prop.kind==='car'?2.5:1.5);this.obstacles=this.props.filter(o=>o.health>0);this.geometryRevision++;this.navigation.clear();
      if(!prop.sunk&&(prop.kind==='barrel'||prop.kind==='car'))this.hazards.push({id:this.nextId++,x:prop.x,z:prop.z,radius:prop.kind==='car'?4.5:3.6,timer:.45,duration:.45,friendly:true,environment:true,source:prop.kind,damage:prop.kind==='car'?230:180});
      if(prop.kind==='crate')this.pickups.push({id:this.nextId++,x:prop.x,z:prop.z,life:60,type:Object.keys(POWERUPS)[Math.floor(this.random()*8)]});
    }
  }
  move(body, dx, dz) {
    const r = body.radius,oldX=body.x,oldZ=body.z,bounds=this.layout.bounds||ARENA;
    body.x = clamp(body.x + dx, bounds.minX + r, bounds.maxX - r);
    for (const o of this.obstacles) if (o.id!==body.vehicleId&&o!==body&&(Math.abs(body.x - o.x) < o.w / 2 + r && Math.abs(body.z - o.z) < o.d / 2 + r))
      body.x = o.x + Math.sign(body.x - o.x || -dx || 1) * (o.w / 2 + r);
    if(!insideMap(this.layout,body.x,body.z,r))body.x=oldX;
    body.z = clamp(body.z + dz, bounds.minZ + r, bounds.maxZ - r);
    for (const o of this.obstacles) if (o.id!==body.vehicleId&&o!==body&&(Math.abs(body.x - o.x) < o.w / 2 + r && Math.abs(body.z - o.z) < o.d / 2 + r))
      body.z = o.z + Math.sign(body.z - o.z || -dz || 1) * (o.d / 2 + r);
    if(!insideMap(this.layout,body.x,body.z,r))body.z=oldZ;
  }
  setLoadout(keys){
    const p=this.player,next=normalizeLoadout(keys),changed=next.join('|')!==p.equipped.join('|');
    const hadTwin=p.equipped.length===2&&p.equipped[0]===p.equipped[1]&&p.equipped[0]===next[0];p.equipped=next;
    p.weapon=next[0];
    if(next.length===2&&next[0]===next[1]&&!hadTwin){p.magazines.offhand=magazineSize(p,next[1]);p.reloads.offhand=0;p.weaponTimers.offhand=WEAPONS[next[1]].interval*.5;}
    if(changed){p.equippedAt=this.time;p.meleeAttack=null;p.meleeBuffer=null;p.shots={};p.swing=0;p.swingWeapon=null;p.swingCombo=0;p.lastSwing=-99;p.dashCooldown=Math.min(p.dashCooldown,isMelee(p)?Math.min(1.1,1.1*p.dashMax/2.7):p.dashMax);this.emit('switch');}
    p.reload=p.reloads[p.weapon]||0;return changed;
  }
  equipWeapon(key){if(!WEAPONS[key])return false;return this.setLoadout(toggleLoadout(this.player.equipped,key));}
  switchWeapon(key){if(!WEAPONS[key])return;const p=this.player;if(p.equipped.includes(key)&&key!==p.equipped[0])this.setLoadout([key,p.equipped[0]]);if(!p.equipped.includes(key)){this.setLoadout(WEAPONS[key].melee||isMelee(p)?[key]:[key,...p.equipped.slice(1)]);}p.weapon=key;p.swing=0;p.swingWeapon=null;p.meleeAttack=null;p.meleeBuffer=null;p.reload=p.reloads[key]||0;p.fire=p.weaponTimers[key]||0;this.emit('switch');}
  reload(key=this.player.weapon,slot=key){const p=this.player,w=weaponStats(p,key);if(w.melee)return;if(!p.reloads[slot]&&p.magazines[slot]<magazineSize(p,key)){p.reloads[slot]=w.reload*p.reloadMultiplier;p.reloadDurations[slot]=p.reloads[slot];if(slot===p.weapon){p.reload=p.reloadTotal=p.reloads[slot];}this.emit('reload',{weapon:key,slot});}}
  damagePlayer(amount) {
    const p = this.player; if (p.invulnerable > 0 || !['playing', 'extracting'].includes(this.state)) return;
    if(p.vehicleId){const v=this.props.find(v=>v.id===p.vehicleId);if(v){this.damageProp(v,amount*.65);p.invulnerable=.4;return;}}
    amount *= 1 - Math.min(.8,Math.max(0,p.resistance)); const absorbed = Math.min(p.shield,amount); p.shield -= absorbed; amount -= absorbed;
    p.health = Math.max(0, p.health - amount); p.invulnerable = .75; this.combo = 0;
    this.emit('hurt', { amount, x: p.x, z: p.z });
    if (p.health === 0) { this.state = 'dead'; this.emit('dead'); }
  }
  damageEnemy(e, amount, dx = 0, dz = 0, impact = {}) {
    if (e.health <= 0 || !Number.isFinite(amount) || amount <= 0) return;
    impact={...impact,tier:impact.tier??weaponTier(this.player,impact.weapon)};const relic=this.player.rpgRelic;if(relic&&relic.base===impact.weapon&&relic.burn&&!impact.periodic&&!(e.wet>0)){e.burning=Math.max(e.burning||0,relic.burn);e.burnWeapon=impact.weapon;this.emit('ignite',{x:e.x,z:e.z});}
    amount*=perkDamage(this.player,e,impact);const crit=resolveCritical(this.player,impact,impact.weapon&&!impact.periodic&&!impact.execution?this.random():1);amount*=crit.multiplier;
    amount=bossDamage(this,e,amount);if(amount<=0)return;
    const dealt=Math.min(e.health,Math.max(0,amount));e.health -= amount; e.flash = .1;const mass=e.type==='boss'?5:e.type==='brute'?2.5:e.type==='armored'?1.8:1;e.knockX=clamp(e.knockX+dx/mass,-12,12);e.knockZ=clamp(e.knockZ+dz/mass,-12,12);if(impact.weapon)this.earnMastery(impact.weapon,dealt*(1+(this.player.masteryBonus||0)));
    if(e.health>0&&e.type!=='boss'&&amount>=18&&['ballistic','explosion','slice'].includes(impact.kind)){
      const cripple=impact.part==='legs'||(impact.kind==='slice'&&this.random()<.3)||(impact.kind==='explosion'&&amount>55&&this.random()<.65)||(e.health<e.maxHealth*.45&&this.random()<.16);
      if(cripple&&!e.crawling){e.crawling=true;e.speed*=.38;e.damage*=.7;e.radius=Math.min(e.radius,.4);this.emit('dismember',{id:e.id,x:e.x,z:e.z,part:'legs',angle:e.angle});}
      else if(!e.missingArm&&(impact.part==='arm'||(e.health<e.maxHealth*.6&&this.random()<.13))){e.missingArm=true;e.damage*=.7;this.emit('dismember',{id:e.id,x:e.x,z:e.z,part:'arm',angle:e.angle});}
    }
    this.emit('damage',{enemyId:e.id,x:e.x,z:e.z,enemyType:e.type,bossHeight:e.bossHeight,crawling:!!e.crawling,amount,dealt,health:Math.max(0,e.health),maxHealth:e.maxHealth,weapon:impact.weapon,kind:impact.kind,tier:impact.tier,critical:crit.critical,headshot:!!impact.headshot,finisher:!!impact.finisher,execution:!!impact.execution,periodic:!!impact.periodic,killed:e.health<=0});
    if(amount>=1)this.emit('hit' , { x:e.x,z:e.z,amount,enemyType:e.type,weapon:impact.weapon,tier:impact.tier||0,dx,dz,kind:impact.kind,crawling:!!e.crawling,headshot:!!impact.headshot });
    if (e.health <= 0) {
      bossDefeated(this,e);rpgKill(this,e);this.kills++; this.waveKills++; this.combo++; this.comboTimer = 3.5;
      this.score += Math.round(e.score * (1 + Math.min(4, Math.floor(this.combo / 5)) * .25) * (this.player.doubleScore>0?2:1));
      this.player.health = Math.min(this.player.maxHealth, this.player.health+this.player.lifeSteal*(this.player.regen>0?2:1));
      if(e.type==='volatile')this.hazards.push({id:this.nextId++,x:e.x,z:e.z,radius:2.4,timer:.7,duration:.7,friendly:false,damage:24});
      this.emit('kill', { x:e.x,z:e.z,enemyType:e.type,enemyId:e.id,bossKind:e.bossKind,bossProfile:e.bossProfile,bossHeight:e.bossHeight,angle:e.angle,slicePart:impact.part||['head','arm','legs'][Math.floor(this.random()*3)],variant:Math.floor(this.random()*6),fallSpeed:.65+this.random()*.8,twist:(this.random()-.5)*1.5,violent:amount>70,death:impact.kind==='slice'?'sliced':impact.headshot?'headshot':impact.kind==='explosion'?'exploded':impact.kind==='fire'||e.burning>0?'burned':impact.kind==='electric'?'electrocuted':'shot',crawling:!!e.crawling,missingArm:!!e.missingArm,dx,dz });
      if (this.kills % 4 === 0 || e.type === 'brute') { const types=Object.keys(POWERUPS); const type=this.player.health<45?'health':types[Math.floor(this.random()*types.length)];this.pickups.push({ id: this.nextId++, x:e.x,z:e.z,life:40,type }); }
    }
  }
  earnMastery(key,amount){for(const tier of addMastery(this.player,key,amount))this.emit('evolution',{weapon:key,tier,name:WEAPON_FINISHES[key].signature,x:this.player.x,z:this.player.z});}
  blast(x, z, radius, damage, kind = 'explosion', source = 'grenade', weapon=null, tier=0) {
    if(this.player.blast>1&&this.player.blastRadius>1&&kind==='explosion')damage*=1.25;
    const water=waterAt(this.layout,x,z);this.emit(kind, { x, z, radius,source,water,weapon,tier });if(water)this.splashWater(x,z,radius*2);
    for(const prop of this.props)if(prop.health>0){const hit={x:clamp(x,prop.x-prop.w/2,prop.x+prop.w/2),z:clamp(z,prop.z-prop.d/2,prop.z+prop.d/2)},d=distance(hit,{x,z});if(d<radius)this.damageProp(prop,damage*.85*(1-.4*d/radius),{...hit,explosive:kind==='explosion',radius});}
    for (const e of this.enemies) { const d = distance(e, { x, z }); if(d<radius+e.radius){e.exposed=3;this.damageEnemy(e, damage * (1 - .45 * d / (radius + e.radius)), (e.x - x) * 3, (e.z - z) * 3,{kind:kind==='explosion'?'explosion':'melee',weapon,tier});} }
  }
  chooseUpgrade(id) {
    if (this.state !== 'upgrade' || !this.choices.some(u => u.id === id)) return false;
    const u = UPGRADES.find(u => u.id === id),rank=rankOf(this.player,id)+1;if(rank>4)return false;u.apply(this.player,rank);this.player.upgradeRanks[id]=rank;if(id==='workshop')for(const key of new Set(this.player.equipped))this.earnMastery(key,Math.round(650*[1,1.2,1.4,1.7][rank-1]));this.upgrades.push(id);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 25); this.player.grenades++;
    for (const [key, w] of Object.entries(WEAPONS)) this.player.magazines[key] = magazineSize(this.player,key);
    if(this.player.equipped[0]===this.player.equipped[1])this.player.magazines.offhand=magazineSize(this.player,this.player.equipped[0]);
    this.player.reload=0;this.player.reloads={};this.player.weaponTimers={};this.player.invulnerable = 1.5; this.bullets = []; this.hazards = []; this.nextWave(); return true;
  }
  offerUpgrades(){this.choices=rollUpgrades(this.player,this.wave,this.random,this.upgradeOffers);this.upgradeOffers=this.choices.map(u=>u.id);this.emit('upgrade');}
  rerollUpgrades(){if(this.state!=='upgrade'||this.rerolls<=0)return false;this.rerolls--;this.offerUpgrades();return true;}
  update(dt, input = {}) {
    if (!['playing', 'extracting'].includes(this.state)) return;
    dt = clamp(dt, 0, .05); this.time += dt; const p = this.player;
    for (const key of ['ambushTime', 'fire', 'invulnerable', 'dashCooldown', 'melee','overdrive','doubleScore','freeze','swapBoost','swing','throwAnimation','offhandRecoil']) p[key] = Math.max(0, p[key] - dt);
    p.health = Math.min(p.maxHealth,p.health+p.regen*dt*(p.lifeSteal>0?2:1));
    this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0;
    for(const slot of [...Object.keys(WEAPONS),'offhand']){
      const key=slot==='offhand'?p.equipped[0]:slot;p.weaponTimers[slot]=Math.max(0,(p.weaponTimers[slot]||0)-dt);
      if(p.reloads[slot]>0){p.reloads[slot]=Math.max(0,p.reloads[slot]-dt);if(p.reloads[slot]===0){p.magazines[slot]=magazineSize(p,key);p.health=Math.min(p.maxHealth,p.health+(p.reloadHeal||0));this.emit('loaded',{weapon:key,slot});}}
    }
    p.reload=p.reloads[p.weapon]||0;p.reloadTotal=weaponStats(p).reload*p.reloadMultiplier;
    if (input.weapon) this.switchWeapon(input.weapon);
    if (input.reload) p.equipped.forEach((key,i)=>this.reload(key,slotKey(p.equipped,key,i)));
    let mx = input.x || 0, mz = input.z || 0, length = Math.hypot(mx, mz);
    if (length > 1) { mx /= length; mz /= length; }
    if(input.interact){if(!this.profile||!interactPlace(this))this.interactVehicle();if(this.state==='paused')return;}
    if (input.dash && !p.vehicleId&& p.dashCooldown === 0) {
      p.ambushTime=3;p.shield=Math.max(p.shield,p.dashShield||0);p.meleeAttack=null;p.meleeBuffer=null;p.swing=0;p.dash = isMelee(p)?.26:.2; p.invulnerable = Math.max(p.invulnerable, isMelee(p)?.4:.3); p.dashCooldown = isMelee(p)?Math.min(1.1,1.1*p.dashMax/2.7):p.dashMax;
      p.dashX = length > .1 ? mx / Math.hypot(mx, mz) : Math.sin(p.angle); p.dashZ = length > .1 ? mz / Math.hypot(mx, mz) : Math.cos(p.angle); this.emit('dash');
    }
    const beforeMove={x:p.x,z:p.z};
    p.moving = length > .1;
    if(p.vehicleId)this.drive(dt,mx,mz,input);
    else if (p.dash > 0) { p.dash -= dt; this.move(p, p.dashX * 22 * dt, p.dashZ * 22 * dt); }
    else{const stanceSpeed=isMelee(p)?1.22:1;this.move(p, mx * p.speed * stanceSpeed * dt, mz * p.speed * stanceSpeed * dt);}
    p.moveX=dt?(p.x-beforeMove.x)/dt:0;p.moveZ=dt?(p.z-beforeMove.z)/dt:0;p.moving=Math.hypot(p.moveX,p.moveZ)>.08;
    const w = weaponStats(p);
    const target = this.enemies.filter(e => e.health > 0 && distance(p, e) < w.range && !this.blocked(p, e)).sort((a, b) => distance(p, a) - distance(p, b))[0];
    let aim = input.aim;
    const manual=input.firing||input.fireHands?.some(Boolean);
    if (input.auto !== false && !manual) aim = target;
    if (aim&&!p.vehicleId) p.angle = Math.atan2(aim.x - p.x, aim.z - p.z);
    else if (length > .1&&!p.vehicleId) p.angle = Math.atan2(mx, mz);
    if(p.meleeAttack){
      const attack=p.meleeAttack,age=this.time-attack.started;
      if(age<attack.timing.cutEnd)p.angle=attack.angle;
      if(!attack.hit&&age>=attack.timing.contact){attack.hit=true;this.resolveSlice(attack);}
      if(age>=attack.timing.duration)p.meleeAttack=null;
    }
    const attackHeld=!!(input.melee||input.firing||input.fireHands?.some(Boolean));
    if(w.melee&&attackHeld&&!p.attackHeld&&p.weaponTimers[p.weapon]>0&&p.weaponTimers[p.weapon]<=.18){p.meleeBuffer={until:this.time+.2,aim:input.aim||aim};}
    p.attackHeld=attackHeld;
    if(w.melee&&p.meleeBuffer){const buffered=p.meleeBuffer;if(this.time>buffered.until||p.vehicleId)p.meleeBuffer=null;else if(!p.weaponTimers[p.weapon]&&p.dash<=0){p.meleeBuffer=null;this.slice(p.weapon,buffered.aim);}}
    for(const [i,key] of (p.vehicleId?[]:p.equipped).entries()){
      const slot=slotKey(p.equipped,key,i),gun=weaponStats(p,key);const gunTarget=key===p.weapon?target:this.enemies.filter(e=>e.health>0&&distance(p,e)<gun.range&&!this.blocked(p,e)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      const firing=input.fireHands?!!input.fireHands[i]||(gun.melee&&input.fireHands.some(Boolean)):input.firing;
      const gunAim=firing?input.aim:!manual&&input.auto!==false?gunTarget:null;
      if(gunAim&&((!manual&&input.auto!==false&&gunTarget)||firing)&&!p.weaponTimers[slot]&&!p.reloads[slot]&&p.dash<=0&&p.throwAnimation<=.12){
        if(!gun.melee&&p.magazines[slot]<=0)this.reload(key,slot);else this.fireWeapon(key,gunAim,slot,i);
      }
    }
    p.fire=p.weaponTimers[p.weapon]||0;p.reload=p.reloads[p.weapon]||0;
    if(input.melee&&!p.vehicleId&&p.melee<=0){const blade=p.equipped.find(k=>WEAPONS[k].melee);if(blade){if(!p.weaponTimers[blade])this.slice(blade,input.aim||aim);p.melee=.2;}}
    if (input.grenade && p.grenades > 0) {
      p.meleeAttack=null;p.meleeBuffer=null;p.swing=0;p.grenades--; const a = input.aim || aim || { x: p.x + Math.sin(p.angle) * 6, z: p.z + Math.cos(p.angle) * 6 };
      const d = distance(a, p), scale = Math.min(1, 10 / (d || 1));
      this.hazards.push({ id: this.nextId++, x: p.x + (a.x - p.x) * scale, z: p.z + (a.z - p.z) * scale, radius: 4.3*p.blastRadius, timer: .95, duration: .95, flight:.65, originX:p.x,originZ:p.z, thrown:true, friendly: true, damage: 180 * p.blast });p.throwAnimation=.5; this.emit('throw',{x:p.x,z:p.z});
    }
    if (this.state === 'playing' && this.toSpawn > 0 && !this.enemies.some(e=>e.type==='boss'&&e.bossState==='arrival')) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.spawn(); this.spawnTimer = Math.max(.38, 1.1 - this.wave * .1); }
    }
    if(this.layout.city){for(const e of this.enemies)if(distance(e,p)>75&&e.type!=='boss'&&!e.incidentId){e.health=0;this.toSpawn++;}for(const place of this.layout.landmarks)if(!this.visited.has(place.name)&&distance(place,p)<6){this.visited.add(place.name);p.grenades+=2;p.health=Math.min(p.maxHealth,p.health+25);this.score+=500;this.emit('discovery',{name:place.name});}}
    this.updateFire(dt);updateCollapse(this,dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    for (const h of this.hazards) {
      if(h.bossOwner){const owner=this.enemies.find(e=>e.id===h.bossOwner);if(!owner||owner.health<=0||owner.phasePending||owner.bossState==='transition'){h.done=true;continue;}}
      h.timer -= dt;
      if (h.timer <= 0 && !h.done) { h.done = true; if (h.friendly) { this.blast(h.x,h.z,h.radius,h.damage,'explosion',h.source||'grenade',h.weapon,h.tier||0);if(h.environment&&distance(p,h)<h.radius)this.damagePlayer(h.damage*.3); } else { if(!h.charge){this.emit('slam', h);if(h.bossOwner?bossContains(h,p):distance(p,h)<h.radius+p.radius)this.damagePlayer(h.damage);} } }
    }
    this.hazards = this.hazards.filter(h => !h.done);
    for (const item of this.pickups) {
      item.life -= dt;
      if ((item.type!=='health'||p.health<p.maxHealth) && distance(p,item)<p.pickupRange) { this.collect(item.type); item.life=0; }
    }
    this.pickups = this.pickups.filter(i => i.life > 0);
    updateStreetEvents(this,dt);
    this.enemies = this.enemies.filter(e => e.health > 0);
    if (this.state === 'playing' && this.toSpawn === 0 && this.enemies.length === 0) {
      this.bullets = []; this.hazards = [];
      if (this.wave === TOTAL_WAVES) { this.state = 'extracting'; this.emit('extraction'); }
      else { this.state = 'upgrade';if(this.wave%4===0)this.rerolls=Math.min(5,this.rerolls+1);this.offerUpgrades(); }
    }
    if (this.state === 'extracting') {
      if (distance(p, { x: 0, z: -10 }) < 3) this.extraction += dt; else this.extraction = Math.max(0, this.extraction - dt * .5);
      if (this.extraction >= 4) { this.state = 'victory'; this.score += 5000 + Math.round(p.health * 10); this.emit('victory'); }
    }
  }
  fireWeapon(key,aim,slot=key,hand=0){
    if(WEAPONS[key].melee){this.slice(key,aim);return;}
    const p=this.player,w=weaponStats(p,key),angle=Math.atan2(aim.x-p.x,aim.z-p.z),count=p.shotCounts[slot]=(p.shotCounts[slot]||0)+1;const variant=(count-1)%4;p.shots[slot]={time:this.time,weapon:key,hand,variant,tier:w.tier};p.magazines[slot]--;p.weaponTimers[slot]=w.interval*p.fireMultiplier*(p.overdrive>0?.5:1);
    if(hand)p.offhandRecoil=.12;const offset=(p.equipped.length>1?(hand?-.35:.35):.2);const originX=p.x+Math.cos(angle)*offset,originZ=p.z-Math.sin(angle)*offset;
    if(w.chain)this.arcAttack(aim,w,{x:originX+Math.sin(angle)*.85,z:originZ+Math.cos(angle)*.85});else for(let i=0;i<w.pellets;i++){
      const a=angle+(this.random()-.5)*w.spread*2,headshot=!['flame','launcher','arc'].includes(key)&&this.random()<(key==='marksman'?.32:key==='revolver'?.22:.07);
      this.bullets.push({id:this.nextId++,x:originX,z:originZ,vx:Math.sin(a)*w.speed,vz:Math.cos(a)*w.speed,life:w.range/w.speed,headshot,damage:w.damage*(headshot?1.65:1)*p.damage*(p.swapBoost>0?1.25:1),enemy:false,tier:w.tier,ricochets:w.ricochet||0,y:1.1,vy:key==='launcher'?3.8:0,gravity:key==='launcher'?8:0,terminal:key==='marksman'&&w.tier===3,cluster:key==='launcher'&&w.tier===3,pierce:(w.pierce||0)+p.pierce,hitIds:[],weapon:key,burn:(w.burn||0)+p.burn,frost:p.frost,explosive:(key==='revolver'&&w.tier===3&&count%4===0?1.6:w.explosive||0)*p.blastRadius});
    }
    this.emit('shoot',{x:originX,z:originZ,angle,weapon:key,hand,variant,tier:w.tier});
  }
  slice(key,aim){
    const p=this.player;if(!WEAPONS[key]?.melee||p.meleeAttack||p.vehicleId||p.dash>0||p.throwAnimation>0)return false;
    p.angle=aim?Math.atan2(aim.x-p.x,aim.z-p.z):p.angle;
    p.swingCombo=this.time-(p.lastSwing??-99)<1.3?(p.swingCombo+1)%3:0;p.lastSwing=this.time;
    p.swingVariant=(p.swingCount++)%4;const timing=meleeTiming(key,p.swingCombo,p.fireMultiplier*(1-weaponTier(p,key)*.04));
    p.swingDuration=timing.duration;p.swing=timing.duration;p.swingWeapon=key;p.weaponTimers[key]=timing.duration;
    p.meleeAttack={weapon:key,combo:p.swingCombo,variant:p.swingVariant,tier:weaponTier(p,key),angle:p.angle,started:this.time,timing,hit:false};
    this.emit('swing',{weapon:key,combo:p.swingCombo,variant:p.swingVariant,tier:weaponTier(p,key)});return true;
  }
  resolveSlice(attack){
    const p=this.player,key=attack.weapon,w=weaponStats(p,key),finisher=attack.combo===2;
    const range=w.range*p.blastRadius*(finisher?1.2:1),damage=w.damage*p.damage*(finisher?1.6:1),angle=attack.angle;
    const inArc=(x,z)=>Math.abs(Math.atan2(Math.sin(Math.atan2(x-p.x,z-p.z)-angle),Math.cos(Math.atan2(x-p.x,z-p.z)-angle)))<(finisher?1.8:1.15);
    let hits=0;
    for(const e of this.enemies)if(e.health>0&&distance(e,p)<range+e.radius&&inArc(e.x,e.z)&&!this.blocked(p,e,.05)){this.damageEnemy(e,damage,Math.sin(angle)*4,Math.cos(angle)*4,{kind:'slice',weapon:key,tier:w.tier,finisher,part:finisher?'legs':key==='dual'?'arm':null});hits++;}
    if(finisher&&hits>0)p.health=Math.min(p.maxHealth,p.health+(p.finisherHeal||0));
    for(const o of this.props)if(o.health>0){const x=clamp(p.x,o.x-o.w/2,o.x+o.w/2),z=clamp(p.z,o.z-o.d/2,o.z+o.d/2);if(Math.hypot(x-p.x,z-p.z)<range&&inArc(x,z)){this.damageProp(o,damage*(['crate','planter'].includes(o.kind)?2:.3),{x,z,slicing:true});hits++;}}
    if(finisher){p.dashCooldown=Math.max(0,p.dashCooldown-.45);p.invulnerable=Math.max(p.invulnerable,.12);}
    if(finisher&&w.tier===3){for(const e of this.enemies)if(e.health>0&&distance(e,p)>=range+e.radius&&distance(e,p)<range+2.6&&inArc(e.x,e.z)&&!this.blocked(p,e))this.damageEnemy(e,damage*.55,Math.sin(angle)*6,Math.cos(angle)*6,{kind:'slice',weapon:key,tier:3,finisher:true});this.emit('cut-wave',{x:p.x,z:p.z,angle,weapon:key,radius:range+2.6});}
    this.emit('slice',{x:p.x,z:p.z,angle,weapon:key,combo:attack.combo,variant:attack.variant,tier:w.tier,radius:range,hits});
  }
  interactVehicle(){
    const p=this.player;
    if(p.vehicleId){const v=this.props.find(v=>v.id===p.vehicleId);if(!v)return false;if(Math.abs(v.speed||0)>1.5){this.emit('vehicle',{message:'BRAKE TO EXIT'});return false;}for(let i=0;i<12;i++){const a=v.angle+Math.PI/2+i*Math.PI/6,x=v.x+Math.sin(a)*3.4,z=v.z+Math.cos(a)*3.4;if(insideMap(this.layout,x,z,.5)&&!pointBlocked(x,z,.5,this.obstacles)){p.vehicleId=null;p.radius=.4;p.x=x;p.z=z;v.speed=0;v.vx=v.vz=0;this.emit('vehicle',{message:'ON FOOT'});return true;}}this.emit('vehicle',{message:'EXIT BLOCKED · MOVE TO CLEAR GROUND'});return false;}
    const v=this.props.filter(v=>v.driveable&&v.health>0&&distance(v,p)<5).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!v)return false;
    p.meleeAttack=null;p.meleeBuffer=null;p.swing=0;p.vehicleId=v.id;p.radius=1.25;v.angle=v.angle??0;v.speed=0;v.vx=v.vz=0;v.reverseHold=0;p.x=v.x;p.z=v.z;this.emit('vehicle',{message:`${v.vehicleName} · DRIVING CONTROLS ON HUD`});return true;
  }
  drive(dt,mx,mz,input){driveVehicle(this,dt,mx,mz,input);}
  collect(type) {
    const p=this.player;p.health=Math.min(p.maxHealth,p.health+(p.supplyHeal||0));
    if(type==='health')p.health=Math.min(p.maxHealth,p.health+30);
    if(type==='shield')p.shield=Math.min(120,p.shield+60);
    if(type==='overdrive')p.overdrive=12;
    if(type==='freeze')p.freeze=8;
    if(type==='double')p.doubleScore=15;
    if(type==='grenade')p.grenades+=2;
    if(type==='ammo'){for(const key of Object.keys(WEAPONS))p.magazines[key]=magazineSize(p,key);if(p.equipped[0]===p.equipped[1])p.magazines.offhand=magazineSize(p,p.equipped[0]);p.reload=0;p.reloads={};}
    if(type==='nova')this.blast(p.x,p.z,10,300,'explosion');
    this.emit('powerup',{powerup:type,...POWERUPS[type]});
  }
  arcAttack(aim,w,origin=this.player) {
    const p=this.player;let from=origin;
    let target=this.enemies.filter(e=>e.health>0&&distance(p,e)<w.range&&!this.blocked(p,e)).sort((a,b)=>distance(a,aim)-distance(b,aim))[0];
    const visited=new Set();
    for(let i=0;target&&i<=w.chain;i++){
      visited.add(target.id);this.emit('arc',{x:from.x,z:from.z,toX:target.x,toZ:target.z,weapon:'arc',tier:w.tier});
      if(target.burning>0)this.emit('combo',{name:'PLASMA ARC',description:'Fire + electricity: +40% arc damage'});
      this.damageEnemy(target,w.damage*p.damage*Math.pow(.83,i)*(target.burning>0?1.4:1)*(p.swapBoost>0?1.25:1),0,0,{kind:'electric',weapon:'arc',tier:w.tier});target.slow=Math.max(target.slow||0,.6);target.electrified=.8;this.emit('electrify',{x:target.x,z:target.z});if(p.burn&&!(target.wet>0)){target.burning=p.burn;target.burnWeapon='arc';}
      from=target;target=this.enemies.filter(e=>e.health>0&&!visited.has(e.id)&&distance(from,e)<4.5&&!this.blocked(from,e)).sort((a,b)=>distance(from,a)-distance(from,b))[0];
    }
  }
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.health <= 0) continue;
      e.electrified=Math.max(0,(e.electrified||0)-dt);e.exposed=Math.max(0,(e.exposed||0)-dt);e.shockCooldown=Math.max(0,(e.shockCooldown||0)-dt);
      e.flash = Math.max(0, e.flash - dt); e.attack -= dt; e.slow=Math.max(0,(e.slow||0)-dt);
      if(e.burning>0){
        e.burning-=dt;this.damageEnemy(e,18*dt,0,0,{kind:'fire',weapon:e.burnWeapon,periodic:true});if(e.health<=0)continue;
        e.spreadTimer=(e.spreadTimer||0)-dt;
        if(e.spreadTimer<=0){e.spreadTimer=.4;
          for(const other of this.enemies)if(other!==e&&other.health>0&&!(other.wet>0)&&distance(e,other)<e.radius+other.radius+.5&&!(other.burning>1.5)){other.burning=2.8;other.burnWeapon=e.burnWeapon;this.emit('ignite',{x:other.x,z:other.z});}
          for(const prop of this.obstacles)if(!['rock','barrier'].includes(prop.kind)&&distance(e,prop)<e.radius+Math.max(prop.w,prop.d)/2+.4){this.igniteProp(prop,e.x,e.z,.9,4);}
        }
      }
      if(e.type==='boss'&&this.updateBoss(e,dt))continue;
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || .01; e.angle = Math.atan2(dx, dz);
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (e.type === 'spitter') {
            const angle = Math.atan2(e.targetZ - e.z, e.targetX - e.x);
            this.bullets.push({ id: this.nextId++, x: e.x, z: e.z, vx: Math.cos(angle) * 8, vz: Math.sin(angle) * 8, life: 2.5, damage: e.damage, enemy: true }); this.emit('spit');
          } else if(e.type==='boss'){this.bossAttack(e);} else if (d < e.radius + p.radius + .7) this.damagePlayer(e.damage);
        }
      } else if (e.attack <= 0 && ((e.type === 'spitter' && d < 13 && !this.blocked(e, p)) || (e.type === 'boss' && d < 9) || d < e.radius + p.radius + .5)) {
        e.windup=e.type==='boss'?1:e.type==='runner'?.3:.55;e.attack=e.type==='boss'? (e.health<e.maxHealth*.5?2.8:3.8) : e.type === 'spitter' ? 2.6 : 1.5; e.targetX = p.x; e.targetZ = p.z;
      } else {
        let nx = dx / d, nz = dz / d;
        const shouldMove = e.type !== 'spitter' || d > 8 || this.blocked(e, p);
        if (shouldMove && d > e.radius + p.radius) {
          if (this.blocked(e, p, e.radius + .08)) {
            const waypoint = this.navigate(e);
            if (waypoint) { const len = distance(e, waypoint) || 1; nx = (waypoint.x-e.x)/len; nz = (waypoint.z-e.z)/len; }
          }
          const slow=p.freeze>0?.25:e.slow>0?.55:1;this.move(e, nx * e.speed * dt * slow, nz * e.speed * dt * slow);
        }
      }
      if (Math.abs(e.knockX) + Math.abs(e.knockZ) > .1) { this.move(e, e.knockX * dt, e.knockZ * dt); e.knockX *= Math.exp(-9*dt); e.knockZ *= Math.exp(-9*dt); }
    }
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j], d = distance(a,b) || .01, gap = a.radius + b.radius;
      if (d < gap) { const push = (gap - d) * .5, x = (a.x-b.x)/d*push, z=(a.z-b.z)/d*push; this.move(a,x,z); this.move(b,-x,-z); }
    }
  }
  addFire(x,z,radius=1.6){
    if(waterAt(this.layout,x,z)||(this.wetGround||[]).some(w=>distance(w,{x,z})<w.radius))return;
    if(this.fires.some(f=>distance(f,{x,z})<radius))return;
    const fire={id:this.nextId++,x,z,radius,life:7};this.fires.push(fire);if(this.fires.length>24)this.fires.shift();this.emit('ignite',{x,z,radius});
  }
  igniteProp(p,x=p.x,z=p.z,y=.9,seconds=4){return igniteProp(this,p,x,z,y,seconds);}
  splashWater(x,z,power=1){return splashWater(this,x,z,power);}
  updateFire(dt){updateEnvironment(this,dt);}
  updateBoss(e,dt){return stepBoss(this,e,dt);}
  bossAttack(e){return beginBossAttack(this,e);}
  navigate(e, target = this.player) {
    // Shared breadth-first flow fields eliminate corner oscillation around cover.
    const bounds=this.layout.bounds||ARENA,step=this.layout.city?2:1,cols=Math.ceil((bounds.maxX-bounds.minX)/step),rows=Math.ceil((bounds.maxZ-bounds.minZ)/step),radius=e.radius+.12,key=String(e.radius);
    const px=clamp(Math.floor((target.x-bounds.minX)/step),0,cols-1), pz=clamp(Math.floor((target.z-bounds.minZ)/step),0,rows-1);
    let nav=this.navigation.get(key);
    if(!nav || (nav.target!==pz*cols+px&&(!this.layout.city||this.time-nav.time>.3))){
      const blocked=nav?.blocked || Uint8Array.from({length:cols*rows},(_,i)=>!insideMap(this.layout,(i%cols+.5)*step+bounds.minX,(Math.floor(i/cols)+.5)*step+bounds.minZ,radius)||pointBlocked((i%cols+.5)*step+bounds.minX,(Math.floor(i/cols)+.5)*step+bounds.minZ,radius,this.obstacles)?1:0);
      const costs=new Int16Array(cols*rows).fill(32767);let start=pz*cols+px;
      if(blocked[start]){let best=Infinity;for(let i=0;i<costs.length;i++)if(!blocked[i]){const d=Math.hypot(i%cols-px,Math.floor(i/cols)-pz);if(d<best){best=d;start=i;}}}
      const queue=[start];costs[start]=0;
      for(let q=0;q<queue.length;q++){const index=queue[q],x=index%cols,z=Math.floor(index/cols);
        for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+dx,zz=z+dz,n=zz*cols+xx;if(xx<0||xx>=cols||zz<0||zz>=rows||blocked[n]||costs[n]!==32767)continue;if(dx&&dz&&(blocked[z*cols+xx]||blocked[zz*cols+x]))continue;costs[n]=costs[index]+1;queue.push(n);}
      }
      nav={target:pz*cols+px,blocked,costs,time:this.time};this.navigation.set(key,nav);
    }
    const ex=clamp(Math.floor((e.x-bounds.minX)/step),0,cols-1),ez=clamp(Math.floor((e.z-bounds.minZ)/step),0,rows-1);
    let best=null,score=Infinity;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const x=ex+dx,z=ez+dz;if(x<0||x>=cols||z<0||z>=rows)continue;const i=z*cols+x,point={x:(x+.5)*step+bounds.minX,z:(z+.5)*step+bounds.minZ};
      if(nav.blocked[i]||this.blocked(e,point,e.radius+.04))continue;
      const rank=nav.costs[i]+distance(e,point)*(.4/step);
      if(rank<score&&distance(e,point)>.08){score=rank;best=point;}
    }
    return best;
  }
  detonateBullet(b){
    if(b.detonated)return;b.detonated=true;b.life=0;
    this.blast(b.x,b.z,b.explosive||1.6,b.damage*(b.terminal?.35:1),'explosion',b.weapon,b.weapon,b.tier||0);
    if(b.cluster&&!waterAt(this.layout,b.x,b.z))for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.hazards.push({id:this.nextId++,x:b.x+Math.sin(a)*1.7,z:b.z+Math.cos(a)*1.7,radius:1.5,timer:.2+i*.12,duration:.5,friendly:true,damage:b.damage*.25,source:'cluster',weapon:b.weapon,tier:b.tier});}
  }
  updateBullets(dt) {
    for(const b of this.bullets){
      if(b.life<=0)continue;const travel=Math.min(dt,b.life),a={x:b.x,z:b.z},end={x:b.x+b.vx*travel,z:b.z+b.vz*travel};b.life-=travel;
      b.y??=b.enemy?.9:1.1;b.vy??=0;const oldY=b.y;b.y+=b.vy*travel-(b.gravity||0)*travel*travel*.5;b.vy-=(b.gravity||0)*travel;
      const contacts=this.obstacles.filter(o=>o.health>0).map(o=>({kind:'prop',o,t:segmentBoxTime(a,end,o)})).filter(c=>c.t!==null);
      if(b.enemy){const t=circleContact(a,end,this.player,.55);if(t!==null)contacts.push({kind:'player',t});}
      else for(const e of this.enemies)if(e.health>0&&!b.hitIds.includes(e.id)){const t=circleContact(a,end,e,e.radius+(b.weapon==='flame'?.35:.14));if(t!==null)contacts.push({kind:'enemy',o:e,t});}
      const samples=Math.max(1,Math.ceil(Math.hypot(end.x-a.x,end.z-a.z)/.25));for(let i=0;i<=samples;i++){const t=i/samples;if(waterAt(this.layout,a.x+(end.x-a.x)*t,a.z+(end.z-a.z)*t)){contacts.push({kind:'water',t});break;}}
      if(b.gravity&&b.y<=.08)contacts.push({kind:'ground',t:clamp((oldY-.08)/(oldY-b.y||1),0,1)});
      contacts.sort((a,b)=>a.t-b.t);let stopped=false;
      for(const c of contacts){
        if(c.o?.health<=0)continue;b.x=a.x+(end.x-a.x)*c.t;b.z=a.z+(end.z-a.z)*c.t;
        if(c.kind==='water'){if(b.explosive)this.detonateBullet(b);else this.splashWater(b.x,b.z,.45);b.life=0;stopped=true;break;}
        if(c.kind==='ground'){if(b.explosive||b.terminal)this.detonateBullet(b);b.life=0;stopped=true;break;}
        if(c.kind==='player'){this.damagePlayer(b.damage);b.life=0;stopped=true;break;}
        if(c.kind==='prop'){
          const o=c.o,n=boxNormal(b,o);this.damageProp(o,b.damage,{x:b.x,z:b.z,weapon:b.weapon});
          if(b.burn)this.igniteProp(o,b.x,b.z,b.y||.9,b.burn+2);
          this.emit('impact',{x:b.x,z:b.z,y:Math.max(.2,b.y),normal:n,weapon:b.weapon,tier:b.tier||0,kind:o.kind,material:o.material,dx:b.vx,dz:b.vz});
          if(b.explosive||b.terminal)this.detonateBullet(b);
          else if(b.ricochets>0&&['barrier','car','rock','building'].includes(o.kind)&&Math.abs((b.vx*n.x+b.vz*n.z)/(Math.hypot(b.vx,b.vz)||1))<.7){Object.assign(b,reflectVelocity(b,n));b.damage*=.65;b.ricochets--;b.x+=n.x*.06;b.z+=n.z*.06;this.emit('ricochet',{x:b.x,z:b.z,weapon:b.weapon,tier:b.tier,dx:b.vx,dz:b.vz});stopped=true;break;}
          else b.life=0;stopped=true;break;
        }
        const e=c.o;b.hitIds.push(e.id);
        if(b.explosive){this.detonateBullet(b);stopped=true;break;}
        let damage=b.damage;const p=this.player,execution=p.crit>0&&p.pierce>0&&e.type!=='boss'&&e.health/e.maxHealth<.2;
        if(execution)damage=Math.max(damage,e.health+1);
        if(e.lastHitWeapon&&e.lastHitWeapon!==b.weapon&&this.time-(e.lastHitAt||0)<3){
          if(b.weapon==='marksman'&&e.lastHitWeapon==='shotgun'){damage*=1.5;this.emit('combo',{name:'SHATTERSHOT',description:'Shotgun + piercing rifle: +50% damage'});}
          if((b.weapon==='revolver'&&e.lastHitWeapon==='carbine')||(b.weapon==='carbine'&&e.lastHitWeapon==='revolver')){damage*=1.3;p.swapBoost=3;this.emit('combo',{name:'DOUBLE TAP',description:'Carbine + revolver: +30% crossfire damage'});}
        }
        if(b.weapon==='smg'&&e.exposed>0){damage*=1.35;this.emit('combo',{name:'BREACH & CLEAR',description:'Explosive + SMG: +35% damage'});}e.lastHitWeapon=b.weapon;e.lastHitAt=this.time;
        const impulse=b.weapon==='shotgun'?.055:b.weapon==='revolver'?.075:b.weapon==='marksman'?.05:.025;
        this.damageEnemy(e,damage,b.vx*impulse,b.vz*impulse,{kind:b.weapon==='flame'?'fire':'ballistic',weapon:b.weapon,tier:b.tier,headshot:b.headshot,execution});
        if(b.burn&&!(e.wet>0)){e.burning=b.burn;e.burnWeapon=b.weapon;}if(b.frost)e.slow=b.frost;
        if(b.weapon==='flame'&&b.tier===3&&this.time>(p.poolAfter||0)){p.poolAfter=this.time+.6;this.addFire(e.x,e.z,1.2);}
        if(p.frost>0&&e.burning>0&&e.slow>0&&!e.shockCooldown){e.shockCooldown=2;this.blast(e.x,e.z,2.2,45*p.damage,'explosion','thermal',b.weapon,b.tier);this.emit('combo',{name:'THERMAL SHOCK',description:'Fire + frost detonation'});}
        if(b.pierce>0){b.pierce--;b.damage*=.86;}
        else{if(b.terminal)this.detonateBullet(b);b.life=0;stopped=true;break;}
      }
      if(!stopped){b.x=end.x;b.z=end.z;}if(b.life<=0&&(b.explosive||b.terminal)&&!b.detonated)this.detonateBullet(b);
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
  }
}
