import {sampleGamepad,worldStick} from './Gamepad.js';
export class Input {
  constructor(canvas,onAction){
    this.padButtons=[];this.pad=null;this.padGuard=false;this.keys=new Set();this.once={};this.pointer={x:.5,y:.5,active:false};this.firing=false;this.stick={x:0,y:0};this.canvas=canvas;this.onAction=onAction;
    window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!document.querySelector('dialog[open]'))e.preventDefault();
      if(!e.repeat){const actions={Escape:'pause',KeyP:'pause',KeyT:'auto',KeyB:'arsenal',KeyM:'map'};if(actions[e.code])onAction(actions[e.code]);
        const single={Space:'dash',KeyF:'melee',KeyE:'grenade',KeyR:'reload',KeyV:'interact',Digit9:'katana',Digit0:'dual',Digit1:'carbine',Digit2:'shotgun',Digit3:'smg',Digit4:'revolver',Digit5:'marksman',Digit6:'flame',Digit7:'launcher',Digit8:'arc'};if(single[e.code]){if(e.code.startsWith('Digit'))this.once.weapon=single[e.code];else this.once[single[e.code]]=true;}}
      this.keys.add(e.code);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clear());
    canvas.addEventListener('pointermove',e=>{this.pointer={x:e.clientX/innerWidth,y:e.clientY/innerHeight,active:true};});
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;this.firing=e.button===0;canvas.setPointerCapture(e.pointerId);if(e.button===2)this.moveRequest={x:e.clientX/innerWidth,y:e.clientY/innerHeight};this.pointer={x:e.clientX/innerWidth,y:e.clientY/innerHeight,active:true};});
    canvas.addEventListener('pointerup',()=>{this.firing=false;});canvas.addEventListener('pointercancel',()=>{this.firing=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{e.preventDefault();onAction(e.deltaY>0?'nextWeapon':'prevWeapon');},{passive:false});
    const joy=document.querySelector('#joystick'),knob=document.querySelector('#joystick-knob');let id=null;
    const move=e=>{const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy)||1,max=r.width*.35;this.stick={x:dx/Math.max(d,max),y:dy/Math.max(d,max)};knob.style.transform=`translate(${this.stick.x*max}px,${this.stick.y*max}px)`;};
    joy.addEventListener('pointerdown',e=>{id=e.pointerId;joy.setPointerCapture(id);move(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===id)move(e);});
    const release=()=>{id=null;this.stick={x:0,y:0};knob.style.transform='';};joy.addEventListener('pointerup',release);joy.addEventListener('pointercancel',release);this.resetStick=release;
  }
  clear(){this.padGuard=true;this.padAim=null;this.keys.clear();this.once={};this.firing=false;this.destination=null;this.moveRequest=null;this.stick={x:0,y:0};this.resetStick?.();}
  pollGamepad(sim,now=performance.now()){
    if(document.hidden||!document.hasFocus()){if(!this.padInactive)this.clear();this.padInactive=true;this.padButtons=[];return;}this.padInactive=false;
    let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch{/* Embedded browsers can deny gamepad access. */}
    const raw=pads.find(p=>p.index===this.pad?.index&&p.connected)||pads.find(p=>p.connected&&p.mapping==='standard');
    const old=this.pad;this.pad=sampleGamepad(raw,this.padButtons);this.padButtons=this.pad?.buttons||[];
    const label=document.getElementById('controller-status');const status=this.pad?'GAMEPAD READY · R2 ATTACK · OPTIONS PAUSE':pads.length?'CONTROLLER MAPPING UNSUPPORTED · TRY CHROME OR SAFARI':'CONTROLLER · CONNECT, THEN PRESS A BUTTON';if(label&&label.textContent!==status)label.textContent=status;
    if(!this.pad){if(old&&['playing','extracting'].includes(sim.state)){this.onAction('pause');document.getElementById('controller-status').textContent='CONTROLLER DISCONNECTED · GAME PAUSED';}this.padAim=null;return;}
    const pad=this.pad,press=pad.pressed,dialog=document.querySelector('dialog[open]');
    if(dialog||sim.state==='menu'){
      const root=dialog||document.getElementById('menu');
      const controls=[...root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(e=>e.getClientRects().length);
      const active=document.activeElement,index=controls.indexOf(active);
      const vertical=pad.buttons[12]?-1:pad.buttons[13]?1:Math.abs(pad.move.y)>.6?Math.sign(pad.move.y):0;
      const horizontal=pad.buttons[14]?-1:pad.buttons[15]?1:Math.abs(pad.move.x)>.6?Math.sign(pad.move.x):0;
      const direction=vertical||horizontal;
      if(direction&&(!this.menuHeld||now>(this.menuRepeat||0))){
        if(horizontal&&active?.tagName==='SELECT'){active.selectedIndex=Math.max(0,Math.min(active.options.length-1,active.selectedIndex+horizontal));active.dispatchEvent(new Event('change',{bubbles:true}));}
        else if(horizontal&&active?.type==='range'){active.value=String(Number(active.value)+horizontal*5);active.dispatchEvent(new Event('input',{bubbles:true}));}
        else {const next=controls[(index+direction+controls.length)%controls.length];next?.focus();next?.scrollIntoView({block:'nearest'});}
        this.menuRepeat=now+(this.menuHeld?170:380);
      }this.menuHeld=!!direction;
      if(press[0]){const selected=controls.includes(document.activeElement)?document.activeElement:controls[0];if(selected?.tagName==='BUTTON'||selected?.type==='checkbox')selected.click();else selected?.focus();}
      if(press[1]&&dialog){if(dialog.id==='pause-dialog')this.onAction('pause');else if(!['upgrade-dialog','result-dialog'].includes(dialog.id))dialog.close();}
      if(press[9]&&dialog?.id==='pause-dialog')this.onAction('pause');
      this.padGuard=true;return;
    }
    this.menuHeld=false;
    if(this.padGuard){if(!pad.buttons.some(Boolean)&&Math.hypot(pad.move.x,pad.move.y)<.1&&Math.hypot(pad.aim.x,pad.aim.y)<.1)this.padGuard=false;else return;}
    if(press[9]){this.onAction('pause');return;}
    if(press[8]||press[13]){this.onAction('map');return;}if(press[11]||press[12]){this.onAction('arsenal');return;}
    if(press[10])this.onAction('auto');if(press[5]||press[15])this.onAction('nextWeapon');if(press[14])this.onAction('prevWeapon');
    if(press[0]||press[1])this.once.dash=true;if(press[2])this.once.reload=true;if(press[3])this.once.interact=true;if(press[4])this.once.grenade=true;
    if(Math.hypot(pad.aim.x,pad.aim.y)>.1){const a=worldStick(pad.aim);this.padAim={x:sim.player.x+a.x*16,z:sim.player.z+a.z*16};}
    else if(this.padAim){const dx=this.padAim.x-(this.lastPadX??sim.player.x),dz=this.padAim.z-(this.lastPadZ??sim.player.z);this.padAim={x:sim.player.x+dx,z:sim.player.z+dz};}
    this.lastPadX=sim.player.x;this.lastPadZ=sim.player.z;
    if(pad.fire&&!this.padAim)this.padAim={x:sim.player.x+Math.sin(sim.player.angle)*16,z:sim.player.z+Math.cos(sim.player.angle)*16};
  }
  consume(world,auto){
    const k=this.keys;let x=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('KeyQ')||k.has('ArrowLeft')?1:0)+this.stick.x;
    let y=(k.has('KeyS')||k.has('ArrowDown')?1:0)-(k.has('KeyW')||k.has('KeyZ')||k.has('ArrowUp')?1:0)+this.stick.y;
    const pad=this.padGuard?null:this.pad;if(pad){x+=pad.move.x;y+=pad.move.y;}
    if(this.moveRequest){this.destination=world.aim(this.moveRequest.x,this.moveRequest.y);this.moveRequest=null;}
    if(Math.hypot(x,y)>.1)this.destination=null;
    const out={brake:k.has('Space')||!!pad?.brake,destination:this.destination,...this.once,x:x*.776+y*.63,z:-x*.63+y*.776,auto:pad&&Math.hypot(pad.aim.x,pad.aim.y)>.1?false:auto,aim:pad&&(pad.fire||this.once.grenade||Math.hypot(pad.aim.x,pad.aim.y)>.1)?this.padAim:this.pointer.active?world.aim(this.pointer.x,this.pointer.y):null,firing:this.firing||!!pad?.fire};this.once={};return out;
  }
}
