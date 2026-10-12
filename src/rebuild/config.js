import {evolutionStats,weaponTier} from './Evolution.js';
export const WEAPONS = {
  carbine: { name: 'AR-26', label: 'ASSAULT CARBINE', damage: 25, interval: .17, magazine: 24, reload: 1.45, range: 20, pellets: 1, spread: .018, speed: 48 },
  shotgun: { name: 'M12', label: 'BREACH SHOTGUN', damage: 18, interval: .72, magazine: 7, reload: 1.85, range: 13, pellets: 6, spread: .23, speed: 42 },
  smg: { name: 'VX-9', label: 'COMPACT SMG', damage: 13, interval: .075, magazine: 40, reload: 1.3, range: 16, pellets: 1, spread: .065, speed: 50 },
};
Object.assign(WEAPONS, {
  revolver: { name:'JUDGEMENT', label:'HEAVY REVOLVER', description:'Six decisive shots. High damage and a fast draw.', damage:95, interval:.48, magazine:6, reload:1.5, range:21, pellets:1, spread:.009, speed:65 },
  marksman: { name:'LONGSHOT', label:'PIERCING RIFLE', description:'Long-range rounds punch through three enemies.', damage:125, interval:.85, magazine:8, reload:2.1, range:30, pellets:1, spread:0, speed:80, pierce:2 },
  flame: { name:'CINDER', label:'FLAMETHROWER', description:'A short cone of fire. Burning targets take lingering damage.', damage:9, interval:.065, magazine:90, reload:2.3, range:7, pellets:2, spread:.24, speed:15, pierce:5, burn:3 },
  launcher: { name:'THUMPER', label:'GRENADE LAUNCHER', description:'Explosive rounds break tightly packed hordes.', damage:110, interval:1.05, magazine:4, reload:2.4, range:20, pellets:1, spread:.025, speed:17, explosive:3 },
  arc: { name:'VOLTA', label:'ARC PROJECTOR', description:'Electric bolts jump between up to four nearby targets.', damage:43, interval:.48, magazine:16, reload:1.8, range:14, pellets:1, spread:0, speed:70, chain:3 },
});
Object.assign(WEAPONS,{
 katana:{name:'RONIN',label:'KATANA',description:'Three-hit cuts with a heavy finishing sweep. Slices limbs, timber and glass.',damage:95,interval:.6,magazine:1,reload:0,range:3.3,pellets:0,spread:0,speed:0,melee:true},
 dual:{name:'GEMINI',label:'TWIN SWORDS',description:'Fast ninja footwork and alternating cuts. Finish the combo to recover your dodge.',damage:52,interval:.32,magazine:1,reload:0,range:2.7,pellets:0,spread:0,speed:0,melee:true}
});
export const SKINS=[
 {id:'scout',name:'THE SCOUT',description:'Field jacket · patrol cap',coat:0x7b7954,skin:0xc39b77,hat:0x354b4c},
 {id:'medic',name:'THE MEDIC',description:'Ivory rescue jacket · red beret',coat:0xd0c9b3,skin:0x805b43,hat:0x963e35},
 {id:'biker',name:'THE RIDER',description:'Black leather · copper helmet',coat:0x30393c,skin:0xb48261,hat:0x9d6542},
 {id:'ronin',name:'THE RONIN',description:'Indigo coat · crimson headband',coat:0x46566d,skin:0xc39d7a,hat:0x8b3932}
];
WEAPONS.carbine.description='Precise, dependable fire at medium range.';
WEAPONS.shotgun.description='Six-pellet spread. Devastating up close.';
WEAPONS.smg.description='High fire rate, large magazine, wide spread.';
export const POWERUPS = {
  health:{name:'FIELD DRESSING',description:'+30 health',color:0xb5d3a8},
  overdrive:{name:'OVERDRIVE',description:'Double fire rate for 12 seconds',color:0xffb45d},
  shield:{name:'RIOT ARMOUR',description:'Absorb 60 damage',color:0x8dbace},
  freeze:{name:'COLD FRONT',description:'Slow the horde for 8 seconds',color:0xa7d9db},
  ammo:{name:'AMMO CACHE',description:'Instantly refill every weapon',color:0xd2c599},
  grenade:{name:'ORDNANCE',description:'+2 grenades',color:0xd6a276},
  double:{name:'BOUNTY',description:'Double score for 15 seconds',color:0xdbc67a},
  nova:{name:'SHOCKWAVE',description:'Blast every enemy nearby',color:0xcea077},
};
export const ENEMIES = {
  walker: { health: 60, speed: 1.5, damage: 12, radius: .43, score: 100 },
  runner: { health: 40, speed: 3.25, damage: 9, radius: .35, score: 140 },
  brute: { health: 280, speed: 1.12, damage: 24, radius: .75, score: 350 },
  spitter: { health: 95, speed: 1.3, damage: 14, radius: .43, score: 220 },
  boss: { health: 1950, speed: 1.2, damage: 30, radius: 1.1, score: 2500 },
};
export const WAVE_NAMES = ['THE FIRST SIGNS', 'FAST COMPANY', 'BAD BLOOD', 'HEAVY FOOTSTEPS', 'NO WAY BACK', 'THE LAST BAGARRE'];
export const UPGRADES = [
  { id: 'damage', title: 'Hollow points', tag: 'FIREPOWER', description: '+25% weapon damage.', apply: p => p.damage += .25 },
  { id: 'speed', title: 'Light on your feet', tag: 'MOBILITY', description: '+15% movement speed. Dodge recovers 15% faster.', apply: p => { p.speed *= 1.15; p.dashMax *= .85; } },
  { id: 'health', title: 'Second skin', tag: 'SURVIVAL', description: '+30 maximum health. Fully recover.', apply: p => { p.maxHealth += 30; p.health = p.maxHealth; } },
  { id: 'reload', title: 'Sleight of hand', tag: 'HANDLING', description: 'Reload 25% faster. Fire 12% faster.', apply: p => { p.reloadMultiplier *= .75; p.fireMultiplier *= .88; } },
  { id: 'magnet', title: 'Field medic', tag: 'RECOVERY', description: 'Pick up supplies from further away. Heal 2 HP per kill.', apply: p => { p.pickupRange += 1.8; p.lifeSteal += 2; } },
  { id: 'ordnance', title: 'More bang', tag: 'ORDNANCE', description: '+2 grenades. Explosions deal 40% more damage.', apply: p => { p.grenades += 2; p.blast *= 1.4; } },
];
UPGRADES.push(
  {id:'workshop',title:'Field armorer',tag:'EVOLUTION',description:'+650 mastery to each equipped weapon type. Reach new tiers to transform its hardware and attacks.',apply:()=>{}},
  {id:'armour',title:'Ballistic weave',tag:'DEFENCE',description:'Take 15% less damage. Stacks up to 60%.',apply:p=>p.resistance=Math.min(.6,p.resistance+.15)},
  {id:'regeneration',title:'Keep breathing',tag:'RECOVERY',description:'Recover 1 health every second.',apply:p=>p.regen+=1},
  {id:'piercing',title:'Through and through',tag:'BALLISTICS',description:'Every projectile pierces one extra enemy.',apply:p=>p.pierce+=1},
  {id:'critical',title:'Deadeye',tag:'PRECISION',description:'+20% chance to deal double damage.',apply:p=>p.crit=Math.min(.8,p.crit+.2)},
  {id:'magazine',title:'Extended magazines',tag:'CAPACITY',description:'+30% magazine capacity for every weapon.',apply:p=>p.magazineBonus+=.3},
  {id:'incendiary',title:'Dragon’s breath',tag:'INCENDIARY',description:'Every shot burns enemies for 2 seconds.',apply:p=>p.burn+=2},
  {id:'frost',title:'Cold shoulder',tag:'CONTROL',description:'Shots slow enemies by 45% for 2 seconds.',apply:p=>p.frost=2},
  {id:'blast',title:'Wide destruction',tag:'AREA CONTROL',description:'+30% explosion and melee radius.',apply:p=>p.blastRadius*=1.3},
);
export const weaponStats=(player,key=player.weapon)=>evolutionStats(WEAPONS[key],key,weaponTier(player,key));
export const magazineSize = (player, key = player.weapon) => Math.round(weaponStats(player,key).magazine * (1 + player.magazineBonus));
// Planar x/z geometry. Kept independent of the renderer for deterministic collision tests.
export const ARENA = { minX:-28,maxX:28,minZ:-21,maxZ:21 };
export const COVER = [
  { x: -9, z: -5, w: 4.3, d: 2, kind: 'car', rotation: 0, color: 0x536f69 },
  { x: 10, z: 5, w: 2, d: 4.3, kind: 'car', rotation: Math.PI / 2, color: 0x9b684e },
  { x: 12, z: -9, w: 4, d: 1.1, kind: 'barrier' },
  { x: -11, z: 9, w: 4, d: 1.1, kind: 'barrier' },
  { x: -2, z: -10, w: 2, d: 2, kind: 'planter' },
  { x: 2, z: 9, w: 2, d: 2, kind: 'planter' },
  { x: -16, z: 1, w: 1.5, d: 2.6, kind: 'crate' },
  { x: 16, z: -1, w: 1.5, d: 2.6, kind: 'crate' },
];
COVER.push(
  {x:5.3,z:-6,w:.9,d:.9,kind:'barrel'},
  {x:10.7,z:-6,w:.9,d:.9,kind:'barrel'},
  {x:-8.5,z:7,w:.9,d:.9,kind:'barrel'},
  {x:25,z:12,w:1.5,d:2.6,kind:'crate'},
  {x:-24,z:-14,w:1.5,d:2.6,kind:'crate'},
  {x:-23,z:16,w:4.3,d:2,kind:'car',rotation:0,color:0x748177},
  {x:21,z:-16,w:4,d:1.1,kind:'barrier'},
  {x:-6,z:7,w:.9,d:.9,kind:'barrel'},
  {x:8,z:-6,w:.9,d:.9,kind:'barrel'},
  {x:14,z:10,w:.9,d:.9,kind:'barrel'},
  {x:-15,z:-11,w:.9,d:.9,kind:'barrel'},
);
export const PROP_HEALTH={car:320,barrier:230,planter:190,crate:65,barrel:42,rock:420};
export function seededRandom(seed = 127) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function segmentCircle(ax, az, bx, bz, x, z, radius) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(ax + dx * t - x, az + dz * t - z) <= radius;
}
export function pointBlocked(x, z, radius = 0, obstacles = COVER) {
  return obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + radius && Math.abs(z - o.z) < o.d / 2 + radius);
}
export function segmentBoxTime(a,b,o,padding=0){
  let lo=0,hi=1;
  for(const[axis,half]of [['x',o.w/2+padding],['z',o.d/2+padding]]){
    const delta=b[axis]-a[axis],min=o[axis]-half,max=o[axis]+half;
    if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return null;}
    else{let t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}
  }
  return lo;
}
export function lineBlocked(a,b,padding=0,obstacles=COVER){return obstacles.some(o=>segmentBoxTime(a,b,o,padding)!==null);}

export const TOTAL_WAVES=32;
export const DISTRICTS=[
  {name:'SAINT-ROCH',subtitle:'THE QUARANTINED QUARTER',boss:'THE WARDEN',bossKind:'warden',sky:0x25363e,ground:0x455257,accent:0xe4ae68,condition:'A quiet street. Until it isn’t.',enemyBias:'walker'},
  {name:'PORT DES CENDRES',subtitle:'THE ABANDONED DOCKS',boss:'THE DREDGER',bossKind:'dredger',sky:0x253e4a,ground:0x394e57,accent:0xa9c9c3,condition:'Fast packs. Ranged fire. Nowhere to hide.',enemyBias:'runner'},
  {name:'LES SERRES',subtitle:'THE INFECTED GARDENS',boss:'THE BLOOM MOTHER',bossKind:'bloom',sky:0x303c34,ground:0x4a5945,accent:0xb2c28a,condition:'Toxic spitters and volatile growth.',enemyBias:'spitter'},
  {name:'LA FONDERIE',subtitle:'THE LAST FURNACE',boss:'THE CINDER KING',bossKind:'cinder',sky:0x3a3030,ground:0x4f4841,accent:0xee9b54,condition:'Armoured hordes. One final extraction.',enemyBias:'armored'},
];
DISTRICTS.push(
 {name:'CANOPÉE NOIRE',subtitle:'THE LOST JUNGLE',boss:'THE ROOT TYRANT',bossKind:'bloom',sky:0x26392c,ground:0x4d6040,accent:0xc7d49b,condition:'Dense growth. Burning paths.',enemyBias:'volatile'},
 {name:'LES DENTS BLANCHES',subtitle:'THE MOUNTAIN PASS',boss:'THE AVALANCHE',bossKind:'warden',sky:0x536578,ground:0x8d979e,accent:0xd5e6f0,condition:'Rock faces and frozen switchbacks.',enemyBias:'armored'},
 {name:'TERRES ROUGES',subtitle:'THE BADLANDS',boss:'THE DUST REAPER',bossKind:'dredger',sky:0x67483c,ground:0xb28a5d,accent:0xffce90,condition:'Open ground. Volatile fuel.',enemyBias:'runner'},
 {name:'MARAIS MORT',subtitle:'THE DROWNED FRONTIER',boss:'THE FEN KING',bossKind:'cinder',sky:0x293d3b,ground:0x546356,accent:0xc0c6a2,condition:'One final stand beyond the marsh.',enemyBias:'spitter'},
);
Object.assign(ENEMIES,{
  armored:{health:185,speed:1.7,damage:18,radius:.48,score:300},
  volatile:{health:55,speed:2.8,damage:15,radius:.4,score:200},
});
export const META_UPGRADES=[
  {id:'vitality',name:'Hardened survivor',description:'+10 starting health per rank.',max:5},
  {id:'firepower',name:'Weapons training',description:'+5% starting weapon damage per rank.',max:5},
  {id:'mobility',name:'Endurance training',description:'+4% movement speed per rank.',max:5},
  {id:'supply',name:'Supply network',description:'+1 starting grenade per rank.',max:5},
];
export const metaCost=rank=>100+rank*100;
export function synergies(p){return [
  p.burn>0&&p.frost>0?{name:'THERMAL SHOCK',description:'Burning and slowing the same target triggers a blast.'}:null,
  p.crit>0&&p.pierce>0?{name:'DEADSHOT',description:'Piercing rounds execute enemies below 20% health.'}:null,
  p.regen>0&&p.lifeSteal>0?{name:'SECOND WIND',description:'Kill healing and regeneration are doubled.'}:null,
  p.blast>1&&p.blastRadius>1?{name:'DEMOLITIONIST',description:'Explosions deal 25% more damage.'}:null,
].filter(Boolean);}

export function weaponSynergies(equipped){const has=(a,b)=>equipped.includes(a)&&equipped.includes(b);return [
 equipped.length===2&&equipped[0]===equipped[1]?{name:'AKIMBO',description:'Matching guns stagger their shots and reload independently.'}:null,
 has('flame','arc')?{name:'PLASMA ARC',description:'Electricity deals 40% more damage to burning targets.'}:null,
 has('shotgun','marksman')?{name:'SHATTERSHOT',description:'Rifle hits after shotgun pellets deal 50% more damage.'}:null,
 has('carbine','revolver')?{name:'DOUBLE TAP',description:'Alternating hits deal 30% more damage.'}:null,
 has('launcher','smg')?{name:'BREACH & CLEAR',description:'SMG deals 35% more damage to blast-exposed enemies.'}:null,
].filter(Boolean);}
