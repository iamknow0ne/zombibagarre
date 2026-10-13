import {configureBoss,BOSS_PROFILES,beginBossAttack} from '../src/rebuild/Bosses.js';
export function installBossQA(input,getSim,getWorld){
 let protectedPlayer=true;window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='boss-qa')return;if(!document.getElementById('loading').hidden)return;const action=e.data.action,s=getSim();
 if(action==='touch'){input.source='touch';input.getGamepads=()=>[];return;}
 if(action==='start'){document.getElementById('start').click();return;}
 if(action==='pause'){document.getElementById(s.state==='paused'?'resume':'pause').click();return;}
 if(action==='vulnerable'){protectedPlayer=!protectedPlayer;s.player.invulnerable=0;return;}
 if(action==='phase'){for(const b of s.enemies.filter(e=>e.type==='boss')){b.bossState='pursuit';s.damageEnemy(b,b.maxHealth);}return;}
 if(action==='defeat'){for(const b of s.enemies.filter(e=>e.type==='boss')){b.bossPhase=2;b.bossState='pursuit';b.phasePending=false;s.damageEnemy(b,b.maxHealth*3);}return;}
 if(action==='attack'){for(const b of s.enemies.filter(e=>e.type==='boss').slice(0,1))beginBossAttack(s,b);return;}
 if(action==='heal'){s.player.health=s.player.maxHealth;return;}
 if(action==='gun'){s.player.equipped=['carbine','launcher'];s.player.weapon='carbine';return;}
 if(action==='blade'){s.player.equipped=['katana'];s.player.weapon='katana';return;}
 if(action.startsWith('boss-')){document.querySelectorAll('dialog[open]').forEach(d=>d.close());s.resume();s.state='playing';input.clear();if(document.getElementById('auto-action').getAttribute('aria-pressed')==='true')document.getElementById('auto-action').click();s.enemies=[];s.hazards=[];s.bullets=[];s.toSpawn=1;s.spawnTimer=999;s.player.health=s.player.maxHealth;s.player.vehicleId=null;const i=Number(action.slice(5));s.district=i;const b=s.spawnEnemy('boss',s.player.x+5,s.player.z-10);configureBoss(s,b,{variant:i});if(i===6){const peer=s.spawnEnemy('boss',b.x-7,b.z);configureBoss(s,peer,{variant:3,name:'THE ASH CANTOR',height:6.4,radius:1.7});b.duoId=peer.duoId='qa-pair';}getWorld().clearDynamic();}
 });
 setInterval(()=>{const s=getSim();if(protectedPlayer)s.player.invulnerable=10;parent.postMessage({type:'boss-report',value:{state:s.state,protectedPlayer,playerHealth:s.player.health,bosses:s.enemies.filter(e=>e.type==='boss').map(e=>({name:e.bossName,state:e.bossState,phase:e.bossPhase,move:e.bossMove,health:Math.round(e.health),height:e.bossHeight})),hazards:s.hazards.length,drawCalls:getWorld().renderer.info.render.calls}},location.origin);},200);
}
