import {upgradeIcon} from './UpgradeUI.js';
// Preserve button nodes and pointer capture while updating only their contents.
export function actionIcon(el,key,label,value=''){
 if(!el)return;
 const signature=`${key}|${value}`;
 if(el.dataset.iconContent!==signature||!el.querySelector('.action-symbol')){
  el.innerHTML=`<span class="action-symbol">${upgradeIcon(key)}</span><span class="action-value" aria-hidden="true"></span>`;
  el.querySelector('.action-value').textContent=value;el.dataset.iconContent=signature;
 }
 el.classList.add('icon-action');el.setAttribute('aria-label',label);el.title=label;
}
