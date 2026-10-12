import {renderUpgrades} from './rebuild/UpgradeUI.js';
import {TouchUI} from './rebuild/TouchUI.js';
import {criticalChance} from './rebuild/Combat.js';
import {armoryPreviews} from './rebuild/ArmoryPreview.js';
import {weaponTier,masteryProgress,TIER_NAMES,TIER_MARKS,WEAPON_FINISHES} from './rebuild/Evolution.js';
import {controlSettings} from './rebuild/ControllerConfig.js';
import {ControllerUI} from './rebuild/ControllerUI.js';
import {ControllerMap} from './rebuild/ControllerMap.js';
import {Haptics} from './rebuild/Haptics.js';
import {DualSense} from './rebuild/DualSense.js';
import {streetStatus} from './rebuild/StreetEvents.js';
import {loadingStage} from './rebuild/Loading.js';
import {normalizeLoadout,toggleLoadout,slotKey} from './rebuild/Loadout.js';
import {drawAtlas,atlasPoint} from './rebuild/Atlas.js';
import {insideMap} from './rebuild/Map.js';
import './rebuild/style.css';
import './rebuild/touch.css';
import './rebuild/upgrades.css';
import { Simulation } from './rebuild/Simulation.js';
import { World } from './rebuild/World.js';
import { Input } from './rebuild/Input.js';
import { Audio } from './rebuild/Audio.js';
import { WEAPONS, weaponStats, WAVE_NAMES, distance, lineBlocked, magazineSize, TOTAL_WAVES, DISTRICTS, META_UPGRADES, metaCost, synergies, weaponSynergies, SKINS, pointBlocked } from './rebuild/config.js';

const $=id=>document.getElementById(id);
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}}
function save(key,value){if(import.meta.env.DEV&&['controllerQA','touchQA','upgradeQA'].some(k=>new URLSearchParams(location.search).has(k))&&key==='zb-quarantine-record')return;try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsing may not permit persistence. The game still works. */}}
const defaults={volume:45,quality:matchMedia('(pointer:coarse)').matches?'balanced':'high',difficulty:'standard',gore:true,damageNumbers:true,enemyHealthBars:true,criticalCallouts:true,damageColors:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
const stored=read('zb-quarantine-settings',{});const settings={...defaults,...(stored&&typeof stored==='object'?stored:{})};
if(!['high','balanced','low'].includes(settings.quality))settings.quality=defaults.quality;
if(!['relaxed','standard','nightmare'].includes(settings.difficulty))settings.difficulty=defaults.difficulty;
Object.assign(settings,controlSettings(settings));
settings.volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(100,settings.volume)):45;
let record=read('zb-quarantine-record',{score:0,wins:0});if(!record||typeof record!=='object')record={score:0,wins:0};
record.scrap=Math.max(0,Number(record.scrap)||0);record.meta=record.meta&&typeof record.meta==='object'?record.meta:{};for(const u of META_UPGRADES)record.meta[u.id]=Math.max(0,Math.min(u.max,Math.floor(Number(record.meta[u.id])||0)));
let equipped=['carbine'];let runMode='city',skin=SKINS.some(s=>s.id===settings.skin)?settings.skin:'scout',mapReturn=null;
await loadingStage(28,'Charting streets and escape routes');
const freshSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
let sim=new Simulation({seed:freshSeed(),mode:runMode,skin}),world,input,audio=new Audio(settings.volume/100),loadout='carbine',auto=settings.autoFire,last=performance.now(),accumulator=0,noticeUntil=0,toastUntil=0,resultSaved=false;
let controllerUI,controllerMap,haptics,dualsense,touchUI;
let settingsFromPause=false,arsenalReturn=null,lastHud=0,frameCount=0,lastFps=performance.now(),fps=0;
function recordUI(){$('scrap-total').textContent=`${record.scrap} SCRAP`; $('best-score').textContent=record.score?Math.round(record.score).toLocaleString('en-US'):'—';$('record-detail').textContent=record.wins?`${record.wins} SUCCESSFUL EXTRACTION${record.wins===1?'':'S'}`:record.score?'STILL LOOKING FOR A WAY OUT':'YOUR STORY STARTS HERE';}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function showDialog(id){input?.clear();$(id).showModal();}
function announce(kicker,title){$('announcement-kicker').textContent=kicker;$('announcement-title').textContent=title;$('announcement').classList.add('show');noticeUntil=performance.now()+3200;}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+3000;}
function rebuildMap(){world?.destroy();world=new World($('game'),settings,sim.district,sim.layout);world.applySettings(settings);$('map-seed').textContent=`ROUTE ${sim.seed.toString(36).toUpperCase()} / ${sim.layout.shape.toUpperCase()} / ${Math.round(sim.layout.bounds.maxX-sim.layout.bounds.minX)}×${Math.round(sim.layout.bounds.maxZ-sim.layout.bounds.minZ)}`;}
function reshuffle(){let seed=freshSeed();if(runMode==='city'&&sim.layout.city&&(seed&3)===(sim.seed&3))seed=(seed+1)>>>0;sim=new Simulation({seed,mode:runMode,skin});rebuildMap();}
function start(){closeDialogs();if(sim.state!=='menu'||world.district!==0||sim.mode!==runMode)reshuffle();else world.clearDynamic();sim=new Simulation({seed:sim.seed,difficulty:settings.difficulty,meta:record.meta,mode:runMode,skin});sim.start(loadout);sim.setLoadout(equipped);sim.setBuildings(world.buildingTargets);audio.start();audio.lastBeat=0;input.clear();resultSaved=false;accumulator=0;$('menu').hidden=true;$('hud').hidden=false;$('game').focus();toast((input.source==='touch'?'LEFT THUMB TO MOVE · RIGHT THUMB TO AIM':input.source==='gamepad'?'LEFT STICK TO MOVE':'WASD / ZQSD TO MOVE')+' · AUTO FIRE IS '+(auto?'ON':'OFF'));}
function menu(){closeDialogs();reshuffle();input.clear();$('menu').hidden=false;$('hud').hidden=true;$('damage-flash').style.opacity=0;recordUI();$('start').focus();}
function togglePause(){if($('map-dialog').open){$('map-dialog').close();return;}if($('arsenal-dialog').open){$('arsenal-dialog').close();return;}if(sim.state==='paused'){if($('settings-dialog').open){$('settings-dialog').close();showDialog('pause-dialog');}else resume();}else if(['playing','extracting'].includes(sim.state)){sim.pause();showDialog('pause-dialog');}}
function resume(){closeDialogs();sim.resume();input.clear();accumulator=0;$('game').focus();}
function toggleAuto(value=!auto){auto=value;settings.autoFire=auto;save('zb-quarantine-settings',settings);$('auto-action').setAttribute('aria-pressed',String(auto));$('auto-action').innerHTML=`AUTO FIRE <b>${auto?'ON':'OFF'}</b>`;toast(auto?'AUTO FIRE ENABLED':input?.source==='touch'?'MANUAL FIRE · DRAG THE RIGHT STICK':input?.source==='gamepad'?'MANUAL FIRE · USE YOUR HAND BUTTONS':'MANUAL AIM · HOLD LEFT MOUSE TO FIRE');}
function openSettings(fromPause=false){settingsFromPause=fromPause;if(fromPause)$('pause-dialog').close();showDialog('settings-dialog');}
function settingsClosed(){if(settingsFromPause&&sim.state==='paused'){settingsFromPause=false;showDialog('pause-dialog');}}
function openArsenal(){
  if(!['menu','playing','extracting'].includes(sim.state))return;
  arsenalReturn=sim.state;if(sim.state!=='menu')sim.pause();renderArsenal();showDialog('arsenal-dialog');
}
function applyArsenal(keys){if(arsenalReturn==='menu'){equipped=normalizeLoadout(keys);loadout=equipped[0];updateLoadout();}else sim.setLoadout(keys);renderArsenal();}
function renderArsenal(){
  const selected=arsenalReturn==='menu'?equipped:sim.player.equipped;
  const portraits=armoryPreviews(Object.keys(WEAPONS).map(key=>[key,weaponTier(arsenalReturn==='menu'?null:sim.player,key)]));
  const focusId=document.activeElement?.id,melee=WEAPONS[selected[0]].melee;
  $('arsenal-count').textContent=melee?'BLADE STANCE · +22% MOVEMENT · 1.1s DODGE · COMBO RECOVERY':`${selected.length} / 2 FIREARMS · INDEPENDENT MAGAZINES`;
  $('arsenal-slots').innerHTML='<label>RIGHT / MAIN HAND<select id="main-hand" aria-label="Main hand weapon"></select></label><label>LEFT / OFF HAND<select id="off-hand" aria-label="Off hand weapon"></select></label>';
  const main=$('main-hand'),off=$('off-hand');for(const [key,w]of Object.entries(WEAPONS)){main.add(new Option(w.name+' / '+w.label,key));if(!w.melee)off.add(new Option(w.name+' / '+w.label,key));}off.add(new Option('EMPTY / SINGLE WEAPON',''),0);main.value=selected[0];off.value=selected[1]||'';off.disabled=melee;
  main.onchange=()=>applyArsenal([main.value,...(selected[1]?[selected[1]]:[])]);off.onchange=()=>applyArsenal([selected[0],...(off.value?[off.value]:[])]);
  const combos=weaponSynergies(selected);$('arsenal-synergies').textContent=combos.length?combos.map(s=>`${s.name} — ${s.description}`).join('  /  '):'TRY A PAIR: CINDER + VOLTA · M12 + LONGSHOT · AR-26 + JUDGEMENT · THUMPER + VX-9';
  $('arsenal-grid').replaceChildren(...Object.entries(WEAPONS).map(([key,w],i)=>{const b=document.createElement('button'),progress=masteryProgress(arsenalReturn==='menu'?null:sim.player,key),finish=WEAPON_FINISHES[key],stats=weaponStats(arsenalReturn==='menu'?{}:sim.player,key);b.className='arsenal-choice';b.id=`weapon-choice-${key}`;const isSelected=selected.includes(key);b.setAttribute('aria-pressed',String(isSelected));b.innerHTML=`<span class="arsenal-key">${isSelected?`EQUIPPED${selected.filter(k=>k===key).length===2?' ×2':''}`:String(i+1).padStart(2,'0')}</span>${portraits.has(`${key}:${progress.tier}`)?`<img class="weapon-portrait" src="${portraits.get(`${key}:${progress.tier}`)}" alt="${w.name}, ${TIER_NAMES[progress.tier]} model" width="400" height="180">`:`<span class="weapon-symbol ${key}" aria-hidden="true"></span>`}<small>${w.label} / ${TIER_MARKS[progress.tier]} ${TIER_NAMES[progress.tier]}</small><b>${progress.tier===3?finish.signature:w.name}</b><p>${w.description}</p><span class="evolution-track" aria-hidden="true"><i style="width:${progress.progress*100}%"></i></span><span class="evolution-note">${progress.next?`${Math.ceil(progress.next-progress.xp)} DAMAGE TO ${TIER_MARKS[progress.tier+1]} · ${finish.mods[progress.tier]}`:finish.feature}</span><span class="arsenal-spec">${w.melee?'THREE-HIT COMBO <i> / </i> NO AMMO':`${stats.magazine} ROUNDS <i> / </i> ${stats.reload.toFixed(1)}s RELOAD`}<br>${Math.round(criticalChance(arsenalReturn==='menu'?{}:sim.player,key,stats.tier)*100)}% CRIT · ×${(2+(arsenalReturn==='menu'?0:sim.player.critPower||0)).toFixed(2)} DAMAGE</span>`;b.onclick=()=>{
    applyArsenal(toggleLoadout(selected,key));
  };return b;}));
  if(focusId)$(focusId)?.focus();
}
function updateLoadout(){$('loadout-label').textContent=`LOADOUT / ${equipped.map(k=>WEAPONS[k].name).join(' + ')}`;document.querySelectorAll('[data-loadout]').forEach(btn=>{const selected=equipped.includes(btn.dataset.loadout);btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});}
function selectLoadout(key){loadout=key;equipped=normalizeLoadout([key,...equipped.slice(1)]);updateLoadout();}
function openCamp(){renderCamp();showDialog('camp-dialog');}
function renderCamp(){
  $('camp-balance').textContent=`${record.scrap} SCRAP AVAILABLE`;
  $('camp-upgrades').replaceChildren(...META_UPGRADES.map(u=>{const rank=record.meta[u.id]||0,cost=metaCost(rank),b=document.createElement('button');b.className='camp-upgrade';b.disabled=rank>=u.max||record.scrap<cost;b.innerHTML=`<small>RANK ${rank} / ${u.max}</small><b>${u.name}</b><p>${u.description}</p><span>${rank>=u.max?'MAXED':`${cost} SCRAP →`}</span>`;b.onclick=()=>{if(record.scrap<cost||rank>=u.max)return;record.scrap-=cost;record.meta[u.id]=rank+1;save('zb-quarantine-record',record);renderCamp();recordUI();};return b;}));
}
function cycleWeapon(direction=1){if(!['playing','extracting'].includes(sim.state))return;const keys=Object.keys(WEAPONS),p=sim.player,next=keys[(keys.indexOf(p.equipped[0])+direction+keys.length)%keys.length];sim.setLoadout([next,...p.equipped.slice(1)]);toast(`RIGHT HAND · ${WEAPONS[next].name}`);}

function finish(){
  if(resultSaved)return;resultSaved=true;const won=sim.state==='victory';record.score=Math.max(record.score||0,sim.score);record.wins=(record.wins||0)+(won?1:0);const earned=sim.kills*2+Math.max(0,sim.wave-1)*20+sim.district*100+(won?400:0);record.scrap+=earned;$('result-reward').textContent=`+${earned} SCRAP RECOVERED · SPEND IT AT BASE CAMP`;save('zb-quarantine-record',record);
  $('result-kicker').textContent=won?'OPERATION COMPLETE / EXTRACTION CONFIRMED':`END OF TRANSMISSION / WAVE ${String(sim.wave).padStart(2,'0')}`;
  $('result-title').textContent=won?'You made it out.':'One last stand.';
  $('result-copy').textContent=won?'Eight biomes. Eight fallen monsters. You made it through the quarantine.':'The streets keep their secrets. You know them a little better now.';
  $('result-score').textContent=sim.score.toLocaleString('en-US');$('result-kills').textContent=sim.kills;$('result-time').textContent=formatTime(sim.time);showDialog('result-dialog');
}
function openMap(){if(!['playing','extracting','menu'].includes(sim.state))return;mapReturn=sim.state;if(sim.state!=='menu')sim.pause();controllerMap?.open();$('atlas-places').replaceChildren(...[...(sim.layout.landmarks||[]),...(sim.streetEvents||[]).map(j=>({...j,name:`${j.state==='complete'?'✓ ':''}${j.name}`}))].map(place=>{const b=document.createElement('button');b.textContent=`${sim.visited.has(place.name)?'✓ ':''}${place.name}`;b.onclick=()=>{sim.player.waypoint={x:place.x,z:place.z};controllerMap.view.x=place.x;controllerMap.view.z=place.z;controllerMap.draw();$('atlas-help').textContent=`DESTINATION: ${place.name} · FOLLOW THE GOLD LINE`};return b;}));showDialog('map-dialog');controllerMap.open();}
function formatTime(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;}
function processEvents(){for(const e of sim.events){if(e.type==='district'){rebuildMap();sim.setBuildings(world.buildingTargets);announce(`DISTRICT ${e.district+1} / ${DISTRICTS.length}`,DISTRICTS[e.district].name);}world.onEvent(e);audio.event(e);if(e.type!=='explosion'||distance(e,sim.player)<20)haptics?.event(e);
  if(e.type==='wave')announce(`${sim.layout.city?'CITY THREAT':DISTRICTS[sim.district].name} · WAVE ${String(e.wave).padStart(2,'0')} / ${TOTAL_WAVES}`,e.wave%4===0?DISTRICTS[sim.district].boss:WAVE_NAMES[(e.wave-1)%WAVE_NAMES.length]);
  if(e.type==='street-job'||e.type==='street-complete')toast(`${e.name} · ${e.message}`);if(e.type==='vehicle')toast(e.message);if(e.type==='discovery')toast(`${e.name} DISCOVERED · +2 GRENADES · +25 HEALTH`);
  if(e.type==='evolution')toast(`${WEAPONS[e.weapon].name} EVOLVED · ${TIER_MARKS[e.tier]} ${e.tier===3?e.name:TIER_NAMES[e.tier]}`);
  if(e.type==='combo')toast(`${e.name} · ${e.description.toUpperCase()}`);
  if(e.type==='boss-attack')toast(`${e.name} · ${e.attack==='warden'?'CHARGE / GROUND SLAM':e.attack==='dredger'?'SHRAPNEL BARRAGE':e.attack==='bloom'?'THE BROOD AWAKENS':'FURNACE ERUPTION'}`);
  if(e.type==='hurt'){$('damage-flash').style.opacity=settings.reducedMotion?.15:.55;}
  if(e.type==='powerup')toast(`${e.name} · ${e.description.toUpperCase()}`);
  if(e.type==='extraction'){announce('THE STREETS ARE CLEAR','GET TO EXTRACTION');toast('NORTH CURB · HOLD THE GREEN CIRCLE FOR 4 SECONDS');}
  if(e.type==='upgrade'){
    renderUpgrades(sim,id=>{if(sim.chooseUpgrade(id)){$('upgrade-dialog').close();input.clear();$('game').focus();}},()=>sim.rerollUpgrades());$('build-synergies').textContent=[...weaponSynergies(sim.player.equipped),...synergies(sim.player)].map(s=>s.name).join('  /  ')||'BUILD SYNERGIES: FIRE + FROST · CRITICAL + PIERCING · REGEN + KILL HEALING';showDialog('upgrade-dialog');
  }
  if(e.type==='dead'||e.type==='victory')finish();
}sim.events=[];}
function hud(){const p=sim.player,w=weaponStats(p);
  $('street-job').hidden=!sim.layout.city;const job=streetStatus(sim);$('street-job-name').textContent=job.title;$('street-job-detail').textContent=job.detail;
  $('health-number').textContent=`${Math.ceil(p.health)} / ${p.maxHealth}`;$('health-fill').style.width=`${p.health/p.maxHealth*100}%`;$('health-fill').style.background=p.health/p.maxHealth<.3?'var(--danger)':'var(--green)';
  $('wave-label').textContent=`WAVE ${String(sim.wave).padStart(2,'0')} / ${TOTAL_WAVES}`;
  $('objective').textContent=sim.state==='extracting'?`EXTRACTION ${Math.floor(sim.extraction/4*100)}%`:`${Math.max(0,(sim.toSpawn||0)+sim.enemies.length)} HOSTILES REMAINING`;
  $('wave-fill').style.width=`${sim.state==='extracting'?sim.extraction/4*100:(sim.waveKills||0)/(sim.waveTotal||1)*100}%`;
  $('score').textContent=String(sim.score).padStart(6,'0');$('weapon-name').textContent=`${w.name} / ${TIER_MARKS[w.tier]} ${w.tier===3?WEAPON_FINISHES[p.weapon].signature:TIER_NAMES[w.tier]}`;
  $('ammo').innerHTML=w.melee?`COMBO <small>${sim.time-(p.lastSwing??-99)<1.3?p.swingCombo+1:1} / 3</small>`:`${p.magazines[p.weapon]} <small>/ ${magazineSize(p)}</small>`;
  const mastery=masteryProgress(p,p.weapon);$('mastery-fill').style.width=`${mastery.progress*100}%`;$('mastery-track').setAttribute('aria-valuenow',String(Math.round(mastery.progress*100)));$('mastery-track').setAttribute('aria-label',`${w.name} mastery: ${TIER_NAMES[w.tier]}, ${mastery.next?Math.ceil(mastery.next-mastery.xp)+' damage to next evolution':'maximum tier'}`);
  const attack=p.meleeAttack,attackAge=attack?sim.time-attack.started:0;
  $('reload-label').textContent=w.melee?(attack?(attackAge<attack.timing.contact?'WIND-UP':attackAge<attack.timing.cutEnd?'SLASH':p.weaponTimers[p.weapon]<=.18?'TAP TO CHAIN':'RECOVERING'):'HOLD ATTACK TO COMBO'):p.reload>0?`RELOADING ${p.reload.toFixed(1)}s`:auto?'AUTO TARGETING':'MANUAL AIM';
  $('reload-fill').style.width=w.melee&&attack?`${Math.min(100,attackAge/attack.timing.duration*100)}%`:p.reload>0?`${(1-p.reload/p.reloadTotal)*100}%`:'0%';$('hud-gun').className=`weapon-symbol ${p.weapon==='carbine'?'rifle':p.weapon}`;
  $('dash-state').textContent=p.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'READY';$('dash-action').classList.toggle('cooldown',p.dashCooldown>0);
  $('melee-action').disabled=!w.melee;$('melee-state').textContent=!w.melee?'BLADE ONLY':p.weaponTimers[p.weapon]>.18?'SWING':p.weaponTimers[p.weapon]>0?'CHAIN':'READY';$('melee-action').classList.toggle('cooldown',(p.weaponTimers[p.weapon]||0)>.18);
  $('grenade-state').textContent=`× ${p.grenades}`;$('combo').hidden=sim.combo<3;$('combo').textContent=`${sim.combo} KILL STREAK`;
  drawAtlas($('minimap'),sim);const vehicle=sim.props.find(v=>v.id===p.vehicleId),nearCar=sim.props.find(v=>v.driveable&&v.health>0&&distance(v,p)<5);$('vehicle-action').hidden=!vehicle&&!nearCar;$('vehicle-action').innerHTML=vehicle?'EXIT VEHICLE <b>V</b>':'ENTER VEHICLE <b>V</b>';$('vehicle-status').textContent=vehicle?`${vehicle.vehicleName} · ${Math.round(Math.abs(vehicle.speed||0)*3.6)} KM/H · ${Math.ceil(vehicle.health/vehicle.maxHealth*100)}% HULL`:p.waypoint?`DESTINATION ${Math.round(distance(p,p.waypoint))} m`:sim.layout.city?'FREE ROAM · M MAP':'';
  $('district-hud').textContent=sim.layout.city?`${[...sim.layout.landmarks].sort((a,b)=>distance(a,p)-distance(b,p))[0].name} / OPEN CITY`:`${DISTRICTS[sim.district].name} / DISTRICT ${sim.district+1} OF ${DISTRICTS.length}`;$('equipped-hud').textContent=p.equipped.map((k,i)=>{const slot=slotKey(p.equipped,k,i);return `${WEAPONS[k].name} ${WEAPONS[k].melee?'BLADE':p.magazines[slot]}${p.reloads[slot]>0?' ↻':''}`;}).join('  ·  ');
  const buffs=[p.shield>0?`ARMOUR ${Math.ceil(p.shield)}`:'',p.overdrive>0?`OVERDRIVE ${Math.ceil(p.overdrive)}s`:'',p.freeze>0?`COLD FRONT ${Math.ceil(p.freeze)}s`:'',p.doubleScore>0?`BOUNTY ×2 ${Math.ceil(p.doubleScore)}s`:''].filter(Boolean);$('active-powers').replaceChildren(...buffs.map(text=>{const tag=document.createElement('span');tag.textContent=text;return tag;}));
  const boss=sim.enemies.find(e=>e.type==='boss');if(boss)$('boss-name').textContent=`${boss.bossName}${boss.health<boss.maxHealth*.5?' / ENRAGED':''}`;$('boss-hud').hidden=!boss||settings.enemyHealthBars===false;if(boss){$('boss-percent').textContent=`${Math.ceil(boss.health/boss.maxHealth*100)}%`;$('boss-fill').style.width=`${boss.health/boss.maxHealth*100}%`;}
}
function loop(now){input.pollGamepad(sim,now);dualsense?.update(sim,input,now);const delta=Math.min(.1,(now-last)/1000);last=now;
  if(['playing','extracting'].includes(sim.state)){
    accumulator=Math.min(.15,accumulator+delta);const frame=input.consume(world,auto,sim);
    if(frame.destination){if(distance(sim.player,frame.destination)<.3)input.destination=null;else{const dest=sim.blocked(sim.player,frame.destination,.48)?sim.navigate(sim.player,frame.destination):frame.destination;if(dest){const d=distance(sim.player,dest)||1;frame.x=(dest.x-sim.player.x)/d;frame.z=(dest.z-sim.player.z)/d;}}}
    let once=true;
    while(accumulator>=1/60){sim.update(1/60,once?frame:{...frame,dash:false,melee:false,grenade:false,reload:false,interact:false,weapon:null});once=false;accumulator-=1/60;}
    if(once)Object.assign(input.once,{dash:frame.dash,melee:frame.melee,grenade:frame.grenade,reload:frame.reload,interact:frame.interact,weapon:frame.weapon});
  }else accumulator=0;
  processEvents();if(now-lastHud>80){hud();controllerUI?.update(sim,world,auto);touchUI?.update(sim,world,auto);lastHud=now;}
  frameCount++;if(now-lastFps>1000){fps=Math.round(frameCount*1000/(now-lastFps));frameCount=0;lastFps=now;if(import.meta.env.DEV){$('game').dataset.fps=fps;$('game').dataset.diagnostics=JSON.stringify({seed:sim.seed,state:sim.state,x:+sim.player.x.toFixed(2),z:+sim.player.z.toFixed(2),weapon:sim.player.weapon,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,props:sim.obstacles.length,effects:world.effects.length,geometries:world.renderer.info.memory.geometries});}}
  if(now>noticeUntil)$('announcement').classList.remove('show');if(now>toastUntil)$('toast').textContent='';
  $('damage-flash').style.opacity=Math.max(0,parseFloat($('damage-flash').style.opacity||0)-delta*2);
  world.update(sim,delta,sim.state==='menu');audio.update(sim.time,['playing','extracting'].includes(sim.state),sim.props.find(v=>v.id===sim.player.vehicleId));
  requestAnimationFrame(loop);
}
try{
  await loadingStage(55,'Building Saint-Roch');
  rebuildMap();$('new-map').onclick=reshuffle;$('new-map-mobile').onclick=reshuffle;input=new Input($('game'),action=>{if(action==='pause')togglePause();if(action==='auto'&&['playing','extracting'].includes(sim.state))toggleAuto();if(action==='arsenal')openArsenal();if(action==='map')openMap();if(action==='nextWeapon')cycleWeapon(1);if(action==='prevWeapon')cycleWeapon(-1);},settings);
  haptics=new Haptics(input,settings);dualsense=new DualSense(settings);input.onStopFeedback=()=>{haptics.stop();dualsense.stop();};controllerUI=new ControllerUI(input,settings,haptics,dualsense,()=>save('zb-quarantine-settings',settings),toggleAuto);controllerMap=new ControllerMap(()=>sim,input);input.onMapInput=(pad,dt)=>controllerMap.poll(pad,dt);$('vehicle-world-prompt').onclick=()=>{input.once.interact=true;};window.addEventListener('pagehide',()=>{haptics.stop();dualsense.disconnect();});
  touchUI=new TouchUI(input,settings,()=>save('zb-quarantine-settings',settings));
  $('touch-arsenal').onclick=openArsenal;$('touch-auto').onclick=()=>toggleAuto();
  $('run-mode').onchange=()=>{runMode=$('run-mode').value;reshuffle();};$('skin-select').value=skin;$('skin-select').onchange=()=>{skin=$('skin-select').value;settings.skin=skin;save('zb-quarantine-settings',settings);sim.player.skin=skin;};$('map-action').onclick=openMap;$('map-done').onclick=()=>$('map-dialog').close();$('map-dialog').addEventListener('close',()=>{if(mapReturn&&mapReturn!=='menu'&&sim.state==='paused')resume();mapReturn=null;});$('vehicle-action').onclick=()=>{input.once.interact=true;};
  $('open-camp').onclick=openCamp;$('camp-done').onclick=()=>$('camp-dialog').close();$('arsenal-done').onclick=()=>$('arsenal-dialog').close();
  $('open-arsenal').onclick=openArsenal;$('arsenal-action').onclick=openArsenal;$('arsenal-dialog').addEventListener('close',()=>{if(arsenalReturn&&arsenalReturn!=='menu'&&sim.state==='paused')resume();arsenalReturn=null;});
  $('start').onclick=start;$('retry').onclick=start;$('result-menu').onclick=menu;$('quit').onclick=menu;$('resume').onclick=resume;$('pause').onclick=togglePause;$('auto-action').onclick=()=>toggleAuto();
  $('open-guide').onclick=()=>showDialog('guide-dialog');$('guide-done').onclick=()=>$('guide-dialog').close();
  $('open-settings').onclick=()=>openSettings();$('pause-settings').onclick=()=>openSettings(true);$('settings-done').onclick=()=>$('settings-dialog').close();$('settings-dialog').addEventListener('close',settingsClosed);
  for(const id of ['pause-dialog','upgrade-dialog','result-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();if(id==='pause-dialog')resume();});
  document.querySelectorAll('[data-loadout]').forEach(b=>b.onclick=()=>selectLoadout(b.dataset.loadout));
  for(const[id,action]of [['dash-action','dash'],['melee-action','melee'],['grenade-action','grenade'],['touch-reload','reload'],['touch-dash','dash'],['touch-grenade','grenade']])$(id).onclick=()=>{if(['playing','extracting'].includes(sim.state))input.once[action]=true;};
  $('touch-switch').onclick=()=>{cycleWeapon(1);};
  $('difficulty').value=settings.difficulty;$('quality').value=settings.quality;$('volume').value=settings.volume;$('reduced-motion').checked=settings.reducedMotion;$('gore').checked=settings.gore;
  const combatSettings={'damage-numbers':'damageNumbers','enemy-health-bars':'enemyHealthBars','critical-callouts':'criticalCallouts','damage-colors':'damageColors'};
  for(const [id,key]of Object.entries(combatSettings))$(id).checked=settings[key]!==false;
  function updateSettings(){for(const [id,key]of Object.entries(combatSettings))settings[key]=$(id).checked;settings.difficulty=$('difficulty').value;settings.quality=$('quality').value;settings.volume=Number($('volume').value);settings.reducedMotion=$('reduced-motion').checked;settings.gore=$('gore').checked;save('zb-quarantine-settings',settings);world.applySettings(settings);audio.setVolume(settings.volume/100);}
  for(const id of ['difficulty','quality','volume','reduced-motion','gore',...Object.keys(combatSettings)])$(id).addEventListener('input',updateSettings);
  window.addEventListener('resize',()=>world.resize());
  const focusLost=()=>{if(['playing','extracting'].includes(sim.state)){sim.pause();showDialog('pause-dialog');}input.clear();};
  window.addEventListener('blur',focusLost);document.addEventListener('visibilitychange',()=>{if(document.hidden)focusLost();});
  $('game').addEventListener('webglcontextlost',e=>{e.preventDefault();focusLost();$('error-detail').textContent='The graphics connection was interrupted. Reload to start a fresh run.';$('error').hidden=false;});
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('controllerQA')){const {installControllerQA}=await import('../dev/controller-qa.js');installControllerQA(input,()=>sim);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('touchQA')){const {installTouchQA}=await import('../dev/touch-qa.js');installTouchQA(input,()=>sim);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('upgradeQA')){const {installUpgradeQA}=await import('../dev/upgrade-qa.js');installUpgradeQA(input,()=>sim);}
  recordUI();world.applySettings(settings);world.update(sim,0,true);await loadingStage(88,'Warming lights, materials and controls');if(world.renderer.compileAsync)await world.renderer.compileAsync(world.scene,world.camera);last=performance.now();requestAnimationFrame(loop);
  // Read-only diagnostics for local QA. No gameplay mutation surface is exposed.
  if(import.meta.env.DEV)Object.defineProperty(window,'zombieBagarre',{get:()=>({state:sim.state,wave:sim.wave,kills:sim.kills,score:sim.score,time:sim.time,player:{...sim.player},enemyCount:sim.enemies.length,remaining:sim.toSpawn,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,mode:sim.mode,visited:[...sim.visited],version:'4.13.0'})});
}catch(error){console.error(error);$('error-detail').textContent='WebGL is needed to render Saint-Roch. Enable hardware acceleration or try a browser with WebGL support.';$('error').hidden=false;}
