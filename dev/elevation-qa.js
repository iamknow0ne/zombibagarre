import {Simulation} from '../src/rebuild/Simulation.js';
import {World} from '../src/rebuild/World.js';
if(!import.meta.env.DEV)throw new Error('Local development only');
const $=id=>document.getElementById(id),settings={quality:'balanced',viewMode:'diorama',gore:true,goreLevel:4,dayCycle:'day',weatherMode:'clear',populationDetail:'off',foliageDetail:'sparse'};
let sim,world,roof,victim;
function flush(){for(const e of sim.events)world.onEvent(e);sim.events=[];}
function draw(dt=0){sim.time+=dt;world.update(sim,dt);$('report').textContent=JSON.stringify({roofY:roof.top,heroY:sim.player.y,corpseY:world.corpses.map(c=>c.baseY),surfaceStains:world.decals.filter(d=>d.userData.surface).length,effects:world.effects.length,corpseRenderY:world.corpses.map(c=>c.mesh.position.y)},null,1);}
function advance(seconds){for(let t=0;t<seconds;t+=1/60)draw(Math.min(1/60,seconds-t));}
function reset(){world?.destroy();sim=new Simulation({seed:73,mode:'city',environment:settings});sim.start('hammer');sim.toSpawn=999;sim.spawnTimer=99999;sim.enemies=[];sim.player.invulnerable=999;
 roof=sim.layout.traversal.roofs[0];Object.assign(sim.player,{...roof.approach,y:0,grounded:true,supportId:null,grappleCooldown:0});sim.update(1/120,{grapple:true,auto:false});for(let i=0;i<900&&!(sim.player.grounded&&sim.player.supportId===roof.anchor.supportId);i++)sim.update(1/120,{auto:false});
 sim.events=[];world=new World($('game'),settings,0,sim.layout);world.applySettings(settings);world.portrait=19;world.focus.set(sim.player.x,sim.player.y*.8,sim.player.z-1);
 victim=sim.spawnEnemy('walker',sim.player.x+1.5,sim.player.z-1);victim.y=roof.top;victim.speed=0;victim.attack=999;victim.health=100;advance(.3);}
$('reset').onclick=reset;
for(const [id,weapon]of [['hammer','hammer'],['blade','katana']])$(id).onclick=()=>{world.onEvent({type:'cut-wave',weapon,x:sim.player.x,z:sim.player.z,baseY:sim.player.y,radius:2,angle:0});draw();};
$('wound').onclick=()=>{sim.damageEnemy(victim,999,2,0,{kind:'ballistic',weapon:'shotgun'});flush();advance(.2);};
$('element').onclick=()=>{victim.burning=5;victim.electrified=5;world.onEvent({type:'ignite',x:victim.x,z:victim.z,baseY:victim.y});world.onEvent({type:'electrify',x:victim.x,z:victim.z,baseY:victim.y});advance(.1);};
$('evolve').onclick=()=>{world.onEvent({type:'evolution',weapon:'hammer',tier:2,x:sim.player.x,z:sim.player.z,baseY:sim.player.y,y:sim.player.y});draw();};
$('paused').onclick=()=>{sim.state='paused';advance(2);sim.state='playing';};
$('step').onclick=()=>advance(.1);$('settle').onclick=()=>advance(2);
$('collapse').onclick=()=>{sim.damageProp(sim.props.find(p=>p.id===roof.buildingId),1e9);flush();advance(2);};
window.addEventListener('resize',()=>{world.resize();draw();});reset();
