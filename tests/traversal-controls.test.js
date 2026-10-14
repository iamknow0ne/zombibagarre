import test from 'node:test';
import assert from 'node:assert/strict';
import {BINDINGS,controlSettings,rebind} from '../src/rebuild/ControllerConfig.js';
import {diagramActions} from '../src/rebuild/ControllerDiagram.js';
import {traversalControlState} from '../src/rebuild/TraversalControlsUI.js';
import {Input} from '../src/rebuild/Input.js';
import {bindTouchAction} from '../src/rebuild/TouchControls.js';

const oldKeys=Object.keys(BINDINGS).filter(k=>!['jump','grapple'].includes(k));
test('new traversal bindings occupy spare slots without moving any valid saved action',()=>{
 for(let offset=0;offset<16;offset++){
  const old=Object.fromEntries(oldKeys.map((key,i)=>[key,(i+offset)%16])),next=controlSettings({bindings:old}).bindings;
  for(const key of oldKeys)assert.equal(next[key],old[key]);
  assert.equal(new Set(Object.values(next)).size,16);assert.ok(!Object.values(old).includes(next.jump));assert.ok(!Object.values(old).includes(next.grapple));
  assert.deepEqual(controlSettings({bindings:next}).bindings,next,'migration remains stable on reload');
 }
 assert.equal(BINDINGS.jump,5);assert.equal(BINDINGS.grapple,7);assert.equal(BINDINGS.dash,0);assert.equal(BINDINGS.grenade,4);
 const old=Object.fromEntries(oldKeys.map(key=>[key,BINDINGS[key]]));old.prevWeapon=old.leftWeapon;delete old.leftWeapon;assert.equal(controlSettings({bindings:old}).bindings.leftWeapon,14);
 const changed=rebind(BINDINGS,'rightFire',7);assert.equal(changed.grapple,11);assert.equal(changed.rightFire,7);
 const legend=diagramActions({bindings:changed});assert.equal(legend.find(x=>x.label.startsWith('Grapple /')).id,'11');
});

test('traversal buttons are contextual and cable release remains available after losing a target',()=>{
 const sim={state:'playing',player:{}};assert.equal(traversalControlState(sim).visible,false);
 sim.player.traversal=true;assert.equal(traversalControlState(sim).visible,true);assert.equal(traversalControlState(sim).grapple,false);
 sim.traversalTarget={available:true,label:'Relay'};assert.equal(traversalControlState(sim).grapple,true);assert.equal(traversalControlState(sim).grappleLabel,'Grapple to Relay');
 sim.traversalTarget={available:false,reason:'Move closer'};assert.equal(traversalControlState(sim).grappleLabel,'Move closer');sim.player.grapple={anchorId:'relay'};assert.equal(traversalControlState(sim).grapple,true);assert.equal(traversalControlState(sim).grappleLabel,'Release grapple cable');
 sim.state='paused';assert.equal(traversalControlState(sim).visible,false);sim.state='playing';sim.player.vehicleId='car';assert.equal(traversalControlState(sim).visible,false);
});

test('jump and grapple are independent one-shot actions, blocked in vehicles and ordinary planar play',()=>{
 const input=Object.create(Input.prototype);Object.assign(input,{keys:new Set(),once:{jump:true,grapple:true,dash:true,grenade:true},stick:{x:1,y:0},pointer:{active:false},settings:controlSettings(),source:'touch'});
 const sim={player:{x:0,z:0,traversal:true},props:[],enemies:[]},out=input.consume({},false,sim);
 assert.equal(out.jump,true);assert.equal(out.grapple,true);assert.equal(out.dash,true);assert.equal(out.grenade,true);assert.ok(out.x>0);
 const again=input.consume({},false,sim);assert.ok(!again.jump&&!again.grapple);
 input.once={jump:true,grapple:true};sim.player.traversal=false;assert.equal(input.consume({},false,sim).jump,false);
 sim.player.traversal=true;sim.player.vehicleId='car';sim.props=[{id:'car',angle:0}];input.once={jump:true,grapple:true};const drive=input.consume({},false,sim);assert.equal(drive.jump,false);assert.equal(drive.grapple,false);
});

test('a second touch finger can jump without releasing the movement stick or throwing ordnance',()=>{
 const handlers={},button={disabled:false,addEventListener:(name,fn)=>handlers[name]=fn},input={once:{},stick:{x:.8,y:-.4},pointer:{active:true}};
 bindTouchAction(button,input,()=>input.once.jump=true);handlers.pointerdown({pointerType:'touch',pointerId:2,preventDefault(){}});
 assert.equal(input.once.jump,true);assert.deepEqual(input.stick,{x:.8,y:-.4});assert.equal(input.once.dash,undefined);assert.equal(input.once.grenade,undefined);input.once={};handlers.click({pointerType:'touch',preventDefault(){}});assert.deepEqual(input.once,{});
});

test('controller jump/grapple edges do not also dodge/throw and respect area availability',()=>{
 const previous=globalThis.document,raw={id:'DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
 globalThis.document={hidden:false,hasFocus:()=>true,querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null};
 try{const input=Object.create(Input.prototype);Object.assign(input,{settings:controlSettings(),source:'gamepad',padButtons:[],keys:new Set(),once:{},stick:{x:0,y:0},pointer:{active:false},getGamepads:()=>[raw],onAction(){}});const sim={state:'playing',player:{x:0,z:0,traversal:true},props:[],enemies:[]};
  const press=(button,time)=>{raw.buttons.forEach(b=>b.pressed=false);if(button!==null)raw.buttons[button].pressed=true;input.pollGamepad(sim,time);return input.consume({},false,sim);};
  press(null,0);let out=press(5,16);assert.equal(out.jump,true);assert.ok(!out.dash&&!out.grenade&&!out.grapple);out=press(5,32);assert.ok(!out.jump);
  press(null,48);out=press(7,64);assert.equal(out.grapple,true);assert.ok(!out.dash&&!out.grenade&&!out.fireHands.some(Boolean));
  press(null,80);sim.player.traversal=false;out=press(5,96);assert.equal(out.jump,false);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('merged traversal defaults yield to legacy custom slots and Deck trigger layouts',()=>{
 for(const key of ['nextWeapon','rightFire','grenade'])for(const button of [5,7]){
  const bindings={...BINDINGS,[key]:button},out=controlSettings({bindings}).bindings;
  assert.equal(out[key],button);for(const other of Object.keys(BINDINGS).filter(k=>!['jump','grapple',key].includes(k)))assert.equal(out[other],bindings[other]);
  assert.equal(new Set(Object.values(out)).size,16);assert.deepEqual(controlSettings({bindings:out}).bindings,out);
 }
 const deck=controlSettings({bindings:{...BINDINGS,rightFire:7}}).bindings;
 const saved=controlSettings({bindings:{...deck,rightFire:11}}).bindings;assert.equal(saved.rightFire,11);assert.equal(saved.grapple,7);assert.equal(saved.jump,5);
});
