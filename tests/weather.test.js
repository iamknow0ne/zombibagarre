import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {createWeather,updateWeather,forecast,weatherMovement,weatherSettings,DAY_SECONDS} from '../src/rebuild/Weather.js';
import {QUESTS,questVisible,questState,questObjective,acceptQuest,claimQuest,interactPlace,rpgKill,updateNightQuests} from '../src/rebuild/RPG.js';
import * as T from 'three';
import {WeatherVisuals} from '../src/rebuild/WeatherVisuals.js';
const basic=environment=>{const s=new Simulation({environment});s.start();s.toSpawn=999;s.spawnTimer=9999;s.player.invulnerable=999;s.props=[];s.obstacles=[];return s;};
const tick=(s,seconds)=>{for(let t=0;t<seconds;t+=.05)s.update(.05,{auto:false});};
test('weather options validate and a seeded regional forecast is reproducible without combat RNG',()=>{
 assert.equal(weatherSettings({weatherMode:'invalid'}).weatherMode,'dynamic');
 const a=Array.from({length:30},(_,i)=>forecast(93,i,0,true));assert.deepEqual(a,Array.from({length:30},(_,i)=>forecast(93,i,0,true)));assert.ok(new Set(a).size>=3);
 for(let i=0;i<40;i++){assert.ok(['snow','fog'].includes(forecast(3,i,5)));assert.notEqual(forecast(3,i,4),'snow');}
 const s=basic(),control=basic();updateWeather(s,10);assert.equal(s.random(),control.random());
});
test('day cycle crosses night and dawn, wraps dates, and pauses with gameplay',()=>{
 const s=basic();s.weather.elapsed=DAY_SECONDS*(19-16.5)/24;updateWeather(s,0);assert.equal(s.weather.night,true);
 s.weather.elapsed=DAY_SECONDS*(30.1-16.5)/24;updateWeather(s,0);assert.equal(s.weather.night,false);assert.equal(s.weather.day,2);
 s.pause();const before=structuredClone(s.weather);tick(s,2);assert.deepEqual(s.weather,before);
});
test('night reinforcements are finite, once per wave, and excluded from boss waves',()=>{
 const day=new Simulation({environment:{dayCycle:'day'}}),night=new Simulation({environment:{dayCycle:'night'}});day.start();night.start();assert.equal(day.toSpawn,12);assert.equal(night.toSpawn,15);
 const count=night.toSpawn;for(let i=0;i<50;i++)updateWeather(night,.05);assert.equal(night.toSpawn,count);assert.equal(night.waveTotal,count);
 night.weather.options.dayCycle='day';updateWeather(night,0);night.weather.options.dayCycle='night';updateWeather(night,0);assert.equal(night.toSpawn,count);
 night.wave=3;night.nextWave();assert.equal(night.toSpawn,6);assert.ok(!night.nightReinforced);
});
test('rain cools exterior bays, enemies and ground fires into height-correct steam without restoring fuel',()=>{
 const s=basic({weatherMode:'rain'});s.weather.rain=1;s.player.x=15;s.player.z=15;s.setBuildings([{id:'b',x:0,z:0,w:8,d:8,h:12}]);const b=s.props[0];s.igniteProp(b,0,-4,6.5);const c=b.surfaces.find(c=>c.burning>0);const fuel=c.fuel;
 const e=s.spawnEnemy('walker',12,12);e.burning=10;e.speed=0;s.addFire(10,10,1);
 s.updateFire(.25);assert.ok(c.burning>0,'rain should not instantly erase a blaze');
 for(let i=0;i<20;i++)s.updateFire(.25);
 assert.equal(c.burning,0);assert.ok(c.wet>0);assert.ok(c.fuel<=fuel);assert.equal(e.burning,0);assert.ok(e.wet>0);assert.equal(s.fires.length,0);assert.ok(s.events.some(e=>e.type==='steam'&&e.y===c.y));assert.equal(s.igniteProp(b,c.x,c.z,c.y),false);
});
test('intact roofs shelter flames and collapse exposes them to rain',()=>{
 const s=basic({weatherMode:'rain'});s.weather.rain=1;const roof={id:'roof',kind:'building',x:0,z:0,w:8,d:8,h:7,health:999};const crate={id:'crate',kind:'crate',x:0,z:0,w:1,d:1,health:999,burning:20,fuel:20};s.props=[roof,crate];s.obstacles=s.props;
 for(let i=0;i<8;i++)s.updateFire(.25);assert.ok(crate.burning>0);assert.equal(crate.wet||0,0);
 roof.health=0;s.obstacles=[crate];for(let i=0;i<8;i++)s.updateFire(.25);assert.equal(crate.burning,0);assert.ok(crate.wet>0);
});
test('snow creates controllable coasting, melts in rain, and dry controls stop immediately',()=>{
 const p={},w={snow:1,snowCover:1};for(let i=0;i<60;i++)weatherMovement(p,1,0,5.2,1/60,w);
 let drift=0;for(let i=0;i<60;i++)drift+=weatherMovement(p,0,0,5.2,1/60,w).x;assert.ok(drift>.3&&drift<1.6);assert.ok(Math.abs(p.slideX)<.25);
 assert.deepEqual(weatherMovement(p,0,0,5.2,1/60,{snow:0,snowCover:0}),{x:0,z:0});
 const s=basic({weatherMode:'snow'});tick(s,35);assert.ok(s.weather.snowCover>.5);const snow=s.weather.snowCover;s.weather.options.weatherMode='rain';tick(s,35);assert.ok(s.weather.snowCover<snow*.4);assert.ok(s.weather.wetness>.5);
});
test('snow drift respects walls and a dodge remains immediate and directional',()=>{
 const s=basic({weatherMode:'snow'});s.weather.snowCover=1;s.weather.snow=1;s.player.x=0;s.player.z=0;s.obstacles=[{x:2,z:0,w:1,d:10,health:999}];
 for(let i=0;i<30;i++)s.update(.05,{x:1,auto:false});assert.ok(s.player.x<1.15);
 s.player.x=-5;s.player.z=0;s.player.slideX=5;s.update(.05,{x:0,z:-1,dash:true,auto:false});assert.ok(s.player.z<-.9);assert.ok(Math.abs(s.player.x+5)<.05);assert.equal(s.player.dashX,0);
});
const city=()=>{const s=new Simulation({mode:'city',seed:31,profile:{},environment:{dayCycle:'day'}});s.start();return s;};
const visit=(s,id)=>{const p=s.places.find(p=>p.id===id);Object.assign(s.player,{x:p.x,z:p.z});};
test('night contracts appear after dark, retain progress at dawn, and reward only once',()=>{
 const s=city(),q=QUESTS.find(q=>q.id==='night-hunt');visit(s,'medic');assert.equal(questVisible(s,q),false);assert.equal(acceptQuest(s,q.id,'medic'),false);
 s.weather.options.dayCycle='night';updateWeather(s,0);assert.ok(questVisible(s,q));assert.ok(acceptQuest(s,q.id,'medic'));rpgKill(s,{type:'walker'});assert.equal(s.rpg.nightKills,1);
 s.weather.options.dayCycle='day';updateWeather(s,0);rpgKill(s,{type:'walker'});assert.equal(s.rpg.nightKills,1);assert.equal(questState(s,q),'active');assert.ok(questVisible(s,q));assert.match(questObjective(s,q.id).text,/after dark/);
 s.rpg.nightKills=18;assert.equal(questState(s,q),'ready');assert.ok(claimQuest(s,q.id,'medic'));assert.equal(claimQuest(s,q.id,'medic'),false);
});
test('night delivery and district survey require acceptance and darkness, and offer valid guidance',()=>{
 const s=city();s.weather.options.dayCycle='night';updateWeather(s,0);visit(s,'medic');interactPlace(s);assert.equal(s.rpg.nightDelivery,0);s.resume();visit(s,'smith');assert.ok(acceptQuest(s,'night-courier','smith'));assert.equal(questObjective(s,'night-courier').target.id,'medic');
 s.weather.options.dayCycle='day';updateWeather(s,0);visit(s,'medic');interactPlace(s);assert.equal(s.rpg.nightDelivery,0);s.resume();s.weather.options.dayCycle='night';updateWeather(s,0);interactPlace(s);assert.equal(s.rpg.nightDelivery,1);s.resume();
 visit(s,'broker');assert.ok(acceptQuest(s,'night-atlas','broker'));const target=questObjective(s,'night-atlas').target;Object.assign(s.player,{x:target.x,z:target.z});updateNightQuests(s);updateNightQuests(s);assert.equal(s.rpg.nightDistricts.length,1);assert.notEqual(questObjective(s,'night-atlas').target.name,target.name);
});

test('weather graphics use bounded shared buffers, respect quality and pause, and dispose their scene objects',()=>{
 const world={layout:{mapSeed:73},scene:new T.Scene(),hemi:new T.HemisphereLight(),sun:new T.DirectionalLight(),rim:new T.DirectionalLight(),cityLights:[new T.PointLight()],surfaces:{materials:new Map()},ash:{},renderer:{getPixelRatio:()=>1},settings:{quality:'low',weatherEffects:'full',environmentDetail:'standard'}};
 world.scene.background=new T.Color();world.scene.fog=new T.FogExp2();const v=new WeatherVisuals(world),s={weather:createWeather(1),player:{x:0,z:0},obstacles:[],geometryRevision:0};s.weather.rain=1;s.weather.wetness=1;
 v.update(s,.05);assert.equal(v.rain.geometry.drawRange.count,360);assert.ok(v.rain.visible);assert.ok(v.ripple.count<=48);assert.ok(v.rainPositions.every(Number.isFinite));
 const buffer=v.rainPositions,positions=[...buffer];v.update(s,0);assert.deepEqual([...buffer],positions);assert.equal(v.rainPositions,buffer);
 const sunDay=world.sun.intensity;s.weather.daylight=0;v.update(s,0);assert.ok(world.sun.intensity<sunDay);assert.ok(world.cityLights[0].intensity>70);
 world.settings.weatherEffects='off';v.update(s,.05);assert.equal(v.rain.visible,false);assert.equal(v.ripple.visible,false);assert.equal(s.weather.wetness,1);
 world.settings.weatherEffects='full';s.weather.rain=0;s.weather.snow=1;v.update(s,.05);assert.ok(v.snow.visible);assert.equal(v.snow.geometry.drawRange.count,180);world.settings.reducedMotion=true;v.update(s,.05);assert.equal(v.snow.visible,false);
 v.dispose();assert.equal(world.scene.children.length,0);
});
