import {normalizeProfile} from './RPG.js';
import {META_UPGRADES} from './config.js';
import {validCalibration} from './Gamepad.js';

export const SAVE_KEY='zb-save-v1', RECOVERY_KEY='zb-save-before-restore';
export const SAVE_FORMAT='zombie-bagarre', SAVE_VERSION=1, MAX_BACKUP_BYTES=256*1024;
export const LEGACY_KEYS={profile:'zb-rpg-profile',record:'zb-quarantine-record',settings:'zb-quarantine-settings'};
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const integer=(value,max=1e9)=>Math.min(max,Math.max(0,Math.floor((typeof value==='number'||typeof value==='string')&&Number.isFinite(Number(value))?Number(value):0)));
export function normalizeRecord(raw={}){
 if(!object(raw))raw={};
 return {score:integer(raw.score),wins:integer(raw.wins),scrap:integer(raw.scrap),meta:Object.fromEntries(META_UPGRADES.map(u=>[u.id,integer(raw.meta?.[u.id],u.max)]))};
}
// Settings accept scalars plus the two documented controller records. Drop
// unexpected object values before downstream numeric coercion can throw.
export function normalizeSavedSettings(raw={}){
 if(!object(raw))return {};
 const clean=(value,depth=0)=>{
  if(typeof value==='boolean'||typeof value==='string'&&value.length<=1000||typeof value==='number'&&Number.isFinite(value))return value;
  if(depth>=5||!value)return undefined;
  if(Array.isArray(value))return value.slice(0,64).map(v=>clean(v,depth+1));
  if(object(value))return Object.fromEntries(Object.entries(value).slice(0,100).filter(([k])=>!['__proto__','prototype','constructor','toString','valueOf'].includes(k)).map(([k,v])=>[k,clean(v,depth+1)]).filter(([,v])=>v!==undefined));
 };
 const settings=Object.fromEntries(Object.entries(raw).filter(([k,v])=>!['__proto__','prototype','constructor','toString','valueOf'].includes(k)&&(!object(v)&&!Array.isArray(v)||['bindings','rawMapping'].includes(k))).map(([k,v])=>[k,clean(v)]).filter(([,v])=>v!==undefined));
 if(Object.hasOwn(settings,'volume')){
  const value=settings.volume,numeric=typeof value==='number'||typeof value==='string'&&value.trim()!=='';
  if(numeric&&Number.isFinite(Number(value)))settings.volume=Math.max(0,Math.min(100,Number(value)));
  else delete settings.volume;
 }
 const map=settings.rawMapping;
 // Malformed array-like records must never reach the controller sampler. A
 // rejected calibration falls back to the browser mapping and can be retaught.
 if(map&&!validCalibration(map,map.id))delete settings.rawMapping;
 return settings;
}
export function normalizeSave(data={}){
 if(!object(data))data={};
 return {profile:normalizeProfile(data.profile),record:normalizeRecord(data.record),settings:normalizeSavedSettings(data.settings)};
}
export function backupText(data,now=new Date()){
 const text=JSON.stringify({format:SAVE_FORMAT,version:SAVE_VERSION,savedAt:now.toISOString(),data:normalizeSave(data)},null,2);
 if(new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw new Error('This backup contains too much save data. Your current progress has not changed.');
 return text;
}
export function parseBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw new Error('This backup is too large. Choose a Zombie Bagarre backup under 256 KB.');
 let value;try{value=JSON.parse(text);}catch{throw new Error('This file is not valid JSON. Your current progress has not changed.');}
 if(!object(value)||value.format!==SAVE_FORMAT)throw new Error('This is not a Zombie Bagarre backup.');
 if(value.version!==SAVE_VERSION)throw new Error(value.version>SAVE_VERSION?'This backup needs a newer version of the game.':'This backup version is not supported.');
 if(!object(value.data)||!['profile','record','settings'].every(k=>object(value.data[k])))throw new Error('The backup is missing its character, base camp or settings.');
 const p=value.data.profile;
 if(p.version!==1||typeof p.xp!=='number'||!Number.isFinite(p.xp)||p.xp<0||!Array.isArray(p.skills)||!Array.isArray(p.owned)||!Array.isArray(p.relics)||!object(p.attributes)||!object(p.equipment))throw new Error('The character record is incomplete or uses an unsupported version.');
 const data=normalizeSave(value.data);
 // Compact input can grow when written in the portable format. Validate that
 // representation too, before restore makes either storage write.
 backupText(data);
 return data;
}

export class SaveStore {
 constructor(storage,{ephemeral=false,schedule=fn=>setTimeout(fn,600),cancel=id=>clearTimeout(id)}={}){
  Object.assign(this,{storage,ephemeral,schedule,cancel});this.listeners=new Set();this.data=normalizeSave();this.dirty=false;this.timer=null;this.issue='';this.locked=false;this.recovered=false;this.lastStored=null;this.originalText=null;this.load();
 }
 device(){return typeof this.storage==='function'?this.storage():this.storage;}
 load(){
  if(this.ephemeral)return;
  try{
   const device=this.device(),saved=device.getItem(SAVE_KEY);this.lastStored=saved;
   if(saved!==null){try{this.data=parseBackup(saved);}catch(error){this.issue=error.message+' The stored save is protected; export the original before replacing it.';this.locked=true;}return;}
   const legacy={};
   for(const [field,key]of Object.entries(LEGACY_KEYS)){
    const raw=device.getItem(key);if(raw===null)continue;
    try{const value=JSON.parse(raw);if(!object(value))throw new Error();legacy[field]=value;}catch{this.recovered=true;}
   }
   this.originalText=JSON.stringify(Object.fromEntries(Object.entries(LEGACY_KEYS).map(([field,key])=>[field,device.getItem(key)])),null,2);
   if(legacy.profile?.version>1){this.locked=true;this.issue='Your character needs a newer game version. The original save is protected.';return;}
   this.data=normalizeSave(legacy);
   if(this.recovered)this.issue='Some old save data could not be read. Valid records were recovered; export a backup before continuing.';
  }catch{this.locked=true;this.issue='Browser storage could not be read. Progress works for this session; export a backup before closing. Reload once storage is available.';}
 }
 subscribe(listener){this.listeners.add(listener);listener(this);return()=>this.listeners.delete(listener);}
 notify(){for(const listener of this.listeners)listener(this);}
 read(field){return clone(this.data[field]);}
 set(field,value){
  // The caller reloads after replacement. Ignore old-world pagehide/blur writes
  // in that interval so they cannot immediately overwrite the imported hero.
  if(this.restored)return false;
  if(!Object.hasOwn(LEGACY_KEYS,field))throw new Error('Unknown save field');
  const next=normalizeSave({...this.data,[field]:value});
  if(JSON.stringify(next[field])===JSON.stringify(this.data[field]))return false;
  this.data=next;this.dirty=true;
  if(this.timer===null&&!this.ephemeral&&!this.locked)this.timer=this.schedule(()=>{this.timer=null;this.flush();});
 }
 flush(){
  if(this.timer!==null){this.cancel(this.timer);this.timer=null;}
  if(this.ephemeral)return true;
  if(this.locked)return false;
  if(!this.dirty)return !this.issue;
  try{
   if(this.checkExternal())return false;
   const text=backupText(this.data);this.device().setItem(SAVE_KEY,text);this.lastStored=text;this.dirty=false;this.issue='';this.notify();return true;
  }
  catch{this.issue='Progress could not be saved. Export a backup before closing, or free browser storage and retry.';this.notify();return false;}
 }
 checkExternal(){
  if(this.ephemeral||this.locked)return false;
  if(this.device().getItem(SAVE_KEY)===this.lastStored)return false;
  this.locked=true;this.issue='Another game tab changed this save. Export this session if needed, then reload to use the newer save. Saving is paused to protect both characters.';this.notify();return true;
 }
 export(){return backupText(this.data);}
 original(){if(this.ephemeral)return this.export();return this.originalText&&this.recovered?this.originalText:this.device().getItem(SAVE_KEY)??this.originalText??this.export();}
 recovery(){if(this.ephemeral)throw new Error('Recovery copies are unavailable in test workshops.');const raw=this.device().getItem(RECOVERY_KEY);if(!raw)throw new Error('There is no pre-restore copy in this browser.');return raw;}
 restore(text){
  const next=parseBackup(text); // Validate before touching either record.
  if(this.ephemeral)throw new Error('Save replacement is disabled in test workshops.');
  const device=this.device(),old=device.getItem(SAVE_KEY),previous=this.locked||old!==this.lastStored?(old??this.originalText??this.export()):this.export();
  // A single primary record means a failed write cannot replace only half a hero.
  device.setItem(RECOVERY_KEY,previous);
  const nextText=backupText(next);device.setItem(SAVE_KEY,nextText);
  if(this.timer!==null){this.cancel(this.timer);this.timer=null;}
  this.data=next;this.lastStored=nextText;this.dirty=false;this.locked=false;this.recovered=false;this.originalText=null;this.issue='';this.restored=true;this.notify();return next;
 }
}
