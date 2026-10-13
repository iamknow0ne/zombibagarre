import {updateWeather} from '../src/rebuild/Weather.js';
import {gainXP,trackQuest} from '../src/rebuild/RPG.js';
export function installRPGQA(input,getSim,getWorld){
 input.source='touch';const pad={id:'DualSense (VIRTUAL RPG TEST)',index:99,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};let padEnabled=false;input.getGamepads=()=>padEnabled?[pad]:[];
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='rpg-qa')return;const action=e.data.action;
  if(action.startsWith('pad-')){padEnabled=true;window.focus();const index={down:13,right:15,confirm:0,back:1}[action.slice(4)];setTimeout(()=>{pad.buttons[index]={pressed:true,value:1};setTimeout(()=>pad.buttons[index]={pressed:false,value:0},160);},220);return;}
  if(action==='touch'){padEnabled=false;input.source='touch';return;}
  if(action==='start'){document.getElementById('start').click();return;}
  const s=getSim();if(action.startsWith('weather-')){
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();input.clear();s.player.invulnerable=999;s.toSpawn=999;s.spawnTimer=999;s.enemies=[];
   const kind=action.slice(8);if(['day','night','dusk'].includes(kind)){s.weather.options.dayCycle=kind==='dusk'?'living':kind;if(kind==='dusk')s.weather.elapsed=55;updateWeather(s,0);}
   else if(kind==='fire'){const b=s.props.find(b=>b.kind==='building'&&b.health>0&&b.h>8);s.player.x=b.x;s.player.z=b.z+b.d/2+6;for(const x of [-3,0,3])for(const y of [1,3.7,6.5])s.igniteProp(b,b.x+x,b.z+b.d/2,y,10);getWorld().inspectionTarget={x:b.x,z:b.z+b.d/2};getWorld().portrait=23;s.weather.options.weatherMode='clear';s.weather.rain=0;}
   else if(kind==='dry'){s.weather.options.weatherMode='clear';s.weather.rain=s.weather.snow=s.weather.snowCover=s.weather.wetness=s.weather.fog=0;}
   else{s.weather.options.weatherMode=kind;updateWeather(s,0);s.weather[kind]=1;if(kind==='snow')s.weather.snowCover=1;}
   return;
  }if(action.startsWith('guide-')){
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();input.clear();s.player.invulnerable=999;s.toSpawn=999;s.spawnTimer=999;s.enemies=[];
   if(action==='guide-track')trackQuest(s,'salvage');
   if(action==='guide-case'){if(!s.rpg.accepted.includes('salvage'))s.rpg.accepted.push('salvage');trackQuest(s,'salvage');}
   if(action==='guide-next'){const p=s.places.find(p=>p.kind==='cache'&&!p.used&&p.id===getWorld().feedback.questHint?.target.id)||s.places.find(p=>p.kind==='cache'&&!p.used);if(p){p.used=true;s.rpg.cases.push(p.id);}}
   if(action==='guide-anywhere'){s.rpg.accepted.push('mercy');trackQuest(s,'mercy');}
   if(action==='guide-pin')s.player.waypoint={x:s.player.x+5,z:s.player.z+5,source:'manual'};
   if(action==='guide-arrive'){const q=getWorld().feedback.questHint?.target;if(q){s.player.x=q.x;s.player.z=q.z;}}
   if(action==='guide-toggle')document.getElementById('quest-guidance').click();
   return;
  }if(action==='fund'){s.rpg.coins=2400;gainXP(s,6000);return;}
  if(action==='kit'){s.profile.owned.push(...['scout-head-1','scout-legs-1','warden-chest-2','warden-head-2','warden-legs-1','reaper-chest-3','reaper-head-2','reaper-legs-2'].filter(id=>!s.profile.owned.includes(id)));return;}
  if(action==='contracts'){s.rpg.kills=20;s.rpg.cases=['case-a','case-b'];for(const j of s.streetEvents)j.state='complete';s.visited=new Set(s.layout.landmarks.map(p=>p.name));return;}
  if(action==='defeat'){for(const e of s.enemies.filter(e=>e.secretId)){e.bossState='pursuit';s.damageEnemy(e,999999);s.updateBoss(e,2.1);s.damageEnemy(e,999999);}return;}
  const q=s.places.find(q=>q.id===action);if(!q)return;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();input.clear();s.player.vehicleId=null;s.player.x=q.x;s.player.z=q.z;s.player.invulnerable=999;s.enemies=s.enemies.filter(e=>e.secretId);s.toSpawn=999;s.spawnTimer=999;input.once.interact=true;
 });
 setInterval(()=>{const s=getSim();s.player.invulnerable=999;parent.postMessage({type:'rpg-report',value:{weather:{...s.weather,burning:s.props.reduce((n,p)=>n+(p.burning>0?1:0)+(p.surfaces||[]).filter(c=>c.burning>0).length,0),wetEnemies:s.enemies.filter(e=>e.wet>0).length,particles:getWorld().weatherVisuals.rain.geometry.drawRange.count,drawCalls:getWorld().renderer.info.render.calls},navigation:{hint:getWorld().feedback.questHint,shown:getWorld().feedback.compass.drawn,placement:getWorld().feedback.compass.last,enabled:getWorld().settings.questGuidance},state:s.state,x:s.player.x,z:s.player.z,profile:s.profile,expedition:s.rpg,places:s.places.map(q=>({id:q.id,revealed:q.revealed,defeated:q.defeated})),bosses:s.enemies.filter(e=>e.secretId).map(e=>e.bossName)}},location.origin);},300);
}
