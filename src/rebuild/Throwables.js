import {throwableLock} from './Progression.js';
import {waterAt} from './City.js';
import {distance,clamp} from './config.js';
export const THROWABLES={
 frag:{name:'M67 / FRAGMENTATION',short:'FRAG',color:0xb9bc84,radius:4.3,damage:180,fuse:.95,description:'High blast damage, knockback and structural destruction.'},
 molotov:{name:'WILDFIRE / FIRE BOTTLE',short:'FIRE',color:0xeaa26b,radius:3.5,damage:45,fuse:.66,description:'Shatters on landing. Ignites enemies and flammable scenery; leaves seven seconds of fire. Water quenches it.'},
 frost:{name:'WHITEOUT / FROST CANISTER',short:'FROST',color:0xa7deed,radius:4.8,damage:35,fuse:.85,description:'Quenches flames and slows nearby enemies for five seconds. Wet enemies take extra shock-charge damage.'},
 shock:{name:'BLACKOUT / SHOCK CHARGE',short:'SHOCK',color:0x92e6df,radius:4.2,damage:90,fuse:.9,description:'Electrical discharge slows enemies and deals 50% extra damage to wet targets. Reaches farther in water.'}
};
export function throwOrdnance(sim,aim){
 const p=sim.player;if(throwableLock(sim,p.throwable)||p.grenades<=0||p.throwAnimation>0||p.vehicleId||p.dash>0)return false;
 const key=THROWABLES[p.throwable]?p.throwable:'frag',w=THROWABLES[key],a=aim||{x:p.x+Math.sin(p.angle)*6,z:p.z+Math.cos(p.angle)*6},d=distance(a,p),scale=Math.min(1,10/(d||1));
 p.meleeAttack=null;p.meleeBuffer=null;p.swing=0;p.grenades--;p.throwAnimation=.5;
 sim.hazards.push({id:sim.nextId++,x:p.x+(a.x-p.x)*scale,z:p.z+(a.z-p.z)*scale,radius:w.radius*p.blastRadius,damage:w.damage*p.blast,timer:w.fuse,duration:w.fuse,flight:.65,originX:p.x,originZ:p.z,thrown:true,friendly:true,throwable:key,source:key});sim.emit('throw',{x:p.x,z:p.z,throwable:key});return true;
}
export function detonateThrowable(sim,h){
 const key=h.throwable||'frag';if(key==='frag'){sim.blast(h.x,h.z,h.radius,h.damage,'explosion','grenade');return;}
 const water=waterAt(sim.layout,h.x,h.z),radius=h.radius*(key==='shock'&&water?1.3:1);
 if(water)sim.splashWater(h.x,h.z,2);
 if(key==='frost')sim.splashWater(h.x,h.z,Math.max(1,(radius-.6)/.7));
 const damp=water||(sim.wetGround||[]).some(w=>distance(w,h)<w.radius);
 if(key==='molotov'&&damp){sim.emit('steam',{x:h.x,z:h.z,power:4});return;}
 for(const e of sim.enemies){if(e.health<=0||distance(e,h)>radius+e.radius||sim.blocked(h,e,.05))continue;
  const type=key==='molotov'?'fire':key==='frost'?'frost':'electric',damage=h.damage*(key==='shock'&&e.wet>0?1.5:1);
  sim.damageEnemy(e,damage,0,0,{kind:type});
  if(key==='molotov'&&!(e.wet>0)){e.burning=Math.max(e.burning||0,5);e.burnWeapon=null;sim.emit('ignite',{x:e.x,z:e.z});}
  if(key==='frost'){e.slow=Math.max(e.slow||0,5);e.chilled=Math.max(e.chilled||0,5);}
  if(key==='shock'){e.electrified=Math.max(e.electrified||0,2.5);e.slow=Math.max(e.slow||0,2);sim.emit('arc',{x:h.x,z:h.z,toX:e.x,toZ:e.z,tier:2});}
 }
 if(key==='molotov'){
  sim.addFire(h.x,h.z,radius*.65);
  for(const prop of sim.props)if(prop.health>0){const x=clamp(h.x,prop.x-prop.w/2,prop.x+prop.w/2),z=clamp(h.z,prop.z-prop.d/2,prop.z+prop.d/2);if(Math.hypot(x-h.x,z-h.z)<radius&&!sim.blocked(h,{x:x+(h.x-x)*.02,z:z+(h.z-z)*.02},0))sim.igniteProp(prop,x,z,.9,6);}
 }
 sim.emit('ordnance-burst',{x:h.x,z:h.z,radius,throwable:key,color:THROWABLES[key].color});
}
