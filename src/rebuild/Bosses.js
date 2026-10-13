import {ARENA,clamp,distance,pointBlocked} from './config.js';
import {insideMap} from './Map.js';
export const BOSS_PROFILES=[
 {name:'THE BELL WARDEN',kind:'warden',height:5.8,radius:1.65,color:0xe5b66c,phase:'THE BELL BREAKS',title:'JAILER OF SAINT-ROCH',moves:['judgement','rush','bell']},
 {name:'THE DREDGER',kind:'dredger',height:7.2,radius:1.9,color:0x8ac8cc,phase:'THE CHAIN UNBOUND',title:'WHAT THE PORT COULD NOT BURY',moves:['harpoon','tide','anchors']},
 {name:'THE BLOOM MOTHER',kind:'bloom',height:6.8,radius:1.8,color:0xc5cf86,phase:'THE HEART OPENS',title:'A GARDEN THAT FEEDS',moves:['roots','seeds','brood']},
 {name:'THE CINDER KING',kind:'cinder',height:11.2,radius:2.35,color:0xffac63,phase:'BOILER BREACH',title:'THE FOUNDRY WALKS',moves:['furnace','stamp','kiln']},
 {name:'THE ROOT CATHEDRAL',kind:'bloom',height:12.5,radius:2.4,color:0xb6cd81,phase:'THE OLD GOD WAKES',title:'A THOUSAND YEARS OF HUNGER',moves:['roots','tide','brood']},
 {name:'THE AVALANCHE',kind:'warden',height:10.5,radius:2.3,color:0xd8e9ee,phase:'THE MOUNTAIN SPLITS',title:'THE PASS HAS TEETH',moves:['bell','rush','fault']},
 {name:'THE DUST REAPER',kind:'dredger',height:5.9,radius:1.65,color:0xe0c188,phase:'THE LAST OATH',title:'REAPER & CANTOR / THE ASHEN COVENANT',moves:['harpoon','rush','anchors']},
 {name:'THE FEN KING',kind:'cinder',height:12,radius:2.4,color:0xaacdad,phase:'THE SUNKEN HEART',title:'EVERY KINGDOM MUST DROWN',moves:['kiln','tide','furnace']}
];
export function configureBoss(sim,e,options={}){
 const index=options.variant??sim.district??0,profile={...BOSS_PROFILES[index%8],...options};e.bossProfile=profile;e.bossKind=profile.kind;e.bossName=profile.name;e.bossHeight=profile.height;e.radius=profile.radius;e.bossPhase=1;e.bossState='arrival';e.bossTimer=2.2;e.bossClock=0;e.attackCount=0;e.windup=0;e.speed=profile.height>9?1.1:1.65;e.bossStarted=false;e.phasePending=false;e.recoveryDuration=1.7;
 const obstacles=[...sim.obstacles,...(sim.layout.buildings||[])],valid=p=>insideMap(sim.layout,p.x,p.z,e.radius)&&!pointBlocked(p.x,p.z,e.radius+.1,obstacles);
 if(!valid(e)){const candidates=[...(sim.layout.spawnPoints||[])];for(let r=3;r<=30;r+=3)for(let n=0;n<16;n++)candidates.push({x:e.x+Math.sin(n*Math.PI/8)*r,z:e.z+Math.cos(n*Math.PI/8)*r});let p=candidates.filter(valid).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(!p){const b=sim.layout.bounds||ARENA;for(let x=b.minX+e.radius;x<b.maxX-e.radius;x+=3)for(let z=b.minZ+e.radius;z<b.maxZ-e.radius;z+=3)if(valid({x,z})&&(!p||distance({x,z},e)<distance(p,e)))p={x,z};}if(p){e.x=p.x;e.z=p.z;}}
 return e;
}
export function bossContains(h,p){
 const dx=p.x-h.x,dz=p.z-h.z,r=p.radius||0;
 if(h.shape==='lane'){const forward=dx*Math.sin(h.angle)+dz*Math.cos(h.angle),side=dx*Math.cos(h.angle)-dz*Math.sin(h.angle);return Math.abs(forward)<=h.length/2+r&&Math.abs(side)<=h.width/2+r;}
 const d=Math.hypot(dx,dz);return d<h.radius+r&&(!h.innerRadius||d>h.innerRadius-r);
}
export function clearBossAttacks(sim,e){sim.hazards=sim.hazards.filter(h=>h.bossOwner!==e.id);sim.bullets=sim.bullets.filter(b=>b.bossOwner!==e.id);}
export function bossDamage(sim,e,amount){
 if(!e.bossProfile)return amount;
 if(['arrival','transition'].includes(e.bossState)||e.phasePending)return 0;
 if(e.bossState==='recovery')amount*=1.3;
 if(e.bossPhase===1&&e.health-amount<=e.maxHealth*.5){amount=Math.max(0,e.health-e.maxHealth*.5);e.phasePending=true;}
 return amount;
}
export function bossDefeated(sim,e){
 if(!e.bossProfile)return;clearBossAttacks(sim,e);sim.emit('boss-defeated',{name:e.bossName,x:e.x,z:e.z,height:e.bossHeight,kind:e.bossKind});
 for(const other of sim.enemies)if(other.health>0&&e.duoId&&other.duoId===e.duoId){other.phasePending=true;other.survivorRage=true;}
}
function tell(sim,e,data,delay=0){const h={id:sim.nextId++,bossOwner:e.id,x:e.x,z:e.z,radius:3,timer:e.windup+delay,duration:e.windup+delay,friendly:false,damage:e.damage*(e.bossPhase===2?1.1:1),bossKind:e.bossKind,...data};sim.hazards.push(h);return h;}
export function beginBossAttack(sim,e,forced){
 const p=sim.player,profile=e.bossProfile;if(!profile)return;const moves=profile.moves,move=forced||moves[e.attackCount++%moves.length],rage=e.bossPhase===2;e.chaseTime=0;e.bossMove=move;e.bossState='telegraph';e.windup=move==='rush'?1.15:profile.height>9?1.5:1.1;e.bossTimer=e.windup;e.bossDuration=e.windup;e.targetX=p.x;e.targetZ=p.z;e.angle=Math.atan2(p.x-e.x,p.z-e.z);e.attackActive=.5;e.recoveryDuration=rage?1.5:2.1;
 const circle=(x,z,r,delay=0)=>tell(sim,e,{x,z,radius:r},delay),lane=(angle,length,width,delay=0,extra={})=>tell(sim,e,{x:e.x+Math.sin(angle)*length/2,z:e.z+Math.cos(angle)*length/2,shape:'lane',angle,length,width,radius:width/2,...extra},delay);
 if(move==='rush'){const length=clamp(distance(e,p)+3,8,17);lane(e.angle,length,e.radius*2+.5,0,{charge:true,damage:0});e.chargeX=Math.sin(e.angle);e.chargeZ=Math.cos(e.angle);e.chargeSpeed=length/.8;e.attackActive=.8;}
 else if(move==='judgement'||move==='anchors'||move==='roots'){circle(p.x,p.z,move==='roots'?2.5:3);if(rage){circle(p.x+3.8*Math.cos(e.angle),p.z-3.8*Math.sin(e.angle),2.5,.45);circle(p.x-3.8*Math.cos(e.angle),p.z+3.8*Math.sin(e.angle),2.5,.9);e.attackActive=1.1;}}
 else if(move==='bell'||move==='stamp'){circle(e.x,e.z,e.radius+3.5);if(rage){tell(sim,e,{radius:e.radius+7,innerRadius:e.radius+4.1},.7);e.attackActive=.9;}}
 else if(move==='tide'){tell(sim,e,{radius:10,innerRadius:5});if(rage){tell(sim,e,{radius:15,innerRadius:10.5},.65);e.attackActive=.9;}}
 else if(move==='harpoon'||move==='fault'||move==='furnace'){lane(e.angle,19,move==='furnace'?2.8:2);if(rage||move==='furnace'){lane(e.angle-.46,18,2,.4);lane(e.angle+.46,18,2,.8);e.attackActive=1;}}
 else if(move==='kiln'){for(let i=-1;i<=1;i++)circle(p.x+Math.cos(e.angle)*i*4,p.z-Math.sin(e.angle)*i*4,2.4,(i+1)*.35);e.attackActive=1.25;if(rage)tell(sim,e,{radius:9,innerRadius:5},1.05);}
 else if(move==='seeds'){for(let i=0;i<5;i++){const a=e.angle+(i-2)*.53;circle(e.x+Math.sin(a)*8,e.z+Math.cos(a)*8,2,rage?(i%2)*.45:0);}e.attackActive=.7;}
 else if(move==='brood'){circle(p.x,p.z,3);e.summonPending=true;}
 sim.emit('boss-tell',{name:e.bossName,move,x:e.x,z:e.z});
}
export function updateBoss(sim,e,dt){
 if(!e.bossProfile)configureBoss(sim,e);e.bossClock+=dt;
 if(!e.bossStarted){e.bossStarted=true;if(!e.duoId||!sim.enemies.some(b=>b!==e&&b.duoId===e.duoId&&b.bossStarted))sim.emit('boss-intro',{name:e.duoId?'THE ASHEN COVENANT':e.bossName,subtitle:e.bossProfile.title,x:e.x,z:e.z});}
 if(e.phasePending){clearBossAttacks(sim,e);e.phasePending=false;e.bossPhase=2;e.bossState='transition';e.bossTimer=e.bossDuration=2;e.windup=0;e.summonPending=false;sim.emit('boss-phase',{name:e.bossName,subtitle:e.survivorRage?'OATHBROKEN / THE SURVIVOR ENRAGES':e.bossProfile.phase,x:e.x,z:e.z,height:e.bossHeight});}
 const state=e.bossState;e.bossTimer=Math.max(0,e.bossTimer-dt);
 if(state==='arrival'||state==='transition'){e.windup=0;if(!e.bossTimer){e.bossState='pursuit';e.bossTimer=.55;}return true;}
 if(state==='telegraph'){e.windup=e.bossTimer;if(!e.bossTimer){e.bossState='strike';e.bossTimer=e.bossDuration=e.attackActive;sim.emit('boss-attack',{name:e.bossName,attack:e.bossMove,x:e.x,z:e.z});if(e.summonPending){e.summonPending=false;for(let i=0;i<(e.bossPhase===2?3:2);i++){if(sim.enemies.filter(m=>m.summonedBy===e.id&&m.health>0).length>=4)break;const a=i*2.4+e.attackCount,q={x:e.x+Math.sin(a)*(e.radius+1),z:e.z+Math.cos(a)*(e.radius+1)};if(pointBlocked(q.x,q.z,.5,sim.obstacles)||!insideMap(sim.layout,q.x,q.z,.6))continue;const m=sim.spawnEnemy('runner',q.x,q.z);m.summonedBy=e.id;m.health*=.6;sim.waveTotal++;}}}return true;}
 if(state==='strike'){if(e.bossMove==='rush'){const old={x:e.x,z:e.z};sim.move(e,e.chargeX*dt*e.chargeSpeed,e.chargeZ*dt*e.chargeSpeed);if(distance(e,sim.player)<e.radius+sim.player.radius+.15)sim.damagePlayer(e.damage*1.2);if(distance(old,e)<dt*.2)e.bossTimer=0;}if(!e.bossTimer){e.bossState='recovery';e.bossTimer=e.bossDuration=e.recoveryDuration;}return true;}
 if(state==='recovery'){if(!e.bossTimer){e.bossState='pursuit';e.bossTimer=e.survivorRage?.15:.35;}return true;}
 const p=sim.player,d=distance(e,p),peer=sim.enemies.find(b=>b!==e&&b.health>0&&e.duoId&&b.duoId===e.duoId),reserved=peer&&['telegraph','strike','transition','arrival'].includes(peer.bossState);
 e.chaseTime=(e.chaseTime||0)+dt;
 const next=e.bossProfile.moves[e.attackCount%e.bossProfile.moves.length],reach=['bell','stamp'].includes(next)?e.radius+4:next==='tide'?13:next==='seeds'?12:20;
 if(d<reach&&!e.bossTimer&&!reserved){beginBossAttack(sim,e);return true;}
 if(d<24&&e.chaseTime>3&&!reserved&&!e.bossTimer){e.attackCount++;beginBossAttack(sim,e,{warden:'judgement',dredger:'harpoon',bloom:'roots',cinder:'kiln'}[e.bossKind]);return true;}
 if(d>e.radius+3){let target=p;if(sim.blocked(e,p,e.radius+.08))target=sim.navigate(e)||p;const len=distance(e,target)||1;const speed=e.speed*(e.survivorRage?1.3:1)*(sim.player.freeze>0?.6:e.slow>0?.75:1);sim.move(e,(target.x-e.x)/len*speed*dt,(target.z-e.z)/len*speed*dt);e.angle=Math.atan2(target.x-e.x,target.z-e.z);}return true;
}
