import {weatherSettings} from './Weather.js';

export const EXPEDITION_LOCK='zombie-bagarre-expedition-transaction-v1';
export const CHECKPOINT_LOCK_UNAVAILABLE='Expedition saving needs a browser with secure Web Locks support. Fresh expeditions and your hero still work.';
export function checkpointLocksAvailable(locks=globalThis.navigator?.locks){return typeof locks?.request==='function';}
export async function withCheckpointLock(operation,locks=globalThis.navigator?.locks){
  if(!checkpointLocksAvailable(locks))throw new Error(CHECKPOINT_LOCK_UNAVAILABLE);
  return locks.request(EXPEDITION_LOCK,{mode:'exclusive'},operation);
}
// Rendering and tentative UI activation must succeed before removing the one-use
// checkpoint. Call this inside withCheckpointLock, sharing its lock with writers.
export function prepareCheckpointResume(store,profile,prepare,{activate,rollback}={}){
  const sim=store.read({profile});
  if(!sim)throw new Error('There is no saved expedition on this device.');
  let world,activationStarted=false;
  try{
    world=prepare(sim);activationStarted=true;activate?.({sim,world});
    store.consume();return {sim,world};
  }catch(error){
    try{if(activationStarted)rollback?.();}finally{world?.destroy();}
    throw error;
  }
}
export function checkpointSummary(summary){
  const place=summary.regionId==='country-road'?'OLD MILL ROAD':summary.regionId==='city'?'SAINT-ROCH':'EXPEDITION';
  const date=new Date(summary.savedAt),saved=Number.isFinite(date.getTime())?` · ${date.toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'';
  return `${place} · WAVE ${String(summary.wave).padStart(2,'0')}${saved} · Saved on this device`;
}
// These options affect the expedition itself. Particle density remains the
// current device preference, even when resuming an older checkpoint.
export function syncExpeditionWeather(settings,options,control){
  const restored=weatherSettings(options);
  for(const [key,id]of [['dayCycle','day-cycle'],['weatherMode','weather-mode']]){
    settings[key]=restored[key];control(id).value=restored[key];
  }
}
