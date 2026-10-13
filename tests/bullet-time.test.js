import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {FOCUS,createFocus,stepFocus,toggleFocus,endFocus,rewardFocus,focusDivePose} from '../src/rebuild/BulletTime.js';
import {BINDINGS,controlSettings,rebind} from '../src/rebuild/ControllerConfig.js';
const isolated=()=>{const s=new Simulation({seed:12});s.start();s.props=[];s.obstacles=[];s.toSpawn=999;s.spawnTimer=9999;s.enemies=[];s.events=[];return s;};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)s.update(1/60,{auto:false,...input});};
const clock=()=>({focus:createFocus(),player:{health:100},state:'playing',emit(){}});
test('Focus charges in real seconds, requires a minimum, and has a hard burst limit',()=>{
 for(const hz of [30,60,120]){const s=clock();toggleFocus(s);for(let i=0;i<hz*2;i++)stepFocus(s,1/hz);assert.ok(Math.abs(s.focus.energy-56)<1e-8);assert.ok(Math.abs(s.timeScale-.32)<1e-8);}
 const s=clock();s.focus.energy=24;assert.equal(toggleFocus(s),false);s.focus.energy=25;assert.equal(toggleFocus(s),true);endFocus(s);assert.equal(toggleFocus(s),false);
 const farm=clock();toggleFocus(farm);for(let i=0;i<361;i++){rewardFocus(farm);stepFocus(farm,1/60);}assert.equal(farm.focus.active,false);assert.ok(farm.focus.cooldown>0);
 const recover=clock();recover.focus.energy=0;recover.focus.recoveryDelay=2;for(let i=0;i<60;i++)stepFocus(recover,1/60);assert.equal(recover.focus.energy,0);for(let i=0;i<180;i++)stepFocus(recover,1/60);assert.ok(recover.focus.energy>=9.9&&recover.focus.energy<=10.1);
});
test('world time and projectile physics slow while directional aim remains immediate',()=>{
 const normal=isolated(),slow=isolated();slow.focus.active=true;slow.focus.blend=1;const before=slow.time;
 for(const s of [normal,slow])s.bullets.push({id:999,x:0,z:3,vx:5,vz:0,life:4,radius:.1,damage:1,weapon:'carbine',friendly:true});
 tick(normal,60);tick(slow,60);assert.ok(Math.abs((slow.time-before)-.32)<1e-9);assert.ok(Math.abs(slow.bullets[0].x/normal.bullets[0].x-.32)<1e-8);assert.ok(Math.abs(slow.focus.energy-78)<1e-8);
 slow.update(1/60,{auto:false,firing:true,aim:{x:slow.player.x+10,z:slow.player.z}});assert.ok(Math.abs(slow.player.angle-Math.PI/2)<1e-8);
});
test('kills refill Focus once, with a precision bonus and reduced active rewards',()=>{
 const s=isolated();s.focus.energy=0;const e=s.spawnEnemy('walker',10,10);s.damageEnemy(e,10000);assert.equal(s.focus.energy,10);s.damageEnemy(e,10000);assert.equal(s.focus.energy,10);
 s.damageEnemy(s.spawnEnemy('walker',11,10),10000,0,0,{headshot:true});assert.equal(s.focus.energy,26);
 s.focus.active=true;s.damageEnemy(s.spawnEnemy('walker',12,10),10000);assert.equal(s.focus.energy,29);
});
test('shooting dive fires during a ranged dodge, keeps collisions, and leaves melee dodge unchanged',()=>{
 const s=isolated();s.setLoadout(['smg']);s.update(1/60,{bulletTime:true,dash:true,x:1,firing:true,auto:false,aim:{x:15,z:3}});assert.equal(s.player.focusDive,true);assert.ok(s.events.some(e=>e.type==='shoot'));assert.ok(s.focus.energy<90);
 const shot=s.events.find(e=>e.type==='shoot');assert.ok(shot.interval>s.player.weaponTimers.smg);tick(s,90);assert.equal(s.player.focusDive,false);assert.deepEqual(focusDivePose(s.player),{lift:0,pitch:0,roll:0});
 const ordinary=isolated();ordinary.update(1/60,{dash:true,x:1,firing:true,auto:false,aim:{x:15,z:3}});assert.equal(ordinary.player.focusDive,false);assert.ok(!ordinary.events.some(e=>e.type==='shoot'));
 const blade=isolated();blade.setLoadout(['katana']);blade.update(1/60,{bulletTime:true,dash:true,x:1,auto:false});assert.equal(blade.player.focusDive,false);
 const wall=isolated();wall.obstacles=[{kind:'building',x:2,z:3,w:1,d:10,health:100}];wall.props=wall.obstacles;wall.update(1/60,{bulletTime:true,dash:true,x:1,auto:false});tick(wall,70);assert.ok(wall.player.x<=1.1,`dive crossed wall: ${wall.player.x}`);
 const pose=focusDivePose({focusDive:true,dash:.16,diveDuration:.32,dashX:1,dashZ:0,angle:0});assert.equal(pose.lift,.55);assert.ok(pose.roll<-.9);assert.ok(Number.isFinite(pose.pitch));
});
test('pause, disabling, vehicles and death restore normal time; a new run resets charge',()=>{
 for(const kind of ['pause','disabled','vehicle','dead']){const s=isolated();s.update(1/60,{bulletTime:true});assert.equal(s.focus.active,true);if(kind==='pause')s.pause();else{if(kind==='disabled')s.focusEnabled=false;if(kind==='vehicle')s.player.vehicleId='car';if(kind==='dead')s.player.health=0;stepFocus(s,1/60);}assert.equal(s.focus.active,false);assert.equal(s.timeScale,1);assert.equal(s.focus.blend,0);}
 const s=isolated();s.focus.energy=33;s.pause();tick(s,100);assert.equal(s.focus.energy,33);s.start();assert.equal(s.focus.energy,100);assert.equal(s.timeScale,1);
});
test('existing custom controller bindings retain Circle ownership when Focus is added',()=>{
 const old={...BINDINGS};delete old.bulletTime;old.dash=1;const loaded=controlSettings({bindings:old}).bindings;assert.equal(loaded.dash,1);assert.equal(loaded.bulletTime,0);assert.equal(new Set(Object.values(loaded)).size,Object.keys(loaded).length);
 const swapped=rebind(BINDINGS,'bulletTime',5);assert.deepEqual(controlSettings({bindings:swapped}).bindings,swapped);
});
