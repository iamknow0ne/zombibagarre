import {World} from '../src/rebuild/World.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {generateMap} from '../src/rebuild/Map.js';
import {WEAPONS} from '../src/rebuild/config.js';
import {slotKey} from '../src/rebuild/Loadout.js';
const $=id=>document.getElementById(id);
for(const [key,w]of Object.entries(WEAPONS)){const o=new Option(w.name,key);$('weapon').add(o);if(!w.melee)$('partner').add(new Option(w.name,key));}
let world,sim,last=performance.now(),end=0,started=0,reloaded=false,frames=0,wallStart=0,events={},maxGripError=0;
const errors=[];window.addEventListener('error',e=>{errors.push(e.message);report();});
function setup(){
 world?.clearDynamic();const layout=world?.layout||generateMap(845,0);layout.cover=[];
 sim=new Simulation({seed:845,layout,skin:$('skin').value});sim.start($('weapon').value);sim.setLoadout([$('weapon').value,...($('partner').value?[$('partner').value]:[])]);sim.player.angle=.55;sim.toSpawn=999;sim.spawnTimer=99999;sim.player.invulnerable=9999;sim.events=[];
 world??=new World($('game'),{quality:'high',gore:true,reducedMotion:true},0,layout);world.player.userData.walk=0;world.player.userData.gait=0;for(const trail of world.player.userData.bladeTrails||[])trail.points=[];world.portrait=5.5;world.focus.set(0,0,2.8);world.player.position.set(0,0,3);world.player.rotation.y=.55;sim.time=1;end=0;events={};maxGripError=0;render(0);
}
function render(dt){for(const e of sim.events){events[e.type]=(events[e.type]||0)+1;world.onEvent(e);}sim.events=[];world.update(sim,dt);maxGripError=Math.max(maxGripError,world.player.userData.gripError||0);report();}
function advance(dt,input={}){sim.update(dt,{auto:false,...input});render(dt);}
function aim(){return {x:sim.player.x+Math.sin(.55)*8,z:sim.player.z+Math.cos(.55)*8};}
function report(){const p=sim.player;const phase=p.swing>0?(1-p.swing/p.swingDuration):null;$('report').textContent=`STAGED TEST / NO SAVE DATA · ${WEAPONS[p.weapon].name} · ${end?'PLAYING':'FROZEN'}\n${JSON.stringify({time:+sim.time.toFixed(3),renderedWeapons:world.player.userData.weaponRigs?.filter(Boolean).map(g=>g.userData.key),visibleBladeTrails:world.player.userData.bladeTrails?.filter(t=>t?.mesh.visible).length||0,combo:p.swingCombo+1,swingPhase:phase===null?'guard':+phase.toFixed(3),reloads:p.reloads,magazines:p.equipped.map((k,i)=>p.magazines[slotKey(p.equipped,k,i)]),gripError:+(world.player.userData.gripError||0).toFixed(4),maxGripError:+maxGripError.toFixed(4),frames,events,errors})}`;}
$('weapon').onchange=$('partner').onchange=$('skin').onchange=$('reset').onclick=setup;
$('attack').onclick=()=>advance(1/60,{firing:true,aim:aim()});
$('reload').onclick=()=>{sim.player.equipped.forEach((k,i)=>sim.player.magazines[slotKey(sim.player.equipped,k,i)]=0);advance(1/60,{reload:true});};
$('step').onclick=()=>{for(let i=0;i<3;i++)advance(1/60);};
$('motion').onclick=()=>{end=sim.time+8;started=sim.time;reloaded=false;frames=0;wallStart=performance.now();};
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(end){const age=sim.time-started;frames++;const reload=age>4&&!reloaded;if(reload)reloaded=true;advance(dt,{x:age<1.5?.5:age<3?-.5:0,z:age>=1.5&&age<3?-.25:0,firing:age<4||age>6,reload,aim:aim(),dash:age>=7&&age-dt<7});if(sim.time>=end){end=0;report();$('report').textContent+=`\nMeasured ${Math.round(frames*1000/(performance.now()-wallStart))} fps`;}}requestAnimationFrame(loop);}
setup();requestAnimationFrame(loop);
