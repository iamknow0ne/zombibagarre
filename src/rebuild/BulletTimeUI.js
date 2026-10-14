import {keyboardHint} from './KeyboardBindings.js';
import {actionIcon} from './ActionIcons.js';
import {bindTouchAction} from './TouchControls.js';
import {glyph} from './ControllerConfig.js';
import {FOCUS,endFocus} from './BulletTime.js';
export class BulletTimeUI{
 constructor(input,settings,getSim,save){
  Object.assign(this,{input,settings,getSim});
  this.button=document.createElement('button');this.button.id='focus-action';this.button.type='button';this.button.className='icon-action';document.getElementById('hud').append(this.button);
  bindTouchAction(this.button,input,()=>{const sim=getSim();if(['playing','extracting'].includes(sim.state))input.once.bulletTime=true;});
  this.veil=document.createElement('div');this.veil.id='focus-veil';this.veil.setAttribute('aria-hidden','true');document.body.append(this.veil);
  this.live=document.createElement('span');this.live.className='sr-only';this.live.setAttribute('role','status');document.body.append(this.live);
  const section=document.createElement('section');section.className='focus-settings';section.innerHTML='<h3>Focus / bullet time</h3><p>Slow the world while aiming stays responsive. Use your Focus binding, or the hourglass on touch. Dodge during Focus with a firearm to shoot while diving. Kills refill Focus; precision kills give more. It also recovers slowly between uses.</p><label class="setting-row"><span>Enable Focus<small>Available from the start. At least 25% charge required; limited bursts prevent permanent slow motion.</small></span><input type="checkbox" id="focus-enabled"></label><label class="setting-row"><span>Cinematic Focus effects<small>Subtle camera emphasis, screen edge shading and longer bullet trails. Reduced motion suppresses camera movement.</small></span><input type="checkbox" id="focus-cinematics"></label><p>Remap Focus in Keyboard or Controller settings. In menus, Circle / B still goes back; while driving it remains the handbrake. Opening a weapon wheel or menu ends Focus.</p>';
  document.getElementById('controller-settings').before(section);
  for(const [id,key]of [['focus-enabled','bulletTime'],['focus-cinematics','focusCinematics']]){const el=document.getElementById(id);el.checked=settings[key]!==false;el.onchange=()=>{settings[key]=el.checked;getSim().focusEnabled=settings.bulletTime!==false;if(!getSim().focusEnabled)endFocus(getSim(),true);save();};}
 }
 update(sim){
  const f=sim.focus,playing=['playing','extracting'].includes(sim.state),enabled=this.settings.bulletTime!==false,percent=Math.floor(f.energy),mobile=document.body.classList.contains('touch-layout');
  this.button.hidden=!enabled||!!sim.player.vehicleId;
  this.button.disabled=!playing||!f.active&&(f.cooldown>0||f.energy<FOCUS.minimum);
  const state=f.active?'ACTIVE':f.cooldown>0?'RECOVERING':f.energy>=FOCUS.minimum?'READY':'RECHARGING';
  const label=`Focus ${state.toLowerCase()}, ${percent}% charge. ${f.active?'Tap to end.':'Slow time; dodge with a gun to dive.'}`;
  actionIcon(this.button,'hourglass',label,mobile?String(percent):'');this.button.setAttribute('aria-pressed',String(f.active));
  let name=this.button.querySelector('.focus-caption');if(!name){name=document.createElement('span');name.className='focus-caption';this.button.append(name);}
  const hint=this.input.source==='gamepad'?glyph(this.input.settings.bindings.bulletTime,this.input.family):`<kbd>${keyboardHint(this.settings.keyboardBindings,'bulletTime')}</kbd>`;
  name.innerHTML=`<b>FOCUS ${percent}%</b><small>${state} ${hint}</small>`;
  let meter=this.button.querySelector('.focus-meter');if(!meter){meter=document.createElement('span');meter.className='focus-meter';meter.setAttribute('aria-hidden','true');meter.append(document.createElement('i'));this.button.append(meter);}meter.firstChild.style.width=percent+'%';
  document.body.classList.toggle('focus-active',!!f.active);this.veil.style.opacity=playing&&this.settings.focusCinematics!==false&&!this.settings.reducedMotion?String(f.blend):'0';
  const signature=`${sim.seed}:${f.active}`;if(signature!==this.last){const announce=this.last!==undefined||f.active;this.last=signature;if(announce)this.live.textContent=f.active?'Focus active. Dodge with a firearm for a shooting dive.':'Focus ended.';}
 }
}
