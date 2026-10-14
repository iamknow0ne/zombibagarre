import {keyboardHint} from './KeyboardBindings.js';
import {bindTouchAction} from './TouchControls.js';
import {actionIcon} from './ActionIcons.js';
import {upgradeIcon} from './UpgradeUI.js';
import {glyph} from './ControllerConfig.js';
import {writeHUD} from './HUDPresentation.js';

export function traversalControlState(sim){
 const p=sim.player,enabled=!!p.traversal&&!p.vehicleId,playing=['playing','extracting'].includes(sim.state),attached=!!p.grapple,target=sim.traversalTarget;
 return {visible:enabled&&playing,jump:enabled&&playing,grapple:enabled&&playing&&(attached||!!target?.available),attached,
  grappleLabel:attached?'Release grapple cable':target?.available?`Grapple${target.label?' to '+target.label:''}`:target?.reason||'No reachable grapple anchor'};
}

// Two contextual controls, never replacements for dodge or thrown ordnance.
// The existing touch action binder preserves the other thumb's captured stick.
export class TraversalControlsUI{
 constructor(input,settings){
  this.input=input;this.settings=settings;this.group=document.createElement('div');this.group.id='traversal-actions';this.group.setAttribute('role','group');this.group.setAttribute('aria-label','Traversal controls');this.group.hidden=true;this.buttons={};
  for(const action of ['jump','grapple']){const b=document.createElement('button');b.type='button';b.id='traversal-'+action;this.group.append(b);this.buttons[action]=b;
   bindTouchAction(b,input,()=>{if(this.state?.[action])input.once[action]=true;});
  }
  document.getElementById('hud').append(this.group);
 }
 update(sim,touch){
  const state=this.state=traversalControlState(sim);this.group.hidden=!state.visible;document.body.classList.toggle('traversal-enabled',state.visible);if(!state.visible)return;
  for(const action of ['jump','grapple']){const button=this.buttons[action],label=action==='jump'?'Jump':state.grappleLabel;button.disabled=!state[action];button.classList.toggle('attached',action==='grapple'&&state.attached);
   if(touch)actionIcon(button,action,label);
   else{const hint=this.input.source==='gamepad'&&this.input.pad?glyph(this.settings.bindings[action],this.input.family):`<kbd>${keyboardHint(this.settings.keyboardBindings,action)}</kbd>`;writeHUD(button,`<span class="action-symbol">${upgradeIcon(action)}</span><span>${action==='jump'?'JUMP':state.attached?'RELEASE':'GRAPPLE'}</span>${hint}`);button.setAttribute('aria-label',label);button.title=label;}
  }
 }
}
