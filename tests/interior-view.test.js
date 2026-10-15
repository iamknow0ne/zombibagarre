import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {InteriorView,InteriorDoors} from '../src/rebuild/InteriorView.js';
import {World} from '../src/rebuild/World.js';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
const plans=[{id:'workshop',template:'workshop-v1',bounds:{minX:-6,maxX:6,minZ:-5,maxZ:5},obstacles:[{id:'bench',x:-3,z:-1.8,w:3,d:1.3,h:.95}],objects:[{id:'mara',type:'merchant',x:-2,z:-.2},{id:'exit',type:'exit',x:0,z:4.2}]},{id:'apartment',template:'apartment-v1',bounds:{minX:-5,maxX:5,minZ:-6,maxZ:5},obstacles:[{id:'partition',x:1,z:0,w:8,d:.35,h:2.5}],objects:[{id:'tool-case',type:'case',x:3,z:-4.1},{id:'exit',type:'exit',x:0,z:4.2}]}];
function rig(){const hero=new T.Group(),body=new T.Group();hero.add(body);const limb=name=>{const g=new T.Group(),joint=new T.Group();g.userData[name]=joint;g.add(joint);body.add(g);return g;};hero.userData={body,arms:[limb('elbow'),limb('elbow')],legs:[limb('knee'),limb('knee')],tails:[]};return hero;}
function fixture(real=false){let renders=0;const world={scene:new T.Scene(),renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})},info:{reset(){}},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);renders++;}},character:(type,unused,skin,appearance)=>real?buildSurvivor(skin,appearance):rig(),removeDynamic:World.prototype.removeDynamic};const sim={state:'interior',player:{skin:'scout',appearance:{},armour:{},dye:'olive'},interior:{plan:plans[0],pose:{x:0,z:3.6,angle:Math.PI,moveX:0,moveZ:0}},interiorState:{collected:[]}};return{world,sim,view:new InteriorView(world),renders:()=>renders};}
test('room survivors reflect appearance and equipment without combat weapons; movement and pause stay local',()=>{
 const {view,sim}=fixture(true);view.update(sim,1/60,390/844);const hero=view.hero;assert.equal(hero.userData.skin,'scout');assert.equal(hero.userData.guns,undefined);assert.equal(hero.userData.meleeMesh,undefined);assert.equal(hero.position.z,3.6);
 sim.player.armour={chest:'warden-chest-1'};view.update(sim,1/60,390/844);assert.equal(view.hero,hero);assert.ok(hero.userData.armourParts.length>0);sim.interior.pose.moveX=4;for(let i=0;i<20;i++)view.update(sim,1/60,390/844);assert.ok(hero.userData.motion.pose.walk>.5);const phase=hero.userData.motion.phase,clock=view.clock;sim.state='paused';view.update(sim,2,390/844);assert.equal(view.clock,clock);assert.equal(hero.userData.motion.phase,phase);
 sim.player.appearance={palette:'arctic'};view.update(sim,0,390/844);assert.notEqual(view.hero,hero);assert.equal(hero.parent,null);assert.equal(view.hero.userData.custom.palette,'arctic');view.dispose();
});
test('room camera keeps interaction targets on screen in portrait and landscape; collected cases disappear',()=>{
 const {view,sim}=fixture();sim.interior.plan=plans[1];for(const aspect of [320/740,390/844,844/390,16/9]){view.update(sim,1/60,aspect);for(const o of plans[1].objects){const p=view.screenPoint(o.x,.9,o.z);assert.equal(p.visible,true);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}}
 assert.equal(view.objects.get('tool-case').visible,true);sim.interiorState.collected.push('apartment:tool-case');view.update(sim,0,16/9);assert.equal(view.objects.get('tool-case').visible,false);view.dispose();
});
test('50 alternating room visits dispose replaced resources and retain only the current room',()=>{
 const {view,sim}=fixture();let observed=0,disposed=0;const watch=()=>{for(const resource of [...view.geometries.values(),...view.materials.values(),...view.batches]){observed++;resource.addEventListener('dispose',()=>disposed++);}};const sizes=new Map();
 for(let i=0;i<50;i++){sim.interior.plan=plans[i%2];view.update(sim,1/60,16/9);watch();let count=0;view.scene.traverse(()=>count++);if(sizes.has(sim.interior.plan))assert.equal(count,sizes.get(sim.interior.plan));else sizes.set(sim.interior.plan,count);assert.ok(view.room.children.length<45,'architecture is batched instead of hundreds of floor draws');const room=view.room;view.leave();view.update(sim,0,16/9);assert.equal(view.room,room,'same-room return reuses scene resources');view.leave();}
 view.dispose();assert.equal(disposed,observed);assert.equal(view.scene.children.length,0);assert.equal(view.batches.size,0);assert.equal(view.materials.size,0);assert.equal(view.geometries.size,0);
});
test('World indoor rendering bypasses every exterior tick in active and paused sessions',()=>{
 let clears=0,renders=0;const world=Object.create(World.prototype),camera={};Object.assign(world,{feedback:{clear(){clears++;}},interiorView:{active:false,camera,update(){this.active=true;renders++;}},viewRig:{active:true},aspect:1});Object.defineProperty(world,'weatherState',{set(){throw new Error('Exterior update ran');}});
 for(const state of ['interior','paused','trade'])world.update({interior:{plan:plans[0]},state},1/60);assert.equal(renders,3);assert.equal(clears,1);assert.equal(world.camera,camera);assert.equal(world.viewRig.active,false);
});
test('apartment entrance belongs to a live host and manifest replacement never duplicates markers',()=>{
 const scene=new T.Scene(),doors=new InteriorDoors(scene),p={template:'apartment-v1',buildingId:'host',door:{x:10,z:8,nx:0,nz:1}},s={player:{x:10,z:8},props:[{id:'host',health:100}],interiorState:{manifest:[p]}};doors.update(s);assert.equal(doors.entries.length,1);assert.equal(doors.entries[0].group.visible,true);s.props[0].health=0;doors.update(s);assert.equal(doors.entries[0].group.visible,false);s.interiorState.manifest=[{...p}];doors.update(s);assert.equal(doors.root.children.length,1);doors.dispose();assert.equal(scene.children.length,0);
});

test('interior poses refresh detailed hero and merchant after animation with flat planted boots',()=>{
 const {view,sim,world}=fixture(true),updates=[];world.detailedSurvivors={update(hero){updates.push(hero);},selectDetail(){},release(){}};
 sim.interior.pose.moveX=3;for(let frame=0;frame<40;frame++)view.update(sim,1/60,16/9);
 assert.ok(updates.includes(view.hero));assert.ok(updates.includes(view.mara));
 for(const actor of [view.hero,view.mara])for(const leg of actor.userData.legs){const q=actor.userData.body.quaternion.clone().multiply(leg.quaternion).multiply(leg.userData.knee.quaternion).multiply(leg.userData.ankle.quaternion);assert.ok(q.angleTo(new T.Quaternion())<1e-6);}
 view.dispose();
});
