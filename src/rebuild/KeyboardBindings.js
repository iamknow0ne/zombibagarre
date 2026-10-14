// Physical KeyboardEvent.code bindings: layout-independent and shared by play,
// settings and live hints. Mouse, touch and controller mappings are independent.
const action=(label,group,mode,context,keys,extra={})=>({label,group,mode,context,keys,...extra});
export const KEYBOARD_ACTIONS={
 moveUp:action('Move forward','Movement','hold','all',['KeyW','KeyZ','ArrowUp']),
 moveDown:action('Move backward','Movement','hold','all',['KeyS','ArrowDown']),
 moveLeft:action('Move left','Movement','hold','all',['KeyA','KeyQ','ArrowLeft']),
 moveRight:action('Move right','Movement','hold','all',['KeyD','ArrowRight']),
 dash:action('Dodge','Combat','press','foot',['Space']),melee:action('Melee attack','Combat','press','foot',['KeyF']),
 grenade:action('Throw ordnance','Combat','press','foot',['KeyE']),reload:action('Reload','Combat','press','foot',['KeyR']),
 interact:action('Interact / enter / exit','Movement','press','all',['KeyV']),
 bulletTime:action('Bullet time','Combat','press','foot',['KeyC']),toggleAim:action('Toggle precision aim','Combat','press','foot',['KeyX']),
 jump:action('Jump','Movement','press','foot',['KeyJ']),grapple:action('Grapple / release','Movement','press','foot',['KeyG']),
 fire:action('Fire equipped weapons','Combat','hold','foot',[]),fireRight:action('Fire right weapon','Combat','hold','foot',[]),fireLeft:action('Fire left weapon','Combat','hold','foot',[]),aimHold:action('Hold precision aim','Combat','hold','foot',[]),
 pause:action('Pause','Menus','press','all',['KeyP'],{command:'pause'}),auto:action('Toggle autofire','Combat','press','foot',['KeyT'],{command:'auto'}),
 arsenal:action('Arsenal','Menus','press','all',['KeyB'],{command:'arsenal'}),character:action('Character / journal','Menus','press','all',['KeyI'],{command:'character'}),map:action('Map','Menus','press','all',['KeyM'],{command:'map'}),
 cycleRight:action('Cycle right weapon','Weapons','press','foot',['BracketRight'],{hand:0}),cycleLeft:action('Cycle left weapon','Weapons','press','foot',['BracketLeft'],{hand:1}),
 handbrake:action('Vehicle handbrake','Driving','hold','vehicle',['Space']),reverse:action('Assisted driving reverse','Driving','hold','vehicle',['ShiftLeft','ShiftRight']),
 ...Object.fromEntries(['carbine','shotgun','smg','revolver','marksman','flame','launcher','arc','katana','dual'].map((weapon,i)=>['weapon_'+weapon,action('Equip '+({dual:'dual swords',arc:'electric weapon',flame:'flamethrower'}[weapon]||weapon),'Weapons','press','foot',['Digit'+((i+1)%10)],{weapon})]))
};
export const DEFAULT_KEYBOARD_BINDINGS=Object.fromEntries(Object.entries(KEYBOARD_ACTIONS).map(([id,a])=>[id,[...a.keys]]));
const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Enter|Backspace|Tab|CapsLock|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Minus|Equal|Backquote|Numpad([0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter))$/.test(code);
const overlaps=(a,b)=>a==='all'||b==='all'||a===b;
export function normalizeKeyboardBindings(raw={}){
 const safe=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},result={},used=[];
 // Explicit custom bindings win over missing/default fields. This matters when
 // a new action is added to a future version of an existing save.
 const ids=Object.keys(KEYBOARD_ACTIONS).sort((a,b)=>Number(Array.isArray(safe[b]))-Number(Array.isArray(safe[a])));
 for(const id of ids){const a=KEYBOARD_ACTIONS[id],keys=Array.isArray(safe[id])?safe[id].filter(allowed).slice(0,3):a.keys;
  result[id]=[...new Set(keys)].filter(code=>!used.some(u=>u.code===code&&overlaps(a.context,u.context)));
  for(const code of result[id])used.push({code,context:a.context});
 }
 return Object.fromEntries(Object.keys(KEYBOARD_ACTIONS).map(id=>[id,result[id]]));
}
export function rebindKeyboard(bindings,id,code){
 const next=normalizeKeyboardBindings(bindings),a=KEYBOARD_ACTIONS[id];
 if(!a)return {bindings:next,conflicts:[],error:'Unknown keyboard action.'};
 if(code!==null&&!allowed(code))return {bindings:next,conflicts:[],error:code==='Escape'?'Escape always cancels menus and pauses the game.':'Use a letter, number, arrow or standard keyboard key.'};
 const conflicts=code===null?[]:Object.keys(next).filter(other=>other!==id&&overlaps(a.context,KEYBOARD_ACTIONS[other].context)&&next[other].includes(code));
 for(const other of conflicts)next[other]=next[other].filter(k=>k!==code);
 next[id]=code===null?[]:[code];return {bindings:next,conflicts,error:null};
}
export function resolveKeyboardActions(bindings,code,context='foot'){
 if(code==='Escape')return ['pause'];
 const source=bindings||DEFAULT_KEYBOARD_BINDINGS;
 return Object.keys(KEYBOARD_ACTIONS).filter(id=>{const a=KEYBOARD_ACTIONS[id];return (a.context==='all'||a.context===context)&&(source[id]||[]).includes(code);});
}
export function keyboardHeld(bindings,keys,id){return (bindings?.[id]||DEFAULT_KEYBOARD_BINDINGS[id]||[]).some(code=>keys.has(code));}
export function keyboardLabel(code){return ({Space:'Space',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Minus:'−',Equal:'=',Backquote:'`',ShiftLeft:'Left Shift',ShiftRight:'Right Shift',ControlLeft:'Left Ctrl',ControlRight:'Right Ctrl',AltLeft:'Left Alt',AltRight:'Right Alt'}[code]||code?.replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num ')||'Unbound');}
export function keyboardHint(bindings,id){return keyboardLabel((bindings?.[id]||DEFAULT_KEYBOARD_BINDINGS[id]||[])[0]||(id==='pause'?'Escape':undefined));}
// The owning SaveStore persists settings; these helpers never access storage,
// so QA sessions, backup/restore and save errors follow the existing pipeline.
export const loadKeyboardBindings=settings=>normalizeKeyboardBindings(settings?.keyboardBindings);
export function saveKeyboardBindings(settings,bindings){settings.keyboardBindings=normalizeKeyboardBindings(bindings);return settings.keyboardBindings;}
