export function installRetroQA(input,getSim,getWorld,getArcade){
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='retro-qa')return;
  const s=getSim(),action=e.data.action;window.focus();if(s.state==='paused'){document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();input.clear();}
  if(action==='start'){document.getElementById('start').click();return;}
  if(action==='interact'){input.once.interact=true;return;}
  if(action==='touch'){input.source='touch';return;}
  if(action==='close'){getArcade().close();return;}
  if(action==='map'){document.getElementById('map-action').click();return;}
  if(action==='locked'){s.progression='hero';s.profile.xp=0;return;}
  if(action==='unlocked'){s.progression='hero';s.profile.xp=420;return;}
  if(action==='door'){
   const p=s.interiorState?.manifest.find(p=>p.template==='retro-room-v1');if(!p)return;
   Object.assign(s.player,{...p.door,y:0,grounded:true,vehicleId:null,dash:0,meleeAttack:null,throwAnimation:0,invulnerable:999});s.enemies=s.enemies.filter(e=>Math.hypot(e.x-p.door.x,e.z-p.door.z)>15);s.spawnTimer=999;input.clear();return;
  }
  if(action==='console'&&s.interior){const o=s.interior.plan.objects.find(o=>o.consoleId==='snes');Object.assign(s.interior.pose,{x:o.x,z:o.z+.3});input.clear();}
 });
 setInterval(()=>{const s=getSim();parent.postMessage({type:'retro-report',value:{state:s.state,time:s.time,health:s.player.health,wave:s.wave,room:s.interior?.plan.template,pose:s.interior?.pose,profileXP:s.profile.xp,progression:s.progression,arcade:getArcade().active,rooms:s.interiorState?.manifest.map(p=>p.template)}},location.origin);},500);
}
