import test from 'node:test';
import assert from 'node:assert/strict';
import {WeaponHold,handChoices,equipHand,cycleHand,wheelIndex,WHEEL_TIME_SCALE} from '../src/rebuild/WeaponWheel.js';
import {BINDINGS,controlSettings,controllerFamily} from '../src/rebuild/ControllerConfig.js';
import {permittedLoadout} from '../src/rebuild/Progression.js';
import {sampleGamepad,selectGamepad,captureControl,validCalibration} from '../src/rebuild/Gamepad.js';
import {toggleFullscreen} from '../src/rebuild/Fullscreen.js';
import {Input} from '../src/rebuild/Input.js';
const sim=(equipped=['carbine','flame'],progression='sandbox')=>({state:'playing',progression,profile:{skills:[]},player:{equipped},setLoadout(keys){const next=permittedLoadout(this,keys),changed=next.join()!==this.player.equipped.join();this.player.equipped=next;return changed;}});
const pad=()=>({id:'Steam Deck',index:0,connected:true,mapping:'standard',buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0,0,0]});
test('tap cycles on release exactly once; hold opens on real time and commits without cycling',()=>{
 const hold=new WeaponHold(),buttons=[];buttons[BINDINGS.leftWeapon]=true;
 assert.equal(hold.update(buttons,BINDINGS,1000),null);assert.equal(hold.update(buttons,BINDINGS,1100),null);
 buttons[BINDINGS.leftWeapon]=false;assert.deepEqual(hold.update(buttons,BINDINGS,1120),{type:'cycle',hand:1});assert.equal(hold.update(buttons,BINDINGS,1200),null);
 buttons[BINDINGS.nextWeapon]=true;hold.update(buttons,BINDINGS,2000);assert.equal(hold.update(buttons,BINDINGS,2299),null);assert.deepEqual(hold.update(buttons,BINDINGS,2300),{type:'open',hand:0});assert.equal(hold.update(buttons,BINDINGS,6000),null);buttons[BINDINGS.nextWeapon]=false;assert.deepEqual(hold.update(buttons,BINDINGS,6100),{type:'commit',hand:0});assert.ok(WHEEL_TIME_SCALE>0&&WHEEL_TIME_SCALE<.25);
});
test('cancel resets held selection without committing; radial deadzone retains choice',()=>{const h=new WeaponHold();h.update({15:true},BINDINGS,0);h.reset();assert.equal(h.update({},BINDINGS,500),null);assert.equal(wheelIndex(0,0,8,3),3);assert.equal(wheelIndex(0,-1,8),0);assert.equal(wheelIndex(1,0,8),2);assert.equal(wheelIndex(0,1,8),4);assert.equal(wheelIndex(-1,0,8),6);});
test('each hand cycles independently; matching guns and empty left hand are supported',()=>{const s=sim();cycleHand(s,0);assert.equal(s.player.equipped[1],'flame');const right=s.player.equipped[0];cycleHand(s,1);assert.equal(s.player.equipped[0],right);equipHand(s,1,right);assert.deepEqual(s.player.equipped,[right,right]);equipHand(s,1,'');assert.deepEqual(s.player.equipped,[right]);});
test('wheel honors progression and exclusive melee without erasing a locked hand',()=>{const s=sim(['carbine'],'hero');assert.deepEqual(handChoices(s,0),['carbine','katana']);assert.deepEqual(handChoices(s,1),[]);assert.equal(cycleHand(s,1),null);assert.equal(equipHand(s,0,'launcher'),false);assert.deepEqual(s.player.equipped,['carbine']);s.profile.skills.push('duelist');assert.deepEqual(handChoices(s,1),['','carbine']);equipHand(s,1,'carbine');equipHand(s,0,'katana');assert.deepEqual(s.player.equipped,['katana']);assert.deepEqual(handChoices(s,1),[]);});
test('older saved previous-weapon binding migrates to left hand, preserving custom controls',()=>{const settings=controlSettings({bindings:{...BINDINGS,leftWeapon:undefined,prevWeapon:14,nextWeapon:5}});assert.equal(settings.bindings.leftWeapon,14);assert.equal(settings.bindings.nextWeapon,5);assert.equal(controllerFamily('Steam Virtual Gamepad'),'xbox');assert.equal(controllerFamily('Valve 28de'),'xbox');});
test('raw layouts support calibrated trigger and hat axes while retaining analog sticks',()=>{
 const p=pad();p.mapping='';p.axes=[.7,0,-1,0,0,-1,0,0];p.buttons=Array.from({length:11},()=>({value:0,pressed:false}));
 const b=index=>({kind:'button',index}),a=(index,sign,rest=0,range=1)=>({kind:'axis',index,sign,rest,range});
 const rawMapping={id:p.id,buttons:[b(0),b(1),b(2),b(3),b(4),b(5),a(2,1,-1,2),a(5,1,-1,2),b(6),b(7),b(9),b(10),a(7,-1),a(7,1),a(6,-1),a(6,1)],axes:[a(0,1),a(1,1),a(3,1),a(4,1)]};
 assert.equal(sampleGamepad(p),null);assert.equal(validCalibration(undefined,undefined),false);assert.ok(validCalibration(rawMapping,p.id));let sampled=sampleGamepad(p,[],{rawMapping});assert.equal(sampled.triggers[0],0);assert.ok(sampled.move.x>.5);assert.equal(sampled.aim.x,0);
 p.axes[2]=1;p.axes[6]=-1;p.axes[3]=.8;sampled=sampleGamepad(p,[],{rawMapping});assert.equal(sampled.triggers[0],1);assert.ok(sampled.buttons[14]);assert.ok(sampled.aim.x>.7);assert.equal(sampleGamepad({...p,id:'Another pad'},[],{rawMapping}),null);
 assert.ok(sampleGamepad(p,[],{gamepadLayout:'standard'}));assert.ok(Number.isFinite(sampleGamepad({...pad(),axes:[NaN,Infinity]}).move.x));
});
test('controller selection skips unmapped auxiliary interfaces and handles sparse gamepad arrays',()=>{const a={...pad(),id:'raw auxiliary',mapping:'',index:0},b={...pad(),index:2};assert.equal(selectGamepad([null,a,b],a),b);assert.equal(selectGamepad([a,b],b),b);assert.equal(selectGamepad([a],b),a);});
test('calibration recognizes reversed axes, trigger ranges and button edges',()=>{const p=pad(),baseline=structuredClone(p);p.axes[1]=-1;assert.deepEqual(captureControl(p,baseline,true),{kind:'axis',index:1,sign:-1,rest:0,range:1});p.axes[1]=0;p.buttons[5].pressed=true;assert.deepEqual(captureControl(p,baseline),{kind:'button',index:5});p.buttons[5].pressed=false;baseline.axes[2]=-1;p.axes[2]=1;assert.equal(captureControl(p,baseline).range,2);});
test('fullscreen enters and exits, and gives actionable errors on denied or unavailable APIs',async()=>{let entered=0,exited=0;const doc={documentElement:{requestFullscreen:async()=>entered++},exitFullscreen:async()=>exited++};await toggleFullscreen(doc);doc.fullscreenElement={};await toggleFullscreen(doc);assert.equal(entered,1);assert.equal(exited,1);await assert.rejects(()=>toggleFullscreen({documentElement:{}}),/unavailable/);await assert.rejects(()=>toggleFullscreen({documentElement:{requestFullscreen:async()=>{throw Error();}}}),/Tap or click/);});
test('real input polling cancels a held wheel on menus, blur and disconnect; combat is suppressed while open',()=>{
 const previous=globalThis.document,p=pad(),s=sim();let focused=true,dialog=null,opened=false,cancelled=0,actions=[];
 globalThis.document={hidden:false,hasFocus:()=>focused,querySelectorAll:()=>dialog?[dialog]:[],querySelector:()=>dialog,getElementById:()=>({textContent:''})};
 try{const input=Object.create(Input.prototype);Object.assign(input,{settings:controlSettings(),source:'gamepad',padButtons:[],keys:new Set(),once:{},pointer:{active:false},stick:{x:0,y:0},getGamepads:()=>[p],onAction:a=>actions.push(a),onCancelWheel(){opened=false;input.weaponWheelActive=false;cancelled++;},onWeaponWheel(e){if(e?.type==='open'){opened=true;input.weaponWheelActive=true;}}});
 input.pollGamepad(s,0);p.buttons[15].pressed=true;input.pollGamepad(s,10);input.pollGamepad(s,310);assert.ok(opened);input.once.grenade=true;assert.deepEqual(input.consume({},true),{x:0,z:0,auto:false,firing:false,fireHands:[false,false],aim:null});
 focused=false;input.pollGamepad(s,400);assert.equal(opened,false);assert.ok(cancelled);focused=true;p.buttons[15].pressed=false;input.pollGamepad(s,500);p.buttons[15].pressed=true;input.pollGamepad(s,600);input.pollGamepad(s,1000);assert.ok(opened);p.connected=false;input.pollGamepad(s,1100);assert.equal(opened,false);assert.deepEqual(actions,['pause']);
 }finally{globalThis.document=previous;}
});
