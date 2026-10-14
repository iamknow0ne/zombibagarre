import {Input} from '../src/rebuild/Input.js';
import {ViewRig} from '../src/rebuild/ViewRig.js';
import {CONTROL_DEFAULTS} from '../src/rebuild/ControllerConfig.js';

const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const input=new Input(canvas,()=>{},structuredClone(CONTROL_DEFAULTS)),rig=new ViewRig();
const sim={time:0,player:{x:0,y:0,z:0,angle:0,weapon:'carbine',equipped:['carbine']},props:[],enemies:[]};
const world={viewRig:rig,aim:()=>null};
const stages=['aim','fire','release-fire','release-aim'];let stage=0;
const send=(type,button,buttons,movementX=0,movementY=0)=>{
 const EventClass=type.startsWith('pointer')?PointerEvent:MouseEvent;
 canvas.dispatchEvent(new EventClass(type,{bubbles:true,pointerType:'mouse',pointerId:1,button,buttons,clientX:450,clientY:100,movementX,movementY}));
};
function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#607770';ctx.lineWidth=1;
 const offset=rig.yaw*500;for(let x=-200;x<1100;x+=70){ctx.beginPath();ctx.moveTo(x+offset,0);ctx.lineTo(x+offset,200);ctx.stroke();}
 ctx.strokeStyle='#f18147';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(435,100);ctx.lineTo(465,100);ctx.moveTo(450,85);ctx.lineTo(450,115);ctx.stroke();
 ctx.fillStyle='#eee8d8';ctx.font='15px monospace';ctx.fillText(`CAMERA YAW ${rig.yaw.toFixed(5)} · PITCH ${rig.pitch.toFixed(5)}`,20,30);
 $('state').textContent=`Pointer lock: disabled for this fixture\nFire: ${input.firing} · Aim held: ${input.aimHeld}\nCamera yaw: ${rig.yaw.toFixed(5)} · Camera pitch: ${rig.pitch.toFixed(5)}\nNext: ${stage<stages.length?$(stages[stage]).textContent:'Complete — all four event sequences checked'}`;
 for(let n=0;n<stages.length;n++)$(stages[n]).disabled=n!==stage;
}
function sample(label,expectedX,expectedY,fire,aim){
 const x=input.lookX||0,y=input.lookY||0,before=rig.yaw;
 const out=input.consume(world,false,sim,1/60),delta=rig.yaw-before;
 const ok=x===expectedX&&y===expectedY&&out.firing===fire&&out.aiming===aim&&Math.abs(delta+expectedX*.0025)<1e-9;
 const row=document.createElement('tr');
 for(const value of [label,`${x} / ${y}`,delta.toFixed(5),`${out.firing} / ${out.aiming}`,ok?'PASS':'FAIL']){const td=document.createElement('td');td.textContent=value;row.append(td);}
 row.lastChild.className=ok?'pass':'fail';$('results').append(row);stage++;draw();
}
function reset(){
 input.clear();Object.assign(input,{playing:true,perspective:true,lockUnavailable:true,source:'keyboard',pointer:{active:false},firing:false,aimHeld:false});
 rig.setMode('first');rig.ready=false;rig.pendingYaw=0;rig.pitch=.12;rig.active=true;rig.update(sim,900/200,0);stage=0;$('results').replaceChildren();draw();
}
$('reset').onclick=()=>{reset();$('movement-results').replaceChildren();$('movement-state').textContent='Not run';};
$('movement').onclick=()=>{
 reset();$('movement-results').replaceChildren();const evidence=[];
 const scenarios=[
  {name:'Initial FPS',mode:'first',angle:0,stale:Math.PI},
  {name:'Initial TPS',mode:'third',angle:.7,stale:Math.PI},
  {name:'TPS → FPS',mode:'first',previous:'third',angle:-.7,stale:1.2},
  {name:'FPS → TPS',mode:'third',previous:'first',angle:1.1,stale:-1.4},
 ];
 for(const scenario of scenarios){
  const view=new ViewRig();view.active=true;
  const scene={...sim,player:{...sim.player,angle:scenario.angle}};
  if(scenario.previous){view.setMode(scenario.previous);view.update({...scene,player:{...scene.player,angle:scenario.stale}},900/200,0);}
  else view.yaw=scenario.stale;
  view.setMode(scenario.mode);
  const priorYaw=view.yaw;
  window.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,code:'KeyW',key:'w'}));
  send('pointermove',-1,2,40,0);
  const out=input.consume({viewRig:view,aim:()=>null},false,scene,1/60);
  window.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,code:'KeyW',key:'w'}));
  const direction=view.camera.getWorldDirection(view.target.clone()),length=Math.hypot(direction.x,direction.z);
  const forward={x:direction.x/length,z:direction.z/length},speed=Math.hypot(out.x,out.z),dot=speed?(out.x*forward.x+out.z*forward.z)/speed:0;
  const ok=Math.abs(dot-1)<1e-9&&Math.abs(speed-1)<1e-9&&Math.abs(view.yaw-(scenario.angle-.1))<1e-9;
  const result={scenario:scenario.name,priorYaw,heroAngle:scenario.angle,resolvedYaw:view.yaw,movement:{x:out.x,z:out.z},cameraForward:forward,dot,pass:ok};evidence.push(result);
  const row=document.createElement('tr');for(const value of [scenario.name,`${out.x.toFixed(5)} / ${out.z.toFixed(5)}`,`${forward.x.toFixed(5)} / ${forward.z.toFixed(5)}`,dot.toFixed(8),ok?'PASS':'FAIL']){const td=document.createElement('td');td.textContent=value;row.append(td);}row.lastChild.className=ok?'pass':'fail';$('movement-results').append(row);
 }
 send('pointermove',-1,0);$('movement-state').textContent=JSON.stringify({simulated:true,passed:evidence.filter(row=>row.pass).length,total:evidence.length,scenarios:evidence},null,2);draw();
};
$('aim').onclick=()=>{send('pointerdown',2,2);send('mousedown',2,2);send('pointermove',-1,2,8,-3);sample('Right drag',8,-3,false,true);};
$('fire').onclick=()=>{send('mousedown',0,3);send('pointermove',-1,3,11,4);sample('Aim + fire drag',11,4,true,true);};
$('release-fire').onclick=()=>{send('mouseup',0,2);send('pointermove',-1,2,5,2);sample('Release fire; keep aiming',5,2,false,true);};
$('release-aim').onclick=()=>{send('mouseup',2,0);send('pointerup',2,0);send('pointermove',-1,0,40,40);sample('Release aim; free movement',0,0,false,false);};
reset();
