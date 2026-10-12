import {UPGRADES,upgradeOffer} from '../src/rebuild/Upgrades.js';
// Stages real perk definitions and the production choice renderer. No records are saved.
export function installUpgradeQA(input,getSim){
 let preset='mixed';const report=()=>{const s=getSim();parent.postMessage({type:'upgrade-report',state:s.state,wave:s.wave,rerolls:s.rerolls,ranks:s.player.upgradeRanks,choices:s.choices?.map(u=>({id:u.id,rank:u.rank,tier:u.tier.name}))},location.origin);};
 const stage=kind=>{preset=kind;if(getSim().state==='menu')document.getElementById('start').click();document.querySelectorAll('dialog[open]').forEach(d=>d.close());const s=getSim();s.player=s.makePlayer('carbine');s.rerolls=2;s.upgrades=[];const p=s.player;s.events=[];s.enemies=[];s.toSpawn=0;s.wave=kind==='early'?1:12;
  const entries=kind==='early'?[]:kind==='legendary'?[['incendiary',3],['aegis',3],['speed',3]]:[['incendiary',2],['aegis',1],['student',1],['damage',1],['critical',2],['reload',1]];
  for(const [id,rank]of entries){const u=UPGRADES.find(u=>u.id===id);for(let r=1;r<=rank;r++)u.apply(p,r);p.upgradeRanks[id]=rank;s.upgrades.push(...Array(rank).fill(id));}
  s.state='upgrade';s.choices=(kind==='early'?['damage','health','speed']:kind==='legendary'?['incendiary','aegis','speed']:['incendiary','aegis','workshop']).map(id=>upgradeOffer(UPGRADES.find(u=>u.id===id),p));s.upgradeOffers=s.choices.map(u=>u.id);s.emit('upgrade');report();
 };
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='upgrade-qa')return;if(['early','mixed','legendary'].includes(e.data.action))stage(e.data.action);if(e.data.action==='controller'){input.source='gamepad';let pressed=true;input.getGamepads=()=>[{id:'DualSense Wireless Controller',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed&&i===0,value:pressed&&i===0?1:0}))}];document.querySelector('#upgrade-choices button')?.focus();input.padGuard=false;input.menuRoot=document.getElementById('upgrade-dialog');input.menuWaitRelease=false;setTimeout(()=>{pressed=false;},160);}report();});
 setInterval(report,300);stage(preset);
}
