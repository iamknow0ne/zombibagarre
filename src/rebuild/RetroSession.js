import {interiorInteraction,retroConsoleStatus} from './Interiors.js';
// A cartridge is a separate game. Never serialize the emulated run into hero XP.
export function beginRetroSession(sim,consoleId){
 const object=interiorInteraction(sim);
 if(sim.state!=='interior'||object?.type!=='console'||object.consoleId!==consoleId||!retroConsoleStatus(sim,consoleId).unlocked)return null;
 const session={sim,interior:sim.interior,consoleId};sim.state='retro';return session;
}
export function endRetroSession(session){
 if(!session)return false;
 const {sim,interior}=session;
 if(sim.state!=='retro'||sim.interior!==interior)return false;
 sim.state='interior';return true;
}
export function retroExitHeld(pads){return Array.from(pads||[]).some(p=>p?.connected!==false&&p?.buttons?.[8]?.pressed&&p?.buttons?.[9]?.pressed);}
