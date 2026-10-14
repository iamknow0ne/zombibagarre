import {keyboardHint} from './KeyboardBindings.js';
import {perspectiveSettings} from './PerspectiveSettings.js';
import {glyph} from './ControllerConfig.js';
import {WEAPONS} from './config.js';
const $=id=>document.getElementById(id);
export class PerspectiveUI{
 constructor(input,settings,save){this.input=input;this.settings=settings;Object.assign(settings,perspectiveSettings(settings));this.reticle=$('view-crosshair');this.hitUntil=0;
  const group=document.createElement('fieldset');group.className='combat-settings perspective-settings';group.innerHTML='<legend>PERSPECTIVE CAMERA / TPS + FPS</legend>';
  for(const [key,label,min,max,step,unit]of [['viewFov','Field of view',55,90,1,'°'],['lookSensitivity','Look sensitivity',.4,2.5,.1,'×'],['cameraMotion','Camera motion',0,100,5,'%']]){const row=document.createElement('label');row.className='setting-row';row.innerHTML=`<span>${label} <output></output></span><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}">`;const slider=row.querySelector('input'),value=row.querySelector('output');slider.value=settings[key];const sync=()=>value.textContent=`${Number(slider.value)}${unit}`;sync();slider.oninput=()=>{settings[key]=Number(slider.value);sync();save();};group.append(row);}
  const row=document.createElement('label');row.className='setting-row';row.innerHTML='<span>Camera shoulder<small>Third-person view only</small></span><select aria-label="Camera shoulder"><option value="right">Right</option><option value="left">Left</option></select>';const select=row.querySelector('select');select.value=settings.shoulder;select.onchange=()=>{settings.shoulder=select.value;save();};group.append(row);
  const note=document.createElement('p');note.className='combat-note';note.textContent='Precision aim steadies your weapon, tightens spread and slows movement. Hold right mouse or use Precision aim from Keyboard settings. Controller: remap Precision aim in Controller settings. Touch: tap the target icon. Reduced motion overrides camera bob and look sway.';group.append(note);$('view-mode').closest('.setting-row').after(group);
 }
 event(e){if(e.type!=='damage'||e.periodic||!e.weapon||!(e.dealt>0))return;this.hitUntil=performance.now()+180;this.critical=e.critical||e.headshot;this.kill=e.killed;}
 update(sim,world){const p=sim.player,rig=world.viewRig,active=rig.active&&!p.vehicleId,blade=WEAPONS[p.weapon]?.melee;this.reticle.hidden=!active;const label=blade?'MELEE':p.aiming?'PRECISION':'HIP FIRE';this.reticle.classList.toggle('precision',!!p.aiming);this.reticle.classList.toggle('confirmed',active&&performance.now()<this.hitUntil);this.reticle.classList.toggle('critical',!!this.critical);this.reticle.classList.toggle('kill',!!this.kill);this.reticle.querySelector('span').textContent=label;
  if(active){const btn=$('auto-action');btn.disabled=!!blade;btn.setAttribute('aria-pressed',String(!!p.aiming));const hint=this.input.source==='gamepad'?glyph(this.settings.bindings.aim,this.input.family):`<kbd>${keyboardHint(this.settings.keyboardBindings,'toggleAim')}</kbd>`;btn.innerHTML=`${hint} AIM <b>${p.aiming?'ON':'OFF'}</b>`;}else{const btn=$('auto-action');btn.disabled=rig.active&&!!p.vehicleId;}
 }
}
