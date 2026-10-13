// Real seconds drive the resource; simulation seconds drive combat and physics.
export const FOCUS={capacity:100,minimum:25,drain:22,recovery:5,delay:2,cooldown:1.2,maxDuration:6,scale:.32,diveCost:10,diveDuration:.32};
export function createFocus(){return {energy:100,active:false,blend:0,elapsed:0,cooldown:0,recoveryDelay:0};}
export function focusAllowed(sim){return sim.focusEnabled!==false&&['playing','extracting'].includes(sim.state)&&!sim.player.vehicleId&&sim.player.health>0;}
export function endFocus(sim,immediate=false){
 const f=sim.focus;if(!f)return;
 if(f.active){f.active=false;f.cooldown=FOCUS.cooldown;f.recoveryDelay=FOCUS.delay;sim.emit('focus',{active:false});}
 if(immediate){f.blend=0;sim.timeScale=1;}
}
export function toggleFocus(sim){
 const f=sim.focus;if(f.active){endFocus(sim);return true;}
 if(!focusAllowed(sim)||f.cooldown>0||f.energy<FOCUS.minimum)return false;
 f.active=true;f.elapsed=0;f.recoveryDelay=FOCUS.delay;sim.emit('focus',{active:true});return true;
}
export function stepFocus(sim,realDt,toggle=false){
 const f=sim.focus;if(!f)return 1;
 if(!focusAllowed(sim)){endFocus(sim,true);return 1;}
 f.cooldown=Math.max(0,f.cooldown-realDt);
 if(toggle)toggleFocus(sim);
 if(f.active){f.energy=Math.max(0,f.energy-realDt*FOCUS.drain);f.elapsed+=realDt;if(f.energy<=0||f.elapsed>=FOCUS.maxDuration)endFocus(sim);}
 else{f.recoveryDelay=Math.max(0,f.recoveryDelay-realDt);if(!f.recoveryDelay)f.energy=Math.min(FOCUS.capacity,f.energy+FOCUS.recovery*realDt);}
 f.blend+=(Number(f.active)-f.blend)*(1-Math.exp(-realDt*(f.active?16:10)));if(!f.active&&f.blend<.002)f.blend=0;
 sim.timeScale=1-(1-FOCUS.scale)*f.blend;return sim.timeScale;
}
export function rewardFocus(sim,impact={}){
 const f=sim.focus;if(!f||sim.focusEnabled===false)return;
 // Small gains while active prevent crowd farming from sustaining it indefinitely.
 const gain=f.active?3:impact.headshot||impact.critical||impact.finisher?16:10;
 f.energy=Math.min(FOCUS.capacity,f.energy+gain);
}
export function beginFocusDive(sim){
 const f=sim.focus,p=sim.player;
 if(!f?.active||f.energy<FOCUS.diveCost)return false;
 f.energy-=FOCUS.diveCost;p.focusDive=true;p.diveDuration=FOCUS.diveDuration;sim.emit('focus-dive');return true;
}
export function focusDivePose(p){
 if(!p.focusDive||!(p.dash>0))return {lift:0,pitch:0,roll:0};
 const u=Math.max(0,Math.min(1,1-p.dash/p.diveDuration)),arc=Math.sin(Math.PI*u),forward=p.dashX*Math.sin(p.angle)+p.dashZ*Math.cos(p.angle),side=p.dashX*Math.cos(p.angle)-p.dashZ*Math.sin(p.angle);
 return {lift:arc*.55,pitch:forward*arc*.9,roll:-side*arc*1.05};
}
