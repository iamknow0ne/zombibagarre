import {actionIcon} from './ActionIcons.js';
import {MELEE_KEYS} from './MeleeWeapons.js';
import {THROWABLES} from './Throwables.js';
import {WEAPONS,weaponStats} from './config.js';
import {slotKey} from './Loadout.js';
import {weaponTier,TIER_MARKS} from './Evolution.js';
import {touchSettings} from './TouchControls.js';
const $=id=>document.getElementById(id);
export class TouchUI {
 constructor(input,settings,save){this.input=input;this.settings=settings;Object.assign(settings,touchSettings(settings));
  const fields={'touch-mode':'touchStickMode','touch-size':'touchSize','touch-opacity':'touchOpacity','touch-assist':'touchAimAssist'};
  for(const [id,key]of Object.entries(fields)){const el=$(id);if(el.type==='checkbox')el.checked=settings[key];else el.value=settings[key];el.addEventListener('input',()=>{settings[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:Number(el.value);input.clear();this.apply();save();});}this.apply();
  const legend=document.createElement('div');legend.className='touch-icon-legend';legend.setAttribute('aria-label','Touch control icon guide');for(const [key,label]of [['swap','Swap'],['reload','Reload'],['dodge','Dodge'],['bomb','Throw'],['target','Auto fire'],['bell','Notices'],['hourglass','Focus']]){const item=document.createElement('span');actionIcon(item,key,label);item.append(document.createTextNode(label));legend.append(item);}$('touch-mode').closest('.setting-row').before(legend);
 }
 apply(){document.documentElement.style.setProperty('--touch-size',this.settings.touchSize);document.documentElement.style.setProperty('--touch-opacity',this.settings.touchOpacity);}
 update(sim,world,auto){
  const input=this.input,p=sim.player,active=(matchMedia('(pointer:coarse)').matches||innerWidth<=700||input.source==='touch')&&input.source!=='gamepad';document.body.classList.toggle('touch-layout',active);world.touchView=active;world.feedback.mobile=active;world.feedback.reserved=[];if(!active)return;
  $('equipped-hud').innerHTML=p.equipped.map((key,i)=>{const w=weaponStats(p,key),slot=slotKey(p.equipped,key,i);return `<div class="touch-weapon-line"><span>${w.name} <small>${TIER_MARKS[weaponTier(p,key)]}</small></span><b>${w.melee?'MELEE':p.reloads[slot]>0?'↻':p.magazines[slot]}</b></div>`;}).join('');
  const playing=['playing','extracting'].includes(sim.state),melee=MELEE_KEYS.includes(p.weapon);
  const manual=!!world.viewRig?.active;
  const aimOn=manual?p.aiming:auto;$('touch-auto').disabled=manual&&(melee||!!p.vehicleId);actionIcon($('touch-auto'),'target',manual?`Precision aim ${aimOn?'on':'off'}`:`Automatic fire ${auto?'on':'off'}`,manual?(aimOn?'AIM':'HIP'):(auto?'ON':'OFF'));$('touch-auto').setAttribute('aria-pressed',String(!!aimOn));
  $('touch-dash').disabled=!playing||p.dashCooldown>0;actionIcon($('touch-dash'),'dodge',p.dashCooldown>0?`Dodge ready in ${p.dashCooldown.toFixed(1)} seconds`:'Dodge',p.dashCooldown>0?p.dashCooldown.toFixed(1):'');
  $('touch-grenade').disabled=!playing||p.grenades<=0||p.throwAnimation>0;actionIcon($('touch-grenade'),{molotov:'flame',frost:'snow',shock:'bolt'}[p.throwable]||'bomb',`Throw ${THROWABLES[p.throwable||'frag'].short}: ${p.grenades} remaining`,String(p.grenades));
  $('touch-reload').disabled=!playing||melee||p.reload>0;actionIcon($('touch-reload'),melee?'swords':'reload',melee?'Melee weapon: no reload':p.reload>0?'Reloading':'Reload weapon',p.reload>0?'…':'');
  actionIcon($('touch-switch'),'swap','Switch weapon');actionIcon($('touch-arsenal'),'dualgun','Open arsenal');
  $('aim-joystick').querySelector('span').textContent=melee?'AIM / STRIKE':'AIM / FIRE';$('joystick').querySelector('span').textContent=p.vehicleId?'DRIVE':'MOVE';
  actionIcon($('vehicle-action'),p.vehicleId?'door':'wheel',p.vehicleId?'Exit vehicle':'Enter vehicle');
  // Keep the minimap canvas mounted for desktop / gamepad transitions.
  const mapLabel=$('map-action').querySelector('span');actionIcon(mapLabel,'map','Open street map');$('map-action').setAttribute('aria-label','Open street map');
  actionIcon($('pause'),'pause','Pause game');actionIcon($('drive-brake'),'brake','Brake');actionIcon($('drive-reverse'),'reverse','Reverse');$('vehicle-world-prompt').hidden=true;
  $('touch-help').textContent=p.vehicleId?'RELEASE STICK TO BRAKE':world.viewRig?.active?'RIGHT STICK TO LOOK + ATTACK':auto?'MOVE TO SURVIVE · AIM TO OVERRIDE':'RIGHT STICK TO AIM + ATTACK';
  // Keep floating combat labels off the information strip and both thumb areas.
  const selectors=['#focus-action','#field-notices','.hud-top','.weapon-hud','#map-action','.touch-tools','#boss-hud','.toast:not(:empty)','.announcement.show','.vehicle-readout','#vehicle-action','#move-zone','#aim-zone','.touch-action','.driving-hud','.drive-touch'];
  world.feedback.reserved=[...document.querySelectorAll(selectors.join(','))].filter(el=>!el.hidden&&el.getClientRects().length&&getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({x:r.x+r.width/2,y:r.y+r.height/2,w:r.width+8,h:r.height+8}));
  world.aimRing.visible=!!input.touchFiring&&!p.vehicleId&&playing;if(world.aimRing.visible&&input.touchWorldAim)world.aimRing.position.set(input.touchWorldAim.x,.08,input.touchWorldAim.z);
 }
}
