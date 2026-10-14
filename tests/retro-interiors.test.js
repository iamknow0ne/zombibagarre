import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Simulation} from '../src/rebuild/Simulation.js';
import {beginInterior,endInterior,interiorInteraction,nearbyInteriorRecovery,retroConsoleStatus,initializeInteriors} from '../src/rebuild/Interiors.js';
import {InteriorView,InteriorDoors} from '../src/rebuild/InteriorView.js';
import {distance,pointBlocked} from '../src/rebuild/config.js';
import {waterAt} from '../src/rebuild/City.js';
import {World} from '../src/rebuild/World.js';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
const game=(seed=73,progression='hero')=>{const sim=new Simulation({seed,mode:'city',profile:{},progression});sim.start();sim.events=[];return sim;};
const retro=sim=>sim.interiorState.manifest.find(p=>p.template==='retro-room-v1');
function enter(sim){const plan=retro(sim);assert.ok(plan);Object.assign(sim.player,plan.door);assert.equal(beginInterior(sim,plan.id),true);sim.events=[];return plan;}
function walk(sim,x,z){for(let i=0;i<160&&distance(sim.interior.pose,{x,z})>.12;i++){const p=sim.interior.pose,d=distance(p,{x,z});sim.update(1/60,{x:(x-p.x)/d,z:(z-p.z)/d});}assert.ok(distance(sim.interior.pose,{x,z})<.13,`walk reached ${x},${z}`);}
test('retro room has deterministic separate host, clear door and actual city pedestrian route',()=>{
 for(const seed of [1,2,3,30,31,32,33,73,2026]){const sim=game(seed),p=retro(sim);assert.ok(p,`seed ${seed}`);assert.equal(new Set(sim.interiorState.manifest.map(p=>p.buildingId)).size,3);const manifest=JSON.stringify(sim.interiorState.manifest);initializeInteriors(sim);assert.equal(JSON.stringify(sim.interiorState.manifest),manifest);assert.equal(!!waterAt(sim.layout,p.door.x,p.door.z),false);assert.equal(pointBlocked(p.door.x,p.door.z,.65,sim.obstacles),false);
  const walker={x:0,z:3,radius:.4};let steps=0;while(distance(walker,p.door)>1.9&&steps++<2400){const aim=sim.blocked(walker,p.door,.44)?sim.navigate(walker,p.door):p.door;if(!aim)break;const d=distance(walker,aim);if(d>1e-8)sim.move(walker,(aim.x-walker.x)/d*Math.min(.3,d),(aim.z-walker.z)/d*Math.min(.3,d));}assert.ok(distance(walker,p.door)<2,`seed ${seed}: door route stuck ${distance(walker,p.door)}m away`);
 }
});
test('console can be approached using real room movement; locked, unlocked and dormant interactions stay explicit',()=>{
 const sim=game(),plan=enter(sim),before={hp:sim.player.health,ammo:{...sim.player.magazines},time:sim.time,xp:sim.profile.xp};
 walk(sim,-2.4,3.6);walk(sim,-2.4,-2);walk(sim,0,-2.65);assert.equal(interiorInteraction(sim)?.consoleId,'snes');
 sim.update(1/60,{interact:true});assert.equal(sim.events.at(-1).type,'rpg-notice');assert.match(sim.events.at(-1).message,/level 3/);assert.equal(sim.events.some(e=>e.type==='interior-console'),false);
 sim.profile.xp=419;assert.equal(retroConsoleStatus(sim,'snes').unlocked,false);sim.profile.xp=420;sim.update(1/60,{interact:true});assert.deepEqual(sim.events.at(-1),{type:'interior-console',interiorId:plan.id,objectId:'console-snes',consoleId:'snes'});
 walk(sim,-4.35,-2.65);sim.update(1/60,{interact:true});assert.equal(sim.events.at(-1).type,'rpg-notice');assert.match(sim.events.at(-1).message,/not playable/);assert.equal(retroConsoleStatus(sim,'ps1').available,false);assert.equal(retroConsoleStatus(sim,'genesis').unlocked,false);assert.equal(sim.player.health,before.hp);assert.deepEqual(sim.player.magazines,before.ammo);assert.equal(sim.time,before.time);
 sim.pause();const pose={...sim.interior.pose},count=sim.events.length;sim.update(1,{x:1,interact:true,grenade:true});assert.deepEqual(sim.interior.pose,pose);assert.equal(sim.events.length,count);sim.resume();
 walk(sim,-2.4,-2);walk(sim,-2.4,3.6);walk(sim,0,3.6);assert.equal(endInterior(sim),true);assert.equal(sim.profile.xp,420);
});
test('sandbox bypass applies only to implemented SNES, and unlock survives fresh expeditions',()=>{
 const sim=game(73,'sandbox');assert.equal(retroConsoleStatus(sim,'snes').unlocked,true);for(const id of ['ps1','genesis','unknown'])assert.equal(retroConsoleStatus(sim,id).unlocked,false);sim.profile.xp=420;const fresh=new Simulation({seed:31,mode:'city',profile:sim.profile,progression:'hero'});fresh.start();assert.equal(retroConsoleStatus(fresh,'snes').unlocked,true);assert.deepEqual(fresh.interiorState.visited,[]);
});
test('destroyed retro host never becomes Mara or a tool case and occupants retain safe exit',()=>{
 const sim=game(),plan=enter(sim);sim.props.find(p=>p.id===plan.buildingId).health=0;assert.equal(endInterior(sim),true);assert.equal(nearbyInteriorRecovery(sim),null);assert.equal(sim.interiorState.collected.length,0);assert.equal(beginInterior(sim,plan.id),false);
});
test('retro architecture has real console meshes, dormant screen distinction and disposable owned resources',()=>{
 const sim=game(),plan=enter(sim),world={scene:new T.Scene(),renderer:{info:{reset(){}},render(){},domElement:{getBoundingClientRect:()=>({width:390,height:844,left:0,top:0})}},character:(type,unused,skin,appearance)=>buildSurvivor(skin,appearance),removeDynamic:World.prototype.removeDynamic},view=new InteriorView(world);
 view.update(sim,1/60,390/844);assert.equal(view.objects.size,4);const snes=view.objects.get('console-snes');assert.ok(snes.children.length>10);assert.ok(snes.children.length<35,'static console details batched by material');assert.equal(snes.userData.picture.visible,false);assert.ok(view.batches.size>0);sim.profile.xp=420;view.update(sim,1/60,390/844);assert.equal(snes.userData.picture.visible,true);for(const id of ['console-ps1','console-genesis'])assert.equal(view.objects.get(id).userData.picture,undefined);
 for(const aspect of [320/740,844/390,16/9]){view.update(sim,0,aspect);for(const object of plan.objects)assert.equal(view.screenPoint(object.x,.9,object.z).visible,true);}
 let resources=0,disposed=0;for(const value of [...view.materials.values(),...view.geometries.values(),...view.batches]){resources++;value.addEventListener('dispose',()=>disposed++);}view.dispose();assert.equal(disposed,resources);assert.equal(view.scene.children.length,0);
 const scene=new T.Scene(),doors=new InteriorDoors(scene);doors.update(sim);const entry=doors.entries.find(e=>e.plan.id===plan.id);assert.ok(entry);assert.equal(entry.group.visible,true);sim.props.find(p=>p.id===plan.buildingId).health=0;doors.update(sim);assert.equal(entry.group.visible,false);doors.dispose();assert.equal(scene.children.length,0);
});
