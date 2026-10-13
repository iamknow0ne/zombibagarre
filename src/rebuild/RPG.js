import {configureBoss} from './Bosses.js';
import {distance,pointBlocked,seededRandom} from './config.js';
import {waterAt} from './City.js';
export const RARITIES=['COMMON','RARE','EPIC','LEGENDARY'];
export const RARITY_COLORS=['#c6c6ac','#7fbdd0','#c1a3dc','#e9bf70'];
export const ATTRIBUTES={vigor:{name:'Vigor',text:'+8 maximum health',max:20},might:{name:'Might',text:'+3% weapon damage',max:20},agility:{name:'Agility',text:'+0.08 movement speed',max:20},focus:{name:'Focus',text:'−1.5% reload time',max:20},fortune:{name:'Fortune',text:'+0.5% critical chance',max:20}};
export const SKILLS={mender:{name:'Second breath',text:'Regenerate 0.6 health per second.',level:3,cost:2},vampire:{name:'Blood pact',text:'Recover 2 health per kill.',level:5,cost:2},winter:{name:'Winter rounds',text:'Your bullets slow surviving targets.',level:7,cost:3},pyre:{name:'Ember oath',text:'Your bullets ignite dry enemies.',level:10,cost:3}};
export const RELICS={ash:{name:'ASHBRINGER',base:'katana',color:0xef9e5b,text:'Relic katana · +35% damage. Cuts ignite dry enemies for 3 seconds.',damage:1.35,burn:3},storm:{name:'TEMPEST',base:'arc',color:0x82dbe6,text:'Relic arc projector · +20% damage, +3 chain targets.',damage:1.2,chain:3},void:{name:'BLACK STAR',base:'launcher',color:0xcba2ec,text:'Relic launcher · +25% damage, +35% blast radius.',damage:1.25,explosive:1.35}};
export const DYES={olive:{name:'Field olive',color:0x697758},ivory:{name:'Rescue ivory',color:0xc8c1aa},rust:{name:'Oxide red',color:0x9c5143},slate:{name:'Storm slate',color:0x526f84}};
export const ARMOUR=Object.fromEntries(['scout','warden','reaper'].flatMap((family)=>['head','chest','legs'].flatMap((slot)=>Array.from({length:4},(_,tier)=>{
 const scale=[.24,.5,.26][['head','chest','legs'].indexOf(slot)],rank=tier+1,id=`${family}-${slot}-${tier}`;
 return [id,{id,family,slot,tier,name:`${family==='scout'?'Pathfinder':family==='warden'?'Bastion':'Revenant'} ${slot==='head'?'Helm':slot==='chest'?'Coat':'Greaves'}`,price:Math.round([95,230,480,800][tier]*(slot==='chest'?1:.7)),level:[1,3,6,10][tier],health:Math.round((family==='warden'?24:family==='scout'?12:8)*rank*scale),resistance:(family==='warden'?.07:.025)*rank*scale,speed:(family==='scout'?.3:family==='warden'?-.15:.1)*rank*scale,damage:family==='reaper'?.05*rank*scale:0}];
}))));
const int=(n,max=1000000)=>Math.max(0,Math.min(max,Math.floor(Number(n)||0)));
export function levelForXP(xp){let level=1,spent=0;while(level<30&&xp>=spent+120+level*60){spent+=120+level*60;level++;}return{level,current:xp-spent,next:level===30?0:120+level*60};}
export function normalizeProfile(raw={}){
 if(!raw||typeof raw!=='object')raw={};const xp=int(raw.xp),level=levelForXP(xp).level;
 const p={version:1,xp,attributes:{},skills:[],owned:['scout-chest-0'],equipment:{head:null,chest:'scout-chest-0',legs:null},relics:[],relic:null,dye:DYES[raw.dye]?raw.dye:'olive'};let budget=3+(level-1)*2;
 for(const [key,a]of Object.entries(ATTRIBUTES)){p.attributes[key]=Math.min(budget,int(raw.attributes?.[key],a.max));budget-=p.attributes[key];}
 for(const [key,s]of Object.entries(SKILLS))if(raw.skills?.includes?.(key)&&level>=s.level&&budget>=s.cost){p.skills.push(key);budget-=s.cost;}
 if(Array.isArray(raw.owned))p.owned=[...new Set([...p.owned,...raw.owned.filter(id=>ARMOUR[id])])];
 for(const slot of ['head','chest','legs'])if(raw.equipment?.[slot]===null)p.equipment[slot]=null;else if(p.owned.includes(raw.equipment?.[slot])&&ARMOUR[raw.equipment[slot]].slot===slot)p.equipment[slot]=raw.equipment[slot];
 p.relics=Array.isArray(raw.relics)?[...new Set(raw.relics.filter(id=>RELICS[id]))]:[];p.relic=p.relics.includes(raw.relic)?raw.relic:null;return p;
}
export function pointsLeft(p){return 3+(levelForXP(p.xp).level-1)*2-Object.values(p.attributes).reduce((a,b)=>a+b,0)-p.skills.reduce((n,k)=>n+SKILLS[k].cost,0);}
export function bonuses(p){const a=p.attributes,b={maxHealth:a.vigor*8,damage:a.might*.03,speed:a.agility*.08,resistance:0,crit:a.fortune*.005,regen:p.skills.includes('mender')?.6:0,lifeSteal:p.skills.includes('vampire')?2:0,burn:p.skills.includes('pyre')?2:0,frost:p.skills.includes('winter')?1:0,reloadMultiplier:-a.focus*.015};for(const id of Object.values(p.equipment)){const g=ARMOUR[id];if(g)for(const k of ['maxHealth','damage','speed','resistance'])b[k]+=g[k==='maxHealth'?'health':k]||0;}return b;}
export function applyProfile(sim){const p=sim.player,b=bonuses(sim.profile),old=p.rpgBonuses||{};for(const [k,v]of Object.entries(b))p[k]=(p[k]||0)+v-(old[k]||0);p.health=Math.min(p.health,p.maxHealth);p.rpgBonuses=b;p.armour={...sim.profile.equipment};p.dye=sim.profile.dye;p.rpgRelic=RELICS[sim.profile.relic]||null;}
export function spendPoint(sim,key){const p=sim.profile;if(ATTRIBUTES[key]&&pointsLeft(p)>0&&p.attributes[key]<ATTRIBUTES[key].max){p.attributes[key]++;applyProfile(sim);sim.emit('profile');return true;}const s=SKILLS[key];if(s&&levelForXP(p.xp).level>=s.level&&pointsLeft(p)>=s.cost&&!p.skills.includes(key)){p.skills.push(key);applyProfile(sim);sim.emit('profile');return true;}return false;}
export function equipArmour(sim,id){const a=ARMOUR[id];if(!a||!sim.profile.owned.includes(id))return false;sim.profile.equipment[a.slot]=id;applyProfile(sim);sim.emit('profile');return true;}
export function gainXP(sim,n){const before=levelForXP(sim.profile.xp).level;sim.profile.xp=int(sim.profile.xp+n);const after=levelForXP(sim.profile.xp).level;sim.emit('profile');if(after>before)sim.emit('rpg-notice',{message:`LEVEL ${after} · +${(after-before)*2} SKILL POINTS · OPEN CHARACTER IN PAUSE`});}
export const QUESTS=[
 {id:'salvage',name:'A coat against the dark',npc:'smith',text:'Recover both supply cases, then return to the armourer.',reward:'160 crowns · rare Bastion coat · 220 XP'},
 {id:'mercy',name:'Mercy on the streets',npc:'medic',text:'Defeat 20 enemies, then return to the field medic.',reward:'180 crowns · rare Pathfinder greaves · 240 XP'},
 {id:'signal',name:'The voice below',npc:'broker',text:'Restore DEAD AIR, then ask the relic dealer about the sealed furnace.',reward:'Reveal the Cinder Confessor · 120 crowns · 180 XP'},
 {id:'atlas',name:'Names of the lost',npc:'broker',text:'Discover four districts, then return to the relic dealer.',reward:'Reveal the Drowned Marshal · 160 crowns · 220 XP'},
 {id:'watch',name:'No one left behind',npc:'broker',text:'Complete all three street encounters, then return to the relic dealer.',reward:'BLACK STAR relic launcher · 300 crowns · 350 XP'}
];
const DEFINITIONS=[{id:'smith',name:'MARA / ARMOURER',kind:'shop',color:0xe3b875},{id:'medic',name:'DR. LENOIR / FIELD MEDIC',kind:'shop',color:0x9fceb0},{id:'broker',name:'NOCTURNE / RELIC DEALER',kind:'shop',color:0xabc8d7},{id:'case-a',name:'SUPPLY CASE / I',kind:'cache',color:0xe3b875},{id:'case-b',name:'SUPPLY CASE / II',kind:'cache',color:0xe3b875},{id:'confessor',name:'THE SEALED FURNACE',kind:'secret',color:0xef9e5b},{id:'marshal',name:'THE DROWNED CHAPEL',kind:'secret',color:0x82dbe6}];
export function makeRPGWorld(layout){
 if(!layout.city)return[];const random=seededRandom((layout.mapSeed||0)^0x41415),chosen=[];
 const points=layout.spawnPoints.filter(q=>!pointBlocked(q.x,q.z,2.8,[...layout.cover,...layout.buildings])&&!waterAt(layout,q.x,q.z)&&Math.hypot(q.x,q.z)>9);
 for(const [i,d]of DEFINITIONS.entries()){
  const available=points.filter(q=>chosen.every(p=>distance(p,q)>12)&&(i<3||Math.hypot(q.x,q.z)>30)).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
  if(!available.length)continue;const q=i<3?available[Math.min(i*2,available.length-1)]:available[Math.floor(random()*available.length)];chosen.push({...d,...q,used:false,revealed:d.kind!=='secret',defeated:false,guards:[]});
 }return chosen;
}
export function initRPG(sim,profile){sim.profile=normalizeProfile(profile);sim.rpg={coins:60,claimed:[],accepted:[],cases:[],kills:0};sim.places=makeRPGWorld(sim.layout);applyProfile(sim);}
export function nearbyPlace(sim){return sim.player.vehicleId?null:(sim.places||[]).filter(q=>q.revealed&&!q.defeated&&!(q.kind==='cache'&&q.used)&&distance(q,sim.player)<4.5&&!sim.blocked(sim.player,q)).sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0]||null;}
export function questProgress(sim,id){const r=sim.rpg;if(id==='salvage')return[r.cases.length,2];if(id==='mercy')return[Math.min(20,r.kills),20];if(id==='signal')return[+(sim.streetEvents.some(j=>j.kind==='relay'&&j.state==='complete')),1];if(id==='atlas')return[Math.min(4,sim.visited.size),4];return[sim.streetEvents.filter(j=>j.state==='complete').length,3];}
export function claimQuest(sim,id,npc){const q=QUESTS.find(q=>q.id===id),r=sim.rpg;if(!q||q.npc!==npc||r.claimed.includes(id)||!r.accepted.includes(id)||nearbyPlace(sim)?.id!==npc)return false;const [n,max]=questProgress(sim,id);if(n<max)return false;
 r.claimed.push(id);const rewards={salvage:[160,220,'warden-chest-1'],mercy:[180,240,'scout-legs-1'],signal:[120,180],atlas:[160,220],watch:[300,350]}[id];r.coins+=rewards[0];if(rewards[2]&&!sim.profile.owned.includes(rewards[2]))sim.profile.owned.push(rewards[2]);if(id==='watch'&&!sim.profile.relics.includes('void'))sim.profile.relics.push('void');
 const secret=id==='signal'?'confessor':id==='atlas'?'marshal':null;if(secret){const p=sim.places.find(p=>p.id===secret);if(p){p.revealed=true;sim.player.waypoint={x:p.x,z:p.z};}}
 gainXP(sim,rewards[1]);sim.emit('rpg-notice',{message:`${q.name.toUpperCase()} · ${q.reward.toUpperCase()}`});return true;
}
export function shopStock(sim,npc){const level=levelForXP(sim.profile.xp).level;return Object.values(ARMOUR).filter(g=>g.level<=level&&(npc==='smith'?g.family==='warden':npc==='medic'?g.family==='scout':g.family==='reaper'));}
export function purchase(sim,id,npc){if(nearbyPlace(sim)?.id!==npc)return false;const a=shopStock(sim,npc).find(g=>g.id===id);if(!a||sim.profile.owned.includes(id)||sim.rpg.coins<a.price)return false;sim.rpg.coins-=a.price;sim.profile.owned.push(id);sim.emit('profile');return true;}
export function interactPlace(sim){const q=nearbyPlace(sim);if(!q)return false;if(q.kind==='shop'){sim.emit('rpg-shop',{id:q.id});sim.pause();return true;}
 if(q.kind==='cache'){q.used=true;sim.rpg.cases.push(q.id);sim.rpg.coins+=35;gainXP(sim,40);sim.emit('rpg-notice',{message:'SUPPLY CASE RECOVERED · +35 CROWNS · RETURN TO MARA'});return true;}
 if(q.used)return true;const safe=sim.layout.spawnPoints.filter(p=>distance(p,q)<16&&distance(p,q)>5&&!pointBlocked(p.x,p.z,2,sim.obstacles)).sort((a,b)=>distance(a,q)-distance(b,q));if(!safe.length){sim.emit('rpg-notice',{message:'THE ENTRANCE IS BLOCKED · CLEAR THE AREA'});return true;}
 q.used=true;const e=sim.spawnEnemy('boss',safe[0].x,safe[0].z);e.bossName=q.id==='confessor'?'CINDER CONFESSOR':'DROWNED MARSHAL';e.bossKind=q.id==='confessor'?'cinder':'dredger';configureBoss(sim,e,{variant:q.id==='confessor'?3:1,name:e.bossName,height:q.id==='confessor'?8.2:7.2});e.secretId=q.id;e.health=e.maxHealth=1800+levelForXP(sim.profile.xp).level*100;e.damage*=1.25;e.elite=true;q.guards=[e.id];sim.waveTotal++;sim.emit('rpg-notice',{message:`SECRET BOSS · ${e.bossName}`});return true;
}
export function rpgKill(sim,e){if(!sim.rpg)return;sim.rpg.kills++;sim.rpg.coins+=e.type==='boss'?70:e.type==='brute'?9:3;gainXP(sim,e.type==='boss'?180:e.type==='brute'?25:10);if(e.secretId){const q=sim.places.find(q=>q.id===e.secretId);if(q)q.defeated=true;const id=e.secretId==='confessor'?'ash':'storm';if(!sim.profile.relics.includes(id))sim.profile.relics.push(id);sim.rpg.coins+=250;sim.emit('profile');sim.emit('rpg-notice',{message:`${RELICS[id].name} DISCOVERED · PERMANENT RELIC · +250 CROWNS`});}}
