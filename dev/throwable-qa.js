import {Simulation} from '../src/rebuild/Simulation.js';
import {World} from '../src/rebuild/World.js';
import {generateCity} from '../src/rebuild/City.js';

if(!import.meta.env.DEV)throw new Error('The throwable range is a local development fixture.');
const $=id=>document.getElementById(id),settings={quality:'balanced',gore:true,goreLevel:4,reducedMotion:false,viewMode:'diorama',dayCycle:'day',weatherMode:'clear',populationDetail:'off',environmentDetail:'minimal',foliageDetail:'sparse'};
let scene='wall',sim,world,projectile,events=[],contacts=[],running=false,freezeAt=Infinity,firstBurst=null;
const round=n=>Number.isFinite(n)?Number(n.toFixed(3)):null;
const coords=o=>o?{x:round(o.x),y:round(o.y),z:round(o.z)}:null;
function setup(){
 running=false;world?.destroy();events=[];contacts=[];firstBurst=null;freezeAt=Infinity;projectile=null;
 const layout=generateCity(442);Object.assign(layout,{bounds:{minX:-16,maxX:16,minZ:-18,maxZ:12},boundary:[{x:-16,z:-18},{x:16,z:-18},{x:16,z:12},{x:-16,z:12}],roads:[],nodes:[],parcels:[],cover:[],facades:[],landmarks:[],spawnPoints:[],bridges:[],water:[],waterObstacles:[],buildings:[],streetPoints:[{x:-13,z:8,angle:0,width:4}]});
 if(scene==='wall'||scene==='molotov')layout.buildings=[{id:'qa-building',kind:'building',primary:false,x:0,z:-4,w:8,d:2,h:7,color:0x928771,material:'brick',shop:'CONTACT RANGE',style:'warehouse'}];
 if(scene==='low')layout.cover=[{x:0,z:-4,w:4,d:1.1,h:1.1,kind:'barrier'}];
 if(scene==='water'||scene==='wet-fire')layout.water=[{x:0,z:-10,w:11,d:7,feature:'lake',shape:'ellipse'}];
 sim=new Simulation({seed:442,layout,mode:'city',environment:settings});sim.start('carbine');sim.player.x=sim.player.z=0;sim.player.angle=Math.PI;sim.player.invulnerable=999;sim.toSpawn=999;sim.spawnTimer=99999;sim.events=[];
 sim.player.throwable=['molotov','wet-fire'].includes(scene)?'molotov':'frag';
 world=new World($('game'),settings,0,layout);world.applySettings(settings);world.portrait=20;world.inspectionTarget={x:0,z:-4};world.focus.set(0,0,-4);world.scene.updateMatrixWorld(true);world.update(sim,0);
 document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===scene)));
 // Use the same input path as a grenade button in a normal expedition.
 step(1/120,true);running=true;report();
}
function step(dt,throwNow=false){
 sim.update(dt,{auto:false,grenade:throwNow,aim:{x:0,z:-10}});
 projectile||=sim.hazards.find(h=>h.thrown);
 const hit=projectile?.contact;if(hit&&!contacts.some(c=>c.id===hit.id)){contacts.push({...hit,at:sim.time});if($('freeze').value==='contact')freezeAt=Math.min(freezeAt,sim.time+.03);}
 for(const e of sim.events){events.push({...e});world.onEvent(e);if(!firstBurst&&['explosion','ordnance-burst','steam'].includes(e.type)){firstBurst={...e,at:sim.time};if($('freeze').value==='burst')freezeAt=Math.min(freezeAt,sim.time+.08);}}
 sim.events=[];world.update(sim,dt);
 if($('freeze').value==='flight')freezeAt=.18;if($('freeze').value==='end')freezeAt=2;
 if(sim.time>=freezeAt||sim.time>=2)running=false;
}
function report(){
 const counts={};for(const e of events)counts[e.type]=(counts[e.type]||0)+1;
 $('report').textContent=JSON.stringify({scene,status:running?'RUNNING':'FROZEN',time:round(sim.time),throwable:sim.player.throwable,projectile:coords(projectile?.projectile),velocity:projectile?.projectile?{x:round(projectile.projectile.vx),y:round(projectile.projectile.vy),z:round(projectile.projectile.vz)}:null,contacts:contacts.map(c=>({id:c.id||'ground',at:round(c.at),...coords(c)})),burst:firstBurst?{type:firstBurst.type,at:round(firstBurst.at),...coords(firstBurst)}:null,burningSurfaceCells:sim.props.reduce((n,p)=>n+(p.surfaces||[]).filter(c=>c.burning>0).length,0),waterParticles:world.effects.filter(e=>e.kind==='water').length,activeEffects:world.effects.length,events:counts},null,2);
}
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>{scene=b.dataset.scene;setup();};
$('replay').onclick=setup;$('freeze').onchange=setup;$('step').onclick=()=>{running=false;for(let i=0;i<12;i++)step(1/120);report();};
window.addEventListener('resize',()=>{world.resize();world.update(sim,0);report();});
function frame(){requestAnimationFrame(frame);if(running){step(1/120);step(1/120);report();}else if(world.requestRender){world.requestRender=false;world.update(sim,0);report();}}
setup();requestAnimationFrame(frame);
