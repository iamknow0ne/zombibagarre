// Run-local perk ranks. Every offer describes the incremental benefit of its next tier.
export const UPGRADE_TIERS=[
 {name:'Common',mark:'I',color:'#c6d0b9'}, {name:'Rare',mark:'II',color:'#79ccec'},
 {name:'Epic',mark:'III',color:'#d8adff'}, {name:'Legendary',mark:'IV',color:'#ffc76a'}
];
const boost=[1,1.2,1.4,1.7],pct=n=>Math.round(n*1000)/10,add=(p,k,n)=>p[k]=(p[k]||0)+n;
const define=(id,title,tag,group,icon,description,apply,extra={})=>({id,title,tag,group,icon,description:description(1),describe:description,apply:(p,rank=1)=>apply(p,boost[rank-1],rank),...extra});
export const UPGRADES=[
 define('damage','Hollow points','FIREPOWER','attack','rounds',r=>`+${pct(.25*boost[r-1])}% base weapon damage.`,(p,b)=>p.damage+=.25*b),
 define('speed','Light on your feet','MOBILITY','utility','boot',r=>`Move ${pct(.1*boost[r-1])}% faster. Dodge recovers ${pct(.1*boost[r-1])}% faster.`,(p,b)=>{p.speed*=1+.1*b;p.dashMax*=1-.1*b;}),
 define('health','Second skin','SURVIVAL','survival','heart',r=>`+${Math.round(30*boost[r-1])} maximum health. Fully recover.`,(p,b)=>{p.maxHealth+=Math.round(30*b);p.health=p.maxHealth;}),
 define('reload','Sleight of hand','HANDLING','utility','reload',r=>`Reload ${pct(.2*boost[r-1])}% faster. Fire ${pct(.08*boost[r-1])}% faster.`,(p,b)=>{p.reloadMultiplier*=1-.2*b;p.fireMultiplier*=1-.08*b;}),
 define('magnet','Field medic','RECOVERY','survival','magnet',r=>`+${(1.2*boost[r-1]).toFixed(1)}m pickup reach. Heal ${boost[r-1].toFixed(1)} HP per kill.`,(p,b)=>{p.pickupRange+=1.2*b;p.lifeSteal+=b;}),
 define('ordnance','More bang','ORDNANCE','attack','bomb',r=>`Gain 2 grenades. Grenades deal ${pct(.3*boost[r-1])}% more damage.`,(p,b)=>{p.grenades+=2;p.blast*=1+.3*b;}),
 define('workshop','Field armorer','EVOLUTION','utility','wrench',r=>`+${Math.round(650*boost[r-1])} mastery to each equipped weapon type.`,()=>{}),
 define('armour','Ballistic weave','DEFENCE','survival','shield',()=>'+15 percentage points of damage resistance, up to 60%.',p=>p.resistance=Math.min(.6,p.resistance+.15)),
 define('regeneration','Keep breathing','RECOVERY','survival','pulse',r=>`Recover ${boost[r-1].toFixed(1)} HP each second.`,(p,b)=>p.regen+=b),
 define('piercing','Through and through','BALLISTICS','attack','pierce',()=> 'Projectiles pierce one more enemy. +5% base weapon damage.',p=>{p.pierce++;p.damage+=.05;}),
 define('critical','Deadeye','PRECISION','attack','target',()=>'+12 percentage points of critical chance. Total chance is capped at 80%.',p=>p.crit=Math.min(.8,p.crit+.12)),
 define('magazine','Extended magazines','CAPACITY','utility','magazine',r=>`+${pct(.25*boost[r-1])}% base magazine capacity for both guns.`,(p,b)=>p.magazineBonus+=.25*b),
 define('incendiary','Dragon’s breath','INCENDIARY','attack','flame',r=>`Shots burn enemies for ${boost[r-1].toFixed(1)} additional seconds.`,(p,b)=>p.burn+=b),
 define('frost','Cold shoulder','CONTROL','attack','snow',r=>`Shots slow enemies by 45% for ${(1.5*boost[r-1]).toFixed(1)} additional seconds.`,(p,b)=>p.frost+=1.5*b),
 define('blast','Wide destruction','AREA CONTROL','attack','blast',r=>`+${pct(.15*boost[r-1])}% explosion and melee radius.`,(p,b)=>p.blastRadius*=1+.15*b),
 define('aegis','Fresh plates','WAVE ARMOUR','survival','plates',r=>`Wave-start shield +${Math.round(15*boost[r-1])}. Refills to this allowance at every new wave.`,(p,b)=>add(p,'waveShield',Math.round(15*b))),
 define('quartermaster','Supply line','WAVE SUPPLY','utility','crate',()=> 'Gain one extra grenade after each cleared wave.',p=>add(p,'waveGrenades',1)),
 define('executioner','Vital strike','CRITICAL POWER','attack','skull',r=>`Critical hits gain +${(.2*boost[r-1]).toFixed(2)}× damage (base 2×).`,(p,b)=>add(p,'critPower',.2*b)),
 define('headhunter','Giant killer','BOSS HUNTER','attack','crown',r=>`Weapon damage against bosses and brutes +${pct(.2*boost[r-1])}%.`,(p,b)=>add(p,'eliteDamage',.2*b)),
 define('brawler','Point blank','CLOSE RANGE','attack','fist',r=>`Direct weapon hits within 4m deal +${pct(.15*boost[r-1])}% damage.`,(p,b)=>add(p,'closeDamage',.15*b)),
 define('longshot','Distant thunder','LONG RANGE','attack','scope',r=>`Direct weapon hits beyond 10m deal +${pct(.2*boost[r-1])}% damage.`,(p,b)=>add(p,'farDamage',.2*b)),
 define('bloodhound','Blood in the water','FINISHING','attack','drop',r=>`Direct weapon hits against enemies below half health deal +${pct(.2*boost[r-1])}% damage.`,(p,b)=>add(p,'woundedDamage',.2*b)),
 define('cuts','Sword saint','BLADECRAFT','attack','swords',r=>`Blade damage +${pct(.2*boost[r-1])}%. Three-hit finishers heal ${Math.round(3*boost[r-1])} HP on contact.`,(p,b)=>{add(p,'sliceDamage',.2*b);add(p,'finisherHeal',Math.round(3*b));},{requires:p=>p.equipped.some(k=>['katana','dual'].includes(k))}),
 define('pyromaniac','Cinder heart','FIRE SPECIALIST','attack','embers',r=>`Weapon fire damage and burn ticks +${pct(.25*boost[r-1])}%.`,(p,b)=>add(p,'fireDamage',.25*b),{requires:p=>p.burn>0||p.equipped.includes('flame')}),
 define('conductor','High voltage','ARC SPECIALIST','attack','bolt',r=>`Electric weapon damage +${pct(.25*boost[r-1])}%.`,(p,b)=>add(p,'electricDamage',.25*b),{requires:p=>p.equipped.includes('arc')}),
 define('shatter','Brittle bones','FROST SPECIALIST','attack','crystal',r=>`Direct weapon hits against slowed enemies deal +${pct(.2*boost[r-1])}% damage.`,(p,b)=>add(p,'slowDamage',.2*b),{requires:p=>p.frost>0||p.equipped.includes('arc')}),
 define('afterimage','Ghost step','DODGE DEFENCE','survival','ghost',r=>`Dodge-shield allowance +${Math.round(6*boost[r-1])}. Each dodge refills to this allowance.`,(p,b)=>add(p,'dashShield',Math.round(6*b))),
 define('dashpower','Ambush','DODGE ATTACK','attack','arrow',r=>`After a dodge, direct weapon damage +${pct(.15*boost[r-1])}% for 3 seconds.`,(p,b)=>add(p,'dashDamage',.15*b)),
 define('medicreload','Breathe between shots','RELOAD RECOVERY','survival','medical',r=>`Completing a reload heals ${Math.round(2*boost[r-1])} HP.`,(p,b)=>add(p,'reloadHeal',Math.round(2*b)),{requires:p=>!p.equipped.some(k=>['katana','dual'].includes(k))}),
 define('scavenger','Waste nothing','SUPPLY RECOVERY','survival','pack',r=>`Every collected supply heals ${Math.round(3*boost[r-1])} extra HP.`,(p,b)=>add(p,'supplyHeal',Math.round(3*b))),
 define('student','Quick study','MASTERY','utility','book',r=>`Earn ${pct(.15*boost[r-1])}% more mastery from enemy damage.`,(p,b)=>add(p,'masteryBonus',.15*b)),
 define('engineer','Roadside repair','MOTOR POOL','utility','wheel',r=>`At each new wave, repair your occupied vehicle by ${pct(.1*boost[r-1])}% of its maximum hull.`,(p,b)=>add(p,'vehicleRepair',.1*b),{requires:p=>!!p.vehicleId})
];
const projectileLoadout=p=>p.equipped.some(k=>!['katana','dual','arc','launcher'].includes(k));
const firearmLoadout=p=>p.equipped.some(k=>!['katana','dual'].includes(k));
for(const u of UPGRADES){if(['piercing','frost'].includes(u.id))u.requires=projectileLoadout;if(u.id==='magazine')u.requires=firearmLoadout;if(u.id==='incendiary')u.requires=p=>p.equipped.some(k=>!['katana','dual','launcher'].includes(k));if(u.id==='longshot')u.requires=p=>p.equipped.some(k=>!['katana','dual','flame'].includes(k));}
export const rankOf=(player,id)=>player.upgradeRanks?.[id]||0;
export function upgradeOffer(u,player){const rank=rankOf(player,u.id)+1;return {...u,rank,tier:UPGRADE_TIERS[rank-1],description:u.describe(rank)};}
export function rollUpgrades(player,wave,random,previous=[]){
 const maxRank=wave>=12?4:wave>=7?3:wave>=3?2:1;
 let pool=UPGRADES.filter(u=>rankOf(player,u.id)<maxRank&&(!u.requires||u.requires(player))&&!(u.id==='armour'&&player.resistance-(player.rpgBonuses?.resistance||0)>=.6-1e-8)&&!(u.id==='critical'&&player.crit-(player.rpgBonuses?.crit||0)>=.8-1e-8)&&!(u.id==='workshop'&&player.equipped.every(k=>(player.mastery[k]||0)>=8000)));
 // Prefer an unseen trio; keep owned upgrades in circulation so builds can evolve.
 const fresh=pool.filter(u=>!previous.includes(u.id));if(fresh.length>=3)pool=fresh;
 const weighted=pool.map(u=>({u,score:-Math.log(Math.max(.000001,random()))/(rankOf(player,u.id)?2.4:1)})).sort((a,b)=>a.score-b.score);
 const picks=[];for(const group of ['attack','survival','utility']){const next=weighted.find(o=>o.u.group===group&&!picks.includes(o.u));if(next)picks.push(next.u);}for(const o of weighted)if(picks.length<3&&!picks.includes(o.u))picks.push(o.u);
 return picks.map(u=>upgradeOffer(u,player));
}
export function perkDamage(player,enemy,impact){
 if(!impact.weapon)return 1;let bonus=0;
 if(['boss','brute'].includes(enemy.type))bonus+=player.eliteDamage||0;
 if(impact.kind==='fire')bonus+=player.fireDamage||0;if(impact.kind==='electric')bonus+=player.electricDamage||0;if(impact.kind==='slice')bonus+=player.sliceDamage||0;
 if(!impact.periodic&&!impact.execution){const d=Math.hypot(player.x-enemy.x,player.z-enemy.z);if(d<4)bonus+=player.closeDamage||0;if(d>10)bonus+=player.farDamage||0;if(enemy.health<enemy.maxHealth*.5)bonus+=player.woundedDamage||0;if(enemy.slow>0)bonus+=player.slowDamage||0;if(player.ambushTime>0)bonus+=player.dashDamage||0;}
 return 1+bonus;
}
