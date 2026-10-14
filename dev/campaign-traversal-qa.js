import {Simulation} from '../src/rebuild/Simulation.js';
import {World} from '../src/rebuild/World.js';
import {cameraMovement} from '../src/rebuild/ViewRig.js';
import {Vector3} from 'three';

if(!import.meta.env.DEV)throw new Error('Campaign traversal QA is a local development fixture.');
const $=id=>document.getElementById(id),keys=new Set(),once={};
// A developer console over the game canvas: restrained olive/amber, compact
// controls, monospace diagnostics, no decorative UI motion or saved preferences.
const settings={quality:'balanced',gore:true,goreLevel:4,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,viewMode:'diorama',dayCycle:'day',weatherMode:'clear',populationDetail:'off',environmentDetail:'minimal',foliageDetail:'sparse'};
let scene='jump',sim,world,running=false,stage=0,freezeAt=Infinity,freezeReason='',events=[],lastFrame=0,autoFreeze=true,target=null,firing=false,lastAim=null,burstUntil=0;
const pointer={x:.5,y:.5};
const round=n=>Number.isFinite(n)?Number(n.toFixed(3)):null;
function fail(error){running=false;$('error').hidden=false;$('error').textContent=error.message||String(error);report();}
function setup(){
 running=false;firing=false;burstUntil=0;target=null;lastAim=null;keys.clear();for(const k of Object.keys(once))delete once[k];world?.destroy();events=[];stage=0;freezeAt=Infinity;freezeReason='';autoFreeze=true;
 sim=new Simulation({seed:73,mode:'city',environment:settings});sim.start(scene==='roof-arc'?'arc':'carbine');sim.toSpawn=999;sim.spawnTimer=99999;sim.player.invulnerable=999;sim.enemies=[];sim.events=[];
 const anchors=sim.layout.traversal.anchors,centre={x:(anchors[0].x+anchors[1].x)/3,z:(anchors[0].z+anchors[1].z+3)/3};
 world=new World($('game'),settings,0,sim.layout);world.applySettings(settings);world.portrait=25;world.inspectionTarget=centre;world.focus.set(centre.x,0,centre.z);world.update(sim,0);
 if(scene.startsWith('roof')){const roof=sim.layout.traversal.roofs[0];if(!roof)throw new Error('No service roof for this seed.');const a=roof.anchor,start=scene==='roof-manual'?a:roof.approach;Object.assign(sim.player,{x:start.x,z:start.z,y:scene==='roof-manual'?roof.top:0,grounded:true,supportId:scene==='roof-manual'?a.supportId:null,supportY:scene==='roof-manual'?roof.top:0,angle:Math.atan2(-roof.approach.nx,-roof.approach.nz)});centre.x=a.x;centre.z=a.z;world.focus.set(a.x,0,a.z);}
 if(scene==='roof-arc'){
  const roof=sim.layout.traversal.roofs[0],wall=roof.parts.find(p=>p.role==='parapet'&&p.d>1&&p.x<roof.parts[0].x);
  Object.assign(sim.player,{x:wall.x+.5,y:roof.top,z:wall.z,angle:-Math.PI/2,grounded:true,supportId:roof.anchor.supportId,supportY:roof.top});
  target=sim.spawnEnemy('walker',sim.player.x-4,sim.player.z);target.health=target.maxHealth=1000;target.speed=0;target.attack=999;
  centre.x=sim.player.x;centre.z=sim.player.z;world.focus.set(centre.x,0,centre.z);
 }
 if(scene==='edge'){const a=anchors[0],support=sim.props.find(p=>p.id===a.supportId);Object.assign(sim.player,{x:a.x+support.w/2+.1,z:a.z,y:support.h+.1,vy:-5,grounded:false,supportId:null,supportY:0,angle:-Math.PI/2});centre.x=a.x;centre.z=a.z;world.focus.set(a.x,0,a.z);}
 if(scene==='shooting'){const a=anchors[0],support=sim.props.find(p=>p.id===a.supportId);Object.assign(sim.player,{x:a.x,z:a.z,y:support.h,grounded:true,supportId:support.id,supportY:support.h,angle:Math.atan2(-a.x,3-a.z)});target=sim.spawnEnemy('walker',0,3);target.health=target.maxHealth=10000;target.speed=0;target.attack=999;centre.x=(a.x+target.x)/2;centre.z=(a.z+target.z)/2;world.focus.set(centre.x,0,centre.z);}
 applyCamera();$('aim-target').disabled=!target;$('fire-burst').disabled=!['manual','shooting','roof-manual','roof-arc'].includes(scene);
 document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===scene)));$('error').hidden=true;
 running=true;lastFrame=performance.now();report();
}
function actionInput(){
 const input={auto:false};
 if(scene==='edge')return {...input,x:-1,z:0};
 if(['manual','shooting','roof-manual','roof-arc'].includes(scene)){
  input.x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  input.z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  if(world.viewRig.active){const move=cameraMovement(input.x,input.z,world.viewRig.yaw);Object.assign(input,move);}
  if(target||firing||sim.time<burstUntil){lastAim=world.aim(pointer.x,pointer.y,sim);input.aim=lastAim;input.firing=firing||sim.time<burstUntil;}
  Object.assign(input,once);for(const key of Object.keys(once))delete once[key];return input;
 }
 if(stage===0){stage=1;if(scene==='jump')input.jump=true;else{sim.traversalTarget=scene.startsWith('roof')?sim.layout.traversal.roofs[0].anchor:sim.layout.traversal.anchors[0];input.grapple=true;}}
 if(scene==='release'&&stage===1&&sim.time>=.35){input.grapple=true;stage=2;}
 if(scene==='grapple2'&&stage===2&&sim.player.grappleCooldown<=0){sim.traversalTarget=sim.layout.traversal.anchors[1];input.grapple=true;stage=3;}
 return input;
}
function advance(dt){
 sim.update(dt,actionInput());
 for(const event of sim.events){
  world.onEvent(event);if(event.type.startsWith('traversal-')||event.type==='progression'||event.type==='destroy'){events.push({type:event.type,time:round(sim.time),support:event.supportId||null,message:event.message||event.title||null});if(events.length>12)events.shift();}
  if(event.type==='traversal-land'&&!['manual','shooting','roof-manual','roof-arc'].includes(scene)){
   if(scene==='grapple2'&&stage===1)stage=2;
   else if(['destroy','roof-destroy'].includes(scene)&&stage===1){const support=sim.props.find(p=>p.id===sim.player.supportId);if(support){sim.damageProp(support,support.health+1);stage=2;events.push({type:'fixture-damage',time:round(sim.time),support:support.id});}}
   else{freezeAt=sim.time+.12;freezeReason='landing';}
  }
 }
 sim.events=[];
 if(autoFreeze&&!['manual','shooting','roof-manual','roof-arc'].includes(scene)&&$('freeze').value==='midair'&&sim.time>=.22){freezeAt=Math.min(freezeAt,.22);freezeReason='mid-air';}
 if(autoFreeze&&!['manual','shooting','roof-manual','roof-arc'].includes(scene)&&sim.time>=8){freezeAt=8;freezeReason='8s safety stop';}
 if(sim.time>=freezeAt)running=false;
}
function report(){
 if(!sim)return;
 const p=sim.player,anchorTarget=sim.traversalTarget;
 $('status').textContent=`${scene.toUpperCase()} · ${running?'RUNNING':`FROZEN ${freezeReason}`} · ${round(sim.time)}s`;
 $('pause').textContent=running?'Freeze':'Resume';
 $('report').textContent=JSON.stringify({position:{x:round(p.x),y:round(p.y),z:round(p.z)},grounded:p.grounded,support:p.supportId,grapple:p.grapple?.anchorId||null,velocityY:round(p.vy),target:anchorTarget?{id:anchorTarget.id,available:anchorTarget.available,reason:anchorTarget.reason||null}:null,camera:{mode:settings.viewMode,x:round(world.camera.position.x),y:round(world.camera.position.y),z:round(world.camera.position.z)},aim:lastAim?{x:round(lastAim.x),y:round(lastAim.y),z:round(lastAim.z),targetId:lastAim.targetId??null}:null,targetHealth:target?round(target.health):null,weapon:p.weapon,shots:p.shotCounts[p.weapon]||0,magazine:p.magazines[p.weapon],rewardClaimed:!!sim.traversalRewardClaimed,grenades:p.grenades,lastEvents:events.slice(-5)},null,2);
}
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>{scene=b.dataset.scene;try{setup();}catch(e){fail(e);}};
$('replay').onclick=()=>{try{setup();}catch(e){fail(e);}};$('freeze').onchange=$('replay').onclick;
$('pause').onclick=()=>{running=!running;if(running){freezeAt=Infinity;freezeReason='';autoFreeze=false;}report();};
$('step').onclick=()=>{running=false;freezeAt=Infinity;autoFreeze=false;for(let i=0;i<12;i++)advance(1/120);running=false;world.update(sim,.1);report();};
$('game').addEventListener('keydown',e=>{if(!['manual','shooting','roof-manual','roof-arc'].includes(scene))return;const action={KeyJ:'jump',KeyG:'grapple',Space:'dash'}[e.code];if(action&&!e.repeat)once[action]=true;if(action||/^(Key[WASD]|Arrow)/.test(e.code)){e.preventDefault();keys.add(e.code);}});
function applyCamera(){
 settings.viewMode=$('camera').value;world.applySettings(settings);world.viewRig.ready=false;
 if(settings.viewMode==='diorama'){world.portrait=25;world.inspectionTarget={x:world.focus.x,z:world.focus.z};}else{world.portrait=false;world.inspectionTarget=null;}
 $('crosshair').hidden=settings.viewMode==='diorama';world.update(sim,0);report();
}
$('camera').onchange=applyCamera;
$('fire-burst').onclick=()=>{burstUntil=sim.time+.6;running=true;freezeAt=Infinity;freezeReason='';autoFreeze=false;lastFrame=performance.now();report();};
$('aim-target').onclick=()=>{if(!target)return;for(let i=0;i<8;i++){if(world.viewRig.active){const camera=world.camera.position;world.viewRig.yaw=Math.atan2(target.x-camera.x,target.z-camera.z);world.viewRig.pitch=Math.atan2(camera.y-((target.y||0)+1.1),Math.hypot(target.x-camera.x,target.z-camera.z));world.update(sim,0);}else{const point=new Vector3(target.x,(target.y||0)+1.1,target.z).project(world.camera);pointer.x=(point.x+1)/2;pointer.y=(1-point.y)/2;}}lastAim=world.aim(pointer.x,pointer.y,sim);report();$('game').focus();};
$('game').addEventListener('pointermove',e=>{const r=$('game').getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width;pointer.y=(e.clientY-r.top)/r.height;if(world.viewRig.active&&(e.buttons&2)){world.viewRig.look(e.movementX,e.movementY);world.update(sim,0);}lastAim=world.aim(pointer.x,pointer.y,sim);});
$('game').addEventListener('pointerdown',e=>{if(e.button===0)firing=true;$('game').focus();});window.addEventListener('pointerup',e=>{if(e.button===0)firing=false;});$('game').addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{firing=false;burstUntil=0;keys.clear();for(const k of Object.keys(once))delete once[k];});
window.addEventListener('resize',()=>{world?.resize();world?.update(sim,0);});
function frame(now){requestAnimationFrame(frame);if(!world)return;const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;try{if(running){let remaining=dt;while(remaining>1e-6&&running){const part=Math.min(1/120,remaining);advance(part);remaining-=part;}world.update(sim,dt);report();}else if(world.requestRender){world.requestRender=false;world.update(sim,0);}}catch(error){fail(error);}}
try{setup();requestAnimationFrame(frame);}catch(error){fail(error);}
