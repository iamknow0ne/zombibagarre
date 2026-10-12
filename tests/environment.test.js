import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {fractureBuilding,updateCollapse} from '../src/rebuild/Collapse.js';
import {generateCity,waterAt,waterOutline} from '../src/rebuild/City.js';
const setup=()=>{const s=new Simulation();s.start();s.props=[];s.obstacles=[];s.player.x=22;s.player.z=18;s.player.invulnerable=999;s.toSpawn=999;s.spawnTimer=9999;return s;};
const building={id:'test-building',kind:'building',x:0,z:0,w:12,d:10,h:16.8,material:'brick'};
test('fractures scale with structure size and retain floor and wall materials',()=>{
 const small=fractureBuilding({...building,w:4,d:4,h:5.6},73),large=fractureBuilding(building,73);
 assert.ok(large.length>small.length*3);assert.deepEqual(large,fractureBuilding(building,73));assert.ok(large.some(p=>p.material==='brick'));assert.ok(large.some(p=>p.material==='concrete'));assert.ok(Math.max(...large.map(p=>p.delay))>.5);
});
test('collapse accelerates under gravity, settles, leaves blocking rubble and pauses with the game',()=>{
 const s=setup();s.setBuildings([building]);const b=s.props[0];s.damageProp(b,b.health+1);const top=s.structures.find(p=>p.y>15);const y=top.y;
 s.pause();s.update(.05);assert.equal(top.y,y);s.resume();for(let i=0;i<30;i++)s.update(.05,{auto:false});assert.ok(top.y<y&&top.vy<0);
 for(let i=0;i<220;i++)s.update(.05,{auto:false});assert.ok(s.structures.every(p=>p.sleep));assert.ok(s.obstacles.some(p=>p.kind==='rubble'));assert.ok(s.events.some(e=>e.type==='structural-impact'));assert.ok(s.structures.every(p=>Number.isFinite(p.y)&&p.y>=0));
 const rubble=s.props.find(p=>p.kind==='rubble');s.damageProp(rubble,999);assert.ok(!s.obstacles.includes(rubble));
});
test('falling structural chunks collide with neighbouring walls and water damps their fall',()=>{
 const s=setup();s.rubblePiles=new Map();s.obstacles=[{id:'wall',x:2,z:0,w:1,d:10,h:15}];s.structures=[{...fractureBuilding(building,1)[0],x:0,y:6,z:0,w:.5,d:.5,vx:30,delay:0}];
 for(let i=0;i<8;i++)updateCollapse(s,.05);assert.ok(s.structures[0].x<1.6);assert.ok(s.structures[0].vx<=0);
 s.layout={city:true,water:[{x:0,z:0,w:20,d:20}],bridges:[]};s.obstacles=[];s.structures=[{...fractureBuilding(building,2)[0],x:0,y:1,z:0,delay:0}];for(let i=0;i<40;i++)updateCollapse(s,.05);assert.ok(s.structures[0].splashed);assert.ok(s.events.some(e=>e.type==='splash'));assert.equal(s.props.length,0);
});
test('fire spreads through combustible building bays, consumes fuel, and water blocks immediate reignition',()=>{
 const s=setup();s.setBuildings([building]);const b=s.props[0];assert.ok(s.igniteProp(b,-4.5,-5,.9,4));for(let i=0;i<160;i++)s.updateFire(.05);assert.ok(b.surfaces.filter(c=>c.burning>0).length>1);assert.ok(b.surfaces.some(c=>c.char>0));
 const cell=b.surfaces.find(c=>c.burning>0&&c.y<2);assert.ok(s.splashWater(cell.x,cell.z,4)>0);assert.equal(cell.burning,0);assert.equal(s.igniteProp(b,cell.x,cell.z,cell.y),false);assert.ok(s.events.some(e=>e.type==='steam'));s.addFire(cell.x,cell.z);assert.equal(s.fires.length,0);
 for(let i=0;i<900;i++)s.updateFire(.05);assert.ok(b.surfaces.every(c=>c.fuel>=0));
 for(const kind of ['rock','barrier','rubble'])assert.equal(s.igniteProp({kind,x:10,z:0,health:100,material:'concrete'}),false);
});
test('a water blast extinguishes a shore fire and a burning enemy without graphics dependency',()=>{
 const s=setup();s.layout={city:true,water:[{x:0,z:0,w:6,d:6}],bridges:[]};s.addFire(3.5,0);const e=s.spawnEnemy('brute',3.6,0);e.burning=5;s.blast(2.8,0,2,1);assert.equal(s.fires.length,0);assert.equal(e.burning,0);assert.ok(e.wet>0);
});
test('cities consistently have lakes, fountains and foliage with shared curved water boundaries',()=>{
 for(const seed of [1,73,140,2026]){const city=generateCity(seed);assert.ok(city.water.some(w=>w.feature==='lake'));assert.ok(city.water.some(w=>w.feature==='fountain'));assert.ok(city.cover.filter(p=>p.kind==='planter').length>30);for(const w of city.water.filter(w=>w.shape==='ellipse')){assert.equal(waterAt(city,w.x,w.z),true);assert.equal(waterAt(city,w.x+w.w*.49,w.z+w.d*.49),false);assert.equal(waterOutline(w).length,40);}}
});

test('roof support holds fallen debris and releases it when the supporting building collapses',()=>{
 const s=setup();s.rubblePiles=new Map();const roof={id:'roof',kind:'building',x:0,z:0,w:12,d:12,h:5,health:100};s.obstacles=[roof];
 s.structures=[{...fractureBuilding(building,2)[0],buildingId:'other',x:0,y:9,z:0,vx:0,vz:0,delay:0,canBreak:false}];for(let i=0;i<160;i++)updateCollapse(s,.05);
 const c=s.structures[0];assert.ok(c.sleep);assert.equal(c.supportId,'roof');assert.ok(c.y>=5);assert.equal(s.props.length,0);
 s.obstacles=[];for(let i=0;i<160;i++)updateCollapse(s,.05);assert.ok(c.sleep);assert.ok(c.y<1);assert.equal(c.supportId,null);
});

test('rubble clears its matching fragments and structural storage has a hard bound',()=>{
 const s=setup();s.setBuildings([building]);s.damageProp(s.props[0],99999);for(let i=0;i<260;i++)updateCollapse(s,.05);
 const rubble=s.props.find(p=>p.kind==='rubble'),before=s.structures.length;s.damageProp(rubble,999);assert.ok(s.structures.length<before);
 for(let i=0;i<12;i++){s.setBuildings([{...building,id:`tower-${i}`}]);s.damageProp(s.props.find(p=>p.id===`tower-${i}`),99999);}assert.ok(s.structures.length<=1200);
});
