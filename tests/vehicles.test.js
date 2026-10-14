import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {VEHICLES,vehiclePlan,vehicleSpec,vehicleOverlaps,assistedDrive,stepVehicle} from '../src/rebuild/Vehicles.js';
import {generateCity} from '../src/rebuild/City.js';
import {Input} from '../src/rebuild/Input.js';
import {controlSettings} from '../src/rebuild/ControllerConfig.js';
import {sampleGamepad} from '../src/rebuild/Gamepad.js';
const drive=(type='sedan',extra=[])=>{const layout={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},cover:[vehiclePlan(type,0,0),...extra],spawnPoints:[]};const s=new Simulation({layout});s.start();s.toSpawn=999;s.spawnTimer=1e8;s.interactVehicle();s.events=[];return s;};
const tick=(s,n,control)=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,drive:control});};
test('eight real vehicle profiles populate seeds with distinct performance, dimensions and hulls',()=>{
 assert.equal(Object.keys(VEHICLES).length,8);for(let seed=0;seed<20;seed++)assert.equal(new Set(generateCity(seed).cover.filter(v=>v.driveable).map(v=>v.vehicleType)).size,8,`seed ${seed}`);
 const results={};for(const key of Object.keys(VEHICLES)){const s=drive(key),v=s.props[0];assert.equal(v.maxHealth,VEHICLES[key].health);tick(s,240,{throttle:1});results[key]=v.speed;assert.ok(v.speed>5&&v.speed<=VEHICLES[key].speed);}
 assert.ok(results.coupe>results.sedan&&results.sedan>results.armored);
});
test('analog throttle, reverse, service brake and handbrake behave predictably',()=>{
 const full=drive(),half=drive();tick(full,90,{throttle:1});tick(half,90,{throttle:.35});assert.ok(full.props[0].speed>half.props[0].speed*1.5);
 const v=full.props[0],at=full.player.z;tick(full,30,{brake:1});assert.ok(v.speed>=0);tick(full,90,{brake:1});assert.ok(v.speed<0);assert.ok(full.player.z>at-10);
 tick(full,70,{handbrake:true});assert.equal(v.speed,0);assert.ok(Math.hypot(v.vx,v.vz)<.01);
 const stoppedAngle=v.angle;tick(full,60,{steer:1,handbrake:true});assert.equal(v.angle,stoppedAngle);
 tick(full,90,{throttle:1});assert.ok(v.speed>0);const before=v.angle;tick(full,30,{throttle:1,steer:.6});assert.ok(v.angle>before);tick(full,90,{handbrake:true});assert.equal(v.speed,0);
});
test('steering reverses with reverse gear, centres smoothly and is stable across frame sizes',()=>{
 const run=dt=>{const v={vehicleType:'sedan',angle:0,speed:0};for(let i=0;i<Math.round(3/dt);i++){const m=stepVehicle(v,{throttle:1,steer:.3},dt);v.angle=m.angle;}return v;};
 const a=run(1/60),b=run(1/120);assert.ok(Math.abs(a.speed-b.speed)<.05);assert.ok(Math.abs(a.angle-b.angle)<.025);
 const s=drive(),v=s.props[0];tick(s,90,{brake:1,steer:.5});assert.ok(v.angle<0&&v.speed<0);const turn=v.steering;tick(s,45,{throttle:0});assert.ok(Math.abs(v.steering)<Math.abs(turn)*.01);
});
test('full vehicle body collides at speed, cannot rotate through walls and can reverse away',()=>{
 const wall={kind:'barrier',x:0,z:12,w:20,d:.3},s=drive('coupe',[wall]),v=s.props[0];tick(s,180,{throttle:1});assert.ok(v.z+VEHICLES.coupe.length/2<=wall.z-wall.d/2+.01);assert.ok(v.health<v.maxHealth);assert.ok(!vehicleOverlaps(v,wall));
 const at=v.z;tick(s,100,{brake:1});assert.ok(v.z<at-1);assert.ok(!vehicleOverlaps(v,wall));
 v.x=9;v.z=9;v.angle=0;v.speed=1;v.vx=0;v.vz=1;s.player.x=v.x;s.player.z=v.z;tick(s,120,{throttle:.2,steer:-1});assert.ok(!vehicleOverlaps(v,wall));
});
test('moving exit is blocked, stopped exit is safe and reverse ramming works',()=>{
 const s=drive(),v=s.props[0];tick(s,60,{throttle:1});assert.equal(s.interactVehicle(),false);assert.equal(s.player.vehicleId,v.id);tick(s,100,{handbrake:true});assert.equal(s.interactVehicle(),true);assert.equal(s.player.vehicleId,null);assert.ok(!vehicleOverlaps(v,{x:s.player.x,z:s.player.z,w:.8,d:.8}));
 const r=drive(),enemy=r.spawnEnemy('walker',0,-5);enemy.speed=0;tick(r,140,{brake:1});assert.ok(enemy.health<=0);
});
test('input gives vehicles analog pedals and steering while suppressing combat, touch has brake and reverse',()=>{
 const s=drive(),i=Object.create(Input.prototype);Object.assign(i,{settings:controlSettings({drivingStyle:'racing'}),source:'gamepad',keys:new Set(),once:{grenade:true,dash:true},stick:{x:0,y:0},pointer:{active:false},padGuard:false,pad:sampleGamepad({mapping:'standard',axes:[.6,0,0,0],buttons:Array.from({length:18},(_,j)=>({pressed:j===7,value:j===7?.45:0}))})});
 let out=i.consume({},true,s);assert.equal(out.drive.throttle,.45);assert.ok(out.drive.steer>0);assert.equal(out.grenade,false);assert.deepEqual(out.fireHands,[false,false]);
 i.source='keyboard';i.keys.add('KeyW');i.keys.add('KeyA');out=i.consume({},true,s);assert.equal(out.drive.throttle,1);assert.equal(out.drive.steer,-1);
 i.keys.clear();i.source='touch';i.stick={x:.4,y:-.4};out=i.consume({},true,s);assert.ok(out.drive.throttle>0);i.touchBrake=true;out=i.consume({},true,s);assert.equal(out.drive.handbrake,true);i.touchBrake=false;i.touchReverse=true;out=i.consume({},true,s);assert.equal(out.drive.brake,1);assert.equal(out.drive.throttle,0);i.clear();assert.equal(i.touchReverse,false);out=i.consume({},true,s);assert.equal(out.drive.handbrake,true);
 i.source='keyboard';i.settings.drivingStyle='assisted';i.keys.add('ShiftLeft');out=i.consume({},true,s);assert.equal(out.drive.brake,1);assert.equal(out.drive.handbrake,false);i.keys.clear();
 i.source='gamepad';i.padGuard=false;i.pad.move={x:0,y:0};i.pad.triggers=[.65,0];out=i.consume({},true,s);assert.equal(out.drive.brake,.65);assert.equal(out.drive.handbrake,false);
});

test('easy driving turns from rest, follows the requested heading, and releases to a short stop for every vehicle',()=>{
 for(const type of Object.keys(VEHICLES)){
  const v={vehicleType:type,angle:0,speed:0,x:0,z:0};
  const step=(x,z)=>{const m=stepVehicle(v,assistedDrive(v,x,z),1/60);v.angle=m.angle;v.x+=m.dx;v.z+=m.dz;};
  step(1,0);assert.ok(v.angle>0,`${type} can turn from rest`);
  for(let i=0;i<180;i++)step(1,0);assert.ok(Math.abs(v.angle-Math.PI/2)<.01);assert.ok(v.x>10&&Math.abs(v.z)<2,`${type} follows the stick without a wide loop`);
  assert.ok(v.speed<=18);const before={x:v.x,z:v.z};for(let i=0;i<45;i++)step(0,0);
  assert.equal(v.speed,0);assert.equal(v.vx,0);assert.equal(v.vz,0);assert.ok(Math.hypot(v.x-before.x,v.z-before.z)<6);
 }
});
test('easy driving slows for U turns and reverse follows screen direction without sideways drift',()=>{
 const v={vehicleType:'sedan',angle:0,speed:16,vx:0,vz:16};
 for(let i=0;i<30;i++){const m=stepVehicle(v,assistedDrive(v,0,-1),1/60);v.angle=m.angle;}assert.ok(v.speed<5);
 for(let i=0;i<150;i++){const m=stepVehicle(v,{...assistedDrive(v,-1,0),throttle:0,brake:1,handbrake:false},1/60);v.angle=m.angle;}
 assert.ok(v.speed<0&&v.vx>0);assert.ok(Math.abs(v.vz)<.05);assert.equal(v.slip,0);
});
test('easy driving retains swept collisions and can reverse away from a wall',()=>{
 const wall={kind:'barrier',x:0,z:12,w:20,d:.3},s=drive('coupe',[wall]),v=s.props[0];
 for(let i=0;i<180;i++)tick(s,1,assistedDrive(v,0,1));assert.ok(!vehicleOverlaps(v,wall));assert.ok(v.z<10);
 const before=v.z;for(let i=0;i<90;i++)tick(s,1,{...assistedDrive(v,0,0),brake:1,throttle:0,handbrake:false});assert.ok(v.z<before-2);assert.ok(!vehicleOverlaps(v,wall));
 assert.equal(controlSettings().drivingStyle,'assisted');assert.equal(controlSettings({drivingStyle:'racing'}).drivingStyle,'racing');
});

test('vehicle entry cannot cross walls and selects a reachable car instead',()=>{
 const layout={bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},cover:[vehiclePlan('sedan',3,0),vehiclePlan('coupe',-4,0),{kind:'barrier',x:1.5,z:0,w:.3,d:10}]};
 const s=new Simulation({layout});s.start();s.player.x=s.player.z=0;
 const blocked=s.props[0],reachable=s.props[1];reachable.health=0;s.obstacles=s.props.filter(p=>p.health>0);
 assert.equal(s.interactVehicle(),false);assert.equal(s.player.vehicleId,null);assert.equal(s.player.x,0);
 reachable.health=reachable.maxHealth;s.obstacles=s.props;assert.equal(s.interactVehicle(),true);assert.equal(s.player.vehicleId,reachable.id);assert.notEqual(s.player.vehicleId,blocked.id);
});

test('vehicle exit chooses a dry reachable side without crossing a thin wall',()=>{
 const s=drive(),v=s.props[0];
 // The default right-hand exit is across this narrow wall; the opposite side is water.
 s.props.push({id:'exit-wall',kind:'barrier',x:2,z:0,w:.2,d:10,health:100});s.obstacles=s.props;
 s.layout.water=[{x:-4,z:0,w:6,d:20}];s.layout.bridges=[];
 assert.equal(s.interactVehicle(),true);assert.ok(s.player.x<1.5);assert.ok(s.player.x>-.55);assert.ok(Math.abs(s.player.z)>3);
 // If all exit positions are flooded, stay in the vehicle rather than teleporting into water.
 s.player.x=v.x;s.player.z=v.z;s.player.vehicleId=v.id;s.player.radius=1.25;s.layout.water=[{x:0,z:0,w:20,d:20}];
 assert.equal(s.interactVehicle(),false);assert.equal(s.player.vehicleId,v.id);assert.equal(s.player.radius,1.25);
});

test('district regeneration leaves the old vehicle before prop identifiers are reused',()=>{
 const s=new Simulation({seed:21});s.start();s.wave=4;s.player.vehicleId='prop-0';s.player.radius=1.25;s.nextWave();
 assert.equal(s.wave,5);assert.equal(s.player.vehicleId,null);assert.equal(s.player.radius,.4);assert.equal(s.player.x,0);assert.equal(s.player.z,3);
});
