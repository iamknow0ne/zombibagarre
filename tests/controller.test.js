import test from 'node:test';
import assert from 'node:assert/strict';
import {BINDINGS,controlSettings,rebind,controllerFamily,buttonName,handInput,stepRange} from '../src/rebuild/ControllerConfig.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {sampleGamepad} from '../src/rebuild/Gamepad.js';
import {moveMapCursor} from '../src/rebuild/ControllerMap.js';
import {atlasPoint} from '../src/rebuild/Atlas.js';
import {feedbackPattern,Haptics} from '../src/rebuild/Haptics.js';
import {triggerEffect,dualSenseReport,crc32,DualSense} from '../src/rebuild/DualSense.js';
const isolated=()=>{const s=new Simulation({seed:12});s.start();s.props=[];s.obstacles=[];s.toSpawn=999;s.spawnTimer=9999;s.enemies=[];s.events=[];return s;};
const tick=(s,n,input)=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('left and right guns fire independently, including two identical guns, overriding autofire',()=>{
 for(const pair of [['carbine','flame'],['smg','smg']])for(const hand of [0,1]){const s=isolated();s.setLoadout(pair);s.events=[];const keys=[pair[0],pair[0]===pair[1]?'offhand':pair[1]],before=keys.map(k=>s.player.magazines[k]);tick(s,30,{auto:true,fireHands:[hand===0,hand===1],aim:{x:3,z:8}});assert.ok(s.player.magazines[keys[hand]]<before[hand]);assert.equal(s.player.magazines[keys[1-hand]],before[1-hand]);assert.ok(s.events.filter(e=>e.type==='shoot').every(e=>e.hand===hand));}
 const s=isolated();s.setLoadout(['carbine','shotgun']);tick(s,30,{fireHands:[true,true],aim:{x:3,z:8}});assert.deepEqual([...new Set(s.events.filter(e=>e.type==='shoot').map(e=>e.hand))].sort(),[0,1]);
});
test('keyboard fire still fires both hands; controller blade attacks work from either hand button',()=>{
 const s=isolated();s.setLoadout(['carbine','arc']);tick(s,30,{firing:true,aim:{x:8,z:3}});assert.ok(s.player.magazines.carbine<24&&s.player.magazines.arc<20);
 for(const hand of [0,1]){const blade=isolated();blade.setLoadout(['katana']);tick(blade,5,{fireHands:[hand===0,hand===1],aim:{x:3,z:8}});assert.ok(blade.events.some(e=>e.type==='swing'));for(let i=0;i<15;i++)blade.update(1/60,{auto:false});assert.ok(blade.events.some(e=>e.type==='slice'));}
});
test('bindings swap conflicts, validate persistence and identify controller glyph families',()=>{
 assert.deepEqual(handInput({buttons:Array.from({length:17},(_,i)=>i===6)}),[false,true]);assert.equal(BINDINGS.rightFire,11);
 const changed=rebind(BINDINGS,'rightFire',4);assert.equal(changed.grenade,11);assert.equal(changed.rightFire,4);assert.equal(new Set(Object.values(changed)).size,Object.keys(changed).length);
 assert.deepEqual(controlSettings({bindings:{rightFire:6,leftFire:6}}).bindings,BINDINGS);assert.equal(controlSettings({moveDeadzone:9,aimSensitivity:-2}).moveDeadzone,.4);assert.equal(controlSettings({aimSensitivity:-2}).aimSensitivity,.4);
 assert.equal(controllerFamily('054c-0ce6-Wireless Controller'),'playstation');assert.equal(controllerFamily('Xbox Wireless Controller'),'xbox');assert.equal(controllerFamily('unknown'),'generic');assert.equal(buttonName(3,'playstation'),'△');assert.equal(buttonName(3,'xbox'),'Y');
 assert.equal(stepRange(.2,1,{min:.05,max:.4,step:.01}),.21);assert.equal(stepRange(100,1,{min:0,max:100,step:5}),100);
});
test('map crosshair is bounded and zoomed marker coordinates follow the view',()=>{
 assert.deepEqual(moveMapCursor({x:.98,y:.02},{x:1,y:-1},10),{x:.98,y:.02});const canvas={getBoundingClientRect:()=>({left:10,top:20,width:600,height:600})},layout={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100}};
 assert.deepEqual(atlasPoint(canvas,layout,{clientX:310,clientY:320},{zoom:2,x:30,z:-20}),{x:30,z:-20});assert.deepEqual(atlasPoint(canvas,layout,{clientX:460,clientY:320},{zoom:2,x:30,z:-20}),{x:56.5,z:-20});
});
test('configurable dead zones suppress drift but preserve analog aiming',()=>{const pad={id:'DualSense',mapping:'standard',axes:[.25,0,.25,0],buttons:[]};assert.equal(sampleGamepad(pad,[],{moveDeadzone:.3,aimDeadzone:.3}).aim.x,0);assert.ok(sampleGamepad(pad,[],{moveDeadzone:.1,aimDeadzone:.1}).move.x>0);});
test('haptic recoil distinguishes weapons and optional HID reports have bounded safe profiles',()=>{
 assert.ok(feedbackPattern({type:'shoot',weapon:'shotgun'}).strongMagnitude>feedbackPattern({type:'shoot',weapon:'smg'}).strongMagnitude);assert.equal(feedbackPattern({type:'wave'}),null);
 assert.equal(triggerEffect(null)[0],5);assert.equal(triggerEffect('katana')[0],0x25);assert.equal(triggerEffect('shotgun')[0],0x25);assert.equal(triggerEffect('flame')[0],0x21);assert.notDeepEqual(triggerEffect('shotgun'),triggerEffect('smg'));
 const usb=dualSenseReport({right:'shotgun',left:'flame',color:[20,80,30]});assert.equal(usb.id,2);assert.equal(usb.data.length,47);assert.equal(usb.data[0],12);assert.equal(usb.data[10],0x25);assert.equal(usb.data[21],0x21);assert.deepEqual([...usb.data.slice(44)],[20,80,30]);
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);const bt=dualSenseReport({bluetooth:true,sequence:18});assert.equal(bt.id,49);assert.equal(bt.data.length,77);assert.equal(bt.data[0],32);assert.equal(bt.data[1],16);const payload=new Uint8Array(75);payload.set([0xa2,49]);payload.set(bt.data.subarray(0,73),2);assert.equal(new DataView(bt.data.buffer).getUint32(73,true),crc32(payload));
});
test('haptics respect disabled setting and reset; queued DualSense reset follows effects',async()=>{
 const previous=globalThis.document;globalThis.document={hidden:false,hasFocus:()=>true};try{let calls=0,resets=0;const input={source:'gamepad',rawPad:{vibrationActuator:{playEffect:async()=>{calls++;return 'complete';},reset:async()=>{resets++;}}}},settings=controlSettings({vibration:0});const h=new Haptics(input,settings);h.event({type:'hurt'},1000);assert.equal(calls,0);settings.vibration=70;h.event({type:'hurt'},2000);h.event({type:'shoot'},2010);assert.equal(calls,1);h.stop();assert.equal(resets,1);
 const writes=[],d=new DualSense(settings);d.device={opened:true,sendReport:async(id,data)=>{writes.push([...data]);}};await d.send({right:'shotgun'});await d.stop();assert.equal(writes[0][10],0x25);assert.equal(writes.at(-1)[10],5);assert.equal(writes.at(-1)[21],5);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('controller menu navigation respects range steps, confirms selects and protects held buttons on return',async()=>{
 const {Input}=await import('../src/rebuild/Input.js');const previous=globalThis.document;
 let focused,closed=0;const range={tagName:'INPUT',type:'range',value:'.2',min:'.05',max:'.4',step:'.01',getClientRects:()=>[1],getBoundingClientRect:()=>({left:0,top:0,width:100,height:20}),focus(){focused=this;},dispatchEvent(){},scrollIntoView(){}};
 const select={...range,tagName:'SELECT',type:undefined,options:[1,2,3],selectedIndex:0,getBoundingClientRect:()=>({left:0,top:40,width:100,height:20})};
 let dialog={id:'settings-dialog',querySelectorAll:()=>[range,select],close(){closed++;dialog=null;}};
 const pad={id:'DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))},actions=[];
 globalThis.document={hidden:false,hasFocus:()=>true,querySelectorAll:()=>dialog?[dialog]:[],querySelector:()=>dialog,getElementById:()=>({textContent:''}),get activeElement(){return focused;}};
 try{const input=Object.create(Input.prototype);Object.assign(input,{settings:controlSettings(),source:'gamepad',padButtons:[],keys:new Set(),once:{},pointer:{active:false},stick:{x:0,y:0},getGamepads:()=>[pad],onAction:a=>actions.push(a)});const sim={state:'paused',player:{x:0,z:0,angle:0}};
 const poll=(button,time)=>{pad.buttons.forEach(b=>b.pressed=false);if(button!==null)pad.buttons[button].pressed=true;input.pollGamepad(sim,time);};
 range.focus();poll(null,0);poll(15,100);assert.equal(+range.value,.21);poll(null,150);poll(13,300);assert.equal(focused,select);poll(null,350);poll(0,400);assert.equal(select.selectedIndex,1);poll(null,450);poll(1,500);assert.equal(closed,1);
 sim.state='playing';poll(11,550);assert.equal(input.padGuard,true);assert.equal(input.consume({},false).fireHands,undefined);poll(null,600);poll(11,650);assert.deepEqual(input.consume({},false).fireHands,[true,false]);assert.deepEqual(actions,[]);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('touch/manual and keyboard remain usable with an idle controller connected',async()=>{
 const {Input}=await import('../src/rebuild/Input.js');const input=Object.create(Input.prototype);Object.assign(input,{settings:controlSettings(),source:'touch',keys:new Set(),once:{},stick:{x:.5,y:0},touchAim:{x:1,y:0},touchFiring:true,pointer:{active:false},pad:{move:{x:0,y:1},aim:{x:1,y:0},buttons:[]},padGuard:false});const world={player:{position:{x:4,z:7}}};const frame=input.consume(world,false);assert.equal(frame.firing,true);assert.equal(frame.fireHands,undefined);assert.ok(frame.aim.x>4&&frame.aim.z<7);assert.equal(frame.x,.388);assert.equal(frame.auto,false);
 input.source='keyboard';input.touchFiring=false;input.keys.add('KeyD');input.stick={x:0,y:0};input.firing=true;const kb=input.consume(world,true);assert.equal(kb.x,.776);assert.equal(kb.firing,true);assert.equal(kb.fireHands,undefined);
});

test('switching lead weapon preserves hand identity and magazines',()=>{
 const s=isolated();s.setLoadout(['carbine','flame']);s.player.magazines.carbine=13;s.switchWeapon('flame');assert.deepEqual(s.player.equipped,['flame','carbine']);assert.equal(s.player.weapon,'flame');assert.equal(s.player.magazines.carbine,13);s.setLoadout(['shotgun','flame']);assert.equal(s.player.weapon,'shotgun');
});
