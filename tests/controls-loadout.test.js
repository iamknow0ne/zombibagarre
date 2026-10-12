import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {normalizeLoadout,slotKey} from '../src/rebuild/Loadout.js';
import {deadZone,sampleGamepad,worldStick} from '../src/rebuild/Gamepad.js';
import {fragmentGeometry,grenadePosition} from '../src/rebuild/Effects.js';
const isolated=()=>{const s=new Simulation({seed:12});s.start();s.props=[];s.obstacles=[];s.toSpawn=999;s.spawnTimer=9999;return s;};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
test('melee stance is exclusive through both arsenal and hotkeys',()=>{
 const s=isolated();s.setLoadout(['carbine','flame']);s.equipWeapon('dual');assert.deepEqual(s.player.equipped,['dual']);assert.equal(s.player.weapon,'dual');s.switchWeapon('smg');assert.deepEqual(s.player.equipped,['smg']);s.setLoadout(['katana','arc']);assert.deepEqual(s.player.equipped,['katana']);assert.deepEqual(normalizeLoadout(['carbine','dual','flame','arc']),['carbine','flame']);
});
test('matching guns have independent shots, magazines and reloads',()=>{
 const s=isolated();s.setLoadout(['carbine','carbine']);assert.equal(slotKey(s.player.equipped,'carbine',1),'offhand');s.player.magazines.carbine=0;s.reload();const e=s.spawnEnemy('boss',0,-1);e.speed=0;tick(s,30,{firing:true,aim:e});assert.ok(s.player.magazines.offhand<24);assert.ok(s.player.reloads.carbine>0);assert.equal(s.player.reloads.offhand,0);assert.ok(s.events.some(e=>e.type==='shoot'&&e.hand===1));
 tick(s,100);assert.equal(s.player.magazines.carbine,24);s.collect('ammo');assert.equal(s.player.magazines.offhand,24);s.setLoadout(['smg','smg']);assert.equal(s.player.magazines.offhand,40);
});
test('blade movement and dodge differ from the gun stance; finishers recover dodge',()=>{
 const a=isolated(),b=isolated();b.switchWeapon('katana');tick(a,15,{x:1});tick(b,15,{x:1});assert.ok(b.player.x>a.player.x*1.2);a.update(1/60,{dash:true});b.update(1/60,{dash:true});assert.ok(b.player.dashCooldown<a.player.dashCooldown);tick(b,30);b.player.dashCooldown=1;b.slice('katana',{x:0,z:0});tick(b,38);b.slice('katana',{x:0,z:0});tick(b,38);b.slice('katana',{x:0,z:0});assert.equal(b.player.swingCombo,2);b.player.dashCooldown=1;tick(b,16);assert.ok(b.player.dashCooldown<.6);
});
test('grenade flies from the hand to the aimed ground before detonation',()=>{
 const s=isolated();s.update(1/60,{grenade:true,aim:{x:6,z:3},auto:false});const h=s.hazards[0],a=grenadePosition({...h,timer:h.duration}),mid=grenadePosition({...h,timer:h.duration-h.flight/2}),land=grenadePosition({...h,timer:h.duration-h.flight});assert.equal(a.x,h.originX);assert.ok(mid.x>a.x&&mid.x<h.x);assert.ok(mid.y>a.y);assert.equal(land.x,h.x);assert.ok(land.y<.4);tick(s,40);assert.equal(s.hazards.length,1);tick(s,20);assert.ok(s.events.some(e=>e.type==='explosion'));
});
test('DualSense standard mapping handles dead zones, analog aim and button edges',()=>{
 const pad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',axes:[.1,.1,1,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};pad.buttons[7]={pressed:true,value:1};pad.buttons[0].pressed=true;const first=sampleGamepad(pad);assert.deepEqual(first.move,{x:0,y:0});assert.equal(first.aim.x,1);assert.ok(first.fire&&first.pressed[0]);assert.equal(sampleGamepad(pad,first.buttons).pressed[0],false);assert.equal(sampleGamepad({...pad,connected:false}),null);assert.equal(sampleGamepad({...pad,mapping:''}),null);assert.deepEqual(deadZone(.03,-.06),{x:0,y:0});assert.ok(Math.abs(Math.hypot(...Object.values(worldStick({x:1,y:0})))-1)<.002);
});
test('fragment geometry varies silhouette, preserves closed meshes and avoids cuboids',()=>{
 for(const kind of ['brick','glass','metal','wood','concrete','earth']){const a=fragmentGeometry(kind,1),b=fragmentGeometry(kind,2);assert.equal(a.type,'BufferGeometry');assert.ok(a.attributes.position.count>=24);assert.notDeepEqual([...a.attributes.position.array],[...b.attributes.position.array]);assert.ok([...a.attributes.position.array].every(Number.isFinite));assert.equal(a.userData.shared,true);}
});

test('controller input is focus scoped and grenades retain the last stick aim',async()=>{
 const {Input}=await import('../src/rebuild/Input.js');
 const oldDocument=globalThis.document,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const label={textContent:''},pad={index:0,connected:true,mapping:'standard',axes:[0,0,1,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
 let focused=true;const actions=[];
 globalThis.document={hidden:false,hasFocus:()=>focused,querySelector:()=>null,getElementById:()=>label};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[pad]}});
 try{
  const input=Object.create(Input.prototype);Object.assign(input,{padButtons:[],keys:new Set(),once:{},stick:{x:0,y:0},pointer:{active:false},onAction:a=>actions.push(a)});
  const sim={state:'playing',player:{x:2,z:3,angle:0}};input.pollGamepad(sim,0);const aim={...input.padAim};pad.axes[2]=0;pad.buttons[4].pressed=true;input.pollGamepad(sim,16);const output=input.consume({},true);assert.ok(output.grenade);assert.deepEqual(output.aim,aim);
  focused=false;pad.buttons[9].pressed=true;input.pollGamepad(sim,32);assert.equal(actions.length,0);assert.equal(input.padGuard,true);assert.equal(input.consume({},true).firing,false);
  focused=true;pad.buttons.forEach(b=>b.pressed=false);input.pollGamepad(sim,48);assert.equal(input.padGuard,false);pad.buttons[9].pressed=true;input.pollGamepad(sim,64);assert.deepEqual(actions,['pause']);
 }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});
