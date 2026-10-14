import {QuestCompass} from '../src/rebuild/QuestCompass.js';
import {OrthographicCamera,Vector3} from 'three';
import test from 'node:test';
import assert from 'node:assert/strict';
import {touchAimTarget,assistedAimClear} from '../src/rebuild/TouchControls.js';
import {Input} from '../src/rebuild/Input.js';
import {controlSettings} from '../src/rebuild/ControllerConfig.js';
import {Simulation} from '../src/rebuild/Simulation.js';
const target=()=>({id:12,type:'walker',x:7.76,z:-6.3,y:0,radius:.4,health:100});
const setup=()=>({state:'playing',player:{x:0,y:3,z:0,angle:0},enemies:[target()],obstacles:[{id:'support',x:0,z:0,w:3,d:3,h:3,health:100}],blocked:()=>true});
test('touch assist uses body elevation and clears low cover while respecting tall blockers',()=>{
 const sim=setup();let aim=touchAimTarget({x:1,y:0},sim);assert.equal(aim.targetId,12);assert.equal(aim.y,1.11);assert.equal(aim.id,undefined);
 sim.player.y=0;sim.obstacles=[];aim=touchAimTarget({x:1,y:0},sim);assert.equal(aim.y,1.11);
 sim.enemies[0].y=4;aim=touchAimTarget({x:1,y:0},sim);assert.equal(aim.y,5.11);
 sim.obstacles=[{id:'wall',x:3.88,z:-3.15,w:3,d:3,h:7,health:100}];assert.equal(assistedAimClear(sim,sim.enemies[0]),false);assert.equal(touchAimTarget({x:1,y:0},sim).targetId,undefined);
 sim.obstacles[0].health=0;assert.equal(touchAimTarget({x:1,y:0},sim).targetId,12);assert.equal(touchAimTarget({x:1,y:0},sim,false).targetId,undefined);
});
test('pad lock keeps live target height on neutral stick and releases dead/obstructed targets',()=>{
 const previous=globalThis.document;globalThis.document={hidden:false,hasFocus:()=>true,querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>({textContent:''})};
 try{
  const pad={id:'DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,1,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};const input=Object.create(Input.prototype);Object.assign(input,{settings:controlSettings(),source:'gamepad',padButtons:[],keys:new Set(),once:{},pointer:{active:false},stick:{x:0,y:0},getGamepads:()=>[pad],onAction(){}});const sim=setup();input.pollGamepad(sim,0);assert.equal(input.padAim.targetId,12);assert.equal(input.padAim.y,1.11);
  pad.axes[2]=0;sim.enemies[0].y=4;sim.enemies[0].x+=.5;input.pollGamepad(sim,16);assert.equal(input.padAim.y,5.11);assert.equal(input.padAim.x,8.26);
  sim.obstacles.push({id:'wall',x:4,z:-3.15,w:3,d:3,h:8,health:100});input.pollGamepad(sim,32);assert.equal(input.padAim.targetId,undefined);assert.equal(input.padAim.y,undefined);
  sim.obstacles.pop();pad.axes[2]=1;input.pollGamepad(sim,48);assert.equal(input.padAim.targetId,12);sim.enemies[0].health=0;pad.axes[2]=0;input.pollGamepad(sim,64);assert.equal(input.padAim.targetId,undefined);
 }finally{globalThis.document=previous;}
});
test('assisted elevated shots actually travel down into a street target',()=>{
 const sim=new Simulation({seed:73});sim.start('carbine');sim.props=[];sim.obstacles=[];sim.enemies=[];sim.player.x=0;sim.player.z=0;sim.player.y=3;sim.random=()=>.5;const enemy=sim.spawnEnemy('walker',7.76,-6.3);enemy.speed=0;enemy.health=enemy.maxHealth=100;sim.fireWeapon('carbine',touchAimTarget({x:1,y:0},sim));assert.ok(sim.bullets[0].vy<0);
 for(let i=0;i<60;i++)sim.updateBullets(1/120);assert.ok(enemy.health<100,'the descending assisted round must hit the target body');
});

test('quest indicator projection follows hero elevation while the street route stays grounded',()=>{
 const compass=new QuestCompass(),camera=new OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(10,12,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const context=new Proxy({}, {get:(o,key)=>o[key]||(()=>{}),set:(o,key,value)=>{o[key]=value;return true;}}),sim={state:'playing',player:{x:0,y:3,z:0}};
 compass.draw(context,{next:{x:4,z:0},mode:'bearing',label:'QUEST',metres:4},sim,camera,800,600,[],false);
 assert.ok(compass.hero.distanceTo(new Vector3(0,3.15,0).project(camera))<1e-9);assert.ok(compass.turn.distanceTo(new Vector3(4,.15,0).project(camera))<1e-9);assert.equal(compass.drawn,true);
});
