import {World} from '../src/rebuild/World.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {generateMap} from '../src/rebuild/Map.js';
import {weaponStats} from '../src/rebuild/config.js';
const $=id=>document.getElementById(id),settings={quality:'high',gore:true,reducedMotion:false};
const layout=generateMap(845,0);layout.cover=[];const world=new World($('game'),settings,0,layout);world.portrait=30;world.focus.set(0,0,0);
let sim,scene='mixed',events=[],last=performance.now(),playing=0,age=0;const errors=[];window.addEventListener('error',e=>errors.push(e.message));
function render(dt=0){for(const e of sim.events){if(e.type==='damage')events.push(e);world.onEvent(e);}sim.events=[];world.update(sim,dt);$('report').textContent=JSON.stringify({scene,state:playing?'PLAYING':'FROZEN',settings,damage:events.map(e=>({type:e.kind,amount:+e.amount.toFixed(1),critical:e.critical,tier:e.tier})),activeNumbers:world.feedback.feed.hits.length,bars:world.feedback.bars.size,drawnBars:world.feedback.drawnBars,drawnNumbers:world.feedback.drawnNumbers,clock:+world.feedback.feed.clock.toFixed(2),errors});}
function setup(kind=scene){scene=kind;world.clearDynamic();sim=new Simulation({seed:845,layout});sim.start();sim.toSpawn=999;sim.spawnTimer=9999;sim.player.invulnerable=999;sim.player.z=5;sim.events=[];events=[];age=0;playing=0;
 if(scene==='growth'){for(let i=0;i<4;i++){const e=sim.spawnEnemy('brute',-7+i*4,0);e.health=e.maxHealth=1000;e.speed=0;e.attack=999;sim.player.mastery.carbine=[0,1000,3500,8000][i];sim.random=()=>i===3?0:.99;sim.damageEnemy(e,weaponStats(sim.player,'carbine').damage*(1+i*.25),0,0,{kind:'ballistic',weapon:'carbine',tier:i});}}
 else if(scene==='crowd'){for(let i=0;i<65;i++){const e=sim.spawnEnemy('walker',(i%10-5)*.7,Math.floor(i/10)*.7-3);e.health=e.maxHealth=300;e.speed=0;sim.damageEnemy(e,20+i,0,0,{kind:['fire','electric','explosion','slice','ballistic'][i%5],weapon:'carbine'});}}
 else{const hits=[['ballistic','carbine',24],['fire','flame',42],['electric','arc',76],['explosion','launcher',180],['slice','katana',108],['ballistic','marksman',198]];for(let i=0;i<hits.length;i++){const [kind,weapon,amount]=hits[i],e=sim.spawnEnemy('brute',-8+(i%3)*7,-4+Math.floor(i/3)*7);e.health=e.maxHealth=800;e.speed=0;e.attack=999;sim.random=()=>i===5?0:.99;sim.damageEnemy(e,amount,0,0,{kind,weapon,headshot:i===5,finisher:i===4});}}
 render(.016);render(.08);
}
for(const [id,key]of Object.entries({numbers:'damageNumbers',bars:'enemyHealthBars',crits:'criticalCallouts',colors:'damageColors',motion:'reducedMotion'}))$(id).onchange=()=>{settings[key]=$(id).checked;world.applySettings(settings);render();};
for(const id of ['mixed','growth','crowd'])$(id).onclick=()=>setup(id);$('step').onclick=()=>render(.1);$('play').onclick=()=>{playing=6;age=0;};
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(playing>0){playing-=dt;age+=dt;sim.update(dt,{auto:true});render(dt);}requestAnimationFrame(loop);}setup();requestAnimationFrame(loop);
