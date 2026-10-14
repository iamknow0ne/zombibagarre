import {interiorInteraction,nearbyInteriorDoor,nearbyInteriorRecovery,hasInteriorCase} from './Interiors.js';
import {questObjective} from './RPG.js';
import {glyph,buttonName} from './ControllerConfig.js';
import {actionIcon} from './ActionIcons.js';
import {bindTouchAction} from './TouchControls.js';
// A small field label and one reachable action leave the room itself in focus.
export class InteriorUI{
 constructor(input,openJournal){
  this.input=input;
  this.header=document.createElement('section');this.header.id='interior-header';this.header.hidden=true;
  this.header.innerHTML='<small>SHELTER / DIORAMA VIEW</small><h2></h2><p></p><button class="icon-action" aria-label="Open character and quest journal"></button>';
  this.action=document.createElement('button');this.action.id='interior-action';this.action.hidden=true;
  this.hint=document.createElement('p');this.hint.id='interior-hint';this.hint.hidden=true;
  document.getElementById('hud').append(this.header,this.action,this.hint);
  const journal=this.header.querySelector('button');actionIcon(journal,'book','Open character and quest journal');journal.onclick=openJournal;
  bindTouchAction(this.action,input,()=>{input.once.interact=true;});
 }
 update(sim,world){
  const room=sim.interior,active=sim.state==='interior',touch=document.body.classList.contains('touch-layout');
  document.body.classList.toggle('interior-play',!!room);this.header.hidden=!room;this.hint.hidden=!room;this.action.hidden=!active;
  if(!room){
   const door=nearbyInteriorDoor(sim),recovery=nearbyInteriorRecovery(sim);if(!['playing','extracting'].includes(sim.state)||(!door&&!recovery))return;
   const label=door?`Enter ${door.template==='workshop-v1'?'workshop':'apartment'}`:recovery.type==='case'?'Search salvaged tools':'Talk to Mara';
   const button=document.getElementById('vehicle-action');button.hidden=false;document.querySelector('.vehicle-readout').hidden=false;actionIcon(button,door?'door':recovery.type==='case'?'crate':'talk',label,touch?'':label);
   if(!touch){const prompt=document.getElementById('vehicle-world-prompt'),point=world.screenPoint((door?.door||recovery).x,2.2,(door?.door||recovery).z);prompt.hidden=!point.visible;prompt.style.left=point.x+'px';prompt.style.top=point.y+'px';prompt.innerHTML=this.binding()+' '+label;}
   return;
  }
  this.header.querySelector('h2').textContent=room.plan.name;
  const objective=sim.rpg?.tracked?questObjective(sim,sim.rpg.tracked):null;
  this.header.querySelector('p').textContent=objective?.text||(room.plan.template==='workshop-v1'?'Speak to Mara at the workbench.':'The evacuation left in a hurry. Someone packed the tools.');
  const object=interiorInteraction(sim);this.action.disabled=!object;
  const label=object?.type==='merchant'?'Talk to Mara':object?.type==='exit'?'Leave shelter':object?.type==='case'?(hasInteriorCase(sim)?'Case recovered':'Search tools'):'Move closer';
  this.action.setAttribute('aria-label',label);this.action.innerHTML=`${this.binding()}<span>${label}</span>`;
  this.hint.textContent=touch?'Move with the left stick · Tap to interact':this.input.source==='gamepad'?`Left stick · Move   /   ${buttonName(this.input.settings.bindings.arsenal,this.input.family)} · Character`:'WASD / arrows · Move   /   V · Interact   /   B · Character';
 }
 binding(){return this.input.source==='gamepad'?glyph(this.input.settings.bindings.interact,this.input.family):this.input.source==='touch'?'': '<kbd>V</kbd>';}
}
