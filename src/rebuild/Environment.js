import {clamp} from './config.js';
import {waterAt} from './City.js';
import {shelteredAt} from './Weather.js';

export const fuelFor=p=>p.kind==='planter'?16:p.kind==='crate'?12:['barrel','car'].includes(p.kind)?9:p.material==='wood'?15:0;
export function buildingSurfaces(b){
 const cells=[],floors=Math.max(1,Math.round((b.h||8)/2.8));
 for(let f=0;f<floors;f++)for(const face of [0,1,2,3]){
  const horizontal=face<2,length=horizontal?b.w:b.d,n=Math.max(1,Math.floor(length/2.7));
  for(let i=0;i<n;i++){const offset=(i+.5)*length/n-length/2;cells.push({x:b.x+(horizontal?offset:(face===2?-1:1)*b.w/2),z:b.z+(horizontal?(face===0?-1:1)*b.d/2:offset),y:.9+f*2.8,face,floor:f,material:'wood',fuel:14,heat:0,burning:0,wet:0,char:0});}
 }
 return cells;
}
export function igniteProp(sim,p,x=p.x,z=p.z,y=.9,seconds=4){
 if(p.health<=0||waterAt(sim.layout,x,z))return false;
 if(p.kind==='building'){
  p.surfaces??=buildingSurfaces(p);
  const cell=p.surfaces.reduce((best,c)=>Math.hypot(c.x-x,c.z-z,c.y-y)<Math.hypot(best.x-x,best.z-z,best.y-y)?c:best);
  if(cell.wet>0||cell.fuel<=0)return false;
  cell.burning=Math.max(cell.burning,seconds);return true;
 }
 p.fuel??=fuelFor(p);if(!p.fuel||p.wet>0)return false;
 p.burning=Math.max(p.burning||0,seconds);return true;
}
export function splashWater(sim,x,z,power=1){
 const radius=clamp(.6+power*.7,1,7);let quenched=0;
 sim.emit('splash',{x,z,power});
 for(const f of sim.fires)if(Math.hypot(f.x-x,f.z-z)<radius+f.radius*.5){f.life=0;quenched++;}
 for(const p of sim.props){
  const dx=Math.max(0,Math.abs(p.x-x)-p.w/2),dz=Math.max(0,Math.abs(p.z-z)-p.d/2);
  if(Math.hypot(dx,dz)>radius)continue;
  if(p.burning>0)quenched++;p.burning=0;p.wet=5;
  for(const c of p.surfaces||[])if(Math.hypot(c.x-x,c.z-z,c.y*.7)<radius){if(c.burning>0)quenched++;c.burning=0;c.heat=0;c.wet=6;}
 }
 for(const e of sim.enemies)if(Math.hypot(e.x-x,e.z-z)<radius){if(e.burning>0)quenched++;e.burning=0;e.wet=4;}
 sim.fires=sim.fires.filter(f=>f.life>0);
 sim.wetGround??=[];sim.wetGround.push({x,z,radius,life:4});if(sim.wetGround.length>48)sim.wetGround.shift();
 if(quenched)sim.emit('steam',{x,z,power:Math.min(5,quenched)});
 return quenched;
}
export function updateEnvironment(sim,dt){
 rainOnWorld(sim,dt);
 sim.wetGround=(sim.wetGround||[]).filter(w=>(w.life-=dt)>0);
 for(const e of sim.enemies){e.wet=Math.max(0,(e.wet||0)-dt);if(e.wet>0)e.burning=0;}
 for(const p of sim.props){
  p.wet=Math.max(0,(p.wet||0)-dt);if(p.health<=0)continue;
  if(p.kind==='building'){
   const cells=p.surfaces||[],burning=cells.filter(c=>c.burning>0&&c.fuel>0&&c.wet<=0);
   for(const c of cells){c.wet=Math.max(0,c.wet-dt);if(c.wet>0){c.burning=0;continue;}if(c.burning>0&&c.fuel>0){c.fuel=Math.max(0,c.fuel-dt);c.burning=c.fuel>0?Math.max(c.burning-dt,1):0;c.char=1-c.fuel/14;if(c.char>.18&&!c.marked){c.marked=true;sim.emit('surface-char',{id:p.id,x:c.x,z:c.z,y:c.y,face:c.face});}
     // Heat rises and travels along neighbouring combustible window bays.
     for(const next of cells)if(next!==c&&next.fuel>0&&!next.burning&&next.wet<=0&&Math.hypot(next.x-c.x,next.z-c.z,next.y-c.y)<3.4)next.heat+=dt*(next.y>c.y?1.2:.6);
    }else{c.heat=Math.max(0,c.heat-dt*.08);if(c.heat>2&&c.fuel>0)c.burning=3;}}
   if(burning.length){p.burnTick=(p.burnTick||0)+dt;if(p.burnTick>.5){for(const c of burning)if(c.y<3){for(const other of sim.obstacles)if(other!==p&&Math.hypot(Math.max(0,Math.abs(other.x-c.x)-other.w/2),Math.max(0,Math.abs(other.z-c.z)-other.d/2))<1.6)igniteProp(sim,other,c.x,c.z,c.y,3);for(const e of sim.enemies)if(e.health>0&&!(e.wet>0)&&Math.hypot(e.x-c.x,e.z-c.z)<1.4)e.burning=Math.max(e.burning||0,3);}sim.damageProp(p,Math.min(50,burning.length*4)*p.burnTick,{thermal:true});p.burnTick=0;}}
  }else if(p.burning>0){p.fuel??=fuelFor(p);if(p.wet>0||p.fuel<=0){p.burning=0;continue;}p.fuel=Math.max(0,p.fuel-dt);p.burning=p.fuel>0?Math.max(.5,p.burning-dt):0;p.burnTick=(p.burnTick||0)+dt;
   if(p.burnTick>.35){sim.damageProp(p,p.burnTick*(p.kind==='planter'?20:15));p.burnTick=0;}
   for(const other of sim.obstacles)if(other!==p&&Math.hypot(Math.max(0,Math.abs(other.x-p.x)-other.w/2),Math.max(0,Math.abs(other.z-p.z)-other.d/2))<Math.max(p.w,p.d)/2+1)igniteProp(sim,other,p.x,p.z,1.2,3);
  }
 }
 for(const fire of sim.fires){if(fire.life<=0)continue;fire.life-=dt;for(const e of sim.enemies)if(e.health>0&&!(e.wet>0)&&Math.hypot(e.x-fire.x,e.z-fire.z)<fire.radius+e.radius)e.burning=Math.max(e.burning||0,2.5);
  for(const p of sim.obstacles)if(Math.hypot(Math.max(0,Math.abs(p.x-fire.x)-p.w/2),Math.max(0,Math.abs(p.z-fire.z)-p.d/2))<fire.radius)igniteProp(sim,p,fire.x,fire.z,.9,3);
  if(Math.hypot(sim.player.x-fire.x,sim.player.z-fire.z)<fire.radius*.65)sim.damagePlayer(8);
 }
 sim.fires=sim.fires.filter(f=>f.life>0);
 // Fountains continually wet their basin; no random visual frame controls gameplay.
 sim.fountainTick=(sim.fountainTick||0)+dt;if(sim.fountainTick>1){sim.fountainTick=0;for(const w of sim.layout.water||[])if(w.feature==='fountain')splashWater(sim,w.x,w.z,1.2);}
}

// Four bounded weather-physics passes per second. Exterior bays retain char and
// spent fuel after cooling; rain is not a repair or a source of splash damage.
export function rainOnWorld(sim,dt){
 const w=sim.weather;if(!w)return;w.physicsTick+=dt;if(w.physicsTick<.25)return;const step=w.physicsTick;w.physicsTick=0;let steamBudget=6;
 const steam=(x,z,y=0)=>{if(steamBudget>0&&Math.hypot(x-sim.player.x,z-sim.player.z)<48){steamBudget--;sim.emit('steam',{x,z,y,power:2});}};
 const soak=(o,x,z,y=1)=>{
  const rain=shelteredAt(sim,x,z,y)?0:w.rain;
  o.rainDose=clamp((o.rainDose||0)+step*(rain>.1?rain:-.3),0,1.5);
  if(rain>.2&&o.rainDose>=1){if(o.burning>0)steam(x,z,y);o.burning=0;o.heat=0;o.wet=Math.max(o.wet||0,1);}
 };
 if(w.rain<.02&&!w.wetness)return;
 for(const p of sim.props)if(p.health>0){if(p.kind==='building'){for(const c of p.surfaces||[])soak(c,c.x,c.z,c.y);}else soak(p,p.x,p.z,1);}
 for(const e of sim.enemies)if(e.health>0)soak(e,e.x,e.z,1);
 for(const f of sim.fires)if(f.life>0&&!shelteredAt(sim,f.x,f.z)){f.life-=step*w.rain*6;if(f.life<=0)steam(f.x,f.z);}
}
