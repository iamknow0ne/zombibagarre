import {World} from '../src/rebuild/World.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {generateCity} from '../src/rebuild/City.js';
const SEED=20261012,$=id=>document.getElementById(id);
let world,sim,frame=0,last=0,running=false,samples=[],results=[],run;
const percentile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]||0;
function report(error){
 const metric=key=>{const v=samples.map(s=>s[key]);return {mean:+(v.reduce((a,b)=>a+b,0)/Math.max(1,v.length)).toFixed(2),p95:+percentile(v,.95).toFixed(2)}};
 const result={...run,seed:SEED,viewport:[innerWidth,innerHeight],frames:samples.length,fps:+(1000/metric('frameMs').mean).toFixed(1),frameMs:metric('frameMs'),simMs:metric('simMs'),eventsMs:metric('eventsMs'),worldMs:metric('worldMs'),drawCalls:metric('calls'),triangles:metric('triangles'),meshes:0,resources:{...world.renderer.info.memory},peakEffects:Math.max(0,...samples.map(s=>s.effectCount)),peakStructures:Math.max(0,...samples.map(s=>s.structures)),checkpoints:run.checkpoints,stages:Object.fromEntries(['actors','props','effects','overlay','instances','render'].map(k=>[k,metric(k)])),...(error?{error:String(error.stack||error)}:{})};
 world.scene.traverse(o=>{if(o.isMesh)result.meshes++});results.push(result);$('report').textContent=JSON.stringify(results,null,2);
 for(const el of document.querySelectorAll('select,button[data-run]'))el.disabled=false;$('stop').disabled=true;
}
function start(total){
 if(running)return;world?.destroy();run={scene:$('scene').value,quality:$('quality').value,totalFrames:total,checkpoints:[]};
 const layout=generateCity(SEED);sim=new Simulation({seed:SEED,layout,mode:'city',environment:{weatherMode:run.scene==='storm'?'rain':run.scene==='snow'?'snow':'clear'}});sim.start();sim.toSpawn=999;sim.spawnTimer=1e6;sim.player.invulnerable=999;sim.player.health=9999;sim.player.z=3;sim.events=[];
 const settings={quality:run.quality,gore:true,reducedMotion:false};world=new World($('game'),settings,0,layout);world.profile={};world.applySettings(settings);sim.setBuildings(world.buildingTargets);world.focus.set(0,0,2);world.player.position.set(0,0,3);
 if(run.scene==='combat'){sim.setLoadout(['flame','arc']);for(let i=0;i<60;i++){const a=i*2.39996,r=3+Math.sqrt(i)*.8,e=sim.spawnEnemy(i%5===0?'brute':'walker',Math.sin(a)*r,3+Math.cos(a)*r);e.speed=.05;e.health=e.maxHealth=1e6;}}
 if(run.scene==='collapse'){
  const b=sim.props.filter(p=>p.kind==='building').sort((a,b)=>b.h-a.h)[0];sim.player.x=b.x;sim.player.z=b.z+b.d/2+5;world.focus.set(sim.player.x,0,sim.player.z);world.player.position.set(sim.player.x,0,sim.player.z);run.building=b.id;
 }
 if(run.scene==='storm')sim.weather.rain=sim.weather.wetness=1;if(run.scene==='snow')sim.weather.snow=sim.weather.snowCover=1;
 frame=0;samples=[];last=0;running=true;$('stop').disabled=false;for(const el of document.querySelectorAll('select,button[data-run]'))el.disabled=true;$('report').textContent='Warming shaders and running…';
}
$('run').onclick=()=>start(240);$('long').onclick=()=>start(6000);$('stop').onclick=()=>{if(running){running=false;run.cancelled=true;report();}};
function loop(now){requestAnimationFrame(loop);if(!running)return;try{
 const frameMs=last?now-last:0;last=now;
 const a=performance.now();
 if(run.scene==='collapse'&&frame===65){const b=sim.props.find(p=>p.id===run.building);sim.damageProp(b,b.health+1,{explosive:true,x:b.x,z:b.z,radius:8});}
 sim.update(1/60,{auto:run.scene==='combat'});const b=performance.now();for(const e of sim.events)world.onEvent(e);sim.events=[];const c=performance.now();world.update(sim,1/60);const d=performance.now();
 if(frame>=60)samples.push({...world.profile,frameMs,simMs:b-a,eventsMs:c-b,worldMs:d-c,calls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,effectCount:world.effects.length,structures:sim.structures?.length||0});
 if(frame%600===0){run.checkpoints.push({frame,effects:world.effects.length,...world.renderer.info.memory});$('report').textContent=`Running ${frame} / ${run.totalFrames} frames · ${world.effects.length} effects · ${world.renderer.info.memory.geometries} geometries`;}
 if(++frame>=run.totalFrames){running=false;report();}
 }catch(error){running=false;report(error);}}
$('hide').onclick=()=>{$('report').hidden=!$('report').hidden};requestAnimationFrame(loop);
