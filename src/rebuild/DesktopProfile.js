import {BINDINGS} from './ControllerConfig.js';
// Profiles alter presentation only. No difficulty, enemy, loot or input changes.
export const DECK_PROFILES={
  balanced:{quality:'balanced',lightingDetail:'standard',foliageDetail:'standard',environmentDetail:'standard',populationDetail:'sparse',weatherEffects:'full',resolutionScale:1,frameLimit:60},
  rich:{quality:'high',lightingDetail:'high',foliageDetail:'lush',environmentDetail:'rich',populationDetail:'busy',weatherEffects:'full',resolutionScale:1,frameLimit:60},
  battery:{quality:'low',lightingDetail:'low',foliageDetail:'sparse',environmentDetail:'minimal',populationDetail:'off',weatherEffects:'subtle',resolutionScale:.85,frameLimit:30},
};
export function desktopDefaults(bridge){
  return bridge?.steamDeck?{...DECK_PROFILES.balanced,bindings:{...BINDINGS,rightFire:7},promptStyle:'xbox',drivingStyle:'assisted'}:{};
}
export function renderPixelRatio(settings,dpr=1){
  const cap=settings.quality==='high'?2:settings.quality==='low'?1:1.35;
  const scale=[.75,.85,1,1.25,1.5].includes(settings.resolutionScale)?settings.resolutionScale:1;
  return Math.min(Math.max(.5,dpr),cap)*scale;
}
export function frameLimit(value){return [30,40,60,90,120].includes(value)?value:0;}
