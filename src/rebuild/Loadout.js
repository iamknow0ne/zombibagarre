import {WEAPONS} from './config.js';
export function normalizeLoadout(keys){
 const valid=keys.filter(k=>WEAPONS[k]);
 if(!valid.length)return ['carbine'];
 return WEAPONS[valid[0]].melee?[valid[0]]:valid.filter(k=>!WEAPONS[k].melee).slice(0,2);
}
export function toggleLoadout(keys,key){
 if(!WEAPONS[key])return normalizeLoadout(keys);
 if(WEAPONS[key].melee||WEAPONS[keys[0]]?.melee)return [key];
 const next=[...keys],i=next.lastIndexOf(key);
 if(i>=0){if(next.length>1)next.splice(i,1);}
 else if(next.length<2)next.push(key);else next[1]=key;
 return normalizeLoadout(next);
}
export const slotKey=(equipped,key,index)=>index===1&&equipped[0]===key?'offhand':key;
export const isMelee=p=>!!WEAPONS[p.weapon]?.melee;
