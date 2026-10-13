import {ControllerDiagram} from './ControllerDiagram.js';
import {weaponTier,TIER_MARKS} from './Evolution.js';
import {ACTION_NAMES,BINDINGS,CONTROL_DEFAULTS,buttonName,glyph,rebind} from './ControllerConfig.js';
import {WEAPONS,weaponStats,distance} from './config.js';
const $=id=>document.getElementById(id);
export class ControllerUI{
 constructor(input,settings,haptics,dualsense,onSave,onAuto){this.input=input;this.settings=settings;this.haptics=haptics;this.dualsense=dualsense;this.onSave=onSave;
  const section=document.createElement('section');section.id='controller-settings';section.innerHTML=`<div class="label">CONTROLS / MAKE EVERY BUTTON COUNT</div><h3>Controller & combat</h3><p id="controller-device" class="hardware-status">Press a controller button to connect.</p>
  <label class="setting-row"><span>Auto fire<small>Also toggle it during combat with L3 or T</small></span><input id="control-autoFire" type="checkbox"></label>
  <label class="setting-row"><span>Button symbols<small>Automatically detect PlayStation / Xbox</small></span><select id="control-promptStyle"><option value="auto">Automatic</option><option value="playstation">PlayStation</option><option value="xbox">Xbox</option><option value="generic">Numbered buttons</option></select></label>
  <div class="controller-presets"><button id="controls-requested">L2 + R3 LAYOUT</button><button id="controls-triggers">L2 + R2 LAYOUT</button></div><p class="control-note">Right = main hand. Left = off hand. Manual attacks override auto fire while held. Circle is the vehicle handbrake. D-pad selects menu items; left/right changes values; Cross confirms; Circle goes back.</p><div id="controller-bindings"></div>
  <h3>Driving</h3><label class="setting-row"><span>Driving style<small>Touch always uses easy point-to-drive</small></span><select id="control-drivingStyle"><option value="racing">Steering + pedals</option><option value="assisted">Easy · point to drive</option></select></label><p class="control-note">Pedals: R2 accelerate, L2 brake / hold to reverse, left stick steer, Circle handbrake. Keyboard: W / S pedals, A / D steer, Space handbrake. Easy mode: point the stick or WASD where you want to go. Sharp turns slow automatically; release to stop. Stop before exiting.</p><label class="setting-row"><span>Steering response <output id="value-steerSensitivity"></output></span><input id="control-steerSensitivity" aria-label="Steering response" type="range" min=".6" max="1.4" step=".05"></label>
  <h3>Stick feel</h3>
  ${[['moveDeadzone','Movement dead zone',.05,.4,.01],['aimDeadzone','Aim dead zone',.05,.4,.01],['aimSensitivity','Aim response',.4,2,.1],['vibration','Vibration strength',0,100,5]].map(([key,name,min,max,step])=>`<label class="setting-row"><span>${name} <output id="value-${key}"></output></span><input id="control-${key}" aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}
  <label class="setting-row"><span>Aim assist<small>Gently snap near the stick direction</small></span><input id="control-aimAssist" type="checkbox"></label><label class="setting-row"><span>Invert vertical aim</span><input id="control-invertAim" type="checkbox"></label>
  <button id="test-vibration" class="secondary">TEST VIBRATION</button><p id="vibration-status" class="hardware-status"></p>
  <h3>DualSense extras</h3><label class="setting-row"><span>Adaptive triggers & lightbar<small>Optional direct connection; weapon resistance and health colour</small></span><input id="control-adaptiveTriggers" type="checkbox"></label><p class="control-note">Connect below with a mouse or touch to open the browser device chooser. Trigger resistance applies only to attacks bound to L2 / R2. Speaker, microphone, gyro and audio haptics are not used.</p><div class="controller-presets"><button id="connect-dualsense">CONNECT DUALSENSE</button><button id="disconnect-dualsense">DISCONNECT EXTRAS</button></div><p id="dualsense-status" class="hardware-status"></p><button id="reset-controller" class="text-button">RESET CONTROLLER CONTROLS</button>`;
  $('settings-done').before(section);
  const diagramHost=document.createElement('div');$('control-promptStyle').closest('label').after(diagramHost);this.diagram=new ControllerDiagram(diagramHost,input,settings);
  for(const key of Object.keys(CONTROL_DEFAULTS).filter(k=>k!=='bindings')){const el=$('control-'+key);el.addEventListener('input',()=>{settings[key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(key==='autoFire')onAuto(settings.autoFire);if(key==='vibration'&&!settings.vibration)haptics.stop();if(key==='adaptiveTriggers'&&!settings.adaptiveTriggers)dualsense.stop();onSave();this.syncValues();});}
  $('controls-requested').onclick=()=>{settings.bindings={...BINDINGS};this.renderBindings();onSave();};$('controls-triggers').onclick=()=>{settings.bindings={...BINDINGS,rightFire:7};this.renderBindings();onSave();};
  $('reset-controller').onclick=()=>{Object.assign(settings,CONTROL_DEFAULTS,{bindings:{...BINDINGS}});haptics.stop();dualsense.stop();onAuto(settings.autoFire);this.renderBindings();this.syncValues();onSave();};
  $('test-vibration').onclick=()=>{const source=input.source;input.source='gamepad';haptics.event({type:'shoot',weapon:'shotgun'});input.source=source;};
  $('connect-dualsense').disabled=!navigator.hid;$('connect-dualsense').onclick=async()=>{await dualsense.connect();this.syncValues();onSave();};$('disconnect-dualsense').onclick=()=>dualsense.disconnect();
  this.renderBindings();this.syncValues();
  for(const dialog of document.querySelectorAll('dialog')){const hint=document.createElement('div');hint.className='controller-menu-hint';dialog.append(hint);}
 }
 syncValues(){for(const key of Object.keys(CONTROL_DEFAULTS).filter(k=>k!=='bindings')){const el=$('control-'+key);if(el.type==='checkbox')el.checked=!!this.settings[key];else el.value=this.settings[key];const value=$('value-'+key);if(value)value.textContent=key==='vibration'?this.settings[key]+'%':this.settings[key].toFixed(2);}this.diagram?.update();}
 renderBindings(){const focus=document.activeElement?.id,family=this.input.family||'playstation';$('controller-bindings').replaceChildren(...Object.entries(ACTION_NAMES).map(([action,name])=>{const row=document.createElement('label');row.className='setting-row binding-row';row.innerHTML=`<span>${name}</span><select id="bind-${action}" aria-label="${name} button">${Array.from({length:16},(_,i)=>`<option value="${i}">${buttonName(i,family)}</option>`).join('')}</select>`;const select=row.querySelector('select');select.value=this.settings.bindings[action];select.onchange=()=>{this.settings.bindings=rebind(this.settings.bindings,action,Number(select.value));this.renderBindings();this.onSave();};return row;}));if(focus?.startsWith('bind-'))$(focus)?.focus();this.diagram?.update();}
 prompt(action,fallback){return this.input.source==='gamepad'&&this.input.pad?glyph(this.settings.bindings[action],this.input.family):`<kbd>${fallback}</kbd>`;}
 update(sim,world,auto){
  const input=this.input,pad=input.source==='gamepad'&&input.pad,p=sim.player;
  if($('settings-dialog').open)this.diagram.update();
  document.body.classList.toggle('using-gamepad',!!pad);
  if(this.lastFamily!==input.family){this.lastFamily=input.family;this.renderBindings();}
  $('controller-device').textContent=input.pad?`${input.family==='playstation'?'PLAYSTATION':input.family==='xbox'?'XBOX':'GAMEPAD'} · ${input.pad.id}`:'Press a button on your connected controller.';
  $('vibration-status').textContent=this.haptics.capability()?(this.haptics.status.startsWith('Connect')?'Vibration available · use Test vibration.':this.haptics.status):'Vibration is not exposed by the current browser / controller.';$('dualsense-status').textContent=this.dualsense.status;
  for(const [id,action,key]of [['dash-action','dash','SPACE'],['melee-action','rightFire','F'],['grenade-action','grenade','E']])$(id).querySelector('kbd, .pad-key').outerHTML=this.prompt(action,key);
  $('arsenal-action').innerHTML=`ARSENAL ${this.prompt('arsenal','B')}`;$('auto-action').disabled=!!world.viewRig?.active;$('auto-action').innerHTML=`${world.viewRig?.active?'CAMERA AIM':'AUTO FIRE'} <b>${world.viewRig?.active?'MANUAL':auto?'ON':'OFF'}</b> ${this.prompt('auto','T')}`;
  $('map-action').querySelector('span').innerHTML=`STREET MAP ${this.prompt('map','M')}`;
  $('pause').innerHTML=pad?this.prompt('pause','ESC'):'Ⅱ';
  $('control-autoFire').checked=auto;$('auto-action').setAttribute('aria-pressed',String(auto));
  $('weapon-controls').innerHTML=pad?`${this.prompt('prevWeapon','')} / ${this.prompt('nextWeapon','')} SWITCH · ${this.prompt('reload','')} RELOAD`:'<kbd>1–0</kbd> / SCROLL · WEAPONS &nbsp; <kbd>R</kbd> RELOAD';
  $('equipped-hud').innerHTML=p.equipped.map((key,i)=>`${pad?glyph(this.settings.bindings[i?'leftFire':'rightFire'],input.family):''} ${i?'LEFT':'RIGHT'} · ${weaponStats(p,key).name} ${TIER_MARKS[weaponTier(p,key)]} ${WEAPONS[key].melee?'BLADE':p.magazines[i&&p.equipped[0]===key?'offhand':key]}${p.reloads[i&&p.equipped[0]===key?'offhand':key]>0?' ↻':''}`).join('<br>');
  const car=p.vehicleId?sim.props.find(v=>v.id===p.vehicleId):sim.props.filter(v=>v.driveable&&v.health>0&&distance(v,p)<5).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  $('vehicle-action').innerHTML=`${p.vehicleId?'EXIT':'ENTER'} VEHICLE ${this.prompt('interact','V')}`;
  const prompt=$('vehicle-world-prompt'),visible=car&&!p.vehicleId&&['playing','extracting'].includes(sim.state);prompt.hidden=!visible;
  if(visible){const point=world.screenPoint(car.x,2.8,car.z);prompt.hidden=!point.visible;prompt.style.left=point.x+'px';prompt.style.top=point.y+'px';prompt.innerHTML=`${this.prompt('interact','V')} ENTER ${car.vehicleName||'VEHICLE'}`;}
  document.body.classList.toggle('driving',!!p.vehicleId);$('driving-hud').hidden=!p.vehicleId;
  if(p.vehicleId&&car){$('drive-name').textContent=car.vehicleName;$('drive-speed').textContent=String(Math.round(Math.abs(car.speed||0)*3.6));$('drive-gear').textContent=car.speed<-.1?'R':car.speed>.1?'D':'N';$('drive-hull').textContent=`${Math.max(0,Math.ceil(car.health/car.maxHealth*100))}% HULL`;
   $('drive-help').innerHTML=input.source==='touch'?'STICK TO DRIVE · RELEASE TO BRAKE':pad?`${glyph(7,input.family)} ACCEL · ${glyph(6,input.family)} BRAKE / REVERSE · ${glyph(1,input.family)} HANDBRAKE`:'W ACCEL · S BRAKE / REVERSE · A / D STEER · SPACE HANDBRAKE';
   if(input.source!=='touch'&&this.settings.drivingStyle==='assisted')$('drive-help').innerHTML=pad?`LEFT STICK TO DRIVE · ${glyph(6,input.family)} REVERSE · ${glyph(1,input.family)} HANDBRAKE`:'WASD POINT TO DRIVE · SHIFT REVERSE · SPACE HANDBRAKE';
  }
  world.aimRing.visible=!!pad&&!!input.padAim&&['playing','extracting'].includes(sim.state)&&!p.vehicleId;if(world.aimRing.visible)world.aimRing.position.set(input.padAim.x,.08,input.padAim.z);
  for(const hint of document.querySelectorAll('dialog[open] .controller-menu-hint'))hint.innerHTML=`D-PAD MOVE · ${glyph(0,input.family)} SELECT · ${glyph(1,input.family)} BACK · ← / → ADJUST`;
 }
}
