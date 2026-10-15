import {Simulation} from './Simulation.js';
import {REGION_FIELDS,safeRegionPoint} from './Regions.js';
import {seededRandom,WEAPONS,ENEMIES,TOTAL_WAVES} from './config.js';
import {normalizeProfile} from './RPG.js';

export const EXPEDITION_KEY='zb-expedition-v1';
export const EXPEDITION_VERSION=1,MAX_EXPEDITION_BYTES=2*1024*1024;
// Bump this when gameplay records become incompatible. Layouts are stored in
// full, so generator changes cannot move a restored doorway or regenerate loot.
const RULES='quarantine-expedition-1';
const GLOBAL_FIELDS=['seed','mode','skin','progression','difficulty','meta','district','nextId','focus','timeScale','focusEnabled','weather','time','wave','kills','score','combo','comboTimer','player','upgrades','upgradeOffers','rerolls','profile','rpg','activeRegionId','regionGates','fountainTick'];
const forbidden=new Set(['__proto__','constructor','prototype']);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const fail=message=>{throw new Error(message);};
function encode(value,depth=0){
 if(depth>40)fail('Expedition data is too deeply nested.');
 if(value===undefined)return {$zb:'undefined'};
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(Number.isNaN(value))fail('Expedition contains an invalid number.');if(Object.is(value,-0))return {$zb:'negative-zero'};return Number.isFinite(value)?value:{$zb:value>0?'infinity':'negative-infinity'};}
 if(Array.isArray(value))return value.map(v=>encode(v,depth+1));
 if(value instanceof Map)return {$zb:'map',values:[...value].map(([k,v])=>[encode(k,depth+1),encode(v,depth+1)])};
 if(value instanceof Set)return {$zb:'set',values:[...value].map(v=>encode(v,depth+1))};
 if(!plain(value))fail('Expedition contains unsupported data.');
 return Object.fromEntries(Object.entries(value).map(([k,v])=>{if(forbidden.has(k)||k==='$zb')fail('Expedition contains an invalid field.');return [k,encode(v,depth+1)];}));
}
function decode(value,depth=0,budget={left:300000}){
 if(--budget.left<0||depth>40)fail('Expedition data exceeds its limits.');
 if(value===null||typeof value==='boolean'||typeof value==='string')return value;
 if(typeof value==='number'){if(!finite(value))fail('Invalid expedition number.');return value;}
 if(Array.isArray(value))return value.map(v=>decode(v,depth+1,budget));
 if(!plain(value))fail('Invalid expedition data.');
 if(Object.hasOwn(value,'$zb')){
  const type=value.$zb;
  if(['undefined','infinity','negative-infinity','negative-zero'].includes(type)&&Object.keys(value).length===1)return type==='undefined'?undefined:type==='negative-zero'?-0:type==='infinity'?Infinity:-Infinity;
  if(!['map','set'].includes(type)||!Array.isArray(value.values)||Object.keys(value).length!==2)fail('Invalid expedition collection.');
  if(type==='set')return new Set(value.values.map(v=>decode(v,depth+1,budget)));
  return new Map(value.values.map(pair=>{if(!Array.isArray(pair)||pair.length!==2)fail('Invalid expedition map.');return pair.map(v=>decode(v,depth+1,budget));}));
 }
 return Object.fromEntries(Object.entries(value).map(([k,v])=>{if(forbidden.has(k))fail('Invalid expedition field.');return [k,decode(v,depth+1,budget)];}));
}
function hash(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return (n>>>0).toString(16).padStart(8,'0');}
const profileIdentity=p=>JSON.stringify(p?normalizeProfile(p):null);
const phase=sim=>sim.state==='paused'?sim.previousState:sim.state;
export function checkpointUnavailable(sim){
 const p=sim?.player;
 if(!p||!['city','campaign'].includes(sim.mode)||!['playing','extracting'].includes(phase(sim))||p.health<=0||sim.pendingTravel||sim.interior)return 'Return to the outdoor expedition before saving.';
 if(p.vehicleId)return 'Park and leave your vehicle before saving.';
 if(p.grounded===false||Math.abs(p.y||0)>.15||p.grapple||p.dash>0||p.meleeAttack||p.throwAnimation>0)return 'Stand still on the ground before saving.';
 if(sim.focus?.active)return 'End Focus before saving.';
 if(!safeRegionPoint(sim,p,.7)||(sim.enemies||[]).some(e=>e.health>0&&Math.hypot(e.x-p.x,e.z-p.z)<10))return 'Move away from nearby threats before saving.';
 return null;
}
function regionData(sim){return Object.fromEntries(REGION_FIELDS.map(k=>[k,sim[k]]));}
export function captureExpedition(sim,{now=new Date()}={}){
 const reason=checkpointUnavailable(sim);if(reason)fail(reason);
 if(typeof sim.random?.getState!=='function')fail('This expedition uses an unsupported random generator.');
 const data={global:Object.fromEntries(GLOBAL_FIELDS.map(k=>[k,sim[k]])),current:regionData(sim),regions:sim.regions instanceof Map?new Map([...sim.regions].filter(([id])=>id!==sim.activeRegionId)):null,state:phase(sim),randomState:sim.random.getState()};
 const payload=encode(data),body=JSON.stringify(payload);
 const text=JSON.stringify({format:'zombie-bagarre-expedition',version:EXPEDITION_VERSION,rules:RULES,savedAt:now.toISOString(),checksum:hash(body),payload});
 if(new TextEncoder().encode(text).length>MAX_EXPEDITION_BYTES)fail('This expedition is too large to save safely. Your existing checkpoint is unchanged.');
 // Apply the same validation used on load before any storage is touched.
 parseExpedition(text);return text;
}
function validateRegion(r){
 if(!plain(r)||!plain(r.layout)||!plain(r.layout.bounds)||!Array.isArray(r.layout.cover)||!Array.isArray(r.props)||!Array.isArray(r.enemies)||!Array.isArray(r.bullets)||!Array.isArray(r.hazards)||!Array.isArray(r.pickups)||!Array.isArray(r.fires)||!(r.visited instanceof Set))fail('The expedition region is incomplete.');
 const b=r.layout.bounds;if(!['minX','maxX','minZ','maxZ'].every(k=>finite(b[k]))||b.maxX<=b.minX||b.maxZ<=b.minZ)fail('The expedition bounds are invalid.');
 for(const list of [r.props,r.enemies,r.bullets,r.hazards,r.pickups,r.fires,r.structures||[]]){
  if(list.length>5000)fail('The expedition has too many entities.');
  for(const e of list)if(!plain(e)||!finite(e.x)||!finite(e.z))fail('The expedition contains an invalid entity.');
 }
 for(const e of r.enemies)if(!Object.hasOwn(ENEMIES,e.type)||!finite(e.health)||!finite(e.maxHealth)||!Number.isInteger(e.id))fail('The expedition contains an invalid enemy.');
 for(const p of r.props)if(!finite(p.health)||!finite(p.maxHealth)||!finite(p.w)||!finite(p.d))fail('The expedition contains an invalid object.');
 if(r.rubblePiles!==undefined&&!(r.rubblePiles instanceof Map))fail('The expedition rubble is invalid.');
 if(r.interiorState!==undefined&&(!plain(r.interiorState)||!['manifest','visited','collected'].every(k=>Array.isArray(r.interiorState[k]))))fail('The expedition interiors are invalid.');
}
export function parseExpedition(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_EXPEDITION_BYTES)fail('The expedition checkpoint exceeds its size limit.');
 let envelope;try{envelope=JSON.parse(text);}catch{fail('The expedition checkpoint is not readable JSON.');}
 if(!plain(envelope)||envelope.format!=='zombie-bagarre-expedition'||envelope.version!==EXPEDITION_VERSION||envelope.rules!==RULES)fail('This expedition checkpoint requires a compatible game version.');
 if(!Number.isFinite(Date.parse(envelope.savedAt))||envelope.checksum!==hash(JSON.stringify(envelope.payload)))fail('The expedition checkpoint is damaged.');
 const data=decode(envelope.payload),g=data?.global,p=g?.player;
 if(!plain(data)||!plain(g)||!plain(p)||!['playing','extracting'].includes(data.state)||!['city','campaign'].includes(g.mode)||!['hero','sandbox'].includes(g.progression)||!['standard','relaxed','nightmare'].includes(g.difficulty))fail('The expedition state is invalid.');
 if(Object.keys(g).some(k=>!GLOBAL_FIELDS.includes(k))||Object.keys(data.current||{}).some(k=>!REGION_FIELDS.includes(k)))fail('The expedition has unsupported fields.');
 for(const k of ['seed','district','nextId','wave','kills','score','rerolls'])if(!Number.isInteger(g[k])||k!=='seed'&&g[k]<0)fail('The expedition counters are invalid.');
 if(g.wave<1||g.wave>TOTAL_WAVES||g.district>7||g.nextId<1||!finite(g.time)||g.time<0)fail('The expedition timeline is invalid.');
 if(!['x','y','z','health','maxHealth'].every(k=>finite(p[k]))||p.health<=0||p.health>p.maxHealth||!Object.hasOwn(WEAPONS,p.weapon)||!Array.isArray(p.equipped)||!p.equipped.length||p.equipped.length>2||p.equipped.some(k=>!Object.hasOwn(WEAPONS,k)))fail('The expedition survivor is invalid.');
 if(!plain(g.weather)||!plain(g.weather.options)||!plain(g.focus)||!Array.isArray(g.upgrades)||!Array.isArray(g.upgradeOffers)||!plain(p.magazines)||!plain(p.reloads)||!plain(p.weaponTimers))fail('The expedition combat state is incomplete.');
 if(g.profile!==undefined&&g.profile!==null&&(!plain(g.profile)||!plain(g.rpg)||!['accepted','claimed','cases','contacts'].every(k=>Array.isArray(g.rpg[k]))))fail('The expedition quest record is incomplete.');
 validateRegion(data.current);
 if(data.regions!==null&&!(data.regions instanceof Map))fail('The expedition region ledger is invalid.');
 if(data.regions){if(!['city','country-road'].includes(g.activeRegionId)||!plain(g.regionGates)||data.regions.size>1)fail('The expedition region ledger is invalid.');for(const[id,r]of data.regions){if(!['city','country-road'].includes(id)||id===g.activeRegionId)fail('The expedition region is invalid.');validateRegion(r);if(!['playing','extracting'].includes(r.state)||!finite(r.parkedAt))fail('The parked expedition is invalid.');}}
 for(const r of [data.current,...(data.regions?.values()||[])])for(const list of [r.enemies,r.bullets,r.pickups,r.props])for(const e of list)if(typeof e.id==='number'&&(!Number.isInteger(e.id)||e.id>=g.nextId))fail('The expedition entity sequence is invalid.');
 const random=seededRandom();random.setState(data.randomState);
 return {data,savedAt:envelope.savedAt};
}
export function restoreExpedition(text,{profile}={}){
 const {data}=parseExpedition(text),g=data.global;
 if(profile!==undefined&&profileIdentity(profile)!==profileIdentity(g.profile))fail('Your character changed after this checkpoint. Start a fresh expedition to protect your progress.');
 // Build off to the side. No constructor/start/reward call is allowed here:
 // those regenerate loot, heal, reset quests or advance the random sequence.
 const sim=Object.assign(Object.create(Simulation.prototype),g,data.current,{regions:data.regions,state:'paused',previousState:data.state,events:[],navigation:new Map(),collisionIndex:null,questRoute:null,guideRoute:null,traversalTarget:null,interior:null,pendingTravel:null,choices:[]});
 sim.random=seededRandom();sim.random.setState(data.randomState);sim.obstacles=sim.props.filter(p=>p.health>0);
 Object.assign(sim.player,{moving:false,moveX:0,moveZ:0,attackHeld:false,aiming:false,meleeBuffer:null,jumpBuffer:0});
 const reason=checkpointUnavailable(sim);if(reason)fail('The saved location is unsafe. '+reason);
 return sim;
}

export class ExpeditionStore{
 constructor(storage,{ephemeral=false}={}){this.storage=storage;this.ephemeral=ephemeral;this.issue='';this.expected=undefined;this.observed=undefined;this.memory=null;}
 device(){return typeof this.storage==='function'?this.storage():this.storage;}
 raw(){return this.ephemeral?this.memory:this.device().getItem(EXPEDITION_KEY);}
 hasCheckpoint(){this.observed=this.raw();return this.observed!==null;}
 summary(){try{const raw=this.raw();this.observed=raw;if(raw===null){this.issue='';return null;}const{data,savedAt}=parseExpedition(raw);this.issue='';return{wave:data.global.wave,regionId:data.global.activeRegionId||data.global.mode,savedAt};}catch(error){this.issue=error.message;return null;}}
 save(sim){const text=captureExpedition(sim),current=this.raw();if(current!==null&&current!==this.expected)fail('Another checkpoint is stored. Resume or explicitly discard it before saving this expedition.');if(this.ephemeral)this.memory=text;else this.device().setItem(EXPEDITION_KEY,text);if(this.raw()!==text)fail('The expedition could not be saved. Keep this game open and retry.');this.expected=text;this.issue='';return this.summary();}
 read(options){const text=this.raw();if(text===null)return null;const sim=restoreExpedition(text,options);this.expected=text;return sim;}
 consume(){const current=this.raw();if(this.expected===undefined||current!==this.expected)fail('Another game tab changed this checkpoint. Reload before resuming.');this.remove();}
 remove(){
  if(this.ephemeral)this.memory=null;else this.device().removeItem(EXPEDITION_KEY);
  // A successful native removeItem is the commit point. If storage becomes
  // unreadable afterwards, keep the already activated expedition: rolling it
  // back would destroy the only remaining copy after deleting its checkpoint.
  // A readable non-null result still catches a genuinely ineffective removal.
  let remaining=null,warning='';
  try{remaining=this.raw();}catch{warning='Checkpoint removal completed, but browser storage could not be rechecked.';}
  if(remaining!==null)fail('The checkpoint could not be cleared. Retry before continuing.');
  this.expected=undefined;this.observed=null;this.issue=warning;
 }
 discard(){if(this.observed===undefined||this.raw()!==this.observed)fail('Another game tab changed this checkpoint. Reload before replacing it.');this.remove();}
}
