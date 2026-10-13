import {seededRandom,distance,pointBlocked} from './config.js';
export const STREET_JOBS=[
 {kind:'relay',name:'DEAD AIR',instruction:'Clear the relay and stay close on foot',reward:'RADIO RESTORED · +40 ARMOUR',seconds:8},
 {kind:'cache',name:'LAST DELIVERY',instruction:'Clear the supply convoy',reward:'SUPPLIES RECOVERED · AMMO + 3 GRENADES',seconds:0},
 {kind:'hunt',name:'THE NIGHT WATCH',instruction:'Defeat the marked enforcer',reward:'ENFORCER DOWN · +15 MAX HEALTH',seconds:0},
];
export function makeStreetEvents(layout){
 if(!layout.city)return [];
 const random=seededRandom(layout.mapSeed^0x773ada),selected=[];
 const points=layout.spawnPoints.filter(p=>Math.hypot(p.x,p.z)>24&&Math.hypot(p.x,p.z)<100&&!pointBlocked(p.x,p.z,2.5,[...layout.cover,...layout.buildings]));
 for(const [i,job]of STREET_JOBS.entries()){
  const options=points.filter(p=>selected.every(s=>distance(s,p)>34));if(!options.length)break;
  const point=options[Math.floor(random()*options.length)];selected.push({...job,...point,id:`street-${i}`,state:'dormant',progress:0,guards:[]});
 }
 return selected;
}
export function updateStreetEvents(sim,dt){
 if(!['playing','extracting'].includes(sim.state))return;
 const p=sim.player;
 for(const job of sim.streetEvents){
  if(job.state==='complete')continue;
  if(job.state==='dormant'&&distance(job,p)<7.5){
   job.state='active';const types=job.kind==='hunt'?['brute']:job.kind==='cache'?['armored','walker','runner','walker']:['runner','walker','walker'];
   const safe=sim.layout.spawnPoints.filter(q=>distance(q,job)>5&&distance(q,job)<16&&distance(q,p)>4&&!pointBlocked(q.x,q.z,1.3,sim.obstacles)).sort((a,b)=>distance(a,job)-distance(b,job));
   for(const [i,type]of types.entries()){const q=safe[Math.min(i*2,safe.length-1)];if(!q)continue;const e=sim.spawnEnemy(type,q.x,q.z);e.incidentId=job.id;if(job.kind==='hunt'){e.health=e.maxHealth=e.health*2.5;e.elite=true;}job.guards.push(e.id);sim.waveTotal++;}
   sim.emit('street-job',{name:job.name,message:job.instruction.toUpperCase(),x:job.x,z:job.z});
  }
  if(job.state!=='active')continue;
  const remaining=sim.enemies.filter(e=>job.guards.includes(e.id)&&e.health>0).length;
  if(remaining>0)continue;
  if(job.kind==='relay'){
   const contested=sim.enemies.some(e=>e.health>0&&distance(e,job)<5);
   if(distance(p,job)<4&&!p.vehicleId&&!contested)job.progress=Math.min(job.seconds,job.progress+dt);
   if(job.progress<job.seconds)continue;
  }
  job.state='complete';sim.score+=1200;
  if(job.kind==='relay')p.shield=Math.min(120,p.shield+40);
  else if(job.kind==='cache'){sim.collect('ammo');p.grenades+=3;}
  else{p.maxHealth+=15;p.health=Math.min(p.maxHealth,p.health+40);}
  sim.emit('street-complete',{name:job.name,message:job.reward,x:job.x,z:job.z});
 }
}
export function streetStatus(sim){
 const jobs=sim.streetEvents||[],done=jobs.filter(j=>j.state==='complete').length;
 const nearest=jobs.filter(j=>j.state!=='complete').sort((a,b)=>distance(a,sim.player)-distance(b,sim.player))[0];
 if(!nearest)return {title:'STREETS RECLAIMED',detail:`${done} / ${jobs.length} ENCOUNTERS COMPLETE`};
 const guards=sim.enemies.filter(e=>nearest.guards.includes(e.id)&&e.health>0).length;
 return {title:nearest.name,detail:nearest.state==='dormant'?`${Math.round(distance(nearest,sim.player))} m · OPTIONAL ENCOUNTER`:guards?`${guards} GUARD${guards===1?'':'S'} REMAINING`:nearest.kind==='relay'?`STAY WITH THE RADIO · ${Math.floor(nearest.progress/nearest.seconds*100)}%`:'SECURING SUPPLIES'};
}
