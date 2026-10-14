import {KEYBOARD_ACTIONS,DEFAULT_KEYBOARD_BINDINGS,normalizeKeyboardBindings,rebindKeyboard,keyboardLabel,keyboardHint} from './KeyboardBindings.js';
import {upgradeIcon} from './UpgradeUI.js';

export const SETTINGS_SECTIONS=[
 ['gameplay','Gameplay','Difficulty, progression and Focus','person'],
 ['keyboard','Keyboard & mouse','Action keys and weapon shortcuts','target'],
 ['controller','Controller','Button layout, sticks and vibration','settings'],
 ['touch','Touch controls','Thumbsticks, size and aim assist','target'],
 ['graphics','Graphics & camera','Quality, visual style and perspective','eye'],
 ['world','World & weather','Theme, day cycle and atmosphere','map'],
 ['feedback','Combat display','Damage, health bars and gore','swords'],
 ['accessibility','Audio & accessibility','Sound, motion and quest guidance','book'],
 ['save','Your save','Backup, restore and saving status','crate'],
];
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};

// Rehome existing controls after their modules have mounted. Their nodes, values
// and event listeners survive; the settings implementations keep their ownership.
export class SettingsUI{
 constructor(input,settings,onSave,{onSectionChange=()=>{}}={}){
  Object.assign(this,{input,settings,onSave,onSectionChange});this.dialog=document.getElementById('settings-dialog');this.panels=new Map();this.links=new Map();
  const d=this.dialog;d.classList.add('settings-shell');d.setAttribute('aria-labelledby','settings-title');
  const title=d.querySelector('h2');title.id='settings-title';title.textContent='Make it your fight.';
  const header=node('header',undefined,'settings-header');header.append(d.querySelector('form'),d.querySelector(':scope > .label'),title);d.prepend(header);
  this.layout=node('div',undefined,'settings-layout');this.nav=node('nav',undefined,'settings-navigation');this.nav.setAttribute('aria-label','Settings categories');
  this.content=node('div',undefined,'settings-content');this.layout.append(this.nav,this.content);
  for(const [id,label,description,icon]of SETTINGS_SECTIONS){
   const link=button('',()=>this.select(id));link.id='settings-nav-'+id;link.setAttribute('aria-controls','settings-page-'+id);
   const glyph=node('span',undefined,'settings-icon');glyph.innerHTML=upgradeIcon(icon);glyph.setAttribute('aria-hidden','true');
   const text=node('span');text.append(node('strong',label),node('small',description));link.append(glyph,text,node('span','›','settings-chevron'));this.nav.append(link);this.links.set(id,link);
   const panel=node('section',undefined,'settings-page');panel.id='settings-page-'+id;panel.setAttribute('aria-labelledby',panel.id+'-title');panel.hidden=true;
   const h=node('h3',label);h.id=panel.id+'-title';h.tabIndex=-1;panel.append(h,node('p',description,'settings-description'));this.panels.set(id,panel);this.content.append(panel);
  }
  const take=(category,selector,closest)=>{const el=d.querySelector(selector);if(el)this.panels.get(category).append(closest?el.closest(closest):el);};
  const rows=(category,ids)=>ids.forEach(id=>take(category,'#'+id,'.setting-row'));
  rows('gameplay',['progression-setting','difficulty','control-autoFire']);take('gameplay','.focus-settings');
  rows('keyboard',[]);
  take('controller','#controller-settings');
  take('touch','#touch-mode','fieldset');
  rows('graphics',['quality','visual-style','diorama-clarity','shader-style','view-mode','foliage-detail','environment-detail','population-detail','lighting-detail']);take('graphics','.perspective-settings');take('graphics','#desktop-settings');
  const full=d.querySelector('#settings-fullscreen');if(full){const note=full.nextElementSibling;take('graphics','#settings-fullscreen');if(note?.classList.contains('fullscreen-note'))this.panels.get('graphics').append(note);}
  rows('world',['world-theme']);take('world','#world-lore');take('world','.living-world-settings');
  rows('feedback',['gore']);take('feedback','#damage-numbers','fieldset');
  rows('accessibility',['volume','reduced-motion','quest-guidance']);take('save','#save-panel');
  // Remove only empty legacy wrappers; surface any future unclassified controls
  // in Gameplay instead of silently making a new option inaccessible.
  for(const el of [...d.children]){
   if(el===header||el.id==='settings-done'||el.classList.contains('controller-menu-hint'))continue;
   if(el.querySelector('input,select,button,summary'))this.panels.get('gameplay').append(el);else el.remove();
  }
  d.append(this.layout);this.footer=node('footer',undefined,'settings-footer');
  this.backButton=button('← ALL SETTINGS',()=>this.back());this.backButton.id='settings-back';
  const saved=node('span','Changes save automatically','settings-save-note');this.footer.append(this.backButton,saved,document.getElementById('settings-done'));d.append(this.footer);
  document.getElementById('settings-done').textContent='DONE';
  for(const hint of [...d.querySelectorAll(':scope > .controller-menu-hint')])this.footer.append(hint);
  this.keyboard=new KeyboardSettings(this.panels.get('keyboard'),input,settings,onSave);
  d.addEventListener('cancel',e=>{if(this.back())e.preventDefault();});d.addEventListener('close',()=>{this.keyboard.cancel(false);this.onSectionChange(null);});
  input.onMenuBack=dialog=>dialog===d&&this.back();this.select(null,false);
 }
 open(){this.keyboard.cancel(false);this.select(matchMedia('(max-width: 640px)').matches?null:'gameplay');}
 select(id,focus=true){
  this.keyboard?.cancel(false);this.current=id;this.dialog.dataset.settingsView=id?'section':'categories';
  for(const [key,panel]of this.panels){panel.hidden=key!==id;this.links.get(key).setAttribute('aria-current',key===id?'page':'false');}
  this.backButton.hidden=!id;this.content.hidden=!id;this.nav.setAttribute('aria-label',id?'Settings categories':'Choose a settings category');
  this.onSectionChange(id);this.content.scrollTop=0;this.dialog.scrollTop=0;
  if(focus){const target=id?this.panels.get(id).querySelector('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary'):(this.links.get(this.previous)||this.links.get('gameplay'));target?.focus();}
 }
 back(){if(this.keyboard?.pending){this.keyboard.cancel();return true;}if(this.current){this.previous=this.current;this.select(null);return true;}return false;}
}

export class KeyboardSettings{
 constructor(host,input,settings,onSave){
  Object.assign(this,{host,input,settings,onSave});this.rows=new Map();
  host.append(node('p','Choose a key to replace it. Escape cancels a change and always pauses gameplay. Keys use physical positions; the defaults also include ZQSD and arrow keys.','keyboard-note'));
  const filterRow=node('label',undefined,'setting-row');filterRow.append(node('span','Action group'));this.filter=node('select');this.filter.setAttribute('aria-label','Keyboard action group');
  this.filter.append(new Option('All actions','all'));for(const group of new Set(Object.values(KEYBOARD_ACTIONS).map(a=>a.group)))this.filter.append(new Option(group,group));filterRow.append(this.filter);host.append(filterRow);
  this.capture=node('section',undefined,'keyboard-capture');this.capture.hidden=true;this.capture.setAttribute('aria-label','Change action key');
  this.message=node('p');this.message.setAttribute('role','status');this.message.setAttribute('aria-live','polite');this.controls=node('div',undefined,'keyboard-capture-actions');this.capture.append(this.message,this.controls);host.append(this.capture);
  this.groups=new Map();
  for(const [action,def]of Object.entries(KEYBOARD_ACTIONS)){
   if(!this.groups.has(def.group)){const group=node('fieldset',undefined,'keyboard-group');group.append(node('legend',def.group));this.groups.set(def.group,group);host.append(group);}
   const row=node('div',undefined,'keyboard-row');row.dataset.action=action;const label=node('span',def.label);row.append(label);const keys=node('div',undefined,'keyboard-keys');row.append(keys);this.groups.get(def.group).append(row);this.rows.set(action,{row,keys});
  }
  this.filter.onchange=()=>{this.cancel(false);for(const [name,group]of this.groups)group.hidden=this.filter.value!=='all'&&this.filter.value!==name;};
  const footer=node('div',undefined,'keyboard-tools');footer.append(button('RESET KEYBOARD DEFAULTS',()=>this.reset()));host.append(footer);
  host.append(node('p','Mouse: left button attacks; right button sets a destination in Diorama or aims in TPS/FPS. Scroll cycles weapons. Mouse buttons and menu navigation are fixed. Controller buttons are configured in Controller.','keyboard-note'));
  this.feedback=node('p',undefined,'keyboard-feedback');this.feedback.setAttribute('role','status');host.append(this.feedback);
  this.onKey=e=>{
   if(!this.pending?.action||this.pending.result)return;
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='Escape'){this.cancel();return;}
   if(e.ctrlKey||e.metaKey||e.altKey){this.message.textContent='Choose a single key without Control, Command or Alt. Escape cancels.';return;}
   this.propose(this.pending.action,e.code);
  };window.addEventListener('keydown',this.onKey,true);
  window.addEventListener('blur',()=>this.cancel(false));this.render();
 }
 render(){for(const el of document.querySelectorAll('[data-key-actions]'))el.textContent=el.dataset.keyActions.split(' ').map(id=>keyboardHint(this.input.keyboardBindings,id)).join(' / ');for(const [action,{keys}]of this.rows){keys.replaceChildren();const bound=this.input.keyboardBindings[action]||[];
   const change=button(bound.length?bound.map(keyboardLabel).join(' / '):'UNBOUND',()=>this.listen(action));change.id='key-bind-'+action;change.className='key-binding';change.setAttribute('aria-label',`Change ${KEYBOARD_ACTIONS[action].label} key, ${change.textContent}`);keys.append(change);
   const clear=button('×',()=>this.commit(rebindKeyboard(this.input.keyboardBindings,action,null).bindings,`${KEYBOARD_ACTIONS[action].label} unbound.`,action));clear.className='key-clear';clear.disabled=!bound.length;clear.setAttribute('aria-label','Clear '+KEYBOARD_ACTIONS[action].label+' keys');keys.append(clear);
  }}
 listen(action){this.input.clear();this.pending={action};this.capture.hidden=false;this.message.textContent=`Press a key for ${KEYBOARD_ACTIONS[action].label}. This replaces its current keys. Escape cancels.`;this.controls.replaceChildren(button('CANCEL',()=>this.cancel()));this.controls.firstChild.focus();this.capture.scrollIntoView({block:'nearest'});}
 propose(action,code){const result=rebindKeyboard(this.input.keyboardBindings,action,code);if(result.error){this.message.textContent=result.error+' Escape cancels.';return;}
  if(result.conflicts.length){this.pending={action,result};this.message.textContent=`${keyboardLabel(code)} is used by ${result.conflicts.map(id=>KEYBOARD_ACTIONS[id].label).join(', ')}. Move it to ${KEYBOARD_ACTIONS[action].label}? Those actions will lose this key.`;this.controls.replaceChildren(button('CANCEL',()=>this.cancel()),button('REASSIGN KEY',()=>this.commit(result.bindings,`${KEYBOARD_ACTIONS[action].label}: ${keyboardLabel(code)}.`,action)));this.controls.firstChild.focus();}
  else this.commit(result.bindings,`${KEYBOARD_ACTIONS[action].label}: ${keyboardLabel(code)}.`,action);
 }
 commit(bindings,message,action){this.input.setKeyboardBindings(bindings);this.onSave();this.cancel(false);this.render();this.feedback.textContent=message;this.rows.get(action)?.keys.firstChild.focus();}
 cancel(focus=true){const pending=this.pending;this.pending=null;this.capture.hidden=true;this.controls.replaceChildren();if(focus){if(pending?.action)this.rows.get(pending.action)?.keys.firstChild.focus();else if(pending?.reset)this.host.querySelector('.keyboard-tools button').focus();}}
 reset(){this.pending={reset:true};this.capture.hidden=false;this.message.textContent='Restore all keyboard defaults? Controller and touch settings will stay as they are.';this.controls.replaceChildren(button('CANCEL',()=>this.cancel()),button('RESTORE DEFAULTS',()=>{this.commit(normalizeKeyboardBindings(DEFAULT_KEYBOARD_BINDINGS),'Keyboard defaults restored.');this.host.querySelector('.keyboard-tools button').focus();}));this.controls.firstChild.focus();this.capture.scrollIntoView({block:'nearest'});}
}
