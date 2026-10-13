import {WEAPONS} from './config.js';
import {normalizeLoadout} from './Loadout.js';
export const TRAINING={
 closequarters:{name:'Breach training',text:'Unlock M12 shotgun and HATCHET axe.',level:2,cost:1,branch:'arsenal',icon:'axe',weapons:['shotgun','axe']},
 automatic:{name:'Automatic discipline',text:'Unlock VX-9 SMG.',level:2,cost:1,branch:'arsenal',icon:'rounds',weapons:['smg']},
 precision:{name:'Precision training',text:'Unlock JUDGEMENT revolver and LONGSHOT rifle.',level:3,cost:1,branch:'arsenal',icon:'target',weapons:['revolver','marksman']},
 duelist:{name:'Two hands, two guns',text:'Equip two firearms, including matching pairs. Each keeps its own magazine.',level:5,cost:2,parent:'automatic',branch:'arsenal',icon:'dualgun',dualWield:true},
 polearms:{name:'Weapons of the old world',text:'Unlock GEMINI twin swords, PILGRIM spear and GRAVEMAKER hammer.',level:4,cost:2,parent:'closequarters',branch:'arsenal',icon:'swords',weapons:['dual','spear','hammer']},
 demolition:{name:'Demolition licence',text:'Unlock THUMPER grenade launcher.',level:6,cost:2,parent:'closequarters',branch:'arsenal',icon:'bomb',weapons:['launcher']},
 ignition:{name:'Controlled ignition',text:'Unlock CINDER flamethrower and WILDFIRE bottles.',level:4,cost:2,parent:'precision',branch:'arsenal',icon:'flame',weapons:['flame'],throwables:['molotov']},
 conduction:{name:'Conductive warfare',text:'Unlock VOLTA arc projector, WHITEOUT frost canisters and BLACKOUT shock charges.',level:7,cost:2,parent:'ignition',branch:'arsenal',icon:'bolt',weapons:['arc'],throwables:['frost','shock']}
};
export const trainingFor=(key,kind='weapons')=>Object.entries(TRAINING).find(([,s])=>s[kind]?.includes(key));
export const testing=sim=>sim.progression!=='hero';
export const canDualWield=sim=>testing(sim)||sim.profile?.skills?.includes('duelist');
export function weaponLock(sim,key){
 if(!WEAPONS[key])return 'Unknown weapon';if(testing(sim)||['carbine','katana'].includes(key))return '';
 if(sim.profile?.relics?.some(id=>({ash:'katana',storm:'arc',void:'launcher'})[id]===key))return '';
 const entry=trainingFor(key);return entry&&!sim.profile?.skills?.includes(entry[0])?`Learn ${entry[1].name} · LV ${entry[1].level}`:'';
}
export function throwableLock(sim,key){if(testing(sim)||key==='frag')return '';const entry=trainingFor(key,'throwables');return entry&&!sim.profile?.skills?.includes(entry[0])?`Learn ${entry[1].name} · LV ${entry[1].level}`:'';}
export const availableWeapons=sim=>Object.keys(WEAPONS).filter(k=>!weaponLock(sim,k));
export function permittedLoadout(sim,keys){return normalizeLoadout(keys.filter(k=>!weaponLock(sim,k))).slice(0,canDualWield(sim)?2:1);}
export function enforceProgression(sim){sim.setLoadout(permittedLoadout(sim,sim.player.equipped));if(throwableLock(sim,sim.player.throwable))sim.player.throwable='frag';}
