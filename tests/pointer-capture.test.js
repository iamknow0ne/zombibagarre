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
