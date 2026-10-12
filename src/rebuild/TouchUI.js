import {touchSettings} from './TouchControls.js';
const $=id=>document.getElementById(id);
export class TouchUI {
 constructor(input,settings,save){this.input=input;this.settings=settings;Object.assign(settings,touchSettings(settings));
  const fields={'touch-mode':'touchStickMode','touch-size':'touchSize','touch-opacity':'touchOpacity','touch-assist':'touchAimAssist'};
  for(const [id,key]of Object.entries(fields)){const el=$(id);if(el.type==='checkbox')el.checked=settings[key];else el.value=settings[key];el.addEventListener('input',()=>{settings[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:Number(el.value);input.clear();this.apply();save();});}this.apply();
 }
 apply(){document.documentElement.style.setProperty('--touch-size',this.settings.touchSize);document.documentElement.style.setProperty('--touch-opacity',this.settings.touchOpacity);}
 update(sim,world,auto){
  const input=this.input,p=sim.player,active=(matchMedia('(pointer:coarse)').matches||innerWidth<=700||input.source==='touch')&&input.source!=='gamepad';document.body.classList.toggle('touch-layout',active);world.touchView=active;if(!active)return;
  const playing=['playing','extracting'].includes(sim.state),melee=['katana','dual'].includes(p.weapon);
  $('touch-auto').textContent=auto?'AUTO ON':'AUTO OFF';$('touch-auto').setAttribute('aria-pressed',String(auto));
  $('touch-dash').disabled=!playing||p.dashCooldown>0;$('touch-dash').textContent=p.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'DODGE';
  $('touch-grenade').disabled=!playing||p.grenades<=0||p.throwAnimation>0;$('touch-grenade').textContent=`BOMB · ${p.grenades}`;
  $('touch-reload').disabled=!playing||melee||p.reload>0;$('touch-reload').textContent=melee?'BLADE':p.reload>0?'LOADING':'RELOAD';
  $('aim-joystick').querySelector('span').textContent=melee?'AIM / CUT':'AIM / FIRE';$('joystick').querySelector('span').textContent=p.vehicleId?'DRIVE':'MOVE';
  $('vehicle-action').textContent=p.vehicleId?'EXIT VEHICLE':'ENTER VEHICLE';$('map-action').querySelector('span').textContent='MAP';$('vehicle-world-prompt').hidden=true;
  $('touch-help').textContent=p.vehicleId?'RELEASE STICK TO BRAKE':auto?'MOVE TO SURVIVE · AIM TO OVERRIDE':'RIGHT STICK TO AIM + ATTACK';
  world.aimRing.visible=!!input.touchFiring&&!p.vehicleId&&playing;if(world.aimRing.visible&&input.touchWorldAim)world.aimRing.position.set(input.touchWorldAim.x,.08,input.touchWorldAim.z);
 }
}
