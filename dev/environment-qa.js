import {World} from '../src/rebuild/World.js';
import {Simulation} from '../src/rebuild/Simulation.js';
const $=id=>document.getElementById(id);let sim,world,b,target,end=0,last=performance.now(),frames=0,startWall=0,fps=0;const errors=[],events={};
window.addEventListener('error',e=>errors.push(e.message));
function setup(){world?.destroy();sim=new Simulation({seed:73,mode:'city'});sim.start();sim.toSpawn=999;sim.spawnTimer=99999;sim.player.invulnerable=99999;world=new World($('game'),{quality:'high',gore:true,reducedMotion:true},0,sim.layout);sim.setBuildings(world.buildingTargets);b=sim.props.filter(p=>p.kind==='building').sort((a,b)=>b.h-a.h)[0];end=0;inspect(b);}
function inspect(t){target=t;sim.player.x=t.x+t.w/2+3;sim.player.z=t.z+t.d/2+3;world.inspectionTarget={x:t.x,z:t.z};world.focus.set(t.x,0,t.z);world.portrait=t.feature?25:34;render(0);}
function render(dt){for(const e of sim.events){events[e.type]=(events[e.type]||0)+1;world.onEvent(e);}sim.events=[];world.update(sim,dt);$('report').textContent=JSON.stringify({time:+sim.time.toFixed(2),state:end?'running':'frozen',fps,buildingHP:Math.max(0,Math.round(b.health)),fragments:sim.structures?.length||0,falling:sim.structures?.filter(c=>!c.sleep).length||0,rubble:sim.obstacles.filter(p=>p.kind==='rubble').length,burningBays:b.surfaces?.filter(c=>c.burning>0).length||0,wetBays:b.surfaces?.filter(c=>c.wet>0).length||0,effects:world.effects.length,drawCalls:world.renderer.info.render.calls,water:sim.layout.water.map(w=>w.feature||'canal'),events,errors});}
function advance(dt){sim.update(dt,{auto:false});render(dt);}
$('building').onclick=()=>inspect(b);$('damage').onclick=()=>{sim.damageProp(b,b.maxHealth*.26,{x:b.x,z:b.z+b.d/2,explosive:true,radius:4});render(0);};$('collapse').onclick=()=>{sim.damageProp(b,b.health+1);render(0);};
$('fire').onclick=()=>{for(const x of [-2,0,2])sim.igniteProp(b,b.x+x,b.z+b.d/2,1,8);render(0);};
$('water').onclick=()=>{sim.splashWater(b.x,b.z+b.d/2,8);render(0);};
$('lake').onclick=()=>inspect(sim.layout.water.find(w=>w.feature==='lake'));$('fountain').onclick=()=>inspect(sim.layout.water.find(w=>w.feature==='fountain'));$('splash').onclick=()=>{sim.blast(target.x,target.z,4,100);render(0);};
$('step').onclick=()=>{for(let i=0;i<30;i++)advance(1/60);};$('play').onclick=()=>{end=sim.time+8;frames=0;startWall=performance.now();};$('reset').onclick=setup;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(end){frames++;advance(dt);if(sim.time>=end){fps=Math.round(frames*1000/(now-startWall));end=0;render(0);}}requestAnimationFrame(loop);}setup();requestAnimationFrame(loop);
window.addEventListener('resize',()=>{world.resize();render(0);});
