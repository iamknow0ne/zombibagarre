import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls,bindTouchAction,stickVector,touchSettings,touchAimTarget} from '../src/rebuild/TouchControls.js';
import {gestureView,bindTouchMap} from '../src/rebuild/TouchMap.js';
import {Input} from '../src/rebuild/Input.js';
import {Simulation} from '../src/rebuild/Simulation.js';

test('touch dead zone is radial, proportional and bounded even beyond the thumb area',()=>{
 assert.deepEqual(stickVector(1,1,35),{x:0,y:0});assert.deepEqual(stickVector(0,0,35),{x:0,y:0});const half=stickVector(20,0,35),full=stickVector(300,400,35);assert.ok(half.x>.4&&half.x<.6);assert.equal(Math.hypot(full.x,full.y),1);assert.ok(Math.abs(full.x-.6)<1e-9);
 assert.deepEqual(touchSettings({touchStickMode:'bad',touchSize:99,touchOpacity:-5,touchAimAssist:false}),{touchStickMode:'floating',touchSize:1.2,touchOpacity:.35,touchAimAssist:false});
});
test('two thumbs own separate pointers; releasing aim preserves movement, cancellation and rotation stop both',()=>{
 class Element extends EventTarget{constructor(w=180,h=160){super();this.w=w;this.h=h;this.style={};this.firstElementChild={style:{}};this.classList={add(){},remove(){}};}getBoundingClientRect(){return{left:0,top:0,width:this.w,height:this.h};}setPointerCapture(){}}
 const els=Object.fromEntries(['move-zone','aim-zone','joystick','aim-joystick'].map(id=>[id,new Element(id.includes('zone')?180:102,id.includes('zone')?160:102)]));
 const oldDocument=globalThis.document,oldWindow=globalThis.window;globalThis.window=new EventTarget();globalThis.document=Object.assign(new EventTarget(),{getElementById:id=>els[id],querySelector:()=>null});
 const send=(id,type,pointerId,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId,clientX:x,clientY:y});els[id].dispatchEvent(e);};
 try{const input={settings:touchSettings(),pointer:{active:true}},controls=new TouchControls(input);controls.clear();
  send('move-zone','pointerdown',1,5,5);assert.deepEqual(input.stick,{x:0,y:0},'floating touchdown never jumps at an edge');send('move-zone','pointermove',1,45,5);assert.equal(input.stick.x,1);
  send('aim-zone','pointerdown',2,90,80);send('aim-zone','pointermove',2,90,20);assert.equal(input.touchFiring,true);assert.equal(input.touchAim.y,-1);
  send('move-zone','pointerdown',3,10,30);send('move-zone','pointerup',3,10,30);assert.equal(input.stick.x,1,'unrelated finger cannot steal or release movement');
  send('aim-zone','pointerup',2,90,20);assert.equal(input.touchFiring,false);assert.equal(input.stick.x,1);send('move-zone','pointercancel',1,0,0);assert.deepEqual(input.stick,{x:0,y:0});
  send('move-zone','pointerdown',4,90,80);send('move-zone','pointermove',4,140,80);window.dispatchEvent(new Event('resize'));assert.deepEqual(input.stick,{x:0,y:0});send('move-zone','pointermove',4,140,80);assert.deepEqual(input.stick,{x:0,y:0},'old gesture cannot restart after rotation');
  input.settings.touchStickMode='fixed';send('move-zone','pointerdown',5,140,80);assert.equal(input.stick.x,1);send('move-zone','lostpointercapture',5,140,80);assert.equal(input.stick.x,0);
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
test('touch assist respects direction, dead targets and cover without snapping behind the player',()=>{
 const sim={player:{x:0,z:0},enemies:[{id:1,x:7.76,z:-6.3,health:10},{id:2,x:-7.76,z:6.3,health:10}],blocked:()=>false};
 assert.deepEqual(touchAimTarget({x:1,y:0},sim),{x:7.76,y:1.11,z:-6.3,targetId:1});sim.blocked=()=>true;assert.equal(touchAimTarget({x:1,y:0},sim).targetId,undefined);assert.deepEqual(touchAimTarget({x:1,y:0},sim,false),touchAimTarget({x:1,y:0},sim,true));
});
test('touch aiming attacks both guns, overrides auto fire, retains grenade direction, and clear stops attacks',()=>{
 const sim=new Simulation({layout:{cover:[]}});sim.start();sim.setLoadout(['carbine','smg']);sim.spawnEnemy('brute',6,-2);const input=Object.create(Input.prototype);Object.assign(input,{source:'touch',settings:touchSettings(),keys:new Set(),once:{grenade:true},stick:{x:.5,y:0},touchAim:{x:1,y:0},touchFiring:true,pointer:{active:false}});
 const out=input.consume({},true,sim);assert.ok(out.firing&&out.grenade);assert.equal(out.fireHands,undefined);assert.ok(out.x>0);assert.ok(out.aim.x>sim.player.x);sim.update(1/60,out);assert.ok(sim.player.magazines.carbine<24&&sim.player.magazines.smg<40);input.clear();const stopped=input.consume({},false,sim);assert.equal(stopped.firing,false);assert.equal(stopped.x,0);assert.equal(stopped.aim,null);
});
test('map pan and pinch preserve the finger anchor, clamp zoom and constrain map centre',()=>{
 const b={minX:-200,maxX:200,minZ:-200,maxZ:200},r={left:0,top:0,width:400,height:400};const start={x:0,z:0,zoom:1},from={x:200,y:200},to={x:240,y:220};const moved=gestureView(start,b,r,from,to);assert.ok(Math.abs(moved.x+41.2)<1e-9);assert.ok(Math.abs(moved.z+20.6)<1e-9);
 const zoom=gestureView(start,b,r,{x:300,y:200},{x:300,y:200},2);assert.equal(zoom.zoom,2);assert.equal(zoom.x,51.5);assert.equal(zoom.z,0);assert.equal(gestureView(start,b,r,from,to,99).zoom,4);const limit=gestureView(start,b,r,from,{x:-9999,y:-9999});assert.equal(limit.x,200);assert.equal(limit.z,200);
});

test('map gestures distinguish taps from drags and pinches, and cancellation never places a marker',()=>{
 class Canvas extends EventTarget{getBoundingClientRect(){return{left:0,top:0,width:400,height:400};}setPointerCapture(){}}
 const old=globalThis.window;globalThis.window=new EventTarget();const canvas=new Canvas(),dialog=new EventTarget(),map={canvas,dialog,input:{},getSim:()=>({layout:{bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200}}}),view:{zoom:1},draw(){}};let taps=0;canvas.addEventListener('touch-map-tap',()=>taps++);
 const send=(type,id,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'touch',pointerId:id,clientX:x,clientY:y});canvas.dispatchEvent(e);};
 try{bindTouchMap(map);send('pointerdown',1,200,200);send('pointerup',1,200,200);assert.equal(taps,1);send('pointerdown',2,200,200);send('pointermove',2,260,220);send('pointerup',2,260,220);assert.equal(taps,1);assert.ok(map.view.x<0);
  send('pointerdown',3,100,200);send('pointerdown',4,300,200);send('pointermove',4,390,200);send('pointerup',3,100,200);send('pointerup',4,390,200);assert.ok(map.view.zoom>1);assert.equal(taps,1);
  send('pointerdown',5,200,200);send('pointercancel',5,200,200);assert.equal(taps,1);send('pointerdown',6,200,200);dialog.dispatchEvent(new Event('close'));send('pointerup',6,200,200);assert.equal(taps,1);
 }finally{globalThis.window=old;}
});


test('secondary-finger dodge fires on contact in every stick direction without interrupting movement or aim',()=>{
 class Element extends EventTarget{constructor(){super();this.style={};this.firstElementChild={style:{}};this.classList={add(){},remove(){}};}getBoundingClientRect(){return{left:0,top:0,width:160,height:160};}setPointerCapture(){}}
 const els=Object.fromEntries(['move-zone','aim-zone','joystick','aim-joystick','touch-dash'].map(id=>[id,new Element()]));
 const oldDocument=globalThis.document,oldWindow=globalThis.window;globalThis.window=new EventTarget();globalThis.document=Object.assign(new EventTarget(),{getElementById:id=>els[id],querySelector:()=>null});
 const send=(id,type,pointerId,x=80,y=80)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerType:'touch',pointerId,isPrimary:pointerId===1,clientX:x,clientY:y});els[id].dispatchEvent(e);return e;};
 try{
  const input=Object.create(Input.prototype);Object.assign(input,{settings:touchSettings(),keys:new Set(),once:{},pointer:{active:false}});input.touchControls=new TouchControls(input);input.clear();let sim;
  bindTouchAction(els['touch-dash'],input,()=>{if(sim.state==='playing')input.once.dash=true;});
  for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   sim=new Simulation({layout:{cover:[]}});sim.start();sim.toSpawn=999;sim.spawnTimer=999;input.clear();
   send('move-zone','pointerdown',1);send('move-zone','pointermove',1,80+x*70,80+y*70);
   send('aim-zone','pointerdown',2);send('aim-zone','pointermove',2,80-x*70,80-y*70);
   const held={...input.stick},e=send('touch-dash','pointerdown',3);assert.equal(e.defaultPrevented,true);
   const frame=input.consume({},false,sim);assert.equal(frame.dash,true,'no click or finger release required');sim.update(1/60,frame);
   assert.ok(sim.player.dash>0);const length=Math.hypot(frame.x,frame.z);assert.ok(Math.abs(sim.player.dashX-frame.x/length)<1e-9);assert.ok(Math.abs(sim.player.dashZ-frame.z/length)<1e-9,'movement wins over opposing aim');
   send('touch-dash','pointerup',3);assert.deepEqual(input.stick,held);assert.equal(input.touchFiring,true);
   for(let n=0;n<20;n++)sim.update(1/60,input.consume({},false,sim));assert.equal(sim.events.filter(e=>e.type==='dash').length,1);assert.ok(sim.player.moving,'walking continues after dodge');
   send('move-zone','pointerup',1);assert.deepEqual(input.stick,{x:0,y:0});send('aim-zone','pointercancel',2);assert.equal(input.touchFiring,false);
  }
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
test('touch combat actions ignore duplicate compatibility clicks, respect disabled state and retain mouse/keyboard activation',()=>{
 const b=new EventTarget(),input={pointer:{active:true}};let n=0;bindTouchAction(b,input,()=>n++);
 const send=(type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,values);b.dispatchEvent(e);};
 send('pointerdown',{pointerType:'touch',isPrimary:false,pointerId:2});assert.equal(n,1);assert.equal(input.source,'touch');assert.equal(input.pointer.active,false);
 send('pointerup',{pointerType:'touch',pointerId:2});send('click',{pointerType:'touch',detail:1});send('click',{detail:1});assert.equal(n,1,'release and compatibility clicks must not spend a second action');
 send('pointercancel',{pointerType:'touch',pointerId:2});send('lostpointercapture',{pointerId:2});assert.equal(n,1);
 send('click',{detail:0});assert.equal(n,2,'keyboard or assistive click still works');
 send('pointerdown',{pointerType:'mouse'});send('click',{detail:1});assert.equal(n,3,'real mouse after touch works');
 b.disabled=true;send('pointerdown',{pointerType:'touch',pointerId:3});send('click',{detail:0});assert.equal(n,3);
 b.disabled=false;send('pointerdown',{pointerType:'touch',pointerId:4});assert.equal(n,4,'a fresh tap works without waiting for a previous click');
});
