// Critical rolls belong to damage resolution, not the presentation or particle RNG.
export const BASE_CRIT={carbine:.06,shotgun:.05,smg:.04,revolver:.12,marksman:.16,flame:.02,launcher:.05,arc:.06,katana:.10,dual:.08,axe:.12,spear:.14,hammer:.07};
export function criticalChance(player,key,tier=0){return key in BASE_CRIT?Math.min(.8,BASE_CRIT[key]+(player.crit||0)+Math.max(0,Math.min(3,tier))*.02):0;}
export function resolveCritical(player,impact,roll){
 const chance=impact.periodic||impact.execution?0:criticalChance(player,impact.weapon,impact.tier);
 return {critical:chance>0&&roll<chance,multiplier:chance>0&&roll<chance?2+(player.critPower||0):1};
}
export const DAMAGE_STYLES={
 frost:{color:'#b5eaff',label:'FROST'},ballistic:{color:'#f5edcf',label:'BULLET'},fire:{color:'#ffab62',label:'BURN'},electric:{color:'#8fe6ff',label:'SHOCK'},
 explosion:{color:'#ff9585',label:'BLAST'},slice:{color:'#bdf3be',label:'SLICE'},melee:{color:'#bdf3be',label:'IMPACT'},impact:{color:'#ddd1fa',label:'IMPACT'}
};
export function damageStyle(hit){return DAMAGE_STYLES[hit.kind]||DAMAGE_STYLES.impact;}
export function damageText(amount){return amount<1?amount.toFixed(1):Math.round(amount).toLocaleString('en-US');}
export function damageSize(amount,critical=false){return Math.min(39,18+Math.log2(1+Math.max(0,amount)/10)*3.5)+(critical?5:0);}
// Merge a short burst only; sustained fire must never create an immortal number.
export class DamageFeed {
 constructor(){this.clear();}
 clear(){this.hits=[];this.clock=0;this.serial=0;}
 add(hit){
  if(!Number.isFinite(hit.amount)||hit.amount<=0)return;
  const key=[hit.enemyId,hit.weapon,hit.kind,!!hit.critical,!!hit.headshot,!!hit.finisher,!!hit.execution,!!hit.periodic].join(':');
  const old=this.hits.findLast(h=>h.key===key&&this.clock-h.born<(hit.periodic?.42:.12));
  if(old){old.amount+=hit.amount;old.count++;old.killed||=hit.killed;old.pulse=this.clock;return;}
  const lane=this.hits.filter(h=>h.enemyId===hit.enemyId).length%4;
  this.hits.push({...hit,key,born:this.clock,pulse:this.clock,count:1,lane,serial:this.serial++,life:hit.critical?1.2:hit.periodic?.95:1.05});
  if(this.hits.length>48)this.hits.shift();
 }
 update(dt){this.clock+=Math.max(0,dt);this.hits=this.hits.filter(h=>this.clock-h.born<h.life);}
}
