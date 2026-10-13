import {upgradeIcon} from './UpgradeUI.js';
export function decorateMenus(){
 for(const [id,key]of [['open-arsenal','dualgun'],['open-guide','book'],['open-settings','settings'],['open-camp','crate'],['open-character','person'],['pause-character','person'],['pause-arsenal','dualgun'],['pause-map','map'],['pause-settings','settings']]){
  const b=document.getElementById(id);if(!b||b.querySelector('.menu-icon'))continue;const icon=document.createElement('span');icon.className='menu-icon';icon.innerHTML=upgradeIcon(key);b.prepend(icon);
 }
}
