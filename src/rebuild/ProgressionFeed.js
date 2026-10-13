import {WEAPONS} from './config.js';
import {TIER_NAMES} from './Evolution.js';
export class ProgressionFeed{
 constructor(){this.items=[];this.clock=0;}
 clear(){this.items=[];this.clock=0;}
 add(e){
  let item;if(e.type==='evolution')item={key:`weapon:${e.weapon}`,title:`${WEAPONS[e.weapon]?.name||e.weapon} EVOLVED`,detail:`${TIER_NAMES[e.tier]} · ${e.tier===3?e.name:'WEAPON MASTERY'}`,color:'#9cdae0'};
  if(e.type==='progression')item={key:e.category==='level'?'level':`${e.category}:${e.title}`,title:e.title,detail:e.detail,color:e.category==='level'?'#f4c77a':e.category==='skill'?'#b5d49a':'#edb591'};
  if(!item)return;this.items=this.items.filter(i=>i.key!==item.key);this.items.push({...item,born:this.clock,life:3.4});if(this.items.length>3)this.items.shift();
 }
 update(dt){this.clock+=Math.max(0,dt);this.items=this.items.filter(i=>this.clock-i.born<i.life);}
}
