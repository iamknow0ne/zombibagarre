import {Simulation} from '../src/rebuild/Simulation.js';
import {World} from '../src/rebuild/World.js';
import {RegionUI} from '../src/rebuild/RegionUI.js';
import {roofEncounter,roofCachePosition} from '../src/rebuild/RooftopEncounters.js';
if(!import.meta.env.DEV)throw new Error('Development fixture only');
const $=id=>document.getElementById(id),settings={quality:'balanced',viewMode:'diorama',gore:true,dayCycle:'day',weatherMode:'clear',populationDetail:'off',foliageDetail:'sparse'},input={source:'keyboard',settings:{}};
const ui=new RegionUI(input);let sim,world,roof,messages=[];
function render(dt){world.update(sim,dt);$('vehicle-action').hidden=true;$('vehicle-world-prompt').hidden=true;document.querySelector('.vehicle-readout').hidden=true;ui.update(sim,world);$('report').textContent=JSON.stringify({encounter:roofEncounter(sim,roof),hero:{health:sim.player.health,y:sim.player.y},guard:sim.enemies.filter(e=>e.optionalEncounter).map(e=>({health:e.health,y:e.y,x:e.x,z:e.z})),coins:sim.rpg.coins,xp:sim.profile.xp,grenades:sim.player.grenades,messages:messages.slice(-3)},null,1);}
function tick(dt,controls={auto:false}){sim.update(dt,controls);for(const e of sim.events){world.onEvent(e);if(e.type==='rpg-notice')messages.push(e.message);}sim.events=[];render(dt);}
function advance(seconds,controls){for(let i=0;i<seconds*60;i++)tick(1/60,typeof controls==='function'?controls():controls);}
function reset(){world?.destroy();sim=new Simulation({seed:73,mode:'city',profile:{},environment:settings});sim.start('carbine');sim.toSpawn=999;sim.spawnTimer=99999;sim.enemies=[];sim.events=[];roof=sim.layout.traversal.roofs[0];Object.assign(sim.player,{...roof.approach,y:0,grounded:true,supportId:null});messages=[];world=new World($('game'),settings,0,sim.layout);world.applySettings(settings);world.portrait=20;world.focus.set(sim.player.x,sim.player.y*.8,sim.player.z-1);advance(.2,{auto:false});}
$('reset').onclick=reset;
$('grapple').onclick=()=>{tick(1/60,{grapple:true,auto:false});for(let i=0;i<240&&!(sim.player.grounded&&sim.player.supportId===roof.anchor.supportId);i++)tick(1/60,{auto:false});};
$('fight').onclick=()=>advance(5,{auto:true});
$('cache').onclick=()=>{const c=roofCachePosition(roof);for(let i=0;i<400&&Math.hypot(c.x-sim.player.x,c.z-sim.player.z)>.5;i++){const d=Math.hypot(c.x-sim.player.x,c.z-sim.player.z);tick(1/60,{x:(c.x-sim.player.x)/d,z:(c.z-sim.player.z)/d,auto:true});}};
$('collapse').onclick=()=>{sim.damageProp(sim.props.find(p=>p.id===roof.buildingId),1e9);advance(2,{auto:false});};
$('touch').onclick=()=>{input.source=input.source==='touch'?'keyboard':'touch';document.body.classList.toggle('touch-layout',input.source==='touch');render(0);};
$('vehicle-action').onclick=$('vehicle-world-prompt').onclick=()=>tick(1/60,{interact:true,auto:false});
window.addEventListener('resize',()=>{world.resize();render(0);});reset();
function frame(){if(world.requestRender){world.requestRender=false;render(0);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
