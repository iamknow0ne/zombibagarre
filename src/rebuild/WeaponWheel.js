import {WEAPONS} from './config.js';
import {availableWeapons,canDualWield} from './Progression.js';
import {weaponTier,TIER_NAMES} from './Evolution.js';
import {armoryPreviews} from './ArmoryPreview.js';
import {glyph} from './ControllerConfig.js';

export const WHEEL_HOLD_MS=300;
export const WHEEL_TIME_SCALE=.18;
export function handChoices(sim,hand){
 if(hand===1&&(WEAPONS[sim.player.equipped[0]]?.melee||!canDualWield(sim)))return [];
 return hand===1?['',...availableWeapons(sim).filter(k=>!WEAPONS[k].melee)]:availableWeapons(sim);
}
export function equipHand(sim,hand,key){
 if(!handChoices(sim,hand).includes(key))return false;
 const equipped=sim.player.equipped;
 return sim.setLoadout(hand===1?[equipped[0],...(key?[key]:[])]:[key,...equipped.slice(1)]);
}
export function cycleHand(sim,hand,direction=1){
 const keys=handChoices(sim,hand);if(!keys.length)return null;
 const key=keys[(keys.indexOf(sim.player.equipped[hand]||'')+direction+keys.length)%keys.length];equipHand(sim,hand,key);return key;
}
export function wheelIndex(x,y,count,previous=0){
 if(!count||Math.hypot(x,y)<.42)return previous;
 const angle=(Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2);
 return Math.round(angle/(Math.PI*2)*count)%count;
}
// Uses real time, not simulation time. A quick tap only cycles on release.
export class WeaponHold{
 update(buttons,bindings,now){
  if(this.hand===undefined){for(const [hand,key]of [[1,'leftWeapon'],[0,'nextWeapon']])if(buttons[bindings[key]]){this.hand=hand;this.button=bindings[key];this.since=now;this.open=false;break;}return null;}
  if(!buttons[this.button]){const event={type:this.open?'commit':'cycle',hand:this.hand};this.reset();return event;}
  if(!this.open&&now-this.since>=WHEEL_HOLD_MS){this.open=true;return {type:'open',hand:this.hand};}return null;
 }
 reset(){this.hand=undefined;this.open=false;}
}
export class WeaponWheel{
 constructor(input,getSim,notify){
  this.input=input;this.getSim=getSim;this.notify=notify;this.root=document.createElement('section');this.root.id='weapon-wheel';this.root.hidden=true;this.root.tabIndex=-1;this.root.setAttribute('role','region');this.root.setAttribute('aria-label','Weapon selection wheel');
  this.root.innerHTML='<div class="wheel-heading"><span class="label">TACTICAL LOADOUT</span><h2></h2></div><div class="wheel-disc"><div class="wheel-slots"></div><div class="wheel-center" aria-live="polite"><small></small><strong></strong><span></span></div></div><p class="wheel-help"></p><button class="wheel-cancel">CANCEL SELECTION</button>';
  document.body.append(this.root);this.root.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){this.close();input.clear();}else if(e.key==='Enter'){equipHand(this.getSim(),this.hand,this.keys[this.selected]);this.close();input.clear();}else{this.selected=(this.selected+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+this.keys.length)%this.keys.length;this.renderSelection();}});this.root.querySelector('.wheel-cancel').onclick=()=>{this.close();input.clear();};
  input.onWeaponWheel=(event,pad)=>this.handle(event,pad);input.onCancelWheel=()=>this.close();
 }
 get active(){return !this.root.hidden;}
 handle(event,pad){
  if(event?.type==='cycle'){const key=cycleHand(this.getSim(),event.hand);this.notify(key===null?'LEFT HAND · Requires two firearms and the dual-wield skill':`${event.hand?'LEFT':'RIGHT'} HAND · ${key?WEAPONS[key].name:'EMPTY'}`);}
  if(event?.type==='open')this.open(event.hand);
  if(this.active&&pad){const next=wheelIndex(pad.aim.x,pad.aim.y,this.keys.length,this.selected);if(next!==this.selected){this.selected=next;this.renderSelection();}}
  if(event?.type==='commit'&&this.active){equipHand(this.getSim(),this.hand,this.keys[this.selected]);this.close();}
 }
 open(hand){
  const sim=this.getSim();this.keys=handChoices(sim,hand);if(!this.keys.length){this.notify('LEFT HAND · Equip firearms and unlock Two hands, two guns');return;}
  this.hand=hand;this.selected=Math.max(0,this.keys.indexOf(sim.player.equipped[hand]||''));this.previousFocus=document.activeElement;this.input.lookX=this.input.lookY=0;this.input.once={};this.input.firing=false;this.input.destination=null;this.input.weaponWheelActive=true;this.input.onStopFeedback?.();this.root.hidden=false;this.root.focus({preventScroll:true});const hud=document.getElementById('hud');if(hud)hud.inert=true;document.body.classList.add('selecting-weapon');
  this.root.querySelector('h2').textContent=hand?'LEFT HAND':'RIGHT HAND';
  const portraits=armoryPreviews(this.keys.filter(Boolean).map(k=>[k,weaponTier(sim.player,k)]));
  this.root.querySelector('.wheel-slots').replaceChildren(...this.keys.map((key,i)=>{const button=document.createElement('button'),angle=i/this.keys.length*Math.PI*2;button.className='wheel-slot';button.style.setProperty('--x',Math.sin(angle));button.style.setProperty('--y',-Math.cos(angle));button.setAttribute('aria-label',key?WEAPONS[key].name:'Empty left hand');const image=key&&portraits.get(`${key}:${weaponTier(sim.player,key)}`);button.innerHTML=(image?`<img src="${image}" alt="">`:'<span aria-hidden="true">—</span>')+`<b>${key?WEAPONS[key].name:'EMPTY'}</b>`;button.onpointerenter=()=>{this.selected=i;this.renderSelection();};button.onclick=()=>{equipHand(sim,hand,key);this.close();this.input.clear();};return button;}));
  const binding=this.input.settings.bindings[hand?'leftWeapon':'nextWeapon'];this.root.querySelector('.wheel-help').innerHTML=`RIGHT STICK · CHOOSE &nbsp; ${glyph(binding,this.input.family)} RELEASE · EQUIP &nbsp; ${glyph(1,this.input.family)} CANCEL`;this.renderSelection();
 }
 renderSelection(){const key=this.keys[this.selected],sim=this.getSim(),tier=key?weaponTier(sim.player,key):0;this.root.querySelector('.wheel-center small').textContent='18% TIME · STAY ALERT';this.root.querySelector('.wheel-center strong').textContent=key?WEAPONS[key].name:'EMPTY';this.root.querySelector('.wheel-center span').textContent=key?`${TIER_NAMES[tier]} · ${WEAPONS[key].melee?'MELEE STANCE':WEAPONS[key].label}`:'SINGLE FIREARM';this.root.querySelectorAll('.wheel-slot').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===this.selected)));}
 close(){if(!this.active)return;this.root.hidden=true;const hud=document.getElementById('hud');if(hud)hud.inert=false;if(this.root.contains(document.activeElement))this.previousFocus?.focus?.({preventScroll:true});this.input.weaponWheelActive=false;document.body.classList.remove('selecting-weapon');}
}
