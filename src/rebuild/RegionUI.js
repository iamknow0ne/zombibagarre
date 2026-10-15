import {nearbyRoofCache} from './RooftopEncounters.js';
import {nearbyTravelGate,nearbyCountrySupply} from './Regions.js';
import {keyboardHint} from './KeyboardBindings.js';
import {glyph} from './ControllerConfig.js';
import {actionIcon} from './ActionIcons.js';

// Reuse the existing contextual interact button and its touch/controller wiring.
export class RegionUI {
 constructor(input){this.input=input;this.loading=document.createElement('section');this.loading.className='region-loading';this.loading.hidden=true;this.loading.setAttribute('role','status');this.loading.innerHTML='<small>REGIONAL FOOTPATH</small><strong>Following the road…</strong><p>Your expedition stays with you.</p>';document.body.append(this.loading);}
 update(sim,world){
  this.loading.hidden=sim.state!=='travelling';
  if(sim.interior||!['playing','extracting'].includes(sim.state))return;
  const gate=nearbyTravelGate(sim),supply=gate?null:nearbyCountrySupply(sim),cache=gate||supply?null:nearbyRoofCache(sim),target=gate||supply||cache;
  if(!target)return;
  const touch=document.body.classList.contains('touch-layout'),label=cache?(cache.record.state==='cleared'?'Open rooftop supplies':'Supplies sealed / defeat guardian'):gate?`Travel to ${gate.destination==='city'?'Saint-Roch':'Old Mill Road'}`:sim.rpg?.countrySupplies?'Supplies recovered':'Search medical supplies';
  const button=document.getElementById('vehicle-action');button.hidden=false;document.querySelector('.vehicle-readout').hidden=false;
  actionIcon(button,gate?'door':'crate',label,touch?'':label);
  if(!touch){const point=world.screenPoint(target.x,cache?cache.y+1.2:2.2,target.z),prompt=document.getElementById('vehicle-world-prompt');prompt.hidden=!point.visible;prompt.style.left=point.x+'px';prompt.style.top=point.y+'px';const binding=this.input.source==='gamepad'?glyph(this.input.settings.bindings.interact,this.input.family):`<kbd>${keyboardHint(this.input.settings.keyboardBindings,'interact')}</kbd>`;prompt.innerHTML=binding+' '+label;}
 }
}
export const REGION_SAVE_POLICY='Your hero is saved automatically. Pause → Save expedition & exit keeps this route, quests and loot on this device. Resume once from the title screen; save again before closing. Expedition saves need secure browser storage and are separate from hero backups.';
