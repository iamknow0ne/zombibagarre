import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../src/rebuild/Input.js';
import {bindMapPointerPan} from '../src/rebuild/ControllerMap.js';
const send=(target,type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'mouse',pointerId:1,button:0,buttons:1,clientX:30,clientY:40,...values});target.dispatchEvent(e);};
class Canvas extends EventTarget{setPointerCapture(){throw new DOMException('Pointer is no longer active','InvalidStateError');}getBoundingClientRect(){return{width:100,height:100,left:0,top:0};}}
function env(run){const old={document:globalThis.document,window:globalThis.window,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};globalThis.window=new EventTarget();globalThis.document=Object.assign(new EventTarget(),{getElementById:()=>null,querySelector:()=>null});globalThis.innerWidth=800;globalThis.innerHeight=600;try{run();}finally{Object.assign(globalThis,old);}}
test('game capture failures still release fire outside canvas and cancellation clears aim/move',()=>env(()=>{
 const canvas=new Canvas(),input=new Input(canvas,()=>{});send(canvas,'pointerdown');assert.equal(input.firing,true);send(window,'pointerup');assert.equal(input.firing,false);
 send(canvas,'pointerdown',{button:2});assert.ok(input.moveRequest);send(window,'pointercancel',{button:2});assert.equal(input.moveRequest,null);
 input.perspective=true;input.aimHeld=true;input.firing=true;send(canvas,'lostpointercapture');assert.equal(input.firing,false);assert.equal(input.aimHeld,false);
 send(canvas,'pointerdown');send(canvas,'pointermove',{buttons:0});assert.equal(input.firing,false);
}));
test('locked native mouse never attempts unsupported pointer capture',()=>env(()=>{
 const canvas=new Canvas();let captures=0;canvas.setPointerCapture=()=>{captures++;throw Error('must not call');};document.pointerLockElement=canvas;const input=new Input(canvas,()=>{});input.perspective=true;input.playing=true;send(canvas,'pointerdown');assert.equal(input.firing,true);assert.equal(captures,0);send(window,'pointerup');assert.equal(input.firing,false);
}));
test('map capture failure, cancellation and outside release cannot leave a stale drag',()=>env(()=>{
 const canvas=new Canvas(),dialog=new EventTarget(),map={canvas,dialog,view:{x:0,z:0,zoom:1},getSim:()=>({layout:{bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10}}}),clampView(){},draw(){}};bindMapPointerPan(map);
 send(canvas,'pointerdown');send(canvas,'pointermove',{clientX:50});assert.notEqual(map.view.x,0);const x=map.view.x;send(window,'pointerup');send(canvas,'pointermove',{clientX:90});assert.equal(map.view.x,x);assert.ok(map.ignoreDragClickUntil>performance.now());
 for(const end of ['pointercancel','lostpointercapture']){send(canvas,'pointerdown');send(canvas,end);send(canvas,'pointermove',{clientX:90});assert.equal(map.view.x,x);}
 send(canvas,'pointerdown');send(canvas,'pointermove',{clientX:90,buttons:0});assert.equal(map.view.x,x);send(canvas,'pointermove',{clientX:90});assert.equal(map.view.x,x);
 send(canvas,'pointerdown');send(canvas,'pointermove',{pointerId:2,clientX:90});assert.equal(map.view.x,x);dialog.dispatchEvent(new Event('close'));send(canvas,'pointermove',{clientX:90});assert.equal(map.view.x,x);
}));

test('unlocked perspective aim keeps turning while firing and releases each mouse button independently',()=>env(()=>{
 const canvas=new Canvas(),input=new Input(canvas,()=>{});input.perspective=true;input.playing=true;input.lockUnavailable=true;
 send(canvas,'pointerdown',{button:2,buttons:2});send(canvas,'mousedown',{button:2,buttons:2});
 send(canvas,'pointermove',{buttons:2,movementX:8,movementY:-3});
 assert.equal(input.lookX,8);assert.equal(input.lookY,-3);assert.equal(input.aimHeld,true);
 // A second button produces mousedown, not a second pointerdown.
 send(canvas,'mousedown',{button:0,buttons:3});send(canvas,'pointermove',{buttons:3,movementX:11,movementY:4});
 assert.equal(input.firing,true);assert.equal(input.aimHeld,true);assert.equal(input.lookX,19);assert.equal(input.lookY,1);
 send(window,'mouseup',{button:0,buttons:2});send(canvas,'pointermove',{buttons:2,movementX:5,movementY:2});
 assert.equal(input.firing,false);assert.equal(input.aimHeld,true);assert.equal(input.lookX,24);assert.equal(input.lookY,3);
 send(window,'mouseup',{button:2,buttons:0});send(canvas,'pointermove',{buttons:0,movementX:40,movementY:40});
 assert.equal(input.aimHeld,false);assert.equal(input.lookX,24);assert.equal(input.lookY,3);
 // Free mouse movement while only firing must not turn the unlocked camera.
 send(canvas,'mousedown',{button:0,buttons:1});send(canvas,'pointermove',{buttons:1,movementX:40,movementY:40});
 assert.equal(input.lookX,24);assert.equal(input.firing,true);
 input.perspective=false;send(canvas,'pointermove',{buttons:2,movementX:40,movementY:40});assert.equal(input.lookX,24);
}));
