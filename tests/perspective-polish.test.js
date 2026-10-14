import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ViewRig,cameraClearance} from '../src/rebuild/ViewRig.js';
import {perspectiveSettings,PERSPECTIVE_DEFAULTS} from '../src/rebuild/PerspectiveSettings.js';
import {Simulation} from '../src/rebuild/Simulation.js';
import {Input} from '../src/rebuild/Input.js';
import {stepCharacterMotion} from '../src/rebuild/CharacterMotion.js';
import {controlSettings,BINDINGS,rebind} from '../src/rebuild/ControllerConfig.js';
const simple=()=>({player:{x:0,z:0,angle:0,weapon:'carbine'},time:0,props:[],obstacles:[],enemies:[]});
test('camera settings validate corrupt values and preserve comfort choices',()=>{assert.deepEqual(perspectiveSettings({viewFov:NaN,lookSensitivity:'fast',cameraMotion:Infinity,shoulder:'bad'}),PERSPECTIVE_DEFAULTS);assert.equal(perspectiveSettings({viewFov:120}).viewFov,90);assert.equal(perspectiveSettings({cameraMotion:0,shoulder:'left'}).cameraMotion,0);});
test('zero-angle spawn faces forward; precision zoom eases at matching wall-clock rates',()=>{const a=new ViewRig(),b=new ViewRig(),s=simple();a.setMode('first');b.setMode('first');a.update(s,1,0);assert.equal(a.yaw,0);s.player.aiming=true;for(let i=0;i<60;i++)a.update(s,1,1/60);for(let i=0;i<30;i++)b.update(s,1,1/30);assert.ok(Math.abs(a.camera.fov-b.camera.fov)<1e-8);assert.ok(a.camera.fov<56);s.player.weapon='katana';for(let i=0;i<60;i++)a.update(s,1,1/60);assert.ok(a.camera.fov>69.99);});
test('chase camera blocks on non-building cover and vertical approaches, then eases back out',()=>{const box={kind:'crate',x:0,z:0,w:3,d:3,h:2,health:5};assert.ok(cameraClearance({x:0,y:6,z:0},{x:0,y:1,z:0},[box])<.8);assert.equal(cameraClearance({x:0,y:6,z:0},{x:0,y:1,z:0},[{...box,health:0}]),1);const s=simple(),rig=new ViewRig();rig.setMode('third');s.obstacles=[{...box,z:-2,h:5}];rig.update(s,1,1/60);const close=rig.distance;s.obstacles=[];rig.update(s,1,1/60);assert.ok(rig.distance>close&&rig.distance<4.5);});
test('near-camera avatar fade does not mutate shared materials and restores on mode change',()=>{const rig=new ViewRig(),shared=new T.MeshStandardMaterial(),group=new T.Group(),a=new T.Mesh(new T.BoxGeometry(),shared),b=new T.Mesh(new T.BoxGeometry(),shared);group.add(a);rig.active=true;rig.mode='third';rig.distance=.5;rig.fadeAvatar(group);assert.ok(a.material.opacity<.2);assert.equal(b.material.opacity,1);rig.mode='first';rig.fadeAvatar(group);assert.equal(a.material.opacity,1);assert.equal(a.material.depthWrite,true);});
test('precision toggle persists, held aim combines with it, and vehicles cancel both',()=>{const input=Object.create(Input.prototype),rig=new ViewRig();rig.active=true;Object.assign(input,{keys:new Set(),once:{toggleAim:true},source:'touch',stick:{x:0,y:0},pointer:{active:false},settings:{}});const s=simple(),world={viewRig:rig};assert.equal(input.consume(world,false,s).aiming,true);assert.equal(input.consume(world,false,s).aiming,true);input.once.toggleAim=true;assert.equal(input.consume(world,false,s).aiming,false);input.aimHeld=true;assert.equal(input.consume(world,false,s).aiming,true);s.player.vehicleId='car';s.props=[{id:'car',angle:0}];assert.equal(input.consume(world,false,s).aiming,false);assert.equal(input.aimHeld,false);});
test('precision aim lowers movement and bullet dispersion without weakening damage',()=>{const make=()=>{const s=new Simulation({seed:8});s.start('carbine');s.props=[];s.obstacles=[];s.player.x=s.player.z=0;s.random=()=>.8;return s;};const hip=make(),aim=make();hip.update(1/60,{auto:false,x:1});aim.update(1/60,{auto:false,x:1,aiming:true});assert.ok(aim.player.x<hip.player.x);const target={x:0,y:1.1,z:20,perspective:true};hip.player.x=aim.player.x=0;hip.fireWeapon('carbine',target);aim.fireWeapon('carbine',target);const deviation=b=>Math.abs(Math.atan2(b.vx,b.vz)-Math.atan2(target.x-b.x,target.z-b.z));assert.ok(deviation(aim.bullets[0])<deviation(hip.bullets[0]));assert.equal(hip.bullets[0].damage,aim.bullets[0].damage);});
test('animation direction blends reversals while controls stay immediate; pause freezes pose',()=>{const cache={},state={x:0,z:0,moveX:0,moveZ:3,angle:0,aiming:false};for(let i=0;i<30;i++)stepCharacterMotion(cache,state,1/60,{player:true});state.moveZ=-3;state.angle=.2;state.aiming=true;const pose=stepCharacterMotion(cache,state,1/60,{player:true});assert.ok(pose.forward<0&&pose.smoothForward>0);assert.ok(pose.turn>0&&pose.brace>0&&pose.brace<1);assert.equal(stepCharacterMotion(cache,state,0,{player:true}),pose);});
test('adding precision aim preserves custom legacy controller bindings without duplicates',()=>{const old=rebind(BINDINGS,'grenade',13);delete old.aim;const migrated=controlSettings({bindings:old}).bindings;for(const [key,value]of Object.entries(old))assert.equal(migrated[key],value);assert.equal(new Set(Object.values(migrated)).size,Object.keys(BINDINGS).length);});
test('mouse aim and fire chords release independently and clear on focus loss',()=>{const i=Object.create(Input.prototype);Object.assign(i,{perspective:true,keys:new Set()});i.mouseButton(2,true);i.mouseButton(0,true);assert.equal(i.aimHeld,true);assert.equal(i.firing,true);i.mouseButton(0,false);assert.equal(i.aimHeld,true);assert.equal(i.firing,false);i.mouseButton(2,false);assert.equal(i.aimHeld,false);i.mouseButton(0,true);i.clear();assert.equal(i.firing,false);assert.equal(i.aimHeld,false);});
test('first-person rigs exclude shoulder armour and scale down in narrow portrait viewports',()=>{const rig=new ViewRig(),p=new T.Group(),arm=new T.Group(),shoulder=new T.Group(),elbow=new T.Group(),forearm=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());arm.add(shoulder,elbow);elbow.add(forearm);arm.userData.elbow=elbow;p.add(arm);p.userData.arms=[arm];rig.active=true;rig.mode='first';rig.camera.aspect=16/9;const sim={player:{equipped:['carbine']},state:'playing'},scene=new T.Scene();rig.syncHands(p,sim,scene);const landscape=rig.hands.scale.x;assert.ok(!rig.pairs.some(([source])=>source===shoulder));assert.ok(rig.pairs.some(([source])=>source===forearm));rig.camera.aspect=390/844;rig.syncHands(p,sim,scene);assert.ok(rig.hands.scale.x<landscape*.7);assert.equal(shoulder.visible,true,'world character armour must remain visible');});

test('looking upward never puts the chase camera below the street, including while driving',()=>{
 for(const vehicle of [false,true]){const sim=simple(),rig=new ViewRig();rig.setMode('third');rig.pitch=-.95;
  if(vehicle){sim.player.vehicleId='car';sim.props=[{id:'car',kind:'car',x:0,z:0,w:2,d:4,health:100}];sim.obstacles=sim.props;}
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){sim.player.angle=angle;rig.ready=false;rig.update(sim,16/9,1/60);assert.ok(rig.camera.position.y>=.28-1e-9);const direction=new T.Vector3();rig.camera.getWorldDirection(direction);assert.ok(direction.y>0,'upward free look must remain available');}
 }
 const sim=simple(),rig=new ViewRig();sim.player.y=12;rig.setMode('third');rig.pitch=-.95;rig.update(sim,16/9,1/60);assert.ok(rig.camera.position.y>10&&rig.camera.position.y<sim.player.y,'an elevated camera can still descend behind the player');
 rig.setMode('first');rig.update(sim,16/9,1/60);assert.equal(rig.camera.position.y,13.55);
});

test('weapon-overlay render errors restore the world clear state',()=>{
 const rig=new ViewRig();rig.hands={visible:true};const renderer={autoClear:true,clearDepth(){},render(){throw Error('context lost');}};
 assert.throws(()=>rig.renderHands(renderer),/context lost/);assert.equal(renderer.autoClear,true);
 renderer.autoClear=false;assert.throws(()=>rig.renderHands(renderer),/context lost/);assert.equal(renderer.autoClear,false);
});

test('TPS turns resolve the current shoulder origin before shooting, including elevated enemies',()=>{
 for(const height of [0,7]){
  const sim=simple(),rig=new ViewRig(),reference=new ViewRig();sim.player.y=height;
  for(const view of [rig,reference]){view.setMode('third');view.update(sim,16/9,1/60);view.look(150,0);}
  reference.update(sim,16/9,0);const direction=new T.Vector3();reference.camera.getWorldDirection(direction);const point=reference.camera.position.clone().addScaledVector(direction,15);
  sim.enemies=[{id:'crosshair-enemy',x:point.x,y:point.y-.9,z:point.z,radius:.4,health:100}];
  const hit=rig.aim(sim.player,sim);assert.equal(hit.targetId,'crosshair-enemy');assert.ok(rig.camera.position.distanceTo(reference.camera.position)<1e-9);assert.ok(hit.y>=sim.enemies[0].y&&hit.y<=sim.enemies[0].y+1.85);
  // An intervening wall still wins; syncing the camera must not bypass cover.
  sim.obstacles=[{x:(rig.camera.position.x+point.x)/2,y:height,z:(rig.camera.position.z+point.z)/2,w:2,d:2,h:5,health:100}];assert.equal(rig.aim(sim.player,sim).targetId,null);
 }
});
test('FPS aiming follows a newly elevated pose before render without advancing paused motion',()=>{
 const sim=simple(),rig=new ViewRig();rig.setMode('first');rig.update(sim,16/9,1/60);sim.player.aiming=true;rig.look(13,-20);const before={zoom:rig.aimBlend,swayX:rig.swayX,swayY:rig.swayY,pitch:rig.pitch,yaw:rig.yaw};
 Object.assign(sim.player,{x:8,y:6,z:-3});rig.aim(sim.player,sim);assert.equal(rig.camera.position.x,8);assert.equal(rig.camera.position.y,7.55);assert.equal(rig.camera.position.z,-3);assert.deepEqual({zoom:rig.aimBlend,swayX:rig.swayX,swayY:rig.swayY,pitch:rig.pitch,yaw:rig.yaw},before);
});
test('aim synchronization retracts the camera out of newly encountered cover immediately',()=>{
 const sim=simple(),rig=new ViewRig();rig.setMode('third');rig.update(sim,16/9,1/60);const open=rig.distance;sim.obstacles=[{x:0,z:-2,w:3,d:1,h:5,health:100}];rig.aim(sim.player,sim);assert.ok(rig.distance<open*.5);const close=rig.distance;sim.obstacles=[];rig.aim(sim.player,sim);assert.equal(rig.distance,close,'input sampling must not advance outward easing');rig.update(sim,16/9,1/60);assert.ok(rig.distance>close&&rig.distance<open);
});
test('camera fading restores source materials and disposes temporary clones across repeated cover visits',()=>{
 const rig=new ViewRig(),root=new T.Group(),original=new T.MeshStandardMaterial({transparent:true,opacity:.7,depthWrite:false}),solid=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),[original,solid]);root.add(mesh);rig.active=true;rig.mode='third';let disposed=0;
 for(let n=0;n<50;n++){rig.distance=.4;rig.fadeAvatar(root);assert.notEqual(mesh.material[0],original);assert.equal(original.opacity,.7);assert.equal(solid.opacity,1);for(const material of mesh.material)material.addEventListener('dispose',()=>disposed++);rig.distance=5;rig.fadeAvatar(root);assert.equal(mesh.material[0],original);assert.equal(mesh.material[1],solid);assert.equal(mesh.userData.cameraMaterials,undefined);assert.equal(original.depthWrite,false);}
 assert.equal(disposed,100);assert.equal(root.userData.cameraFaded,false);
});

test('the first look delta survives camera initialization and a mode switch clears stale pending input',()=>{
 const sim=simple(),rig=new ViewRig();sim.player.angle=.7;rig.setMode('third');rig.look(40,0);rig.aim(sim.player,sim);assert.ok(Math.abs(rig.yaw-.6)<1e-12);rig.aim(sim.player,sim);assert.ok(Math.abs(rig.yaw-.6)<1e-12,'initial look is consumed only once');
 rig.setMode('first');rig.look(20,0);rig.setMode('third');rig.aim(sim.player,sim);assert.equal(rig.yaw,.7);
});
