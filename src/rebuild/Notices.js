import {ATTRIBUTES,SKILLS,ARMOUR,QUESTS,pointsLeft,skillLock,questState,questVisible} from './RPG.js';
import {weaponTier,TIER_NAMES} from './Evolution.js';
import {WEAPONS} from './config.js';

// Action reminders are derived from current state, never from stale counters.
// Informational discoveries are expedition-local and acknowledged separately.
export class Notices {
 constructor(){this.sim=null;this.history=[];this.tiers={};this.owned=new Set();}
 sync(sim){
  if(this.sim!==sim){this.sim=sim;this.history=[];this.tiers={};this.owned=new Set(sim.profile?.owned||[]);}
  for(const key of Object.keys(sim.player?.mastery||{})){
   const tier=weaponTier(sim.player,key);
   if(tier>(this.tiers[key]||0)&&WEAPONS[key])this.add({id:`weapon-${key}-${tier}`,icon:'wrench',title:`${WEAPONS[key].name} evolved`,detail:`${TIER_NAMES[tier]} tier applied automatically through combat mastery. Inspect your weapons in Inventory.`,tab:'equipment'});
   this.tiers[key]=tier;
  }
  for(const id of sim.profile?.owned||[]){if(!this.owned.has(id)&&ARMOUR[id])this.add({id:`gear-${id}`,icon:'shield',title:`New gear: ${ARMOUR[id].name}`,detail:'Added to your permanent stash. Compare it with your equipped armour.',tab:'equipment',item:id});this.owned.add(id);}
  return this.items(sim);
 }
 add(item){if(!this.history.some(n=>n.id===item.id))this.history.unshift({...item,unread:true});this.history.length=Math.min(20,this.history.length);}
 items(sim=this.sim){
  if(!sim?.profile)return[];
  const p=sim.profile,points=pointsLeft(p),out=[];
  if(points>0&&(Object.entries(ATTRIBUTES).some(([k,a])=>p.attributes[k]<a.max)||Object.keys(SKILLS).some(k=>!skillLock(p,k))))out.push({id:'points',icon:'tree',title:`${points} skill point${points===1?'':'s'} to spend`,detail:'Strengthen your attributes or unlock a skill in your permanent training tree.',tab:'attributes',action:true});
  if(sim.layout?.city)for(const q of QUESTS)if(questVisible(sim,q)&&questState(sim,q)==='ready')out.push({id:`quest-${q.id}`,icon:'book',title:`Reward ready: ${q.name}`,detail:'Return to your contact to collect it. Open the journal to track the destination.',tab:'journal',quest:q.id,action:true});
  return [...out,...this.history];
 }
 acknowledge(){for(const n of this.history)n.unread=false;}
 count(){return this.items().filter(n=>n.action||n.unread).length;}
}
