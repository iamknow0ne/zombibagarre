import {clamp,seededRandom} from './config.js';

export const WEATHER_OPTIONS={dayCycle:['living','day','night'],weatherMode:['dynamic','clear','rain','snow','fog'],weatherEffects:['full','subtle','off']};
export const WEATHER_DEFAULTS={dayCycle:'living',weatherMode:'dynamic',weatherEffects:'full'};
export const DAY_SECONDS=600;
export function weatherSettings(raw={}){return Object.fromEntries(Object.entries(WEATHER_OPTIONS).map(([k,v])=>[k,v.includes(raw[k])?raw[k]:WEATHER_DEFAULTS[k]]));}
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function daylightAt(hour){return smooth(5,8,hour)*(1-smooth(17,20,hour));}
export function forecast(seed,index,district=0,city=false){
 const r=seededRandom((seed^Math.imul(index+1,7919)^Math.imul(district+1,31337))>>>0)();
 if(!city&&district===5)return r<.75?'snow':'fog';
 if(!city&&district===6)return r<.8?'clear':'fog';
 if(!city&&[4,7].includes(district))return r<.65?'rain':r<.82?'fog':'clear';
 return r<.42?'rain':r<.62?'fog':r<.76?'snow':'clear';
}
export function createWeather(seed,settings={}){
 const options=weatherSettings(settings),hour=options.dayCycle==='night'?23:options.dayCycle==='day'?12:16.5;
 return {seed,options,elapsed:0,hour,day:1,night:hour>=19||hour<6,daylight:daylightAt(hour),kind:'clear',rain:0,snow:0,fog:0,wetness:0,snowCover:0,physicsTick:0,revision:0};
}
export function updateWeather(sim,dt){
 const w=sim.weather;if(!w)return;const before=w.night;w.elapsed+=dt;
 w.hour=w.options.dayCycle==='day'?12:w.options.dayCycle==='night'?23:(16.5+w.elapsed/DAY_SECONDS*24)%24;
 w.day=1+Math.floor((16.5+w.elapsed/DAY_SECONDS*24)/24);w.night=w.hour>=19||w.hour<6;w.daylight=daylightAt(w.hour);
 const block=Math.floor(Math.max(0,w.elapsed-35)/95),kind=w.options.weatherMode==='dynamic'?(w.elapsed<35?'clear':forecast(w.seed,block,sim.district,!!sim.layout.city)):w.options.weatherMode;
 if(kind!==w.kind){w.kind=kind;w.revision++;sim.emit('weather',{message:`${kind==='rain'?'RAIN APPROACHING · EXPOSED FIRES WILL COOL':kind==='snow'?'SNOWFALL · WATCH YOUR FOOTING':kind==='fog'?'FOG ROLLING IN · STAY CLOSE TO THE LIGHTS':'SKIES CLEARING'}`});}
 const blend=1-Math.exp(-dt/5);for(const key of ['rain','snow','fog'])w[key]+=((kind===key?1:0)-w[key])*blend;
 w.wetness=clamp(w.wetness+dt*(w.rain*.08-w.daylight*.004-.002),0,1);
 w.snowCover=clamp(w.snowCover+dt*(w.snow*.04-w.rain*.055-w.daylight*.008-.001),0,1);
 if(before!==w.night)sim.emit('weather',{message:w.night?'NIGHTFALL · NEW CONTRACTS · REINFORCEMENTS IN THE STREETS':'DAWN · NIGHT OBJECTIVES REST UNTIL DARK'});
 addNightReinforcements(sim);
}
export function addNightReinforcements(sim){
 if(!sim.weather?.night||sim.state!=='playing'||sim.wave%4===0||sim.nightReinforced)return;
 const count=Math.min(12,Math.max(3,Math.ceil((sim.waveBaseCount||12)*(sim.difficulty==='relaxed'?.15:.25))));
 sim.toSpawn+=count;sim.waveTotal+=count;sim.nightReinforced=true;
}
export function weatherLabel(w){if(!w)return '';const minutes=Math.floor(w.hour*60)%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')} · ${w.night?'NIGHT':w.hour>=17?'DUSK':w.hour<8?'DAWN':'DAY'} · ${w.kind.toUpperCase()}`;}
const shelterCaches=new WeakMap();
export function shelteredAt(sim,x,z,y=1){
 let c=shelterCaches.get(sim);
 if(!c||c.obstacles!==sim.obstacles||c.revision!==sim.geometryRevision){
  c={obstacles:sim.obstacles,revision:sim.geometryRevision,cells:new Map()};
  for(const p of sim.obstacles)if(p.kind==='building'&&p.health>0)for(let ix=Math.floor((p.x-p.w/2)/16);ix<=Math.floor((p.x+p.w/2)/16);ix++)for(let iz=Math.floor((p.z-p.d/2)/16);iz<=Math.floor((p.z+p.d/2)/16);iz++){const key=ix+','+iz;if(!c.cells.has(key))c.cells.set(key,[]);c.cells.get(key).push(p);}
  shelterCaches.set(sim,c);
 }
 return (c.cells.get(Math.floor(x/16)+','+Math.floor(z/16))||[]).some(p=>p.health>0&&(p.h||8)>y&&Math.abs(x-p.x)<p.w/2-.1&&Math.abs(z-p.z)<p.d/2-.1);
}
// Ice carries normal running momentum, never the 22 m/s dodge burst.
export function weatherMovement(p,mx,mz,speed,dt,w){
 const grip=clamp((w?.snowCover||0)*.75+(w?.snow||0)*.2,0,.95);
 if(grip<.02){p.slideX=mx*speed;p.slideZ=mz*speed;return {x:p.slideX*dt,z:p.slideZ*dt};}
 const blend=1-Math.exp(-dt/(.035+grip*.25));
 p.slideX=(p.slideX||0)+(mx*speed-(p.slideX||0))*blend;p.slideZ=(p.slideZ||0)+(mz*speed-(p.slideZ||0))*blend;
 return{x:p.slideX*dt,z:p.slideZ*dt};
}
