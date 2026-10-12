import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {distance} from '../src/rebuild/config.js';
for(const difficulty of (process.argv[2]?[process.argv[2]]:['relaxed','standard','nightmare'])){
 const s=new Simulation({seed:2026,difficulty,mode:process.argv[3]||'campaign'});s.start('launcher');s.setLoadout(['launcher','arc']);let last=0;const hz=s.layout.city?30:60;
 for(let i=0;i<hz*1800;i++){
   s.events=[];
   if(s.state==='dead'||s.state==='victory')break;
   if(s.state==='upgrade'){const order=['damage','reload','health','regeneration','magnet','armour','ordnance','blast'];const pick=[...s.choices].sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id)))[0];s.chooseUpgrade(pick.id);}
   if(last!==s.wave){console.log(difficulty,'wave',s.wave,'time',Math.round(s.time),'hp',Math.round(s.player.health));last=s.wave;}
   let destination=s.state==='extracting'?{x:0,z:-10}:{x:Math.sin(s.time*.17)*11,z:Math.cos(s.time*.17)*8};
   if(s.layout.city){destination={x:Math.sin(s.time*.12)*3,z:Math.cos(s.time*.12)*9};if(s.toSpawn===0&&s.enemies.length<7)destination=[...s.enemies].sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0]||destination;}
   if(s.layout.city&&i%(hz*60)===0)console.log('progress',s.time,s.wave,s.enemies.length,s.player.x,s.player.z,s.enemies.map(e=>[e.type,Math.round(e.x),Math.round(e.z)]));
   const health=s.pickups.filter(p=>p.type==='health').sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];if(s.player.health<65&&health)destination=health;
   if(s.blocked(s.player,destination,.5))destination=s.navigate(s.player,destination)||destination;
   const d=distance(s.player,destination)||1;
   const near=s.enemies.filter(e=>distance(e,s.player)<3);const closest=[...s.enemies].sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];
   s.update(1/hz,{auto:true,x:d>.3?(destination.x-s.player.x)/d:0,z:d>.3?(destination.z-s.player.z)/d:0,melee:near.length>0,grenade:near.length>2||(closest?.type==='boss'&&s.player.grenades>0&&i%(hz*2)===0),dash:near.length>0&&s.player.dashCooldown===0});
 }
 assert.equal(s.state,'victory',`${difficulty}: campaign must complete`);
 console.log('RESULT',difficulty,s.state,'wave',s.wave,'time',s.time.toFixed(1),'kills',s.kills,'hp',s.player.health,'left',s.enemies.map(e=>[e.type,Math.round(e.x),Math.round(e.z)]));
}
