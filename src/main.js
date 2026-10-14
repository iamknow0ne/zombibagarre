import {RetroArcade} from './rebuild/RetroArcade.js';
let retroArcade;
import {completeRegionTravel} from './rebuild/Regions.js';
import './rebuild/regions.css';
import {RegionUI,REGION_SAVE_POLICY} from './rebuild/RegionUI.js';
let regionUI;
import {SettingsUI} from './rebuild/SettingsUI.js';
import {keyboardHint} from './rebuild/KeyboardBindings.js';
import {activeGameplay} from './rebuild/GameplayContext.js';
import {InteriorUI} from './rebuild/InteriorUI.js';
import {interactRoom} from './rebuild/RPG.js';
import './rebuild/interiors.css';
let interiorUI;
import {advanceFixedStep} from './rebuild/FixedStepInput.js';
import {perspectiveSettings} from './rebuild/PerspectiveSettings.js';
import {PerspectiveUI} from './rebuild/PerspectiveUI.js';
import './rebuild/perspective.css';
import {goreSettings,goreLabel} from './rebuild/Gore.js';
import {desktopDefaults} from './rebuild/DesktopProfile.js';
import {installDesktopUI} from './rebuild/DesktopUI.js';
import './rebuild/desktop.css';
const desktop=window.bagarreDesktop;
let desktopUI;
import {endFocus} from './rebuild/BulletTime.js';
import {BulletTimeUI} from './rebuild/BulletTimeUI.js';
import './rebuild/bullet-time.css';
import {WeaponWheel,cycleHand,WHEEL_TIME_SCALE} from './rebuild/WeaponWheel.js';
import {installFullscreen} from './rebuild/Fullscreen.js';
import './rebuild/weapon-wheel.css';
import {weatherSettings,weatherLabel,updateWeather} from './rebuild/Weather.js';
import {LoreUI} from './rebuild/LoreUI.js';
import {displaySettings,WORLD_LORE} from './rebuild/DisplaySettings.js';
import './rebuild/controller.css';
import {weaponLock,throwableLock,permittedLoadout,canDualWield,enforceProgression,testing} from './rebuild/Progression.js';
import {decorateMenus} from './rebuild/MenuPolish.js';
import {THROWABLES} from './rebuild/Throwables.js';
import {navigationRoute} from './rebuild/QuestNavigation.js';
import {RenderSchedule} from './rebuild/RenderSchedule.js';
const renderSchedule=new RenderSchedule();
import {updateBossHUD} from './rebuild/BossUI.js';
import './rebuild/bosses.css';
import {applyProfile,RELICS} from './rebuild/RPG.js';
import {RPGUI} from './rebuild/RPGUI.js';
import './rebuild/rpg.css';
import {renderUpgrades} from './rebuild/UpgradeUI.js';
import {bindTouchAction} from './rebuild/TouchControls.js';
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
import {normalizeLoadout,toggleLoadout} from './rebuild/Loadout.js';
import {drawAtlas,atlasPoint} from './rebuild/Atlas.js';
import {insideMap} from './rebuild/Map.js';
import './rebuild/style.css';
import './rebuild/touch.css';
import './rebuild/upgrades.css';
import './rebuild/atlas.css';
import './rebuild/progression.css';
import './rebuild/mobile-polish.css';
import {SaveStore,LEGACY_KEYS,SAVE_KEY} from './rebuild/SaveStore.js';
import {SaveUI} from './rebuild/SaveUI.js';
import './rebuild/save.css';
import './rebuild/settings.css';
import {updateInputLayout} from './rebuild/HUDPresentation.js';
import {FieldMessages,compactFieldMessage} from './rebuild/FieldMessages.js';
const fieldMessages=new FieldMessages();
import { Simulation } from './rebuild/Simulation.js';
import { World } from './rebuild/World.js';
import { Input } from './rebuild/Input.js';
import { Audio } from './rebuild/Audio.js';
import { WEAPONS, weaponStats, WAVE_NAMES, distance, lineBlocked, magazineSize, TOTAL_WAVES, DISTRICTS, META_UPGRADES, metaCost, synergies, weaponSynergies, SKINS, pointBlocked } from './rebuild/config.js';

const $=id=>document.getElementById(id);
const qaSession=import.meta.env.DEV&&['retroQA','regionQA','interiorQA','playQA','controllerQA','touchQA','upgradeQA','rpgQA','bossQA','perspectiveQA'].some(k=>new URLSearchParams(location.search).has(k));
const saveStore=new SaveStore(()=>localStorage,{ephemeral:qaSession});
let saveUI,settingsUI;
function save(key,value){const field=Object.keys(LEGACY_KEYS).find(k=>LEGACY_KEYS[k]===key);saveStore.set(field,value);}
function persistNow(){save('zb-rpg-profile',sim.profile);saveStore.flush();}
const defaults={bulletTime:true,focusCinematics:true,questGuidance:true,visualStyle:'classic',progression:'sandbox',progressionPopups:true,volume:45,quality:matchMedia('(pointer:coarse)').matches?'balanced':'high',difficulty:'standard',gore:true,damageNumbers:true,enemyHealthBars:true,criticalCallouts:true,damageColors:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
const stored=saveStore.read('settings');const settings={...defaults,...desktopDefaults(desktop),...(stored&&typeof stored==='object'?stored:{})};
if(!['sandbox','hero'].includes(settings.progression))settings.progression='sandbox';
if(!['classic','pixel'].includes(settings.visualStyle))settings.visualStyle='classic';
if(!['high','balanced','low'].includes(settings.quality))settings.quality=defaults.quality;
if(!['relaxed','standard','nightmare'].includes(settings.difficulty))settings.difficulty=defaults.difficulty;
Object.assign(settings,goreSettings(stored),perspectiveSettings(settings),controlSettings(settings),displaySettings(settings),weatherSettings(settings));
const perspectiveQA=import.meta.env.DEV&&new URLSearchParams(location.search).has('perspectiveQA');
if(perspectiveQA)Object.assign(settings,{quality:'balanced',viewMode:'third',dayCycle:'day',weatherMode:'clear'});
settings.volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(100,settings.volume)):45;
let record=saveStore.read('record');
let rpgProfile=saveStore.read('profile'),rpgUI;
let equippedThrowable=Object.hasOwn(THROWABLES,settings.throwable)?settings.throwable:'frag';
let equipped=rpgProfile.relic?[RELICS[rpgProfile.relic].base]:['carbine'];let runMode=perspectiveQA?'campaign':'city',skin=SKINS.some(s=>s.id===settings.skin)?settings.skin:'scout',mapReturn=null;
await loadingStage(28,'Charting streets and escape routes');
const freshSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
let sim=new Simulation({seed:freshSeed(),mode:runMode,skin,profile:rpgProfile,progression:settings.progression,environment:settings}),world,input,audio=new Audio(settings.volume/100),loadout=equipped[0],auto=settings.autoFire,last=performance.now(),accumulator=0,noticeUntil=0,toastUntil=0,resultSaved=false;
equipped=permittedLoadout(sim,equipped);loadout=equipped[0];
if(throwableLock(sim,equippedThrowable))equippedThrowable='frag';
let controllerUI,controllerMap,haptics,dualsense,touchUI,loreUI,bulletTimeUI,perspectiveUI;
let loreFromPause=false;
let settingsFromPause=false,arsenalReturn=null,lastHud=0,frameCount=0,lastFps=performance.now(),fps=0;
function recordUI(){$('scrap-total').textContent=`${record.scrap} SCRAP`; $('best-score').textContent=record.score?Math.round(record.score).toLocaleString('en-US'):'—';$('record-detail').textContent=record.wins?`${record.wins} SUCCESSFUL EXTRACTION${record.wins===1?'':'S'}`:record.score?'STILL LOOKING FOR A WAY OUT':'YOUR STORY STARTS HERE';}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function showDialog(id){input?.clear();if(id==='pause-dialog')persistNow();if(id==='pause-dialog'){$('resume').textContent=sim.interior?'BACK TO THE SHELTER':'BACK TO THE FIGHT';$('pause-dialog').querySelector('h2 + p').textContent=sim.interior?'Outdoor time is frozen. Your hero is saved; reloading starts a fresh expedition outside.':REGION_SAVE_POLICY;const p=sim.player,job=sim.layout.country?{title:'OLD MILL ROAD',detail:'Regional footpath · city wave is frozen'}:streetStatus(sim),lines=[weatherLabel(sim.weather)+(sim.weather.night?' · NIGHT CONTRACTS OPEN':''),`${sim.layout.country?'COUNTRY ROUTE':`WAVE ${sim.wave} / ${TOTAL_WAVES}`} · ${sim.toSpawn+sim.enemies.filter(e=>e.health>0).length} HOSTILES`,`SCORE ${sim.score.toLocaleString('en-US')} · ${sim.kills} KILLS · ${formatTime(sim.time)}`,p.equipped.map(k=>{const m=masteryProgress(p,k);return `${WEAPONS[k].name} / ${TIER_NAMES[m.tier]}${m.next?` · ${Math.ceil(m.next-m.xp)} DAMAGE TO EVOLVE`:''}`;}).join(' / '),[p.shield>0?`ARMOUR ${Math.ceil(p.shield)}`:'',p.overdrive>0?`OVERDRIVE ${Math.ceil(p.overdrive)}s`:'',p.freeze>0?`COLD FRONT ${Math.ceil(p.freeze)}s`:'',p.doubleScore>0?`BOUNTY ×2 ${Math.ceil(p.doubleScore)}s`:''].filter(Boolean).join(' · '),job?`${job.title} · ${job.detail}`:''];$('pause-readout').replaceChildren(...lines.filter(Boolean).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));if(fieldMessages.items.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='RECENT FIELD MESSAGES';details.append(summary);for(const text of fieldMessages.items){const line=document.createElement('p');line.textContent=text;details.append(line);}$('pause-readout').append(details);}}$(id).showModal();if(id==='pause-dialog')$('resume').focus();}
function announce(kicker,title,boss=false){$('announcement').classList.toggle('boss-announcement',boss);$('announcement-kicker').textContent=kicker;$('announcement-title').textContent=title;$('announcement').classList.add('show');noticeUntil=performance.now()+(boss?2000:3200);}
function toast(text){fieldMessages.add(text);$('toast').dataset.fullText=text;$('toast').textContent=document.body.classList.contains('touch-layout')?compactFieldMessage(text):text;$('toast').setAttribute('aria-label',text);toastUntil=performance.now()+3000;}
function rebuildMap(){world?.destroy();world=new World($('game'),settings,sim.district,sim.layout);world.applySettings(settings);$('map-seed').textContent=`ROUTE ${sim.seed.toString(36).toUpperCase()} / ${sim.layout.shape.toUpperCase()} / ${Math.round(sim.layout.bounds.maxX-sim.layout.bounds.minX)}×${Math.round(sim.layout.bounds.maxZ-sim.layout.bounds.minZ)}`;}
function reshuffle(){let seed=freshSeed();if(runMode==='city'&&sim.layout.city&&(seed&3)===(sim.seed&3))seed=(seed+1)>>>0;sim=new Simulation({seed,mode:runMode,skin,profile:rpgProfile,progression:settings.progression,environment:settings});rebuildMap();}
function start(){fieldMessages.clear();closeDialogs();if(sim.state!=='menu'||world.district!==0||sim.mode!==runMode)reshuffle();else world.clearDynamic();sim=new Simulation({seed:sim.seed,difficulty:settings.difficulty,meta:record.meta,mode:runMode,skin,profile:rpgProfile,progression:settings.progression,environment:settings});sim.start(loadout);sim.player.throwable=throwableLock(sim,equippedThrowable)?'frag':equippedThrowable;sim.setLoadout(equipped);sim.setBuildings(world.buildingTargets);audio.start();audio.lastBeat=0;input.clear();resultSaved=false;accumulator=0;$('menu').hidden=true;$('hud').hidden=false;$('game').focus();toast(world.viewRig.mode!=='diorama'?`PRECISION AIM · RIGHT MOUSE / ${keyboardHint(input.keyboardBindings,'toggleAim')} · OR YOUR CONTROLLER AIM BUTTON / TOUCH TARGET`:(input.source==='touch'?'LEFT THUMB TO MOVE · RIGHT THUMB TO AIM':input.source==='gamepad'?'LEFT STICK TO MOVE':`${['moveUp','moveLeft','moveDown','moveRight'].map(k=>keyboardHint(input.keyboardBindings,k)).join(' / ')} TO MOVE`)+' · AUTO FIRE IS '+(auto?'ON':'OFF'));}
function menu(){closeDialogs();reshuffle();input.clear();$('menu').hidden=false;$('hud').hidden=true;$('damage-flash').style.opacity=0;recordUI();$('start').focus();}
function togglePause(){if(loreUI?.dialog.open){loreUI.dialog.close();return;}if(rpgUI?.dialog.open){rpgUI.dialog.close();return;}if($('map-dialog').open){$('map-dialog').close();return;}if($('arsenal-dialog').open){$('arsenal-dialog').close();return;}if(sim.state==='paused'){if($('settings-dialog').open){$('settings-dialog').close();showDialog('pause-dialog');}else resume();}else if(activeGameplay(sim.state)){sim.pause();showDialog('pause-dialog');}}
function resume(){closeDialogs();sim.resume();input.clear();accumulator=0;$('game').focus();}
function toggleAuto(value){if(world?.viewRig.active&&value===undefined){input.once.toggleAim=true;return;}auto=value??!auto;settings.autoFire=auto;save('zb-quarantine-settings',settings);$('auto-action').setAttribute('aria-pressed',String(auto));toast(auto?'AUTO FIRE ENABLED':input?.source==='touch'?'MANUAL FIRE · DRAG THE RIGHT STICK':input?.source==='gamepad'?'MANUAL FIRE · USE YOUR HAND BUTTONS':'MANUAL AIM · HOLD LEFT MOUSE TO FIRE');}
function openSettings(fromPause=false){settingsFromPause=fromPause;if(fromPause)$('pause-dialog').close();showDialog('settings-dialog');settingsUI?.open();saveUI?.update();}
function settingsClosed(){if(settingsFromPause&&sim.state==='paused'){settingsFromPause=false;showDialog('pause-dialog');}}
function openArsenal(){if(sim.interior){rpgUI.open();return;}
  if(!['menu','playing','extracting','paused'].includes(sim.state))return;
  arsenalReturn=sim.state;if(sim.state==='paused')$('pause-dialog').close();if(sim.state!=='menu')sim.pause();renderArsenal();showDialog('arsenal-dialog');
}
function applyArsenal(keys){if(arsenalReturn==='menu'){equipped=permittedLoadout(sim,keys);loadout=equipped[0];updateLoadout();}else sim.setLoadout(keys);renderArsenal();}
function renderArsenal(){
  const selected=arsenalReturn==='menu'?equipped:sim.player.equipped;
  const portraits=armoryPreviews(Object.keys(WEAPONS).map(key=>[key,weaponTier(arsenalReturn==='menu'?null:sim.player,key)]));
  const focusId=document.activeElement?.id,melee=WEAPONS[selected[0]].melee;
  $('arsenal-count').textContent=(testing(sim)?'TESTING · ALL EQUIPMENT AVAILABLE / ':'HERO PROGRESSION / ')+(melee?'MELEE STANCE · +22% MOVEMENT · 1.1s DODGE · COMBO RECOVERY':`${selected.length} / ${canDualWield(sim)?2:1} FIREARMS · ${canDualWield(sim)?'INDEPENDENT MAGAZINES':'LEARN TWO HANDS, TWO GUNS TO DUAL WIELD'}`);
  $('arsenal-slots').innerHTML='<label>RIGHT / MAIN HAND<select id="main-hand" aria-label="Main hand weapon"></select></label><label>LEFT / OFF HAND<select id="off-hand" aria-label="Off hand weapon"></select></label>';
  const main=$('main-hand'),off=$('off-hand');for(const [key,w]of Object.entries(WEAPONS)){const lock=weaponLock(sim,key),option=new Option(w.name+' / '+(lock||w.label),key);option.disabled=!!lock;main.add(option);if(!w.melee){const other=new Option(w.name+' / '+(lock||w.label),key);other.disabled=!!lock;off.add(other);}}off.add(new Option('EMPTY / SINGLE WEAPON',''),0);main.value=selected[0];off.value=selected[1]||'';off.disabled=melee||!canDualWield(sim);
  main.onchange=()=>applyArsenal([main.value,...(selected[1]?[selected[1]]:[])]);off.onchange=()=>applyArsenal([selected[0],...(off.value?[off.value]:[])]);
  const ordnance=document.createElement('label');ordnance.textContent='THROWABLE / SHARED SUPPLIES';const throwable=document.createElement('select');throwable.id='throwable-select';throwable.setAttribute('aria-label','Equipped throwable');for(const [key,w]of Object.entries(THROWABLES)){const lock=throwableLock(sim,key),option=new Option(w.name+(lock?' / '+lock:''),key);option.disabled=!!lock;throwable.add(option);}throwable.value=arsenalReturn==='menu'?equippedThrowable:sim.player.throwable;ordnance.append(throwable);$('arsenal-slots').append(ordnance);const describe=()=>{$('throwable-description').textContent=THROWABLES[throwable.value].description+' All types use the same ordnance charges. Throw with E / your grenade button. Select here using touch or D-pad.';};throwable.onchange=()=>{equippedThrowable=throwable.value;sim.player.throwable=equippedThrowable;settings.throwable=equippedThrowable;save('zb-quarantine-settings',settings);describe();};describe();
  const combos=weaponSynergies(selected);$('arsenal-synergies').textContent=combos.length?combos.map(s=>`${s.name} — ${s.description}`).join('  /  '):'TRY A PAIR: CINDER + VOLTA · M12 + LONGSHOT · AR-26 + JUDGEMENT · THUMPER + VX-9';
  $('arsenal-grid').replaceChildren(...Object.entries(WEAPONS).map(([key,w],i)=>{const b=document.createElement('button'),progress=masteryProgress(arsenalReturn==='menu'?null:sim.player,key),finish=WEAPON_FINISHES[key],stats=weaponStats(arsenalReturn==='menu'?{}:sim.player,key);b.className='arsenal-choice';b.id=`weapon-choice-${key}`;const lock=weaponLock(sim,key);b.disabled=!!lock;const isSelected=selected.includes(key);b.setAttribute('aria-pressed',String(isSelected));b.innerHTML=`<span class="arsenal-key">${isSelected?`EQUIPPED${selected.filter(k=>k===key).length===2?' ×2':''}`:String(i+1).padStart(2,'0')}</span>${portraits.has(`${key}:${progress.tier}`)?`<img class="weapon-portrait" src="${portraits.get(`${key}:${progress.tier}`)}" alt="${w.name}, ${TIER_NAMES[progress.tier]} model" width="400" height="180">`:`<span class="weapon-symbol ${key}" aria-hidden="true"></span>`}<small>${w.label} / ${TIER_MARKS[progress.tier]} ${TIER_NAMES[progress.tier]}</small><b>${progress.tier===3?finish.signature:w.name}</b><p>${w.description}</p>${lock?`<p class="weapon-lock">${lock} · CHARACTER → SKILLS → ARSENAL</p>`:''}<span class="evolution-track" aria-hidden="true"><i style="width:${progress.progress*100}%"></i></span><span class="evolution-note">${progress.next?`${Math.ceil(progress.next-progress.xp)} DAMAGE TO ${TIER_MARKS[progress.tier+1]} · ${finish.mods[progress.tier]}`:finish.feature}</span><span class="arsenal-spec">${w.melee?'THREE-HIT COMBO <i> / </i> NO AMMO':`${stats.magazine} ROUNDS <i> / </i> ${stats.reload.toFixed(1)}s RELOAD`}<br>${Math.round(criticalChance(arsenalReturn==='menu'?{}:sim.player,key,stats.tier)*100)}% CRIT · ×${(2+(arsenalReturn==='menu'?0:sim.player.critPower||0)).toFixed(2)} DAMAGE</span>`;b.onclick=()=>{
    applyArsenal(toggleLoadout(selected,key));
  };return b;}));
  if(focusId)$(focusId)?.focus();
}
function updateLoadout(){$('loadout-label').textContent=`LOADOUT / ${equipped.map(k=>WEAPONS[k].name).join(' + ')}`;document.querySelectorAll('[data-loadout]').forEach(btn=>{const lock=weaponLock(sim,btn.dataset.loadout);btn.disabled=!!lock;btn.title=lock;const selected=equipped.includes(btn.dataset.loadout);btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});}
function selectLoadout(key){if(weaponLock(sim,key))return;loadout=key;equipped=permittedLoadout(sim,[key,...equipped.slice(1)]);updateLoadout();}
function changeProgression(value){settings.progression=value;sim.progression=value;enforceProgression(sim);equipped=permittedLoadout(sim,equipped);loadout=equipped[0];if(throwableLock(sim,equippedThrowable))equippedThrowable='frag';settings.throwable=equippedThrowable;for(const id of ['progression-mode','progression-setting'])$(id).value=value;save('zb-quarantine-settings',settings);updateLoadout();}
function openCamp(){renderCamp();showDialog('camp-dialog');}
function renderCamp(){
  $('camp-balance').textContent=`${record.scrap} SCRAP AVAILABLE`;
  $('camp-upgrades').replaceChildren(...META_UPGRADES.map(u=>{const rank=record.meta[u.id]||0,cost=metaCost(rank),b=document.createElement('button');b.className='camp-upgrade';b.disabled=rank>=u.max||record.scrap<cost;b.innerHTML=`<small>RANK ${rank} / ${u.max}</small><b>${u.name}</b><p>${u.description}</p><span>${rank>=u.max?'MAXED':`${cost} SCRAP →`}</span>`;b.onclick=()=>{if(record.scrap<cost||rank>=u.max)return;record.scrap-=cost;record.meta[u.id]=rank+1;save('zb-quarantine-record',record);renderCamp();recordUI();};return b;}));
}
function cycleWeapon(direction=1){if(!['playing','extracting'].includes(sim.state)||input?.weaponWheelActive)return;const key=cycleHand(sim,0,direction);if(key)toast(`RIGHT HAND · ${WEAPONS[key].name}`);}

function finish(){
  if(resultSaved)return;resultSaved=true;const won=sim.state==='victory';record.score=Math.max(record.score||0,sim.score);record.wins=(record.wins||0)+(won?1:0);const earned=sim.kills*2+Math.max(0,sim.wave-1)*20+sim.district*100+(won?400:0);record.scrap+=earned;$('result-reward').textContent=`+${earned} SCRAP RECOVERED · SPEND IT AT BASE CAMP`;save('zb-quarantine-record',record);
  $('result-kicker').textContent=won?'OPERATION COMPLETE / EXTRACTION CONFIRMED':`END OF TRANSMISSION / WAVE ${String(sim.wave).padStart(2,'0')}`;
  $('result-title').textContent=won?'You made it out.':'One last stand.';
  $('result-copy').textContent=won?(sim.layout.city?'Saint-Roch survived thirty-two waves. You reached the beacon and made it out.':'Eight biomes. Eight fallen monsters. You made it through the quarantine.'):'The streets keep their secrets. You know them a little better now.';
  $('result-score').textContent=sim.score.toLocaleString('en-US');$('result-kills').textContent=sim.kills;$('result-time').textContent=formatTime(sim.time);showDialog('result-dialog');
}
function openMap(){if(sim.interior){rpgUI.open();rpgUI.tab='journal';rpgUI.render();return;}if(!['playing','extracting','menu','paused'].includes(sim.state))return;mapReturn=sim.state;if(sim.state==='paused')$('pause-dialog').close();if(sim.state!=='menu')sim.pause();showDialog('map-dialog');controllerMap.open();}
function formatTime(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;}
function travelRegion(){
  const old=world;
  const result=completeRegionTravel(sim,view=>{
    let candidate;
    try{candidate=new World($('game'),settings,view.district,view.layout);candidate.applySettings(settings);candidate.hydrateRegion(view);candidate.update(view,0);return candidate;}
    catch(error){candidate?.destroy();old.renderer.resetState();old.requestRender=true;throw error;}
  });
  if(!result.ok){result.prepared?.destroy();old.renderer.resetState();old.requestRender=true;return;}
  world=result.prepared;old.destroy();world.renderer.resetState();world.requestRender=true;
  input.clear();input.perspective=false;accumulator=0;
  announce(sim.layout.country?'COUNTRY ROUTE / ON FOOT':'RETURN TO THE CITY',sim.layout.region?.name||'SAINT-ROCH');
  toast(REGION_SAVE_POLICY);
}
function processEvents(){if(!['playing','extracting'].includes(sim.state))endFocus(sim,true);let profileDirty=false;for(const e of sim.events){if(e.type==='region-travel'){input.clear();accumulator=0;regionUI?.update(sim,world);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(sim.state==='travelling'&&sim.pendingTravel)travelRegion();regionUI?.update(sim,world);}));continue;}if(e.type==='interior-console'){retroArcade?.open(e.consoleId);continue;}if(e.type==='interior-interact')interactRoom(sim);if(e.type==='interior-enter'||e.type==='interior-exit'){input.clear();input.perspective=false;accumulator=0;world.requestRender=true;if(document.pointerLockElement)document.exitPointerLock();}if(e.type==='profile')profileDirty=true;if(e.type==='rpg-notice'||e.type==='weather')toast(e.message);if(e.type==='rpg-shop')rpgUI.open(e.id);if(e.type==='district'){rebuildMap();sim.setBuildings(world.buildingTargets);announce(`DISTRICT ${e.district+1} / ${DISTRICTS.length}`,DISTRICTS[e.district].name);}world.onEvent(e);perspectiveUI?.event(e);audio.event(e);dualsense?.event(e);if(e.type!=='explosion'||distance(e,sim.player)<20)haptics?.event(e);
  if(e.type==='wave')announce(`${sim.layout.city?'CITY THREAT':DISTRICTS[sim.district].name} · WAVE ${String(e.wave).padStart(2,'0')} / ${TOTAL_WAVES}`,e.wave%4===0?DISTRICTS[sim.district].boss:WAVE_NAMES[(e.wave-1)%WAVE_NAMES.length]);
  if(e.type==='street-job'||e.type==='street-complete')toast(`${e.name} · ${e.message}`);if(e.type==='vehicle')toast(e.message);if(e.type==='discovery')toast(`${e.name} DISCOVERED · +2 GRENADES · +25 HEALTH`);
  if(e.type==='evolution')toast(`${WEAPONS[e.weapon].name} EVOLVED · ${TIER_MARKS[e.tier]} ${e.tier===3?e.name:TIER_NAMES[e.tier]}`);
  if(e.type==='combo')toast(`${e.name} · ${e.description.toUpperCase()}`);
  if(e.type==='boss-intro'||e.type==='boss-phase')announce(e.subtitle,e.name,true);if(e.type==='boss-defeated')announce('OATH SEVERED',e.name,true);
  if(e.type==='hurt'){$('damage-flash').style.opacity=settings.reducedMotion?.15:.55;}
  if(e.type==='powerup')toast(`${e.name} · ${e.description.toUpperCase()}`);
  if(e.type==='extraction'){announce('THE STREETS ARE CLEAR','GET TO EXTRACTION');toast('NORTH CURB · HOLD THE GREEN CIRCLE FOR 4 SECONDS');}
  if(e.type==='upgrade'){
    renderUpgrades(sim,id=>{if(sim.chooseUpgrade(id)){$('upgrade-dialog').close();input.clear();$('game').focus();}},()=>sim.rerollUpgrades());$('build-synergies').textContent=[...weaponSynergies(sim.player.equipped),...synergies(sim.player)].map(s=>s.name).join('  /  ')||'BUILD SYNERGIES: FIRE + FROST · CRITICAL + PIERCING · REGEN + KILL HEALING';showDialog('upgrade-dialog');
  }
  if(e.type==='dead'||e.type==='victory')finish();
}if(profileDirty){rpgProfile=sim.profile;save('zb-rpg-profile',rpgProfile);}sim.events=[];}
function hud(){const p=sim.player,w=weaponStats(p);$('weather-hud').textContent=weatherLabel(sim.weather);$('weather-hud').title=sim.weather.snowCover>.15?'Snow underfoot · reduced grip':sim.weather.rain>.2?'Rain cools exposed fires · wet enemies conduct electricity':sim.weather.night?'Night contracts open · larger non-boss waves':'Living world · day/night and dynamic weather';
  $('street-job').hidden=!sim.layout.city;const job=sim.layout.country?{title:'OLD MILL SUPPLY YARD',detail:sim.rpg?.countrySupplies?'Medicine recovered · Return to Lenoir':'Clear the yard · Search the medical supplies'}:streetStatus(sim);$('street-job-name').textContent=job.title;$('street-job-detail').textContent=job.detail;
  $('health-number').textContent=`${Math.ceil(p.health)} / ${p.maxHealth}`;$('health-fill').style.width=`${p.health/p.maxHealth*100}%`;$('health-fill').style.background=p.health/p.maxHealth<.3?'var(--danger)':'var(--green)';
  $('wave-label').textContent=sim.layout.country?'COUNTRY ROUTE':`WAVE ${String(sim.wave).padStart(2,'0')} / ${TOTAL_WAVES}`;
  $('objective').textContent=sim.state==='extracting'?`EXTRACTION ${Math.floor(sim.extraction/4*100)}%`:`${Math.max(0,(sim.toSpawn||0)+sim.enemies.length)} HOSTILES REMAINING`;
  $('wave-fill').style.width=`${sim.state==='extracting'?sim.extraction/4*100:(sim.waveKills||0)/(sim.waveTotal||1)*100}%`;
  $('score').textContent=String(sim.score).padStart(6,'0');$('weapon-name').textContent=`${w.name} / ${TIER_MARKS[w.tier]} ${w.tier===3?WEAPON_FINISHES[p.weapon].signature:TIER_NAMES[w.tier]}`;
  $('ammo').innerHTML=w.melee?`COMBO <small>${sim.time-(p.lastSwing??-99)<1.3?p.swingCombo+1:1} / 3</small>`:`${p.magazines[p.weapon]} <small>/ ${magazineSize(p)}</small>`;
  const mastery=masteryProgress(p,p.weapon);$('mastery-fill').style.width=`${mastery.progress*100}%`;$('mastery-track').setAttribute('aria-valuenow',String(Math.round(mastery.progress*100)));$('mastery-track').setAttribute('aria-label',`${w.name} mastery: ${TIER_NAMES[w.tier]}, ${mastery.next?Math.ceil(mastery.next-mastery.xp)+' damage to next evolution':'maximum tier'}`);
  const attack=p.meleeAttack,attackAge=attack?sim.time-attack.started:0;
  $('reload-label').textContent=w.melee?(attack?(attackAge<attack.timing.contact?'WIND-UP':attackAge<attack.timing.cutEnd?'SLASH':p.weaponTimers[p.weapon]<=.18?'TAP TO CHAIN':'RECOVERING'):'HOLD ATTACK TO COMBO'):p.reload>0?`RELOADING ${p.reload.toFixed(1)}s`:world.viewRig?.active?'MANUAL / CAMERA VIEW':auto?'AUTO TARGETING':'MANUAL AIM';
  $('reload-fill').style.width=w.melee&&attack?`${Math.min(100,attackAge/attack.timing.duration*100)}%`:p.reload>0?`${(1-p.reload/p.reloadTotal)*100}%`:'0%';$('hud-gun').className=`weapon-symbol ${p.weapon==='carbine'?'rifle':p.weapon}`;
  $('dash-state').textContent=p.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'READY';$('dash-action').classList.toggle('cooldown',p.dashCooldown>0);
  $('melee-action').disabled=!w.melee;$('melee-state').textContent=!w.melee?'BLADE ONLY':p.weaponTimers[p.weapon]>.18?'SWING':p.weaponTimers[p.weapon]>0?'CHAIN':'READY';$('melee-action').classList.toggle('cooldown',(p.weaponTimers[p.weapon]||0)>.18);
  $('grenade-action').querySelector('span').textContent=THROWABLES[p.throwable||'frag'].short;$('grenade-action').setAttribute('aria-label','Throw '+THROWABLES[p.throwable||'frag'].name);$('grenade-state').textContent=`× ${p.grenades}`;$('combo').hidden=sim.combo<3;$('combo').textContent=`${sim.combo} KILL STREAK`;
  if(!document.body.classList.contains('touch-layout'))drawAtlas($('minimap'),sim);const vehicle=sim.props.find(v=>v.id===p.vehicleId),nearCar=sim.props.find(v=>v.driveable&&v.health>0&&distance(v,p)<5);$('vehicle-action').hidden=!vehicle&&!nearCar;$('vehicle-status').textContent=vehicle?`${vehicle.vehicleName} · ${Math.round(Math.abs(vehicle.speed||0)*3.6)} KM/H · ${Math.ceil(vehicle.health/vehicle.maxHealth*100)}% HULL`:p.waypoint?`DESTINATION ${Math.round(distance(p,p.waypoint))} m`:sim.layout.city?`FREE ROAM · ${keyboardHint(input.keyboardBindings,'map')} MAP`:'';
  document.body.classList.toggle('perspective-play',!!world.viewRig?.active&&['playing','extracting'].includes(sim.state));
  $('district-hud').textContent=sim.layout.country?`${sim.layout.region.name} / COUNTRY`:sim.layout.city?`${[...sim.layout.landmarks].sort((a,b)=>distance(a,p)-distance(b,p))[0].name} / OPEN CITY`:`${DISTRICTS[sim.district].name} / DISTRICT ${sim.district+1} OF ${DISTRICTS.length}`;if(settings.worldTheme==='cyberpunk')$('district-hud').textContent='BLACKOUT 2089 / '+$('district-hud').textContent;
  const buffs=[p.shield>0?`ARMOUR ${Math.ceil(p.shield)}`:'',p.overdrive>0?`OVERDRIVE ${Math.ceil(p.overdrive)}s`:'',p.freeze>0?`COLD FRONT ${Math.ceil(p.freeze)}s`:'',p.doubleScore>0?`BOUNTY ×2 ${Math.ceil(p.doubleScore)}s`:''].filter(Boolean);$('active-powers').replaceChildren(...buffs.map(text=>{const tag=document.createElement('span');tag.textContent=text;return tag;}));
  updateBossHUD(sim,settings);
}
function loop(now){if(retroArcade?.active){last=now;accumulator=0;retroArcade.poll(now);requestAnimationFrame(loop);return;}sim.focusEnabled=settings.bulletTime!==false;input.pollGamepad(sim,now);if(input.weaponWheelActive)endFocus(sim,true);dualsense?.update(sim,input,now);const delta=Math.min(.1,(now-last)/1000);last=now;
  if(activeGameplay(sim.state)){
    accumulator=Math.min(.15,accumulator+delta*(input.weaponWheelActive?WHEEL_TIME_SCALE:1));const frame=input.consume(world,auto,sim,delta);
    if(frame.destination){if(distance(sim.player,frame.destination)<.3)input.destination=null;else{const dest=sim.blocked(sim.player,frame.destination,.48)?sim.navigate(sim.player,frame.destination):frame.destination;if(dest){const d=distance(sim.player,dest)||1;frame.x=(dest.x-sim.player.x)/d;frame.z=(dest.z-sim.player.z)/d;}}}
    accumulator=advanceFixedStep(sim,accumulator,frame,input.once);
  }else accumulator=0;
  processEvents();if(retroArcade?.active){last=now;accumulator=0;requestAnimationFrame(loop);return;}if(now-lastHud>80){updateInputLayout(input,world);hud();controllerUI?.update(sim,world,auto);touchUI?.update(sim,world,auto);perspectiveUI?.update(sim,world);bulletTimeUI?.update(sim);rpgUI?.update();interiorUI?.update(sim,world);regionUI?.update(sim,world);navigationRoute(sim);lastHud=now;}
  if(now-lastFps>1000){fps=Math.round(frameCount*1000/(now-lastFps));frameCount=0;lastFps=now;desktopUI?.performance(fps);if(import.meta.env.DEV){$('game').dataset.fps=fps;$('game').dataset.diagnostics=JSON.stringify({seed:sim.seed,state:sim.state,x:+sim.player.x.toFixed(2),z:+sim.player.z.toFixed(2),weapon:sim.player.weapon,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,props:sim.obstacles.length,effects:world.effects.length,geometries:world.renderer.info.memory.geometries});}}
  if(now>noticeUntil)$('announcement').classList.remove('show');if(now>toastUntil)$('toast').textContent='';
  $('damage-flash').style.opacity=Math.max(0,parseFloat($('damage-flash').style.opacity||0)-delta*2);
  const renderDelta=renderSchedule.next(now,sim.state,document.hidden,world.requestRender,settings.frameLimit);if(renderDelta!==null){world.update(sim,renderDelta*(input.weaponWheelActive?WHEEL_TIME_SCALE:sim.timeScale||1),sim.state==='menu');world.requestRender=false;frameCount++;}audio.update(sim.time,['playing','extracting'].includes(sim.state),sim.props.find(v=>v.id===sim.player.vehicleId),sim.weather,sim.timeScale||1);
  requestAnimationFrame(loop);
}
try{
  await loadingStage(55,'Building Saint-Roch');
  rebuildMap();$('new-map').onclick=reshuffle;$('new-map-mobile').onclick=reshuffle;input=new Input($('game'),action=>{if(action==='character')rpgUI?.open();if(action==='pause')togglePause();if(action==='auto'&&['playing','extracting'].includes(sim.state))toggleAuto();if(action==='arsenal')openArsenal();if(action==='map')openMap();if(action==='nextWeapon')cycleWeapon(1);if(action==='prevWeapon')cycleWeapon(-1);},settings);
  new WeaponWheel(input,()=>sim,toast);installFullscreen();
  perspectiveUI=new PerspectiveUI(input,settings,()=>{world.applySettings(settings);save('zb-quarantine-settings',settings);});
  haptics=new Haptics(input,settings);dualsense=new DualSense(settings);input.onStopFeedback=()=>{haptics.stop();dualsense.stop();endFocus(sim,true);};controllerUI=new ControllerUI(input,settings,haptics,dualsense,()=>save('zb-quarantine-settings',settings),toggleAuto);controllerMap=new ControllerMap(()=>sim,input);input.onMapInput=(pad,dt)=>controllerMap.poll(pad,dt);$('vehicle-world-prompt').onclick=()=>{input.once.interact=true;};window.addEventListener('pagehide',()=>{haptics.stop();dualsense.disconnect();});
  touchUI=new TouchUI(input,settings,()=>save('zb-quarantine-settings',settings));bulletTimeUI=new BulletTimeUI(input,settings,()=>sim,()=>save('zb-quarantine-settings',settings));
  rpgUI=new RPGUI({getSim:()=>sim,getWorld:()=>world,input,persist:()=>{rpgProfile=sim.profile;equipped=permittedLoadout(sim,equipped);loadout=equipped[0];if(throwableLock(sim,equippedThrowable))equippedThrowable='frag';updateLoadout();save('zb-rpg-profile',rpgProfile);},onPause:()=>showDialog('pause-dialog'),onEquipRelic:key=>{equipped=[key];loadout=key;updateLoadout();},onMap:()=>{if(sim.interior){rpgUI.message='Leave the shelter to open the street atlas. Your tracked objective is kept.';rpgUI.render();return;}const origin=rpgUI.returnState;rpgUI.returnState='map';rpgUI.dialog.close();openMap();mapReturn=origin;},onIdentity:key=>{skin=key;settings.skin=key;sim.skin=key;sim.player.skin=key;$('skin-select').value=key;save('zb-quarantine-settings',settings);},onLoadout:keys=>{equipped=[...keys];loadout=keys[0];updateLoadout();}});
  retroArcade=new RetroArcade({getSim:()=>sim,input,audio,volume:()=>settings.volume/100,onReturn:()=>{last=performance.now();accumulator=0;world.requestRender=true;$('game').focus();}});
  regionUI=new RegionUI(input);
  interiorUI=new InteriorUI(input,()=>{rpgUI.open();rpgUI.tab='journal';rpgUI.render();});
  $('pause-arsenal').onclick=openArsenal;$('pause-map').onclick=openMap;$('touch-arsenal').onclick=openArsenal;bindTouchAction($('touch-auto'),input,()=>{if(world.viewRig.active)input.once.toggleAim=true;else toggleAuto();});
  for(const id of ['progression-mode','progression-setting']){$(id).value=settings.progression;$(id).onchange=()=>changeProgression($(id).value);}
  loreUI=new LoreUI({theme:()=>settings.worldTheme,onOpen:()=>input.clear(),onClose:()=>{const returnToPause=loreFromPause;loreFromPause=false;if(returnToPause&&sim.state==='paused')showDialog('pause-dialog');}});
  $('open-lore').onclick=()=>{loreFromPause=false;loreUI.open();};$('pause-lore').onclick=()=>{loreFromPause=true;$('pause-dialog').close();loreUI.open();};
  const saveHost=document.createElement('div');$('settings-dialog').querySelector('h2').after(saveHost);
  saveUI=new SaveUI({store:saveStore,host:saveHost,canRestore:()=>sim.state==='menu',beforeExport:()=>save('zb-rpg-profile',sim.profile),onRestored:()=>location.reload()});
  for(const [host,paused]of [[document.querySelector('.menu-links'),false],[document.querySelector('.pause-tools'),true]]){
   const warning=document.createElement('button');warning.className='save-warning';warning.textContent='SAVE NEEDS ATTENTION';warning.onclick=()=>{openSettings(paused);settingsUI?.select('save');saveUI.panel.open=true;saveUI.panel.scrollIntoView({block:'start'});};host.append(warning);saveStore.subscribe(store=>{warning.hidden=!store.issue;warning.title=store.issue;});
  }
  window.addEventListener('pagehide',persistNow);
  window.addEventListener('storage',event=>{if(event.key===SAVE_KEY||event.key===null){try{saveStore.checkExternal();}catch{}}});
  decorateMenus();document.body.classList.toggle('reduced-motion',settings.reducedMotion);updateLoadout();
  $('run-mode').value=runMode;$('run-mode').onchange=()=>{runMode=$('run-mode').value;reshuffle();};$('skin-select').value=skin;$('skin-select').onchange=()=>{skin=$('skin-select').value;settings.skin=skin;save('zb-quarantine-settings',settings);sim.skin=skin;sim.player.skin=skin;applyProfile(sim);};$('map-action').onclick=openMap;$('street-job').onclick=openMap;$('map-journal').onclick=()=>{const origin=mapReturn;mapReturn=null;$('map-dialog').close();rpgUI.open();rpgUI.returnState=origin;rpgUI.tab='journal';rpgUI.journalFilter=sim.rpg.tracked?'all':'available';rpgUI.questSelected=sim.rpg.tracked;rpgUI.render();};$('map-done').onclick=()=>$('map-dialog').close();$('map-dialog').addEventListener('close',()=>{if(mapReturn==='paused'&&sim.state==='paused')showDialog('pause-dialog');else if(mapReturn&&mapReturn!=='menu'&&sim.state==='paused')resume();mapReturn=null;});$('vehicle-action').onclick=()=>{input.once.interact=true;};
  $('open-camp').onclick=openCamp;$('camp-done').onclick=()=>$('camp-dialog').close();$('arsenal-done').onclick=()=>$('arsenal-dialog').close();
  $('open-arsenal').onclick=openArsenal;$('arsenal-action').onclick=openArsenal;$('arsenal-dialog').addEventListener('close',()=>{if(arsenalReturn==='paused'&&sim.state==='paused')showDialog('pause-dialog');else if(arsenalReturn&&arsenalReturn!=='menu'&&sim.state==='paused')resume();arsenalReturn=null;});
  $('start').onclick=start;$('retry').onclick=start;$('result-menu').onclick=menu;$('quit').onclick=menu;$('resume').onclick=resume;$('pause').onclick=togglePause;$('auto-action').onclick=()=>toggleAuto();
  $('open-guide').onclick=()=>showDialog('guide-dialog');$('guide-done').onclick=()=>$('guide-dialog').close();
  $('open-settings').onclick=()=>openSettings();$('pause-settings').onclick=()=>openSettings(true);$('settings-done').onclick=()=>$('settings-dialog').close();$('settings-dialog').addEventListener('close',settingsClosed);
  for(const id of ['pause-dialog','upgrade-dialog','result-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();if(id==='pause-dialog')resume();});
  document.querySelectorAll('[data-loadout]').forEach(b=>b.onclick=()=>selectLoadout(b.dataset.loadout));
  for(const[id,action]of [['dash-action','dash'],['melee-action','melee'],['grenade-action','grenade'],['touch-reload','reload'],['touch-dash','dash'],['touch-grenade','grenade']])bindTouchAction($(id),input,()=>{if(['playing','extracting'].includes(sim.state))input.once[action]=true;});
  bindTouchAction($('touch-switch'),input,()=>cycleWeapon(1));
  const displayControls={'day-cycle':'dayCycle','weather-mode':'weatherMode','weather-effects':'weatherEffects','world-theme':'worldTheme','diorama-clarity':'dioramaClarity','shader-style':'shaderStyle','view-mode':'viewMode','foliage-detail':'foliageDetail','environment-detail':'environmentDetail','population-detail':'populationDetail','lighting-detail':'lightingDetail'};
  const themeUI=()=>{const lore=WORLD_LORE[settings.worldTheme];$('world-lore').textContent=lore.brief;document.querySelector('.chapter > span').textContent=lore.title;document.querySelector('.intro').textContent=lore.intro;document.body.dataset.worldTheme=settings.worldTheme;};
  for(const [id,key]of Object.entries(displayControls))$(id).value=settings[key];themeUI();
  $('visual-style').value=settings.visualStyle;$('difficulty').value=settings.difficulty;$('quality').value=settings.quality;$('volume').value=settings.volume;$('reduced-motion').checked=settings.reducedMotion;$('gore').value=settings.goreLevel;$('gore-value').textContent=`${settings.goreLevel} / 10 · ${goreLabel(settings.goreLevel)}`;
  const combatSettings={'quest-guidance':'questGuidance','progression-popups':'progressionPopups','damage-numbers':'damageNumbers','enemy-health-bars':'enemyHealthBars','critical-callouts':'criticalCallouts','damage-colors':'damageColors'};
  for(const [id,key]of Object.entries(combatSettings))$(id).checked=settings[key]!==false;
  function updateSettings(){for(const [id,key]of Object.entries(displayControls))settings[key]=$(id).value;themeUI();for(const [id,key]of Object.entries(combatSettings))settings[key]=$(id).checked;settings.visualStyle=$('visual-style').value;settings.difficulty=$('difficulty').value;settings.quality=$('quality').value;settings.volume=Number($('volume').value);settings.reducedMotion=$('reduced-motion').checked;settings.goreLevel=Number($('gore').value);settings.gore=settings.goreLevel>0;$('gore-value').textContent=`${settings.goreLevel} / 10 · ${goreLabel(settings.goreLevel)}`;save('zb-quarantine-settings',settings);document.body.classList.toggle('reduced-motion',settings.reducedMotion);sim.weather.options=weatherSettings(settings);updateWeather(sim,0);world.applySettings(settings);audio.setVolume(settings.volume/100);}
  for(const id of ['visual-style','difficulty','quality','volume','reduced-motion','gore',...Object.keys(combatSettings),...Object.keys(displayControls)])$(id).addEventListener('input',updateSettings);
  window.addEventListener('resize',()=>world.resize());
  const focusLost=()=>{persistNow();if(activeGameplay(sim.state)){sim.pause();showDialog('pause-dialog');}input.clear();};
  desktopUI=installDesktopUI({bridge:desktop,settings,apply:updateSettings,beforeQuit:persistNow,onSuspend:()=>{focusLost();last=performance.now();accumulator=0;},input});
  settingsUI=new SettingsUI(input,settings,()=>save('zb-quarantine-settings',settings),{onSectionChange:id=>{if(id!=='controller')controllerUI.setup.stop();}});
  window.addEventListener('blur',focusLost);document.addEventListener('visibilitychange',()=>{if(document.hidden)focusLost();});
  $('game').addEventListener('webglcontextlost',e=>{e.preventDefault();focusLost();$('error-detail').textContent='The graphics connection was interrupted. Reload to start a fresh run.';$('error').hidden=false;});
  // Compile once before controls can replace scene materials. The async helper
  // polls material handles on timers and can hang in occluded windows or after disposal.
  recordUI();world.applySettings(settings);world.update(sim,0,true);await loadingStage(88,'Warming lights, materials and controls');world.renderer.compile(world.scene,world.camera);last=performance.now();requestAnimationFrame(loop);
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('controllerQA')){const {installControllerQA}=await import('../dev/controller-qa.js');installControllerQA(input,()=>sim);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('touchQA')){const {installTouchQA}=await import('../dev/touch-qa.js');installTouchQA(input,()=>sim,()=>world);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('upgradeQA')){const {installUpgradeQA}=await import('../dev/upgrade-qa.js');installUpgradeQA(input,()=>sim);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('bossQA')){const {installBossQA}=await import('../dev/boss-qa.js');installBossQA(input,()=>sim,()=>world);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('retroQA')){const {installRetroQA}=await import('../dev/retro-qa.js');installRetroQA(input,()=>sim,()=>world,()=>retroArcade);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('regionQA')){const {installRegionQA}=await import('../dev/region-qa.js');installRegionQA(input,()=>sim,()=>world);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('interiorQA')){const {installInteriorQA}=await import('../dev/interior-qa.js');installInteriorQA(input,()=>sim,()=>world);}
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('rpgQA')){const {installRPGQA}=await import('../dev/rpg-qa.js');installRPGQA(input,()=>sim,()=>world);}

  // Read-only diagnostics for local QA. No gameplay mutation surface is exposed.
  if(import.meta.env.DEV)Object.defineProperty(window,'zombieBagarre',{get:()=>({state:sim.state,wave:sim.wave,kills:sim.kills,score:sim.score,time:sim.time,player:{...sim.player},enemyCount:sim.enemies.length,remaining:sim.toSpawn,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,mode:sim.mode,visited:[...sim.visited],version:'4.49.0'})});
}catch(error){console.error(error);$('error-detail').textContent='WebGL is needed to render Saint-Roch. Enable hardware acceleration or try a browser with WebGL support.';$('error').hidden=false;}

// Isolated traversal training does not load or write expedition progression.
document.getElementById('open-traversal').onclick=()=>{location.href='./traversal.html';};
