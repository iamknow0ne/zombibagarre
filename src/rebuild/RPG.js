import {nearGround} from './CombatHeight.js';
import {TRAINING,enforceProgression} from './Progression.js';
import {normalizeAppearance,appearanceSignature} from './Customization.js';
import {configureBoss} from './Bosses.js';
import {distance,pointBlocked,seededRandom,lineBlocked} from './config.js';
import {waterAt} from './City.js';
import {insideMap} from './Map.js';
export const RARITIES=['COMMON','RARE','EPIC','LEGENDARY'];
export const RARITY_COLORS=['#c6c6ac','#7fbdd0','#c1a3dc','#e9bf70'];
export const ATTRIBUTES={vigor:{name:'Vigor',text:'+8 maximum health',max:20},might:{name:'Might',text:'+3% weapon damage',max:20},agility:{name:'Agility',text:'+0.08 movement speed',max:20},focus:{name:'Focus',text:'−1.5% reload time',max:20},fortune:{name:'Fortune',text:'+0.5% critical chance',max:20}};
export const SKILLS={mender:{name:'Second breath',text:'Regenerate 0.6 health per second.',level:3,cost:2},vampire:{name:'Blood pact',text:'Recover 2 health per kill.',level:5,cost:2},winter:{name:'Winter rounds',text:'Your bullets slow surviving targets.',level:7,cost:3},pyre:{name:'Ember oath',text:'Your bullets ignite dry enemies.',level:10,cost:3}};
export const SKILL_BRANCHES={survival:{name:'SURVIVOR',text:'Endure. Recover. Hold the street.'},hunter:{name:'HUNTER',text:'Dodge into danger. Finish the fight.'},elemental:{name:'ARTIFICER',text:'Control the horde. Shape the battlefield.'}};
Object.assign(SKILLS,{
 bulwark:{name:'Living bastion',text:'+8% damage resistance. Each wave grants 15 shield.',level:8,cost:3,parent:'mender',branch:'survival',icon:'shield',bonuses:{resistance:.08,waveShield:15}},
 lifeline:{name:'Last light',text:'Reloading restores 3 HP. Supply pickups restore 5 extra HP.',level:12,cost:3,parent:'vampire',branch:'survival',icon:'medical',bonuses:{reloadHeal:3,supplyHeal:5}},
 quickstep:{name:'Ghost step',text:'Each dodge grants a 6-point shield.',level:2,cost:2,branch:'hunter',icon:'ghost',bonuses:{dashShield:6}},
 ambush:{name:'Ambush',text:'+20% direct weapon damage for 3 seconds after dodging.',level:5,cost:2,parent:'quickstep',branch:'hunter',icon:'arrow',bonuses:{dashDamage:.2}},
 swordsaint:{name:'Sword saint',text:'+20% blade damage. Combo finishers restore 4 HP.',level:8,cost:3,parent:'ambush',branch:'hunter',icon:'swords',bonuses:{sliceDamage:.2,finisherHeal:4}},
 giantkiller:{name:'Giant killer',text:'+25% weapon damage against bosses and brutes.',level:12,cost:3,parent:'swordsaint',branch:'hunter',icon:'crown',bonuses:{eliteDamage:.25}},
 shatter:{name:'Fracture',text:'+25% direct weapon damage against slowed targets.',level:12,cost:3,parent:'winter',branch:'elemental',icon:'crystal',bonuses:{slowDamage:.25}},
 inferno:{name:'Flashpoint',text:'+25% fire damage and burn damage. +20% electric damage.',level:15,cost:3,parent:'pyre',branch:'elemental',icon:'bolt',bonuses:{fireDamage:.25,electricDamage:.2}}
});
for(const [key,branch,icon] of [['mender','survival','pulse'],['vampire','survival','drop'],['winter','elemental','snow'],['pyre','elemental','flame']])Object.assign(SKILLS[key],{branch,icon});
Object.assign(SKILLS,TRAINING);
SKILL_BRANCHES.arsenal={name:'ARSENAL',text:'Train. Unlock. Master your loadout.'};
export function skillLock(p,key){const s=SKILLS[key];if(!s)return 'Unknown skill';if(p.skills.includes(key))return 'Learned';if(s.parent&&!p.skills.includes(s.parent))return `Requires ${SKILLS[s.parent].name}`;if(levelForXP(p.xp).level<s.level)return `Requires level ${s.level}`;if(pointsLeft(p)<s.cost)return `Need ${s.cost} points`;return '';}
export const RELICS={ash:{name:'ASHBRINGER',base:'katana',color:0xef9e5b,text:'Relic katana · +35% damage. Cuts ignite dry enemies for 3 seconds.',damage:1.35,burn:3},storm:{name:'TEMPEST',base:'arc',color:0x82dbe6,text:'Relic arc projector · +20% damage, +3 chain targets.',damage:1.2,chain:3},void:{name:'BLACK STAR',base:'launcher',color:0xcba2ec,text:'Relic launcher · +25% damage, +35% blast radius.',damage:1.25,explosive:1.35}};
export const DYES={olive:{name:'Field olive',color:0x697758},ivory:{name:'Rescue ivory',color:0xc8c1aa},rust:{name:'Oxide red',color:0x9c5143},slate:{name:'Storm slate',color:0x526f84}};
export const ARMOUR=Object.fromEntries(['scout','warden','reaper'].flatMap((family)=>['head','chest','legs'].flatMap((slot)=>Array.from({length:4},(_,tier)=>{
 const scale=[.24,.5,.26][['head','chest','legs'].indexOf(slot)],rank=tier+1,id=`${family}-${slot}-${tier}`;
 return [id,{id,family,slot,tier,name:`${family==='scout'?'Pathfinder':family==='warden'?'Bastion':'Revenant'} ${slot==='head'?'Helm':slot==='chest'?'Coat':'Greaves'}`,price:Math.round([95,230,480,800][tier]*(slot==='chest'?1:.7)),level:[1,3,6,10][tier],health:Math.round((family==='warden'?24:family==='scout'?12:8)*rank*scale),resistance:(family==='warden'?.07:.025)*rank*scale,speed:(family==='scout'?.3:family==='warden'?-.15:.1)*rank*scale,damage:family==='reaper'?.05*rank*scale:0}];
}))));
const int=(n,max=1000000)=>Math.max(0,Math.min(max,Math.floor((typeof n==='number'||typeof n==='string')&&Number.isFinite(Number(n))?Number(n):0)));
export function levelForXP(xp){let level=1,spent=0;while(level<30&&xp>=spent+120+level*60){spent+=120+level*60;level++;}return{level,current:xp-spent,next:level===30?0:120+level*60};}
export function normalizeProfile(raw={}){
 if(!raw||typeof raw!=='object')raw={};const xp=int(raw.xp),level=levelForXP(xp).level;
 const p={version:1,xp,appearance:normalizeAppearance(raw.appearance),attributes:{},skills:[],owned:['scout-chest-0'],equipment:{head:null,chest:'scout-chest-0',legs:null},relics:[],relic:null,dye:typeof raw.dye==='string'&&Object.hasOwn(DYES,raw.dye)?raw.dye:'olive'};let budget=3+(level-1)*2;
 for(const [key,a]of Object.entries(ATTRIBUTES)){p.attributes[key]=Math.min(budget,int(raw.attributes?.[key],a.max));budget-=p.attributes[key];}
 const learned=new Set(Array.isArray(raw.skills)?raw.skills:[]);
 for(const [key,s]of Object.entries(SKILLS))if(learned.has(key)&&level>=s.level&&budget>=s.cost&&(!s.parent||p.skills.includes(s.parent))){p.skills.push(key);budget-=s.cost;}
 if(Array.isArray(raw.owned))p.owned=[...new Set([...p.owned,...raw.owned.filter(id=>typeof id==='string'&&Object.hasOwn(ARMOUR,id))])];
 for(const slot of ['head','chest','legs'])if(raw.equipment?.[slot]===null)p.equipment[slot]=null;else if(p.owned.includes(raw.equipment?.[slot])&&ARMOUR[raw.equipment[slot]].slot===slot)p.equipment[slot]=raw.equipment[slot];
 p.relics=Array.isArray(raw.relics)?[...new Set(raw.relics.filter(id=>typeof id==='string'&&Object.hasOwn(RELICS,id)))]:[];p.relic=p.relics.includes(raw.relic)?raw.relic:null;return p;
}
export function pointsLeft(p){return 3+(levelForXP(p.xp).level-1)*2-Object.values(p.attributes).reduce((a,b)=>a+b,0)-p.skills.reduce((n,k)=>n+SKILLS[k].cost,0);}
export function bonuses(p){const a=p.attributes,b={maxHealth:a.vigor*8,damage:a.might*.03,speed:a.agility*.08,resistance:0,crit:a.fortune*.005,regen:p.skills.includes('mender')?.6:0,lifeSteal:p.skills.includes('vampire')?2:0,burn:p.skills.includes('pyre')?2:0,frost:p.skills.includes('winter')?1:0,reloadMultiplier:-a.focus*.015};for(const id of Object.values(p.equipment)){const g=ARMOUR[id];if(g)for(const k of ['maxHealth','damage','speed','resistance'])b[k]+=g[k==='maxHealth'?'health':k]||0;}for(const key of p.skills)for(const [stat,value]of Object.entries(SKILLS[key].bonuses||{}))b[stat]=(b[stat]||0)+value;return b;}
export function applyProfile(sim){const p=sim.player,b=bonuses(sim.profile),old=p.rpgBonuses||{};for(const k of Object.keys(b))b[k]*=p.rpgScales?.[k]||1;for(const k of new Set([...Object.keys(b),...Object.keys(old)]))p[k]=(p[k]||0)+(b[k]||0)-(old[k]||0);p.health=Math.min(p.health,p.maxHealth);p.rpgBonuses=b;p.armour={...sim.profile.equipment};p.dye=sim.profile.dye;p.appearance={...sim.profile.appearance};p.appearanceKey=appearanceSignature(p.skin,p.appearance);p.rpgRelic=RELICS[sim.profile.relic]||null;enforceProgression(sim);}
export function spendPoint(sim,key){const p=sim.profile;if(ATTRIBUTES[key]&&pointsLeft(p)>0&&p.attributes[key]<ATTRIBUTES[key].max){p.attributes[key]++;applyProfile(sim);sim.emit('profile');return true;}const s=SKILLS[key];if(s&&!skillLock(p,key)){p.skills.push(key);applyProfile(sim);sim.emit('profile');sim.emit('progression',{category:'skill',title:s.name.toUpperCase(),detail:s.branch==='arsenal'?'TRAINING COMPLETE':'SKILL LEARNED'});return true;}return false;}
export function equipArmour(sim,id){const a=ARMOUR[id];if(!a||!sim.profile.owned.includes(id))return false;sim.profile.equipment[a.slot]=id;applyProfile(sim);sim.emit('profile');return true;}
export function gainXP(sim,n){const before=levelForXP(sim.profile.xp).level;sim.profile.xp=int(sim.profile.xp+n);const after=levelForXP(sim.profile.xp).level;sim.emit('profile');if(after>before)sim.emit('progression',{category:'level',title:`LEVEL ${after}`,detail:`+${(after-before)*2} SKILL POINTS`,level:after});if(after>before)sim.emit('rpg-notice',{message:`LEVEL ${after} · +${(after-before)*2} SKILL POINTS · OPEN CHARACTER IN PAUSE`});}
export const QUESTS=[
 {id:'salvage',name:'A coat against the dark',npc:'smith',text:'Recover both supply cases, then return to the armourer.',reward:'160 crowns · rare Bastion coat · 220 XP'},
 {id:'mercy',name:'Mercy on the streets',npc:'medic',text:'Defeat 20 enemies, then return to the field medic.',reward:'180 crowns · rare Pathfinder greaves · 240 XP'},
 {id:'signal',name:'The voice below',npc:'broker',text:'Restore DEAD AIR, then ask the relic dealer about the sealed furnace.',reward:'Reveal the Cinder Confessor · 120 crowns · 180 XP'},
 {id:'atlas',name:'Names of the lost',npc:'broker',text:'Discover four districts, then return to the relic dealer.',reward:'Reveal the Drowned Marshal · 160 crowns · 220 XP'},
 {id:'watch',name:'No one left behind',npc:'broker',text:'Complete all three street encounters, then return to the relic dealer.',reward:'BLACK STAR relic launcher · 300 crowns · 350 XP'}
];
const moreQuests=[
 ['welcome','A city still breathing','medic','Meet all three traders.','contacts',3,90,140,null,null],
 ['runner','A message for Mara','medic','Visit Mara after accepting this contract, then report back.','delivery',1,100,150,null,null],
 ['convoy','Last delivery','smith','Secure the stranded supply convoy.','cache',1,150,190,'warden-head-1',null],
 ['enforcer','Break the blockade','smith','Defeat the marked enforcer at THE NIGHT WATCH.','hunt',1,170,210,'reaper-head-1','convoy'],
 ['hunters','Fast company','medic','Defeat 12 runners during this expedition.','runnerKills',12,150,190,'scout-head-1','mercy'],
 ['armoured','Crack the shell','smith','Defeat 6 brutes or armoured enemies.','heavyKills',6,220,260,'warden-legs-2','enforcer'],
 ['wardrobe','Ready for the night','smith','Equip armour in all three slots.','outfit',3,80,120,null,null],
 ['survey','Beyond the barricades','broker','Discover seven city districts.','districts',7,240,300,'scout-chest-2','atlas'],
 ['nightshift','Night shift','medic','Reach wave 6 in this expedition.','wave',6,210,250,'scout-legs-2','hunters'],
 ['cinder','The furnace goes quiet','broker','Defeat the Cinder Confessor at the revealed furnace.','confessor',1,300,350,'reaper-chest-2','signal'],
 ['drowned','A debt to the drowned','broker','Defeat the Drowned Marshal at the revealed chapel.','marshal',1,300,350,'warden-chest-2','atlas'],
 ['covenant','Keep the lights on','broker','Defeat both hidden guardians in a single expedition.','guardians',2,500,500,'reaper-chest-3','cinder']
];
for(const [id,name,npc,text,metric,target,coins,xp,gear,requires]of moreQuests)QUESTS.push({id,name,npc,text,metric,target,coins,xp,gear,requires,reward:`${coins} crowns · ${xp} XP${gear?` · ${RARITIES[ARMOUR[gear].tier].toLowerCase()} ${ARMOUR[gear].name}`:''}`});
QUESTS.push(
 {id:'night-hunt',name:'Until the lamps go out',npc:'medic',nightOnly:true,metric:'nightKills',target:18,coins:200,xp:260,text:'After accepting, defeat 18 enemies between 19:00 and 06:00. Lenoir needs the night routes cleared.',reward:'200 crowns · 260 XP'},
 {id:'night-courier',name:'Medicine after midnight',npc:'smith',nightOnly:true,metric:'nightDelivery',target:1,coins:160,xp:220,text:'Accept from Mara at night. Visit Lenoir’s clinic on foot after dark to deliver the insulated medicine, then return to Mara.',reward:'160 crowns · 220 XP'},
 {id:'night-atlas',name:'Where the streetlights end',npc:'broker',nightOnly:true,metric:'nightDistricts',target:3,coins:240,xp:300,text:'After accepting, visit three different marked districts after dark. Nocturne is mapping the places where the signal changes.',reward:'240 crowns · 300 XP'}
);
export function questVisible(sim,q){return !q.nightOnly||!!sim.weather?.night||sim.rpg.accepted.includes(q.id);}
export function questAvailable(sim,q){return (!q.nightOnly||!!sim.weather?.night||sim.rpg.accepted.includes(q.id))&&(!q.requires||sim.rpg.claimed.includes(q.requires));}
export function acceptQuest(sim,id,npc){const q=QUESTS.find(q=>q.id===id);if(!q||q.npc!==npc||!questAvailable(sim,q)||nearbyPlace(sim)?.id!==npc||sim.rpg.accepted.includes(id))return false;sim.rpg.accepted.push(id);if(id==='runner')sim.rpg.delivery=false;trackQuest(sim,id);return true;}
export function questState(sim,q){if(sim.rpg.claimed.includes(q.id))return 'complete';if(!questAvailable(sim,q))return 'locked';if(!sim.rpg.accepted.includes(q.id))return 'available';const [n,max]=questProgress(sim,q.id);return n>=max?'ready':'active';}
export function questObjective(sim,id){
 const q=QUESTS.find(q=>q.id===id);if(!q)return null;const state=questState(sim,q),contact=sim.places.find(p=>p.id===q.npc);let target=null,text=q.text;
 if(state==='complete')return {text:'Contract complete',target:null,state};
 if(state==='locked'&&q.nightOnly)return {text:'This contact offers the contract after dark (19:00–06:00).',target:contact,state};
 if(state==='locked')return {text:`Complete ${QUESTS.find(a=>a.id===q.requires)?.name} first.`,target:contact,state};
 if(state==='available'||state==='ready'){target=contact;text=`${state==='ready'?'Return to':'Speak to'} ${contact?.name||q.npc}${state==='ready'?' to claim your reward':' to accept this contract'}.`;}
 else if(id==='salvage'){target=sim.places.filter(p=>p.kind==='cache'&&!p.used).sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0];text='Recover the marked supply case on foot.';}
 else if(id==='welcome'){target=sim.places.find(p=>p.kind==='shop'&&!sim.rpg.contacts.includes(p.id));text=`Meet ${target?.name||'the remaining trader'}.`;}
 else if(id==='runner'){target=sim.places.find(p=>p.id==='smith');text='Deliver the message to Mara. Interact with her workshop.';}
 else if(['signal','convoy','enforcer'].includes(id)){target=sim.streetEvents.find(j=>j.kind===({signal:'relay',convoy:'cache',enforcer:'hunt'}[id]));text=target?.instruction||q.text;}
 else if(['atlas','survey'].includes(id)){target=sim.layout.landmarks.filter(p=>!sim.visited.has(p.name)).sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0];text='Reach the marked district to discover it.';}
 else if(id==='watch'){target=sim.streetEvents.find(p=>p.state!=='complete');text=target?.instruction||q.text;}
 else if(['cinder','drowned','covenant'].includes(id)){target=sim.places.find(p=>p.kind==='secret'&&p.revealed&&!p.defeated&&(id==='covenant'||p.id===(id==='cinder'?'confessor':'marshal')));text=target?.used?'Defeat the summoned guardian.':'Reach the seal and summon its guardian on foot.';if(!target){target=contact;text='Complete The voice below and Names of the lost at Nocturne to reveal both seals.';}}
 if(state==='active'&&['mercy','hunters','armoured','nightshift','wardrobe'].includes(id)){const [done,total]=questProgress(sim,id);text=id==='wardrobe'?'Equip head, chest and leg armour in Character → Inventory.':id==='nightshift'?`Survive until wave ${total}. Fight anywhere in the city.`:`Defeat ${Math.max(0,total-done)} more ${id==='hunters'?'runners':id==='armoured'?'brutes or armoured enemies':'enemies'}. Fight anywhere in the city.`;}
 if(state==='active'&&q.nightOnly){if(!sim.weather?.night){target=null;text='Resume this objective after dark (19:00–06:00). Your progress is kept.';}else if(id==='night-courier'){target=sim.places.find(p=>p.id==='medic');text='Visit Lenoir’s clinic on foot tonight. Interact to deliver the medicine.';}else if(id==='night-atlas'){target=sim.layout.landmarks.filter(p=>!sim.rpg.nightDistricts.includes(p.name)).sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0];text='Reach the marked district after dark. Each district counts once.';}else {target=null;text=`Defeat ${Math.max(0,18-sim.rpg.nightKills)} more enemies after dark. Fight anywhere in the city.`;}}
 return {text,target,state};
}
export function trackQuest(sim,id){const q=QUESTS.find(q=>q.id===id);if(!q||['complete','locked'].includes(questState(sim,q)))return false;sim.rpg.tracked=id;const o=questObjective(sim,id);sim.player.waypoint=o.target?{x:o.target.x,z:o.target.z,source:'quest',questId:id,name:o.target.name||q.name}:null;return true;}
const DEFINITIONS=[{id:'smith',name:'MARA / ARMOURER',kind:'shop',color:0xe3b875},{id:'medic',name:'DR. LENOIR / FIELD MEDIC',kind:'shop',color:0x9fceb0},{id:'broker',name:'NOCTURNE / RELIC DEALER',kind:'shop',color:0xabc8d7},{id:'case-a',name:'SUPPLY CASE / I',kind:'cache',color:0xe3b875},{id:'case-b',name:'SUPPLY CASE / II',kind:'cache',color:0xe3b875},{id:'confessor',name:'THE SEALED FURNACE',kind:'secret',color:0xef9e5b},{id:'marshal',name:'THE DROWNED CHAPEL',kind:'secret',color:0x82dbe6}];
export function makeRPGWorld(layout){
 if(!layout.city)return[];const random=seededRandom((layout.mapSeed||0)^0x41415),chosen=[];
 const points=layout.spawnPoints.filter(q=>!pointBlocked(q.x,q.z,2.8,[...layout.cover,...layout.buildings])&&!waterAt(layout,q.x,q.z)&&Math.hypot(q.x,q.z)>9);
 for(const [i,d]of DEFINITIONS.entries()){
  const available=points.filter(q=>chosen.every(p=>distance(p,q)>12)&&(i<3||Math.hypot(q.x,q.z)>30)).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
  if(d.kind==='shop'){const fronts=[];for(const b of layout.buildings.filter(b=>b.primary&&!chosen.some(p=>p.buildingId===b.id))){for(const [nx,nz,angle]of [[0,1,0],[1,0,Math.PI/2],[0,-1,Math.PI],[-1,0,-Math.PI/2]]){const q={x:b.x+nx*(b.w/2+3.2),z:b.z+nz*(b.d/2+3.2),angle,buildingId:b.id,frontWidth:nx?b.d:b.w};if(!insideMap(layout,q.x,q.z,2.5)||pointBlocked(q.x,q.z,2.5,[...layout.cover,...layout.buildings])||waterAt(layout,q.x,q.z)||chosen.some(p=>distance(p,q)<12))continue;const routes=points.filter(p=>distance(p,q)<24);if(routes.some(p=>!lineBlocked(p,q,.8,[...layout.cover,...layout.buildings])))fronts.push(q);}}fronts.sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));if(fronts.length){chosen.push({...d,...fronts[0],used:false,revealed:true,defeated:false,guards:[]});continue;}}
  if(!available.length)continue;const q=i<3?available[Math.min(i*2,available.length-1)]:available[Math.floor(random()*available.length)];chosen.push({...d,...q,used:false,revealed:d.kind!=='secret',defeated:false,guards:[]});
 }return chosen;
}
export function initRPG(sim,profile){sim.profile=normalizeProfile(profile);sim.rpg={coins:60,claimed:[],accepted:[],cases:[],kills:0,contacts:[],delivery:false,runnerKills:0,heavyKills:0,nightKills:0,nightDelivery:0,nightDistricts:[],tracked:null};sim.places=makeRPGWorld(sim.layout);applyProfile(sim);}
export function nearbyPlace(sim){return sim.player.vehicleId||!nearGround(sim.player)?null:(sim.places||[]).filter(q=>q.revealed&&!q.defeated&&!(q.kind==='cache'&&q.used)&&distance(q,sim.player)<4.5&&!sim.blocked(sim.player,q)).sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0]||null;}
export function questProgress(sim,id){const r=sim.rpg,q=QUESTS.find(q=>q.id===id);if(!q)return[0,1];if(id==='salvage')return[r.cases.length,2];if(id==='mercy')return[Math.min(20,r.kills),20];if(id==='signal')return[+(sim.streetEvents.some(j=>j.kind==='relay'&&j.state==='complete')),1];if(id==='atlas')return[Math.min(4,sim.visited.size),4];if(id==='watch')return[sim.streetEvents.filter(j=>j.state==='complete').length,sim.streetEvents.length||3];
 let n=0;switch(q.metric){case 'nightDistricts':n=r.nightDistricts.length;break;case 'contacts':n=r.contacts.length;break;case 'delivery':n=+r.delivery;break;case 'outfit':n=Object.values(sim.profile.equipment).filter(Boolean).length;break;case 'districts':n=sim.visited.size;break;case 'wave':n=sim.wave;break;case 'cache':case 'hunt':n=+sim.streetEvents.some(j=>j.kind===q.metric&&j.state==='complete');break;case 'guardians':n=sim.places.filter(p=>p.kind==='secret'&&p.defeated).length;break;case 'confessor':case 'marshal':n=+!!sim.places.find(p=>p.id===q.metric)?.defeated;break;default:n=r[q.metric]||0;}
 return [Math.min(n,q.target),q.target];
}
export function claimQuest(sim,id,npc){const q=QUESTS.find(q=>q.id===id),r=sim.rpg;if(!q||q.npc!==npc||r.claimed.includes(id)||!r.accepted.includes(id)||nearbyPlace(sim)?.id!==npc)return false;const [n,max]=questProgress(sim,id);if(n<max)return false;
 r.claimed.push(id);const rewards={salvage:[160,220,'warden-chest-1'],mercy:[180,240,'scout-legs-1'],signal:[120,180],atlas:[160,220],watch:[300,350]}[id]||[q.coins,q.xp,q.gear];r.coins+=rewards[0];if(rewards[2]&&!sim.profile.owned.includes(rewards[2]))sim.profile.owned.push(rewards[2]);if(id==='watch'&&!sim.profile.relics.includes('void'))sim.profile.relics.push('void');
 const secret=id==='signal'?'confessor':id==='atlas'?'marshal':null;if(secret){const p=sim.places.find(p=>p.id===secret);if(p){p.revealed=true;sim.player.waypoint={x:p.x,z:p.z,source:'manual',name:p.name};}}
 gainXP(sim,rewards[1]);sim.emit('rpg-notice',{message:`${q.name.toUpperCase()} · ${q.reward.toUpperCase()}`});return true;
}
export function shopStock(sim,npc){const level=levelForXP(sim.profile.xp).level;return Object.values(ARMOUR).filter(g=>g.level<=level&&(npc==='smith'?g.family==='warden':npc==='medic'?g.family==='scout':g.family==='reaper'));}
export function purchase(sim,id,npc){if(nearbyPlace(sim)?.id!==npc)return false;const a=shopStock(sim,npc).find(g=>g.id===id);if(!a||sim.profile.owned.includes(id)||sim.rpg.coins<a.price)return false;sim.rpg.coins-=a.price;sim.profile.owned.push(id);sim.emit('profile');return true;}
export function interactPlace(sim){const q=nearbyPlace(sim);if(!q)return false;if(q.kind==='shop'){if(!sim.rpg.contacts.includes(q.id))sim.rpg.contacts.push(q.id);if(q.id==='medic'&&sim.weather?.night&&sim.rpg.accepted.includes('night-courier'))sim.rpg.nightDelivery=1;if(q.id==='smith'&&sim.rpg.accepted.includes('runner'))sim.rpg.delivery=true;sim.emit('rpg-shop',{id:q.id});sim.pause();return true;}
 if(q.kind==='cache'){q.used=true;sim.rpg.cases.push(q.id);sim.rpg.coins+=35;gainXP(sim,40);sim.emit('rpg-notice',{message:'SUPPLY CASE RECOVERED · +35 CROWNS · RETURN TO MARA'});return true;}
 if(q.used)return true;const safe=sim.layout.spawnPoints.filter(p=>distance(p,q)<16&&distance(p,q)>5&&!pointBlocked(p.x,p.z,2,sim.obstacles)).sort((a,b)=>distance(a,q)-distance(b,q));if(!safe.length){sim.emit('rpg-notice',{message:'THE ENTRANCE IS BLOCKED · CLEAR THE AREA'});return true;}
 q.used=true;const e=sim.spawnEnemy('boss',safe[0].x,safe[0].z);e.bossName=q.id==='confessor'?'CINDER CONFESSOR':'DROWNED MARSHAL';e.bossKind=q.id==='confessor'?'cinder':'dredger';configureBoss(sim,e,{variant:q.id==='confessor'?3:1,name:e.bossName,height:q.id==='confessor'?8.2:7.2});e.secretId=q.id;e.health=e.maxHealth=1800+levelForXP(sim.profile.xp).level*100;e.damage*=1.25;e.elite=true;q.guards=[e.id];sim.waveTotal++;sim.emit('rpg-notice',{message:`SECRET BOSS · ${e.bossName}`});return true;
}
export function rpgKill(sim,e){if(!sim.rpg)return;sim.rpg.kills++;if(sim.weather?.night&&sim.rpg.accepted.includes('night-hunt'))sim.rpg.nightKills++;if(e.type==='runner')sim.rpg.runnerKills++;if(['brute','armored'].includes(e.type))sim.rpg.heavyKills++;sim.rpg.coins+=e.type==='boss'?70:e.type==='brute'?9:3;gainXP(sim,e.type==='boss'?180:e.type==='brute'?25:10);if(e.secretId){const q=sim.places.find(q=>q.id===e.secretId);if(q)q.defeated=true;const id=e.secretId==='confessor'?'ash':'storm';if(!sim.profile.relics.includes(id))sim.profile.relics.push(id);sim.rpg.coins+=250;sim.emit('profile');sim.emit('rpg-notice',{message:`${RELICS[id].name} DISCOVERED · PERMANENT RELIC · +250 CROWNS`});}}

// Multiplicative expedition perks scale both the stat and its removable permanent contribution.
export function applyExpeditionUpgrade(player,upgrade,rank){
 const tracked=['speed','reloadMultiplier'],before=Object.fromEntries(tracked.map(k=>[k,player[k]]));
 const resistance=player.rpgBonuses?.resistance||0,crit=player.rpgBonuses?.crit||0;
 player.resistance-=resistance;player.crit-=crit;upgrade.apply(player,rank);player.resistance+=resistance;player.crit+=crit;
 player.rpgScales??={};for(const k of tracked)if(before[k]&&player[k]!==before[k]){const factor=player[k]/before[k];player.rpgScales[k]=(player.rpgScales[k]||1)*factor;if(player.rpgBonuses)player.rpgBonuses[k]=(player.rpgBonuses[k]||0)*factor;}
}

export function updateNightQuests(sim){if(!sim.rpg||!sim.weather?.night||(!sim.rpg.accepted.includes('night-atlas')||sim.rpg.nightDistricts.length>=3))return;for(const p of sim.layout.landmarks||[])if(distance(p,sim.player)<6&&!sim.rpg.nightDistricts.includes(p.name)){sim.rpg.nightDistricts.push(p.name);sim.emit('rpg-notice',{message:`NIGHT SURVEY · ${Math.min(3,sim.rpg.nightDistricts.length)} / 3 DISTRICTS`});}}
