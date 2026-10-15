import {World} from '../src/rebuild/World.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {generateMap} from '../src/rebuild/Map.js';
import {WEAPONS} from '../src/rebuild/config.js';
import {appearanceSignature} from '../src/rebuild/Customization.js';
import {ARMOUR} from '../src/rebuild/RPG.js';
const $=id=>document.getElementById(id),types=['walker','runner','brute','spitter','armored','volatile'];
for(const [key,w]of Object.entries(WEAPONS))$('weapon').append(new Option(w.name,key));$('weapon').value='carbine';
const query=new URLSearchParams(location.search);
for(const id of ['survivor','enemy','weapon','offhand','armour','view','appearance','facing','helmet','motion']){const value=query.get(id);if(value!==null&&[...$(id).options].some(o=>o.value===value))$(id).value=value;}
let world,sim,paused=false,last=performance.now(),stamp=0;
function setup(){
 world?.destroy();const layout=generateMap(20261015,0);layout.cover=[];layout.buildings=[];layout.facades=[];
 sim=new Simulation({seed:400,layout,progression:'testing'});sim.start($('weapon').value);sim.toSpawn=999;sim.spawnTimer=99999;sim.events=[];
 Object.assign(sim.player,{x:0,z:0,angle:0,traversal:'campaign',skin:$('survivor').value,invulnerable:99999,appearance:$('appearance').value==='custom'?{palette:'arctic',hair:'mohawk',headwear:'none'}:{}});
 sim.player.appearance.hideHelmet=$('helmet').value;
 sim.player.appearanceKey=appearanceSignature(sim.player.skin,sim.player.appearance);
 const family=$('armour').value;sim.player.armour={};if(family)for(const slot of ['head','chest','legs']){const item=Object.values(ARMOUR).find(a=>a.family===family&&a.slot===slot&&a.tier===2);if(item)sim.player.armour[slot]=item.id;}
 sim.setLoadout([$('weapon').value,...($('offhand').value?[$('offhand').value]:[])]);
 const enemy=$('enemy').value;for(const [i,type]of (enemy==='all'?types:enemy==='none'?[]:[enemy]).entries()){const e=sim.spawnEnemy(type,enemy==='all'?(i-2.5)*2.2:0,enemy==='all'?-4:-2.5);e.health=e.maxHealth=100000;e.speed=0;e.attack=9999;}
 const view=$('view').value;world=new World($('game'),{quality:'high',lightingDetail:'high',gore:true,goreLevel:5,viewMode:view==='studio'?'diorama':view},0,layout);world.applySettings(world.settings);
 if(view==='studio'){world.portrait=$('enemy').value==='all'?17:6;world.inspectionTarget={x:0,z:$('enemy').value==='none'?0:-1};}
 world.focus.set(0,0,0);world.update(sim,0);last=performance.now();report();
}
function report(){let skinned=0,meshes=0;world.player.traverse(o=>{if(o.isSkinnedMesh)skinned++;if(o.isMesh)meshes++;});const p=sim.player;
 $('report').textContent=JSON.stringify({skin:p.skin,detailedStatus:world.player.userData.detailedStatus,detailedModel:world.player.userData.detailedModel,lod:world.player.userData.detailedLOD,appearance:p.appearance,weapon:p.equipped,armour:p.armour,hands:{mode:world.viewRig.mode,active:world.viewRig.active,visible:world.viewRig.hands?.visible,sources:world.viewRig.sources?.length,position:world.viewRig.hands?.position.toArray(),scale:world.viewRig.hands?.scale.toArray(),cameraMask:world.viewRig.camera.layers.mask},motion:$('motion').value,time:+sim.time.toFixed(2),paused,skinnedMeshes:skinned,meshes,playerY:p.y||0,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,geometries:world.renderer.info.memory.geometries,textures:world.renderer.info.memory.textures,gripError:world.player.userData.gripError??null,enemies:sim.enemies.length,crawlers:sim.enemies.filter(e=>e.crawling).length,corpses:world.corpses.length},null,1);
}
for(const id of ['survivor','enemy','weapon','offhand','armour','view','appearance','facing','helmet'])$(id).onchange=setup;
$('reset').onclick=setup;$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));report();};
$('reload').onclick=()=>{for(const key of Object.keys(sim.player.magazines))sim.player.magazines[key]=0;sim.reload(sim.player.weapon);};
$('crawl').onclick=()=>{for(const e of sim.enemies){e.crawling=true;e.speed=.3;}};
$('kill').onclick=()=>{for(const e of [...sim.enemies])sim.damageEnemy(e,999999,0,-2,{kind:'ballistic',weapon:sim.player.weapon,headshot:true});};
$('hide').onclick=()=>{const nav=document.querySelector('nav'),hide=!nav.dataset.compact;nav.dataset.compact=hide?'yes':'';for(const e of nav.children)if(e.id!=='hide')e.hidden=hide;$('hide').textContent=hide?'Show controls':'Hide controls';};
function loop(now){const dt=paused?0:Math.min(.033,(now-last)/1000);last=now;const motion=$('motion').value;
 if(dt)sim.update(dt,{auto:false,firing:motion==='fire',x:motion==='walk'?Math.sin(sim.time):0,z:motion==='walk'?Math.cos(sim.time)*.3:0,dash:motion==='dodge'&&sim.time%2<dt,jump:motion==='jump'&&sim.time%2<dt,aim:{x:0,z:$('facing').value==='front'?6:-6}});
 for(const event of sim.events)world.onEvent(event);sim.events=[];world.update(sim,dt);if(now-stamp>400){report();stamp=now;}requestAnimationFrame(loop);
}
window.addEventListener('resize',()=>world?.resize());
window.addEventListener('pagehide',()=>world?.destroy());setup();requestAnimationFrame(loop);
