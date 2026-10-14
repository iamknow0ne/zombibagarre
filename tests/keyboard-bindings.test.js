import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYBOARD_ACTIONS,DEFAULT_KEYBOARD_BINDINGS,normalizeKeyboardBindings,rebindKeyboard,resolveKeyboardActions,keyboardHint,loadKeyboardBindings,saveKeyboardBindings} from '../src/rebuild/KeyboardBindings.js';
import {Input} from '../src/rebuild/Input.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {CONTROL_DEFAULTS} from '../src/rebuild/ControllerConfig.js';
function harness(t){const old=globalThis.document;let dialog=null;globalThis.document={querySelector:()=>dialog,querySelectorAll:()=>dialog?[dialog]:[],getElementById:()=>null,hasFocus:()=>true,hidden:false};t.after(()=>globalThis.document=old);const i=Object.create(Input.prototype),actions=[],cycles=[];Object.assign(i,{settings:{...CONTROL_DEFAULTS},keyboardBindings:normalizeKeyboardBindings(),keys:new Set(),once:{},stick:{x:0,y:0},pointer:{active:false},playing:true,keyboardContext:'foot',source:'keyboard',onAction:a=>actions.push(a),onWeaponWheel:e=>cycles.push(e),padButtons:[]});return {i,actions,cycles,dialog:d=>dialog=d};}
const key=(i,code,extra={})=>{const e={code,target:{closest:()=>null},preventDefault(){this.prevented=true;},...extra};i.keyDown(e);return e;};
const world={viewRig:{active:false},aim:()=>({x:3,z:10})};
const sim=()=>({player:{x:0,z:0,angle:0,traversal:true},props:[],enemies:[]});

test('default physical bindings retain WASD/ZQSD/arrows and Space has distinct foot/vehicle meanings',()=>{
 const b=normalizeKeyboardBindings();assert.deepEqual(b,DEFAULT_KEYBOARD_BINDINGS);for(const code of ['KeyW','KeyZ','ArrowUp'])assert.deepEqual(resolveKeyboardActions(b,code),['moveUp']);assert.deepEqual(resolveKeyboardActions(b,'Space','foot'),['dash']);assert.deepEqual(resolveKeyboardActions(b,'Space','vehicle'),['handbrake']);assert.deepEqual(resolveKeyboardActions(b,'Space','interior'),[]);assert.deepEqual(resolveKeyboardActions({},'Escape'),['pause']);
});
test('rebind previews are immutable, report conflicts and transfer only overlapping-context keys',()=>{
 const before=normalizeKeyboardBindings(),r=rebindKeyboard(before,'grenade','KeyW');assert.deepEqual(r.conflicts,['moveUp']);assert.deepEqual(r.bindings.moveUp,['KeyZ','ArrowUp']);assert.deepEqual(r.bindings.grenade,['KeyW']);assert.deepEqual(before.grenade,['KeyE']);const brake=rebindKeyboard(before,'handbrake','KeyE');assert.deepEqual(brake.conflicts,[]);assert.deepEqual(brake.bindings.grenade,['KeyE']);assert.deepEqual(rebindKeyboard(before,'dash','Escape').bindings,before);assert.ok(rebindKeyboard(before,'dash','Escape').error);assert.deepEqual(rebindKeyboard(before,'grenade',null).bindings.grenade,[]);
});
test('malformed saves are bounded, unknown actions removed and explicit overrides win future defaults',()=>{
 const b=normalizeKeyboardBindings({grenade:['KeyW','KeyW','Escape','<img>'],jump:[],evil:['KeyV']});assert.deepEqual(b.grenade,['KeyW']);assert.deepEqual(b.moveUp,['KeyZ','ArrowUp']);assert.deepEqual(b.jump,[]);assert.equal(b.evil,undefined);assert.deepEqual(normalizeKeyboardBindings(null),DEFAULT_KEYBOARD_BINDINGS);assert.deepEqual(normalizeKeyboardBindings(b),b);assert.equal(Object.keys(b).length,Object.keys(KEYBOARD_ACTIONS).length);
});
test('binding load/save helpers use the owning settings record without accessing localStorage',()=>{
 const settings={},b=rebindKeyboard({},'interact','KeyH').bindings;assert.deepEqual(saveKeyboardBindings(settings,b),b);assert.deepEqual(loadKeyboardBindings(settings),b);assert.equal(keyboardHint(b,'interact'),'H');assert.equal(keyboardHint({...b,interact:[]},'interact'),'Unbound');assert.equal(keyboardHint({...b,pause:[]},'pause'),'Escape');
});
test('press actions queue once while held movement survives repeats; released press queues again',t=>{
 const {i}=harness(t);key(i,'KeyJ');assert.equal(i.once.jump,true);i.once={};key(i,'KeyJ',{repeat:true});assert.deepEqual(i.once,{});i.keys.delete('KeyJ');key(i,'KeyJ');assert.equal(i.once.jump,true);i.once={};key(i,'KeyD');key(i,'KeyD',{repeat:true});const out=i.consume(world,false,sim());assert.ok(out.x>0&&out.z<0);assert.equal(out.jump,undefined);
});
test('remapped actions, menus, weapons and per-hand cycles reach existing hooks',t=>{
 const {i,actions,cycles}=harness(t);i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,'grenade','KeyH').bindings);key(i,'KeyE');assert.equal(i.once.grenade,undefined);key(i,'KeyH');assert.equal(i.once.grenade,true);key(i,'Digit9');assert.equal(i.once.weapon,'katana');key(i,'BracketLeft');key(i,'BracketRight');assert.deepEqual(cycles.map(e=>e.hand),[1,0]);key(i,'KeyI');key(i,'Escape');assert.deepEqual(actions,['character','pause']);
});
test('dialogs, editable targets, IME and browser shortcuts never queue or retain gameplay actions',t=>{
 const {i,actions,dialog}=harness(t);key(i,'KeyW');i.once.grenade=true;dialog({id:'settings-dialog'});assert.equal(key(i,'KeyE').prevented,undefined);assert.equal(i.keys.size,0);assert.deepEqual(i.once,{});key(i,'Escape');assert.deepEqual(actions,[]);dialog(null);
 for(const extra of [{target:{isContentEditable:true}},{target:{closest:()=>({})}},{isComposing:true},{metaKey:true},{ctrlKey:true},{altKey:true},{defaultPrevented:true}]){key(i,'KeyE',extra);assert.deepEqual(i.once,{});assert.equal(i.keys.size,0);}
 // A held key repeating after the dialog closes must be released first.
 key(i,'KeyW',{repeat:true});assert.equal(i.keys.size,0);assert.equal(i.consume(world,false,sim()).x,0);
});
test('keyboard movement and handbrake remaps drive racing and assisted vehicles',t=>{
 const {i}=harness(t);for(const [a,k]of [['moveUp','KeyU'],['moveDown','KeyK'],['handbrake','KeyH'],['reverse','KeyL']])i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,a,k).bindings);i.keyboardContext='vehicle';i.settings.drivingStyle='racing';const s=sim();s.player.vehicleId='car';s.props=[{id:'car',angle:0}];
 key(i,'KeyW');assert.equal(i.consume(world,false,s).drive.throttle,0);key(i,'KeyU');assert.equal(i.consume(world,false,s).drive.throttle,1);key(i,'KeyH');assert.equal(i.consume(world,false,s).drive.handbrake,true);i.keys.clear();key(i,'KeyK');assert.equal(i.consume(world,false,s).drive.brake,1);i.keys.clear();i.settings.drivingStyle='assisted';key(i,'KeyU');key(i,'KeyL');const out=i.consume(world,false,s);assert.equal(out.drive.throttle,0);assert.equal(out.drive.brake,1);assert.equal(out.grenade,false);
});
test('keyboard hand-fire bindings shoot only the requested weapon and both-fire shoots both',t=>{
 const {i}=harness(t);for(const [a,k]of [['fireRight','KeyH'],['fireLeft','KeyK'],['fire','KeyU']])i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,a,k).bindings);
 for(const [code,expected]of [['KeyH',[0]],['KeyK',[1]],['KeyU',[0,1]]]){i.keys.clear();const s=new Simulation({layout:{cover:[],bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30}}});s.start();s.setLoadout(['carbine','smg']);s.events=[];key(i,code);s.update(1/60,i.consume(world,false,s));assert.deepEqual(s.events.filter(e=>e.type==='shoot').map(e=>e.hand),expected);}
});
test('indoor movement and interaction work while weapon and traversal remaps are suppressed',t=>{
 const {i,cycles}=harness(t);i.keyboardContext='interior';key(i,'KeyD');key(i,'KeyV');key(i,'KeyJ');key(i,'KeyE');key(i,'BracketRight');const s=sim();s.interior={};const out=i.consume(world,true,s);assert.ok(out.x>0);assert.equal(out.interact,true);assert.equal(out.jump,undefined);assert.equal(out.grenade,undefined);assert.deepEqual(cycles,[]);assert.equal(out.auto,false);
});
test('setting bindings clears held actions, preventing a remap from triggering the newly assigned action',t=>{
 const {i}=harness(t);key(i,'KeyW');i.once.grenade=true;const b=rebindKeyboard(i.keyboardBindings,'grenade','KeyW').bindings;i.setKeyboardBindings(b);assert.equal(i.keys.size,0);assert.deepEqual(i.once,{});assert.equal(i.settings.keyboardBindings,i.keyboardBindings);key(i,'KeyW',{repeat:true});assert.deepEqual(i.once,{});
});
test('gamepad back can close a settings subpage without closing the whole dialog',t=>{
 const {i,dialog}=harness(t);let closed=0,backs=0;const d={id:'settings-dialog',close(){closed++;}};dialog(d);i.menuRoot=d;i.menuWaitRelease=false;i.navigateMenu=()=>{};i.onMenuBack=()=>{backs++;return true;};i.getGamepads=()=>[{id:'Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},(_,n)=>({pressed:n===1,value:n===1?1:0}))}];i.pollGamepad({state:'paused',player:{}},100);assert.equal(backs,1);assert.equal(closed,0);
});
test('remapped gameplay Enter and Tab preserve native main-menu activation and focus navigation',t=>{
 const {i}=harness(t);i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,'moveUp','Enter').bindings);i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,'grenade','Tab').bindings);i.playing=false;assert.equal(key(i,'Enter').prevented,undefined);assert.equal(key(i,'Tab').prevented,undefined);assert.equal(i.keys.size,0);assert.deepEqual(i.once,{});
});
test('menu command remaps cannot steal native Enter, Space, Tab or arrows from the title menu',t=>{
 const {i,actions}=harness(t);for(const code of ['Enter','NumpadEnter','Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){i.setKeyboardBindings(rebindKeyboard(i.keyboardBindings,'map',code).bindings);i.playing=false;assert.equal(key(i,code).prevented,undefined,code);assert.equal(actions.length,0,code);assert.equal(i.keys.size,0,code);}key(i,'Escape');assert.deepEqual(actions,['pause']);
});
