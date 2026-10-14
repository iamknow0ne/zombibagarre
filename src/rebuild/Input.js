import {KEYBOARD_ACTIONS,normalizeKeyboardBindings,resolveKeyboardActions,keyboardHeld} from './KeyboardBindings.js';
import {activeGameplay} from './GameplayContext.js';
import {WeaponHold} from './WeaponWheel.js';
import {cameraMovement} from './ViewRig.js';
import {TouchControls,touchAimTarget,assistedAimPoint,assistedAimClear} from './TouchControls.js';
import {assistedDrive} from './Vehicles.js';
import {sampleGamepad,worldStick,selectGamepad} from './Gamepad.js';
import {BINDINGS,CONTROL_DEFAULTS,controllerFamily,handInput,stepRange,enabledOptionIndex,directionalControl} from './ControllerConfig.js';
export class Input {
  constructor(canvas,onAction,settings=CONTROL_DEFAULTS){
    this.settings=settings;this.keyboardBindings=normalizeKeyboardBindings(settings.keyboardBindings);this.settings.keyboardBindings=this.keyboardBindings;this.source='keyboard';
    this.padButtons=[];this.pad=null;this.padGuard=false;this.keys=new Set();this.once={};this.pointer={x:.5,y:.5,active:false};this.firing=false;this.stick={x:0,y:0};this.canvas=canvas;this.onAction=onAction;
    window.addEventListener('keydown',e=>this.keyDown(e));
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')this.source='touch';});
    window.addEventListener('blur',()=>this.clear());
    canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||this.weaponWheelActive)return;this.source='keyboard';if(e.buttons===0&&document.pointerLockElement!==canvas){this.firing=false;this.aimHeld=false;}if(document.pointerLockElement===canvas||(this.perspective&&e.buttons===2)){this.lookX=(this.lookX||0)+e.movementX;this.lookY=(this.lookY||0)+e.movementY;}this.pointer={x:e.clientX/innerWidth,y:e.clientY/innerHeight,active:true};});
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;this.source='keyboard';if(this.perspective&&this.playing&&!this.lockUnavailable&&canvas.requestPointerLock&&!document.querySelector('dialog[open]')&&document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch?.(()=>{this.lockUnavailable=true;});}catch{this.lockUnavailable=true;}return;}if(e.button===0)this.firing=true;if(e.button===2&&this.perspective)this.aimHeld=true;if(document.pointerLockElement!==canvas){try{canvas.setPointerCapture(e.pointerId);}catch{/* Pointer lock/cancellation can invalidate capture; window release still ends the action. */}}if(e.button===2&&!this.perspective)this.moveRequest={x:e.clientX/innerWidth,y:e.clientY/innerHeight};this.pointer={x:e.clientX/innerWidth,y:e.clientY/innerHeight,active:true};});
    const releasePointer=e=>{if(e.pointerType==='touch')return;if(e.button===0)this.firing=false;if(e.button===2)this.aimHeld=false;};const cancelPointer=e=>{if(e.pointerType==='touch')return;this.firing=false;this.aimHeld=false;this.moveRequest=null;};canvas.addEventListener('pointerup',releasePointer);window.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',cancelPointer);window.addEventListener('pointercancel',cancelPointer);canvas.addEventListener('lostpointercapture',cancelPointer);canvas.addEventListener('contextmenu',e=>e.preventDefault());
    // Pointer events only emit pointerdown for the first button in a mouse chord.
    // Mouse events keep aim + fire independent when the second button is pressed.
    canvas.addEventListener('mousedown',e=>{if(this.perspective&&this.playing)this.mouseButton(e.button,true);});
    window.addEventListener('mouseup',e=>this.mouseButton(e.button,false));
    canvas.addEventListener('wheel',e=>{e.preventDefault();onAction(e.deltaY>0?'nextWeapon':'prevWeapon');},{passive:false});
    document.addEventListener('pointerlockerror',()=>{this.lockUnavailable=true;});
    document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(this.wasLocked&&!locked&&this.playing&&!document.querySelector('dialog[open]'))onAction('pause');this.wasLocked=locked;});
    this.touchHoldIds={};
    for(const [id,key]of [['drive-brake','touchBrake'],['drive-reverse','touchReverse']]){const button=document.getElementById(id);button?.addEventListener('pointerdown',e=>{if(this.touchHoldIds[key]!==undefined)return;e.preventDefault();this.source='touch';this.touchHoldIds[key]=e.pointerId;this[key]=true;try{button.setPointerCapture(e.pointerId);}catch{/* The browser may have cancelled the pointer. */}});for(const event of ['pointerup','pointercancel','lostpointercapture'])button?.addEventListener(event,e=>{if(this.touchHoldIds[key]===e.pointerId){delete this.touchHoldIds[key];this[key]=false;}});}
    this.touchControls=new TouchControls(this);
  }
  setKeyboardBindings(bindings){this.keyboardBindings=normalizeKeyboardBindings(bindings);this.settings.keyboardBindings=this.keyboardBindings;this.clear();return this.keyboardBindings;}
  keyDown(e){
    // Menus retain native Escape, arrows, Enter and shortcuts. No gameplay edge
    // or held movement may survive a key typed into a dialog or editable field.
    const editable=e.target?.isContentEditable||e.target?.closest?.('input,select,textarea,[contenteditable="true"],[contenteditable=""]');
    if(e.defaultPrevented||e.isComposing||e.metaKey||e.ctrlKey||e.altKey||editable||document.querySelector('dialog[open]')){this.keys.clear();this.once={};return;}
    if(!this.playing&&['Enter','NumpadEnter','Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))return;
    const actions=resolveKeyboardActions(this.keyboardBindings,e.code,this.keyboardContext||'foot').filter(id=>this.playing||!!KEYBOARD_ACTIONS[id].command);if(!actions.length)return;
    if(e.repeat&&!this.keys.has(e.code))return;
    this.source='keyboard';e.preventDefault();const repeated=e.repeat||this.keys.has(e.code);this.keys.add(e.code);
    if(repeated)return;
    for(const id of actions){const a=KEYBOARD_ACTIONS[id];
      if(a.command){if(a.context==='all'||this.playing)this.onAction(a.command);continue;}
      if(!this.playing||a.mode==='hold')continue;
      if(a.hand!==undefined){this.onWeaponWheel?.({type:'cycle',hand:a.hand},this.pad);continue;}
      if(a.weapon)this.once.weapon=a.weapon;else this.once[id]=true;
    }
  }
  mouseButton(button,down){if(button===0)this.firing=down;if(button===2)this.aimHeld=down&&this.perspective;}
  clear(){this.wasLocked=false;this.aimHeld=this.aimToggle=false;this.weaponHold?.reset();this.onCancelWheel?.();if(typeof document!=='undefined'&&document?.pointerLockElement===this.canvas)document?.exitPointerLock?.();this.perspective=false;this.lookX=this.lookY=0;this.touchControls?.clear();this.touchWorldAim=null;this.touchFiring=false;this.touchHoldIds={};this.touchBrake=this.touchReverse=false;this.padGuard=true;this.padAim=null;this.keys.clear();this.once={};this.firing=false;this.destination=null;this.moveRequest=null;this.stick={x:0,y:0};this.resetStick?.();this.resetAim?.();this.touchAim=null;this.onStopFeedback?.();}
  pollGamepad(sim,now=performance.now()){this.playing=activeGameplay(sim.state);this.keyboardContext=sim.interior?'interior':sim.player.vehicleId?'vehicle':'foot';
    const dt=Math.min(.05,Math.max(0,(now-(this.padTime??now))/1000));this.padTime=now;
    if(document.hidden||!document.hasFocus()){if(!this.padInactive)this.clear();this.padInactive=true;this.padButtons=[];return;}this.padInactive=false;
    let pads=[];try{pads=Array.from(this.getGamepads?this.getGamepads():navigator.getGamepads?.()||[]).filter(Boolean);}catch{/* Some embedded browsers deny access. */}
    const raw=selectGamepad(pads,this.pad||this.rawPad,this.settings);this.onRawGamepad?.(raw);
    const old=this.pad,settings=this.settings||CONTROL_DEFAULTS,b=settings.bindings||BINDINGS;
    const changed=old&&raw&&(old.index!==raw.index||old.id!==raw.id);
    this.rawPad=raw;if(this.calibrating){this.pad=null;this.padButtons=[];return;}this.pad=sampleGamepad(raw,changed?[]:this.padButtons,settings);this.padButtons=this.pad?.buttons||[];
    const label=document.getElementById('controller-status');
    this.family=this.pad?controllerFamily(this.pad.id,settings.promptStyle):settings.promptStyle==='auto'?(this.family||'playstation'):settings.promptStyle;const brand=this.family==='playstation'?'PLAYSTATION':this.family==='xbox'?'XBOX':'GAMEPAD';
    const status=this.pad?`${brand} CONNECTED · CONTROLS IN SETTINGS`:pads.length?'CONTROLLER DETECTED · CONFIGURE LAYOUT IN SETTINGS':'CONTROLLER · CONNECT, THEN PRESS A BUTTON';if(label&&label.textContent!==status)label.textContent=status;
    if(!this.pad){if(old){this.clear();this.source='keyboard';if(activeGameplay(sim.state)){this.onAction('pause');if(label)label.textContent='CONTROLLER DISCONNECTED · GAME PAUSED';}}return;}
    if(changed){this.clear();return;}
    const pad=this.pad,press=pad.pressed,dialog=[...document.querySelectorAll?.('dialog[open]')||[]].at(-1)||document.querySelector('dialog[open]');
    if(pad.buttons.some(Boolean)||Math.hypot(pad.move.x,pad.move.y)>.1||Math.hypot(pad.aim.x,pad.aim.y)>.1)this.source='gamepad';
    if(dialog||!this.playing){this.weaponHold?.reset();this.onCancelWheel?.();
      if(!dialog&&sim.state!=='menu')return;
      const root=dialog||document.getElementById('menu');
      if(this.menuRoot!==root){this.menuRoot=root;this.menuHeld=false;this.menuWaitRelease=true;}
      this.padGuard=true;
      if(this.menuWaitRelease){if(!pad.buttons.some(Boolean))this.menuWaitRelease=false;else return;}
      if(dialog?.id==='map-dialog'&&this.onMapInput?.(pad,dt))return;
      this.navigateMenu(root,pad,now);
      if(press[1]&&dialog){if(dialog.id==='pause-dialog')this.onAction('pause');else if(!['upgrade-dialog','result-dialog'].includes(dialog.id)){if(this.onMenuBack?.(dialog))return;dialog.close();}}
      if(press[9]&&dialog?.id==='pause-dialog')this.onAction('pause');
      return;
    }
    this.menuRoot=null;this.menuHeld=false;
    if(this.padGuard){if(!pad.buttons.some(Boolean)&&Math.hypot(pad.move.x,pad.move.y)<.1&&Math.hypot(pad.aim.x,pad.aim.y)<.1)this.padGuard=false;else return;}
    for(const action of ['pause','map','arsenal'])if(press[b[action]]||(action==='map'&&press[17])){this.onAction(action);return;}
    if(sim.interior){this.weaponHold?.reset();this.onCancelWheel?.();if(press[b.interact])this.once.interact=true;return;}
    if(!sim.player.vehicleId){
      if(this.weaponWheelActive&&press[1]){this.clear();return;}
      this.weaponHold??=new WeaponHold();const event=this.weaponHold.update(pad.buttons,b,now);this.onWeaponWheel?.(event,pad);
      if(this.weaponWheelActive)return;
      if(press[b.auto])this.onAction('auto');if(press[b.aim])this.once.toggleAim=true;
    }else{this.weaponHold?.reset();this.onCancelWheel?.();}
    for(const action of (sim.player.vehicleId?['interact']:['dash','reload','interact','grenade','bulletTime']))if(press[b[action]])this.once[action]=true;
    if(sim.player.traversal&&!sim.player.vehicleId)for(const action of ['jump','grapple'])if(press[b[action]])this.once[action]=true;
    if(Math.hypot(pad.aim.x,pad.aim.y)>.1){
      const a=worldStick({x:pad.aim.x,y:pad.aim.y*(settings.invertAim?-1:1)}),len=Math.hypot(a.x,a.z),range=5+11*Math.min(1,len),angle=Math.atan2(a.x,a.z);
      const previous=this.aimAngle??angle,delta=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));this.aimAngle=previous+delta*(1-Math.exp(-dt*24*settings.aimSensitivity));
      this.padAim={x:sim.player.x+Math.sin(this.aimAngle)*range,z:sim.player.z+Math.cos(this.aimAngle)*range};
      if(settings.aimAssist){const target=(sim.enemies||[]).filter(e=>e.health>0&&Math.hypot(e.x-sim.player.x,e.z-sim.player.z)<range+5&&assistedAimClear(sim,e)).map(e=>({e,d:Math.abs(Math.atan2(Math.sin(Math.atan2(e.x-sim.player.x,e.z-sim.player.z)-this.aimAngle),Math.cos(Math.atan2(e.x-sim.player.x,e.z-sim.player.z)-this.aimAngle)))})).sort((a,b)=>a.d-b.d)[0];if(target?.d<.13)this.padAim=assistedAimPoint(target.e);}
    }else if(this.padAim){
      const tracked=settings.aimAssist&&this.padAim.targetId!==undefined?(sim.enemies||[]).find(e=>e.id===this.padAim.targetId&&e.health>0&&Math.hypot(e.x-sim.player.x,e.z-sim.player.z)<21&&assistedAimClear(sim,e)):null;
      this.padAim=tracked?assistedAimPoint(tracked):{x:this.padAim.x+(sim.player.x-(this.lastPadX??sim.player.x)),z:this.padAim.z+(sim.player.z-(this.lastPadZ??sim.player.z))};
    }
    this.lastPadX=sim.player.x;this.lastPadZ=sim.player.z;
    if(handInput(pad,b).some(Boolean)&&!this.padAim)this.padAim={x:sim.player.x+Math.sin(sim.player.angle)*16,z:sim.player.z+Math.cos(sim.player.angle)*16};
  }
  navigateMenu(root,pad,now){
    const controls=[...root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary,canvas[tabindex]')].filter(e=>e.getClientRects().length&&!e.closest?.('#controller-qa'));
    let active=document.activeElement,index=controls.indexOf(active);
    if(index<0){active=controls.find(e=>e.classList?.contains('primary'))||controls[0];active?.focus();index=controls.indexOf(active);}
    const vertical=pad.buttons[12]?-1:pad.buttons[13]?1:Math.abs(pad.move.y)>.6?Math.sign(pad.move.y):0;
    const horizontal=pad.buttons[14]?-1:pad.buttons[15]?1:Math.abs(pad.move.x)>.6?Math.sign(pad.move.x):0;
    const direction=vertical||horizontal;
    if(direction&&(!this.menuHeld||now>(this.menuRepeat||0))){
      if(horizontal&&active?.tagName==='SELECT'){this.changeSelection(active,horizontal);}
      else if(horizontal&&active?.type==='range'){active.value=String(stepRange(active.value,horizontal,active));active.dispatchEvent(new Event('input',{bubbles:true}));}
      else{const next=controls[directionalControl(controls.map(e=>e.getBoundingClientRect()),index,vertical?0:horizontal,vertical)];next?.focus();next?.scrollIntoView({block:'nearest'});}
      this.menuRepeat=now+(this.menuHeld?170:380);
    }this.menuHeld=!!direction;
    if(pad.pressed[0]){if(active?.tagName==='SELECT'){this.changeSelection(active,1,true);}else if(active?.tagName==='BUTTON'||active?.tagName==='SUMMARY'||active?.type==='checkbox')active.click();}
  }
  changeSelection(select,direction,wrap=false){const index=enabledOptionIndex(select.options,select.selectedIndex,direction,wrap);if(index===select.selectedIndex)return;select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));select.dispatchEvent(new Event('input',{bubbles:true}));}
  consume(world,auto,sim=null,dt=1/60){
    if(this.weaponWheelActive){this.once={};return {x:0,z:0,auto:false,firing:false,fireHands:[false,false],aim:null};}
    const k=this.keys,held=id=>keyboardHeld(this.keyboardBindings,k,id);let x=+held('moveRight')-held('moveLeft')+this.stick.x;
    let y=+held('moveDown')-held('moveUp')+this.stick.y;
    const pad=this.padGuard||this.source&&this.source!=='gamepad'?null:this.pad;if(pad){x+=pad.move.x;y+=pad.move.y;}
    if(sim?.interior){const interact=!!this.once.interact;this.once={};this.destination=this.moveRequest=null;this.perspective=false;this.lookX=this.lookY=0;return {x:x*.776+y*.63,z:-x*.63+y*.776,interact,auto:false,firing:false};}
    if(this.moveRequest){this.destination=world.aim(this.moveRequest.x,this.moveRequest.y);this.moveRequest=null;}
    if(Math.hypot(x,y)>.1)this.destination=null;
    let hands=pad?handInput(pad,this.settings?.bindings||BINDINGS):undefined;const keyboardHands=[held('fire')||held('fireRight'),held('fire')||held('fireLeft')];if(keyboardHands.some(Boolean))hands=keyboardHands.map((down,i)=>down||!!hands?.[i]);const aiming=pad&&Math.hypot(pad.aim.x,pad.aim.y)>.1;
    const touchSim=sim||(world.player?{player:world.player.position,enemies:[],blocked:()=>false}:null);
    const touchTarget=this.source==='touch'&&this.touchAim&&touchSim?touchAimTarget(this.touchAim,touchSim,this.settings?.touchAimAssist!==false):null;this.touchWorldAim=touchTarget;
    if(this.once.toggleAim)this.aimToggle=!this.aimToggle;
    const out={brake:held('handbrake')||!!pad?.buttons[1],destination:this.destination,...this.once,x:x*.776+y*.63,z:-x*.63+y*.776,auto:aiming?false:auto,aim:pad&&(hands.some(Boolean)||this.once.grenade||aiming)?this.padAim:touchTarget||(this.pointer.active?world.aim(this.pointer.x,this.pointer.y,sim):null),firing:this.firing||!!this.touchFiring||held('fire'),fireHands:hands};this.once={};
    if(keyboardHands.some(Boolean)&&!out.aim&&sim)out.aim={x:sim.player.x+Math.sin(sim.player.angle)*18,z:sim.player.z+Math.cos(sim.player.angle)*18};
    this.perspective=!!world.viewRig?.active;out.aiming=this.perspective&&!!(this.aimHeld||this.aimToggle||held('aimHold'));
    if(!sim?.player.traversal||sim.player.vehicleId)out.jump=out.grapple=false;
    if(this.perspective&&sim){const rig=world.viewRig,look=pad?.aim||(this.source==='touch'&&this.touchFiring?this.touchAim:null);rig.look((this.lookX||0)+(look?.x||0)*18*Math.min(.05,dt)*60*(this.settings?.aimSensitivity||1),(this.lookY||0)+(look?.y||0)*14*Math.min(.05,dt)*60*(this.settings?.invertAim?-1:1));this.lookX=this.lookY=0;Object.assign(out,cameraMovement(x,y,rig.yaw));out.aim=rig.aim(sim.player,sim);out.auto=false;out.destination=null;this.destination=null;this.touchWorldAim=out.aim;}
    const vehicle=sim?.props.find(v=>v.id===sim.player.vehicleId);
    if(vehicle){
      out.aiming=false;this.aimHeld=this.aimToggle=false;
      this.destination=this.moveRequest=null;out.destination=null;out.firing=false;out.fireHands=[false,false];out.grenade=out.dash=out.melee=out.reload=false;out.weapon=null;
      const assisted=this.source==='touch'||this.settings?.drivingStyle==='assisted';
      out.drive=assisted?assistedDrive(vehicle,out.x,out.z,!!this.touchBrake||out.brake):{throttle:pad?(pad.triggers?.[1]??+!!pad.buttons[7]):+held('moveUp'),brake:pad?(pad.triggers?.[0]??+!!pad.buttons[6]):+held('moveDown'),steer:pad?pad.move.x:x,handbrake:out.brake};
      if(assisted&&pad?.triggers?.[0]>.05)out.drive={...assistedDrive(vehicle,-out.x,-out.z),throttle:0,brake:pad.triggers[0],handbrake:out.brake};
      if(assisted&&held('reverse'))out.drive={...assistedDrive(vehicle,-out.x,-out.z),throttle:0,brake:1,handbrake:out.brake};
      if(this.touchReverse)out.drive={...assistedDrive(vehicle,-out.x,-out.z),throttle:0,brake:1,handbrake:!!this.touchBrake};
      out.steerSensitivity=this.settings?.steerSensitivity||1;
    }return out;
  }
}
